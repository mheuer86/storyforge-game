import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ARC_AUTHOR_TOOLS, ARC_AUTHOR_TOOL_NAME } from '@/lib/sf2/arc-author/tools'
import {
  SF2_ARC_AUTHOR_CORE,
  SF2_ARC_AUTHOR_ROLE,
  buildArcAuthorSituation,
} from '@/lib/sf2/arc-author/prompt'
import { arcPlanToArcEntity, transformArcSetup, validateArcPlan } from '@/lib/sf2/arc-author/transform'
import { selectArcVariantSeed } from '@/lib/sf2/arc-author/variants'
import { compileAuthorInputSeed } from '@/lib/sf2/author/payload'
import { SF2_BIBLE_HEGEMONY } from '@/lib/sf2/narrator/prompt'
import { assertNoDynamicLeak, composeSystemBlocks } from '@/lib/sf2/prompt/compose'
import type { AuthorInputSeed, Sf2State } from '@/lib/sf2/types'

const ARC_AUTHOR_MODEL =
  process.env.SF2_ARC_AUTHOR_MODEL ||
  process.env.SF2_AUTHOR_MODEL ||
  'claude-sonnet-4-5-20250929'
const ARC_AUTHOR_MAX_TOKENS = Number(process.env.SF2_ARC_AUTHOR_MAX_TOKENS ?? 8192)

export const runtime = 'nodejs'
export const maxDuration = 300

const requestSchema = z.object({
  state: z.record(z.unknown()).nullable().optional(),
  seed: z.record(z.unknown()).nullable().optional(),
  arcVariantSeed: z.record(z.unknown()).nullable().optional(),
})

type AnthropicUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

function tagTool(tool: Anthropic.Tool): Anthropic.Tool {
  return { ...tool, cache_control: { type: 'ephemeral' as const } }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', detail: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const state = (parsed.data.state ?? null) as Sf2State | null
    const seed = (parsed.data.seed ?? compileAuthorInputSeed(state, null)) as AuthorInputSeed
    if (parsed.data.arcVariantSeed) {
      seed.arcVariantSeed = parsed.data.arcVariantSeed as AuthorInputSeed['arcVariantSeed']
    } else {
      seed.arcVariantSeed = selectArcVariantSeed(seed)
    }
    const situation = buildArcAuthorSituation(seed)

    assertNoDynamicLeak(SF2_ARC_AUTHOR_CORE, 'ARC_AUTHOR_CORE')
    assertNoDynamicLeak(SF2_BIBLE_HEGEMONY, 'BIBLE')
    assertNoDynamicLeak(SF2_ARC_AUTHOR_ROLE, 'ARC_AUTHOR_ROLE')
    assertNoDynamicLeak(situation, 'ARC_AUTHOR_SITUATION')

    const system = composeSystemBlocks({
      core: SF2_ARC_AUTHOR_CORE,
      bible: SF2_BIBLE_HEGEMONY,
      role: SF2_ARC_AUTHOR_ROLE,
      situation,
    }).blocks
    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}\n\nEmit \`${ARC_AUTHOR_TOOL_NAME}\` now. Do not author a chapter setup or opening scene.`,
      },
    ]

    const client = resolveClient(req)
    const response = await client.messages.create({
      model: ARC_AUTHOR_MODEL,
      max_tokens: ARC_AUTHOR_MAX_TOKENS,
      system,
      tools: [tagTool(ARC_AUTHOR_TOOLS[0])],
      tool_choice: { type: 'tool', name: ARC_AUTHOR_TOOL_NAME, disable_parallel_tool_use: true },
      messages,
    })

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === ARC_AUTHOR_TOOL_NAME
    )
    if (!toolUse) {
      const textPreview = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .slice(0, 500)
      return new Response(
        JSON.stringify({
          error: 'arc_author_no_tool_use',
          stopReason: response.stop_reason,
          textPreview,
          usage: usagePayload(response.usage as AnthropicUsage),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const arcPlan = transformArcSetup(toolUse.input as Record<string, unknown>, seed)
    const errors = validateArcPlan(arcPlan)
    if (errors.length > 0) {
      return new Response(
        JSON.stringify({
          error: 'arc_author_invalid_output',
          errors,
          arcPlan,
          usage: usagePayload(response.usage as AnthropicUsage),
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        arcPlan,
        arcEntity: arcPlanToArcEntity(arcPlan),
        seed,
        selectedArcVariantSeed: seed.arcVariantSeed,
        authored: toolUse.input,
        usage: usagePayload(response.usage as AnthropicUsage),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const status = err instanceof Anthropic.APIError ? err.status : undefined
    const apiDetail = err instanceof Anthropic.APIError ? err.error : undefined
    console.error('[sf2/arc-author] setup failed', { message, status, apiDetail })
    return new Response(
      JSON.stringify({ error: 'arc_author_exception', message, status, apiDetail, model: ARC_AUTHOR_MODEL }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

function usagePayload(usage: AnthropicUsage) {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  }
}
