import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { ARCHIVIST_TOOLS, ARCHIVIST_TOOL_NAME } from '@/lib/sf2/archivist/tools'
import {
  SF2_ARCHIVIST_CORE,
  SF2_ARCHIVIST_ROLE,
  buildArchivistSituation,
  buildArchivistTurnMessage,
} from '@/lib/sf2/archivist/prompt'
import { processArchivistExtraction } from '@/lib/sf2/archivist/extraction'
import { SF2_CORE, getSf2BibleForGenre } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import type { Sf2State } from '@/lib/sf2/types'

const ARCHIVIST_MODEL = process.env.SF2_ARCHIVIST_MODEL || 'claude-haiku-4-5-20251001'

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
  narratorProse: z.string().max(8000),
  narratorAnnotation: z.record(z.unknown()).optional(),
  turnIndex: z.number(),
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
    const { narratorProse, narratorAnnotation, turnIndex } = parsed.data

    const situation = buildArchivistSituation(state)
    const bible = getSf2BibleForGenre(state.meta.genreId)
    const archivistRole = `${SF2_ARCHIVIST_CORE}\n\n${SF2_ARCHIVIST_ROLE}`
    assertNoDynamicLeak(SF2_CORE, 'CORE')
    assertNoDynamicLeak(bible, 'BIBLE')
    assertNoDynamicLeak(archivistRole, 'ARCHIVIST_ROLE')
    assertNoDynamicLeak(situation, 'ARCHIVIST_SITUATION')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_CORE,
      bible,
      role: archivistRole,
      situation,
    })

    const cachedTools = ARCHIVIST_TOOLS.map((t, i) =>
      i === ARCHIVIST_TOOLS.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' as const } }
        : t
    )

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: buildArchivistTurnMessage(state, turnIndex, narratorProse, narratorAnnotation ?? null),
      },
    ]

    // Anthropic call (inner try/catch handles APIError specifically).
    const client = resolveClient(req)
    const apiTimer = startTimer()
    try {
      const response = await client.messages.create({
        model: ARCHIVIST_MODEL,
        max_tokens: 4096,
        system,
        tools: cachedTools,
        // `any` = must call some tool. Archivist has only one tool, so this is
        // functionally equivalent to { type: 'tool', name: extract_turn } but
        // doesn't bypass prompt caching on Haiku 4.5 the way forced-tool does.
        // disable_parallel_tool_use ensures the model emits exactly one tool
        // call per turn — without it, Haiku reproducibly emits multiple
        // parallel partial attempts (see Author debugging cycle).
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
      (b): b is Anthropic.ToolUseBlock =>
        b.type === 'tool_use' && b.name === ARCHIVIST_TOOL_NAME
    )

    if (!toolUse) {
      const textContent = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
      console.error('[sf2/archivist] no tool_use in response', {
        model: ARCHIVIST_MODEL,
        stopReason: response.stop_reason,
        contentKinds: response.content.map((b) => b.type),
        textPreview: textContent.slice(0, 500),
      })
      return new Response(
        JSON.stringify({
          error: 'archivist_no_tool_use',
          stopReason: response.stop_reason,
          textPreview: textContent.slice(0, 500),
          usage,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const extraction = processArchivistExtraction({
      state,
      rawToolInput: toolUse.input as Record<string, unknown>,
      turnIndex,
      narratorProse,
    })
    const {
      patch,
      applyResult,
      summary,
      runtimeResult,
      normalization,
      rejectedWriteSummary,
    } = extraction

    // Surface rejected writes loudly. Apply-patch's outcomes already capture
    // every reject with a reason, but they get buried in the response payload.
    // Logging here makes silent drops visible during dev runs without forcing
    // a fixture replay to diagnose.
    if (rejectedWriteSummary) {
      console.warn('[sf2/archivist] writes rejected this turn', rejectedWriteSummary)
    }

    return new Response(
      JSON.stringify({
        nextState: runtimeResult.nextState,
        patch,
        outcomes: applyResult.outcomes,
        deferredWrites: applyResult.deferredWrites,
        drift: applyResult.drift,
        summary,
        faceShift: runtimeResult.faceShift,
        ladderFired: runtimeResult.ladderFired,
        pruneSummary: runtimeResult.pruneSummary,
        coherenceFindings: runtimeResult.coherenceFindings,
        invariantEvents: runtimeResult.invariantEvents,
        normalization,
        usage: {
          inputTokens: usage.input_tokens,
          outputTokens: usage.output_tokens,
          cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
          cacheReadTokens: usage.cache_read_input_tokens ?? 0,
        },
        latency: {
          totalMs: requestTimer.elapsed(),
          apiMs,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
    } catch (err) {
      const message = err instanceof Error ? err.message : 'unknown_error'
      const status =
        err instanceof Anthropic.APIError ? err.status : undefined
      const apiDetail =
        err instanceof Anthropic.APIError ? err.error : undefined
      console.error('[sf2/archivist] anthropic call failed', {
        model: ARCHIVIST_MODEL,
        message,
        status,
        apiDetail,
      })
      return new Response(
        JSON.stringify({
          error: 'archivist_exception',
          message,
          status,
          apiDetail,
          model: ARCHIVIST_MODEL,
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    // Outer catch: anything that throws before the Anthropic call reaches here.
    const message = err instanceof Error ? err.message : 'unknown_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[sf2/archivist] setup failed', { message, stack })
    return new Response(
      JSON.stringify({ error: 'archivist_setup_failed', message, stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
