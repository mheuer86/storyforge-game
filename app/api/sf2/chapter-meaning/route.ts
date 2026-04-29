import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { CHAPTER_MEANING_TOOLS, CHAPTER_MEANING_TOOL_NAME } from '@/lib/sf2/chapter-meaning/tools'
import {
  SF2_CHAPTER_MEANING_CORE,
  SF2_CHAPTER_MEANING_ROLE,
  buildChapterMeaningSituation,
} from '@/lib/sf2/chapter-meaning/prompt'
import { SF2_BIBLE_HEGEMONY } from '@/lib/sf2/narrator/prompt'
import { assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import type { Sf2ChapterMeaning, Sf2State } from '@/lib/sf2/types'
import { startTimer } from '@/lib/sf2/instrumentation/latency'

// Chapter-meaning synthesis defaults to Haiku for low-cost v2 test runs.
// Override via SF2_CHAPTER_MEANING_MODEL when a higher-quality close read is needed.
const CHAPTER_MEANING_MODEL =
  process.env.SF2_CHAPTER_MEANING_MODEL || 'claude-haiku-4-5-20251001'

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
    const situation = buildChapterMeaningSituation(state)

    assertNoDynamicLeak(SF2_CHAPTER_MEANING_CORE, 'CHAPTER_MEANING_CORE')
    assertNoDynamicLeak(SF2_BIBLE_HEGEMONY, 'BIBLE')
    assertNoDynamicLeak(SF2_CHAPTER_MEANING_ROLE, 'CHAPTER_MEANING_ROLE')

    // CORE + BIBLE + ROLE are session-stable across all chapter closes in a
    // campaign → cache them. The dynamic per-chapter context (turn prose,
    // scene summaries) lives in the user message at BP4 (uncached).
    const system: Anthropic.TextBlockParam[] = [
      { type: 'text', text: SF2_CHAPTER_MEANING_CORE },
      { type: 'text', text: SF2_BIBLE_HEGEMONY },
      {
        type: 'text',
        text: SF2_CHAPTER_MEANING_ROLE,
        cache_control: { type: 'ephemeral' as const },
      },
    ]

    const cachedTools = CHAPTER_MEANING_TOOLS.map((t, i) =>
      i === CHAPTER_MEANING_TOOLS.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' as const } }
        : t
    )

    const messages: Anthropic.MessageParam[] = [
      { role: 'user', content: situation },
    ]

    const client = resolveClient(req)
    try {
      const apiTimer = startTimer()
      const response = await client.messages.create({
        model: CHAPTER_MEANING_MODEL,
        max_tokens: 2048,
        system,
        tools: cachedTools,
        // disable_parallel_tool_use forces a single tool call. Single-tool
        // flow; matches Archivist/Author for consistent intent.
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
          b.type === 'tool_use' && b.name === CHAPTER_MEANING_TOOL_NAME
      )
      if (!toolUse) {
        const textContent = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
        console.error('[sf2/chapter-meaning] no tool_use in response', {
          model: CHAPTER_MEANING_MODEL,
          stopReason: response.stop_reason,
          textPreview: textContent.slice(0, 400),
        })
        return new Response(
          JSON.stringify({
            error: 'chapter_meaning_no_tool_use',
            stopReason: response.stop_reason,
            textPreview: textContent.slice(0, 400),
            usage,
            latency: { totalMs: requestTimer.elapsed(), apiMs },
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const input = toolUse.input as {
        situation: string
        tension: string
        ticking: string
        question: string
        closer: string
        closingResolution:
          | 'clean'
          | 'costly'
          | 'failure'
          | 'catastrophic'
          | 'unresolved'
      }

      const meaning: Sf2ChapterMeaning = {
        chapter: state.meta.currentChapter,
        situation: String(input.situation ?? ''),
        tension: String(input.tension ?? ''),
        ticking: String(input.ticking ?? ''),
        question: String(input.question ?? ''),
        closer: String(input.closer ?? ''),
        closingResolution: input.closingResolution ?? 'unresolved',
        synthesizedAtTurn: state.history.turns.length,
      }

      return new Response(
        JSON.stringify({
          meaning,
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
      console.error('[sf2/chapter-meaning] anthropic call failed', {
        model: CHAPTER_MEANING_MODEL,
        message,
        status,
        apiDetail,
      })
      return new Response(
        JSON.stringify({ error: 'chapter_meaning_exception', message, status, apiDetail, model: CHAPTER_MEANING_MODEL }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[sf2/chapter-meaning] setup failed', { message, stack })
    return new Response(
      JSON.stringify({ error: 'chapter_meaning_setup_failed', message, stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
