// Canonical ID enforcement for scene-kernel writes. The PRD's Fix 4 requires
// that all persistent and scene-kernel references use canonical IDs only —
// display aliases ("grey-coat", "mirren") belong in aliasMap, not in any of
// the cast / interlocutor / anchor arrays.
//
// Phase A scope: validate the Narrator's set_scene_snapshot mechanical effect
// before it lands in state.world.sceneSnapshot. The existing applyMechanicalEffectLocally
// path resolves display names to canonical IDs OR creates placeholder NPCs;
// this validator surfaces the rejection signal so callers can drift-flag and
// retain the prior snapshot when the Narrator emits unrecognized free-text IDs.
//
// Out of scope this phase: AliasMap auto-mining from prose, validation of
// archivist anchor arrays (those already pass through resolveThreadId / etc.),
// validation of SceneKernelPatch (Phase E's reducer owns that).

import type { Sf2Campaign, Sf2EntityId } from '../types'

// Canonical entity-id format: lowercase prefix + underscore + identifier.
// Matches `npc_5`, `npc_cauda_brell`, `faction_synod`, `thread_spine`,
// `temporal_manifest_closes_1600`, `doc_tam_transfer`. Rejects display-style
// strings: `grey-coat`, `Mirren`, `the girl`, `unknown_young_man` (no — last
// case actually does match the pattern! see CANONICAL_PREFIXES gate below).
const CANONICAL_ID_PATTERN = /^[a-z][a-z0-9]*(_[a-z0-9]+)+$/

// Recognized canonical prefixes. An ID with a prefix outside this set is
// rejected even if it matches the format (catches `unknown_young_man` and
// similar fake-canonical strings).
const CANONICAL_PREFIXES = new Set([
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
  'pc', // player character; treated as a canonical literal id
])

export interface CanonicalIdViolation {
  field: string                       // 'presentNpcIds[2]' | 'currentInterlocutorIds[0]' | ...
  value: string                       // the offending ID
  reason: 'unrecognized_format' | 'unknown_prefix' | 'not_in_registry'
  registryHint?: 'pre_existing' | 'placeholder_eligible'
}

export interface CanonicalIdCheckResult {
  ok: boolean
  violations: CanonicalIdViolation[]
}

// Check a single id. An id passes if:
//   1. it exists in the npc registry (canonical by construction), OR
//   2. it is the literal 'pc' (player character), OR
//   3. it matches CANONICAL_ID_PATTERN AND has a recognized prefix.
//
// Case 3 admits canonical-shaped IDs that haven't been created yet (e.g. the
// Narrator hints at npc_renn before the Archivist has minted it). The caller
// can decide whether to accept (and let placeholder creation happen) or
// reject (strict mode). For Phase A's set_scene_snapshot path we accept case
// 3 — existing placeholder-creation behavior is preserved — and reject only
// case-1-failures-without-canonical-shape.
export function isCanonicalId(value: string, campaign?: Sf2Campaign): boolean {
  if (!value) return false
  if (value === 'pc') return true
  if (campaign?.npcs[value]) return true
  if (campaign?.factions[value]) return true
  if (!CANONICAL_ID_PATTERN.test(value)) return false
  const prefix = value.split('_', 1)[0]
  return CANONICAL_PREFIXES.has(prefix)
}

// Validate the cast/interlocutor arrays a Narrator snapshot proposes. Used by
// applyMechanicalEffectLocally before it commits the snapshot to state.
// Returns ok=false if ANY id fails — caller should reject the snapshot
// wholesale and retain prior state, drift-flagging each violation.
export function validateSnapshotIds(
  snapshot: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    nearbyEntityIds?: unknown
  },
  campaign: Sf2Campaign
): CanonicalIdCheckResult {
  const violations: CanonicalIdViolation[] = []

  validateArray('presentNpcIds', snapshot.presentNpcIds, campaign, violations)
  validateArray('currentInterlocutorIds', snapshot.currentInterlocutorIds, campaign, violations)
  validateArray('nearbyEntityIds', snapshot.nearbyEntityIds, campaign, violations)

  return { ok: violations.length === 0, violations }
}

function validateArray(
  field: string,
  raw: unknown,
  campaign: Sf2Campaign,
  out: CanonicalIdViolation[]
): void {
  if (raw === undefined || raw === null) return
  if (!Array.isArray(raw)) return
  raw.forEach((value, i) => {
    if (typeof value !== 'string') return
    const violation = classifyId(value, campaign)
    if (violation) {
      out.push({ field: `${field}[${i}]`, value, reason: violation })
    }
  })
}

function classifyId(value: string, campaign: Sf2Campaign): CanonicalIdViolation['reason'] | null {
  if (value === 'pc') return null
  if (campaign.npcs[value] || campaign.factions[value]) return null
  if (!CANONICAL_ID_PATTERN.test(value)) return 'unrecognized_format'
  const prefix = value.split('_', 1)[0]
  if (!CANONICAL_PREFIXES.has(prefix)) return 'unknown_prefix'
  // Canonical-shape but not in registry: caller will create placeholder. Not a
  // violation in Phase A — the existing `set_scene_snapshot` path expects this.
  return null
}

// Convenience: format violations for drift-flag detail strings.
export function formatViolations(violations: CanonicalIdViolation[]): string {
  return violations
    .map((v) => `${v.field}="${v.value}" (${v.reason})`)
    .join('; ')
}

// Strict variant: also rejects canonical-shape-but-not-in-registry. Used by
// future patch-reducer paths where placeholder creation is not allowed.
export function validateSnapshotIdsStrict(
  snapshot: {
    presentNpcIds?: unknown
    currentInterlocutorIds?: unknown
    nearbyEntityIds?: unknown
  },
  campaign: Sf2Campaign
): CanonicalIdCheckResult {
  const result = validateSnapshotIds(snapshot, campaign)
  // Re-check: any canonical-shaped id not in registry is also a violation.
  const arrays: Array<['presentNpcIds' | 'currentInterlocutorIds' | 'nearbyEntityIds', unknown]> = [
    ['presentNpcIds', snapshot.presentNpcIds],
    ['currentInterlocutorIds', snapshot.currentInterlocutorIds],
    ['nearbyEntityIds', snapshot.nearbyEntityIds],
  ]
  for (const [field, raw] of arrays) {
    if (!Array.isArray(raw)) continue
    raw.forEach((value, i) => {
      if (typeof value !== 'string') return
      if (value === 'pc') return
      if (campaign.npcs[value] || campaign.factions[value]) return
      if (!CANONICAL_ID_PATTERN.test(value)) return // already caught
      // canonical shape, not in registry → strict violation
      result.violations.push({
        field: `${field}[${i}]`,
        value,
        reason: 'not_in_registry',
        registryHint: 'placeholder_eligible',
      })
    })
  }
  result.ok = result.violations.length === 0
  return result
}

export { CANONICAL_PREFIXES, CANONICAL_ID_PATTERN }

export type { Sf2EntityId }
