import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import {
  AUTHOR_TOOLS,
  AUTHOR_TOOL_NAME,
} from '@/lib/sf2/author/tools'
import {
  SF2_AUTHOR_CORE,
  buildAuthorRole,
  buildAuthorSituation,
} from '@/lib/sf2/author/prompt'
import { compileAuthorInputSeed } from '@/lib/sf2/author/payload'
import {
  completeAuthorSetupForValidation,
  normalizeAuthorSetup,
  validateAuthorSetup,
  validateAuthorToolInput,
} from '@/lib/sf2/author/contract'
import { transformAuthorSetup } from '@/lib/sf2/author/transform'
import {
  AUTHOR_DEFAULT_MAX_ATTEMPTS,
  buildAuthorRetryNudge,
  shouldRetryAuthorValidation,
} from '@/lib/sf2/author/retry'
import { getSf2BibleForGenre } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import type {
  Sf2ChapterMeaning,
  Sf2State,
} from '@/lib/sf2/types'

const AUTHOR_MODEL = process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-6'
const AUTHOR_MAX_TOKENS: number = Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 10_000)
const AUTHOR_RETRY_MAX_TOKENS: number = Number(
  process.env.SF2_AUTHOR_RETRY_MAX_TOKENS ?? Math.max(AUTHOR_MAX_TOKENS, 12_000)
)
const AUTHOR_MAX_ATTEMPTS: number = positiveIntEnv(
  process.env.SF2_AUTHOR_MAX_ATTEMPTS,
  AUTHOR_DEFAULT_MAX_ATTEMPTS
)

function positiveIntEnv(value: string | undefined, fallback: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
// Single Sonnet chapter-setup call can be slow on first uncached run.
export const maxDuration = 300

const procedureResidueModeSchema = z.enum(['constraint', 'leverage', 'background', 'discard'])

const transitionSeedSchema = z.object({
  priorChapterMeant: z.string(),
  earnedConsequence: z.string(),
  pressureOwnerCandidate: z.string(),
  worsenedDetail: z.string(),
  unresolvedQuestion: z.string(),
  doNotRestage: z.array(z.string()),
  procedureResidue: z.object({
    mechanism: z.string(),
    keepAs: procedureResidueModeSchema,
  }),
})

const transitionSeedSnakeSchema = z.object({
  prior_chapter_meant: z.string(),
  earned_consequence: z.string(),
  pressure_owner_candidate: z.string(),
  worsened_detail: z.string(),
  unresolved_question: z.string(),
  do_not_restage: z.array(z.string()),
  procedure_residue: z.object({
    mechanism: z.string(),
    keep_as: procedureResidueModeSchema,
  }),
}).transform((seed) => ({
  priorChapterMeant: seed.prior_chapter_meant,
  earnedConsequence: seed.earned_consequence,
  pressureOwnerCandidate: seed.pressure_owner_candidate,
  worsenedDetail: seed.worsened_detail,
  unresolvedQuestion: seed.unresolved_question,
  doNotRestage: seed.do_not_restage,
  procedureResidue: {
    mechanism: seed.procedure_residue.mechanism,
    keepAs: seed.procedure_residue.keep_as,
  },
}))

const chapterMeaningSchema = z.object({
  chapter: z.number(),
  situation: z.string(),
  tension: z.string(),
  ticking: z.string(),
  question: z.string(),
  closer: z.string(),
  closingResolution: z.enum(['clean', 'costly', 'failure', 'catastrophic', 'unresolved']),
  transitionSeed: transitionSeedSchema.optional(),
  transition_seed: transitionSeedSnakeSchema.optional(),
}).transform(({ transition_seed, ...meaning }) => {
  const transitionSeed = meaning.transitionSeed ?? transition_seed
  return transitionSeed
    ? { ...meaning, transitionSeed }
    : meaning
})

const requestSchema = z.object({
  state: z.record(z.unknown()).nullable().optional(), // null = fresh campaign
  priorChapterMeaning: chapterMeaningSchema.nullable().optional(),
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

// Run a tool-forced call. Validation retries are gated by a policy function so
// known high-signal repair cases can get one corrective pass without doubling
// every malformed Author setup call.
async function callAuthorToolWithRetry(args: {
  client: Anthropic
  system: Anthropic.TextBlockParam[]
  initialMessages: Anthropic.MessageParam[]
  tool: Anthropic.Tool
  toolName: string
  validate: (raw: Record<string, unknown>) => string[]
  retryNudge: (errors: string[]) => string
  shouldRetryValidation?: (errors: string[]) => boolean
  maxAttempts?: number
}): Promise<AuthorToolResult> {
  const { client, system, initialMessages, tool, toolName, validate, retryNudge } = args
  const shouldRetryValidation = args.shouldRetryValidation ?? (() => true)
  const maxAttempts = Math.max(1, Math.floor(args.maxAttempts ?? 1))

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
  let lastStopReason: string | null = null
  let attempt = 0
  let apiMsTotal = 0

  while (attempt < maxAttempts) {
    attempt += 1
    const maxTokens: number = lastStopReason === 'max_tokens' ? AUTHOR_RETRY_MAX_TOKENS : AUTHOR_MAX_TOKENS
    const callStart = Date.now()
    const response = await client.messages.create({
      model: AUTHOR_MODEL,
      max_tokens: maxTokens,
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
    lastStopReason = response.stop_reason ?? null
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
        maxTokens,
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
      stopReason: response.stop_reason,
      outputTokens: usage.output_tokens,
      maxTokens,
    })

    if (attempt < maxAttempts && shouldRetryValidation(errors)) {
      messages = [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: toolUse.id,
              content: `Validation failed. Re-emit \`${toolName}\` with the reported issues repaired and all required fields populated.`,
            },
            { type: 'text' as const, text: retryNudge(errors) },
          ],
        },
      ]
      continue
    }
    break
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
      maxTokens: AUTHOR_MAX_TOKENS,
      maxAttempts: AUTHOR_MAX_ATTEMPTS,
    })

    const seed = compileAuthorInputSeed(state, priorMeaning)
    const situation = buildAuthorSituation(state, priorMeaning)
    const bible = getSf2BibleForGenre(state.meta.genreId)
    const authorRole = buildAuthorRole(state.meta.genreId)

    assertNoDynamicLeak(SF2_AUTHOR_CORE, 'AUTHOR_CORE')
    assertNoDynamicLeak(bible, 'BIBLE')
    assertNoDynamicLeak(authorRole, 'AUTHOR_ROLE')
    assertNoDynamicLeak(situation, 'AUTHOR_SITUATION')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_AUTHOR_CORE,
      bible,
      role: authorRole,
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
        validate: (raw) => validateAuthorToolInput(raw, {
          genreId: state?.meta.genreId ?? '',
          pcOriginId: state?.meta.originId ?? '',
          pcPlaybookId: state?.meta.playbookId ?? '',
          isContinuation,
          state: state ?? undefined,
        }),
        retryNudge: (errors) => buildAuthorRetryNudge(errors, state?.meta.genreId),
        shouldRetryValidation: shouldRetryAuthorValidation,
        maxAttempts: AUTHOR_MAX_ATTEMPTS,
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

    const authored = completeAuthorSetupForValidation(normalizeAuthorSetup(result.raw), {
      isContinuation,
      state: state ?? undefined,
    })
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
