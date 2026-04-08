import type { GameState, ToolCallResult, Enemy, InventoryItem, TempModifier, AntagonistMove, CohesionLogEntry, UpdateShipInput, ChapterDebrief, DispositionTier, TensionClock, RollRecord, RollBreakdown, Notebook } from './types'
import { resetChapterCounters } from './rules-engine'

export interface StatChange {
  type: 'gain' | 'loss' | 'new' | 'neutral'
  label: string
}

// Debug log visible in burger menu — stores last 20 entries
export const debugLog: string[] = []
function dbg(msg: string) {
  debugLog.push(`${new Date().toLocaleTimeString()} ${msg}`)
  if (debugLog.length > 20) debugLog.shift()
  console.log('[SF]', msg)
}

// ============================================================
// CommitTurnInput — snake_case shape matching the tool schema.
// The parser maps to camelCase GameState fields internally.
// ============================================================

interface CommitTurnInput {
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
    add_decision?: { id: string; summary: string; context: string; category: 'moral' | 'tactical' | 'strategic' | 'relational' }
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
    start?: { enemies: (Enemy & { attack_bonus?: number })[]; description: string }
    end?: { outcome: string; loot?: (InventoryItem & { max_charges?: number })[]; credits_gained?: number }
  }
  suggested_actions: string[]
  chapter_frame?: { objective: string; crucible: string }
  signal_close?: { reason: string; self_assessment?: string }
  close_chapter?: { summary: string; key_events: string[]; next_title: string; resolution_met: string; forward_hook: string }
  debrief?: ChapterDebrief
  pending_check?: Record<string, unknown>
  scene_end?: boolean
  scene_summary?: string
  pivotal_scenes?: { title: string; text: string }[]
  arc_updates?: {
    create_arc?: { id: string; title: string; episodes: string[] }
    advance_episode?: { arc_id: string; summary: string }
    resolve_arc?: { arc_id: string }
    abandon_arc?: { arc_id: string; reason: string }
    add_episode?: { arc_id: string; milestone: string }
  }
}

// ============================================================
// Domain apply functions
// ============================================================

