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
} from '../resolution/entity-references'
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
  Sf2Decision,
  Sf2Document,
  Sf2DocumentParty,
  Sf2DocumentStatus,
  Sf2DocumentType,
  Sf2EntityId,
  Sf2Faction,
  Sf2Npc,
  Sf2Promise,
  Sf2PronounAnchor,
  Sf2State,
  Sf2TempLoadTag,
  Sf2TemporalAnchor,
  Sf2Thread,
} from '../types'
import { DOCUMENT_VALID_TRANSITIONS, SF2_TEMP_LOAD_TAGS } from '../types'

const RESOLVED_THREAD_STATUSES = new Set<Sf2Thread['status']>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
])

const CHAPTER_PRESSURE_CAP = 10

function clampPressure(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(CHAPTER_PRESSURE_CAP, Math.round(value)))
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

// Coerce a free-form disposition string (Archivist sometimes emits "closed_off",
// "resigned", "fearful", etc.) to the nearest valid Sf2DispositionTier. Returns
// { tier, coerced } so the caller can log drift when the input wasn't already
// a valid tier. Keeps the 5-tier enum stable; captures the observation without
// widening the schema.
const DISPOSITION_SYNONYMS: Record<string, Sf2Npc['disposition']> = {
  // hostile
  hostile: 'hostile',
  angry: 'hostile',
  furious: 'hostile',
  enraged: 'hostile',
  antagonistic: 'hostile',
  vengeful: 'hostile',
  // wary
  wary: 'wary',
  cautious: 'wary',
  guarded: 'wary',
  suspicious: 'wary',
  reserved: 'wary',
  closed_off: 'wary',
  'closed-off': 'wary',
  closedoff: 'wary',
  withholding: 'wary',
  defensive: 'wary',
  fearful: 'wary',
  afraid: 'wary',
  frightened: 'wary',
  uneasy: 'wary',
  // neutral
  neutral: 'neutral',
  uncertain: 'neutral',
  ambivalent: 'neutral',
  resigned: 'neutral',
  dismissive: 'neutral',
  detached: 'neutral',
  cold: 'neutral',
  indifferent: 'neutral',
  // favorable
  favorable: 'favorable',
  friendly: 'favorable',
  warm: 'favorable',
  supportive: 'favorable',
  receptive: 'favorable',
  open: 'favorable',
  // trusted
  trusted: 'trusted',
  trusting: 'trusted',
  loyal: 'trusted',
  devoted: 'trusted',
}

function coerceDisposition(
  raw: unknown,
  fallback: Sf2Npc['disposition']
): { tier: Sf2Npc['disposition']; coerced: boolean; rawValue: string | null } {
  if (typeof raw !== 'string') return { tier: fallback, coerced: false, rawValue: null }
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (!key) return { tier: fallback, coerced: false, rawValue: null }
  const mapped = DISPOSITION_SYNONYMS[key]
  if (mapped === undefined) {
    // Unknown string — fall back but log the drift.
    return { tier: fallback, coerced: true, rawValue: raw }
  }
  return { tier: mapped, coerced: key !== mapped, rawValue: raw }
}

// Faction heat — same shape, different enum. Narrower synonyms since heat is
// quantitative (none → boiling scale), not relational like disposition.
const HEAT_SYNONYMS: Record<string, Sf2Faction['heat']> = {
  none: 'none',
  cool: 'none',
  calm: 'none',
  low: 'low',
  mild: 'low',
  simmering: 'low',
  medium: 'medium',
  moderate: 'medium',
  rising: 'medium',
  high: 'high',
  hot: 'high',
  acute: 'high',
  boiling: 'boiling',
  critical: 'boiling',
  overt: 'boiling',
}

function coerceHeat(
  raw: unknown,
  fallback: Sf2Faction['heat']
): { level: Sf2Faction['heat']; coerced: boolean; rawValue: string | null } {
  if (typeof raw !== 'string') return { level: fallback, coerced: false, rawValue: null }
  const key = raw.trim().toLowerCase()
  if (!key) return { level: fallback, coerced: false, rawValue: null }
  const mapped = HEAT_SYNONYMS[key]
  if (mapped === undefined) return { level: fallback, coerced: true, rawValue: raw }
  return { level: mapped, coerced: key !== mapped, rawValue: raw }
}

