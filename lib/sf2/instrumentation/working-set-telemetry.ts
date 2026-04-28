import { buildSceneKernel } from '../scene-kernel/build'
import type {
  Sf2ArchivistPatch,
  Sf2EntityId,
  Sf2State,
  Sf2WorkingSet,
  Sf2WorkingSetTelemetry,
} from '../types'
import type { SubWriteOutcome } from '../validation/apply-patch'

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function aliasPattern(alias: string): RegExp | null {
  const trimmed = alias.trim()
  if (trimmed.length < 2) return null
  return new RegExp(`(^|[^\\p{L}\\p{N}_])${escapeRegExp(trimmed)}([^\\p{L}\\p{N}_]|$)`, 'iu')
}

function scanProseForReferences(state: Sf2State, narratorProse: string): Sf2EntityId[] {
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
  return bucket === 'full' ? jsonChars : Math.min(jsonChars, 160)
}

function estimateTokens(ids: Sf2EntityId[], state: Sf2State, bucket: 'full' | 'stub'): number {
  const chars = ids.reduce((sum, id) => sum + entityApproxChars(state, id, bucket), 0)
  return Math.ceil(chars / 4)
}

export function recordTurnTelemetry(
  state: Sf2State,
  workingSet: Sf2WorkingSet,
  narratorProse: string,
  archivistPatch: Sf2ArchivistPatch,
  outcomes: SubWriteOutcome[]
): Sf2WorkingSetTelemetry {
  const referencedInProse = scanProseForReferences(state, narratorProse)
  const mutatedByArchivist = collectMutatedEntities(archivistPatch, outcomes)

  const referencedSet = new Set(referencedInProse)
  const mutatedSet = new Set(mutatedByArchivist)
  const stubSet = new Set(workingSet.stubEntityIds)
  const excludedSet = new Set(workingSet.excludedEntityIds)

  return {
    turn: workingSet.computedAtTurn,
    chapter: state.meta.currentChapter,
    fullCount: workingSet.fullEntityIds.length,
    stubCount: workingSet.stubEntityIds.length,
    excludedCount: workingSet.excludedEntityIds.length,
    fullTokensApprox: estimateTokens(workingSet.fullEntityIds, state, 'full'),
    stubTokensApprox: estimateTokens(workingSet.stubEntityIds, state, 'stub'),
    referencedInProse,
    mutatedByArchivist,
    excludedButReferenced: referencedInProse.filter((id) => excludedSet.has(id)),
    fullButUnreferenced: workingSet.fullEntityIds.filter(
      (id) => !referencedSet.has(id) && !mutatedSet.has(id)
    ),
    stubButMutated: mutatedByArchivist.filter((id) => stubSet.has(id)),
    reasonsByEntityId: workingSet.reasonsByEntityId,
  }
}