function applyCharacterChanges(
  input: NonNullable<CommitTurnInput['character']>,
  updated: GameState,
  statChanges: StatChange[],
  creditChangesThisBatch: number[],
): GameState {
  const char = { ...updated.character }

  if (input.hp_delta !== undefined) {
    const newHp = Math.max(0, Math.min(char.hp.max, char.hp.current + input.hp_delta))
    if (input.hp_delta < 0) {
      statChanges.push({ type: 'loss', label: `HP ${char.hp.current} → ${newHp}` })
    } else if (input.hp_delta > 0) {
      statChanges.push({ type: 'gain', label: `HP ${char.hp.current} → ${newHp}` })
    }
    char.hp = { ...char.hp, current: newHp }
  }

  if (input.hp_set !== undefined) {
    const newHp = Math.max(0, Math.min(char.hp.max, input.hp_set))
    statChanges.push({ type: newHp < char.hp.current ? 'loss' : 'gain', label: `HP → ${newHp}` })
    char.hp = { ...char.hp, current: newHp }
  }

  if (input.credits_delta !== undefined) {
    if (creditChangesThisBatch.includes(input.credits_delta)) {
      dbg('DUPLICATE credit change rejected: ' + input.credits_delta)
    } else {
      creditChangesThisBatch.push(input.credits_delta)
      const newCredits = char.credits + input.credits_delta
      if (input.credits_delta < 0) {
        statChanges.push({ type: 'loss', label: `${char.credits}cr → ${newCredits}cr` })
      } else {
        statChanges.push({ type: 'gain', label: `+${input.credits_delta}cr` })
      }
      char.credits = newCredits
    }
  }

  if (input.inventory_add) {
    // Map snake_case max_charges to camelCase maxCharges for GameState
    const items: InventoryItem[] = input.inventory_add.map(item => ({
      ...item,
      maxCharges: item.max_charges ?? item.maxCharges,
    }))
    char.inventory = [...char.inventory, ...items]
    items.forEach((item) => {
      statChanges.push({ type: 'new', label: `+${item.name}` })
    })
  }

  if (input.inventory_remove) {
    const removedIds = new Set(input.inventory_remove)
    char.inventory = char.inventory.filter((item) => !removedIds.has(item.id))
  }

  if (input.inventory_use) {
    const useId = input.inventory_use.id.toLowerCase()
    let matched = false
    char.inventory = char.inventory.map((item) => {
      const id = item.id.toLowerCase()
      const name = item.name.toLowerCase()
      const slug = name.replace(/\s+/g, '_')
      const matchById = id === useId || id.startsWith(useId) || useId.startsWith(id)
      const matchByName = name === useId || name.startsWith(useId) || slug === useId || slug.startsWith(useId)
      if ((matchById || matchByName) && !matched) {
        matched = true
        if (item.charges !== undefined) {
          const newCharges = input.inventory_use!.set_charges !== undefined
            ? Math.max(0, input.inventory_use!.set_charges)
            : Math.max(0, item.charges - 1)
          if (newCharges === item.charges) return item
          if (newCharges <= 0) {
            statChanges.push({ type: 'loss', label: `${item.name} depleted` })
          } else {
            statChanges.push({ type: 'loss', label: `${item.name} ${item.charges} → ${newCharges}` })
          }
          return { ...item, charges: newCharges }
        } else if (item.quantity > 1) {
          statChanges.push({ type: 'loss', label: `${item.name} ${item.quantity} → ${item.quantity - 1}` })
          return { ...item, quantity: item.quantity - 1 }
        } else {
          statChanges.push({ type: 'loss', label: `${item.name} used` })
          return { ...item, quantity: 0 }
        }
      }
      return item
    })
  }

  if (input.temp_modifier_add) {
    char.tempModifiers = [...char.tempModifiers, input.temp_modifier_add]
    statChanges.push({ type: 'new', label: `Effect: ${input.temp_modifier_add.name}` })
  }

  if (input.temp_modifier_remove) {
    char.tempModifiers = char.tempModifiers.filter((m) => m.id !== input.temp_modifier_remove)
  }

  if (input.trait_update) {
    char.traits = char.traits.map((t) =>
      t.name === input.trait_update!.name
        ? { ...t, usesRemaining: input.trait_update!.uses_remaining }
        : t
    )
  }

  if (input.level_up) {
    const { new_level, hp_increase, new_proficiency_bonus } = input.level_up
    const newMax = char.hp.max + hp_increase
    statChanges.push({ type: 'gain', label: `Level ${new_level}! HP max +${hp_increase}` })
    char.level = new_level
    char.hp = { max: newMax, current: newMax }
    if (new_proficiency_bonus !== undefined) {
      char.proficiencyBonus = new_proficiency_bonus
      statChanges.push({ type: 'gain', label: `Proficiency +${new_proficiency_bonus}` })
    }
  }

  if (input.stat_increase) {
    const newStats = { ...char.stats }
    for (const inc of input.stat_increase) {
      const key = inc.stat as keyof typeof newStats
      if (key in newStats) {
        newStats[key] += inc.amount
        statChanges.push({ type: 'gain', label: `${inc.stat} +${inc.amount} → ${newStats[key]}` })
      }
    }
    char.stats = newStats
  }

  if (input.exhaustion_delta !== undefined) {
    const prev = char.exhaustion ?? 0
    char.exhaustion = Math.max(0, Math.min(6, prev + input.exhaustion_delta))
    if (input.exhaustion_delta > 0) {
      const labels = ['', 'Exhaustion 1: disadvantage on checks', 'Exhaustion 2: slowed', 'Exhaustion 3: disadvantage on attacks/saves', 'Exhaustion 4: HP halved', 'Exhaustion 5: immobilized', 'Exhaustion 6: death']
      statChanges.push({ type: 'loss', label: labels[char.exhaustion] || `Exhaustion ${char.exhaustion}` })
    } else {
      statChanges.push({ type: 'gain', label: char.exhaustion === 0 ? 'Exhaustion cleared' : `Exhaustion reduced to ${char.exhaustion}` })
    }
  }

  if (input.add_proficiency) {
    if (!char.proficiencies.includes(input.add_proficiency)) {
      char.proficiencies = [...char.proficiencies, input.add_proficiency]
      statChanges.push({ type: 'new', label: `Proficiency: ${input.add_proficiency}` })
    }
  }

  if (input.upgrade_to_expertise) {
    const expertiseLabel = `${input.upgrade_to_expertise} (expertise)`
    char.proficiencies = char.proficiencies.map((p) =>
      p === input.upgrade_to_expertise ? expertiseLabel : p
    )
    if (!char.proficiencies.includes(expertiseLabel)) {
      char.proficiencies = [...char.proficiencies, expertiseLabel]
    }
    statChanges.push({ type: 'gain', label: `Expertise: ${input.upgrade_to_expertise}` })
  }

  if (input.spend_inspiration) {
    char.inspiration = false
    statChanges.push({ type: 'loss', label: 'Used Inspiration' })
  }

  if (input.award_inspiration) {
    if (!char.inspiration) {
      char.inspiration = true
      statChanges.push({ type: 'gain', label: `Inspiration: ${input.award_inspiration.reason}` })
    }
  }

  return { ...updated, character: char }
}

