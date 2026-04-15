import type { CommitTurnInput } from './tool-processor'

export interface ShadowDiff {
  category: 'match' | 'gm-only' | 'extraction-only' | 'disagree'
  field: string
  gmValue?: string
  extractionValue?: string
}

/**
 * Compare two commit_turn inputs field-by-field for shadow extraction validation.
 * Returns an array of diffs categorized by match/gm-only/extraction-only/disagree.
 */
export function diffCommitTurns(
  gm: Record<string, unknown> | undefined,
  extraction: Record<string, unknown> | undefined,
): ShadowDiff[] {
  if (!gm && !extraction) return []
  const diffs: ShadowDiff[] = []
  const gmInput = (gm ?? {}) as Partial<CommitTurnInput>
  const extInput = (extraction ?? {}) as Partial<CommitTurnInput>

  // ── Location / Scene (string equality) ──
  diffSimpleField(diffs, 'set_location', gmInput.world?.set_location, extInput.world?.set_location, (v) => v.name)
  diffSimpleField(diffs, 'set_current_time', gmInput.world?.set_current_time, extInput.world?.set_current_time)
  diffPresence(diffs, 'set_scene_snapshot', gmInput.world?.set_scene_snapshot, extInput.world?.set_scene_snapshot)

  // ── NPCs ──
  diffNamedArray(diffs, 'add_npcs', gmInput.world?.add_npcs, extInput.world?.add_npcs)
  diffNamedArray(diffs, 'update_npcs', gmInput.world?.update_npcs, extInput.world?.update_npcs)

  // ── Disposition ──
  diffNamedArray(diffs, 'disposition_changes', gmInput.world?.disposition_changes, extInput.world?.disposition_changes, 'npc_name')

  // ── Character ──
  diffSimpleField(diffs, 'hp_delta', gmInput.character?.hp_delta, extInput.character?.hp_delta)
  diffSimpleField(diffs, 'credits_delta', gmInput.character?.credits_delta, extInput.character?.credits_delta)
  diffPresence(diffs, 'inventory_add', gmInput.character?.inventory_add, extInput.character?.inventory_add)
  diffPresence(diffs, 'inventory_remove', gmInput.character?.inventory_remove, extInput.character?.inventory_remove)
  diffPresence(diffs, 'inventory_use', gmInput.character?.inventory_use, extInput.character?.inventory_use)
  diffPresence(diffs, 'temp_modifier_add', gmInput.character?.temp_modifier_add, extInput.character?.temp_modifier_add)
  diffPresence(diffs, 'award_inspiration', gmInput.character?.award_inspiration, extInput.character?.award_inspiration)

  // ── Combat ──
  diffPresence(diffs, 'combat.start', gmInput.combat?.start, extInput.combat?.start)
  diffPresence(diffs, 'combat.update_enemies', gmInput.combat?.update_enemies, extInput.combat?.update_enemies)
  diffPresence(diffs, 'combat.end', gmInput.combat?.end, extInput.combat?.end)

  // ── Narrative tracking ──
  diffNamedArray(diffs, 'add_threads', gmInput.world?.add_threads, extInput.world?.add_threads, 'id')
  diffNamedArray(diffs, 'update_threads', gmInput.world?.update_threads, extInput.world?.update_threads, 'id')
  diffPresence(diffs, 'add_promise', gmInput.world?.add_promise, extInput.world?.add_promise)
  diffPresence(diffs, 'update_promise', gmInput.world?.update_promise, extInput.world?.update_promise)
  diffPresence(diffs, 'add_decision', gmInput.world?.add_decision, extInput.world?.add_decision)
  diffPresence(diffs, 'clocks', gmInput.world?.clocks, extInput.world?.clocks)

  // ── Operations / Exploration ──
  diffPresence(diffs, 'set_operation', gmInput.world?.set_operation, extInput.world?.set_operation)
  diffPresence(diffs, 'set_exploration', gmInput.world?.set_exploration, extInput.world?.set_exploration)

  // ── Other ──
  diffPresence(diffs, 'update_heat', gmInput.world?.update_heat, extInput.world?.update_heat)
  diffPresence(diffs, 'cohesion', gmInput.world?.cohesion, extInput.world?.cohesion)
  diffPresence(diffs, 'antagonist', gmInput.world?.antagonist, extInput.world?.antagonist)
  diffPresence(diffs, 'origin_event', gmInput.origin_event, extInput.origin_event)
  diffPresence(diffs, 'add_ledger_entry', gmInput.world?.add_ledger_entry, extInput.world?.add_ledger_entry)

  // ── Meta ──
  diffPresence(diffs, 'chapter_frame', gmInput.chapter_frame, extInput.chapter_frame)
  diffPresence(diffs, 'signal_close', gmInput.signal_close, extInput.signal_close)
  diffPresence(diffs, 'scene_end', gmInput.scene_end, extInput.scene_end)
  diffPresence(diffs, 'arc_updates', gmInput.arc_updates, extInput.arc_updates)

  return diffs
}

