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
  validateNpcDisposition,
  type DispositionDerivationContext,
} from '@/lib/sf2/author/disposition-defaults'
import { transformAuthorSetup } from '@/lib/sf2/author/transform'
import { SF2_BIBLE_HEGEMONY } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { CHAPTER_OPEN_CAP } from '@/lib/sf2/pressure/constants'
import type {
  AuthorChapterSetupV2,
  Sf2ChapterMeaning,
  Sf2RevealContext,
  Sf2State,
  Sf2ThreadStatus,
} from '@/lib/sf2/types'

const AUTHOR_MODEL = process.env.SF2_AUTHOR_MODEL || 'claude-sonnet-4-5-20250929'
const AUTHOR_MAX_TOKENS = Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 8192)

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
    }
  | {
      ok: false
      kind: 'no_tool_use' | 'invalid'
      errors: string[]
      response: Anthropic.Message
      usage: AnthropicUsage
      attempts: number
      textPreview?: string
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

  while (attempt < maxAttempts) {
    attempt += 1
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
      }
    }

    const raw = toolUse.input as Record<string, unknown>
    const errors = validate(raw)
    if (errors.length === 0) {
      if (attempt > 1) {
        console.log(`[sf2/author] ${toolName} succeeded on retry`, { attempts: attempt })
      }
      return { ok: true, raw, toolUse, response, usage: aggregate, attempts: attempt }
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
  }
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
    const priorMeaning = (parsed.data.priorChapterMeaning ?? null) as Sf2ChapterMeaning | null
    const targetChapter = parsed.data.targetChapter

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

    assertNoDynamicLeak(SF2_AUTHOR_CORE, 'AUTHOR_CORE')
    assertNoDynamicLeak(SF2_BIBLE_HEGEMONY, 'BIBLE')
    assertNoDynamicLeak(SF2_AUTHOR_ROLE, 'AUTHOR_ROLE')
    assertNoDynamicLeak(situation, 'AUTHOR_SITUATION')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_AUTHOR_CORE,
      bible: SF2_BIBLE_HEGEMONY,
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
        }),
        retryNudge: (errors) =>
          `Your previous tool call was incomplete — these required fields were missing or empty:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\nRe-emit \`${AUTHOR_TOOL_NAME}\` now with EVERY required field filled with substantive, non-empty content. Spend the output tokens you need; do not under-fill. The full chapter setup must come back in this single tool call.`,
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
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const authored = normalizeAuthorSetup(result.raw)
    const isContinuation = (state?.history?.turns?.length ?? 0) > 0
    const validationErrors = validateAuthorSetup(authored, { isContinuation })
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

