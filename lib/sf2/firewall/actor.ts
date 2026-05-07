// Actor × write-type firewall. Dev/test assertion, production no-op signal.
// The contract remains cheap in production and loud during local validation.

import type { Sf2Actor, Sf2ObservedWrite, Sf2WriteKind } from '../types'
import { NARRATOR_MECHANICAL_EFFECT_KINDS } from '../narrator/tools'

// What each actor is allowed to write. Any write outside its allowed set is
// illegal. In dev/test, illegal writes throw immediately; production callers
// still receive the reason as telemetry without paying for a ring buffer.
const ALLOWED: Record<Sf2Actor, ReadonlySet<Sf2WriteKind>> = {
  narrator: new Set<Sf2WriteKind>([
    ...NARRATOR_MECHANICAL_EFFECT_KINDS,
    'pending_check',
    'suggested_actions',
    'narrator_annotation',
  ]),
  archivist: new Set<Sf2WriteKind>([
    'create_entity',
    'update_entity',
    'entity_transition',
    'anchor_attachment',
    'pacing_classification',
    'drift_flag',
  ]),
  author: new Set<Sf2WriteKind>(['chapter_setup', 'chapter_meaning']),
  code: new Set<Sf2WriteKind>([
    'face_shift',
    'ladder_fire',
    'working_set_compute',
    'cohesion_recompute',
    'drift_flag',
  ]),
  unknown: new Set<Sf2WriteKind>(),
}

export interface FirewallDecision {
  write: Sf2ObservedWrite
  permitted: boolean
  reason?: string // populated when !allowed
}

export function evaluateWrite(write: Sf2ObservedWrite): FirewallDecision {
  const set = ALLOWED[write.actor]
  const permitted = set?.has(write.kind) ?? false
  if (permitted) {
    return { write, permitted: true }
  }
  return {
    write,
    permitted: false,
    reason: `actor ${write.actor} is not permitted to emit ${write.kind}`,
  }
}

export function recordObservation(write: Sf2ObservedWrite): FirewallDecision {
  const decision = evaluateWrite(write)
  if (!decision.permitted && process.env.NODE_ENV !== 'production') {
    throw new Error(decision.reason)
  }
  return decision
}
