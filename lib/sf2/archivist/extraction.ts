import { finalizeArchivistTurn } from '../runtime/turn-pipeline'
import type { FinalizeArchivistTurnResult } from '../runtime/turn-pipeline'
import type {
  ApplyPatchResult,
} from '../validation/apply-patch'
import { applyArchivistPatch, summarizePatchOutcome } from '../validation/apply-patch'
import type {
  Sf2ArchivistAttachment,
  Sf2ArchivistCreate,
  Sf2ArchivistFlag,
  Sf2ArchivistPatch,
  Sf2ArchivistTransition,
  Sf2ArchivistUpdate,
  Sf2CoherenceFinding,
  Sf2CoherenceFindingType,
  Sf2EmotionalBeatAddition,
  Sf2EmotionalBeatTag,
  Sf2PatchConfidence,
  Sf2PressureEvent,
  Sf2PronounAnchor,
  Sf2RevealContext,
  Sf2RevelationHintDelivered,
  Sf2RevelationRevealed,
  Sf2SceneSummary,
  Sf2State,
} from '../types'

export interface ArchivistNormalizationTelemetry {
  fallbackCounters: Record<string, number>
}

export interface ArchivistRejectedWriteSummary {
  turnIndex: number
  rejectedCount: number
  totalCount: number
  rejections: Array<{
    writeRef: string
    reason: string | undefined
    confidence: string | undefined
  }>
}

export interface ArchivistExtractionInput {
  state: Sf2State
  rawToolInput: Record<string, unknown>
  turnIndex: number
  narratorProse: string
}

export interface ArchivistExtractionResult {
  patch: Sf2ArchivistPatch
  applyResult: ApplyPatchResult
  summary: ReturnType<typeof summarizePatchOutcome>
  runtimeResult: FinalizeArchivistTurnResult
  normalization: ArchivistNormalizationTelemetry
  rejectedWriteSummary: ArchivistRejectedWriteSummary | null
}

export function processArchivistExtraction(input: ArchivistExtractionInput): ArchivistExtractionResult {
  const normalization = collectArchivistNormalizationTelemetry(input.rawToolInput)
  const patch = normalizeArchivistPatch(input.rawToolInput, input.turnIndex)
  const applyResult = applyArchivistPatch(input.state, patch, input.state.meta.currentChapter)
  const summary = summarizePatchOutcome(applyResult)
  const runtimeResult = finalizeArchivistTurn({
    stateBeforeArchivist: input.state,
    narratorProse: input.narratorProse,
    patch,
    applyResult,
  })

  return {
    patch,
    applyResult,
    summary,
    runtimeResult,
    normalization,
    rejectedWriteSummary: summarizeRejectedWrites(input.turnIndex, applyResult),
  }
}

function summarizeRejectedWrites(
  turnIndex: number,
  applyResult: ApplyPatchResult
): ArchivistRejectedWriteSummary | null {
  const rejectedOutcomes = applyResult.outcomes.filter((o) => !o.accepted)
  if (rejectedOutcomes.length === 0) return null
  return {
    turnIndex,
    rejectedCount: rejectedOutcomes.length,
    totalCount: applyResult.outcomes.length,
    rejections: rejectedOutcomes.map((o) => ({
      writeRef: o.writeRef,
      reason: o.reason,
      confidence: o.confidenceTier,
    })),
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

  const pressureEvents = arrayRecords(raw.pressure_events).map((event, index) =>
    normalizePressureEvent(event, turnIndex, index)
  )

  const lexiconAdditions = arrayRecords(raw.lexicon_additions).map((l) => ({
    phrase: String(l.phrase ?? ''),
    register: String(l.register ?? ''),
    exampleContext: String(l.example_context ?? ''),
  }))

  const emotionalBeats = arrayRecords(raw.emotional_beats)
    .map(normalizeEmotionalBeatAddition)
    .filter((b): b is Sf2EmotionalBeatAddition => b !== null)

  const revelationHintsDelivered = arrayRecords(raw.revelation_hints_delivered)
    .map(normalizeRevelationHintDelivered)
    .filter((h): h is Sf2RevelationHintDelivered => h !== null)

  const revelationsRevealed = arrayRecords(raw.revelations_revealed)
    .map(normalizeRevelationRevealed)
    .filter((r): r is Sf2RevelationRevealed => r !== null)

  const ladderFires = Array.isArray(raw.ladder_fires)
    ? (raw.ladder_fires as string[]).map(String).filter((s) => s.length > 0)
    : []

  const coherenceFindings = arrayRecords(raw.coherence_findings)
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
    pressureEvents: pressureEvents.length > 0 ? pressureEvents : undefined,
    flags,
    lexiconAdditions: lexiconAdditions.length > 0 ? lexiconAdditions : undefined,
    emotionalBeats: emotionalBeats.length > 0 ? emotionalBeats : undefined,
    revelationHintsDelivered: revelationHintsDelivered.length > 0 ? revelationHintsDelivered : undefined,
    revelationsRevealed: revelationsRevealed.length > 0 ? revelationsRevealed : undefined,
    ladderFires: ladderFires.length > 0 ? ladderFires : undefined,
    coherenceFindings: coherenceFindings.length > 0 ? coherenceFindings : undefined,
  }
}

