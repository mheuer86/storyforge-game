import { resolvePlayerAction } from '../action-resolver/resolve'
import type { Sf2EntityId, Sf2ResolvedPlayerAction, Sf2State } from '../types'

export function resolvePlayerInputThreadTargets(
  state: Sf2State,
  playerInput: string
): {
  action: Sf2ResolvedPlayerAction
  targetThreadIds: Sf2EntityId[]
} {
  const action = resolvePlayerAction(state, playerInput)
  return {
    action,
    targetThreadIds: resolveTargetThreadIds(state, [
      ...action.targetEntityIds,
      ...action.subjectEntityIds,
    ]),
  }
}

export function resolveTargetThreadIds(
  state: Sf2State,
  entityIds: Sf2EntityId[]
): Sf2EntityId[] {
  const referenced = new Set(entityIds)
  const threads = new Set<Sf2EntityId>()
  const activeThreadIds = new Set(state.chapter.setup.activeThreadIds)

  for (const entityId of referenced) {
    for (const threadId of state.campaign.npcs[entityId]?.ownedThreadIds ?? []) {
      if (activeThreadIds.has(threadId)) threads.add(threadId)
    }
    for (const threadId of state.campaign.factions[entityId]?.ownedThreadIds ?? []) {
      if (activeThreadIds.has(threadId)) threads.add(threadId)
    }
  }

  for (const threadId of state.chapter.setup.activeThreadIds) {
    const thread = state.campaign.threads[threadId]
    if (!thread) continue
    if (referenced.has(thread.owner.id)) {
      threads.add(threadId)
      continue
    }
    if (thread.stakeholders.some((stakeholder) => referenced.has(stakeholder.id))) {
      threads.add(threadId)
    }
  }
  return [...threads]
}
