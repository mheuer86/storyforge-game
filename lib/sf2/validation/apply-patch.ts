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
  checkFaction,
  checkNpcIdentity,
  checkPromise,
  checkTemporalAnchor,
  checkThread,
  type InvariantResult,
} from '../invariants'
import type {
  Sf2Arc,
  Sf2ArchivistAttachment,
  Sf2ArchivistCreate,
  Sf2ArchivistFlag,
  Sf2ArchivistPatch,
  Sf2ArchivistTransition,
  Sf2ArchivistUpdate,
  Sf2Clue,
  Sf2Decision,
  Sf2EntityId,
  Sf2Faction,
  Sf2Npc,
  Sf2Promise,
  Sf2PronounAnchor,
  Sf2State,
  Sf2TemporalAnchor,
  Sf2Thread,
} from '../types'

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

export interface DeferredWrite {
  kind: 'create' | 'update' | 'transition' | 'attachment'
  payload: unknown
  reason: string // why deferred (usually low confidence + field name)
}

// Name-or-id resolution. Archivist may emit either an existing id or a new name;
// we canonicalize here. Returns null when lookup fails (surfaces as a flag).
function resolveNpcId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (state.campaign.npcs[idOrName]) return idOrName
  const match = Object.values(state.campaign.npcs).find(
    (n) => n.name.toLowerCase() === idOrName.toLowerCase()
  )
  return match?.id ?? null
}

function resolveFactionId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (state.campaign.factions[idOrName]) return idOrName
  const match = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === idOrName.toLowerCase()
  )
  return match?.id ?? null
}

function resolveThreadId(state: Sf2State, idOrTitle: string): Sf2EntityId | null {
  if (state.campaign.threads[idOrTitle]) return idOrTitle
  const match = Object.values(state.campaign.threads).find(
    (t) => t.title.toLowerCase() === idOrTitle.toLowerCase()
  )
  return match?.id ?? null
}

function resolveTemporalAnchorTargetId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (!idOrName) return null
  if (state.campaign.threads[idOrName]) return idOrName
  if (state.campaign.decisions[idOrName]) return idOrName
  if (state.campaign.promises[idOrName]) return idOrName
  if (state.campaign.clues[idOrName]) return idOrName
  if (state.campaign.npcs[idOrName]) return idOrName
  if (state.campaign.factions[idOrName]) return idOrName
  return (
    resolveThreadId(state, idOrName) ??
    resolveNpcId(state, idOrName) ??
    resolveFactionId(state, idOrName)
  )
}

function normalizeNpcName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// Find an existing NPC that matches the proposed name closely enough to be
// treated as the same entity. Used for dedup on create. Matches:
//   1. exact normalized name match ("The Granary Watcher" ~ "granary watcher")
//   2. one name is a subset of the other's tokens (all proposed tokens appear
//      in existing name, or vice-versa — e.g. "Granary Watcher" ~ "the granary
//      man" ~ "watcher at the granary")
// Deliberately conservative: returns null unless confident. When ambiguous,
// caller creates fresh entity (better to have two than to collapse the wrong ones).
function findMatchingNpc(state: Sf2State, proposedName: string): Sf2Npc | null {
  const proposed = normalizeNpcName(proposedName)
  if (proposed.length < 3) return null // too short, names like "Os" would over-match
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null
  const kinshipTokens = new Set([
    'brother',
    'sister',
    'father',
    'mother',
    'parent',
    'parents',
    'son',
    'daughter',
    'child',
    'children',
    'spouse',
    'wife',
    'husband',
  ])

  for (const npc of Object.values(state.campaign.npcs)) {
    const existing = normalizeNpcName(npc.name)
    if (existing === proposed) return npc
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    if (existingTokens.size === 0) continue

    // Merge ONLY when proposed is a shortened form of existing ("Osh" when
    // "Osh Renner" is on file — prose often uses the short form). Do NOT
    // merge when existing is a shortened form of proposed ("Pol Sevi" when
    // "Sevi" is on file) — the fuller name is almost always a distinct
    // person, most commonly a family member sharing a surname. The Archivist
    // can emit an identity update later if it turns out to be the same
    // person; we'd rather split incorrectly than collapse two people.
    const proposedInExisting = [...proposedTokens].every((t) => existingTokens.has(t))
    if (!proposedInExisting) continue
    if (
      proposedTokens.size === 1 &&
      [...existingTokens].some((t) => kinshipTokens.has(t))
    ) {
      continue
    }

    // Require at least one distinctive token of length ≥ 4 to reduce false
    // positives (e.g. don't match "Os" into "Os Ren").
    const minToken = [...proposedTokens].find((t) => t.length >= 4)
    if (minToken) return npc
  }
  return null
}

