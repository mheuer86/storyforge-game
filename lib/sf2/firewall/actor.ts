// Actor × write-type firewall. Observe mode in Stage 1: log, do not block.
// Enforcement flips after one Ch1 playthrough of zero legitimate rejections.

import type { Sf2Actor, Sf2ObservedWrite, Sf2WriteKind } from '../types'

export type FirewallMode = 'observe' | 'enforce'

// Default mode: observe. Flip via setFirewallMode('enforce') after Stage 1 gate.
let currentMode: FirewallMode = 'observe'

export function setFirewallMode(mode: FirewallMode): void {
  currentMode = mode
}

export function getFirewallMode(): FirewallMode {
  return currentMode
}

// What each actor is allowed to write. Any write outside its allowed set is
// illegal — logged in observe mode, rejected in enforce mode.
const ALLOWED: Record<Sf2Actor, ReadonlySet<Sf2WriteKind>> = {
  narrator: new Set<Sf2WriteKind>([
    'hp_delta',
    'credits_delta',
    'inventory_use',
    'combat',
    'set_location',
    'scene_end',
    'set_scene_snapshot',
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
  ]),
  unknown: new Set<Sf2WriteKind>(),
}

export interface FirewallDecision {
  write: Sf2ObservedWrite
  allowed: boolean
  mode: FirewallMode
  reason?: string // populated when !allowed
}

export function evaluateWrite(write: Sf2ObservedWrite): FirewallDecision {
  const set = ALLOWED[write.actor]
  const permitted = set?.has(write.kind) ?? false
  if (permitted) {
    return { write, allowed: true, mode: currentMode }
  }
  return {
    write,
    allowed: currentMode === 'observe', // observe mode: allowed but flagged
    mode: currentMode,
    reason: `actor ${write.actor} is not permitted to emit ${write.kind}`,
  }
}

// Sinks: wire into your existing instrumentation. Stage 1 logs to console +
// appends to in-memory ring for the playthrough. Enforcement mode will reject
// at the handler layer in Stage 2.
export interface FirewallSink {
  recordDecision(decision: FirewallDecision): void
}

class MemoryFirewallSink implements FirewallSink {
  private ring: FirewallDecision[] = []
  private readonly cap = 1000

  recordDecision(decision: FirewallDecision): void {
    this.ring.push(decision)
    if (this.ring.length > this.cap) this.ring.shift()
    if (!decision.allowed || decision.reason) {
      // eslint-disable-next-line no-console
      console.warn(
        '[sf2/firewall] observation',
        JSON.stringify({
          mode: decision.mode,
          actor: decision.write.actor,
          kind: decision.write.kind,
          reason: decision.reason,
          turnIndex: decision.write.turnIndex,
          chapter: decision.write.chapter,
          entityId: decision.write.entityId,
        })
      )
    }
  }

  snapshot(): FirewallDecision[] {
    return this.ring.slice()
  }
}

export const defaultFirewallSink: MemoryFirewallSink = new MemoryFirewallSink()

export function recordObservation(
  write: Sf2ObservedWrite,
  sink: FirewallSink = defaultFirewallSink
): FirewallDecision {
  const decision = evaluateWrite(write)
  sink.recordDecision(decision)
  return decision
}
