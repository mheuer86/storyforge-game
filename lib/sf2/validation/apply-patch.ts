// Apply an Archivist patch to Sf2State with partial-accept recovery.
// - Validate each sub-write against invariants.
// - Accept high/medium confidence writes that pass invariants.
// - Log (not apply) low-confidence writes; Narrator will be reminded next turn.
// - Invariant failures reject the individual sub-write with field-named reason.
// - Never partially mutate: build a next state and swap, or return rejection.

import {
  checkArc,
  checkClue,
  checkDecision,
  checkDocument,
  checkFaction,
  checkNpcIdentity,
  checkPromise,
  checkTemporalAnchor,
  checkThread,
  type InvariantResult,
} from '../invariants'
import { chapterPressureRuntime } from '../pressure/runtime'
import { NEW_THREAD_INITIAL_TENSION_BY_ROLE } from '../pressure/constants'
import {
  applyPlayerEngagementReheat,
  reheatNpcAgendaAction,
} from '../pressure/reheat'
import {
  findMatchingLocation,
  mergeLocationIntoExisting,
  replaceLocationReferences,
} from '../locations'
import {
  coerceDisposition,
  coerceHeat,
  coerceTempLoadTag,
  findMatchingAnonymousNpc,
  findMatchingNpc,
  findMatchingSnapshotPlaceholder,
  isAnonymousNpc,
  nextEntityId,
  resolveAgentId,
  resolvedBySynthesizedAgentId,
  resolveArcId,
  resolveFactionId,
  resolveNpcId,
  resolveTemporalAnchorTargetId,
  resolveThreadId,
} from '../reference-policy'
import { normalizeEntityReferenceText } from '../resolution/entity-references'
import {
  compactRetrievalCue,
  mergeRetrievalCue,
} from '../retrieval-cues'
import {
  rebuildOwnerThreadBackrefs,
  syncArcPlanStatusFromArcEntity,
} from '../state-indexes'
import {
  invalidThreadTransitionReason,
  isThreadResolved,
  isThreadStatus,
  isThreadTerminal,
} from '../thread-lifecycle'
import {
  applyThreadProgressChanges,
  normalizeThreadResolutionGates,
  successfulThreadResolutionBlocked,
} from '../thread-resolution'
import type {
  Sf2Arc,
  Sf2ArchivistAttachment,
  Sf2ArchivistCreate,
  Sf2ArchivistFlag,
  Sf2ArchivistPatch,
  Sf2ArchivistTransition,
  Sf2ArchivistUpdate,
  Sf2BeatParticipant,
  Sf2EmotionalBeat,
  Sf2EmotionalBeatTag,
  Sf2Clue,
  Sf2ClueEvidenceKind,
  Sf2Decision,
  Sf2Document,
  Sf2DocumentParty,
  Sf2DocumentStatus,
  Sf2DocumentType,
  Sf2EntityId,
  Sf2Faction,
  Sf2Npc,
  Sf2Promise,
  Sf2PressureEvent,
  Sf2PronounAnchor,
  Sf2State,
  Sf2TemporalAnchor,
  Sf2Thread,
} from '../types'
import { DOCUMENT_VALID_TRANSITIONS } from '../types'

const CHAPTER_PRESSURE_CAP = 10
const PRESSURE_EVENT_CAP = 50
const PRESSURE_EVENT_SOURCES: Sf2PressureEvent['source'][] = [
  'failed_roll',
  'npc_agenda',
  'faction_move',
  'deadline',
  'decision',
  'promise_neglected',
  'clue_revealed',
  'ladder_fire',
]
const PRESSURE_EVENT_SCOPES: Sf2PressureEvent['scope'][] = [
  'canonical_thread',
  'chapter_local',
]
const PRESSURE_EVENT_SEVERITIES: NonNullable<Sf2PressureEvent['severity']>[] = [
  'standard',
  'hard',
]
const CLUE_EVIDENCE_KINDS: Sf2ClueEvidenceKind[] = [
  'document',
  'testimony',
  'trace',
  'contradiction',
  'diagnostic',
  'circumstantial',
]

function clampPressure(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(CHAPTER_PRESSURE_CAP, Math.round(value)))
}

function normalizedSemanticText(value: unknown): string {
  return normalizeEntityReferenceText(String(value ?? ''))
}

function semanticTextMatches(a: unknown, b: unknown): boolean {
  const left = normalizedSemanticText(a)
  const right = normalizedSemanticText(b)
  if (!left || !right) return false
  return left === right
}

function semanticTextOverlaps(a: unknown, b: unknown): boolean {
  const left = normalizedSemanticText(a)
  const right = normalizedSemanticText(b)
  if (left.length < 12 || right.length < 12) return false
  if (left === right || left.includes(right) || right.includes(left)) return true

  const leftTokens = semanticContentTokens(left)
  const rightTokens = semanticContentTokens(right)
  if (leftTokens.length < 3 || rightTokens.length < 3) return false

  const rightSet = new Set(rightTokens)
  const common = leftTokens.filter((token) => rightSet.has(token)).length
  const smaller = Math.min(leftTokens.length, rightTokens.length)
  return common >= 3 && common / smaller >= 0.75
}

function clueTextsOverlap(a: unknown, b: unknown): boolean {
  if (semanticTextOverlaps(a, b)) return true
  const leftTokens = operationalFactTokens(String(a ?? ''))
  const rightTokens = operationalFactTokens(String(b ?? ''))
  if (leftTokens.length < 4 || rightTokens.length < 4) return false

  const rightSet = new Set(rightTokens)
  const common = leftTokens.filter((token) => rightSet.has(token)).length
  const smaller = Math.min(leftTokens.length, rightTokens.length)
  return common >= 4 && common / smaller >= 0.45
}

function semanticContentTokens(normalized: string): string[] {
  return uniqueStrings(normalized.split(' ').filter((token) => token.length > 1))
}

function sameStringSet(a: string[], b: string[]): boolean {
  const left = new Set(a)
  const right = new Set(b)
  if (left.size !== right.size) return false
  return [...left].every((value) => right.has(value))
}

function stringSetIntersects(a: string[], b: string[]): boolean {
  const right = new Set(b)
  return a.some((value) => right.has(value))
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.length > 0)))
}

function coerceClueEvidenceKind(value: unknown): Sf2ClueEvidenceKind {
  return CLUE_EVIDENCE_KINDS.includes(value as Sf2ClueEvidenceKind)
    ? (value as Sf2ClueEvidenceKind)
    : 'circumstantial'
}

function normalizedTermMatches(normalized: string, term: string): boolean {
  const normalizedTerm = normalizedSemanticText(term)
  if (!normalizedTerm) return false
  if (normalizedTerm.includes(' ')) return normalized.includes(normalizedTerm)
  return normalized.split(' ').includes(normalizedTerm)
}

function looksLikeAmbientClue(content: string): boolean {
  const normalized = normalizedSemanticText(content)
  if (!normalized) return true
  const ambientTerms = [
    'present',
    'stands',
    'standing',
    'sits',
    'sitting',
    'waits',
    'waiting',
    'looks',
    'looked',
    'expression',
    'face',
    'voice',
    'tone',
    'gesture',
    'gestures',
    'body language',
    'light',
    'shadow',
    'air',
    'silence',
    'atmosphere',
    'desk',
    'corridor',
    'room',
  ]
  const evidenceTerms = [
    'record',
    'ledger',
    'log',
    'file',
    'document',
    'signed',
    'stamp',
    'seal',
    'timestamp',
    'classified',
    'query',
    'missing',
    'contradict',
    'contradicts',
    'diagnostic',
    'sensor',
    'blood',
    'trace',
    'residue',
    'hidden',
    'erased',
    'altered',
    'forged',
    'matches',
    'message',
    'amount',
    'credits',
    'unread',
    'off-books',
    'unregistered',
    'shortfall',
    'tithe',
    'stalled',
    'deliberate',
    'custody',
    'alerted',
    'intent',
    'protect',
  ]
  const hasAmbient = ambientTerms.some((term) => normalizedTermMatches(normalized, term))
  const hasEvidence = evidenceTerms.some((term) => normalizedTermMatches(normalized, term))
  return hasAmbient && !hasEvidence
}

function validateInvestigationClue(
  draft: Sf2State,
  content: string,
  evidenceQuestion: string,
  threadIds: string[],
  hasPendingInvestigationThread = false
): InvariantResult {
  if (looksLikeAmbientClue(content)) {
    return {
      ok: false,
      field: 'content',
      reason: 'ambient scene/body-language/operational texture is not investigation evidence',
    }
  }
  const activeInvestigationThreadIds = Object.values(draft.campaign.threads)
    .filter((thread) => thread.resolutionMode === 'investigation')
    .filter((thread) => !isThreadTerminal(thread.status))
    .map((thread) => thread.id)
  const anchoredNonInvestigationThreadIds = nonInvestigationThreadIds(draft, threadIds)
  if (anchoredNonInvestigationThreadIds.length > 0) {
    return {
      ok: false,
      field: 'anchoredTo',
      reason: 'clue anchors must be investigation threads',
    }
  }
  if (
    threadIds.length === 0 &&
    activeInvestigationThreadIds.length === 0 &&
    !hasPendingInvestigationThread
  ) {
    return {
      ok: false,
      field: 'evidenceQuestion',
      reason: 'floating clue requires an active investigation thread',
    }
  }
  if (!evidenceQuestion.trim()) {
    return {
      ok: false,
      field: 'evidenceQuestion',
      reason: 'clue requires an evidence_question or investigation thread resolution criteria',
    }
  }
  return { ok: true }
}

function nonInvestigationThreadIds(draft: Sf2State, threadIds: string[]): string[] {
  return threadIds.filter((threadId) => {
    const thread = draft.campaign.threads[threadId]
    return thread?.resolutionMode !== 'investigation' || isThreadTerminal(thread.status)
  })
}

function linkDeadlineAnchorToThreadTimers(draft: Sf2State, anchor: Sf2TemporalAnchor): void {
  if (anchor.kind !== 'deadline' || anchor.status !== 'active') return

  for (const anchoredId of anchor.anchoredTo) {
    const thread = draft.campaign.threads[anchoredId]
    if (!thread) continue
    if (thread.status !== 'active') continue
    if (!thread.deterioration) {
      thread.deterioration = {
        kind: 'timer',
        deadline: anchor.anchorText,
        temporalAnchorId: anchor.id,
      }
      continue
    }
    if (thread.deterioration.kind !== 'timer') continue
    thread.deterioration = {
      ...thread.deterioration,
      deadline: anchor.anchorText || thread.deterioration.deadline,
      temporalAnchorId: anchor.id,
    }
  }
}

function driftDedup(
  drift: Sf2ArchivistFlag[],
  kind: string,
  proposedId: string,
  existingId: string
): void {
  drift.push({
    kind: 'identity_drift',
    detail: `${kind} create merged with existing ${existingId} instead of creating ${proposedId}`,
    entityId: existingId,
  })
}

type NpcMergeMatcher =
  | 'existingById'
  | 'supersedeTarget'
  | 'findMatchingAnonymousNpc'
  | 'findMatchingNpc'
  | 'findMatchingSnapshotPlaceholder'

type NpcMergeCandidate = {
  npc: Sf2Npc
  matcher: NpcMergeMatcher
  confidence: number
  fuzzy: boolean
}

function findNpcMergeCandidate(
  draft: Sf2State,
  proposedName: string,
  proposedCue: string
): NpcMergeCandidate | null {
  const anonymous = findMatchingAnonymousNpc(draft, proposedName, proposedCue)
  if (anonymous) {
    return { npc: anonymous, matcher: 'findMatchingAnonymousNpc', confidence: 0.82, fuzzy: true }
  }
  const named = findMatchingNpc(draft, proposedName)
  if (named) {
    return { npc: named, matcher: 'findMatchingNpc', confidence: 0.76, fuzzy: true }
  }
  const snapshot = findMatchingSnapshotPlaceholder(draft, proposedName, proposedCue)
  if (snapshot) {
    return { npc: snapshot, matcher: 'findMatchingSnapshotPlaceholder', confidence: 0.7, fuzzy: true }
  }
  return null
}

