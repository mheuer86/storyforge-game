import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  AUTHOR_TOOLS,
  AUTHOR_TOOL_NAME,
} from '@/lib/sf2/author/tools'
import {
  SF2_AUTHOR_CORE,
  SF2_AUTHOR_ROLE,
  buildAuthorSituation,
} from '@/lib/sf2/author/prompt'
import { compileAuthorInputSeed } from '@/lib/sf2/author/payload'
import {
  normalizeAuthorSetup,
  validateAuthorSetup,
  validateChapterRaw,
} from '@/lib/sf2/author/contract'
import { transformAuthorSetup } from '@/lib/sf2/author/transform'
import { getSf2BibleForGenre } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import type {
  Sf2ChapterMeaning,
  Sf2State,
} from '@/lib/sf2/types'

const AUTHOR_MODEL = process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-6'
const AUTHOR_MAX_TOKENS = Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 6144)

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
// Single Sonnet chapter-setup call can be slow on first uncached run.
export const maxDuration = 300

const requestSchema = z.object({
  state: z.record(z.unknown()).nullable().optional(), // null = fresh campaign
  priorChapterMeaning: z
    .object({
      chapter: z.number(),
      situation: z.string(),
      tension: z.string(),
      ticking: z.string(),
      question: z.string(),
      closer: z.string(),
      closingResolution: z.enum(['clean', 'costly', 'failure', 'catastrophic', 'unresolved']),
    })
    .nullable()
    .optional(),
  targetChapter: z.number(),
})

type AnthropicUsage = {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number
  cache_read_input_tokens?: number
}

function tagTool(tool: Anthropic.Tool): Anthropic.Tool {
  return { ...tool, cache_control: { type: 'ephemeral' as const } }
}

type AuthorToolResult =
  | {
      ok: true
      raw: Record<string, unknown>
      toolUse: Anthropic.ToolUseBlock
      response: Anthropic.Message
      usage: AnthropicUsage
      attempts: number
      apiMs: number
    }
  | {
      ok: false
      kind: 'no_tool_use' | 'invalid'
      errors: string[]
      response: Anthropic.Message
      usage: AnthropicUsage
      attempts: number
      textPreview?: string
      apiMs: number
    }

