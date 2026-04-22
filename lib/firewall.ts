// ============================================================
// Canon Firewall — Batch 1 (observe-only)
//
// Validation rules run as pure predicates against a write payload
// and the current game state. In 'observe' mode, the firewall never
// rejects: it emits observations and structured RejectionRecord
// objects so Batch 2 can flip the switch to 'enforce' with a single
// config change.
// ============================================================

import type { GameState, FirewallResult, RejectionRecord, InstrumentActor } from './types'
import { GROUP_A_RULES } from './firewall/rules/required'
import { GROUP_B_RULES } from './firewall/rules/identity'
import { GROUP_C_RULES } from './firewall/rules/reference'
import { GROUP_D_RULES } from './firewall/rules/scene'

export type FirewallMode = 'observe' | 'enforce'
export const FIREWALL_MODE: FirewallMode = 'observe'

export interface FirewallWrite {
  type: string                 // e.g. 'thread_create'
  actor: InstrumentActor
  entity: string | null
  input: unknown               // the sub-write payload (not the full commit_turn)
}

export interface FirewallRule {
  id: string
  appliesTo: (write: FirewallWrite) => boolean
  check: (write: FirewallWrite, state: GameState) => FirewallResult | null
}

const ALL_RULES: FirewallRule[] = [
  ...GROUP_A_RULES,
  ...GROUP_B_RULES,
  ...GROUP_C_RULES,
  ...GROUP_D_RULES,
]

export function runFirewall(write: FirewallWrite, state: GameState): FirewallResult[] {
  const results: FirewallResult[] = []
  for (const rule of ALL_RULES) {
    if (!rule.appliesTo(write)) continue
    try {
      const r = rule.check(write, state)
      if (r) results.push(r)
    } catch {
      // Rule crashed — skip it, don't break the turn. A separate FIREWALL_RULE_ERROR
      // channel is reserved for later if this ever fires in practice.
    }
  }
  return results
}

// ── Rejection record construction ──────────────────────────────

export function buildRejectionRecord(
  write: FirewallWrite,
  result: FirewallResult,
  ctx: { turn: number; chapter: number; genre: string },
  seq: number,
): RejectionRecord {
  return {
    id: `rej_${ctx.chapter}_${ctx.turn}_${seq}`,
    timestamp: new Date().toISOString(),
    turn: ctx.turn,
    chapter: ctx.chapter,
    genre: ctx.genre,
    actor: write.actor,
    write_type: write.type,
    entity: write.entity,
    attempted_payload: truncatePayload(write.input),
    rule_violated: result.ruleId,
    severity: result.severity,
    rejected_field: result.rejectedField,
    suggestion: result.suggestion,
    fallback_used: null, // observe mode has no fallbacks
  }
}

function truncatePayload(p: unknown): unknown {
  try {
    const seen = new WeakSet()
    return JSON.parse(JSON.stringify(p, (_k, v) => {
      if (typeof v === 'string' && v.length > 200) return v.slice(0, 200) + '...'
      if (v && typeof v === 'object') {
        if (seen.has(v as object)) return '[CIRCULAR]'
        seen.add(v as object)
        const str = JSON.stringify(v)
        if (str.length > 2000) return '[TRUNCATED]'
      }
      return v
    }))
  } catch {
    return '[UNSERIALIZABLE]'
  }
}