function validateChapterRaw(
  raw: Record<string, unknown>,
  ctx: DispositionDerivationContext
): string[] {
  const errors: string[] = []
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  if (!stringField(frame, 'title').trim()) errors.push('chapter_frame.title is empty')
  if (!stringField(frame, 'premise').trim()) errors.push('chapter_frame.premise is empty')

  const spectrum = getObject(frame, 'outcome_spectrum', 'outcomeSpectrum')
  if (Object.keys(spectrum).length === 0) {
    errors.push('chapter_frame.outcome_spectrum is missing')
  } else {
    for (const key of ['clean', 'costly', 'failure', 'catastrophic']) {
      if (!stringField(spectrum, key).trim()) errors.push(`chapter_frame.outcome_spectrum.${key} is empty`)
    }
  }

  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  if (!stringField(antag, 'source_system', 'sourceSystem').trim()) errors.push('antagonist_field.source_system is empty')
  if (!stringField(antag, 'core_pressure', 'corePressure').trim()) errors.push('antagonist_field.core_pressure is empty')
  const defaultFace = getObject(antag, 'default_face', 'defaultFace')
  if (!stringField(defaultFace, 'name').trim()) errors.push('antagonist_field.default_face.name is empty')

  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')
  for (const key of ['location', 'atmospheric_condition', 'initial_state', 'first_player_facing', 'immediate_choice']) {
    const camel = key.replace(/_([a-z])/g, (_m, c: string) => c.toUpperCase())
    if (!stringField(opening, key, camel).trim()) errors.push(`opening_scene_spec.${key} is empty`)
  }

  const npcs = getArray(raw, 'starting_npcs', 'startingNPCs')
  if (npcs.length === 0) errors.push('starting_npcs is empty (need 3-5)')
  const threads = getArray(raw, 'active_threads', 'activeThreads')
  if (threads.length === 0) errors.push('active_threads is empty (need at least 1 chapter-driving thread)')
  threads.forEach((t, i) => {
    const initial = valueField(t, 'initial_tension', 'initialTension')
    if (initial === undefined) return
    const value = Number(initial)
    if (!Number.isFinite(value) || value < 0 || value > CHAPTER_OPEN_CAP) {
      errors.push(`active_threads[${i}].initial_tension must be between 0 and ${CHAPTER_OPEN_CAP}`)
    }
  })

  const arcLink = getObject(raw, 'arc_link', 'arcLink')
  if (!stringField(arcLink, 'arc_id', 'arcId').trim()) errors.push('arc_link.arc_id is empty')
  if (!stringField(arcLink, 'chapter_function', 'chapterFunction').trim()) errors.push('arc_link.chapter_function is empty')

  const pacing = getObject(raw, 'pacing_contract', 'pacingContract')
  if (!stringField(pacing, 'chapter_question', 'chapterQuestion').trim()) errors.push('pacing_contract.chapter_question is empty')
  const targetTurns = getObject(pacing, 'target_turns', 'targetTurns')
  if (Number(targetTurns.min ?? 0) < 1 || Number(targetTurns.max ?? 0) < 1) {
    errors.push('pacing_contract.target_turns is missing')
  }

  // Disposition derivation: per-genre default ranges per role × affiliation pair.
  // Catches the rule-8 violation class observed in playthrough 7 (settlement
  // elder authored as 'trusted' toward an Imperial Warden). Author may override
  // when there's authorial reason — captured by `disposition_reason` ≥5 words.
  // ctx.genreId === '' (campaign without a state, edge case) → derivation
  // returns null and no constraint applies.
  npcs.forEach((n, i) => {
    const role = stringField(n, 'role')
    const affiliation = stringField(n, 'affiliation')
    const initialDisposition = stringField(n, 'initial_disposition', 'initialDisposition')
    const dispositionReason = stringField(n, 'disposition_reason', 'dispositionReason')
    if (!role || !affiliation || !initialDisposition) return
    const err = validateNpcDisposition(
      ctx,
      { role, affiliation, initialDisposition, dispositionReason },
      `starting_npcs[${i}]`
    )
    if (err) errors.push(err)
  })

  const ladder = getArray(raw, 'pressure_ladder', 'pressureLadder')
  if (ladder.length === 0) errors.push('pressure_ladder is empty (need 3-5)')
  const revelations = getArray(raw, 'possible_revelations', 'possibleRevelations')
  if (revelations.length === 0) errors.push('possible_revelations is empty (need 2-4)')
  const faultLines = getArray(raw, 'moral_fault_lines', 'moralFaultLines')
  if (faultLines.length === 0) errors.push('moral_fault_lines is empty (need 2-4)')
  const escalations = getArray(raw, 'escalation_options', 'escalationOptions')
  if (escalations.length === 0) errors.push('escalation_options is empty (need 3-5)')
  const lore = getArray(raw, 'editorialized_lore', 'editorializedLore')
  if (lore.length === 0) errors.push('editorialized_lore is empty (need 2-3)')
  return errors
}

