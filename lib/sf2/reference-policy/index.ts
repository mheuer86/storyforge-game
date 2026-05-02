import {
  createPlaceholderNpcFromReference,
  findMatchingAnonymousNpc,
  findMatchingNpc,
  findMatchingSnapshotPlaceholder,
  findFactionByName,
  factionIdFromName,
  isAnonymousNpc,
  nextEntityId,
  resolveAgentId,
  resolveArcId,
  resolveBySynthesizedAgentId,
  resolvedBySynthesizedAgentId,
  resolveFactionId,
  resolveNpcId,
  resolveNpcReference,
  resolveTemporalAnchorTargetId,
  resolveThreadId,
} from '../resolution/entity-references'
import {
  SF2_TEMP_LOAD_TAGS,
  type Sf2Campaign,
  type Sf2DispositionTier,
  type Sf2EntityId,
  type Sf2Faction,
  type Sf2HeatLevel,
  type Sf2OwnerRef,
  type Sf2State,
  type Sf2TempLoadTag,
} from '../types'

export type Sf2ReferencePolicyMode = 'observe' | 'strict' | 'repair'

// Canonical entity-id format: lowercase prefix + underscore + identifier.
// The prefix gate catches fake-canonical strings like `unknown_young_man`.
export const CANONICAL_ID_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/

export const CANONICAL_PREFIXES = new Set([
  'npc',
  'faction',
  'thread',
  'decision',
  'promise',
  'clue',
  'arc',
  'location',
  'temporal',
  'doc',
  'beat',
  'pc',
])

export const FALLBACK_OWNER_FACTION_ID = 'faction_unknown'

export interface CanonicalIdViolation {
  field: string
  value: string
  reason: 'unrecognized_format' | 'unknown_prefix' | 'not_in_registry'
  registryHint?: 'pre_existing' | 'placeholder_eligible'
}

export interface CanonicalIdCheckResult {
  ok: boolean
  violations: CanonicalIdViolation[]
}

export interface SceneSnapshotReferencePolicyResult {
  idCheck: CanonicalIdCheckResult
  presentNpcIds?: Sf2EntityId[]
  currentInterlocutorIds?: Sf2EntityId[]
  placeholderCreations: Array<{ raw: string; placeholderId: Sf2EntityId }>
}

export interface ReferenceResolutionResult {
  id: Sf2EntityId | null
  drift?: {
    kind: 'anchor_reference_missing' | 'contradiction'
    detail: string
    entityId?: Sf2EntityId
  }
}

export function isCanonicalId(value: string, campaign?: Sf2Campaign): boolean {
  if (!value) return false
  if (value === 'pc') return true
  if (campaign?.npcs[value]) return true
  if (campaign?.factions[value]) return true
  if (!CANONICAL_ID_PATTERN.test(value)) return false
  const prefix = value.split('_', 1)[0]
  return CANONICAL_PREFIXES.has(prefix)
}

export function validateSnapshotIds(
  snapshot: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    nearbyEntityIds?: unknown
  },
  campaign: Sf2Campaign
): CanonicalIdCheckResult {
  const violations: CanonicalIdViolation[] = []

  validateArray('presentNpcIds', snapshot.presentNpcIds, campaign, violations, 'observe')
  validateArray('currentInterlocutorIds', snapshot.currentInterlocutorIds, campaign, violations, 'observe')
  validateArray('nearbyEntityIds', snapshot.nearbyEntityIds, campaign, violations, 'observe')

  return { ok: violations.length === 0, violations }
}

export function validateSnapshotIdsStrict(
  snapshot: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    nearbyEntityIds?: unknown
  },
  campaign: Sf2Campaign
): CanonicalIdCheckResult {
  const violations: CanonicalIdViolation[] = []

  validateArray('presentNpcIds', snapshot.presentNpcIds, campaign, violations, 'strict')
  validateArray('currentInterlocutorIds', snapshot.currentInterlocutorIds, campaign, violations, 'strict')
  validateArray('nearbyEntityIds', snapshot.nearbyEntityIds, campaign, violations, 'strict')

  return { ok: violations.length === 0, violations }
}