function findMatchingSnapshotPlaceholder(
  state: Sf2State,
  proposedName: string,
  proposedCue: string
): Sf2Npc | null {
  const proposed = normalizeNpcName(`${proposedName} ${proposedCue}`)
  if (proposed.length < 3) return null
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null

  for (const npc of Object.values(state.campaign.npcs)) {
    const isPlaceholder =
      npc.retrievalCue.includes('placeholder from scene snapshot') ||
      npc.identity.keyFacts.some((fact) => fact.includes('Created from Narrator scene snapshot'))
    if (!isPlaceholder) continue

    const existing = normalizeNpcName(`${npc.id.replace(/^npc_/, '')} ${npc.name} ${npc.retrievalCue}`)
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    const overlap = [...proposedTokens].filter((t) => existingTokens.has(t))
    if (overlap.some((t) => t.length >= 4)) return npc
  }
  return null
}

function isAnonymousNpc(npc: Sf2Npc): boolean {
  const haystack = normalizeNpcName(`${npc.id} ${npc.name} ${npc.role} ${npc.retrievalCue}`)
  return [
    'unknown',
    'unnamed',
    'unidentified',
    'anonymous',
    'younger man',
    'young man',
    'girl',
    'boy',
    'elder',
  ].some((marker) => haystack.includes(marker))
}

function findMatchingAnonymousNpc(
  state: Sf2State,
  proposedName: string,
  proposedCue: string
): Sf2Npc | null {
  const proposed = normalizeNpcName(`${proposedName} ${proposedCue}`)
  if (proposed.length < 3) return null
  const anonymousMarkers = ['younger man', 'young man', 'girl', 'boy', 'elder']
  const proposedMarker = anonymousMarkers.find((marker) => proposed.includes(marker))
  if (!proposedMarker) return null
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null

  for (const npc of Object.values(state.campaign.npcs)) {
    if (!isAnonymousNpc(npc)) continue
    const existing = normalizeNpcName(`${npc.name} ${npc.role} ${npc.retrievalCue}`)
    if (!existing.includes(proposedMarker)) continue
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    const overlap = [...proposedTokens].filter((t) => existingTokens.has(t))
    if (overlap.some((t) => t.length >= 4)) return npc
  }
  return null
}

type EntityPrefix =
  | 'npc'
  | 'faction'
  | 'thread'
  | 'decision'
  | 'promise'
  | 'clue'
  | 'arc'
  | 'location'
  | 'temporal_anchor'

function getEntityRegistry(
  state: Sf2State,
  prefix: EntityPrefix
): Record<string, { id: string }> {
  switch (prefix) {
    case 'npc':
      return state.campaign.npcs as Record<string, { id: string }>
    case 'faction':
      return state.campaign.factions as Record<string, { id: string }>
    case 'thread':
      return state.campaign.threads as Record<string, { id: string }>
    case 'decision':
      return state.campaign.decisions as Record<string, { id: string }>
    case 'promise':
      return state.campaign.promises as Record<string, { id: string }>
    case 'clue':
      return state.campaign.clues as Record<string, { id: string }>
    case 'arc':
      return state.campaign.arcs as Record<string, { id: string }>
    case 'location':
      return state.campaign.locations as Record<string, { id: string }>
    case 'temporal_anchor':
      return state.campaign.temporalAnchors as Record<string, { id: string }>
  }
}