function mergeNpcCreatePayload(
  npc: Sf2Npc,
  payload: Record<string, unknown>,
  proposedName: string,
  proposedCue: string,
  turnIndex: number,
  genreId?: string | null
): void {
  npc.lastSeenTurn = turnIndex
  if (proposedName && isAnonymousNpc(npc, genreId)) {
    npc.name = proposedName
  }
  if (proposedCue && (
    !npc.retrievalCue ||
    npc.retrievalCue.includes('placeholder from scene snapshot') ||
    isAnonymousNpc(npc, genreId)
  )) {
    npc.retrievalCue = mergeRetrievalCue(npc.retrievalCue, proposedCue, proposedName)
  }
  if (payload.affiliation) npc.affiliation = String(payload.affiliation)
  if (payload.role) npc.role = payload.role as Sf2Npc['role']
  const keyFacts = Array.isArray(payload.key_facts) ? (payload.key_facts as string[]).slice(0, 3) : []
  if (keyFacts.length > 0 && (npc.identity.keyFacts.length === 0 || isAnonymousNpc(npc, genreId))) {
    npc.identity.keyFacts = keyFacts
  }
  const proposedPronoun = npcPronounFromPayload(payload)
  if (proposedPronoun && !npc.identity.pronoun) npc.identity.pronoun = proposedPronoun
  const proposedAge = npcAgeFromPayload(payload)
  if (proposedAge && !npc.identity.age) npc.identity.age = proposedAge
  if (payload.voice_note) npc.identity.voice.note = String(payload.voice_note)
  if (payload.voice_register) npc.identity.voice.register = String(payload.voice_register)
}

function syncActiveThreadIntoChapterRuntime(
  draft: Sf2State,
  threadId: Sf2EntityId,
  opts: { loadBearing?: boolean; successor?: boolean } = {}
): void {
  const thread = draft.campaign.threads[threadId]
  if (!thread || thread.status !== 'active') return

  draft.chapter.setup.activeThreadIds ??= []
  draft.chapter.setup.loadBearingThreadIds ??= []
  draft.chapter.setup.threadPressure ??= {}

  const wasAlreadyActive = draft.chapter.setup.activeThreadIds.includes(threadId)
  if (!wasAlreadyActive) {
    draft.chapter.setup.activeThreadIds.push(threadId)
  }

  if (opts.loadBearing || thread.loadBearing) {
    thread.loadBearing = true
    if (!draft.chapter.setup.loadBearingThreadIds.includes(threadId)) {
      draft.chapter.setup.loadBearingThreadIds.push(threadId)
    }
  }

  if (opts.successor || thread.successorToThreadId) {
    thread.chapterDriverKind = 'successor'
    const successorIds = draft.chapter.setup.successorThreadIds ?? []
    if (!successorIds.includes(threadId)) {
      draft.chapter.setup.successorThreadIds = [...successorIds, threadId]
    }
  }

  if (!draft.chapter.setup.threadPressure[threadId] && !wasAlreadyActive) {
    const role = threadId === draft.chapter.setup.spineThreadId
      ? 'spine'
      : thread.loadBearing
        ? 'load_bearing'
        : thread.chapterCreated === draft.chapter.setup.chapter
          ? 'new'
          : 'active'
    const floor = Math.max(
      NEW_THREAD_INITIAL_TENSION_BY_ROLE[role],
      clampPressure(thread.tension)
    )
    draft.chapter.setup.threadPressure[threadId] = {
      threadId,
      role,
      openingFloor: floor,
      localEscalation: 0,
      maxThisChapter: floor,
      cooledAtOpen: false,
    }
  }
}

function removeThreadFromChapterRuntime(draft: Sf2State, threadId: Sf2EntityId): void {
  draft.chapter.setup.activeThreadIds = draft.chapter.setup.activeThreadIds.filter((tid) => tid !== threadId)
  draft.chapter.setup.loadBearingThreadIds = draft.chapter.setup.loadBearingThreadIds.filter((tid) => tid !== threadId)
  if (draft.chapter.setup.successorThreadIds) {
    draft.chapter.setup.successorThreadIds = draft.chapter.setup.successorThreadIds.filter((tid) => tid !== threadId)
  }
  if (draft.chapter.setup.newPressureThreadIds) {
    draft.chapter.setup.newPressureThreadIds = draft.chapter.setup.newPressureThreadIds.filter((tid) => tid !== threadId)
  }
  delete draft.chapter.setup.threadPressure?.[threadId]
}

const STALE_FACT_PATTERNS = [
  /\bunread\b/i,
  /\bobscured\b/i,
  /\bunknown\b/i,
  /\bunclear\b/i,
  /\bnot yet\b/i,
  /\bremains?\s+(?:hidden|unread|obscured|unknown|unclear)\b/i,
]

const CURRENT_FACT_PATTERNS = [
  /\bread\b/i,
  /\breveals?\b/i,
  /\brevealed\b/i,
  /\bconfirmed\b/i,
  /\bshows?\b/i,
]

const OPERATIONAL_FACT_STOP_WORDS = new Set([
  'about',
  'after',
  'also',
  'before',
  'clue',
  'fact',
  'from',
  'have',
  'into',
  'that',
  'their',
  'there',
  'this',
  'turn',
  'with',
])

function operationalFactTokens(content: string): string[] {
  const normalized = normalizedSemanticText(content)
  return uniqueStrings(
    normalized
      .split(/\W+/)
      .filter((token) => token.length >= 4 && !OPERATIONAL_FACT_STOP_WORDS.has(token))
  )
}

function shouldSupersedeClue(existingContent: string, proposedContent: string): boolean {
  const existingTokens = operationalFactTokens(existingContent)
  const proposedTokens = operationalFactTokens(proposedContent)
  if (existingTokens.length === 0 || proposedTokens.length === 0) return false
  const overlap = existingTokens.filter((token) => proposedTokens.includes(token))
  if (overlap.length < 2) return false
  const existingLooksStale = STALE_FACT_PATTERNS.some((pattern) => pattern.test(existingContent))
  const proposedLooksCurrent = CURRENT_FACT_PATTERNS.some((pattern) => pattern.test(proposedContent))
  return existingLooksStale && proposedLooksCurrent
}

function consumeSupersededClues(
  draft: Sf2State,
  proposedContent: string,
  threadIds: string[],
  replacementId?: string
): void {
  for (const clue of Object.values(draft.campaign.clues)) {
    if (replacementId && clue.id === replacementId) continue
    if (clue.status === 'consumed') continue
    const anchorCompatible =
      clue.anchoredTo.length === 0 ||
      threadIds.length === 0 ||
      stringSetIntersects(clue.anchoredTo, threadIds)
    if (!anchorCompatible) continue
    if (!shouldSupersedeClue(clue.content, proposedContent)) continue
    clue.status = 'consumed'
    draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter((id) => id !== clue.id)
  }
}

function attachCurrentTurnCluesToThread(draft: Sf2State, threadId: string, turnIndex: number): void {
  const thread = draft.campaign.threads[threadId]
  if (!thread) return
  if (thread.resolutionMode !== 'investigation') return
  if (isThreadTerminal(thread.status)) return
  const threadText = `${thread.title} ${thread.retrievalCue} ${thread.resolutionCriteria}`
  const threadTokens = operationalFactTokens(threadText)
  if (threadTokens.length === 0) return
  for (const clue of Object.values(draft.campaign.clues)) {
    if (clue.turn !== turnIndex) continue
    if (clue.status === 'consumed') continue
    if (clue.anchoredTo.includes(threadId)) continue
    const clueTokens = operationalFactTokens(clue.content)
    const overlap = clueTokens.filter((token) => threadTokens.includes(token))
    if (overlap.length < 1) continue
    clue.anchoredTo = uniqueStrings([...clue.anchoredTo, threadId])
    clue.status = 'attached'
    draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter((id) => id !== clue.id)
  }
}

// Revelation gate mode. Phase 1 ships in `observe` — gate violations log a
// drift flag but the reveal still ratifies (`revealed = true`). Phase 2 will
// flip to `enforce`, blocking ratification when gates fail. Move via this
// constant so the flip is one line.
const REVELATION_GATE_MODE: 'observe' | 'enforce' = 'observe'

// Telemetry retention. Capped at 10 records (~one chapter of recent turns)
// because telemetry rides in the canonical state payload sent on every
// archivist call — a longer buffer adds dead-weight to every roundtrip.
// Replay-time review is the consumer; production logging would use a
// side-channel.
const TELEMETRY_RETENTION = 10

// Minimum length of a configured hint phrase. Below this, the bidirectional
// substring match in configuredHintMatches becomes promiscuous (any prose
// containing the substring counts as a hint). Phrases below the floor are
// rejected at apply-patch time with a drift flag.
const MIN_CONFIGURED_HINT_PHRASE_LENGTH = 6

function normalizePhrase(value: string): string {
  return value.trim().toLowerCase()
}

function configuredHintMatches(configured: string, emitted: string): boolean {
  const a = normalizePhrase(configured)
  const b = normalizePhrase(emitted)
  if (a.length === 0 || a.length < MIN_CONFIGURED_HINT_PHRASE_LENGTH) return false
  return a === b || a.includes(b) || b.includes(a)
}

export interface SubWriteOutcome {
  accepted: boolean
  reason?: string
  writeRef: string // "creates[2]" / "updates[0]" / etc.
  confidenceTier: 'high' | 'medium' | 'low'
  deferred?: boolean // true when low-confidence and logged-not-applied
}

export interface ApplyPatchResult {
  nextState: Sf2State
  outcomes: SubWriteOutcome[]
  deferredWrites: DeferredWrite[] // to surface in next Narrator prompt
  drift: Sf2ArchivistFlag[]
}

function normalizePronounAnchor(raw: unknown): Sf2PronounAnchor | undefined {
  if (typeof raw !== 'string') return undefined
  const key = raw.trim().toLowerCase().replace(/\s+/g, '')
  if (!key) return undefined
  if (['she', 'her', 'she/her', 'she-hers', 'shehers'].includes(key)) return 'she/her'
  if (['he', 'him', 'he/him', 'he-him', 'hehim'].includes(key)) return 'he/him'
  if (['they', 'them', 'they/them', 'they-them', 'theythem'].includes(key)) return 'they/them'
  if (key === 'other') return 'other'
  return undefined
}

function normalizeAgeAnchor(raw: unknown): string | undefined {
  if (typeof raw !== 'string' && typeof raw !== 'number') return undefined
  const value = String(raw).trim()
  return value.length > 0 ? value.slice(0, 80) : undefined
}

function normalizeAgenda<T extends { pursuing: string; methods: string[]; currentMove: string; blockedBy?: string; lastUpdatedTurn?: number }>(
  raw: unknown,
  prior: T | undefined,
  turnIndex: number
): T | undefined {
  if (!raw || typeof raw !== 'object') return prior
  const payload = raw as Record<string, unknown>
  const currentMoveRaw = payload.currentMove ?? payload.current_move
  const pursuingRaw = payload.pursuing
  const methodsRaw = payload.methods
  const blockedByRaw = payload.blockedBy ?? payload.blocked_by
  const next: T = {
    pursuing: typeof pursuingRaw === 'string' ? pursuingRaw : prior?.pursuing ?? '',
    methods: Array.isArray(methodsRaw) ? methodsRaw.map(String) : prior?.methods ?? [],
    currentMove: typeof currentMoveRaw === 'string' ? currentMoveRaw : prior?.currentMove ?? '',
    blockedBy: typeof blockedByRaw === 'string' ? blockedByRaw : prior?.blockedBy,
    lastUpdatedTurn: turnIndex,
  } as T
  return next
}

// Narrow on purpose: an agenda is only treated as "moved" when the
// archivist rewrites the visible currentMove text. Edits to `pursuing` or
// `methods` without a currentMove rewrite are calibration of the same move,
// not a new push, and don't reheat. If this proves too narrow in playtest,
// expand to compare full agenda payload.
function agendaChanged(
  raw: unknown,
  prior: { currentMove: string } | undefined
): boolean {
  if (!raw || typeof raw !== 'object') return false
  const payload = raw as Record<string, unknown>
  const currentMoveRaw = payload.currentMove ?? payload.current_move
  return typeof currentMoveRaw === 'string' && currentMoveRaw.trim() !== (prior?.currentMove ?? '')
}

function agendaSeverity(changes: Record<string, unknown>): 'standard' | 'major' {
  const raw = changes.agenda_severity ?? changes.agendaSeverity
  return raw === 'major' ? 'major' : 'standard'
}

function pressureThreadIdsForOwner(
  state: Sf2State,
  kind: 'npc' | 'faction',
  id: Sf2EntityId
): Sf2EntityId[] {
  return state.chapter.setup.activeThreadIds.filter((threadId) => {
    const thread = state.campaign.threads[threadId]
    if (!thread) return false
    if (thread.owner.kind === kind && thread.owner.id === id) return true
    return thread.stakeholders.some((s) => s.kind === kind && s.id === id)
  })
}

function npcPronounFromPayload(p: Record<string, unknown>): Sf2PronounAnchor | undefined {
  return normalizePronounAnchor(p.pronoun ?? p.pronouns)
}

function npcAgeFromPayload(p: Record<string, unknown>): string | undefined {
  return normalizeAgeAnchor(p.age ?? p.age_band ?? p.ageBand)
}

function normalizeTemporalAnchorKind(raw: unknown): Sf2TemporalAnchor['kind'] {
  if (
    raw === 'deadline' ||
    raw === 'timestamp' ||
    raw === 'duration' ||
    raw === 'sequence' ||
    raw === 'recurrence'
  ) {
    return raw
  }
  return 'timestamp'
}