export function validateSnapshotIdsForMode(
  snapshot: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    nearbyEntityIds?: unknown
  },
  campaign: Sf2Campaign,
  mode: Sf2ReferencePolicyMode
): CanonicalIdCheckResult {
  return mode === 'strict'
    ? validateSnapshotIdsStrict(snapshot, campaign)
    : validateSnapshotIds(snapshot, campaign)
}

function validateArray(
  field: string,
  raw: unknown,
  campaign: Sf2Campaign,
  out: CanonicalIdViolation[],
  mode: Sf2ReferencePolicyMode
): void {
  if (raw === undefined || raw === null) return
  if (!Array.isArray(raw)) return
  raw.forEach((value, i) => {
    if (typeof value !== 'string') return
    const violation = classifyId(value, campaign, mode)
    if (violation) out.push({ field: `${field}[${i}]`, value, ...violation })
  })
}

function classifyId(
  value: string,
  campaign: Sf2Campaign,
  mode: Sf2ReferencePolicyMode
): Pick<CanonicalIdViolation, 'reason' | 'registryHint'> | null {
  if (value === 'pc') return null
  if (campaign.npcs[value] || campaign.factions[value]) return null
  if (!CANONICAL_ID_PATTERN.test(value)) return { reason: 'unrecognized_format' }
  const prefix = value.split('_', 1)[0]
  if (!CANONICAL_PREFIXES.has(prefix)) return { reason: 'unknown_prefix' }
  if (mode === 'strict') {
    return { reason: 'not_in_registry', registryHint: 'placeholder_eligible' }
  }
  return null
}

export function formatViolations(violations: CanonicalIdViolation[]): string {
  return violations
    .map((v) => `${v.field}="${v.value}" (${v.reason})`)
    .join('; ')
}

export function resolveSceneSnapshotReferences(
  state: Sf2State,
  input: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    currentPresentNpcIds?: Sf2EntityId[]
    mode?: Sf2ReferencePolicyMode
  }
): SceneSnapshotReferencePolicyResult {
  const mode = input.mode ?? 'observe'
  const idCheck = validateSnapshotIdsForMode(
    {
      presentNpcIds: input.presentNpcIds,
      currentInterlocutorIds: input.currentInterlocutorIds,
    },
    state.campaign,
    mode
  )
  const placeholderCreations: SceneSnapshotReferencePolicyResult['placeholderCreations'] = []
  const presentNpcIds = Array.isArray(input.presentNpcIds)
    ? resolveSceneNpcArray(state, input.presentNpcIds, {
        mode,
        allowPlaceholderCreation: mode !== 'strict',
        placeholderCreations,
      })
    : undefined

  const allowedPresent = presentNpcIds ?? input.currentPresentNpcIds ?? state.world.sceneSnapshot.presentNpcIds
  const currentInterlocutorIds = Array.isArray(input.currentInterlocutorIds)
    ? resolveSceneNpcArray(state, input.currentInterlocutorIds, {
        mode,
        allowPlaceholderCreation: false,
        placeholderCreations,
      }).filter((id) => allowedPresent.includes(id))
    : undefined

  return { idCheck, presentNpcIds, currentInterlocutorIds, placeholderCreations }
}

function resolveSceneNpcArray(
  state: Sf2State,
  rawValues: unknown[],
  opts: {
    mode: Sf2ReferencePolicyMode
    allowPlaceholderCreation: boolean
    placeholderCreations: SceneSnapshotReferencePolicyResult['placeholderCreations']
  }
): Sf2EntityId[] {
  const resolved: Sf2EntityId[] = []
  const seen = new Set<string>()
  for (const raw of rawValues) {
    if (typeof raw !== 'string') continue
    const id = resolveSceneNpcReference(state, raw, opts)
    if (!id || seen.has(id)) continue
    seen.add(id)
    resolved.push(id)
  }
  return resolved
}