function collectArchivistNormalizationTelemetry(raw: Record<string, unknown>): ArchivistNormalizationTelemetry {
  const counters: Record<string, number> = {}
  const inc = (key: string): void => {
    counters[key] = (counters[key] ?? 0) + 1
  }

  for (const create of arrayRecords(raw.creates)) {
    countConfidenceFallback(create.confidence, inc)
    countHighRiskPayloadFallbacks(create.kind, create.payload, inc)
  }
  for (const update of arrayRecords(raw.updates)) {
    countConfidenceFallback(update.confidence, inc)
    countHighRiskPayloadFallbacks(update.entity_kind, update.changes, inc)
  }
  for (const transition of arrayRecords(raw.transitions)) {
    countConfidenceFallback(transition.confidence, inc)
  }
  for (const attachment of arrayRecords(raw.attachments)) {
    countConfidenceFallback(attachment.confidence, inc)
  }
  for (const finding of arrayRecords(raw.coherence_findings)) {
    if (
      typeof finding.severity === 'string' &&
      finding.severity.trim().length > 0 &&
      finding.severity !== 'low' &&
      finding.severity !== 'medium' &&
      finding.severity !== 'high'
    ) {
      inc('coherence_severity_defaulted')
    }
    if (
      typeof finding.type === 'string' &&
      finding.type.trim().length > 0 &&
      !COHERENCE_FINDING_TYPES.includes(finding.type as Sf2CoherenceFindingType)
    ) {
      inc('coherence_finding_dropped')
    }
  }

  return { fallbackCounters: counters }
}

function arrayRecords(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object' && !Array.isArray(item)))
    : []
}

function countConfidenceFallback(value: unknown, inc: (key: string) => void): void {
  if (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    value !== 'high' &&
    value !== 'medium' &&
    value !== 'low'
  ) {
    inc('confidence_defaulted')
  }
}

function countHighRiskPayloadFallbacks(
  kindRaw: unknown,
  payloadRaw: unknown,
  inc: (key: string) => void
): void {
  if (!payloadRaw || typeof payloadRaw !== 'object' || Array.isArray(payloadRaw)) return
  const payload = payloadRaw as Record<string, unknown>
  const kind = typeof kindRaw === 'string' ? kindRaw : ''

  const pronoun = payload.pronoun ?? payload.pronouns
  if (typeof pronoun === 'string' && pronoun.trim().length > 0) {
    const canonical = normalizePronounAnchorForTelemetry(pronoun)
    if (!canonical) inc('npc_pronoun_dropped')
    else if (canonical !== pronoun.trim().toLowerCase()) inc('npc_pronoun_coerced')
  }

  if (Array.isArray(payload.key_facts) && payload.key_facts.length > 3) {
    inc('npc_key_facts_truncated')
  }

  if (kind === 'temporal_anchor') {
    const temporalKind = payload.kind
    const canonicalTemporalKinds = ['deadline', 'timestamp', 'duration', 'sequence', 'recurrence']
    if (
      typeof temporalKind === 'string' &&
      temporalKind.trim().length > 0 &&
      !canonicalTemporalKinds.includes(temporalKind.trim())
    ) {
      inc('temporal_anchor_kind_defaulted')
    }
  }
}

function normalizePronounAnchorForTelemetry(raw: string): Sf2PronounAnchor | null {
  const key = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!key) return null
  if (['she', 'her', 'she/her', 'she-hers', 'shehers'].includes(key)) return 'she/her'
  if (['he', 'him', 'he/him', 'he-him', 'hehim'].includes(key)) return 'he/him'
  if (['they', 'them', 'they/them', 'they-them', 'theythem'].includes(key)) return 'they/them'
  if (key === 'other') return 'other'
  return null
}