function normalizeAuthorSetup(raw: Record<string, unknown>): AuthorChapterSetupV2 {
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  const possibleFacesRaw = getArray(antag, 'possible_faces', 'possibleFaces')
  const defaultFace =
    getObject(antag, 'default_face', 'defaultFace') ??
    (possibleFacesRaw[0] as Record<string, unknown> | undefined) ??
    {}
  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')
  const arcLink = getObject(raw, 'arc_link', 'arcLink')
  const pacing = getObject(raw, 'pacing_contract', 'pacingContract')
  const targetTurns = getObject(pacing, 'target_turns', 'targetTurns')
  const continuation = getObject(raw, 'continuation_moves', 'continuationMoves')
  const continuationMoves =
    Object.keys(continuation).length > 0
      ? {
          priorChapterMeaning: stringField(continuation, 'prior_chapter_meaning', 'priorChapterMeaning'),
          largerPatternRevealed: stringField(continuation, 'larger_pattern_revealed', 'largerPatternRevealed'),
          institutionalScaleEscalation: {
            from: stringField(getObject(continuation, 'institutional_scale_escalation', 'institutionalScaleEscalation'), 'from'),
            to: stringField(getObject(continuation, 'institutional_scale_escalation', 'institutionalScaleEscalation'), 'to'),
          },
          newNamedThreatFromPriorSuccess: {
            name: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'name'),
            emergedFrom: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'emerged_from', 'emergedFrom'),
            whyInevitable: stringField(getObject(continuation, 'new_named_threat_from_prior_success', 'newNamedThreatFromPriorSuccess'), 'why_inevitable', 'whyInevitable'),
          },
          worsenedExistingThread: {
            threadId: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'thread_id', 'threadId'),
            priorSmallDetail: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'prior_small_detail', 'priorSmallDetail'),
            whyLoadBearingNow: stringField(getObject(continuation, 'worsened_existing_thread', 'worsenedExistingThread'), 'why_load_bearing_now', 'whyLoadBearingNow'),
          },
          plantedMidchapterRevelation: {
            hiddenStatement: stringField(getObject(continuation, 'planted_midchapter_revelation', 'plantedMidchapterRevelation'), 'hidden_statement', 'hiddenStatement'),
            recontextualizes: stringField(getObject(continuation, 'planted_midchapter_revelation', 'plantedMidchapterRevelation'), 'recontextualizes'),
          },
          relationshipDeepeningTarget: Object.keys(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget')).length > 0
            ? {
                entityId: stringField(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget'), 'entity_id', 'entityId'),
                pressure: stringField(getObject(continuation, 'relationship_deepening_target', 'relationshipDeepeningTarget'), 'pressure'),
              }
            : undefined,
        }
      : undefined

  return {
    chapterFrame: {
      title: stringField(frame, 'title'),
      premise: stringField(frame, 'premise'),
      activePressure: stringField(frame, 'active_pressure', 'activePressure'),
      centralTension: stringField(frame, 'central_tension', 'centralTension'),
      chapterScope: stringField(frame, 'chapter_scope', 'chapterScope'),
      objective: stringField(frame, 'objective'),
      crucible: stringField(frame, 'crucible'),
      outcomeSpectrum: valueField(frame, 'outcome_spectrum', 'outcomeSpectrum') as AuthorChapterSetupV2['chapterFrame']['outcomeSpectrum'],
    },
    antagonistField: {
      sourceSystem: stringField(antag, 'source_system', 'sourceSystem'),
      corePressure: stringField(antag, 'core_pressure', 'corePressure'),
      defaultFace: {
        name: stringField(defaultFace, 'name'),
        role: stringField(defaultFace, 'role'),
        pressureStyle: stringField(defaultFace, 'pressure_style', 'pressureStyle'),
      },
      possibleFaces: possibleFacesRaw.map((f) => ({
        id: stringField(f, 'id'),
        name: stringField(f, 'name'),
        role: stringField(f, 'role'),
        becomesPrimaryWhen: stringField(f, 'becomes_primary_when', 'becomesPrimaryWhen'),
        pressureStyle: stringField(f, 'pressure_style', 'pressureStyle'),
      })),
      escalationLogic: stringField(antag, 'escalation_logic', 'escalationLogic'),
    },
    startingNPCs: getArray(raw, 'starting_npcs', 'startingNPCs').map((n) => ({
      id: stringField(n, 'id'),
      name: stringField(n, 'name'),
      affiliation: stringField(n, 'affiliation'),
      role: stringField(n, 'role'),
      voiceRegister: stringField(n, 'voice_register', 'voiceRegister'),
      dramaticFunction: stringField(n, 'dramatic_function', 'dramaticFunction'),
      hiddenPressure: stringField(n, 'hidden_pressure', 'hiddenPressure'),
      retrievalCue: stringField(n, 'retrieval_cue', 'retrievalCue'),
      initialDisposition: (valueField(n, 'initial_disposition', 'initialDisposition') as AuthorChapterSetupV2['startingNPCs'][number]['initialDisposition']) ?? 'neutral',
      dispositionReason: stringField(n, 'disposition_reason', 'dispositionReason'),
    })),
    activeThreads: getArray(raw, 'active_threads', 'activeThreads').map((t) => ({
      id: stringField(t, 'id'),
      title: stringField(t, 'title'),
      question: stringField(t, 'question'),
      ownerHint: stringField(t, 'owner_hint', 'ownerHint'),
      tension: Number(valueField(t, 'tension') ?? 5),
      initialTension: optionalBoundedTension(valueField(t, 'initial_tension', 'initialTension')),
      resolutionCriteria: stringField(t, 'resolution_criteria', 'resolutionCriteria'),
      failureMode: stringField(t, 'failure_mode', 'failureMode'),
      retrievalCue: stringField(t, 'retrieval_cue', 'retrievalCue'),
    })),
    pressureLadder: getArray(raw, 'pressure_ladder', 'pressureLadder').map((s) => ({
      id: stringField(s, 'id'),
      pressure: stringField(s, 'pressure'),
      triggerCondition: stringField(s, 'trigger_condition', 'triggerCondition'),
      narrativeEffect: stringField(s, 'narrative_effect', 'narrativeEffect'),
      severity: stringField(s, 'severity') === 'hard' ? 'hard' : 'standard',
    })),
    possibleRevelations: getArray(raw, 'possible_revelations', 'possibleRevelations').map((r) => ({
      id: stringField(r, 'id'),
      statement: stringField(r, 'statement'),
      heldBy: stringField(r, 'held_by', 'heldBy'),
      emergenceCondition: stringField(r, 'emergence_condition', 'emergenceCondition'),
      recontextualizes: stringField(r, 'recontextualizes'),
      hintPhrases: stringArray(r, 'hint_phrases', 'hintPhrases'),
      hintsRequired: optionalPositiveInt(valueField(r, 'hints_required', 'hintsRequired')),
      validRevealContexts: revealContextArray(r, 'valid_reveal_contexts', 'validRevealContexts'),
      invalidRevealContexts: revealContextArray(r, 'invalid_reveal_contexts', 'invalidRevealContexts'),
    })),
    moralFaultLines: getArray(raw, 'moral_fault_lines', 'moralFaultLines').map((m) => ({
      id: stringField(m, 'id'),
      tension: stringField(m, 'tension'),
      sideA: stringField(m, 'side_a', 'sideA'),
      sideB: stringField(m, 'side_b', 'sideB'),
      whyItHurts: stringField(m, 'why_it_hurts', 'whyItHurts'),
    })),
    escalationOptions: getArray(raw, 'escalation_options', 'escalationOptions').map((e) => ({
      id: stringField(e, 'id'),
      type: (valueField(e, 'type') ?? 'institutional') as AuthorChapterSetupV2['escalationOptions'][number]['type'],
      condition: stringField(e, 'condition'),
      consequence: stringField(e, 'consequence'),
    })),
    editorializedLore: getArray(raw, 'editorialized_lore', 'editorializedLore').map((l) => ({
      item: stringField(l, 'item'),
      relevanceNow: stringField(l, 'relevance_now', 'relevanceNow'),
      deliveryMethod: stringField(l, 'delivery_method', 'deliveryMethod'),
    })),
    arcLink: {
      arcId: stringField(arcLink, 'arc_id', 'arcId'),
      chapterFunction: stringField(arcLink, 'chapter_function', 'chapterFunction'),
      playerStanceRead: stringField(arcLink, 'player_stance_read', 'playerStanceRead'),
      pressureEngineIds: stringArray(arcLink, 'pressure_engine_ids', 'pressureEngineIds'),
    },
    pacingContract: {
      targetTurns: {
        min: Number(valueField(targetTurns, 'min') ?? 18),
        max: Number(valueField(targetTurns, 'max') ?? 25),
      },
      chapterQuestion: stringField(pacing, 'chapter_question', 'chapterQuestion'),
      acceptableResolutions: stringArray(pacing, 'acceptable_resolutions', 'acceptableResolutions'),
      earlyPressure: stringField(pacing, 'early_pressure', 'earlyPressure'),
      middlePressure: stringField(pacing, 'middle_pressure', 'middlePressure'),
      latePressure: stringField(pacing, 'late_pressure', 'latePressure'),
      closeWhenAny: stringArray(pacing, 'close_when_any', 'closeWhenAny'),
      avoidExtendingFor: stringArray(pacing, 'avoid_extending_for', 'avoidExtendingFor'),
    },
    continuationMoves,
    threadTransitions: getArray(raw, 'thread_transitions', 'threadTransitions').length > 0
      ? getArray(raw, 'thread_transitions', 'threadTransitions').map((t) => ({
          id: stringField(t, 'id'),
          toStatus: stringField(t, 'to_status', 'toStatus') as Sf2ThreadStatus,
          reason: stringField(t, 'reason'),
        }))
      : undefined,
    openingSceneSpec: {
      location: stringField(opening, 'location'),
      atmosphericCondition: stringField(opening, 'atmospheric_condition', 'atmosphericCondition'),
      initialState: stringField(opening, 'initial_state', 'initialState'),
      firstPlayerFacing: stringField(opening, 'first_player_facing', 'firstPlayerFacing'),
      immediateChoice: stringField(opening, 'immediate_choice', 'immediateChoice'),
      noStartingCombat: Boolean(valueField(opening, 'no_starting_combat', 'noStartingCombat')),
      noExpositionDump: Boolean(valueField(opening, 'no_exposition_dump', 'noExpositionDump')),
      visibleNpcIds: Array.isArray(valueField(opening, 'visible_npc_ids', 'visibleNpcIds'))
        ? (valueField(opening, 'visible_npc_ids', 'visibleNpcIds') as unknown[]).map(String).filter((s) => s.length > 0)
        : undefined,
      withheldPremiseFacts: Array.isArray(valueField(opening, 'withheld_premise_facts', 'withheldPremiseFacts'))
        ? (valueField(opening, 'withheld_premise_facts', 'withheldPremiseFacts') as unknown[]).map(String).filter((s) => s.length > 0)
        : undefined,
    },
  }
}

