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
import { SF2_BIBLE_HEGEMONY } from '@/lib/sf2/narrator/prompt'
import { composeSystemBlocks, assertNoDynamicLeak } from '@/lib/sf2/prompt/compose'
import { applyArchivistPatch, summarizePatchOutcome } from '@/lib/sf2/validation/apply-patch'
import { formatDeferredWrites } from '@/lib/sf2/validation/format-deferred'
import { evaluateCurrentPrimaryFace } from '@/lib/sf2/runtime/antagonist-face'
// updatePressureLadder removed: pattern-based trigger matching didn't match
// any Author-generated natural-language triggers. Ladder firing is now
// Archivist-driven via extract_turn's ladder_fires field, applied in
// applyArchivistPatch.
import { pruneGraph } from '@/lib/sf2/runtime/prune-graph'
import type {
  Sf2ArchivistAttachment,
  Sf2ArchivistCreate,
  Sf2ArchivistFlag,
  Sf2ArchivistPatch,
  Sf2ArchivistTransition,
  Sf2ArchivistUpdate,
  Sf2CoherenceFinding,
  Sf2CoherenceFindingType,
  Sf2PatchConfidence,
  Sf2SceneSummary,
  Sf2State,
} from '@/lib/sf2/types'

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
    assertNoDynamicLeak(SF2_ARCHIVIST_CORE, 'ARCHIVIST_CORE')
    assertNoDynamicLeak(SF2_BIBLE_HEGEMONY, 'BIBLE')
    assertNoDynamicLeak(SF2_ARCHIVIST_ROLE, 'ARCHIVIST_ROLE')
    assertNoDynamicLeak(situation, 'ARCHIVIST_SITUATION')

    const { blocks: system } = composeSystemBlocks({
      core: SF2_ARCHIVIST_CORE,
      bible: SF2_BIBLE_HEGEMONY,
      role: SF2_ARCHIVIST_ROLE,
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
    try {
      const response = await client.messages.create({
        model: ARCHIVIST_MODEL,
        max_tokens: 4096,
        system,
        tools: cachedTools,
        // `any` = must call some tool. Archivist has only one tool, so this is
        // functionally equivalent to { type: 'tool', name: extract_turn } but
        // doesn't bypass prompt caching on Haiku 4.5 the way forced-tool does.
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

    const patch = normalizeArchivistPatch(toolUse.input as Record<string, unknown>, turnIndex)
    const applyResult = applyArchivistPatch(state, patch, state.meta.currentChapter)
    const summary = summarizePatchOutcome(applyResult)

    // Surface rejected writes loudly. Apply-patch's outcomes already capture
    // every reject with a reason, but they get buried in the response payload.
    // Logging here makes silent drops visible during dev runs without forcing
    // a fixture replay to diagnose.
    const rejectedOutcomes = applyResult.outcomes.filter((o) => !o.accepted)
    if (rejectedOutcomes.length > 0) {
      console.warn('[sf2/archivist] writes rejected this turn', {
        turnIndex,
        rejectedCount: rejectedOutcomes.length,
        totalCount: applyResult.outcomes.length,
        rejections: rejectedOutcomes.map((o) => ({
          writeRef: o.writeRef,
          reason: o.reason,
          confidence: o.confidenceTier,
        })),
      })
    }

    // Stamp the patch onto the corresponding turn record so future turns can
    // read pacingClassification for signal computation.
    const nextState = applyResult.nextState
    const turnRecord = nextState.history.turns.find((t) => t.index === patch.turnIndex - 1)
      ?? nextState.history.turns.at(-1)
    if (turnRecord) {
      turnRecord.archivistPatchApplied = patch
      turnRecord.pacingClassification = patch.pacingClassification
    }

    // Post-turn recompute (runtime phases per design doc §10):
    // 1. Evaluate antagonist face from player alignment signals
    // 2. Ladder fires are Archivist-driven: evaluated inside the extract_turn
    //    tool call (the Archivist judges triggerCondition against prose+state),
    //    and applied by applyArchivistPatch above. No server-side recompute.
    const faceEval = evaluateCurrentPrimaryFace(nextState.chapter, nextState)
    if (faceEval.shift) {
      nextState.chapter.setup.antagonistField.currentPrimaryFace = faceEval.face
      for (const f of nextState.chapter.scaffolding.antagonistFaces) {
        f.active = f.id === faceEval.face.id
      }
    }
    // Resolve the Archivist-fired ladder steps from the ids it emitted for
    // the client debug panel. The flip-to-fired already happened in
    // applyArchivistPatch; this is just the derived instrumentation payload.
    const firedThisTurn = (patch.ladderFires ?? [])
      .map((id) => nextState.chapter.setup.pressureLadder.find((s) => s.id === id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s))

    // Opportunistic graph pruning: demote decisions/promises/clues whose
    // anchor threads have transitioned out of 'active'.
    const pruneResult = pruneGraph(nextState)
    const prunedState = pruneResult.nextState

    // Stash low-confidence writes as recovery notes for the NEXT Narrator
    // turn. The Narrator will see them as "LAST TURN: re-establish if still
    // relevant" cues, which is the designed recovery path for anchor misses.
    const recoveryNotes = formatDeferredWrites(applyResult.deferredWrites)
    prunedState.campaign.pendingRecoveryNotes =
      recoveryNotes.length > 0 ? recoveryNotes : undefined

    // Derive anchor_miss findings from apply-patch drift. Surfaced as proper
    // per-turn findings so the debug stream and aggregator see them with
    // structure rather than only as flat counts in summary.anchorMisses.
    const anchorMissFindings: Sf2CoherenceFinding[] = applyResult.drift
      .filter((d) => d.kind === 'anchor_reference_missing')
      .map((d) => ({
        type: 'anchor_miss' as Sf2CoherenceFindingType,
        severity: 'low' as const,
        evidenceQuote: '',
        stateReference: d.entityId ?? '',
        suggestedNote: d.detail.slice(0, 200),
      }))

    const allFindings = [...(patch.coherenceFindings ?? []), ...anchorMissFindings]

    // Stash coherence notes for the NEXT Narrator turn. Pre-formatted for
    // direct injection into the per-turn delta; raw findings go out in the
    // response for the client debug stream.
    // Anchor-miss findings are excluded from the Narrator's pendingNotes —
    // they're diagnostic for the system, not corrective context the Narrator
    // can act on next turn.
    const coherenceNotes = patch.coherenceFindings
      ? formatCoherenceNotes(patch.coherenceFindings)
      : []
    prunedState.campaign.pendingCoherenceNotes =
      coherenceNotes.length > 0 ? coherenceNotes : undefined
    const pruneSummary = {
      demotedDecisions: pruneResult.demotedDecisions,
      demotedPromises: pruneResult.demotedPromises,
      consumedClues: pruneResult.consumedClues,
      clearedFloatingClues: pruneResult.clearedFloatingClues,
    }

    return new Response(
      JSON.stringify({
        nextState: prunedState,
        patch,
        outcomes: applyResult.outcomes,
        deferredWrites: applyResult.deferredWrites,
        drift: applyResult.drift,
        summary,
        faceShift: faceEval.shift,
        ladderFired: firedThisTurn,
        pruneSummary,
        coherenceFindings: allFindings,
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

// Normalize tool-call snake_case fields to internal camelCase shape.
function normalizeArchivistPatch(raw: Record<string, unknown>, turnIndex: number): Sf2ArchivistPatch {
  const creates = Array.isArray(raw.creates)
    ? (raw.creates as Array<Record<string, unknown>>).map(normalizeCreate)
    : []
  const updates = Array.isArray(raw.updates)
    ? (raw.updates as Array<Record<string, unknown>>).map(normalizeUpdate)
    : []
  const transitions = Array.isArray(raw.transitions)
    ? (raw.transitions as Array<Record<string, unknown>>).map(normalizeTransition)
    : []
  const attachments = Array.isArray(raw.attachments)
    ? (raw.attachments as Array<Record<string, unknown>>).map(normalizeAttachment)
    : []
  const flags = Array.isArray(raw.flags)
    ? (raw.flags as Array<Record<string, unknown>>).map(normalizeFlag)
    : []

  const sceneResult = raw.scene_result as Record<string, unknown> | undefined
  const sceneResultNormalized: Sf2SceneSummary | undefined = sceneResult
    ? {
        sceneId: String(sceneResult.scene_id ?? ''),
        chapter: 0, // filled by applyPatch via chapter arg
        summary: String(sceneResult.summary ?? ''),
        leadsTo: normalizeLeadsTo(sceneResult.leads_to),
      }
    : undefined

  const pc = raw.pacing_classification as Record<string, unknown> | undefined
  const pacing = {
    worldInitiated: Boolean(pc?.world_initiated),
    sceneEndLeadsTo: normalizeLeadsToForClassification(pc?.scene_end_leads_to),
    tensionDeltasByThreadId: (pc?.tension_deltas as Record<string, number> | undefined) ?? {},
  }

  const lexiconAdditionsRaw = Array.isArray(raw.lexicon_additions)
    ? (raw.lexicon_additions as Array<Record<string, unknown>>)
    : []
  const lexiconAdditions = lexiconAdditionsRaw.map((l) => ({
    phrase: String(l.phrase ?? ''),
    register: String(l.register ?? ''),
    exampleContext: String(l.example_context ?? ''),
  }))

  const ladderFires = Array.isArray(raw.ladder_fires)
    ? (raw.ladder_fires as string[]).map(String).filter((s) => s.length > 0)
    : []

  const coherenceFindingsRaw = Array.isArray(raw.coherence_findings)
    ? (raw.coherence_findings as Array<Record<string, unknown>>)
    : []
  const coherenceFindings = coherenceFindingsRaw
    .map(normalizeCoherenceFinding)
    .filter((f): f is Sf2CoherenceFinding => f !== null)

  return {
    turnIndex,
    creates,
    updates,
    transitions,
    attachments,
    sceneResult: sceneResultNormalized,
    pacingClassification: pacing,
    flags,
    lexiconAdditions: lexiconAdditions.length > 0 ? lexiconAdditions : undefined,
    ladderFires: ladderFires.length > 0 ? ladderFires : undefined,
    coherenceFindings: coherenceFindings.length > 0 ? coherenceFindings : undefined,
  }
}

const COHERENCE_FINDING_TYPES: Sf2CoherenceFindingType[] = [
  'disposition_incoherence',
  'heat_mismatch',
  'stale_reentry',
  'clue_leak',
  'identity_drift',
  'npc_fabrication',
  'pronoun_drift',
  'age_drift',
  'anchor_miss',
]

function normalizeCoherenceFinding(r: Record<string, unknown>): Sf2CoherenceFinding | null {
  const type = r.type
  if (typeof type !== 'string' || !COHERENCE_FINDING_TYPES.includes(type as Sf2CoherenceFindingType)) {
    return null
  }
  const severityRaw = r.severity
  const severity: Sf2CoherenceFinding['severity'] =
    severityRaw === 'low' || severityRaw === 'medium' || severityRaw === 'high'
      ? severityRaw
      : 'medium'
  return {
    type: type as Sf2CoherenceFindingType,
    severity,
    evidenceQuote: String(r.evidence_quote ?? '').slice(0, 400),
    stateReference: String(r.state_reference ?? ''),
    suggestedNote: String(r.suggested_note ?? '').slice(0, 200),
  }
}

function formatCoherenceNotes(findings: Sf2CoherenceFinding[]): string[] {
  return findings.map((f) => `[${f.severity}] ${f.type} (${f.stateReference}): ${f.suggestedNote}`)
}

function normalizeCreate(r: Record<string, unknown>): Sf2ArchivistCreate {
  return {
    kind: r.kind as Sf2ArchivistCreate['kind'],
    payload: (r.payload as Record<string, unknown>) ?? {},
    confidence: normalizeConfidence(r.confidence),
    sourceQuote: r.source_quote as string | undefined,
  }
}

function normalizeUpdate(r: Record<string, unknown>): Sf2ArchivistUpdate {
  return {
    entityKind: r.entity_kind as Sf2ArchivistUpdate['entityKind'],
    entityId: String(r.entity_id ?? ''),
    changes: (r.changes as Record<string, unknown>) ?? {},
    confidence: normalizeConfidence(r.confidence),
    sourceQuote: r.source_quote as string | undefined,
  }
}

function normalizeTransition(r: Record<string, unknown>): Sf2ArchivistTransition {
  return {
    entityKind: r.entity_kind as Sf2ArchivistTransition['entityKind'],
    entityId: String(r.entity_id ?? ''),
    toStatus: String(r.to_status ?? ''),
    reason: String(r.reason ?? ''),
    confidence: normalizeConfidence(r.confidence),
  }
}

function normalizeAttachment(r: Record<string, unknown>): Sf2ArchivistAttachment {
  return {
    kind: r.kind as Sf2ArchivistAttachment['kind'],
    entityId: String(r.entity_id ?? ''),
    threadIds: Array.isArray(r.thread_ids) ? (r.thread_ids as string[]) : [],
    confidence: normalizeConfidence(r.confidence),
  }
}

function normalizeFlag(r: Record<string, unknown>): Sf2ArchivistFlag {
  return {
    kind: r.kind as Sf2ArchivistFlag['kind'],
    detail: String(r.detail ?? ''),
    entityId: r.entity_id as string | undefined,
  }
}

function normalizeConfidence(v: unknown): Sf2PatchConfidence {
  if (v === 'high' || v === 'medium' || v === 'low') return v
  return 'medium'
}

function normalizeLeadsTo(v: unknown): Sf2SceneSummary['leadsTo'] {
  if (v === 'unanswered_question' || v === 'kinetic_carry' || v === 'relational_tension' || v === 'unpaid_promise') {
    return v
  }
  return null
}

function normalizeLeadsToForClassification(
  v: unknown
): Sf2SceneSummary['leadsTo'] | 'not_applicable' {
  if (v === 'not_applicable') return 'not_applicable'
  return normalizeLeadsTo(v)
}