function normalizeTemporalAnchorStatus(raw: unknown): Sf2TemporalAnchor['status'] {
  if (raw === 'active' || raw === 'elapsed' || raw === 'resolved' || raw === 'superseded') {
    return raw
  }
  return 'active'
}

function normalizeDocumentType(raw: unknown): Sf2DocumentType {
  if (
    raw === 'authorization' ||
    raw === 'directive' ||
    raw === 'communication' ||
    raw === 'record' ||
    raw === 'petition' ||
    raw === 'notation'
  ) {
    return raw
  }
  // Coerce common kindLabel-style inputs to the closest type. The Archivist
  // is told to set `type` explicitly; this is a defensive fallback.
  if (typeof raw === 'string') {
    const k = raw.toLowerCase()
    if (['writ', 'charter', 'license', 'warrant', 'authorization'].some((m) => k.includes(m)))
      return 'authorization'
    if (['order', 'decree', 'summons', 'mandate', 'directive', 'command'].some((m) => k.includes(m)))
      return 'directive'
    if (['letter', 'memo', 'dispatch', 'report', 'message'].some((m) => k.includes(m)))
      return 'communication'
    if (['receipt', 'ledger', 'registry', 'log', 'record'].some((m) => k.includes(m)))
      return 'record'
    if (['petition', 'appeal', 'plea', 'motion', 'request'].some((m) => k.includes(m)))
      return 'petition'
    if (['marginalia', 'addendum', 'annotation', 'note'].some((m) => k.includes(m)))
      return 'notation'
  }
  return 'record' // safest default — no power to authorize/command, just attests
}

function isValidDocumentTransition(type: Sf2DocumentType, to: string): to is Sf2DocumentStatus {
  const valid = DOCUMENT_VALID_TRANSITIONS[type]
  return (valid as string[]).includes(to)
}

export interface DeferredWrite {
  kind: 'create' | 'update' | 'transition' | 'attachment'
  payload: unknown
  reason: string // why deferred (usually low confidence + field name)
}

function arcIdForThread(state: Sf2State, threadId: Sf2EntityId): Sf2EntityId | null {
  const thread = state.campaign.threads[threadId]
  if (thread?.anchoredArcId && state.campaign.arcs[thread.anchoredArcId]) {
    return thread.anchoredArcId
  }
  return Object.values(state.campaign.arcs).find((arc) => arc.threadIds.includes(threadId))?.id ?? null
}

function attachThreadToArc(state: Sf2State, threadId: Sf2EntityId, arcId: Sf2EntityId): void {
  const thread = state.campaign.threads[threadId]
  const arc = state.campaign.arcs[arcId]
  if (!thread || !arc) return
  arc.threadIds = Array.from(new Set([...arc.threadIds, threadId]))
  thread.anchoredArcId = arcId
}

function deferOrReject(
  confidence: SubWriteOutcome['confidenceTier'],
  reason: string,
  ref: string
): SubWriteOutcome {
  if (confidence === 'low') {
    return { accepted: false, deferred: true, reason, writeRef: ref, confidenceTier: confidence }
  }
  return { accepted: false, reason, writeRef: ref, confidenceTier: confidence }
}