function applyWorldChanges(
  input: NonNullable<CommitTurnInput['world']>,
  updated: GameState,
  statChanges: StatChange[],
  sceneBreaks: string[],
  ledgerEntriesThisBatch: string[],
): GameState {
  const world = { ...updated.world }

  // ── NPCs ──
  if (input.add_npcs) {
    for (const n of input.add_npcs) {
      // Map snake_case to camelCase for GameState NPC fields
      const npc = {
        name: n.name,
        description: n.description,
        lastSeen: n.last_seen,
        relationship: n.relationship,
        role: n.role,
        subtype: n.subtype,
        vulnerability: n.vulnerability,
        disposition: n.disposition,
        affiliation: n.affiliation,
        status: n.status,
        voiceNote: n.voice_note,
        combatTier: n.combat_tier,
        combatNotes: n.combat_notes,
      }
      const nameLower = npc.name.toLowerCase()
      const existing = world.npcs.find((x) => {
        const xLower = x.name.toLowerCase()
        return xLower === nameLower || xLower.startsWith(nameLower) || nameLower.startsWith(xLower)
      })
      if (existing) {
        const canonical = existing.name.length <= npc.name.length ? existing.name : npc.name
        world.npcs = world.npcs.map((x) =>
          x.name === existing.name ? { ...x, ...npc, name: canonical } : x
        )
      } else {
        world.npcs = [...world.npcs, npc]
        statChanges.push({ type: 'new', label: `Met: ${npc.name}` })
      }
      if (npc.affiliation && !world.factions.some((f) => f.name === npc.affiliation)) {
        world.factions = [...world.factions, { name: npc.affiliation, stance: 'Unknown' }]
      }
    }
  }

  if (input.update_npcs) {
    for (const n of input.update_npcs) {
      const npcUpdate = {
        name: n.name,
        ...(n.description !== undefined && { description: n.description }),
        ...(n.last_seen !== undefined && { lastSeen: n.last_seen }),
        ...(n.relationship !== undefined && { relationship: n.relationship }),
        ...(n.role !== undefined && { role: n.role }),
        ...(n.subtype !== undefined && { subtype: n.subtype }),
        ...(n.vulnerability !== undefined && { vulnerability: n.vulnerability }),
        ...(n.disposition !== undefined && { disposition: n.disposition }),
        ...(n.affiliation !== undefined && { affiliation: n.affiliation }),
        ...(n.status !== undefined && { status: n.status }),
        ...(n.voice_note !== undefined && { voiceNote: n.voice_note }),
        ...(n.combat_tier !== undefined && { combatTier: n.combat_tier }),
        ...(n.combat_notes !== undefined && { combatNotes: n.combat_notes }),
      }
      dbg('updateNpc: ' + JSON.stringify(npcUpdate))
      const updateName = n.name.toLowerCase()
      const matched = world.npcs.find((x) => {
        const xLower = x.name.toLowerCase()
        return xLower === updateName || xLower.startsWith(updateName) || updateName.startsWith(xLower)
      })
      dbg('matched npc: ' + (matched ? matched.name : 'NONE'))
      if (matched) {
        world.npcs = world.npcs.map((x) => {
          if (x.name !== matched.name) return x
          let updated = { ...x, ...npcUpdate }
          // tempLoad mutations
          if (n.temp_load_add) {
            updated.tempLoad = [...(updated.tempLoad ?? []), ...n.temp_load_add]
          }
          if (n.temp_load_remove) {
            const removeStr = n.temp_load_remove.toLowerCase()
            updated.tempLoad = (updated.tempLoad ?? []).filter(
              e => !e.description.toLowerCase().includes(removeStr)
            )
          }
          if (n.add_signature_line) {
            const lines = updated.signatureLines ?? []
            if (lines.length < 4) {  // cap at 4
              updated.signatureLines = [...lines, n.add_signature_line]
            }
          }
          return updated
        })
        dbg('npc after update: ' + JSON.stringify(world.npcs.find(x => x.name === matched.name)?.status))
      }
      if (n.affiliation && !world.factions.some((f) => f.name === n.affiliation)) {
        world.factions = [...world.factions, { name: n.affiliation, stance: 'Unknown' }]
      }
    }
  }

  // ── Location + time ──
  if (input.set_current_time) {
    world.currentTime = input.set_current_time
  }
  if (input.set_location) {
    world.currentLocation = input.set_location
    const timeStr = input.set_current_time || world.currentTime
    const sceneLabel = timeStr ? `${input.set_location.name} · ${timeStr}` : input.set_location.name
    sceneBreaks.push(sceneLabel)
  }
  if (input.set_scene_snapshot) {
    world.sceneSnapshot = input.set_scene_snapshot
  }

  // ── Threads ──
  const matchThread = (t: { id: string; title: string }, update: { id: string; title?: string }) =>
    t.id === update.id || (update.title && t.title.toLowerCase() === update.title.toLowerCase())

  if (input.add_threads) {
    for (const thread of input.add_threads) {
      const existingThread = world.threads.find((t) => t.title === thread.title)
      if (existingThread) {
        world.threads = world.threads.map((t) =>
          t.title === thread.title ? { ...t, ...thread } : t
        )
      } else {
        world.threads = [...world.threads, thread]
        statChanges.push({ type: 'new', label: `Thread: ${thread.title}` })
      }
    }
  }
  if (input.update_threads) {
    dbg('updateThreads: ' + JSON.stringify(input.update_threads))
    for (const update of input.update_threads) {
      world.threads = world.threads.map((t) =>
        matchThread(t, update) ? { ...t, ...update } : t
      )
    }
  }

  // ── Factions ──
  if (input.add_faction) {
    const exists = world.factions.find((f) => f.name === input.add_faction!.name)
    if (exists) {
      world.factions = world.factions.map((f) =>
        f.name === input.add_faction!.name ? { ...f, stance: input.add_faction!.stance } : f
      )
    } else {
      world.factions = [...world.factions, input.add_faction]
    }
  }

  // ── Promises ──
  if (input.add_promise) {
    const existingPromise = world.promises.find((p) => p.id === input.add_promise!.id || (p.to === input.add_promise!.to && p.what === input.add_promise!.what))
    if (existingPromise) {
      world.promises = world.promises.map((p) =>
        p === existingPromise ? { ...p, ...input.add_promise } : p
      )
    } else {
      world.promises = [...world.promises, input.add_promise]
      statChanges.push({ type: 'new', label: `Promise to ${input.add_promise.to}` })
    }
  }
  if (input.update_promise) {
    const up = input.update_promise
    let matchedName = ''
    world.promises = world.promises.map((p) => {
      const matchById = up.id && p.id === up.id
      const matchByTo = up.to && p.to.toLowerCase() === up.to.toLowerCase()
      if (matchById || matchByTo) {
        matchedName = p.to
        return { ...p, status: up.status, ...(up.what && { what: up.what }) }
      }
      return p
    })
    if (matchedName) {
      const label = up.status === 'fulfilled' ? `Promise kept: ${matchedName}` : up.status === 'broken' ? `Promise broken: ${matchedName}` : `Promise → ${up.status}: ${matchedName}`
      statChanges.push({ type: up.status === 'fulfilled' ? 'gain' : up.status === 'broken' ? 'loss' : 'neutral', label })
    }
  }

  // ── Decisions ──
  if (input.add_decision) {
    const decisions = world.decisions || []
    const existing = decisions.find(d => d.id === input.add_decision!.id)
    if (existing) {
      world.decisions = decisions.map(d =>
        d.id === input.add_decision!.id ? { ...d, summary: input.add_decision!.summary, context: input.add_decision!.context, category: input.add_decision!.category } : d
      )
    } else {
      const chapterNum = updated.meta?.chapterNumber ?? 1
      const newDecision = { ...input.add_decision, status: 'active' as const, chapter: chapterNum }
      const activeDecisions = decisions.filter(d => d.status === 'active')
      if (activeDecisions.length >= 8) {
        const oldest = activeDecisions[0]
        world.decisions = decisions.map(d =>
          d.id === oldest.id ? { ...d, status: 'superseded' as const, reason: 'overtaken by events' } : d
        )
        world.decisions = [...world.decisions, newDecision]
      } else {
        world.decisions = [...decisions, newDecision]
      }
      statChanges.push({ type: 'new', label: `Decision: ${input.add_decision.summary}` })
    }
  }
  if (input.update_decision) {
    const ud = input.update_decision
    const decisions = world.decisions || []
    world.decisions = decisions.map(d =>
      d.id === ud.id ? { ...d, status: ud.status, ...(ud.reason && { reason: ud.reason }) } : d
    )
    const matched = decisions.find(d => d.id === ud.id)
    if (matched) {
      const label = ud.status === 'superseded' ? `Decision superseded: ${matched.summary}` : ud.status === 'abandoned' ? `Decision abandoned: ${matched.summary}` : `Decision → ${ud.status}`
      statChanges.push({ type: ud.status === 'active' ? 'neutral' : 'loss', label })
    }
  }

  // ── Operations ──
  if (input.set_operation !== undefined) {
    if (input.set_operation) {
      const op = { ...input.set_operation }
      // Map snake_case to camelCase for OperationState
      const mapped = {
        name: op.name,
        phase: op.phase,
        objectives: (op.objectives || []).map(obj =>
          typeof obj === 'string'
            ? { text: obj, status: 'active' as const }
            : { text: obj.text, status: (obj.status || 'active') as 'active' | 'completed' | 'failed' }
        ),
        tacticalFacts: op.tactical_facts || [],
        assetConstraints: op.asset_constraints || [],
        abortConditions: op.abort_conditions || [],
        signals: op.signals || [],
        assessments: op.assessments || [],
      }
      world.operationState = mapped as import('./types').OperationState
      statChanges.push({ type: 'new', label: `Op: ${mapped.name} [${mapped.phase}]` })
    } else {
      world.operationState = null
      statChanges.push({ type: 'neutral', label: 'Operation complete' })
    }
  }

  // ── Exploration ──
  if (input.set_exploration !== undefined) {
    if (input.set_exploration) {
      const e = input.set_exploration
      world.explorationState = {
        facilityName: e.facility_name,
        status: e.status,
        hostile: e.hostile,
        explored: e.explored,
        current: e.current,
        unexplored: e.unexplored,
        resources: e.resources,
        alertLevel: e.alert_level,
      } as import('./types').ExplorationState
      statChanges.push({ type: 'new', label: `Exploring: ${e.facility_name}` })
    } else {
      world.explorationState = null
      statChanges.push({ type: 'neutral', label: 'Exited facility' })
    }
  }

  // ── Timers ──
  if (input.add_timer) {
    world.timers = [...(world.timers || []), { ...input.add_timer, status: 'active' as const }]
    statChanges.push({ type: 'new', label: `Timer: ${input.add_timer.description}` })
  }
  if (input.update_timer) {
    const timerDesc = (world.timers || []).find(t => t.id === input.update_timer!.id)?.description || input.update_timer.id
    world.timers = (world.timers || []).map(t =>
      t.id === input.update_timer!.id ? { ...t, status: input.update_timer!.status } : t
    )
    statChanges.push({ type: 'neutral', label: `Timer ${input.update_timer.status}: ${timerDesc}` })
  }

  // ── Heat ──
  if (input.update_heat) {
    const existing = (world.heat || []).find(h => h.faction === input.update_heat!.faction)
    if (existing) {
      world.heat = world.heat.map(h =>
        h.faction === input.update_heat!.faction
          ? { ...h, level: input.update_heat!.level, reasons: [...h.reasons, input.update_heat!.reason] }
          : h
      )
    } else {
      world.heat = [...(world.heat || []), { faction: input.update_heat.faction, level: input.update_heat.level, reasons: [input.update_heat.reason] }]
    }
    const label = input.update_heat.level === 'none' ? 'Heat cleared' : `Heat: ${input.update_heat.faction} → ${input.update_heat.level}`
    statChanges.push({ type: input.update_heat.level === 'critical' ? 'loss' : 'neutral', label })
  }

  // ── Ledger ──
  if (input.add_ledger_entry) {
    const ledgerKey = `${input.add_ledger_entry.amount}:${input.add_ledger_entry.description}`
    const existingDupe = (world.ledger || []).some(e =>
      e.amount === input.add_ledger_entry!.amount && e.description === input.add_ledger_entry!.description
    )
    if (ledgerEntriesThisBatch.includes(ledgerKey) || existingDupe) {
      dbg('DUPLICATE ledger entry rejected: ' + ledgerKey)
    } else {
      ledgerEntriesThisBatch.push(ledgerKey)
      world.ledger = [...(world.ledger || []), input.add_ledger_entry]
      const sign = input.add_ledger_entry.amount > 0 ? '+' : ''
      statChanges.push({ type: 'neutral', label: `${sign}${input.add_ledger_entry.amount} (${input.add_ledger_entry.description})` })
    }
  }

  // ── Cohesion ──
  if (input.cohesion) {
    // Log the cohesion event (score is derived from crew dispositions by the rules engine)
    const cohesion = world.crewCohesion ?? { score: 3, log: [] }
    const logEntry: CohesionLogEntry = {
      chapterNumber: updated.meta.chapterNumber,
      companionName: input.cohesion.companion_name || 'crew',
      change: input.cohesion.direction,
      reason: input.cohesion.reason,
      timestamp: new Date().toISOString(),
    }
    world.crewCohesion = {
      score: cohesion.score,  // preserved; rules engine will derive the actual score
      log: [...cohesion.log, logEntry],
    }
  }

  // ── Disposition changes ──
  if (input.disposition_changes) {
    for (const dc of input.disposition_changes) {
      world.npcs = world.npcs.map((n) =>
        n.name === dc.npc_name ? { ...n, disposition: dc.new_disposition } : n
      )
    }
  }

  // ── Antagonist ──
  if (input.antagonist) {
    const ant = input.antagonist
    if (ant.action === 'establish' && ant.name && ant.description && ant.agenda) {
      world.antagonist = {
        name: ant.name,
        description: ant.description,
        agenda: ant.agenda,
        movedThisChapter: false,
        moves: [],
      }
      statChanges.push({ type: 'new', label: `Antagonist: ${ant.name}` })
    }
    if (ant.action === 'move' && world.antagonist && ant.move_description) {
      const move: AntagonistMove = {
        chapterNumber: updated.meta.chapterNumber,
        description: ant.move_description,
        timestamp: new Date().toISOString(),
      }
      world.antagonist = {
        ...world.antagonist,
        movedThisChapter: true,
        moves: [...world.antagonist.moves, move],
      }
      statChanges.push({ type: 'neutral', label: 'Antagonist moves' })
    }
    if (ant.action === 'defeat' && world.antagonist) {
      world.antagonist = {
        ...world.antagonist,
        status: ant.status ?? 'defeated',
      }
      statChanges.push({ type: 'loss', label: `Antagonist ${ant.status ?? 'defeated'}` })
    }
  }

  // ── Ship ──
  if (input.ship && world.ship) {
    let newShip = { ...world.ship }
    if (input.ship.hull_condition_delta !== undefined) {
      newShip.hullCondition = Math.max(0, Math.min(100, world.ship.hullCondition + input.ship.hull_condition_delta))
      statChanges.push({
        type: input.ship.hull_condition_delta > 0 ? 'gain' : 'loss',
        label: `Hull: ${newShip.hullCondition}%`,
      })
    }
    if (input.ship.upgrade_system) {
      newShip.systems = world.ship.systems.map((s) =>
        s.id === input.ship!.upgrade_system!.id
          ? { ...s, level: input.ship!.upgrade_system!.new_level, description: input.ship!.upgrade_system!.description }
          : s
      )
      const sysName = input.ship.upgrade_system.id.replace('_', ' ')
      statChanges.push({ type: 'gain', label: `${sysName} → L${input.ship.upgrade_system.new_level}` })
    }
    if (input.ship.add_combat_option) {
      newShip.combatOptions = [...world.ship.combatOptions, input.ship.add_combat_option]
      statChanges.push({ type: 'new', label: `Ship: ${input.ship.add_combat_option}` })
    }
    if (input.ship.upgrade_log_entry) {
      newShip.upgradeLog = [...world.ship.upgradeLog, input.ship.upgrade_log_entry]
    }
    world.ship = newShip
  }

  // ── Clocks ──
  if (input.clocks) {
    const clocks: TensionClock[] = [...(world.tensionClocks ?? [])]
    for (const c of input.clocks) {
      if (c.action === 'establish') {
        if (!clocks.find((x) => x.id === c.id)) {
          clocks.push({
            id: c.id,
            name: c.name!,
            maxSegments: c.max_segments ?? 4,
            filled: 0,
            status: 'active',
            triggerEffect: c.trigger_effect!,
          })
        }
      } else if (c.action === 'advance') {
        const idx = clocks.findIndex((x) => x.id === c.id)
        if (idx >= 0 && clocks[idx].status === 'active') {
          clocks[idx] = {
            ...clocks[idx],
            filled: Math.min(clocks[idx].maxSegments, clocks[idx].filled + (c.by ?? 1)),
          }
        }
      } else if (c.action === 'trigger') {
        const idx = clocks.findIndex((x) => x.id === c.id)
        if (idx >= 0) {
          clocks[idx] = {
            ...clocks[idx],
            status: 'triggered',
            triggerEffect: c.consequence ?? clocks[idx].triggerEffect,
          }
        }
      } else if (c.action === 'resolve') {
        const idx = clocks.findIndex((x) => x.id === c.id)
        if (idx >= 0) {
          clocks[idx] = { ...clocks[idx], status: 'resolved' }
        }
      }
    }
    world.tensionClocks = clocks
  }

  // ── Notebook: clues ──
  if (input.add_clues) {
    for (const clueInput of input.add_clues) {
      const notebook = world.notebook ?? { activeThreadTitle: '', clues: [], connections: [] }

      if (clueInput.clue_id) {
        const existingIdx = notebook.clues.findIndex(c => c.id === clueInput.clue_id)
        if (existingIdx >= 0) {
          notebook.clues = notebook.clues.map(c =>
            c.id === clueInput.clue_id
              ? { ...c, content: clueInput.content, source: clueInput.source, tags: [...new Set([...c.tags, ...clueInput.tags])], ...(clueInput.title ? { title: clueInput.title } : {}), ...(clueInput.status ? { status: clueInput.status } : {}) }
              : c
          )
          statChanges.push({ type: 'new', label: `Clue updated: ${clueInput.title || clueInput.content.slice(0, 35) + '...'}` })
        } else {
          const clueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          notebook.clues = [...notebook.clues, {
            id: clueId, title: clueInput.title, content: clueInput.content, source: clueInput.source, tags: clueInput.tags,
            discoveredChapter: updated.meta.chapterNumber, connectionIds: [], isRedHerring: clueInput.is_red_herring ?? false,
          }]
          statChanges.push({ type: 'new', label: `Clue: ${clueInput.title || clueInput.content.slice(0, 40) + '...'}` })
        }
      } else {
        const titleLower = (clueInput.title || '').toLowerCase()
        const duplicate = titleLower ? notebook.clues.find(c => (c.title || '').toLowerCase() === titleLower) : null
        if (duplicate) {
          notebook.clues = notebook.clues.map(c =>
            c.id === duplicate.id
              ? { ...c, content: clueInput.content, source: clueInput.source, tags: [...new Set([...c.tags, ...clueInput.tags])], ...(clueInput.title ? { title: clueInput.title } : {}), ...(clueInput.status ? { status: clueInput.status } : {}) }
              : c
          )
          statChanges.push({ type: 'new', label: `Clue updated: ${clueInput.title || clueInput.content.slice(0, 35) + '...'}` })
        } else {
          const clueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          notebook.clues = [...notebook.clues, {
            id: clueId, title: clueInput.title, content: clueInput.content, source: clueInput.source, tags: clueInput.tags,
            discoveredChapter: updated.meta.chapterNumber, connectionIds: [], isRedHerring: clueInput.is_red_herring ?? false,
          }]
          statChanges.push({ type: 'new', label: `Clue: ${clueInput.title || clueInput.content.slice(0, 40) + '...'}` })
        }
      }

      if (clueInput.thread_title && !notebook.activeThreadTitle) {
        notebook.activeThreadTitle = clueInput.thread_title
      }
      world.notebook = notebook
    }
  }

  // ── Notebook: connections ──
  if (input.connect_clues && world.notebook) {
    for (const connInput of input.connect_clues) {
      const notebook: Notebook = { ...world.notebook! }

      // Update existing connection by ID
      if (connInput.connection_id) {
        const idx = notebook.connections.findIndex(c => c.id === connInput.connection_id)
        if (idx >= 0) {
          notebook.connections = notebook.connections.map((c, i) =>
            i === idx ? {
              ...c,
              ...(connInput.title ? { title: connInput.title } : {}),
              ...(connInput.revelation ? { revelation: connInput.revelation } : {}),
              ...(connInput.status ? { status: connInput.status } : {}),
              ...(connInput.source_ids ? { sourceIds: connInput.source_ids } : {}),
            } : c
          )
          statChanges.push({ type: 'neutral', label: `Connection updated: ${connInput.title || notebook.connections[idx].title}` })
        }
        world.notebook = notebook
        continue
      }

      // New connection — source_ids required
      if (!connInput.source_ids || connInput.source_ids.length === 0) continue
      const sourceIds = connInput.source_ids

      const sourceIsConnection = sourceIds.map(id => notebook.connections.some(c => c.id === id))
      const hasConnectionSource = sourceIsConnection.some(Boolean)
      const allConnectionSources = sourceIsConnection.every(Boolean)
      let tier: 'lead' | 'breakthrough' = 'lead'
      if (allConnectionSources) {
        tier = 'breakthrough'
      } else if (hasConnectionSource) {
        const anyBreakthrough = sourceIds.some(id => {
          const conn = notebook.connections.find(c => c.id === id)
          return conn?.tier === 'breakthrough'
        })
        tier = anyBreakthrough ? 'breakthrough' : 'lead'
      }

      const tainted = sourceIds.some(id => {
        const clue = notebook.clues.find(c => c.id === id)
        if (clue) return clue.isRedHerring
        const conn = notebook.connections.find(c => c.id === id)
        return conn?.tainted ?? false
      })

      const normTitle = (s: string) => s.replace(/[^a-z0-9 ]/gi, '').toLowerCase().trim()
      const existingIdx = notebook.connections.findIndex(c =>
        normTitle(c.title) === normTitle(connInput.title) ||
        (sourceIds.length > 0 && sourceIds.every(id => c.sourceIds.includes(id)) && c.sourceIds.every(id => sourceIds.includes(id)))
      )

      const connId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

      if (existingIdx >= 0) {
        notebook.connections = notebook.connections.map((c, i) =>
          i === existingIdx ? { ...c, sourceIds, title: connInput.title, revelation: connInput.revelation ?? c.revelation, tier, tainted, ...(connInput.status ? { status: connInput.status } : {}) } : c
        )
        statChanges.push({ type: 'neutral', label: `Connection updated: ${connInput.title}` })
      } else {
        notebook.connections = [...notebook.connections, {
          id: connId,
          sourceIds,
          title: connInput.title,
          revelation: connInput.revelation ?? '',
          tier,
          tainted,
          ...(connInput.status ? { status: connInput.status } : {}),
        }]
        statChanges.push({ type: 'new', label: tier === 'breakthrough' ? `Breakthrough: ${connInput.title}` : `Lead: ${connInput.title}` })
      }

      const finalConnId = existingIdx >= 0 ? notebook.connections[existingIdx].id : connId
      notebook.clues = notebook.clues.map(c =>
        sourceIds.includes(c.id)
          ? { ...c, connectionIds: [...new Set([...c.connectionIds, finalConnId])] }
          : c
      )

      // Deduplicate connections by normalized title
      const seen = new Map<string, number>()
      notebook.connections = notebook.connections.filter((c, i) => {
        const key = normTitle(c.title)
        if (!seen.has(key)) { seen.set(key, i); return true }
        const prevIdx = seen.get(key)!
        if (c.status && !notebook.connections[prevIdx].status) {
          notebook.connections[prevIdx] = c
          return false
        }
        return false
      })

      world.notebook = notebook
    }
  }

  return { ...updated, world }
}