// Run a tool-forced call, retry once on validation failure or missing tool_use.
// Haiku is reproducibly variable on structured output (output volume varies
// 15× between runs on the same input). Single retry with explicit "you missed
// these fields" nudge stabilizes the success rate at low cost.
async function callAuthorToolWithRetry(args: {
  client: Anthropic
  system: Anthropic.TextBlockParam[]
  initialMessages: Anthropic.MessageParam[]
  tool: Anthropic.Tool
  toolName: string
  validate: (raw: Record<string, unknown>) => string[]
  retryNudge: (errors: string[]) => string
  maxAttempts?: number
}): Promise<AuthorToolResult> {
  const { client, system, initialMessages, tool, toolName, validate, retryNudge } = args
  const maxAttempts = args.maxAttempts ?? 2

  let messages: Anthropic.MessageParam[] = [...initialMessages]
  const aggregate: AnthropicUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  }
  let lastResponse: Anthropic.Message | null = null
  let lastErrors: string[] = []
  let lastTextPreview: string | undefined
  let attempt = 0
  let apiMsTotal = 0

  while (attempt < maxAttempts) {
    attempt += 1
    const callStart = Date.now()
    const response = await client.messages.create({
      model: AUTHOR_MODEL,
      max_tokens: AUTHOR_MAX_TOKENS,
      system,
      tools: [tagTool(tool)],
      // disable_parallel_tool_use: with `type: 'tool'` this guarantees the
      // model emits exactly one tool_use block. Without it, Haiku reproducibly
      // emits 2-5 parallel tool_use blocks each with a partial set of fields,
      // causing every prior failure mode in this debugging cycle.
      tool_choice: { type: 'tool', name: toolName, disable_parallel_tool_use: true },
      messages,
    })
    apiMsTotal += Date.now() - callStart
    lastResponse = response
    const usage = response.usage as AnthropicUsage
    aggregate.input_tokens += usage.input_tokens
    aggregate.output_tokens += usage.output_tokens
    aggregate.cache_creation_input_tokens =
      (aggregate.cache_creation_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0)
    aggregate.cache_read_input_tokens =
      (aggregate.cache_read_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0)

    const toolUse = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use' && b.name === toolName
    )

    if (!toolUse) {
      lastTextPreview = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .slice(0, 500)
      console.warn(`[sf2/author] no tool_use on attempt ${attempt}/${maxAttempts}`, {
        toolName,
        stopReason: response.stop_reason,
        textPreview: lastTextPreview,
      })
      if (attempt < maxAttempts) {
        messages = [
          ...messages,
          { role: 'assistant', content: response.content },
          {
            role: 'user',
            content: `You did not call the \`${toolName}\` tool. Call it now with all required fields filled. Do not output text — emit the tool call.`,
          },
        ]
        continue
      }
      return {
        ok: false,
        kind: 'no_tool_use',
        errors: [],
        response,
        usage: aggregate,
        attempts: attempt,
        textPreview: lastTextPreview,
        apiMs: apiMsTotal,
      }
    }

    const raw = toolUse.input as Record<string, unknown>
    const errors = validate(raw)
    if (errors.length === 0) {
      if (attempt > 1) {
        console.log(`[sf2/author] ${toolName} succeeded on retry`, { attempts: attempt })
      }
      return { ok: true, raw, toolUse, response, usage: aggregate, attempts: attempt, apiMs: apiMsTotal }
    }
    lastErrors = errors
    console.warn(`[sf2/author] ${toolName} validation failed on attempt ${attempt}/${maxAttempts}`, {
      errors,
      outputTokens: usage.output_tokens,
    })

    if (attempt < maxAttempts) {
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: `Validation failed. Required fields were missing or empty. Re-emit \`${toolName}\` with all required fields populated.`,
            },
            { type: 'text' as const, text: retryNudge(errors) },
          ],
        },
      ]
      continue
    }
  }

  return {
    ok: false,
    kind: 'invalid',
    errors: lastErrors,
    response: lastResponse!,
    usage: aggregate,
    attempts: attempt,
    apiMs: apiMsTotal,
  }
}

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

    const state = (parsed.data.state ?? null) as Sf2State | null
    const priorMeaning = (parsed.data.priorChapterMeaning ?? null) as Sf2ChapterMeaning | null
    const targetChapter = parsed.data.targetChapter
    const isContinuation = (state?.history?.turns?.length ?? 0) > 0

    if (!state?.campaign?.arcPlan) {
      return new Response(
        JSON.stringify({ error: 'missing_arc_plan', message: 'Chapter Author requires state.campaign.arcPlan. Call /api/sf2/arc-author first.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[sf2/author] request received', {
      targetChapter,
      priorTurnsCount: state?.history?.turns?.length ?? 0,
      hasPriorMeaning: Boolean(priorMeaning),
      model: AUTHOR_MODEL,
    })

    const seed = compileAuthorInputSeed(state, priorMeaning)
    const situation = buildAuthorSituation(state, priorMeaning)
    const bible = getSf2BibleForGenre(state.meta.genreId)

    assertNoDynamicLeak(SF2_AUTHOR_CORE, 'AUTHOR_CORE')
    assertNoDynamicLeak(bible, 'BIBLE')
    assertNoDynamicLeak(SF2_AUTHOR_ROLE, 'AUTHOR_ROLE')
    assertNoDynamicLeak(situation, 'AUTHOR_SITUATION')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_AUTHOR_CORE,
      bible,
      role: SF2_AUTHOR_ROLE,
      situation,
    })

    const seedBlock = `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}`

    const client = resolveClient(req)

    const initialMessages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `${seedBlock}\n\nEmit \`${AUTHOR_TOOL_NAME}\` now. This single call authors the complete chapter setup: frame, opening scene, antagonist field, starting NPCs, active threads, thread transitions, arc link, pacing contract, pressure ladder, revelations, fault lines, escalation options, lore, and continuation moves when applicable.`,
      },
    ]

    let result: AuthorToolResult
    try {
      result = await callAuthorToolWithRetry({
        client,
        system,
        initialMessages,
        tool: AUTHOR_TOOLS[0],
        toolName: AUTHOR_TOOL_NAME,
        validate: (raw) => validateChapterRaw(raw, {
          genreId: state?.meta.genreId ?? '',
          pcOriginId: state?.meta.originId ?? '',
          pcPlaybookId: state?.meta.playbookId ?? '',
          isContinuation,
          state: state ?? undefined,
        }),
        retryNudge: (errors) =>
          `Your previous tool call was incomplete — these required fields were missing or empty:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\nRe-emit \`${AUTHOR_TOOL_NAME}\` now with EVERY required field filled with substantive, non-empty content. Stay inside the field-length budgets; compact complete output is preferred over exhaustive prose. The full chapter setup must come back in this single tool call.`,
      })
    } catch (err) {
      return anthropicErrorResponse(err)
    }

    if (!result.ok) {
      console.error(`[sf2/author] setup ${result.kind} after ${result.attempts} attempt(s)`, {
        errors: result.errors,
      })
      return new Response(
        JSON.stringify({
          error: result.kind === 'no_tool_use' ? 'author_no_tool_use' : 'author_invalid',
          errors: result.errors,
          stopReason: result.response.stop_reason,
          textPreview: result.textPreview,
          attempts: result.attempts,
          usage: {
            inputTokens: result.usage.input_tokens,
            outputTokens: result.usage.output_tokens,
            cacheWriteTokens: result.usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: result.usage.cache_read_input_tokens ?? 0,
          },
          latency: {
            totalMs: requestTimer.elapsed(),
            apiMs: result.apiMs,
            attempts: result.attempts,
          },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const authored = normalizeAuthorSetup(result.raw)
    const validationErrors = validateAuthorSetup(authored, { isContinuation, state: state ?? undefined })
    if (validationErrors.length > 0) {
      console.error('[sf2/author] merged output failed validation', {
        model: AUTHOR_MODEL,
        errors: validationErrors,
      })
      return new Response(
        JSON.stringify({
          error: 'author_invalid_output',
          errors: validationErrors,
          usage: usagePayload(result.usage),
          latency: {
            totalMs: requestTimer.elapsed(),
            apiMs: result.apiMs,
            attempts: result.attempts,
          },
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const transformed = transformAuthorSetup(authored, targetChapter)
    return new Response(
      JSON.stringify({
        chapter: transformed.chapter,
        runtimeState: transformed.runtimeState,
        scaffolding: transformed.scaffolding,
        openingSeed: transformed.openingSeed,
        threadTransitions: transformed.threadTransitions,
        authored,
        seed,
        usage: usagePayload(result.usage),
        attempts: { setup: result.attempts },
        latency: {
          totalMs: requestTimer.elapsed(),
          apiMs: result.apiMs,
          attempts: result.attempts,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[sf2/author] setup failed', { message, stack })
    return new Response(
      JSON.stringify({ error: 'author_setup_failed', message, stack }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

function anthropicErrorResponse(err: unknown): Response {
  const message = err instanceof Error ? err.message : 'unknown_error'
  const status = err instanceof Anthropic.APIError ? err.status : undefined
  const apiDetail = err instanceof Anthropic.APIError ? err.error : undefined
  console.error('[sf2/author] anthropic call failed', {
    model: AUTHOR_MODEL,
    message,
    status,
    apiDetail,
  })
  return new Response(
    JSON.stringify({ error: 'author_exception', message, status, apiDetail, model: AUTHOR_MODEL }),
    { status: 502, headers: { 'Content-Type': 'application/json' } }
  )
}

function usagePayload(usage: AnthropicUsage) {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  }
}

