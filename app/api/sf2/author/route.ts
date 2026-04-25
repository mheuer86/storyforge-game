import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { AUTHOR_TOOLS, AUTHOR_TOOL_NAME } from '@/lib/sf2/author/tools'
import {
  SF2_AUTHOR_CORE,
  SF2_AUTHOR_ROLE,
  buildAuthorSituation,
} from '@/lib/sf2/author/prompt'
import { compileAuthorInputSeed } from '@/lib/sf2/author/payload'
import { transformAuthorSetup } from '@/lib/sf2/author/transform'
import { SF2_BIBLE_HEGEMONY } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import type {
  AuthorChapterSetupV2,
  Sf2ChapterMeaning,
  Sf2State,
  Sf2ThreadStatus,
} from '@/lib/sf2/types'

const AUTHOR_MODEL = process.env.SF2_AUTHOR_MODEL || 'claude-haiku-4-5-20251001'
const AUTHOR_MAX_TOKENS = Number(process.env.SF2_AUTHOR_MAX_TOKENS ?? 8192)

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
// Author generates a rich structured JSON (6-10k tokens output) — longer than
// Narrator turns. Ch1 from empty state is the worst case. 300 is Vercel Pro
// max and also the dev-server default.
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

    const cachedTools = AUTHOR_TOOLS.map((t, i) =>
      i === AUTHOR_TOOLS.length - 1
        ? { ...t, cache_control: { type: 'ephemeral' as const } }
        : t
    )

    const messages: Anthropic.MessageParam[] = [
      {
        role: 'user',
        content: `AUTHOR INPUT SEED (JSON):\n\n${JSON.stringify(seed, null, 2)}\n\nEmit author_setup now. Follow the authoring rules and the output length caps strictly.`,
      },
    ]

    const client = resolveClient(req)
    try {
      const response = await client.messages.create({
        model: AUTHOR_MODEL,
        // Keep default below Haiku-class output caps. Observed Ch1 Author output
        // was ~6.8k tokens; if a configured model supports more, bump via env.
        max_tokens: AUTHOR_MAX_TOKENS,
        system,
        tools: cachedTools,
        tool_choice: { type: 'any' },
        messages,
      })

      const usage = response.usage as {
        input_tokens: number
        output_tokens: number
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }

      const toolUse = response.content.find(
        (b): b is Anthropic.ToolUseBlock =>
          b.type === 'tool_use' && b.name === AUTHOR_TOOL_NAME
      )

      if (!toolUse) {
        const textContent = response.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('\n')
        console.error('[sf2/author] no tool_use in response', {
          model: AUTHOR_MODEL,
          stopReason: response.stop_reason,
          textPreview: textContent.slice(0, 500),
        })
        return new Response(
          JSON.stringify({
            error: 'author_no_tool_use',
            stopReason: response.stop_reason,
            textPreview: textContent.slice(0, 500),
            usage,
          }),
          { status: 502, headers: { 'Content-Type': 'application/json' } }
        )
      }

      const authored = normalizeAuthorSetup(toolUse.input as Record<string, unknown>)
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
          usage: {
            inputTokens: usage.input_tokens,
            outputTokens: usage.output_tokens,
            cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
            cacheReadTokens: usage.cache_read_input_tokens ?? 0,
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (err) {
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

// Normalize snake_case tool input → internal AuthorChapterSetupV2 shape.
function normalizeAuthorSetup(raw: Record<string, unknown>): AuthorChapterSetupV2 {
  const frame = getObject(raw, 'chapter_frame', 'chapterFrame')
  const antag = getObject(raw, 'antagonist_field', 'antagonistField')
  const possibleFacesRaw = getArray(antag, 'possible_faces', 'possibleFaces')
  const defaultFace =
    getObject(antag, 'default_face', 'defaultFace') ??
    (possibleFacesRaw[0] as Record<string, unknown> | undefined) ??
    {}
  const opening = getObject(raw, 'opening_scene_spec', 'openingSceneSpec')

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
      tension: Number(t.tension ?? 5),
      resolutionCriteria: stringField(t, 'resolution_criteria', 'resolutionCriteria'),
      failureMode: stringField(t, 'failure_mode', 'failureMode'),
      retrievalCue: stringField(t, 'retrieval_cue', 'retrievalCue'),
    })),
    pressureLadder: getArray(raw, 'pressure_ladder', 'pressureLadder').map((s) => ({
      id: stringField(s, 'id'),
      pressure: stringField(s, 'pressure'),
      triggerCondition: stringField(s, 'trigger_condition', 'triggerCondition'),
      narrativeEffect: stringField(s, 'narrative_effect', 'narrativeEffect'),
    })),
    possibleRevelations: getArray(raw, 'possible_revelations', 'possibleRevelations').map((r) => ({
      id: stringField(r, 'id'),
      statement: stringField(r, 'statement'),
      heldBy: stringField(r, 'held_by', 'heldBy'),
      emergenceCondition: stringField(r, 'emergence_condition', 'emergenceCondition'),
      recontextualizes: stringField(r, 'recontextualizes'),
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
      type: e.type as AuthorChapterSetupV2['escalationOptions'][number]['type'],
      condition: stringField(e, 'condition'),
      consequence: stringField(e, 'consequence'),
    })),
    editorializedLore: getArray(raw, 'editorialized_lore', 'editorializedLore').map((l) => ({
      item: stringField(l, 'item'),
      relevanceNow: stringField(l, 'relevance_now', 'relevanceNow'),
      deliveryMethod: stringField(l, 'delivery_method', 'deliveryMethod'),
    })),
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

function valueField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): unknown {
  if (!obj) return undefined
  return obj[snake] ?? (camel ? obj[camel] : undefined)
}

function stringField(obj: Record<string, unknown> | undefined, snake: string, camel?: string): string {
  return String(valueField(obj, snake, camel) ?? '')
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
