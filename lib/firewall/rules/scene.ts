// Group D: scene continuity. Two rules the spec identifies:
//
//   - scene_npc_teleport: a scene_snapshot update claims an NPC is present
//     whose last_seen doesn't match the current location AND no "entered_scene"
//     event was logged this turn.
//
//   - scene_unknown_location: set_scene to a location not previously
//     established without a transition narrative flag.
//
// Both rules require broader context than a single sub-write can see:
// scene_npc_teleport needs the whole commit_turn payload (to check sibling
// update_npcs writes that might update last_seen in the same turn), and
// scene_unknown_location needs a known-locations set that the schema does
// not currently persist.
//
// For Batch 1 we ship a conservative approximation of scene_npc_teleport:
// if a scene_snapshot string is emitted that names an NPC whose last_seen
// string does not include the current location name, warn. This yields
// false positives (any mention of an absent NPC counts) but catches
// genuine teleports too. Rule surfaces as warn to reflect that.
//
// scene_unknown_location is deferred to a future iteration pending a
// known-locations index on GameState.

import type { FirewallRule } from '../../firewall'
import type { FirewallResult, GameState } from '../../types'

const sceneSnapshotTeleport: FirewallRule = {
  id: 'scene_npc_teleport',
  appliesTo: (w) => w.type === 'scene_snapshot',
  check: (w, state): FirewallResult | null => {
    const snapshot = typeof w.input === 'string' ? w.input : ''
    if (!snapshot) return null
    const currentLoc = state.world?.currentLocation?.name?.toLowerCase() ?? ''
    if (!currentLoc) return null

    const suspects: string[] = []
    for (const npc of state.world?.npcs ?? []) {
      const name = npc.name
      if (!snapshot.toLowerCase().includes(name.toLowerCase())) continue
      const lastSeen = (npc.lastSeen ?? '').toLowerCase()
      if (lastSeen && !lastSeen.includes(currentLoc) && !currentLoc.includes(lastSeen)) {
        suspects.push(name)
      }
    }
    if (suspects.length === 0) return null
    return {
      ruleId: 'scene_npc_teleport',
      severity: 'warn',
      rejectedField: null,
      suggestion: `Snapshot references NPC(s) ${suspects.slice(0, 3).join(', ')} whose last_seen does not match current location — update last_seen in the same turn if they've moved`,
      payloadExcerpt: w.input,
    }
  },
}

export const GROUP_D_RULES: FirewallRule[] = [
  sceneSnapshotTeleport,
]