function applyCombatChanges(
  input: NonNullable<CommitTurnInput['combat']>,
  updated: GameState,
  statChanges: StatChange[],
): GameState {
  if (input.start) {
    // Map snake_case attack_bonus to camelCase attackBonus
    const enemies = input.start.enemies.map(e => ({
      ...e,
      attackBonus: e.attack_bonus ?? (e as unknown as Enemy).attackBonus ?? 0,
    }))
    updated = {
      ...updated,
      combat: {
        active: true,
        round: 1,
        enemies,
        log: [input.start.description],
      },
    }
    statChanges.push({ type: 'new', label: 'Combat started' })
  }

  if (input.end) {
    if (input.end.loot && input.end.loot.length > 0) {
      const char = { ...updated.character }
      const items: InventoryItem[] = input.end.loot.map(item => ({
        ...item,
        maxCharges: item.max_charges ?? item.maxCharges,
      }))
      char.inventory = [...char.inventory, ...items]
      items.forEach((item) => statChanges.push({ type: 'gain', label: `Looted: ${item.name}` }))
      updated = { ...updated, character: char }
    }
    if (input.end.credits_gained) {
      const char = { ...updated.character, credits: updated.character.credits + input.end.credits_gained }
      statChanges.push({ type: 'gain', label: `+${input.end.credits_gained}cr` })
      updated = { ...updated, character: char }
    }
    updated = {
      ...updated,
      combat: { active: false, round: 0, enemies: [], log: [] },
    }
    statChanges.push({ type: 'neutral', label: `Combat: ${input.end.outcome}` })
  }

  return updated
}