// Final boundary validation on the normalized single-call AuthorChapterSetupV2.
function validateAuthorSetup(
  authored: AuthorChapterSetupV2,
  opts: { isContinuation: boolean } = { isContinuation: false }
): string[] {
  const errors: string[] = []
  const requiredOpeningStrings: Array<keyof AuthorChapterSetupV2['openingSceneSpec']> = [
    'location',
    'atmosphericCondition',
    'initialState',
    'firstPlayerFacing',
    'immediateChoice',
  ]
  for (const key of requiredOpeningStrings) {
    const value = authored.openingSceneSpec[key]
    if (typeof value !== 'string' || value.trim().length === 0) {
      errors.push(`opening_scene_spec.${String(key)} is empty`)
    }
  }
  if (!authored.chapterFrame.title.trim()) errors.push('chapter_frame.title is empty')
  if (!authored.chapterFrame.premise.trim()) errors.push('chapter_frame.premise is empty')

  const spectrum = authored.chapterFrame.outcomeSpectrum as unknown as Record<string, unknown> | undefined
  if (!spectrum || typeof spectrum !== 'object') {
    errors.push('chapter_frame.outcome_spectrum is missing')
  } else {
    for (const key of ['clean', 'costly', 'failure', 'catastrophic']) {
      const value = spectrum[key]
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push(`chapter_frame.outcome_spectrum.${key} is empty`)
      }
    }
  }

  const antag = authored.antagonistField
  if (!antag.sourceSystem.trim()) errors.push('antagonist_field.source_system is empty')
  if (!antag.corePressure.trim()) errors.push('antagonist_field.core_pressure is empty')
  if (!antag.defaultFace.name.trim()) errors.push('antagonist_field.default_face.name is empty')

  if (authored.startingNPCs.length === 0) errors.push('starting_npcs is empty')
  if (authored.activeThreads.length === 0) errors.push('active_threads is empty')
  authored.activeThreads.forEach((thread, i) => {
    if (thread.initialTension === undefined) return
    if (thread.initialTension < 0 || thread.initialTension > CHAPTER_OPEN_CAP) {
      errors.push(`active_threads[${i}].initial_tension must be between 0 and ${CHAPTER_OPEN_CAP}`)
    }
  })
  if (!authored.arcLink.arcId.trim()) errors.push('arc_link.arc_id is empty')
  if (!authored.arcLink.chapterFunction.trim()) errors.push('arc_link.chapter_function is empty')
  if (!authored.pacingContract.chapterQuestion.trim()) errors.push('pacing_contract.chapter_question is empty')
  if (authored.pacingContract.targetTurns.min < 1 || authored.pacingContract.targetTurns.max < authored.pacingContract.targetTurns.min) {
    errors.push('pacing_contract.target_turns is invalid')
  }

  // Continuation Chapter Law enforcement (chapter ≥ 2 only). The five-move
  // discipline lives in SF2_AUTHOR_ROLE; validation here makes it load-bearing.
  if (opts.isContinuation) {
    const cm = authored.continuationMoves
    if (!cm) {
      errors.push('continuation_moves is missing (required for chapter ≥ 2)')
    } else {
      if (!cm.priorChapterMeaning?.trim()) errors.push('continuation_moves.prior_chapter_meaning is empty')
      if (!cm.largerPatternRevealed?.trim()) errors.push('continuation_moves.larger_pattern_revealed is empty')
      if (!cm.institutionalScaleEscalation?.from?.trim() || !cm.institutionalScaleEscalation?.to?.trim()) {
        errors.push('continuation_moves.institutional_scale_escalation requires both from and to')
      }
      if (!cm.newNamedThreatFromPriorSuccess?.name?.trim() || !cm.newNamedThreatFromPriorSuccess?.emergedFrom?.trim()) {
        errors.push('continuation_moves.new_named_threat_from_prior_success requires name and emerged_from')
      }
      if (!cm.worsenedExistingThread?.threadId?.trim() || !cm.worsenedExistingThread?.priorSmallDetail?.trim()) {
        errors.push('continuation_moves.worsened_existing_thread requires thread_id and prior_small_detail')
      }
      if (!cm.plantedMidchapterRevelation?.hiddenStatement?.trim()) {
        errors.push('continuation_moves.planted_midchapter_revelation.hidden_statement is empty')
      }
    }
  }

  return errors
}

