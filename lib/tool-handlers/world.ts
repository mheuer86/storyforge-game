import type { GameState, DispositionTier, AntagonistMove, CohesionLogEntry, TensionClock, Notebook } from '../types'
import { dbg, type CommitTurnInput, type StatChange } from '../tool-processor'
import { findNpcByName } from '../npc-utils'

export function applyWorldChanges(
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
      const existing = findNpcByName(world.npcs, npc.name)
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
        // Derive initial faction stance from the NPC's disposition
        const stanceFromDisposition: Record<DispositionTier, string> = {
          trusted: 'Allied', favorable: 'Friendly', neutral: 'Neutral',
          wary: 'Wary', hostile: 'Hostile',
        }
        const initialStance = stanceFromDisposition[(npc.disposition ?? 'neutral') as DispositionTier] ?? 'Neutral'
        world.factions = [...world.factions, { name: npc.affiliation, stance: initialStance }]
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
      const matched = findNpcByName(world.npcs, n.name)
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
      // Auto-detect witness marks from content if Claude didn't flag it
      const isWitnessed = input.add_decision.witnessed || (() => {
        if (input.add_decision!.category !== 'moral') return false
        const text = (input.add_decision!.summary + ' ' + input.add_decision!.context).toLowerCase()
        return /\b(witness|saw|watched|heard.*nothing|said nothing|looked away|didn.t intervene|didn.t stop|let it happen|child taken|child.*test|burned resonant|forged record|suppressing.*attunement)\b/.test(text)
      })()
      if (isWitnessed) {
        dbg('WITNESS_MARK auto-detected: ' + input.add_decision.summary)
      }

      // Origin counter auto-tick: moral decisions tick by default, enforcement language reverses direction
      {
        const species = updated.character.species
        const text = (input.add_decision!.summary + ' ' + input.add_decision!.context).toLowerCase()
        const isMoral = input.add_decision!.category === 'moral'

        // Enforcement language: complying, executing orders, delivering someone, following through without resistance
        const enforcePattern = /\b(took.*from|deliver|hand.*over|turn.*in|executed|enforc|comply|followed.*order|carried out|filed.*charge|formally.*charg|detained|assessed|completed.*duty|didn.t look back|without hesitation|signed.*over|reported|surrendered|obeyed|submitted|cooperat(?:ed|ing))\b/

        const counterMaps: Record<string, Record<string, string>> = {
          'epic-scifi': {
            'Synod': 'doubt', 'Heretic': 'doubt',
            'Minor House': 'standing', 'Stricken': 'standing', 'Entrenched': 'standing',
            'Undrift': 'exposure', 'Hunted': 'exposure', 'Imperial Service': 'mandate', 'Dissident': 'mandate',
            'Spent Resonant': 'embers', 'Rekindled': 'embers',
          },
          'noire': {
            'PI': 'compromise', 'Compromised': 'compromise',
            'The Machine': 'complicity', 'Entangled': 'complicity',
            'Criminal': 'notoriety', 'Marked': 'notoriety',
            'Enforcer': 'numbness', 'Cold': 'numbness',
            'Reporter': 'leverage', 'Exposed': 'leverage',
          },
          'cyberpunk': {
            'Operative': 'debt', 'Owned': 'debt',
            'Fixer': 'exposure', 'Burned': 'exposure',
            'Ripperdoc': 'conscience', 'Hollowed': 'conscience',
            'Corporate': 'complicity', 'Apparatus': 'complicity',
            'Unplugged': 'compromise', 'Compromised': 'compromise',
          },
          'space-opera': {
            'Human': 'isolation', 'Untethered': 'isolation',
            'Vrynn': 'signal_debt', 'Severed': 'signal_debt',
            'Korath': 'compromise', 'The Diplomat': 'compromise',
            'Sylphari': 'detachment', 'The Observer': 'detachment',
            'Zerith': 'reputation', 'Marked': 'reputation',
          },
          'fantasy': {
            'Human': 'ambition', 'Climber': 'ambition',
            'Elf': 'withdrawal', 'Watcher': 'withdrawal',
            'Dwarf': 'oath_weight', 'Bound': 'oath_weight',
            'Halfling': 'visibility', 'Named': 'visibility',
            'Dragonkin': 'inheritance', 'Vessel': 'inheritance',
          },
          'grimdark': {
            'House Veldran': 'ledger', 'Climber': 'ledger',
            'House Sylvara': 'paralysis', 'Watcher': 'paralysis',
            'House Stonemark': 'rigidity', 'Bound': 'rigidity',
            'The Oathless': 'survival_debt', 'Named': 'survival_debt',
            'House Ashfang': 'wrath', 'Vessel': 'wrath',
            'Pale Flame': 'zeal', 'The Pious': 'zeal',
          },
        }
        const counterMap = counterMaps[updated.meta?.genre || ''] || {}

        const counterName = counterMap[species]
        if (counterName && isMoral) {
          const hasEnforce = enforcePattern.test(text)

          if (hasEnforce) {
            // Moral decision with enforcement language → counter DOWN (min 0)
            const counters = { ...(updated.counters || {}) }
            counters[counterName] = Math.max(0, (counters[counterName] || 0) - 1)
            updated = { ...updated, counters }
            dbg(`ORIGIN_COUNTER ${counterName} DOWN to ${counters[counterName]} (enforce: ${species})`)
          } else {
            // Moral decision without enforcement → counter UP (default)
            const counters = { ...(updated.counters || {}) }
            counters[counterName] = (counters[counterName] || 0) + 1
            updated = { ...updated, counters }
            dbg(`ORIGIN_COUNTER ${counterName} UP to ${counters[counterName]} (moral: ${species})`)
          }
          // Non-moral decisions don't auto-tick — use origin_event for those
        }
      }
      const newDecision = { ...input.add_decision, status: 'active' as const, chapter: chapterNum, ...(isWitnessed && { witnessed: true }) }
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
      world.operationState = mapped as import('../types').OperationState
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
      // Deduplicate: remove unexplored rooms that fuzzy-match any explored room name.
      // Claude often adds variants like "Command Deck (Upper)" unexplored while "Command Deck" is explored.
      const exploredNames = e.explored.map(r => r.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim())
      const dedupedUnexplored = e.unexplored.filter(u => {
        const normalizedName = u.name.toLowerCase().replace(/\s*\(.*?\)\s*/g, '').trim()
        return !exploredNames.some(en => en === normalizedName || en.includes(normalizedName) || normalizedName.includes(en))
      })
      world.explorationState = {
        facilityName: e.facility_name,
        status: e.status,
        hostile: e.hostile,
        explored: e.explored,
        current: e.current,
        unexplored: dedupedUnexplored,
        resources: e.resources,
        alertLevel: e.alert_level,
      } as import('../types').ExplorationState
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
        const contentLower = clueInput.content.toLowerCase().slice(0, 40)
        const duplicate = titleLower ? notebook.clues.find(c => {
          const existingTitle = (c.title || '').toLowerCase()
          // Exact title match, or title substring match (first 20 chars), or content overlap
          return existingTitle === titleLower
            || (existingTitle.length > 5 && titleLower.length > 5 && (existingTitle.includes(titleLower.slice(0, 20)) || titleLower.includes(existingTitle.slice(0, 20))))
            || (c.content.toLowerCase().slice(0, 40) === contentLower && contentLower.length > 10)
        }) : null
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
      const anyBreakthroughSource = sourceIds.some(id => {
        const conn = notebook.connections.find(c => c.id === id)
        return conn?.tier === 'breakthrough'
      })
      let tier: 'lead' | 'enriched' | 'breakthrough' = 'lead'
      if (anyBreakthroughSource) {
        // Breakthrough + anything → breakthrough (deeper breakthrough)
        tier = 'breakthrough'
      } else if (allConnectionSources) {
        // Lead + Lead → breakthrough
        tier = 'breakthrough'
      } else if (hasConnectionSource) {
        // Lead + Clue → enriched lead
        tier = 'enriched'
      }
      // Clue + Clue → lead (default)

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
        const tierLabel = tier === 'breakthrough' ? 'Breakthrough' : tier === 'enriched' ? 'Enriched Lead' : 'Lead'
        statChanges.push({ type: 'new', label: `${tierLabel}: ${connInput.title}` })
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