function applyCreate(
  draft: Sf2State,
  write: Sf2ArchivistCreate,
  ref: string,
  outcomes: SubWriteOutcome[],
  deferred: DeferredWrite[],
  drift: Sf2ArchivistFlag[],
  turnIndex: number,
  chapter: number,
  hasPendingInvestigationThread = false
): void {
  if (write.confidence === 'low') {
    outcomes.push(deferOrReject(write.confidence, 'low-confidence create deferred', ref))
    deferred.push({ kind: 'create', payload: write, reason: 'low-confidence' })
    return
  }

  try {
    switch (write.kind) {
      case 'npc': {
        const p = write.payload as Record<string, unknown>
        const proposedName = String(p.name ?? '')
        const proposedCue = compactRetrievalCue(p.retrieval_cue)
        // Dedup guard: before creating a new NPC, check whether one already
        // exists with a substantively-matching name. Catches Archivist drift
        // where Narrator hints "npc_granary_man" but no such id exists, and
        // the Archivist invents "Granary watcher" as a new entity. The real
        // entity is the same person under two names — merge, don't duplicate.
        //
        // Highest-priority matcher: explicit supersedes_id hint from Archivist.
        // When prose reveals a previously-anonymous on-stage NPC's identity
        // ("the young man" → "Sev's brother"), the Archivist can direct the
        // merge by including supersedes_id: 'npc_X' in the create payload.
        // Token-based matchers below catch implicit cases.
        const supersedesId =
          typeof p.supersedes_id === 'string' && p.supersedes_id.length > 0
            ? p.supersedes_id
            : null
        const supersedeTarget =
          supersedesId &&
          draft.campaign.npcs[supersedesId] &&
          isAnonymousNpc(draft.campaign.npcs[supersedesId], draft.meta.genreId)
            ? draft.campaign.npcs[supersedesId]
            : null
        const existingById =
          typeof p.id === 'string' && draft.campaign.npcs[p.id]
            ? draft.campaign.npcs[p.id]
            : null
        const mergeCandidate: NpcMergeCandidate | null = existingById
          ? { npc: existingById, matcher: 'existingById', confidence: 1, fuzzy: false }
          : supersedeTarget
            ? { npc: supersedeTarget, matcher: 'supersedeTarget', confidence: 1, fuzzy: false }
            : findNpcMergeCandidate(draft, proposedName, proposedCue)
        if (mergeCandidate) {
          const existingMatch = mergeCandidate.npc
          const prior = structuredClone(existingMatch)
          const next = structuredClone(existingMatch)
          const anonymousPrior = isAnonymousNpc(prior, draft.meta.genreId)
          const proposedRenamesProtectedNpc =
            proposedName.length > 0 &&
            !anonymousPrior &&
            prior.name.trim() !== proposedName.trim()
          if (proposedRenamesProtectedNpc) {
            const reason = `npc name is protected: ${prior.name} → ${proposedName} not allowed`
            outcomes.push({
              accepted: false,
              deferred: true,
              reason,
              writeRef: ref,
              confidenceTier: write.confidence,
            })
            deferred.push({ kind: 'create', payload: write, reason })
            drift.push({
              kind: 'identity_drift',
              detail: reason,
              entityId: existingMatch.id,
            })
            return
          }
          mergeNpcCreatePayload(next, p, proposedName, proposedCue, turnIndex, draft.meta.genreId)
          const identityCheck = checkNpcIdentity(next, anonymousPrior ? undefined : prior)
          if (!identityCheck.ok) {
            outcomes.push({
              accepted: false,
              deferred: true,
              reason: identityCheck.reason,
              writeRef: ref,
              confidenceTier: write.confidence,
            })
            deferred.push({ kind: 'create', payload: write, reason: identityCheck.reason })
            drift.push({
              kind: 'identity_drift',
              detail: identityCheck.reason,
              entityId: existingMatch.id,
            })
            return
          }

          // Merge: bump lastSeenTurn, extend retrieval cue if shorter, capture
          // a drift flag so the behavior is visible in instrumentation.
          mergeNpcCreatePayload(existingMatch, p, proposedName, proposedCue, turnIndex, draft.meta.genreId)
          const keyFacts = Array.isArray(p.key_facts) ? (p.key_facts as string[]).slice(0, 3) : []
          if (keyFacts.length > 0 && (existingMatch.identity.keyFacts.length === 0 || isAnonymousNpc(existingMatch, draft.meta.genreId))) {
            existingMatch.identity.keyFacts = keyFacts
          } else if (
            keyFacts.length > 0 &&
            !sameStringSet(existingMatch.identity.keyFacts, keyFacts)
          ) {
            drift.push({
              kind: 'identity_drift',
              detail: `keyFacts anchor conflict on duplicate npc create: existing [${existingMatch.identity.keyFacts.join('; ')}], proposed [${keyFacts.join('; ')}]`,
              entityId: existingMatch.id,
            })
          }
          const proposedPronoun = npcPronounFromPayload(p)
          if (proposedPronoun && !existingMatch.identity.pronoun) {
            existingMatch.identity.pronoun = proposedPronoun
          } else if (proposedPronoun && existingMatch.identity.pronoun !== proposedPronoun) {
            drift.push({
              kind: 'identity_drift',
              detail: `pronoun anchor conflict: existing ${existingMatch.identity.pronoun}, proposed ${proposedPronoun}`,
              entityId: existingMatch.id,
            })
          }
          const proposedAge = npcAgeFromPayload(p)
          if (proposedAge && !existingMatch.identity.age) {
            existingMatch.identity.age = proposedAge
          } else if (proposedAge && existingMatch.identity.age !== proposedAge) {
            drift.push({
              kind: 'identity_drift',
              detail: `age anchor conflict: existing ${existingMatch.identity.age}, proposed ${proposedAge}`,
              entityId: existingMatch.id,
            })
          }
          if (p.voice_note) existingMatch.identity.voice.note = String(p.voice_note)
          if (p.voice_register) existingMatch.identity.voice.register = String(p.voice_register)
          drift.push({
            kind: mergeCandidate.fuzzy ? 'entity_merged' : 'identity_drift',
            detail: `npc merge: matcher=${mergeCandidate.matcher}, confidence=${mergeCandidate.confidence}, proposedName="${proposedName}", existingName="${prior.name}", existingId=${existingMatch.id}`,
            entityId: existingMatch.id,
          })
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const id = (p.id as string | undefined) ?? nextEntityId('npc', draft)
        const dispCoerced = coerceDisposition(p.disposition, 'neutral')
        if (dispCoerced.coerced && dispCoerced.rawValue) {
          drift.push({
            kind: 'contradiction',
            detail: `disposition "${dispCoerced.rawValue}" not in enum; coerced to "${dispCoerced.tier}"`,
            entityId: id,
          })
        }
        const npc: Sf2Npc = {
          id,
          name: String(p.name ?? ''),
          affiliation: String(p.affiliation ?? ''),
          role: (p.role as Sf2Npc['role']) ?? 'npc',
          status: 'alive',
          disposition: dispCoerced.tier,
          identity: {
            keyFacts: Array.isArray(p.key_facts) ? (p.key_facts as string[]).slice(0, 3) : [],
            pronoun: npcPronounFromPayload(p),
            age: npcAgeFromPayload(p),
            voice: {
              note: String(p.voice_note ?? ''),
              register: String(p.voice_register ?? ''),
            },
            relations: [],
          },
          ownedThreadIds: [],
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.name),
          chapterCreated: chapter,
          lastSeenTurn: turnIndex,
          signatureLines: [],
        }
        const inv = checkNpcIdentity(npc)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `npc.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          drift.push({ kind: 'identity_drift', detail: inv.reason, entityId: id })
          return
        }
        draft.campaign.npcs[id] = npc
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'faction': {
        const p = write.payload as Record<string, unknown>
        const id = (p.id as string | undefined) ?? nextEntityId('faction', draft)
        const existing = draft.campaign.factions[id] ??
          Object.values(draft.campaign.factions).find((faction) =>
            semanticTextMatches(faction.name, p.name)
          )
        if (existing) {
          const stance = coerceDisposition(p.stance, existing.stance)
          const heat = coerceHeat(p.heat, existing.heat)
          existing.stance = stance.tier
          existing.heat = heat.level
          existing.heatReasons = uniqueStrings([
            ...existing.heatReasons,
            ...(Array.isArray(p.heat_reasons) ? (p.heat_reasons as string[]) : []),
          ])
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.name)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.name)
          }
          driftDedup(drift, 'faction', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const faction: Sf2Faction = {
          id,
          name: String(p.name ?? ''),
          stance: coerceDisposition(p.stance, 'neutral').tier,
          heat: coerceHeat(p.heat, 'none').level,
          heatReasons: Array.isArray(p.heat_reasons) ? (p.heat_reasons as string[]) : [],
          ownedThreadIds: [],
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.name),
        }
        const inv = checkFaction(faction)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `faction.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.factions[id] = faction
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'thread': {
        const p = write.payload as Record<string, unknown>
        const ownerHint = p.owner as { kind: 'npc' | 'faction'; name_or_id: string } | undefined
        if (!ownerHint) {
          outcomes.push({
            accepted: false,
            reason: 'thread.owner: required',
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const ownerId =
          ownerHint.kind === 'npc'
            ? resolveNpcId(draft, ownerHint.name_or_id)
            : resolveFactionId(draft, ownerHint.name_or_id)
        if (!ownerId) {
          outcomes.push({
            accepted: false,
            reason: `thread.owner: ${ownerHint.kind} ${ownerHint.name_or_id} not in registry`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          drift.push({
            kind: 'anchor_reference_missing',
            detail: `thread owner ${ownerHint.name_or_id} unresolved`,
          })
          return
        }
        const successorRef =
          typeof p.successor_to_thread_id === 'string'
            ? p.successor_to_thread_id
            : typeof p.successor_to_thread === 'string'
              ? p.successor_to_thread
              : typeof p.successor_to === 'string'
                ? p.successor_to
                : ''
        const predecessorThreadId = successorRef ? resolveThreadId(draft, successorRef) : null
        if (successorRef && !predecessorThreadId) {
          drift.push({
            kind: 'anchor_reference_missing',
            detail: `thread successor predecessor ${successorRef} unresolved`,
          })
        }
        const rawTension = Number(p.tension ?? 5)
        const tension = clampPressure(rawTension)
        const shouldLoadBear =
          Boolean(p.load_bearing) ||
          Boolean(predecessorThreadId) ||
          (draft.chapter.setup.activeThreadIds.length === 0 && tension >= 4)
        const id = (p.id as string | undefined) ?? nextEntityId('thread', draft)
        const existing = draft.campaign.threads[id] ??
          Object.values(draft.campaign.threads).find((thread) => {
            const sameOwner = thread.owner.kind === ownerHint.kind && thread.owner.id === ownerId
            const sameTitle = semanticTextMatches(thread.title, p.title)
            const sameResolution = semanticTextOverlaps(thread.resolutionCriteria, p.resolution_criteria)
            const sameCue = semanticTextOverlaps(thread.retrievalCue, p.retrieval_cue)
            return sameTitle || (sameOwner && sameResolution) || (sameOwner && sameCue)
          })
        if (existing) {
          existing.tension = Math.max(existing.tension, tension)
          existing.peakTension = Math.max(existing.peakTension, existing.tension, tension)
          existing.loadBearing = existing.loadBearing || shouldLoadBear
          if (!existing.resolutionCriteria && p.resolution_criteria) {
            existing.resolutionCriteria = String(p.resolution_criteria)
          }
          if (!existing.failureMode && p.failure_mode) {
            existing.failureMode = String(p.failure_mode)
          }
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.title)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.title)
          }
          if (predecessorThreadId && !existing.successorToThreadId) {
            existing.successorToThreadId = predecessorThreadId
            existing.chapterDriverKind = 'successor'
          }
          if (p.resolution_mode === 'investigation') {
            existing.resolutionMode = 'investigation'
          } else if (!existing.resolutionMode) {
            existing.resolutionMode = 'pressure'
          }
          syncActiveThreadIntoChapterRuntime(draft, existing.id, {
            loadBearing: existing.loadBearing,
            successor: Boolean(existing.successorToThreadId),
          })
          const explicitArcRef = typeof p.arc_id === 'string' ? p.arc_id : ''
          const explicitArcId = explicitArcRef ? resolveArcId(draft, explicitArcRef) : null
          const inheritedArcId = predecessorThreadId ? arcIdForThread(draft, predecessorThreadId) : null
          const arcId = explicitArcId ?? inheritedArcId
          if (arcId) attachThreadToArc(draft, existing.id, arcId)
          driftDedup(drift, 'thread', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const thread: Sf2Thread = {
          id,
          title: String(p.title ?? ''),
          chapterCreated: chapter,
          category: 'thread',
          status: 'active',
          owner: { kind: ownerHint.kind, id: ownerId },
          stakeholders: [],
          tension,
          peakTension: tension,
          resolutionCriteria: String(p.resolution_criteria ?? ''),
          failureMode: String(p.failure_mode ?? ''),
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.title),
          loadBearing: shouldLoadBear,
          successorToThreadId: predecessorThreadId ?? undefined,
          chapterDriverKind: predecessorThreadId ? 'successor' : undefined,
          resolutionMode: p.resolution_mode === 'investigation' ? 'investigation' : 'pressure',
          resolutionGates: normalizeThreadResolutionGates(p.resolution_gates ?? p.resolutionGates),
          progressEvents: [],
          tensionHistory: [],
        }
        const inv = checkThread(thread, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `thread.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.threads[id] = thread
        attachCurrentTurnCluesToThread(draft, id, turnIndex)
        const explicitArcRef = typeof p.arc_id === 'string' ? p.arc_id : ''
        const explicitArcId = explicitArcRef ? resolveArcId(draft, explicitArcRef) : null
        const inheritedArcId = predecessorThreadId ? arcIdForThread(draft, predecessorThreadId) : null
        const arcId = explicitArcId ?? inheritedArcId
        if (arcId) {
          attachThreadToArc(draft, id, arcId)
        } else if (explicitArcRef) {
          drift.push({
            kind: 'anchor_reference_missing',
            detail: `thread arc ${explicitArcRef} unresolved`,
          })
        }
        syncActiveThreadIntoChapterRuntime(draft, id, {
          loadBearing: shouldLoadBear,
          successor: Boolean(predecessorThreadId),
        })
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'decision': {
        const p = write.payload as Record<string, unknown>
        const anchoredRefs = Array.isArray(p.anchored_to) ? (p.anchored_to as string[]) : []
        const threadIds: string[] = []
        for (const r of anchoredRefs) {
          const tid = resolveThreadId(draft, r)
          if (!tid) {
            drift.push({ kind: 'anchor_reference_missing', detail: `decision anchor ${r} unresolved` })
          } else {
            threadIds.push(tid)
          }
        }
        if (threadIds.length === 0) {
          outcomes.push({
            accepted: false,
            reason: 'decision.anchoredTo: no valid threads resolved',
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const id = (p.id as string | undefined) ?? nextEntityId('decision', draft)
        const proposedSummary = String(p.summary ?? '')
        const existing = draft.campaign.decisions[id] ??
          Object.values(draft.campaign.decisions).find((decision) =>
            semanticTextOverlaps(decision.summary, proposedSummary) &&
            sameStringSet(decision.anchoredTo, threadIds)
          )
        if (existing) {
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.summary)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.summary)
          }
          driftDedup(drift, 'decision', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const decision: Sf2Decision = {
          id,
          title: String(p.title ?? p.summary ?? ''),
          chapterCreated: chapter,
          category: 'decision',
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.summary),
          status: 'active',
          anchoredTo: threadIds,
          summary: proposedSummary,
          madeByPC: Boolean(p.made_by_pc ?? true),
          turn: turnIndex,
        }
        const inv = checkDecision(decision, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `decision.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.decisions[id] = decision
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'promise': {
        const p = write.payload as Record<string, unknown>
        const anchoredRefs = Array.isArray(p.anchored_to) ? (p.anchored_to as string[]) : []
        const threadIds: string[] = []
        for (const r of anchoredRefs) {
          const tid = resolveThreadId(draft, r)
          if (!tid) {
            drift.push({ kind: 'anchor_reference_missing', detail: `promise anchor ${r} unresolved` })
          } else {
            threadIds.push(tid)
          }
        }
        const ownerHint = p.owner as { kind: 'npc' | 'faction'; name_or_id: string } | undefined
        if (!ownerHint) {
          outcomes.push({
            accepted: false,
            reason: 'promise.owner: recipient required',
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const ownerId =
          ownerHint.kind === 'npc'
            ? resolveNpcId(draft, ownerHint.name_or_id)
            : resolveFactionId(draft, ownerHint.name_or_id)
        if (!ownerId) {
          outcomes.push({
            accepted: false,
            reason: `promise.owner: ${ownerHint.kind} ${ownerHint.name_or_id} not in registry`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        if (threadIds.length === 0) {
          outcomes.push({
            accepted: false,
            reason: 'promise.anchoredTo: no valid threads',
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const id = (p.id as string | undefined) ?? nextEntityId('promise', draft)
        const proposedObligation = String(p.obligation ?? '')
        const existing = draft.campaign.promises[id] ??
          Object.values(draft.campaign.promises).find((promise) =>
            promise.owner.kind === ownerHint.kind &&
            promise.owner.id === ownerId &&
            semanticTextOverlaps(promise.obligation, proposedObligation) &&
            stringSetIntersects(promise.anchoredTo, threadIds)
          )
        if (existing) {
          existing.anchoredTo = uniqueStrings([...existing.anchoredTo, ...threadIds])
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.obligation)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.obligation)
          }
          driftDedup(drift, 'promise', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const promise: Sf2Promise = {
          id,
          title: String(p.title ?? p.obligation ?? ''),
          chapterCreated: chapter,
          category: 'promise',
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.obligation),
          status: 'active',
          anchoredTo: threadIds,
          owner: { kind: ownerHint.kind, id: ownerId },
          obligation: proposedObligation,
          turn: turnIndex,
        }
        const inv = checkPromise(promise, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `promise.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.promises[id] = promise
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'clue': {
        const p = write.payload as Record<string, unknown>
        const anchoredRefs = Array.isArray(p.anchored_to) ? (p.anchored_to as string[]) : []
        const threadIds: string[] = []
        for (const r of anchoredRefs) {
          const tid = resolveThreadId(draft, r)
          if (tid) threadIds.push(tid)
          else drift.push({ kind: 'anchor_reference_missing', detail: `clue anchor ${r} unresolved` })
        }
        const id = (p.id as string | undefined) ?? nextEntityId('clue', draft)
        const proposedContent = String(p.content ?? '')
        const evidenceKind = coerceClueEvidenceKind(p.evidence_kind ?? p.evidenceKind)
        const explicitEvidenceQuestion = String(p.evidence_question ?? p.evidenceQuestion ?? '')
        const inferredEvidenceQuestion = threadIds
          .map((threadId) => draft.campaign.threads[threadId])
          .find((thread) => thread?.resolutionMode === 'investigation')?.resolutionCriteria
        const evidenceQuestion = explicitEvidenceQuestion || inferredEvidenceQuestion || ''
        const storedEvidenceQuestion = evidenceQuestion
        const clueContract = validateInvestigationClue(
          draft,
          proposedContent,
          storedEvidenceQuestion,
          threadIds,
          hasPendingInvestigationThread
        )
        if (!clueContract.ok) {
          outcomes.push({
            accepted: false,
            reason: `clue.${clueContract.field}: ${clueContract.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const existing = draft.campaign.clues[id] ??
          Object.values(draft.campaign.clues).find((clue) => {
            const anchorCompatible =
              clue.anchoredTo.length === 0 ||
              threadIds.length === 0 ||
              stringSetIntersects(clue.anchoredTo, threadIds)
            return anchorCompatible && clueTextsOverlap(clue.content, proposedContent)
          })
        if (existing) {
          if (proposedContent.length > existing.content.length) {
            existing.content = proposedContent
            existing.title = String(p.title ?? p.content ?? existing.title).slice(0, 80)
          }
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.content)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.content)
          }
          existing.evidenceKind = existing.evidenceKind ?? evidenceKind
          if (storedEvidenceQuestion && storedEvidenceQuestion.length > (existing.evidenceQuestion ?? '').length) {
            existing.evidenceQuestion = storedEvidenceQuestion
          }
          existing.anchoredTo = uniqueStrings([...existing.anchoredTo, ...threadIds])
          if (existing.anchoredTo.length > 0) {
            existing.status = 'attached'
            draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter((clueId) => clueId !== existing.id)
          }
          consumeSupersededClues(draft, existing.content, existing.anchoredTo, existing.id)
          driftDedup(drift, 'clue', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const clue: Sf2Clue = {
          id,
          title: String(p.title ?? p.content ?? '').slice(0, 80),
          chapterCreated: chapter,
          category: 'clue',
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.content),
          status: threadIds.length > 0 ? 'attached' : 'floating',
          anchoredTo: threadIds,
          evidenceKind,
          evidenceQuestion: storedEvidenceQuestion,
          content: proposedContent,
          turn: turnIndex,
        }
        const inv = checkClue(clue, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `clue.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.clues[id] = clue
        if (threadIds.length === 0) draft.campaign.floatingClueIds.push(id)
        consumeSupersededClues(draft, clue.content, clue.anchoredTo, clue.id)
        for (const threadId of Object.keys(draft.campaign.threads)) {
          attachCurrentTurnCluesToThread(draft, threadId, turnIndex)
        }
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'arc': {
        const p = write.payload as Record<string, unknown>
        const threadRefs = Array.isArray(p.thread_ids) ? (p.thread_ids as string[]) : []
        const resolvedThreadIds = threadRefs
          .map((r) => resolveThreadId(draft, r))
          .filter((x): x is string => Boolean(x))
        if (resolvedThreadIds.length < 2) {
          outcomes.push({
            accepted: false,
            reason: 'arc.threadIds: need ≥2 resolved threads',
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const id = (p.id as string | undefined) ?? nextEntityId('arc', draft)
        const existing = draft.campaign.arcs[id] ??
          Object.values(draft.campaign.arcs).find((arc) =>
            semanticTextMatches(arc.title, p.title) ||
            sameStringSet(arc.threadIds, resolvedThreadIds)
          )
        if (existing) {
          existing.threadIds = uniqueStrings([...existing.threadIds, ...resolvedThreadIds])
          if (!existing.stakesDefinition && p.stakes_definition) {
            existing.stakesDefinition = String(p.stakes_definition)
          }
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.title)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.title)
          }
          for (const tid of resolvedThreadIds) {
            draft.campaign.threads[tid].anchoredArcId = existing.id
          }
          driftDedup(drift, 'arc', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const arc: Sf2Arc = {
          id,
          title: String(p.title ?? ''),
          chapterCreated: chapter,
          category: 'arc',
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.title),
          status: 'active',
          threadIds: resolvedThreadIds,
          spansChapters: Number(p.spans_chapters ?? 3),
          noSingleResolvingAction: true,
          stakesDefinition: String(p.stakes_definition ?? ''),
        }
        const inv = checkArc(arc, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `arc.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.arcs[id] = arc
        for (const tid of resolvedThreadIds) {
          draft.campaign.threads[tid].anchoredArcId = id
        }
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'location': {
        const p = write.payload as Record<string, unknown>
        const id = (p.id as string | undefined) ?? nextEntityId('location', draft)
        const proposed = {
          id,
          name: String(p.name ?? ''),
          description: String(p.description ?? ''),
          atmosphericConditions: Array.isArray(p.atmospheric_conditions)
            ? (p.atmospheric_conditions as string[])
            : undefined,
          locked: typeof p.locked === 'boolean' ? p.locked : undefined,
          chapterCreated: chapter,
        }
        const existing = findMatchingLocation(draft, proposed)
        if (existing) {
          const merged = mergeLocationIntoExisting(existing, proposed)
          draft.campaign.locations[existing.id] = merged
          replaceLocationReferences(draft, id, merged)
          drift.push({
            kind: 'identity_drift',
            detail: `location create merged with existing location ${existing.id} instead of creating ${id}`,
            entityId: existing.id,
          })
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        draft.campaign.locations[id] = proposed
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'temporal_anchor': {
        if (!draft.campaign.temporalAnchors) draft.campaign.temporalAnchors = {}
        const p = write.payload as Record<string, unknown>
        const id = (p.id as string | undefined) ?? nextEntityId('temporal_anchor', draft)
        const anchoredRefs = Array.isArray(p.anchored_to) ? (p.anchored_to as string[]) : []
        const anchoredTo = anchoredRefs
          .map((r) => {
            const resolved = resolveTemporalAnchorTargetId(draft, r)
            if (!resolved) {
              drift.push({ kind: 'anchor_reference_missing', detail: `temporal anchor target ${r} unresolved` })
            }
            return resolved
          })
          .filter((x): x is string => Boolean(x))
        const label = String(p.label ?? p.title ?? '')
        const kind = normalizeTemporalAnchorKind(p.kind)
        const anchorText = String(p.anchor_text ?? p.anchorText ?? p.when ?? '')
        const existing = draft.campaign.temporalAnchors[id] ??
          Object.values(draft.campaign.temporalAnchors).find((anchor) =>
            anchor.kind === kind &&
            (semanticTextOverlaps(anchor.anchorText, anchorText) || semanticTextMatches(anchor.label, label))
          )
        if (existing) {
          existing.anchoredTo = uniqueStrings([...existing.anchoredTo, ...anchoredTo])
          const proposedCue = compactRetrievalCue(p.retrieval_cue, p.anchor_text ?? p.when ?? label)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, p.anchor_text ?? p.when ?? label)
          }
          driftDedup(drift, 'temporal_anchor', id, existing.id)
          linkDeadlineAnchorToThreadTimers(draft, existing)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        const anchor: Sf2TemporalAnchor = {
          id,
          title: String(p.title ?? label),
          chapterCreated: chapter,
          category: 'temporal_anchor',
          kind,
          status: normalizeTemporalAnchorStatus(p.status),
          label,
          anchorText,
          anchoredTo,
          retrievalCue: compactRetrievalCue(p.retrieval_cue, p.anchor_text ?? p.when ?? label),
          turn: turnIndex,
        }
        const inv = checkTemporalAnchor(anchor, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `temporal_anchor.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        draft.campaign.temporalAnchors[id] = anchor
        linkDeadlineAnchorToThreadTimers(draft, anchor)
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
      case 'document': {
        if (!draft.campaign.documents) draft.campaign.documents = {}
        const p = write.payload as Record<string, unknown>
        const id = (p.id as string | undefined) ?? nextEntityId('doc', draft)
        if (draft.campaign.documents[id]) {
          outcomes.push({
            accepted: false,
            reason: `document.id: ${id} already exists; use update/amendment or supersede instead`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          drift.push({
            kind: 'protected_field_write',
            detail: `document create attempted to overwrite existing ${id}`,
            entityId: id,
          })
          return
        }
        const type = normalizeDocumentType(p.type ?? p.kind_label ?? p.kindLabel)

        // Subjects: required, resolve npc-or-faction.
        const subjectRefs = Array.isArray(p.subject_entity_ids)
          ? (p.subject_entity_ids as string[])
          : Array.isArray(p.subjects)
            ? (p.subjects as string[])
            : []
        const subjectEntityIds: string[] = []
        for (const r of subjectRefs) {
          const sid = resolveAgentId(draft, r)
          if (!sid) {
            drift.push({ kind: 'anchor_reference_missing', detail: `document subject ${r} unresolved` })
          } else {
            subjectEntityIds.push(sid)
            // Synthesized-id recovery diagnostic: if the proposed reference
            // didn't match any NPC/faction by id or name but DID resolve via
            // role/retrievalCue fuzzy-match, surface it so we can monitor how
            // often the Archivist emits role-descriptive IDs.
            if (resolvedBySynthesizedAgentId(draft, r, sid)) {
              drift.push({
                kind: 'contradiction',
                detail: `synthesized_id_recovered: document subject "${r}" → "${sid}" via role-descriptor fuzzy match`,
                entityId: sid,
              })
            }
          }
        }

        // Anchors: optional. Floating documents allowed.
        const anchoredRefs = Array.isArray(p.anchored_to) ? (p.anchored_to as string[]) : []
        const anchoredTo: string[] = []
        for (const r of anchoredRefs) {
          const tid = resolveThreadId(draft, r)
          if (!tid) {
            drift.push({ kind: 'anchor_reference_missing', detail: `document anchor ${r} unresolved` })
          } else {
            anchoredTo.push(tid)
          }
        }

        // Attribution: filed-by / signed-by / additional parties. All optional but resolved when present.
        const filedByRaw = (p.filed_by ?? p.filedBy) as string | undefined
        const signedByRaw = (p.signed_by ?? p.signedBy) as string | undefined
        const filedByEntityId = filedByRaw ? resolveAgentId(draft, filedByRaw) ?? undefined : undefined
        const signedByEntityId = signedByRaw ? resolveAgentId(draft, signedByRaw) ?? undefined : undefined
        if (filedByRaw && !filedByEntityId) {
          drift.push({ kind: 'anchor_reference_missing', detail: `document filed_by ${filedByRaw} unresolved` })
        }
        if (signedByRaw && !signedByEntityId) {
          drift.push({ kind: 'anchor_reference_missing', detail: `document signed_by ${signedByRaw} unresolved` })
        }

        const partiesRaw = Array.isArray(p.additional_parties) ? p.additional_parties : []
        const additionalParties: Sf2DocumentParty[] = []
        for (const raw of partiesRaw as Array<Record<string, unknown>>) {
          const role = String(raw.role ?? '').trim()
          const idOrName = String(raw.entity_id ?? raw.entityId ?? raw.name_or_id ?? '').trim()
          if (!role || !idOrName) continue
          const resolved = resolveAgentId(draft, idOrName)
          if (!resolved) {
            drift.push({ kind: 'anchor_reference_missing', detail: `document party ${idOrName} (${role}) unresolved` })
            continue
          }
          additionalParties.push({ role, entityId: resolved })
        }

        const originalSummary = String(p.original_summary ?? p.summary ?? p.authorizes ?? '').trim()
        const authorizes = String(p.authorizes ?? p.summary ?? '').trim()
        const kindLabel = String(p.kind_label ?? p.kindLabel ?? '').trim()
        const title = String(p.title ?? authorizes ?? `${kindLabel || 'document'}`).slice(0, 120)

        const accessLevelRaw = String(p.access_level ?? p.accessLevel ?? '').toLowerCase()
        const accessLevel: Sf2Document['accessLevel'] =
          accessLevelRaw === 'sealed' || accessLevelRaw === 'classified' || accessLevelRaw === 'public'
            ? accessLevelRaw
            : undefined

        const doc: Sf2Document = {
          id,
          title,
          chapterCreated: chapter,
          retrievalCue: compactRetrievalCue(p.retrieval_cue, authorizes || title),
          category: 'document',
          type,
          kindLabel: kindLabel || type,
          status: 'active',
          filedByEntityId,
          signedByEntityId,
          signedAtTurn: signedByEntityId ? turnIndex : undefined,
          additionalParties,
          subjectEntityIds,
          authorizes,
          originalSummary: originalSummary || authorizes,
          currentSummary: originalSummary || authorizes,
          revisions: [],
          anchoredTo,
          accessLevel,
          clueIds: [],
          turn: turnIndex,
        }

        const inv = checkDocument(doc, draft.campaign)
        if (!inv.ok) {
          outcomes.push({
            accepted: false,
            reason: `document.${inv.field}: ${inv.reason}`,
            writeRef: ref,
            confidenceTier: write.confidence,
          })
          return
        }
        const existing: Sf2Document | undefined = Object.values(draft.campaign.documents).find((existingDoc) => {
          const sameTitle = semanticTextMatches(existingDoc.title, doc.title)
          const sameKind = existingDoc.type === doc.type && semanticTextMatches(existingDoc.kindLabel, doc.kindLabel)
          const sameSubjects = sameStringSet(existingDoc.subjectEntityIds, doc.subjectEntityIds)
          const sameTerms = semanticTextOverlaps(existingDoc.originalSummary, doc.originalSummary) ||
            semanticTextOverlaps(existingDoc.authorizes, doc.authorizes)
          return sameTitle || (sameKind && sameSubjects && sameTerms)
        })
        if (existing) {
          existing.anchoredTo = uniqueStrings([...existing.anchoredTo, ...anchoredTo])
          const partyKeys = new Set(existing.additionalParties.map((party) => `${party.role}:${party.entityId}`))
          for (const party of additionalParties) {
            const key = `${party.role}:${party.entityId}`
            if (partyKeys.has(key)) continue
            partyKeys.add(key)
            existing.additionalParties.push(party)
          }
          const proposedCue = compactRetrievalCue(p.retrieval_cue, authorizes || title)
          if (proposedCue) {
            existing.retrievalCue = mergeRetrievalCue(existing.retrievalCue, proposedCue, authorizes || title)
          }
          driftDedup(drift, 'document', id, existing.id)
          outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
          return
        }
        draft.campaign.documents[id] = doc
        outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
        return
      }
    }
  } catch (err) {
    outcomes.push({
      accepted: false,
      reason: `exception: ${(err as Error).message}`,
      writeRef: ref,
      confidenceTier: write.confidence,
    })
  }
}

function applyUpdate(
  draft: Sf2State,
  write: Sf2ArchivistUpdate,
  ref: string,
  outcomes: SubWriteOutcome[],
  drift: Sf2ArchivistFlag[],
  turnIndex: number
): void {
  if (write.confidence === 'low') {
    outcomes.push(deferOrReject(write.confidence, 'low-confidence update deferred', ref))
    return
  }
  switch (write.entityKind) {
    case 'npc': {
      const id = resolveNpcId(draft, write.entityId)
      if (!id) {
        drift.push({
          kind: 'anchor_reference_missing',
          detail: `update npc: ${write.entityId} unresolved`,
        })
        outcomes.push({
          accepted: false,
          reason: 'npc.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const prior = draft.campaign.npcs[id]
      const dispUpdate = coerceDisposition(write.changes.disposition, prior.disposition)
      if (dispUpdate.coerced && dispUpdate.rawValue) {
        drift.push({
          kind: 'contradiction',
          detail: `disposition "${dispUpdate.rawValue}" not in enum; coerced to "${dispUpdate.tier}"`,
          entityId: id,
        })
      }
      const tagUpdate = coerceTempLoadTag(write.changes.temp_load_tag)
      if (tagUpdate.status === 'invalid' && tagUpdate.rawValue) {
        drift.push({
          kind: 'contradiction',
          detail: `temp_load_tag "${tagUpdate.rawValue}" not in enum; field ignored`,
          entityId: id,
        })
      }
      const dispositionRestated = Object.prototype.hasOwnProperty.call(write.changes, 'disposition')
      const nextTempLoadTag =
        tagUpdate.status === 'set'
          ? tagUpdate.value
          : tagUpdate.status === 'cleared'
            ? undefined
            : dispositionRestated
              ? undefined
            : prior.tempLoadTag
      const next: Sf2Npc = {
        ...prior,
        identity: {
          ...prior.identity,
          pronoun: npcPronounFromPayload(write.changes) ?? prior.identity.pronoun,
          age: npcAgeFromPayload(write.changes) ?? prior.identity.age,
        },
        disposition: dispUpdate.tier,
        tempLoad: (write.changes.temp_load as number | undefined) ?? prior.tempLoad,
        tempLoadTag: nextTempLoadTag,
        agenda: normalizeAgenda(write.changes.agenda, prior.agenda, turnIndex),
        lastSeenTurn: (write.changes.last_seen_turn as number | undefined) ?? prior.lastSeenTurn,
      }
      const inv = checkNpcIdentity(next, prior)
      if (!inv.ok) {
        outcomes.push({
          accepted: false,
          reason: `npc.${inv.field}: ${inv.reason}`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        drift.push({
          kind: 'protected_field_write',
          detail: `attempted to mutate protected field ${inv.field}`,
          entityId: id,
        })
        return
      }
      draft.campaign.npcs[id] = next
      if (agendaChanged(write.changes.agenda, prior.agenda)) {
        reheatNpcAgendaAction(
          draft.chapter.setup,
          pressureThreadIdsForOwner(draft, 'npc', id),
          agendaSeverity(write.changes)
        )
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'faction': {
      const id = resolveFactionId(draft, write.entityId)
      if (!id) {
        outcomes.push({
          accepted: false,
          reason: 'faction.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const prior = draft.campaign.factions[id]
      draft.campaign.factions[id] = {
        ...prior,
        stance: coerceDisposition(write.changes.stance, prior.stance).tier,
        heat: coerceHeat(write.changes.heat, prior.heat).level,
        heatReasons: (write.changes.heat_reasons as string[] | undefined) ?? prior.heatReasons,
        agenda: normalizeAgenda(write.changes.agenda, prior.agenda, turnIndex),
      }
      if (agendaChanged(write.changes.agenda, prior.agenda)) {
        reheatNpcAgendaAction(
          draft.chapter.setup,
          pressureThreadIdsForOwner(draft, 'faction', id),
          agendaSeverity(write.changes)
        )
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'thread': {
      const id = resolveThreadId(draft, write.entityId)
      if (!id) {
        outcomes.push({
          accepted: false,
          reason: 'thread.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const prior = draft.campaign.threads[id]
      const rawTension = write.changes.tension as number | undefined
      // Clamp tension to [0, 10] — Archivist occasionally proposes 11+; don't
      // reject the whole update (it has other valid fields), just clamp and flag.
      const nextTension = rawTension !== undefined ? Math.max(0, Math.min(10, rawTension)) : prior.tension
      if (rawTension !== undefined && rawTension !== nextTension) {
        drift.push({
          kind: 'contradiction',
          detail: `thread.tension clamped: ${rawTension} → ${nextTension} (bounds [0,10])`,
          entityId: id,
        })
      }
      const tensionChanged = rawTension !== undefined && nextTension !== prior.tension
      let nextHistory = prior.tensionHistory
      if (tensionChanged) {
        // Backfill an initial baseline so the first-ever change in an empty
        // history can still produce a delta on the same render.
        if (nextHistory.length === 0) {
          nextHistory = [
            { chapter: prior.chapterCreated, turn: Math.max(0, turnIndex - 1), value: prior.tension },
          ]
        }
        nextHistory = [
          ...nextHistory,
          { chapter: draft.chapter.setup.chapter, turn: turnIndex, value: nextTension },
        ]
      }
      const explicitLastAdvanced = write.changes.last_advanced_turn as number | undefined
      const statusChange = write.changes.status
      if (statusChange !== undefined && !isThreadStatus(statusChange)) {
        const reason = `thread.status: invalid status "${String(statusChange)}"`
        drift.push({
          kind: 'contradiction',
          detail: `${id}: ${reason}`,
          entityId: id,
        })
        outcomes.push({
          accepted: false,
          reason,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const nextStatus = isThreadStatus(statusChange) ? statusChange : prior.status
      const transitionReason = invalidThreadTransitionReason(prior.status, nextStatus)
      if (transitionReason) {
        drift.push({
          kind: 'contradiction',
          detail: `${id}: ${transitionReason}`,
          entityId: id,
        })
        outcomes.push({
          accepted: false,
          reason: transitionReason,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const updatedThread: Sf2Thread = {
        ...prior,
        tension: nextTension,
        tensionHistory: nextHistory,
        peakTension: Math.max(prior.peakTension ?? prior.tension, nextTension),
        status: nextStatus,
        lastAdvancedTurn: tensionChanged
          ? explicitLastAdvanced ?? turnIndex
          : explicitLastAdvanced ?? prior.lastAdvancedTurn,
      }
      applyThreadProgressChanges(updatedThread, write.changes, turnIndex, write.sourceQuote)
      const resolutionBlock = successfulThreadResolutionBlocked(updatedThread, nextStatus, write.sourceQuote)
      if (resolutionBlock) {
        drift.push({
          kind: 'contradiction',
          detail: `thread ${id} resolution blocked: ${resolutionBlock}`,
          entityId: id,
        })
        outcomes.push({
          accepted: false,
          reason: `thread.resolution_gates: ${resolutionBlock}`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      draft.campaign.threads[id] = updatedThread
      if (nextStatus === 'active') {
        syncActiveThreadIntoChapterRuntime(draft, id, {
          loadBearing: prior.loadBearing,
          successor: Boolean(prior.successorToThreadId),
        })
      } else if (isThreadTerminal(nextStatus)) {
        removeThreadFromChapterRuntime(draft, id)
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'operation_plan': {
      const c = write.changes
      const prior = draft.campaign.operationPlan
      const status = c.status
      const nextStatus =
        status === 'active' || status === 'paused' || status === 'resolved' || status === 'abandoned'
          ? status
          : prior?.status ?? 'active'
      const nextTarget = typeof c.target === 'string' && c.target.trim() ? c.target.trim() : prior?.target ?? ''
      const nextApproach = typeof c.approach === 'string' && c.approach.trim() ? c.approach.trim() : prior?.approach ?? ''
      const nextFallback = typeof c.fallback === 'string' && c.fallback.trim() ? c.fallback.trim() : prior?.fallback ?? ''
      const nextName = typeof c.name === 'string' && c.name.trim() ? c.name.trim() : prior?.name
      if (!prior && !nextTarget && !nextApproach && !nextFallback) {
        outcomes.push({
          accepted: false,
          reason: 'operation_plan: first write needs at least one of target/approach/fallback',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      draft.campaign.operationPlan = {
        name: nextName,
        target: nextTarget,
        approach: nextApproach,
        fallback: nextFallback,
        status: nextStatus,
        lastUpdatedTurn: turnIndex,
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'arc': {
      const id = write.entityId
      if (!draft.campaign.arcs[id]) {
        outcomes.push({
          accepted: false,
          reason: 'arc.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const prior = draft.campaign.arcs[id]
      draft.campaign.arcs[id] = {
        ...prior,
        status: (write.changes.status as Sf2Arc['status']) ?? prior.status,
      }
      syncArcPlanStatusFromArcEntity(draft)
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'clue': {
      const clue = draft.campaign.clues[write.entityId]
      if (!clue) {
        outcomes.push({
          accepted: false,
          reason: 'clue.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const nextContent = write.changes.content as string | undefined
      const nextCue = write.changes.retrieval_cue as string | undefined
      const nextEvidenceQuestion = write.changes.evidence_question as string | undefined
      const nextEvidenceKind = write.changes.evidence_kind as string | undefined
      const anchoredAppend = write.changes.anchored_to as string[] | undefined
      if (nextContent !== undefined && nextContent.trim().length > 0) {
        clue.content = nextContent
      }
      if (nextCue !== undefined && nextCue.trim().length > 0) {
        clue.retrievalCue = compactRetrievalCue(nextCue, clue.content)
      }
      if (nextEvidenceQuestion !== undefined && nextEvidenceQuestion.trim().length > 0) {
        clue.evidenceQuestion = nextEvidenceQuestion
      }
      if (nextEvidenceKind !== undefined) {
        clue.evidenceKind = coerceClueEvidenceKind(nextEvidenceKind)
      }
      if (Array.isArray(anchoredAppend) && anchoredAppend.length > 0) {
        const resolved = anchoredAppend
          .map((r) => resolveThreadId(draft, r))
          .filter((x): x is string => Boolean(x))
        if (resolved.length > 0) {
          const invalidAnchors = nonInvestigationThreadIds(draft, resolved)
          if (invalidAnchors.length > 0) {
            outcomes.push({
              accepted: false,
              reason: 'clue.anchoredTo: clue anchors must be investigation threads',
              writeRef: ref,
              confidenceTier: write.confidence,
            })
            return
          }
          const merged = new Set([...clue.anchoredTo, ...resolved])
          clue.anchoredTo = [...merged]
          if (clue.status === 'floating' && clue.anchoredTo.length > 0) {
            clue.status = 'attached'
            draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter(
              (x) => x !== clue.id
            )
          }
        }
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'document': {
      if (!draft.campaign.documents) draft.campaign.documents = {}
      const doc = draft.campaign.documents[write.entityId]
      if (!doc) {
        outcomes.push({
          accepted: false,
          reason: 'document.id: not in registry',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      // Amendment: changes to currentSummary / authorizes are tracked as a revision
      // entry. originalSummary is locked — never overwritten by an update.
      const c = write.changes as Record<string, unknown>
      const lockedFields = [
        'filed_by',
        'filedBy',
        'signed_by',
        'signedBy',
        'type',
        'original_summary',
        'originalSummary',
      ]
      const attemptedLockedFields = lockedFields.filter((field) => field in c)
      if (attemptedLockedFields.length > 0) {
        outcomes.push({
          accepted: false,
          reason: `document.protectedFields: ${attemptedLockedFields.join(', ')} are locked after creation`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        drift.push({
          kind: 'protected_field_write',
          detail: `attempted to mutate protected document fields: ${attemptedLockedFields.join(', ')}`,
          entityId: doc.id,
        })
        return
      }
      const amendmentSummary = (c.current_summary ?? c.currentSummary ?? c.amended_summary) as
        | string
        | undefined
      const amendmentReason = String(c.amendment_reason ?? c.reason ?? '').trim()
      const changedByRaw = (c.changed_by ?? c.changedBy) as string | undefined
      const changedById = changedByRaw ? resolveAgentId(draft, changedByRaw) ?? undefined : undefined
      if (amendmentSummary !== undefined && amendmentSummary.trim().length > 0) {
        doc.revisions.push({
          atTurn: (c.at_turn as number | undefined) ?? -1,
          summary: amendmentSummary,
          reason: amendmentReason || 'amended',
          changedBy: changedById,
        })
        doc.currentSummary = amendmentSummary
      }
      // Append-only union for anchors. Never silently remove.
      const anchorsAdd = c.anchored_to as string[] | undefined
      if (Array.isArray(anchorsAdd) && anchorsAdd.length > 0) {
        const resolved = anchorsAdd
          .map((r) => resolveThreadId(draft, r))
          .filter((x): x is string => Boolean(x))
        if (resolved.length > 0) {
          doc.anchoredTo = Array.from(new Set([...doc.anchoredTo, ...resolved]))
        }
      }
      // Cross-ref new clues that record what the PC has discovered about this doc.
      const clueIdsAdd = c.clue_ids as string[] | undefined
      if (Array.isArray(clueIdsAdd) && clueIdsAdd.length > 0) {
        const resolved = clueIdsAdd.filter((cid) => Boolean(draft.campaign.clues[cid]))
        if (resolved.length > 0) {
          doc.clueIds = Array.from(new Set([...doc.clueIds, ...resolved]))
        }
      }
      // Additional parties can be added post-creation (counter-signers later, etc.).
      // Do NOT mutate filedByEntityId or signedByEntityId via update — those are the
      // attribution baseline for drift detection. To change attribution, supersede
      // the document with a new one and transition the old to 'superseded'.
      const partiesAdd = c.additional_parties as Array<Record<string, unknown>> | undefined
      if (Array.isArray(partiesAdd) && partiesAdd.length > 0) {
        for (const raw of partiesAdd) {
          const role = String(raw.role ?? '').trim()
          const idOrName = String(raw.entity_id ?? raw.entityId ?? '').trim()
          if (!role || !idOrName) continue
          const resolved = resolveAgentId(draft, idOrName)
          if (!resolved) continue
          if (
            !doc.additionalParties.some((p) => p.entityId === resolved && p.role === role)
          ) {
            doc.additionalParties.push({ role, entityId: resolved })
          }
        }
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
  }
}

function applyTransition(
  draft: Sf2State,
  write: Sf2ArchivistTransition,
  ref: string,
  outcomes: SubWriteOutcome[]
): void {
  if (write.confidence === 'low') {
    outcomes.push(deferOrReject(write.confidence, 'low-confidence transition deferred', ref))
    return
  }
  switch (write.entityKind) {
    case 'thread': {
      const id = resolveThreadId(draft, write.entityId)
      if (!id) {
        outcomes.push({ accepted: false, reason: 'thread not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      const toStatus = write.toStatus
      if (!isThreadStatus(toStatus)) {
        outcomes.push({
          accepted: false,
          reason: `thread.toStatus: invalid status "${String(write.toStatus)}"`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const thread = draft.campaign.threads[id]
      const transitionReason = invalidThreadTransitionReason(thread.status, toStatus)
      if (transitionReason) {
        outcomes.push({
          accepted: false,
          reason: transitionReason,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      const resolutionBlock = successfulThreadResolutionBlocked(thread, toStatus, write.reason)
      if (resolutionBlock) {
        outcomes.push({
          accepted: false,
          reason: `thread.resolution_gates: ${resolutionBlock}`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      thread.status = toStatus
      if (isThreadResolved(toStatus)) {
        thread.tension = 0
      }
      if (isThreadTerminal(toStatus)) {
        removeThreadFromChapterRuntime(draft, id)
      }
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'decision': {
      const decision = draft.campaign.decisions[write.entityId]
      if (!decision) {
        outcomes.push({ accepted: false, reason: 'decision not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      decision.status = write.toStatus as Sf2Decision['status']
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'promise': {
      const promise = draft.campaign.promises[write.entityId]
      if (!promise) {
        outcomes.push({ accepted: false, reason: 'promise not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      promise.status = write.toStatus as Sf2Promise['status']
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'clue': {
      const clue = draft.campaign.clues[write.entityId]
      if (!clue) {
        outcomes.push({ accepted: false, reason: 'clue not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      clue.status = write.toStatus as Sf2Clue['status']
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'arc': {
      const arc = draft.campaign.arcs[write.entityId]
      if (!arc) {
        outcomes.push({ accepted: false, reason: 'arc not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      arc.status = write.toStatus as Sf2Arc['status']
      syncArcPlanStatusFromArcEntity(draft)
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'document': {
      const doc = draft.campaign.documents?.[write.entityId]
      if (!doc) {
        outcomes.push({ accepted: false, reason: 'document not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      // Per-type lifecycle: only valid transitions allowed. Closed type ↔ closed
      // status set means the Archivist can't slip a record into 'revoked' or a
      // communication into 'resolved'.
      if (!isValidDocumentTransition(doc.type, write.toStatus)) {
        outcomes.push({
          accepted: false,
          reason: `document.toStatus: ${doc.type} cannot transition to "${write.toStatus}" (valid: ${DOCUMENT_VALID_TRANSITIONS[doc.type].join('|')})`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      // Never re-open a closed document. Once superseded/revoked/void/resolved,
      // a successor document is the right move, not a status flip back to active.
      if (doc.status !== 'active') {
        outcomes.push({
          accepted: false,
          reason: `document.status: cannot transition from terminal status "${doc.status}"`,
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      doc.status = write.toStatus as Sf2DocumentStatus
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
  }
}

function applyAttachment(
  draft: Sf2State,
  write: Sf2ArchivistAttachment,
  ref: string,
  outcomes: SubWriteOutcome[],
  deferred: DeferredWrite[],
  drift: Sf2ArchivistFlag[]
): void {
  if (write.kind === 'anchor_thread_to_arc') {
    const threadId = resolveThreadId(draft, write.entityId)
    const arcId = write.arcId ? resolveArcId(draft, write.arcId) : null
    if (!threadId || !arcId) {
      const missing = !threadId ? `thread ${write.entityId}` : `arc ${write.arcId ?? ''}`
      drift.push({
        kind: 'anchor_reference_missing',
        detail: `anchor_thread_to_arc ${missing} unresolved`,
      })
      if (write.confidence === 'low') {
        deferred.push({ kind: 'attachment', payload: write, reason: 'thread/arc unresolved' })
        outcomes.push(deferOrReject(write.confidence, 'thread/arc unresolved', ref))
      } else {
        outcomes.push({
          accepted: false,
          reason: 'thread/arc unresolved',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
      }
      return
    }
    attachThreadToArc(draft, threadId, arcId)
    outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
    return
  }

  const resolved = write.threadIds
    .map((r) => resolveThreadId(draft, r))
    .filter((x): x is string => Boolean(x))
  if (resolved.length === 0) {
    drift.push({
      kind: 'anchor_reference_missing',
      detail: `${write.kind} ${write.entityId} anchors unresolved`,
    })
    if (write.confidence === 'low') {
      deferred.push({ kind: 'attachment', payload: write, reason: 'anchors unresolved' })
      outcomes.push(deferOrReject(write.confidence, 'anchors unresolved', ref))
    } else {
      outcomes.push({
        accepted: false,
        reason: 'anchors unresolved',
        writeRef: ref,
        confidenceTier: write.confidence,
      })
    }
    return
  }
  switch (write.kind) {
    case 'anchor_decision': {
      const d = draft.campaign.decisions[write.entityId]
      if (!d) {
        outcomes.push({ accepted: false, reason: 'decision not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      d.anchoredTo = Array.from(new Set([...d.anchoredTo, ...resolved]))
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'anchor_promise': {
      const p = draft.campaign.promises[write.entityId]
      if (!p) {
        outcomes.push({ accepted: false, reason: 'promise not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      p.anchoredTo = Array.from(new Set([...p.anchoredTo, ...resolved]))
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
    case 'anchor_clue': {
      const c = draft.campaign.clues[write.entityId]
      if (!c) {
        outcomes.push({ accepted: false, reason: 'clue not found', writeRef: ref, confidenceTier: write.confidence })
        return
      }
      const invalidAnchors = nonInvestigationThreadIds(draft, resolved)
      if (invalidAnchors.length > 0) {
        outcomes.push({
          accepted: false,
          reason: 'clue.anchoredTo: clue anchors must be investigation threads',
          writeRef: ref,
          confidenceTier: write.confidence,
        })
        return
      }
      c.anchoredTo = Array.from(new Set([...c.anchoredTo, ...resolved]))
      c.status = 'attached'
      draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter((x) => x !== c.id)
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
  }
}

function isKnownCampaignEntityId(draft: Sf2State, id: string): boolean {
  if (id === 'the PC') return true
  return Boolean(
    draft.campaign.npcs[id] ||
      draft.campaign.factions[id] ||
      draft.campaign.threads[id] ||
      draft.campaign.arcs[id] ||
      draft.campaign.documents?.[id] ||
      draft.campaign.clues[id] ||
      draft.campaign.decisions[id] ||
      draft.campaign.promises[id]
  )
}

function pressureEventRejection(
  outcomes: SubWriteOutcome[],
  drift: Sf2ArchivistFlag[],
  ref: string,
  reason: string,
  entityId?: string
): void {
  outcomes.push({
    accepted: false,
    reason,
    writeRef: ref,
    confidenceTier: 'high',
  })
  drift.push({
    kind: reason.includes('not in registry') || reason.includes('unknown')
      ? 'anchor_reference_missing'
      : 'contradiction',
    detail: `pressure event rejected: ${reason}`,
    entityId,
  })
}

function normalizePressureEventTargetThreads(
  draft: Sf2State,
  event: Sf2PressureEvent
): string[] | null {
  if (!Array.isArray(event.targetThreadIds) || event.targetThreadIds.length === 0) {
    return null
  }
  const resolved: string[] = []
  for (const rawThreadId of event.targetThreadIds) {
    const threadId = resolveThreadId(draft, rawThreadId)
    if (!threadId) return null
    resolved.push(threadId)
  }
  return uniqueStrings(resolved)
}

function applyPressureEvents(
  draft: Sf2State,
  events: Sf2PressureEvent[] | undefined,
  outcomes: SubWriteOutcome[],
  drift: Sf2ArchivistFlag[],
  turnIndex: number
): void {
  if (!events || events.length === 0) return

  draft.campaign.pressureEvents ??= []
  const existingKeys = new Set(draft.campaign.pressureEvents.map((event) => event.idempotencyKey))
  const acceptedKeys = new Set<string>()

  events.forEach((event, index) => {
    const ref = `pressureEvents[${index}]`
    const idempotencyKey = String(event.idempotencyKey ?? '').trim()
    if (!idempotencyKey) {
      pressureEventRejection(outcomes, drift, ref, 'pressure_event.idempotencyKey: required')
      return
    }
    if (existingKeys.has(idempotencyKey) || acceptedKeys.has(idempotencyKey)) {
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: 'high' })
      return
    }
    if (!PRESSURE_EVENT_SOURCES.includes(event.source)) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        `pressure_event.source: invalid source "${String(event.source)}"`
      )
      return
    }
    if (!PRESSURE_EVENT_SCOPES.includes(event.scope)) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        `pressure_event.scope: invalid scope "${String(event.scope)}"`
      )
      return
    }
    if (event.severity !== undefined && !PRESSURE_EVENT_SEVERITIES.includes(event.severity)) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        `pressure_event.severity: invalid severity "${String(event.severity)}"`
      )
      return
    }
    if (event.amount !== undefined && !Number.isFinite(Number(event.amount))) {
      pressureEventRejection(outcomes, drift, ref, 'pressure_event.amount: must be finite')
      return
    }
    const targetThreadIds = normalizePressureEventTargetThreads(draft, event)
    if (!targetThreadIds) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        'pressure_event.targetThreadIds: target thread not in registry'
      )
      return
    }
    const evidenceQuote = String(event.evidenceQuote ?? '').trim()
    if (!evidenceQuote) {
      pressureEventRejection(outcomes, drift, ref, 'pressure_event.evidenceQuote: required')
      return
    }
    const consequence = event.humanConsequence
    if (!consequence) {
      pressureEventRejection(outcomes, drift, ref, 'pressure_event.humanConsequence: required')
      return
    }
    const whoPays = String(consequence.whoPays ?? '').trim()
    if (!isKnownCampaignEntityId(draft, whoPays)) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        `pressure_event.humanConsequence.whoPays: unknown id "${whoPays}"`
      )
      return
    }
    const whoGainsLeverage = String(consequence.whoGainsLeverage ?? '').trim()
    if (whoGainsLeverage && !isKnownCampaignEntityId(draft, whoGainsLeverage)) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        `pressure_event.humanConsequence.whoGainsLeverage: unknown id "${whoGainsLeverage}"`
      )
      return
    }
    const whatGetsHarder = String(consequence.whatGetsHarder ?? '').trim()
    const whatIsAtRisk = String(consequence.whatIsAtRisk ?? '').trim()
    const visiblePressure = String(consequence.visiblePressure ?? '').trim()
    if (!whatGetsHarder || !whatIsAtRisk || !visiblePressure) {
      pressureEventRejection(
        outcomes,
        drift,
        ref,
        'pressure_event.humanConsequence: whoPays, whatGetsHarder, whatIsAtRisk, and visiblePressure are required',
        whoPays
      )
      return
    }

    const accepted: Sf2PressureEvent = {
      id: String(event.id ?? '').trim() || `pressure_event_${turnIndex}_${index + 1}`,
      turn: Number.isFinite(Number(event.turn)) ? Math.max(0, Math.round(Number(event.turn))) : turnIndex,
      source: event.source,
      targetThreadIds,
      scope: event.scope,
      evidenceQuote,
      humanConsequence: {
        whoPays: whoPays as Sf2PressureEvent['humanConsequence']['whoPays'],
        whoGainsLeverage: whoGainsLeverage || undefined,
        whatGetsHarder,
        whatIsAtRisk,
        visiblePressure,
      },
      idempotencyKey,
    }
    if (event.amount !== undefined) accepted.amount = Number(event.amount)
    if (event.severity !== undefined) accepted.severity = event.severity
    draft.campaign.pressureEvents.push(accepted)
    acceptedKeys.add(idempotencyKey)
    outcomes.push({ accepted: true, writeRef: ref, confidenceTier: 'high' })
  })

  draft.campaign.pressureEvents = draft.campaign.pressureEvents.slice(-PRESSURE_EVENT_CAP)
}

function beatValidationFailureReason(
  add: { text?: string; salience: number; emotionalTags: Sf2EmotionalBeatTag[] }
): string | null {
  if (!add.text) return 'empty text'
  if (add.salience < 0.5) return `salience ${add.salience} below 0.5 floor`
  if (add.emotionalTags.length === 0) return 'no emotional_tags'
  return null
}

function buildBeat(
  add: { text: string; participants: string[]; anchoredTo: string[]; emotionalTags: Sf2EmotionalBeatTag[]; salience: number },
  draft: Sf2State,
  turn: number,
  chapter: number
): Sf2EmotionalBeat {
  const id = nextEntityId('beat', draft)
  const participants = [...new Set(add.participants)].filter(
    (pid) => pid === 'pc' || Boolean(draft.campaign.npcs[pid] || draft.campaign.factions[pid])
  ) as Sf2BeatParticipant[]
  const anchoredTo = [...new Set(add.anchoredTo)].filter((aid) =>
    Boolean(
      draft.campaign.threads[aid] ||
        draft.campaign.decisions[aid] ||
        draft.campaign.promises[aid] ||
        draft.campaign.clues[aid] ||
        draft.campaign.documents?.[aid] ||
        draft.campaign.arcs[aid]
    )
  )
  return {
    id,
    title: add.text.slice(0, 80),
    chapterCreated: chapter,
    category: 'emotional_beat',
    retrievalCue: compactRetrievalCue(add.text),
    text: add.text,
    participants,
    anchoredTo,
    emotionalTags: add.emotionalTags,
    salience: add.salience,
    turn,
  }
}

function findMatchingBeat(draft: Sf2State, proposed: Sf2EmotionalBeat): Sf2EmotionalBeat | undefined {
  return draft.campaign.beats[proposed.id] ??
    Object.values(draft.campaign.beats).find((beat) => {
      const participantCompatible =
        beat.participants.length === 0 ||
        proposed.participants.length === 0 ||
        stringSetIntersects(beat.participants, proposed.participants)
      const anchorCompatible =
        beat.anchoredTo.length === 0 ||
        proposed.anchoredTo.length === 0 ||
        stringSetIntersects(beat.anchoredTo, proposed.anchoredTo)
      const tagCompatible = stringSetIntersects(beat.emotionalTags, proposed.emotionalTags)
      return participantCompatible &&
        anchorCompatible &&
        tagCompatible &&
        semanticTextOverlaps(beat.text, proposed.text)
    })
}

function mergeBeatIntoExisting(existing: Sf2EmotionalBeat, proposed: Sf2EmotionalBeat): void {
  if (proposed.text.length > existing.text.length) {
    existing.text = proposed.text
    existing.title = proposed.title
    existing.retrievalCue = proposed.retrievalCue
  }
  existing.participants = uniqueStrings([...existing.participants, ...proposed.participants]) as Sf2BeatParticipant[]
  existing.anchoredTo = uniqueStrings([...existing.anchoredTo, ...proposed.anchoredTo])
  existing.emotionalTags = uniqueStrings([...existing.emotionalTags, ...proposed.emotionalTags]) as Sf2EmotionalBeatTag[]
  existing.salience = Math.max(existing.salience, proposed.salience)
}

export function applyArchivistPatch(
  state: Sf2State,
  patch: Sf2ArchivistPatch,
  chapter: number
): ApplyPatchResult {
  const draft: Sf2State = structuredClone(state)
  const outcomes: SubWriteOutcome[] = []
  const deferred: DeferredWrite[] = []
  const drift: Sf2ArchivistFlag[] = [...patch.flags]

  // Player-engagement reheat (D7 idempotent floor). Use the action-resolver
  // to find threads the player input *referenced*, regardless of whether the
  // archivist judged that mechanical tension changed. Reading from
  // tensionDeltasByThreadId would miss the "engaged but unchanged" case —
  // exactly the cohort the runway floor exists to capture.
  if (!patch.pacingClassification.worldInitiated) {
    const priorTurn = draft.history.turns.find((t) => t.index === patch.turnIndex - 1)
      ?? draft.history.turns.at(-1)
    if (priorTurn?.playerInput) {
      applyPlayerEngagementReheat(draft, priorTurn.playerInput)
    }
  }

  const hasPendingInvestigationThread = patch.creates.some((write) => {
    if (write.kind !== 'thread') return false
    if (write.confidence === 'low') return false
    const payload = write.payload as Record<string, unknown>
    return payload.resolution_mode === 'investigation' || payload.resolutionMode === 'investigation'
  })

  patch.creates.forEach((w, i) =>
    applyCreate(
      draft,
      w,
      `creates[${i}]`,
      outcomes,
      deferred,
      drift,
      patch.turnIndex,
      chapter,
      hasPendingInvestigationThread
    )
  )
  patch.updates.forEach((w, i) =>
    applyUpdate(draft, w, `updates[${i}]`, outcomes, drift, patch.turnIndex)
  )
  patch.transitions.forEach((w, i) =>
    applyTransition(draft, w, `transitions[${i}]`, outcomes)
  )
  patch.attachments.forEach((w, i) =>
    applyAttachment(draft, w, `attachments[${i}]`, outcomes, deferred, drift)
  )
  applyPressureEvents(draft, patch.pressureEvents, outcomes, drift, patch.turnIndex)

  if (patch.sceneResult) {
    draft.chapter.sceneSummaries.push({
      ...patch.sceneResult,
      chapter,
    })
  }

  if (patch.revelationHintsDelivered && patch.revelationHintsDelivered.length > 0) {
    for (const hint of patch.revelationHintsDelivered) {
      const revelation = draft.chapter.scaffolding.possibleRevelations.find(
        (r) => r.id === hint.revelationId
      )
      if (!revelation) {
        drift.push({
          kind: 'anchor_reference_missing',
          detail: `revelation hint target ${hint.revelationId} unresolved`,
          entityId: hint.revelationId,
        })
        continue
      }
      const hintPhrases = revelation.hintPhrases ?? []
      const matchedPhrase = hintPhrases.find((p) =>
        configuredHintMatches(p, hint.phraseMatched)
      )
      if (!matchedPhrase) {
        // Two failure modes share this branch: the phrase isn't configured
        // at all, or the configured phrase is below the minimum-length floor
        // (and configuredHintMatches rejected it). Both produce drift; the
        // detail names the configured phrase if any was below floor.
        const tooShort = hintPhrases.find(
          (p) => normalizePhrase(p).length < MIN_CONFIGURED_HINT_PHRASE_LENGTH
        )
        const reason = tooShort
          ? `configured phrase "${tooShort}" is below ${MIN_CONFIGURED_HINT_PHRASE_LENGTH}-char floor (rejects bidirectional substring match)`
          : `not configured for ${hint.revelationId}`
        drift.push({
          kind: 'contradiction',
          detail: `revelation hint phrase "${hint.phraseMatched}" ${reason}`,
          entityId: hint.revelationId,
        })
        continue
      }
      revelation.hintEvidence ??= []
      revelation.hintsDelivered ??= 0
      revelation.hintsRequired ??= 0
      // Dedupe on the configured phrase before incrementing the counter.
      // Without this, repeated emissions of the same hint inflate the
      // counter and let the gate fire on a single distinct hint counted
      // multiple times — the gate becomes structurally porous. Evidence
      // log still appends every emission for review visibility; only the
      // counter dedupes.
      const alreadyCounted = revelation.hintEvidence.some(
        (h) => h.phraseMatched === matchedPhrase
      )
      revelation.hintEvidence.push({
        phraseMatched: matchedPhrase,
        phraseEmitted: hint.phraseMatched,
        turn: patch.turnIndex,
        proseExcerpt: hint.proseExcerpt,
      })
      if (!alreadyCounted && revelation.hintsDelivered < revelation.hintsRequired) {
        revelation.hintsDelivered += 1
      }
    }
  }

  if (patch.revelationsRevealed && patch.revelationsRevealed.length > 0) {
    for (const reveal of patch.revelationsRevealed) {
      const revelation = draft.chapter.scaffolding.possibleRevelations.find(
        (r) => r.id === reveal.revelationId
      )
      if (!revelation) {
        drift.push({
          kind: 'anchor_reference_missing',
          detail: `revelation reveal target ${reveal.revelationId} unresolved`,
          entityId: reveal.revelationId,
        })
        continue
      }
      const hintPhrases = revelation.hintPhrases ?? []
      const hintsDelivered = revelation.hintsDelivered ?? 0
      const hintsRequired = revelation.hintsRequired ?? 0
      const hintGateActive = hintPhrases.length > 0 || hintsRequired > 0
      const enoughHints = !hintGateActive || hintsDelivered >= hintsRequired
      const validContexts = revelation.validRevealContexts ?? []
      const invalidContexts = revelation.invalidRevealContexts ?? []
      const validContext = validContexts.length === 0 || validContexts.includes(reveal.context)
      const invalidContext = invalidContexts.includes(reveal.context)
      const modePrefix = REVELATION_GATE_MODE === 'enforce' ? 'enforce' : 'observe'
      if (!enoughHints) {
        drift.push({
          kind: 'revelation_premature_reveal',
          detail: `${modePrefix}: ${reveal.revelationId} revealed with ${hintsDelivered}/${hintsRequired} hints`,
          entityId: reveal.revelationId,
        })
      }
      if (!validContext || invalidContext) {
        // Conditional rendering of the context lists — only include the side
        // that's relevant. Avoids "valid: any; invalid: none" noise.
        const detailBits: string[] = []
        if (!validContext) {
          detailBits.push(`valid: ${validContexts.join(', ') || 'any'}`)
        }
        if (invalidContext) {
          detailBits.push(`invalid: ${invalidContexts.join(', ')}`)
        }
        drift.push({
          kind: 'revelation_premature_reveal',
          detail: `${modePrefix}: ${reveal.revelationId} revealed in context "${reveal.context}" (${detailBits.join('; ')})`,
          entityId: reveal.revelationId,
        })
      }
      // Phase 1 (observe): always ratify; gates only generate drift.
      // Phase 2 (enforce): block ratification when either gate fails.
      const gatesPassed = enoughHints && validContext && !invalidContext
      if (REVELATION_GATE_MODE === 'observe' || gatesPassed) {
        revelation.revealed = true
        revelation.revealedAtTurn = patch.turnIndex
      }
    }
  }

  const pressureResult = chapterPressureRuntime.applyArchivistEffects(draft, {
    ladderFires: patch.ladderFires,
    turnIndex: patch.turnIndex,
  })
  drift.push(...pressureResult.drift)

  // Lexicon additions: dedupe by case-insensitive phrase, cap campaign lexicon
  // at 30 entries (drop oldest when over).
  if (patch.lexiconAdditions && patch.lexiconAdditions.length > 0) {
    if (!draft.campaign.lexicon) draft.campaign.lexicon = []
    const existing = new Set(draft.campaign.lexicon.map((l) => l.phrase.toLowerCase()))
    for (const add of patch.lexiconAdditions) {
      if (!add.phrase || existing.has(add.phrase.toLowerCase())) continue
      draft.campaign.lexicon.push({
        phrase: add.phrase,
        register: add.register,
        exampleContext: add.exampleContext,
        capturedAtTurn: patch.turnIndex,
        capturedInChapter: chapter,
      })
      existing.add(add.phrase.toLowerCase())
    }
    if (draft.campaign.lexicon.length > 30) {
      draft.campaign.lexicon = draft.campaign.lexicon.slice(-30)
    }
  }

  // Emotional beats: sparse moment-grain memory. Enforce the one-per-turn cap
  // here so over-eager Archivist output cannot flood retrieval. Validation
  // failures drift-log so silent drops don't hide archivist over-emission.
  if (patch.emotionalBeats && patch.emotionalBeats.length > 0) {
    if (!draft.campaign.beats) draft.campaign.beats = {}
    const accepted = patch.emotionalBeats.slice(0, 1)
    const dropped = patch.emotionalBeats.slice(1)
    for (const drop of dropped) {
      drift.push({
        kind: 'contradiction',
        detail: `emotional beat cap: dropped extra beat "${drop.text.slice(0, 80)}"`,
      })
    }
    for (const add of accepted) {
      const reason = beatValidationFailureReason(add)
      if (reason) {
        drift.push({
          kind: 'contradiction',
          detail: `emotional beat dropped: ${reason} (text: "${(add.text ?? '').slice(0, 60)}")`,
        })
        continue
      }
      const beat = buildBeat(add, draft, patch.turnIndex, chapter)
      const existing = findMatchingBeat(draft, beat)
      if (existing) {
        mergeBeatIntoExisting(existing, beat)
        driftDedup(drift, 'emotional beat', beat.id, existing.id)
        continue
      }
      draft.campaign.beats[beat.id] = beat
    }
  }

  rebuildOwnerThreadBackrefs(draft)

  return { nextState: draft, outcomes, deferredWrites: deferred, drift }
}

export function summarizePatchOutcome(result: ApplyPatchResult): {
  totalWrites: number
  accepted: number
  rejected: number
  deferred: number
  anchorMisses: number
} {
  const anchorMisses = result.drift.filter((f) => f.kind === 'anchor_reference_missing').length
  const accepted = result.outcomes.filter((o) => o.accepted).length
  const deferred = result.outcomes.filter((o) => o.deferred).length
  const rejected = result.outcomes.filter((o) => !o.accepted && !o.deferred).length
  return {
    totalWrites: result.outcomes.length,
    accepted,
    rejected,
    deferred,
    anchorMisses,
  }
}
