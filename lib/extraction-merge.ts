import type { ShadowDiff } from './shadow-diff'
import type { CommitTurnInput } from './tool-processor'
import type { ToolCallResult } from './types'

/**
 * Fields the extraction should NEVER override — GM-only judgment calls.
 * Scene boundaries (scene_end, scene_summary, tone_signature) are NOT skipped:
 * extraction handles them with full context + minimum-gap instruction.
 */
const SKIP_FIELDS = new Set([
  'suggested_actions',
  'pending_check',
  'signal_close',
  'close_chapter',
  'debrief',
  'chapter_frame',
  'objective_status',
  'pivotal_scenes',
  'arc_updates',
])

/**
 * Build a supplemental commit_turn from extraction-only fields.
 *
 * Takes the extraction's raw commit_turn, the GM's raw commit_turn, and
 * the shadow diffs. Returns a synthetic ToolCallResult[] containing ONLY
 * the fields the GM missed (extraction-only), which can be fed to
 * applyToolResults to get all domain handler logic for free.
 *
 * For array fields (NPCs, threads, clocks), per-item union: only items
 * the GM didn't include are supplemented.
 */
export function buildSupplementalCommit(
  extractionInput: Record<string, unknown>,
  gmInput: Record<string, unknown>,
  diffs: ShadowDiff[],
): ToolCallResult[] {
  // Collect extraction-only field root names
  const extractionOnlyFields = new Set(
    diffs
      .filter(d => d.category === 'extraction-only')
      .map(d => d.field.split('.')[0]) // 'add_npcs.kira' → 'add_npcs'
  )

  // Remove skip fields
  for (const skip of SKIP_FIELDS) {
    extractionOnlyFields.delete(skip)
  }

  if (extractionOnlyFields.size === 0) return []

  const ext = extractionInput as Partial<CommitTurnInput>
  const gm = gmInput as Partial<CommitTurnInput>
  const supplement: Record<string, unknown> = {}

  // ── Character fields ──
  if (ext.character) {
    const charSupplement: Record<string, unknown> = {}
    const charFields = [
      'hp_delta', 'hp_set', 'credits_delta',
      'inventory_add', 'inventory_remove', 'inventory_use',
      'temp_modifier_add', 'temp_modifier_remove',
      'award_inspiration', 'exhaustion_delta',
    ]
    for (const f of charFields) {
      if (extractionOnlyFields.has(f)) {
        charSupplement[f] = (ext.character as Record<string, unknown>)[f]
      }
    }
    if (Object.keys(charSupplement).length > 0) {
      supplement.character = charSupplement
    }
  }

  // ── World fields ──
  if (ext.world) {
    const worldSupplement: Record<string, unknown> = {}
    const extWorld = ext.world as Record<string, unknown>
    const gmWorld = (gm.world ?? {}) as Record<string, unknown>

    // Simple presence fields — take extraction's value if GM didn't include
    const simpleWorldFields = [
      'set_location', 'set_current_time', 'set_scene_snapshot',
      'add_promise', 'update_promise', 'add_decision', 'update_decision',
      'set_operation', 'set_exploration',
      'update_heat', 'cohesion', 'antagonist', 'add_ledger_entry',
    ]
    for (const f of simpleWorldFields) {
      if (extractionOnlyFields.has(f)) {
        worldSupplement[f] = extWorld[f]
      }
    }

    // Array fields — per-item union, skip items GM already has
    const arrayFields: { field: string; key: string }[] = [
      { field: 'add_npcs', key: 'name' },
      { field: 'update_npcs', key: 'name' },
      { field: 'disposition_changes', key: 'npc_name' },
      { field: 'add_threads', key: 'id' },
      { field: 'update_threads', key: 'id' },
      { field: 'clocks', key: 'id' },
    ]
    for (const { field, key } of arrayFields) {
      const hasExtOnly = diffs.some(d =>
        d.category === 'extraction-only' && d.field.startsWith(`${field}.`)
      )
      if (!hasExtOnly) continue

      const extArr = (extWorld[field] as Array<Record<string, unknown>>) ?? []
      const gmArr = (gmWorld[field] as Array<Record<string, unknown>>) ?? []
      const gmKeys = new Set(
        gmArr.map(item => String(item[key] ?? '').toLowerCase())
      )
      const supplementItems = extArr.filter(item =>
        !gmKeys.has(String(item[key] ?? '').toLowerCase())
      )
      if (supplementItems.length > 0) {
        worldSupplement[field] = supplementItems
      }
    }

    if (Object.keys(worldSupplement).length > 0) {
      supplement.world = worldSupplement
    }
  }

  // ── Combat fields ──
  if (ext.combat) {
    const combatSupplement: Record<string, unknown> = {}
    for (const f of ['start', 'update_enemies', 'end']) {
      if (extractionOnlyFields.has(`combat.${f}`)) {
        combatSupplement[f] = (ext.combat as Record<string, unknown>)[f]
      }
    }
    if (Object.keys(combatSupplement).length > 0) {
      supplement.combat = combatSupplement
    }
  }

  // ── Top-level fields ──
  if (extractionOnlyFields.has('origin_event') && ext.origin_event) {
    supplement.origin_event = ext.origin_event
  }
  if (extractionOnlyFields.has('scene_end') && ext.scene_end) {
    supplement.scene_end = ext.scene_end
    // Include scene_summary and tone_signature if present with scene_end
    if (ext.scene_summary) supplement.scene_summary = ext.scene_summary
    if (ext.tone_signature) supplement.tone_signature = ext.tone_signature
  }

  // Must include suggested_actions (empty) to satisfy the handler
  supplement.suggested_actions = []

  // Only suggested_actions means nothing real to supplement
  if (Object.keys(supplement).length <= 1) return []

  return [{ tool: 'commit_turn', input: supplement }]
}
