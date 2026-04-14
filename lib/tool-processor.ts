import type { GameState, ToolCallResult, InventoryItem, TempModifier, DispositionTier, RollRecord, RollBreakdown, ChapterDebrief } from './types'
import { getGenreConfig } from './genres'
import type { Genre } from './genres'
import { applyCharacterChanges } from './tool-handlers/character'
import { applyWorldChanges } from './tool-handlers/world'
import { applyCombatChanges } from './tool-handlers/combat'
import { applyNarrativeChanges } from './tool-handlers/narrative'

export interface StatChange {
  type: 'gain' | 'loss' | 'new' | 'neutral'
  label: string
}

// Debug log visible in burger menu — stores last 20 entries
export const debugLog: string[] = []
export function dbg(msg: string) {
  debugLog.push(`${new Date().toLocaleTimeString()} ${msg}`)
  if (debugLog.length > 20) debugLog.shift()
  console.log('[SF]', msg)
}

// ============================================================
// CommitTurnInput — snake_case shape matching the tool schema.
// The parser maps to camelCase GameState fields internally.
// ============================================================

export interface CommitTurnInput {
  character?: {
    hp_delta?: number
    hp_set?: number
    credits_delta?: number
    inventory_add?: (InventoryItem & { max_charges?: number })[]
    inventory_remove?: string[]
    inventory_use?: { id: string; set_charges?: number }
    temp_modifier_add?: TempModifier
    temp_modifier_remove?: string
    trait_update?: { name: string; uses_remaining: number }
    level_up?: { new_level: number; hp_increase: number; new_proficiency_bonus?: number }
    stat_increase?: { stat: string; amount: number }[]
    exhaustion_delta?: number
    add_proficiency?: string
    upgrade_to_expertise?: string
    spend_inspiration?: boolean
    award_inspiration?: { reason: string }
    roll_breakdown?: RollBreakdown
  }
  world?: {
    add_npcs?: { name: string; description: string; last_seen: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; vulnerability?: string; disposition?: DispositionTier; affiliation?: string; status?: 'active' | 'dead' | 'defeated' | 'gone'; voice_note?: string; combat_tier?: 1 | 2 | 3 | 4 | 5; combat_notes?: string }[]
    update_npcs?: { name: string; description?: string; last_seen?: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; vulnerability?: string; disposition?: DispositionTier; affiliation?: string; status?: 'active' | 'dead' | 'defeated' | 'gone'; voice_note?: string; combat_tier?: 1 | 2 | 3 | 4 | 5; combat_notes?: string; temp_load_add?: { description: string; severity: 'mild' | 'moderate' | 'severe'; acquired: string }[]; temp_load_remove?: string; add_signature_line?: string }[]
    set_location?: { name: string; description: string }
    set_current_time?: string
    set_scene_snapshot?: string
    add_threads?: { id: string; title: string; status: string; deteriorating: boolean }[]
    update_threads?: { id: string; title?: string; status: string; deteriorating?: boolean }[]
    add_faction?: { name: string; stance: string }
    add_promise?: { id: string; to: string; what: string; status: 'open' | 'strained' | 'fulfilled' | 'broken' }
    update_promise?: { id?: string; to?: string; status: 'open' | 'strained' | 'fulfilled' | 'broken'; what?: string }
    add_decision?: { id: string; summary: string; context: string; category: 'moral' | 'tactical' | 'strategic' | 'relational'; witnessed?: boolean }
    update_decision?: { id: string; status: 'active' | 'superseded' | 'abandoned'; reason?: string }
    set_operation?: { name: string; phase: string; objectives: ({ text: string; status?: string } | string)[]; tactical_facts?: string[]; asset_constraints?: string[]; abort_conditions?: string[]; signals?: string[]; assessments?: { claim: string; skill: string; result: number; confidence: string; rolled: boolean }[] } | null
    set_exploration?: { facility_name: string; status: string; hostile: boolean; explored: { name: string; notes: string }[]; current: { name: string; description: string }; unexplored: { name: string; hints: string }[]; resources: { name: string; current: string }[]; alert_level?: string } | null
    add_timer?: { id: string; description: string; deadline: string }
    update_timer?: { id: string; status: 'active' | 'expired' | 'completed' }
    update_heat?: { faction: string; level: 'none' | 'low' | 'medium' | 'high' | 'critical'; reason: string }
    add_ledger_entry?: { amount: number; description: string; day: string }
    cohesion?: { direction: 1 | 0 | -1; reason: string; companion_name?: string }
    disposition_changes?: { npc_name: string; new_disposition: DispositionTier; reason: string }[]
    antagonist?: { action: 'establish' | 'move' | 'defeat'; name?: string; description?: string; agenda?: string; move_description?: string; status?: 'defeated' | 'dead' | 'fled' }
    ship?: { hull_condition_delta?: number; upgrade_system?: { id: string; new_level: number; description: string }; add_combat_option?: string; upgrade_log_entry?: string }
    clocks?: { action: 'establish' | 'advance' | 'trigger' | 'resolve'; id: string; name?: string; max_segments?: 4 | 6; trigger_effect?: string; by?: number; reason?: string; consequence?: string; how?: string }[]
    add_clues?: { clue_id?: string; title?: string; content: string; source: string; tags: string[]; is_red_herring?: boolean; thread_title?: string; status?: 'active' | 'solved' | 'archived' }[]
    connect_clues?: { connection_id?: string; source_ids?: string[]; title: string; revelation?: string; status?: 'active' | 'solved' | 'archived' | 'disproven' }[]
  }
  combat?: {
    start?: { enemies: (import('./types').Enemy & { attack_bonus?: number })[]; description: string }
    update_enemies?: { name: string; hp_delta?: number; status?: 'defeated' | 'dead' | 'fled' }[]
    end?: { outcome: string; loot?: (InventoryItem & { max_charges?: number })[]; credits_gained?: number }
  }
  suggested_actions: string[]
  chapter_frame?: { objective: string; crucible: string; outcome_spectrum?: { clean: string; costly: string; failure: string; catastrophic: string } }
  signal_close?: { reason: string; self_assessment?: string }
  close_chapter?: { summary: string; key_events: string[]; next_title: string; resolution_met: string; forward_hook: string; outcome_tier?: 'clean' | 'costly' | 'failure' | 'catastrophic' }
  debrief?: ChapterDebrief
  pending_check?: Record<string, unknown>
  origin_event?: { counter: string; direction: 'up' | 'down'; reason: string }
  spend_witness?: { decision_id: string; spent_on: string }
  scene_end?: boolean
  scene_summary?: string
  tone_signature?: string
  objective_status?: 'in_progress' | 'resolved' | 'failed'
  pivotal_scenes?: { title: string; text: string }[]
  arc_updates?: {
    create_arc?: { id: string; title: string; episodes: string[]; outcome_spectrum?: { clean: string; costly: string; failure: string; catastrophic: string } }
    advance_episode?: { arc_id: string; summary: string }
    resolve_arc?: { arc_id: string }
    abandon_arc?: { arc_id: string; reason: string }
    add_episode?: { arc_id: string; milestone: string }
  }
}