/** Format shadow diffs as debug log lines. */
export function formatShadowDiffs(diffs: ShadowDiff[], turn: number, gmMs: number, extractMs: number): string[] {
  const lines: string[] = []
  const ts = new Date().toISOString()
  lines.push(`[${ts}] SHADOW_EXTRACTION T${turn} gm=${gmMs}ms extract=${extractMs}ms fields=${diffs.length}`)

  const matches = diffs.filter(d => d.category === 'match').length
  const gmOnly = diffs.filter(d => d.category === 'gm-only')
  const extOnly = diffs.filter(d => d.category === 'extraction-only')
  const disagree = diffs.filter(d => d.category === 'disagree')

  if (matches > 0) lines.push(`[${ts}]   MATCH (${matches}): ${diffs.filter(d => d.category === 'match').map(d => d.field).join(', ')}`)
  for (const d of gmOnly) lines.push(`[${ts}]   GM_ONLY ${d.field}${d.gmValue ? ` = ${d.gmValue}` : ''}`)
  for (const d of extOnly) lines.push(`[${ts}]   EXTRACTION_ONLY ${d.field}${d.extractionValue ? ` = ${d.extractionValue}` : ''}`)
  for (const d of disagree) lines.push(`[${ts}]   DISAGREE ${d.field} gm=${d.gmValue} ext=${d.extractionValue}`)

  if (diffs.length === 0) lines.push(`[${ts}]   (no fields to compare — both empty)`)

  return lines
}

// ── Helpers ──

function diffSimpleField<T>(
  diffs: ShadowDiff[],
  field: string,
  gmVal: T | undefined,
  extVal: T | undefined,
  toString?: (v: T) => string,
) {
  const gmStr = gmVal != null ? (toString ? toString(gmVal) : String(gmVal)) : undefined
  const extStr = extVal != null ? (toString ? toString(extVal) : String(extVal)) : undefined

  if (gmStr == null && extStr == null) return
  if (gmStr != null && extStr == null) {
    diffs.push({ category: 'gm-only', field, gmValue: gmStr })
  } else if (gmStr == null && extStr != null) {
    diffs.push({ category: 'extraction-only', field, extractionValue: extStr })
  } else if (gmStr === extStr) {
    diffs.push({ category: 'match', field })
  } else {
    diffs.push({ category: 'disagree', field, gmValue: gmStr, extractionValue: extStr })
  }
}

function diffPresence(
  diffs: ShadowDiff[],
  field: string,
  gmVal: unknown,
  extVal: unknown,
) {
  const gmHas = gmVal != null && (!Array.isArray(gmVal) || gmVal.length > 0)
  const extHas = extVal != null && (!Array.isArray(extVal) || extVal.length > 0)

  if (!gmHas && !extHas) return
  if (gmHas && !extHas) {
    diffs.push({ category: 'gm-only', field, gmValue: summarize(gmVal) })
  } else if (!gmHas && extHas) {
    diffs.push({ category: 'extraction-only', field, extractionValue: summarize(extVal) })
  } else {
    diffs.push({ category: 'match', field })
  }
}

function diffNamedArray(
  diffs: ShadowDiff[],
  field: string,
  gmArr: Array<Record<string, unknown>> | undefined,
  extArr: Array<Record<string, unknown>> | undefined,
  nameKey = 'name',
) {
  const gmItems = gmArr ?? []
  const extItems = extArr ?? []
  if (gmItems.length === 0 && extItems.length === 0) return

  const gmNames = new Set(gmItems.map(i => String(i[nameKey] ?? '').toLowerCase()))
  const extNames = new Set(extItems.map(i => String(i[nameKey] ?? '').toLowerCase()))

  for (const name of gmNames) {
    if (extNames.has(name)) {
      diffs.push({ category: 'match', field: `${field}.${name}` })
    } else {
      diffs.push({ category: 'gm-only', field: `${field}.${name}`, gmValue: name })
    }
  }
  for (const name of extNames) {
    if (!gmNames.has(name)) {
      diffs.push({ category: 'extraction-only', field: `${field}.${name}`, extractionValue: name })
    }
  }
}

function summarize(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'string') return val.slice(0, 60)
  if (typeof val === 'number' || typeof val === 'boolean') return String(val)
  if (Array.isArray(val)) return `[${val.length} items]`
  try { const s = JSON.stringify(val); return s.length > 80 ? s.slice(0, 77) + '...' : s } catch { return '[object]' }
}