function resolveSceneNpcReference(
  state: Sf2State,
  raw: string,
  opts: {
    mode: Sf2ReferencePolicyMode
    allowPlaceholderCreation: boolean
    placeholderCreations: SceneSnapshotReferencePolicyResult['placeholderCreations']
  }
): Sf2EntityId | null {
  const resolved = resolveNpcReference(state, raw)
  if (resolved) return resolved
  if (!opts.allowPlaceholderCreation) return null
  const placeholderId = createPlaceholderNpcFromReference(state, raw)
  if (placeholderId) {
    opts.placeholderCreations.push({ raw, placeholderId })
  }
  return placeholderId
}

export function resolvePatchAgentReference(
  state: Sf2State,
  raw: string,
  opts: { missingDetail?: string; synthesizedRecoveryDetail?: string } = {}
): ReferenceResolutionResult {
  const id = resolveAgentId(state, raw)
  if (!id) {
    return {
      id: null,
      drift: opts.missingDetail
        ? { kind: 'anchor_reference_missing', detail: opts.missingDetail }
        : undefined,
    }
  }
  if (opts.synthesizedRecoveryDetail && resolvedBySynthesizedAgentId(state, raw, id)) {
    return {
      id,
      drift: {
        kind: 'contradiction',
        detail: opts.synthesizedRecoveryDetail,
        entityId: id,
      },
    }
  }
  return { id }
}

export function resolvePatchNpcReference(state: Sf2State, raw: string): Sf2EntityId | null {
  return resolveNpcId(state, raw)
}

export function resolvePatchFactionReference(state: Sf2State, raw: string): Sf2EntityId | null {
  return resolveFactionId(state, raw)
}

export function resolvePatchThreadReference(state: Sf2State, raw: string): Sf2EntityId | null {
  return resolveThreadId(state, raw)
}

export function resolvePatchArcReference(state: Sf2State, raw: string): Sf2EntityId | null {
  return resolveArcId(state, raw)
}

export function resolvePatchTemporalAnchorTargetReference(
  state: Sf2State,
  raw: string
): Sf2EntityId | null {
  return resolveTemporalAnchorTargetId(state, raw)
}

export function resolvedPatchAgentBySynthesizedReference(
  state: Sf2State,
  raw: string,
  resolvedId: Sf2EntityId
): boolean {
  return resolvedBySynthesizedAgentId(state, raw, resolvedId)
}

export function resolveSynthesizedAgentReference(state: Sf2State, raw: string): Sf2EntityId | null {
  return resolveBySynthesizedAgentId(state, raw)
}