const EMOTIONAL_BEAT_TAGS: Sf2EmotionalBeatTag[] = [
  'confession',
  'near_confession',
  'evasion',
  'betrayal',
  'loyalty_test',
  'restraint',
  'turning_point',
  'pivot',
  'breakthrough',
  'vulnerability',
  'cost_accepted',
  'boundary_drawn',
  'intimidation_landed',
  'intimidation_failed',
  'decision_revealed',
  'mask_slipped',
]

const REVEAL_CONTEXTS: Sf2RevealContext[] = [
  'crisis_of_trust',
  'private_pressure',
  'documentary_surface',
  'confession',
  'accusation',
  'forced_disclosure',
  'inadvertent',
]

function normalizeRevealContext(v: unknown): Sf2RevealContext | null {
  return typeof v === 'string' && REVEAL_CONTEXTS.includes(v as Sf2RevealContext)
    ? (v as Sf2RevealContext)
    : null
}

function normalizeRevelationHintDelivered(r: Record<string, unknown>): Sf2RevelationHintDelivered | null {
  const revelationId = String(r.revelation_id ?? '').trim()
  const phraseMatched = String(r.phrase_matched ?? '').trim()
  if (!revelationId || !phraseMatched) return null
  return {
    revelationId,
    phraseMatched,
    proseExcerpt: String(r.prose_excerpt ?? '').slice(0, 400),
  }
}

function normalizeRevelationRevealed(r: Record<string, unknown>): Sf2RevelationRevealed | null {
  const revelationId = String(r.revelation_id ?? '').trim()
  const context = normalizeRevealContext(r.context)
  if (!revelationId || !context) return null
  return {
    revelationId,
    context,
    evidenceQuote: String(r.evidence_quote ?? '').slice(0, 400),
  }
}

function normalizeEmotionalBeatAddition(r: Record<string, unknown>): Sf2EmotionalBeatAddition | null {
  const text = String(r.text ?? '').trim()
  if (!text) return null
  const tags = Array.isArray(r.emotional_tags)
    ? (r.emotional_tags as unknown[])
        .filter((t): t is Sf2EmotionalBeatTag =>
          typeof t === 'string' && EMOTIONAL_BEAT_TAGS.includes(t as Sf2EmotionalBeatTag)
        )
    : []
  if (tags.length === 0) return null
  const salienceRaw = Number(r.salience ?? 0)
  const salience = Number.isFinite(salienceRaw)
    ? Math.max(0, Math.min(1, salienceRaw))
    : 0
  return {
    text,
    participants: Array.isArray(r.participants) ? (r.participants as unknown[]).map(String).filter(Boolean) : [],
    anchoredTo: Array.isArray(r.anchored_to) ? (r.anchored_to as unknown[]).map(String).filter(Boolean) : [],
    emotionalTags: [...new Set(tags)],
    salience,
  }
}

function normalizePressureEvent(
  r: Record<string, unknown>,
  turnIndex: number,
  index: number
): Sf2PressureEvent {
  const human = r.human_consequence as Record<string, unknown> | undefined
  const amountRaw = Number(r.amount)
  const event: Sf2PressureEvent = {
    id: String(r.id ?? '').trim() || `pressure_event_${turnIndex}_${index + 1}`,
    turn: turnIndex,
    source: String(r.source ?? '') as Sf2PressureEvent['source'],
    targetThreadIds: Array.isArray(r.target_thread_ids)
      ? (r.target_thread_ids as unknown[]).map(String).filter(Boolean)
      : [],
    scope: String(r.scope ?? '') as Sf2PressureEvent['scope'],
    evidenceQuote: String(r.evidence_quote ?? '').slice(0, 400),
    humanConsequence: {
      whoPays: String(human?.who_pays ?? '').trim() as Sf2PressureEvent['humanConsequence']['whoPays'],
      whoGainsLeverage: human?.who_gains_leverage
        ? String(human.who_gains_leverage).trim()
        : undefined,
      whatGetsHarder: String(human?.what_gets_harder ?? '').trim(),
      whatIsAtRisk: String(human?.what_is_at_risk ?? '').trim(),
      visiblePressure: String(human?.visible_pressure ?? '').trim(),
    },
    idempotencyKey: String(r.idempotency_key ?? '').trim(),
  }
  if (Number.isFinite(amountRaw)) event.amount = amountRaw
  if (r.severity === 'standard' || r.severity === 'hard') event.severity = r.severity
  return event
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
  'revelation_premature_reveal',
  'document_attribution_drift',
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
    arcId: r.arc_id ? String(r.arc_id) : undefined,
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