function applyNarrativeChanges(
  input: CommitTurnInput,
  updated: GameState,
  statChanges: StatChange[],
  trackEvent?: (name: string, data: Record<string, string | number | boolean>) => void,
): GameState {
  if (input.chapter_frame) {
    updated = {
      ...updated,
      chapterFrame: { objective: input.chapter_frame.objective, crucible: input.chapter_frame.crucible },
    }
  }

  if (input.signal_close) {
    updated = {
      ...updated,
      meta: {
        ...updated.meta,
        closeReady: true,
        closeReason: input.signal_close.reason,
        ...(input.signal_close.self_assessment && { selfAssessment: input.signal_close.self_assessment }),
      },
    }
  }

  if (input.close_chapter) {
    const ci = input.close_chapter
    const currentNum = updated.meta.chapterNumber
    trackEvent?.('chapter_completed', { chapter: currentNum, genre: updated.meta.genre })
    const completedChapter = {
      ...updated.history.chapters.find((ch) => ch.number === currentNum) ?? {
        number: currentNum,
        title: updated.meta.chapterTitle,
        keyEvents: [],
      },
      status: 'complete' as const,
      summary: ci.summary,
      keyEvents: ci.key_events,
    }
    const nextNum = currentNum + 1
    const nextChapter = {
      number: nextNum,
      title: ci.next_title,
      status: 'in-progress' as const,
      summary: '',
      keyEvents: [],
    }
    updated = {
      ...updated,
      meta: {
        ...updated.meta,
        chapterNumber: nextNum,
        chapterTitle: ci.next_title,
        closeReady: false,
        closeReason: undefined,
        selfAssessment: undefined,
      },
      chapterFrame: null,
      storySummary: null,
      sceneSummaries: [],
      scopeSignals: 0,
      npcFailures: [],
      counters: resetChapterCounters(updated).counters,  // reset per-chapter counters, preserve persistent ones
      history: {
        ...updated.history,
        chapters: [
          ...updated.history.chapters.filter((ch) => ch.number !== currentNum),
          { ...completedChapter, messages: updated.history.messages },
          nextChapter,
        ],
        messages: [],
        rollLog: [],
      },
      world: updated.world.antagonist
        ? { ...updated.world, antagonist: { ...updated.world.antagonist, movedThisChapter: false } }
        : updated.world,
    }
    statChanges.push({ type: 'neutral', label: `Chapter ${nextNum}: ${ci.next_title}` })
  }

  if (input.debrief) {
    const chapters = updated.history.chapters.map((ch) =>
      ch.status === 'complete' && !ch.debrief
        ? { ...ch, debrief: input.debrief }
        : ch
    )
    updated = { ...updated, history: { ...updated.history, chapters } }
    statChanges.push({ type: 'new', label: 'Chapter debrief ready' })
  }

  // Pivotal scenes (close prompt curation)
  if (input.pivotal_scenes) {
    const scenes = input.pivotal_scenes
    const existing = updated.pivotalScenes ?? []
    const newScenes = scenes.map(s => ({
      title: s.title,
      text: s.text,
      chapter: updated.meta.chapterNumber,
    }))
    // Cap at 8 total, keep newest
    updated = {
      ...updated,
      pivotalScenes: [...existing, ...newScenes].slice(-8),
    }
  }

  // Arc updates
  if (input.arc_updates) {
    const au = input.arc_updates
    let arcs = [...(updated.arcs ?? [])]

    if (au.create_arc) {
      const existing = arcs.find(a => a.id === au.create_arc!.id)
      if (!existing) {
        arcs.push({
          id: au.create_arc.id,
          title: au.create_arc.title,
          status: 'active',
          episodes: au.create_arc.episodes.map((milestone, i) => ({
            chapter: updated.meta.chapterNumber,
            milestone,
            status: i === 0 ? 'active' as const : 'pending' as const,
          })),
        })
      }
    }

    if (au.advance_episode) {
      arcs = arcs.map(a => {
        if (a.id !== au.advance_episode!.arc_id) return a
        let foundActive = false
        let activatedNext = false
        const episodes = a.episodes.map(ep => {
          if (ep.status === 'active' && !foundActive) {
            foundActive = true
            return { ...ep, status: 'complete' as const, summary: au.advance_episode!.summary }
          }
          if (foundActive && ep.status === 'pending' && !activatedNext) {
            activatedNext = true
            return { ...ep, status: 'active' as const, chapter: updated.meta.chapterNumber }
          }
          return ep
        })
        return { ...a, episodes }
      })
    }

    if (au.resolve_arc) {
      arcs = arcs.map(a =>
        a.id === au.resolve_arc!.arc_id ? { ...a, status: 'resolved' as const } : a
      )
    }

    if (au.abandon_arc) {
      arcs = arcs.map(a =>
        a.id === au.abandon_arc!.arc_id ? { ...a, status: 'abandoned' as const } : a
      )
    }

    if (au.add_episode) {
      arcs = arcs.map(a => {
        if (a.id !== au.add_episode!.arc_id) return a
        return {
          ...a,
          episodes: [...a.episodes, {
            chapter: updated.meta.chapterNumber,
            milestone: au.add_episode!.milestone,
            status: 'pending' as const,
          }],
        }
      })
    }

    updated = { ...updated, arcs }
  }

  return updated
}

// ============================================================
// Main entry point — unchanged signature
// ============================================================

/**
 * Pure state transformation: applies an array of tool call results to the current
 * game state, producing a new state and a list of stat changes for the UI.
 * Returns the updated state with an optional `_sceneBreaks` array for scene transition headers.
 */
export function applyToolResults(
  results: ToolCallResult[],
  currentState: GameState,
  statChanges: StatChange[],
  trackEvent?: (name: string, data: Record<string, string | number | boolean>) => void,
): GameState & { _sceneBreaks?: string[] } {
  let updated = { ...currentState }
  const sceneBreaks: string[] = []
  const creditChangesThisBatch: number[] = []
  const ledgerEntriesThisBatch: string[] = []

  for (const result of results) {
    // ── commit_turn: the single game tool ──
    if (result.tool === 'commit_turn') {
      const input = result.input as unknown as CommitTurnInput

      if (input.character) {
        updated = applyCharacterChanges(input.character, updated, statChanges, creditChangesThisBatch)
      }
      if (input.world) {
        updated = applyWorldChanges(input.world, updated, statChanges, sceneBreaks, ledgerEntriesThisBatch)
      }
      if (input.combat) {
        updated = applyCombatChanges(input.combat, updated, statChanges)
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