export function resolveAuthoredThreadOwnership(
  state: Sf2State,
  ownerHint: string
): { owner: Sf2OwnerRef | null; stakeholders: Sf2OwnerRef[] } {
  if (!ownerHint) return { owner: null, stakeholders: [] }
  const parts = ownerHint
    .split(/[,;/&]|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (parts.length <= 1) {
    return { owner: resolveAuthoredThreadOwner(state, ownerHint), stakeholders: [] }
  }

  const refs: Sf2OwnerRef[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    const ref = resolveAuthoredThreadOwner(state, p)
    if (!ref) continue
    const key = `${ref.kind}:${ref.id}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(ref)
  }
  if (refs.length === 0) return { owner: null, stakeholders: [] }
  return { owner: refs[0], stakeholders: refs.slice(1) }
}

export function resolveAuthoredThreadOwner(state: Sf2State, ownerHint: string): Sf2OwnerRef | null {
  if (!ownerHint) return null
  const hint = ownerHint.trim().toLowerCase()

  if (state.campaign.npcs[ownerHint]) return { kind: 'npc', id: ownerHint }
  if (state.campaign.factions[ownerHint]) return { kind: 'faction', id: ownerHint }

  const npc = Object.values(state.campaign.npcs).find(
    (n) => n.name.toLowerCase() === hint || hint.includes(n.name.toLowerCase())
  )
  if (npc) return { kind: 'npc', id: npc.id }

  const faction = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === hint || hint.includes(f.name.toLowerCase())
  )
  if (faction) return { kind: 'faction', id: faction.id }

  const affMatch = Object.values(state.campaign.npcs).find((n) => {
    const aff = (n.affiliation ?? '').toLowerCase()
    if (!aff) return false
    return aff === hint || hint.includes(aff) || aff.includes(hint)
  })
  if (affMatch?.affiliation) {
    const seeded = findFactionByName(state, affMatch.affiliation)
    if (seeded) return { kind: 'faction', id: seeded.id }
  }

  const autoId = factionIdFromName(ownerHint)
  if (!state.campaign.factions[autoId]) {
    state.campaign.factions[autoId] = {
      id: autoId,
      name: ownerHint,
      stance: 'neutral',
      heat: 'none',
      heatReasons: [],
      ownedThreadIds: [],
      retrievalCue: '',
    }
  }
  return { kind: 'faction', id: autoId }
}

export function repairOwnerRef(raw: unknown): Sf2OwnerRef {
  if (!isRecord(raw)) return { kind: 'faction', id: FALLBACK_OWNER_FACTION_ID }
  const kind = raw.kind === 'npc' || raw.kind === 'faction' ? raw.kind : 'faction'
  const id = typeof raw.id === 'string' && raw.id.length > 0 ? raw.id : FALLBACK_OWNER_FACTION_ID
  return { kind, id }
}

export function ensureFallbackOwnerFaction(state: Sf2State): void {
  if (state.campaign.factions[FALLBACK_OWNER_FACTION_ID]) return
  state.campaign.factions[FALLBACK_OWNER_FACTION_ID] = {
    id: FALLBACK_OWNER_FACTION_ID,
    name: 'Unknown faction',
    stance: 'neutral',
    heat: 'none',
    heatReasons: [],
    ownedThreadIds: [],
    retrievalCue: 'Fallback owner for legacy threads missing owner data.',
  }
}

export function ensureReferencedFallbackOwners(state: Sf2State): void {
  const owners = Object.values(state.campaign.threads).flatMap((thread) => [
    thread.owner,
    ...thread.stakeholders,
  ])
  if (owners.some((owner) => owner.kind === 'faction' && owner.id === FALLBACK_OWNER_FACTION_ID)) {
    ensureFallbackOwnerFaction(state)
  }
}

export {
  factionIdFromName,
  findFactionByName,
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
}

const DISPOSITION_SYNONYMS: Record<string, Sf2DispositionTier> = {
  hostile: 'hostile',
  angry: 'hostile',
  furious: 'hostile',
  enraged: 'hostile',
  antagonistic: 'hostile',
  vengeful: 'hostile',
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
  neutral: 'neutral',
  uncertain: 'neutral',
  ambivalent: 'neutral',
  resigned: 'neutral',
  dismissive: 'neutral',
  detached: 'neutral',
  cold: 'neutral',
  indifferent: 'neutral',
  favorable: 'favorable',
  friendly: 'favorable',
  warm: 'favorable',
  supportive: 'favorable',
  receptive: 'favorable',
  open: 'favorable',
  trusted: 'trusted',
  trusting: 'trusted',
  loyal: 'trusted',
  devoted: 'trusted',
}

export function coerceDisposition(
  raw: unknown,
  fallback: Sf2DispositionTier
): { tier: Sf2DispositionTier; coerced: boolean; rawValue: string | null } {
  if (typeof raw !== 'string') return { tier: fallback, coerced: false, rawValue: null }
  const key = raw.trim().toLowerCase().replace(/\s+/g, '_')
  if (!key) return { tier: fallback, coerced: false, rawValue: null }
  const mapped = DISPOSITION_SYNONYMS[key]
  if (mapped === undefined) return { tier: fallback, coerced: true, rawValue: raw }
  return { tier: mapped, coerced: key !== mapped, rawValue: raw }
}

const HEAT_SYNONYMS: Record<string, Sf2HeatLevel> = {
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

export function coerceHeat(
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

export function coerceTempLoadTag(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}
