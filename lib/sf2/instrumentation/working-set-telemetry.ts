import { buildSceneKernel } from '../scene-kernel/build'
import type {
  Sf2ArchivistPatch,
  Sf2EntityId,
  Sf2State,
  Sf2WorkingSet,
  Sf2WorkingSetTelemetry,
} from '../types'
import type { SubWriteOutcome } from '../validation/apply-patch'

const STUB_CHAR_CAP = 160
const APPROX_CHARS_PER_TOKEN = 4

// Minimum alias length to register as a match. Short tokens ("L", "P") would
// match every prose occurrence; pattern is intentionally too generous below
// the floor.
const MIN_ALIAS_LENGTH = 2

// Role nouns the narrator commonly uses without naming the entity. Cross-
// referenced against entities whose `affiliation`, NPC role tokens, or
// `agenda.pursuing` shape suggests the role. Bias is toward over-flagging
// (extra divergence) — it's safer to surface a possibly-missed reference
// than to silently conclude the assembler caught everything.
const ROLE_NOUNS = [
  'warden',
  'clerk',
  'captain',
  'witness',
  'commander',
  'officer',
  'auditor',
  'inspector',
  'archivist',
  'minister',
  'doctor',
  'priest',
  'preacher',
  'merchant',
  'guard',
] as const

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function aliasPattern(alias: string): RegExp | null {
  const trimmed = alias.trim()
  if (trimmed.length < MIN_ALIAS_LENGTH) return null
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(trimmed)}([^\\p{L}\\p{N}_]|$)`, 'iu')
}

function rolePattern(role: string): RegExp {
  return new RegExp(`\\bthe\\s+${escapeRegExp(role)}\\b`, 'i')
}

function entityRolesFor(state: Sf2State, entityId: Sf2EntityId): string[] {
  const npc = state.campaign.npcs[entityId]
  if (!npc) return []
  const tokens = new Set<string>()
  // Affiliation often carries the role noun ("Warden's Court" → "warden").
  for (const word of npc.affiliation.toLowerCase().split(/\s+/)) {
    if (word.length >= 4) tokens.add(word)
  }
  // Name-as-title pattern ("Warden Vrast" → "warden").
  const firstNameToken = npc.name.split(/\s+/)[0]?.toLowerCase()
  if (firstNameToken && firstNameToken.length >= 4) tokens.add(firstNameToken)
  return [...tokens]
}

function recentlyMentioned(state: Sf2State, lookback = 3): Set<Sf2EntityId> {
  const turns = state.history.turns.slice(-lookback)
  const ids = new Set<Sf2EntityId>()
  for (const t of turns) {
    if (t.archivistPatchApplied) {
      for (const u of t.archivistPatchApplied.updates) ids.add(u.entityId)
      for (const c of t.archivistPatchApplied.creates) {
        const id = c.payload.id
        if (typeof id === 'string') ids.add(id)
      }
    }
  }
  return ids
}

function scanProseByAlias(state: Sf2State, narratorProse: string): Sf2EntityId[] {
  const kernel = buildSceneKernel(state)
  const referenced = new Set<Sf2EntityId>()
  for (const [entityId, aliases] of Object.entries(kernel.aliasMap)) {
    for (const alias of aliases) {
      const pattern = aliasPattern(alias)
      if (pattern?.test(narratorProse)) {
        referenced.add(entityId)
        break
      }
    }
  }
  return [...referenced]
}

function scanProseByRole(
  state: Sf2State,
  narratorProse: string,
  alreadyMatched: Set<Sf2EntityId>
): Sf2EntityId[] {
  const matched = new Set<Sf2EntityId>()
  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  const recent = recentlyMentioned(state)

  for (const role of ROLE_NOUNS) {
    if (!rolePattern(role).test(narratorProse)) continue
    // Find entities whose role tokens include this role and which are
    // candidate references (present in scene OR recently mentioned).
    for (const npcId of [...present, ...recent]) {
      if (alreadyMatched.has(npcId) || matched.has(npcId)) continue
      const roles = entityRolesFor(state, npcId)
      if (roles.includes(role.toLowerCase())) {
        matched.add(npcId)
      }
    }
  }
  return [...matched]
}

function acceptedWriteRefs(outcomes: SubWriteOutcome[]): Set<string> {
  return new Set(outcomes.filter((o) => o.accepted).map((o) => o.writeRef))
}

function collectMutatedEntities(
  patch: Sf2ArchivistPatch,
  outcomes: SubWriteOutcome[]
): Sf2EntityId[] {
  const accepted = acceptedWriteRefs(outcomes)
  const mutated = new Set<Sf2EntityId>()

  patch.creates.forEach((write, i) => {
    if (!accepted.has(`creates[${i}]`)) return
    const id = write.payload.id
    if (typeof id === 'string' && id.length > 0) mutated.add(id)
  })
  patch.updates.forEach((write, i) => {
    if (accepted.has(`updates[${i}]`)) mutated.add(write.entityId)
  })
  patch.transitions.forEach((write, i) => {
    if (accepted.has(`transitions[${i}]`)) mutated.add(write.entityId)
  })

  return [...mutated]
}

function entityApproxChars(state: Sf2State, id: Sf2EntityId, bucket: 'full' | 'stub'): number {
  const c = state.campaign
  const entity =
    c.npcs[id] ??
    c.factions[id] ??
    c.threads[id] ??
    c.decisions[id] ??
    c.promises[id] ??
    c.clues[id] ??
    c.documents?.[id] ??
    c.arcs[id]
  if (!entity) return 0
  const jsonChars = JSON.stringify(entity).length
  return bucket === 'full' ? jsonChars : Math.min(jsonChars, STUB_CHAR_CAP)
}

function estimateTokens(ids: Sf2EntityId[], state: Sf2State, bucket: 'full' | 'stub'): number {
  const chars = ids.reduce((sum, id) => sum + entityApproxChars(state, id, bucket), 0)
  return Math.ceil(chars / APPROX_CHARS_PER_TOKEN)
}

function truncatedReasons(
  reasons: Record<Sf2EntityId, string[]>,
  reasonCharCap = 50
): Record<Sf2EntityId, string[]> {
  const out: Record<Sf2EntityId, string[]> = {}
  for (const [id, list] of Object.entries(reasons)) {
    out[id] = list.map((r) => (r.length > reasonCharCap ? r.slice(0, reasonCharCap - 1) + '…' : r))
  }
  return out
}

export function recordTurnTelemetry(
  state: Sf2State,
  workingSet: Sf2WorkingSet,
  narratorProse: string,
  archivistPatch: Sf2ArchivistPatch,
  outcomes: SubWriteOutcome[]
): Sf2WorkingSetTelemetry {
  const aliasMatches = scanProseByAlias(state, narratorProse)
  const aliasMatchSet = new Set(aliasMatches)
  const roleMatches = scanProseByRole(state, narratorProse, aliasMatchSet)
  const referencedInProse = [...new Set([...aliasMatches, ...roleMatches])]
  const mutatedByArchivist = collectMutatedEntities(archivistPatch, outcomes)

  const referencedSet = new Set(referencedInProse)
  const mutatedSet = new Set(mutatedByArchivist)
  const stubSet = new Set(workingSet.stubEntityIds)
  // Capture both explicit exclusion (entity scored below threshold) AND
  // implicit exclusion (entity never even became a candidate). The most
  // common divergence is the latter — an off-radar entity that prose
  // references — so we treat anything not in full or stub as excluded.
  const includedSet = new Set([
    ...workingSet.fullEntityIds,
    ...workingSet.stubEntityIds,
  ])

  return {
    turn: workingSet.computedAtTurn,
    chapter: state.meta.currentChapter,
    fullCount: workingSet.fullEntityIds.length,
    stubCount: workingSet.stubEntityIds.length,
    excludedCount: workingSet.excludedEntityIds.length,
    fullTokensApprox: estimateTokens(workingSet.fullEntityIds, state, 'full'),
    stubTokensApprox: estimateTokens(workingSet.stubEntityIds, state, 'stub'),
    referencedInProse,
    referencedByAlias: aliasMatches,
    referencedByRole: roleMatches,
    mutatedByArchivist,
    excludedButReferenced: referencedInProse.filter((id) => !includedSet.has(id)),
    fullButUnreferenced: workingSet.fullEntityIds.filter(
      (id) => !referencedSet.has(id) && !mutatedSet.has(id)
    ),
    stubButMutated: mutatedByArchivist.filter((id) => stubSet.has(id)),
    reasonsByEntityId: truncatedReasons(workingSet.reasonsByEntityId),
  }
}
