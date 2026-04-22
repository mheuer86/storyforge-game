// Group B: identity immutability. Under observe mode these fire as blocks
// without stopping the write; under enforce mode they'd reject.
//
// The Storyforge schema does not support rename or key_fact overwrite
// (update_npcs only has add_key_fact / add_signature_line / temp_load_*),
// so identity-mutation surfaces reduce to: update_npcs against an unknown
// name. That is really reference integrity and lands in Group C, but it
// cleanly expresses the identity concern ("you cannot rewrite an identity
// that doesn't exist"). Listed here for symmetry with the zettel taxonomy.

import type { FirewallRule } from '../../firewall'
import type { FirewallResult, GameState } from '../../types'

const npcNameSet = (state: GameState) =>
  new Set((state.world?.npcs ?? []).map(n => n.name.trim().toLowerCase()))

const npcUpdateUnknown: FirewallRule = {
  id: 'npc_update_unknown',
  appliesTo: (w) => w.type === 'npc_update',
  check: (w, state): FirewallResult | null => {
    const n = w.input as Record<string, unknown>
    const name = typeof n.name === 'string' ? n.name.trim().toLowerCase() : ''
    if (!name) return null
    const known = npcNameSet(state)
    if (known.has(name)) return null
    return {
      ruleId: 'npc_update_unknown',
      severity: 'block',
      rejectedField: 'name',
      suggestion: 'Cannot update an NPC that does not exist in state — use add_npcs for new characters, or correct the name',
      payloadExcerpt: n,
    }
  },
}

export const GROUP_B_RULES: FirewallRule[] = [
  npcUpdateUnknown,
]
