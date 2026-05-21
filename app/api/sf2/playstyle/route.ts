import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { assertNoDynamicLeak, composeSystemBlocks } from '@/lib/sf2/prompt/compose'
import { SF2_CORE, getSf2BibleForGenre } from '@/lib/sf2/narrator/prompt'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import type { Sf2State } from '@/lib/sf2/types'
import {
  SF2_PLAYSTYLE_CORE,
  SF2_PLAYSTYLE_ROLE,
  buildPlaystyleSituation,
} from '@/lib/sf2/playstyle/prompt'
import { PLAYSTYLE_TOOL_NAME, PLAYSTYLE_TOOLS } from '@/lib/sf2/playstyle/tools'
import { normalizePlaystyleArtifact } from '@/lib/sf2/playstyle/normalize'

const PLAYSTYLE_MODEL = process.env.SF2_PLAYSTYLE_MODEL || 'claude-sonnet-4-6'

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
export const maxDuration = 60

const requestSchema = z.object({
  state: z.record(z.unknown()),
})

export async function POST(req: NextRequest) {
  const requestTimer = startTimer()
  try {
    const body = await req.json().catch(() => null)
    const parsed = requestSchema.safeParse(body)
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: 'invalid_request', detail: parsed.error.flatten() }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const state = parsed.data.state as unknown as Sf2State
    const situation = buildPlaystyleSituation(state)
    const bible = getSf2BibleForGenre(state.meta.genreId)
    const playstyleRole = `${SF2_PLAYSTYLE_CORE}\n\n${SF2_PLAYSTYLE_ROLE}`

    assertNoDynamicLeak(SF2_CORE, 'CORE')
    assertNoDynamicLeak(bible, 'BIBLE')
    assertNoDynamicLeak(playstyleRole, 'PLAYSTYLE_ROLE')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_CORE,
      bible,
      role: playstyleRole,
    })

    const cachedTools = PLAYSTYLE_TOOLS.map((tool, index) =>
      index === PLAYSTYLE_TOOLS.length - 1
        ? { ...tool, cache_control: { type: 'ephemeral' as const } }
        : tool
    )

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: situation },
    ]

    const client = resolveClient(req)
    try {
      const apiTimer = startTimer()
      const response = await client.messages.create({
        model: PLAYSTYLE_MODEL,
        max_tokens: 2400,
        system,
        tools: cachedTools,
        tool_choice: { type: 'any', disable_parallel_tool_use: true },
        messages,
      })
      const apiMs = apiTimer.elapsed()

      const usage = response.usage as {
        input_tokens: number
        output_tokens: number
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }

      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === 'tool_use' && block.name === PLAYSTYLE_TOOL_NAME
      )
      if (!toolUse) {
        const textContent = response.content
          .filter((block): block is Anthropic.TextBlock => block.type === 'text')
          .map((block) => block.text)
          .join('\n')
        console.error('[sf2/playstyle] no tool_use in response', {
          model: PLAYSTYLE_MODEL,
          stopReason: response.stop_reason,
          textPreview: textContent.slice(0, 400),
        })
        return new Response(
          JSON.stringify({
            error: 'playstyle_no_tool_use',
            stopReason: response.stop_reason,
            textPreview: textContent.slice(0, 400),
            usage,
            latency: { totalMs: requestTimer.elapsed(), apiMs },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const { artifact, validationFindings } = normalizePlaystyleArtifact(toolUse.input, state)

      return new Response(
        JSON.stringify({
          artifact,
          validationFindings,
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          },
          latency: { totalMs: requestTimer.elapsed(), apiMs },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error'
      const status = err instanceof Anthropic.APIError ? err.status : undefined
      const apiDetail = err instanceof Anthropic.APIError ? err.error : undefined
      console.error('[sf2/playstyle] anthropic call failed', {
        model: PLAYSTYLE_MODEL,
        message,
        status,
        apiDetail,
      })
      return new Response(
        JSON.stringify({ error: 'playstyle_exception', message, status, apiDetail, model: PLAYSTYLE_MODEL }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[sf2/playstyle] setup failed', { message, stack })
    return new Response(
      JSON.stringify({ error: 'playstyle_setup_failed', message, stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
