import type { Sf2State, Sf2Thread } from './types'

const THREAD_OWNER_BACKREF_STATUSES = new Set<Sf2Thread['status']>([
  'active',
  'deferred',
])

export function rebuildOwnerThreadBackrefs(state: Sf2State): void {
  for (const npc of Object.values(state.campaign.npcs)) {
    npc.ownedThreadIds = []
  }
  for (const faction of Object.values(state.campaign.factions)) {
    faction.ownedThreadIds = []
  }

  for (const thread of Object.values(state.campaign.threads)) {
    if (!THREAD_OWNER_BACKREF_STATUSES.has(thread.status)) continue
    const owner =
      thread.owner.kind === 'npc'
        ? state.campaign.npcs[thread.owner.id]
        : state.campaign.factions[thread.owner.id]
    if (!owner) continue
    owner.ownedThreadIds.push(thread.id)
  }

  for (const npc of Object.values(state.campaign.npcs)) {
    npc.ownedThreadIds = uniqueSorted(npc.ownedThreadIds)
  }
  for (const faction of Object.values(state.campaign.factions)) {
    faction.ownedThreadIds = uniqueSorted(faction.ownedThreadIds)
  }
}

export function syncArcPlanStatusFromArcEntity(state: Sf2State): boolean {
  const plan = state.campaign.arcPlan
  if (!plan) return false
  const arc = state.campaign.arcs[plan.id]
  if (!arc || arc.status === plan.status) return false
  plan.status = arc.status
  return true
}

function uniqueSorted(values: string[]): string[] {
  return Array.from(new Set(values)).sort()
}