function nextEntityId(prefix: EntityPrefix, state: Sf2State): Sf2EntityId {
  const registry = getEntityRegistry(state, prefix)
  let i = Object.keys(registry).length
  let id = `${prefix}_${i}`
  while (registry[id]) {
    i += 1
    id = `${prefix}_${i}`
  }
  return id
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
        const thread: Sf2Thread = {
          id,
          title: String(p.title ?? ''),
          chapterCreated: chapter,
          category: 'thread',
          status: 'active',
          owner: { kind: ownerHint.kind, id: ownerId },
          stakeholders: [],
          tension: Number(p.tension ?? 5),
          resolutionCriteria: String(p.resolution_criteria ?? ''),
          failureMode: String(p.failure_mode ?? ''),
          retrievalCue: String(p.retrieval_cue ?? ''),
          loadBearing: Boolean(p.load_bearing),
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
  drift: Sf2ArchivistFlag[]
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
      const next: Sf2Npc = {
        ...prior,
        identity: {
          ...prior.identity,
          pronoun: npcPronounFromPayload(write.changes) ?? prior.identity.pronoun,
          age: npcAgeFromPayload(write.changes) ?? prior.identity.age,
        },
        disposition: dispUpdate.tier,
        tempLoad: (write.changes.temp_load as number | undefined) ?? prior.tempLoad,
        agenda: (write.changes.agenda as Sf2Npc['agenda']) ?? prior.agenda,
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
        agenda: (write.changes.agenda as Sf2Faction['agenda']) ?? prior.agenda,
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
      draft.campaign.threads[id] = {
        ...prior,
        tension: nextTension,
        status: (write.changes.status as Sf2Thread['status']) ?? prior.status,
        lastAdvancedTurn:
          (write.changes.last_advanced_turn as number | undefined) ?? prior.lastAdvancedTurn,
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
      draft.campaign.threads[id].status = write.toStatus as Sf2Thread['status']
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

export function applyArchivistPatch(
  state: Sf2State,
  patch: Sf2ArchivistPatch,
  chapter: number
): ApplyPatchResult {
  const draft: Sf2State = structuredClone(state)
  const outcomes: SubWriteOutcome[] = []
  const deferred: DeferredWrite[] = []
  const drift: Sf2ArchivistFlag[] = [...patch.flags]

  patch.creates.forEach((w, i) =>
    applyCreate(draft, w, `creates[${i}]`, outcomes, deferred, drift, patch.turnIndex, chapter)
  )
  patch.updates.forEach((w, i) =>
    applyUpdate(draft, w, `updates[${i}]`, outcomes, drift)
  )
  patch.transitions.forEach((w, i) =>
    applyTransition(draft, w, `transitions[${i}]`, outcomes)
  )
  patch.attachments.forEach((w, i) =>
    applyAttachment(draft, w, `attachments[${i}]`, outcomes, deferred, drift)
  )

  if (patch.sceneResult) {
    draft.chapter.sceneSummaries.push(patch.sceneResult)
  }

  // Archivist-driven ladder firing. The Archivist evaluated each unfired
  // step's triggerCondition against this turn's prose + state and returned
  // the ids of steps whose conditions read as satisfied. Flip fired=true
  // with firedAtTurn stamped for instrumentation.
  //
  // Hard cap: max 2 fires per turn. Beyond that, accept only the earliest-
  // indexed unfired steps and drift-flag the rest. Prevents cascade bugs
  // where the Archivist reads surface context as satisfying multiple triggers
  // at once.
  const MAX_LADDER_FIRES_PER_TURN = 2
  if (patch.ladderFires && patch.ladderFires.length > 0) {
    const proposed = patch.ladderFires.filter((id) =>
      draft.chapter.setup.pressureLadder.some((s) => s.id === id && !s.fired)
    )
    const accepted = proposed.slice(0, MAX_LADDER_FIRES_PER_TURN)
    const dropped = proposed.slice(MAX_LADDER_FIRES_PER_TURN)
    const acceptedSet = new Set(accepted)
    for (const step of draft.chapter.setup.pressureLadder) {
      if (step.fired) continue
      if (acceptedSet.has(step.id)) {
        step.fired = true
        step.firedAtTurn = patch.turnIndex
      }
    }
    for (const dropId of dropped) {
      drift.push({
        kind: 'contradiction',
        detail: `ladder fire cap: ${dropId} deferred (>${MAX_LADDER_FIRES_PER_TURN} proposed fires this turn)`,
        entityId: dropId,
      })
    }
  }

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