function valueField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): unknown {
  if (!obj) return undefined
  return obj[snake] ?? (camel ? obj[camel] : undefined)
}

function optionalBoundedTension(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.min(CHAPTER_OPEN_CAP, Math.round(n)))
}

function optionalPositiveInt(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const n = Number(value)
  if (!Number.isFinite(n)) return undefined
  return Math.max(0, Math.round(n))
}

const REVEAL_CONTEXTS: Sf2RevealContext[] = [
  'crisis_of_trust',
  'private_pressure',
  'documentary_surface',
  'confession',
  'accusation',
  'forced_disclosure',
  'inadvertent',
]

function revealContextArray(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Sf2RevealContext[] {
  return stringArray(obj, snake, camel).filter((v): v is Sf2RevealContext =>
    REVEAL_CONTEXTS.includes(v as Sf2RevealContext)
  )
}

function stringField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): string {
  return String(valueField(obj, snake, camel) ?? '')
}

function stringArray(obj: Record<string, unknown> | undefined, snake: string, camel?: string): string[] {
  const value = valueField(obj, snake, camel)
  return Array.isArray(value) ? value.map(String).filter((s) => s.trim().length > 0) : []
}

function getObject(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Record<string, unknown> {
  const value = valueField(obj, snake, camel)
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function getArray(
  obj: Record<string, unknown> | undefined,
  snake: string,
  camel?: string
): Array<Record<string, unknown>> {
  const value = valueField(obj, snake, camel)
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object' && !Array.isArray(item)
      )
    : []
}