// ============================================================
// Main entry point — dispatches to domain handlers
// ============================================================

export function applyToolResults(
  results: ToolCallResult[],
  currentState: GameState,
  statChanges: StatChange[],
  trackEvent?: (name: string, data: Record<string, string | number | boolean>) => void,
): GameState & { _sceneBreaks?: string[] } {
  let updated = { ...currentState }
  const sceneBreaks: string[] = []
  const creditChangesThisBatch: number[] = []
  const currLabel = (() => { try { return getGenreConfig(currentState.meta.genre as Genre).currencyName } catch { return 'credits' } })()
  const ledgerEntriesThisBatch: string[] = []

  for (const result of results) {
    // ── commit_turn: the single game tool ──
    if (result.tool === 'commit_turn') {
      const input = result.input as unknown as CommitTurnInput

      if (input.character) {
        updated = applyCharacterChanges(input.character, updated, statChanges, creditChangesThisBatch, currLabel, input)
      }
      if (input.world) {
        updated = applyWorldChanges(input.world, updated, statChanges, sceneBreaks, ledgerEntriesThisBatch)
      }
      if (input.combat) {
        updated = applyCombatChanges(input.combat, updated, statChanges, currLabel)
      }
      // Origin event: increment/decrement origin counter
      // Skip if a moral add_decision already auto-ticked this counter (avoid double-tick)
      if (input.origin_event) {
        const alreadyAutoTicked = input.world?.add_decision?.category === 'moral'
        if (alreadyAutoTicked) {
          dbg(`ORIGIN_EVENT skipped (moral decision already auto-ticked): ${input.origin_event.counter}`)
        } else {
          const { counter, direction, reason } = input.origin_event
          const delta = direction === 'up' ? 1 : -1
          const counters = { ...(updated.counters || {}) }
          counters[counter] = (counters[counter] || 0) + delta
          if (counters[counter] < 0) counters[counter] = 0
          updated = { ...updated, counters }
          dbg(`ORIGIN_EVENT ${counter} ${direction} (now ${counters[counter]}): ${reason}`)
        }
      }

      // ── Witness Mark Spending ──
      if (input.spend_witness) {
        const { decision_id, spent_on } = input.spend_witness
        const world = { ...updated.world }
        const decisions = [...(world.decisions || [])]
        const idx = decisions.findIndex(d => d.id === decision_id && d.witnessed && d.status === 'active')
        if (idx >= 0) {
          decisions[idx] = { ...decisions[idx], status: 'spent' as const, spentOn: spent_on }
          world.decisions = decisions
          updated = { ...updated, world }
          dbg(`WITNESS_MARK spent: "${decisions[idx].summary}" → ${spent_on}`)
        } else {
          dbg(`WITNESS_MARK spend failed: decision ${decision_id} not found or not an active witness mark`)
        }
      }

      updated = applyNarrativeChanges(input, updated, statChanges, trackEvent)
    }

    // ── _roll_record: internal, injected by the API route ──
    if (result.tool === '_roll_record') {
      const rollRecord = result.input as unknown as RollRecord
      updated = {
        ...updated,
        history: {
          ...updated.history,
          rollLog: [...updated.history.rollLog, rollRecord],
        },
      }
    }

    // ── _story_summary: internal, from summarize flow ──
    if (result.tool === '_story_summary') {
      // handled by game-screen directly
    }
  }

  if (sceneBreaks.length > 0) {
    (updated as GameState & { _sceneBreaks?: string[] })._sceneBreaks = sceneBreaks
  }
  return updated
}