// Returns the coerced tag, undefined for explicit clear (empty string), or
// `'unset'` to mean "no field provided." NPC disposition re-assertions clear
// the transient tag; unrelated updates keep the prior value.
function coerceTempLoadTag(
  raw: unknown
): { value: Sf2TempLoadTag | undefined; status: 'unset' | 'cleared' | 'set' | 'invalid'; rawValue: string | null } {
  if (raw === undefined || raw === null) return { value: undefined, status: 'unset', rawValue: null }
  if (typeof raw !== 'string') return { value: undefined, status: 'invalid', rawValue: String(raw) }
  const trimmed = raw.trim()
  if (trimmed === '') return { value: undefined, status: 'cleared', rawValue: raw }
  const key = trimmed.toLowerCase().replace(/\s+/g, '_')
  const match = (SF2_TEMP_LOAD_TAGS as readonly string[]).includes(key)
    ? (key as Sf2TempLoadTag)
    : undefined
  if (!match) return { value: undefined, status: 'invalid', rawValue: raw }
  return { value: match, status: 'set', rawValue: raw }
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
  chapter: number
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
        const proposedCue = String(p.retrieval_cue ?? '')
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
          isAnonymousNpc(draft.campaign.npcs[supersedesId])
            ? draft.campaign.npcs[supersedesId]
            : null
        const existingMatch =
          supersedeTarget ||
          findMatchingAnonymousNpc(draft, proposedName, proposedCue) ||
          findMatchingNpc(draft, proposedName) ||
          findMatchingSnapshotPlaceholder(draft, proposedName, proposedCue)
        if (existingMatch) {
          // Merge: bump lastSeenTurn, extend retrieval cue if shorter, capture
          // a drift flag so the behavior is visible in instrumentation.
          existingMatch.lastSeenTurn = turnIndex
          if (proposedName && isAnonymousNpc(existingMatch)) {
            existingMatch.name = proposedName
          }
          if (proposedCue && (
            !existingMatch.retrievalCue ||
            existingMatch.retrievalCue.includes('placeholder from scene snapshot')
            || isAnonymousNpc(existingMatch)
          )) {
            existingMatch.retrievalCue = proposedCue
          }
          if (p.affiliation) existingMatch.affiliation = String(p.affiliation)
          if (p.role) existingMatch.role = p.role as Sf2Npc['role']
          const keyFacts = Array.isArray(p.key_facts) ? (p.key_facts as string[]).slice(0, 3) : []
          if (keyFacts.length > 0) existingMatch.identity.keyFacts = keyFacts
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
            kind: 'identity_drift',
            detail: `dedup: would-be-create "${proposedName}" merged into existing ${existingMatch.id} ("${existingMatch.name}")`,
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
          retrievalCue: String(p.retrieval_cue ?? ''),
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
        const faction: Sf2Faction = {
          id,
          name: String(p.name ?? ''),
          stance: coerceDisposition(p.stance, 'neutral').tier,
          heat: coerceHeat(p.heat, 'none').level,
          heatReasons: Array.isArray(p.heat_reasons) ? (p.heat_reasons as string[]) : [],
          ownedThreadIds: [],
          retrievalCue: String(p.retrieval_cue ?? ''),
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
        const id = (p.id as string | undefined) ?? nextEntityId('thread', draft)
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
          retrievalCue: String(p.retrieval_cue ?? ''),
          loadBearing: shouldLoadBear,
          successorToThreadId: predecessorThreadId ?? undefined,
          chapterDriverKind: predecessorThreadId ? 'successor' : undefined,
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
        if (ownerHint.kind === 'npc') {
          draft.campaign.npcs[ownerId].ownedThreadIds.push(id)
        } else {
          draft.campaign.factions[ownerId].ownedThreadIds.push(id)
        }
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
        const decision: Sf2Decision = {
          id,
          title: String(p.title ?? p.summary ?? ''),
          chapterCreated: chapter,
          category: 'decision',
          retrievalCue: String(p.retrieval_cue ?? p.summary ?? ''),
          status: 'active',
          anchoredTo: threadIds,
          summary: String(p.summary ?? ''),
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
        const promise: Sf2Promise = {
          id,
          title: String(p.title ?? p.obligation ?? ''),
          chapterCreated: chapter,
          category: 'promise',
          retrievalCue: String(p.retrieval_cue ?? p.obligation ?? ''),
          status: 'active',
          anchoredTo: threadIds,
          owner: { kind: ownerHint.kind, id: ownerId },
          obligation: String(p.obligation ?? ''),
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
        const clue: Sf2Clue = {
          id,
          title: String(p.title ?? p.content ?? '').slice(0, 80),
          chapterCreated: chapter,
          category: 'clue',
          retrievalCue: String(p.retrieval_cue ?? p.content ?? ''),
          status: threadIds.length > 0 ? 'attached' : 'floating',
          anchoredTo: threadIds,
          content: String(p.content ?? ''),
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
        const arc: Sf2Arc = {
          id,
          title: String(p.title ?? ''),
          chapterCreated: chapter,
          category: 'arc',
          retrievalCue: String(p.retrieval_cue ?? ''),
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
        draft.campaign.locations[id] = {
          id,
          name: String(p.name ?? ''),
          description: String(p.description ?? ''),
          atmosphericConditions: Array.isArray(p.atmospheric_conditions)
            ? (p.atmospheric_conditions as string[])
            : undefined,
          locked: typeof p.locked === 'boolean' ? p.locked : undefined,
          chapterCreated: chapter,
        }
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
        const anchor: Sf2TemporalAnchor = {
          id,
          title: String(p.title ?? label),
          chapterCreated: chapter,
          category: 'temporal_anchor',
          kind: normalizeTemporalAnchorKind(p.kind),
          status: normalizeTemporalAnchorStatus(p.status),
          label,
          anchorText: String(p.anchor_text ?? p.anchorText ?? p.when ?? ''),
          anchoredTo,
          retrievalCue: String(p.retrieval_cue ?? p.anchor_text ?? p.when ?? label),
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
          retrievalCue: String(p.retrieval_cue ?? authorizes ?? title),
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
      const nextStatus = (write.changes.status as Sf2Thread['status']) ?? prior.status
      draft.campaign.threads[id] = {
        ...prior,
        tension: nextTension,
        tensionHistory: nextHistory,
        peakTension: Math.max(prior.peakTension ?? prior.tension, nextTension),
        status: nextStatus,
        lastAdvancedTurn: tensionChanged
          ? explicitLastAdvanced ?? turnIndex
          : explicitLastAdvanced ?? prior.lastAdvancedTurn,
      }
      if (nextStatus === 'active') {
        syncActiveThreadIntoChapterRuntime(draft, id, {
          loadBearing: prior.loadBearing,
          successor: Boolean(prior.successorToThreadId),
        })
      } else if (RESOLVED_THREAD_STATUSES.has(nextStatus)) {
        draft.chapter.setup.activeThreadIds = draft.chapter.setup.activeThreadIds.filter((tid) => tid !== id)
        delete draft.chapter.setup.threadPressure?.[id]
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
      const anchoredAppend = write.changes.anchored_to as string[] | undefined
      if (nextContent !== undefined && nextContent.trim().length > 0) {
        clue.content = nextContent
      }
      if (nextCue !== undefined && nextCue.trim().length > 0) {
        clue.retrievalCue = nextCue
      }
      if (Array.isArray(anchoredAppend) && anchoredAppend.length > 0) {
        const resolved = anchoredAppend
          .map((r) => resolveThreadId(draft, r))
          .filter((x): x is string => Boolean(x))
        if (resolved.length > 0) {
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
      const toStatus = write.toStatus as Sf2Thread['status']
      draft.campaign.threads[id].status = toStatus
      if (RESOLVED_THREAD_STATUSES.has(toStatus)) {
        draft.campaign.threads[id].tension = 0
        draft.chapter.setup.activeThreadIds = draft.chapter.setup.activeThreadIds.filter((tid) => tid !== id)
        delete draft.chapter.setup.threadPressure?.[id]
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
      c.anchoredTo = Array.from(new Set([...c.anchoredTo, ...resolved]))
      c.status = 'attached'
      draft.campaign.floatingClueIds = draft.campaign.floatingClueIds.filter((x) => x !== c.id)
      outcomes.push({ accepted: true, writeRef: ref, confidenceTier: write.confidence })
      return
    }
  }
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
    retrievalCue: add.text,
    text: add.text,
    participants,
    anchoredTo,
    emotionalTags: add.emotionalTags,
    salience: add.salience,
    turn,
  }
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

  patch.creates.forEach((w, i) =>
    applyCreate(draft, w, `creates[${i}]`, outcomes, deferred, drift, patch.turnIndex, chapter)
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
      draft.campaign.beats[beat.id] = beat
    }
  }

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
