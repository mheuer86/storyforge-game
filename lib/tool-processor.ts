import type { GameState, ToolCallResult, Enemy, InventoryItem, TempModifier, AntagonistMove, CohesionLogEntry, UpdateShipInput, ChapterDebrief, DispositionTier, TensionClock, RollRecord, RollBreakdown } from './types'

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
  // Track credit changes within this batch to detect duplicates
  const creditChangesThisBatch: number[] = []
  const ledgerEntriesThisBatch: string[] = []

  for (const result of results) {
    if (result.tool === 'update_character') {
      const input = result.input as {
        hpChange?: number
        hpSet?: number
        creditsChange?: number
        inventoryAdd?: InventoryItem[]
        inventoryRemove?: string[]
        inventoryUse?: { id: string; setCharges?: number }
        tempModifierAdd?: TempModifier
        tempModifierRemove?: string
        traitUpdate?: { name: string; usesRemaining: number }
        levelUp?: { newLevel: number; hpIncrease: number; newProficiencyBonus?: number }
        addProficiency?: string
        upgradeToExpertise?: string
      }

      const char = { ...updated.character }

      if (input.hpChange !== undefined) {
        const newHp = Math.max(0, Math.min(char.hp.max, char.hp.current + input.hpChange))
        if (input.hpChange < 0) {
          statChanges.push({ type: 'loss', label: `HP ${char.hp.current} → ${newHp}` })
        } else if (input.hpChange > 0) {
          statChanges.push({ type: 'gain', label: `HP ${char.hp.current} → ${newHp}` })
        }
        char.hp = { ...char.hp, current: newHp }
      }

      if (input.hpSet !== undefined) {
        const newHp = Math.max(0, Math.min(char.hp.max, input.hpSet))
        statChanges.push({ type: newHp < char.hp.current ? 'loss' : 'gain', label: `HP → ${newHp}` })
        char.hp = { ...char.hp, current: newHp }
      }

      if (input.creditsChange !== undefined) {
        // Reject duplicate credit changes within the same batch
        if (creditChangesThisBatch.includes(input.creditsChange)) {
          dbg('DUPLICATE credit change rejected: ' + input.creditsChange)
        } else {
          creditChangesThisBatch.push(input.creditsChange)
          const newCredits = char.credits + input.creditsChange
          if (input.creditsChange < 0) {
            statChanges.push({ type: 'loss', label: `${char.credits}cr → ${newCredits}cr` })
          } else {
            statChanges.push({ type: 'gain', label: `+${input.creditsChange}cr` })
          }
          char.credits = newCredits
        }
      }

      if (input.inventoryAdd) {
        char.inventory = [...char.inventory, ...input.inventoryAdd]
        input.inventoryAdd.forEach((item) => {
          statChanges.push({ type: 'new', label: `+${item.name}` })
        })
      }

      if (input.inventoryRemove) {
        const removedIds = new Set(input.inventoryRemove)
        char.inventory = char.inventory.filter((item) => !removedIds.has(item.id))
      }

      if (input.inventoryUse) {
        const useId = input.inventoryUse.id.toLowerCase()
        let matched = false
        char.inventory = char.inventory.map((item) => {
          // Match by ID or name — exact, startsWith, or slug variants
          const id = item.id.toLowerCase()
          const name = item.name.toLowerCase()
          const slug = name.replace(/\s+/g, '_')
          const matchById = id === useId || id.startsWith(useId) || useId.startsWith(id)
          const matchByName = name === useId || name.startsWith(useId) || slug === useId || slug.startsWith(useId)
          if ((matchById || matchByName) && !matched) {
            matched = true
            if (item.charges !== undefined) {
              const newCharges = input.inventoryUse!.setCharges !== undefined
                ? Math.max(0, input.inventoryUse!.setCharges)
                : Math.max(0, item.charges - 1)
              if (newCharges === item.charges) return item // no change
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

      if (input.tempModifierAdd) {
        char.tempModifiers = [...char.tempModifiers, input.tempModifierAdd]
        statChanges.push({ type: 'new', label: `Effect: ${input.tempModifierAdd.name}` })
      }

      if (input.tempModifierRemove) {
        char.tempModifiers = char.tempModifiers.filter((m) => m.id !== input.tempModifierRemove)
      }

      if (input.traitUpdate) {
        char.traits = char.traits.map((t) =>
          t.name === input.traitUpdate!.name
            ? { ...t, usesRemaining: input.traitUpdate!.usesRemaining }
            : t
        )
      }

      if (input.levelUp) {
        const { newLevel, hpIncrease, newProficiencyBonus } = input.levelUp
        const newMax = char.hp.max + hpIncrease
        statChanges.push({ type: 'gain', label: `Level ${newLevel}! HP max +${hpIncrease}` })
        char.level = newLevel
        char.hp = { max: newMax, current: newMax }
        if (newProficiencyBonus !== undefined) {
          char.proficiencyBonus = newProficiencyBonus
          statChanges.push({ type: 'gain', label: `Proficiency +${newProficiencyBonus}` })
        }
      }

      if ((input as Record<string, unknown>).statIncrease) {
        const increases = (input as Record<string, unknown>).statIncrease as { stat: string; amount: number }[]
        const newStats = { ...char.stats }
        for (const inc of increases) {
          const key = inc.stat as keyof typeof newStats
          if (key in newStats) {
            newStats[key] += inc.amount
            statChanges.push({ type: 'gain', label: `${inc.stat} +${inc.amount} → ${newStats[key]}` })
          }
        }
        char.stats = newStats
      }

      if (input.addProficiency) {
        if (!char.proficiencies.includes(input.addProficiency)) {
          char.proficiencies = [...char.proficiencies, input.addProficiency]
          statChanges.push({ type: 'new', label: `Proficiency: ${input.addProficiency}` })
        }
      }

      if (input.upgradeToExpertise) {
        const expertiseLabel = `${input.upgradeToExpertise} (expertise)`
        char.proficiencies = char.proficiencies.map((p) =>
          p === input.upgradeToExpertise ? expertiseLabel : p
        )
        if (!char.proficiencies.includes(expertiseLabel)) {
          char.proficiencies = [...char.proficiencies, expertiseLabel]
        }
        statChanges.push({ type: 'gain', label: `Expertise: ${input.upgradeToExpertise}` })
      }

      if ((input as Record<string, unknown>).spendInspiration) {
        char.inspiration = false
        statChanges.push({ type: 'loss', label: 'Used Inspiration' })
      }

      if ((input as Record<string, unknown>).exhaustionChange !== undefined) {
        const change = (input as Record<string, unknown>).exhaustionChange as number
        const prev = char.exhaustion ?? 0
        char.exhaustion = Math.max(0, Math.min(6, prev + change))
        if (change > 0) {
          const labels = ['', 'Exhaustion 1: disadvantage on checks', 'Exhaustion 2: slowed', 'Exhaustion 3: disadvantage on attacks/saves', 'Exhaustion 4: HP halved', 'Exhaustion 5: immobilized', 'Exhaustion 6: death']
          statChanges.push({ type: 'loss', label: labels[char.exhaustion] || `Exhaustion ${char.exhaustion}` })
        } else {
          statChanges.push({ type: 'gain', label: char.exhaustion === 0 ? 'Exhaustion cleared' : `Exhaustion reduced to ${char.exhaustion}` })
        }
      }

      updated = { ...updated, character: char }
    }

    if (result.tool === 'start_combat') {
      const input = result.input as { enemies: Enemy[]; description: string }
      updated = {
        ...updated,
        combat: {
          active: true,
          round: 1,
          enemies: input.enemies,
          log: [input.description],
        },
      }
      statChanges.push({ type: 'new', label: 'Combat started' })
    }

    if (result.tool === 'end_combat') {
      const input = result.input as {
        outcome: string
        loot?: InventoryItem[]
        creditsGained?: number
      }
      if (input.loot && input.loot.length > 0) {
        const char = { ...updated.character }
        char.inventory = [...char.inventory, ...input.loot]
        input.loot.forEach((item) => statChanges.push({ type: 'gain', label: `Looted: ${item.name}` }))
        updated = { ...updated, character: char }
      }
      if (input.creditsGained) {
        const char = { ...updated.character, credits: updated.character.credits + input.creditsGained }
        statChanges.push({ type: 'gain', label: `+${input.creditsGained}cr` })
        updated = { ...updated, character: char }
      }
      updated = {
        ...updated,
        combat: { active: false, round: 0, enemies: [], log: [] },
      }
      statChanges.push({ type: 'neutral', label: `Combat: ${input.outcome}` })
    }

    if (result.tool === 'update_world') {
      dbg('update_world keys: ' + Object.keys(result.input as object).join(', '))
      const input = result.input as {
        addNpcs?: { name: string; description: string; lastSeen: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; vulnerability?: string; disposition?: DispositionTier; affiliation?: string }[]
        updateNpc?: { name: string; description?: string; lastSeen?: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; disposition?: DispositionTier; affiliation?: string }
        setLocation?: { name: string; description: string }
        addThread?: { id: string; title: string; status: string; deteriorating: boolean }
        updateThread?: { id: string; title?: string; status: string; deteriorating?: boolean }
        updateThreads?: { id: string; title?: string; status: string; deteriorating?: boolean }[]
        addFaction?: { name: string; stance: string }
        addPromise?: { id: string; to: string; what: string; status: 'open' | 'strained' | 'fulfilled' | 'broken' }
        updatePromise?: { id?: string; to?: string; status: 'open' | 'strained' | 'fulfilled' | 'broken'; what?: string }
        addDecision?: { id: string; summary: string; context: string; category: 'moral' | 'tactical' | 'strategic' | 'relational' }
        updateDecision?: { id: string; status: 'active' | 'superseded' | 'abandoned'; reason?: string }
        setCurrentTime?: string
        setSceneSnapshot?: string
        setOperationState?: import('./types').OperationState | null
        setExplorationState?: import('./types').ExplorationState | null
        addTimer?: { id: string; description: string; deadline: string }
        updateTimer?: { id: string; status: 'active' | 'expired' | 'completed' }
        updateHeat?: { faction: string; level: 'none' | 'low' | 'medium' | 'high' | 'critical'; reason: string }
        addLedgerEntry?: { amount: number; description: string; day: string }
      }
      const world = { ...updated.world }

      if (input.addNpcs) {
        for (const n of input.addNpcs) {
          const nameLower = n.name.toLowerCase()
          const existing = world.npcs.find((x) => {
            const xLower = x.name.toLowerCase()
            return xLower === nameLower || xLower.startsWith(nameLower) || nameLower.startsWith(xLower)
          })
          if (existing) {
            const canonical = existing.name.length <= n.name.length ? existing.name : n.name
            world.npcs = world.npcs.map((x) =>
              x.name === existing.name ? { ...x, ...n, name: canonical } : x
            )
          } else {
            world.npcs = [...world.npcs, n]
            statChanges.push({ type: 'new', label: `Met: ${n.name}` })
          }
          // Auto-create faction if affiliation is set and faction doesn't exist yet
          if (n.affiliation && !world.factions.some((f) => f.name === n.affiliation)) {
            world.factions = [...world.factions, { name: n.affiliation, stance: 'Unknown' }]
          }
        }
      }
      if (input.updateNpc) {
        dbg('updateNpc: ' + JSON.stringify(input.updateNpc))
        dbg('existing npcs: ' + world.npcs.map(n => `${n.name}|${n.status ?? 'active'}`).join(', '))
        const updateName = input.updateNpc.name.toLowerCase()
        const matched = world.npcs.find((n) => {
          const nLower = n.name.toLowerCase()
          return nLower === updateName || nLower.startsWith(updateName) || updateName.startsWith(nLower)
        })
        dbg('matched npc: ' + (matched ? matched.name : 'NONE'))
        if (matched) {
          world.npcs = world.npcs.map((n) =>
            n.name === matched.name ? { ...n, ...input.updateNpc } : n
          )
          dbg('npc after update: ' + JSON.stringify(world.npcs.find(n => n.name === matched.name)?.status))
        }
        // Auto-create faction if affiliation is set and faction doesn't exist yet
        if (input.updateNpc.affiliation && !world.factions.some((f) => f.name === input.updateNpc!.affiliation)) {
          world.factions = [...world.factions, { name: input.updateNpc.affiliation, stance: 'Unknown' }]
        }
      }
      if (input.setCurrentTime) {
        world.currentTime = input.setCurrentTime
      }
      if (input.setLocation) {
        world.currentLocation = input.setLocation
        const timeStr = input.setCurrentTime || world.currentTime
        const sceneLabel = timeStr ? `${input.setLocation.name} · ${timeStr}` : input.setLocation.name
        sceneBreaks.push(sceneLabel)
      }
      if (input.setSceneSnapshot) {
        world.sceneSnapshot = input.setSceneSnapshot
      }
      if (input.addThread) {
        const existingThread = world.threads.find((t) => t.title === input.addThread!.title)
        if (existingThread) {
          world.threads = world.threads.map((t) =>
            t.title === input.addThread!.title ? { ...t, ...input.addThread } : t
          )
        } else {
          world.threads = [...world.threads, input.addThread]
          statChanges.push({ type: 'new', label: `Thread: ${input.addThread.title}` })
        }
      }
      // Helper: match thread by id first, fall back to title
      const matchThread = (t: { id: string; title: string }, update: { id: string; title?: string }) =>
        t.id === update.id || (update.title && t.title.toLowerCase() === update.title.toLowerCase())

      if (input.updateThread) {
        dbg('updateThread: ' + JSON.stringify(input.updateThread))
        dbg('existing threads: ' + world.threads.map(t => `${t.id}|${t.title}|${t.status}`).join(', '))
        const before = world.threads.map(t => t.status)
        world.threads = world.threads.map((t) =>
          matchThread(t, input.updateThread!) ? { ...t, ...input.updateThread } : t
        )
        const after = world.threads.map(t => t.status)
        dbg('thread status before/after: ' + before.join(',') + ' -> ' + after.join(','))
      }
      if (input.updateThreads) {
        dbg('updateThreads: ' + JSON.stringify(input.updateThreads))
        for (const update of input.updateThreads) {
          world.threads = world.threads.map((t) =>
            matchThread(t, update) ? { ...t, ...update } : t
          )
        }
      }
      if (input.addFaction) {
        const exists = world.factions.find((f) => f.name === input.addFaction!.name)
        if (exists) {
          world.factions = world.factions.map((f) =>
            f.name === input.addFaction!.name ? { ...f, stance: input.addFaction!.stance } : f
          )
        } else {
          world.factions = [...world.factions, input.addFaction]
        }
      }
      if (input.addPromise) {
        const existingPromise = world.promises.find((p) => p.id === input.addPromise!.id || (p.to === input.addPromise!.to && p.what === input.addPromise!.what))
        if (existingPromise) {
          world.promises = world.promises.map((p) =>
            p === existingPromise ? { ...p, ...input.addPromise } : p
          )
        } else {
          world.promises = [...world.promises, input.addPromise]
          statChanges.push({ type: 'new', label: `Promise to ${input.addPromise.to}` })
        }
      }
      if (input.updatePromise) {
        const up = input.updatePromise
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
      if (input.addDecision) {
        const decisions = world.decisions || []
        const existing = decisions.find(d => d.id === input.addDecision!.id)
        if (existing) {
          world.decisions = decisions.map(d =>
            d.id === input.addDecision!.id ? { ...d, summary: input.addDecision!.summary, context: input.addDecision!.context, category: input.addDecision!.category } : d
          )
        } else {
          const chapterNum = updated.meta?.chapterNumber ?? 1
          const newDecision = { ...input.addDecision, status: 'active' as const, chapter: chapterNum }
          // Auto-archive oldest active if at cap (8)
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
          statChanges.push({ type: 'new', label: `Decision: ${input.addDecision.summary}` })
        }
      }
      if (input.updateDecision) {
        const ud = input.updateDecision
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
      if (input.setExplorationState !== undefined) {
        world.explorationState = input.setExplorationState
        if (input.setExplorationState) {
          statChanges.push({ type: 'new', label: `Exploring: ${input.setExplorationState.facilityName}` })
        } else {
          statChanges.push({ type: 'neutral', label: 'Exited facility' })
        }
      }
      if (input.addTimer) {
        world.timers = [...(world.timers || []), { ...input.addTimer, status: 'active' as const }]
        statChanges.push({ type: 'new', label: `Timer: ${input.addTimer.description}` })
      }
      if (input.updateTimer) {
        const timerDesc = (world.timers || []).find(t => t.id === input.updateTimer!.id)?.description || input.updateTimer.id
        world.timers = (world.timers || []).map(t =>
          t.id === input.updateTimer!.id ? { ...t, status: input.updateTimer!.status } : t
        )
        statChanges.push({ type: 'neutral', label: `Timer ${input.updateTimer.status}: ${timerDesc}` })
      }
      if (input.updateHeat) {
        const existing = (world.heat || []).find(h => h.faction === input.updateHeat!.faction)
        if (existing) {
          world.heat = world.heat.map(h =>
            h.faction === input.updateHeat!.faction
              ? { ...h, level: input.updateHeat!.level, reasons: [...h.reasons, input.updateHeat!.reason] }
              : h
          )
        } else {
          world.heat = [...(world.heat || []), { faction: input.updateHeat.faction, level: input.updateHeat.level, reasons: [input.updateHeat.reason] }]
        }
        const label = input.updateHeat.level === 'none' ? 'Heat cleared' : `Heat: ${input.updateHeat.faction} → ${input.updateHeat.level}`
        statChanges.push({ type: input.updateHeat.level === 'critical' ? 'loss' : 'neutral', label })
      }
      if (input.addLedgerEntry) {
        const ledgerKey = `${input.addLedgerEntry.amount}:${input.addLedgerEntry.description}`
        // Also check against existing ledger for cross-turn duplicates
        const existingDupe = (world.ledger || []).some(e =>
          e.amount === input.addLedgerEntry!.amount && e.description === input.addLedgerEntry!.description
        )
        if (ledgerEntriesThisBatch.includes(ledgerKey) || existingDupe) {
          dbg('DUPLICATE ledger entry rejected: ' + ledgerKey)
        } else {
          ledgerEntriesThisBatch.push(ledgerKey)
          world.ledger = [...(world.ledger || []), input.addLedgerEntry]
          const sign = input.addLedgerEntry.amount > 0 ? '+' : ''
          statChanges.push({ type: 'neutral', label: `${sign}${input.addLedgerEntry.amount} (${input.addLedgerEntry.description})` })
        }
      }
      if (input.setOperationState !== undefined) {
        if (input.setOperationState) {
          // Normalize objectives: accept plain strings or {text, status} objects
          const op = { ...input.setOperationState }
          op.objectives = (op.objectives || []).map(obj =>
            typeof obj === 'string'
              ? { text: obj, status: 'active' as const }
              : { text: obj.text, status: obj.status || 'active' }
          )
          op.assessments = op.assessments || []
          world.operationState = op
          statChanges.push({ type: 'new', label: `Op: ${op.name} [${op.phase}]` })
        } else {
          world.operationState = null
          statChanges.push({ type: 'neutral', label: 'Operation complete' })
        }
      }
      updated = { ...updated, world }
    }

    if (result.tool === 'set_chapter_frame') {
      const input = result.input as { objective: string; crucible: string }
      updated = {
        ...updated,
        chapterFrame: { objective: input.objective, crucible: input.crucible },
      }
      // Silent — no stat change shown to player
    }

    if (result.tool === 'signal_close_ready') {
      const input = result.input as { reason: string; selfAssessment?: string }
      updated = {
        ...updated,
        meta: {
          ...updated.meta,
          closeReady: true,
          closeReason: input.reason,
          ...(input.selfAssessment && { selfAssessment: input.selfAssessment }),
        },
      }
      // No stat change — the client handles the UI transition
    }

    if (result.tool === 'close_chapter') {
      const input = result.input as {
        summary: string
        keyEvents: string[]
        nextTitle: string
        resolutionMet?: string
        forwardHook?: string
      }
      const currentNum = updated.meta.chapterNumber
      trackEvent?.('chapter_completed', { chapter: currentNum, genre: updated.meta.genre })
      const completedChapter = {
        ...updated.history.chapters.find((ch) => ch.number === currentNum) ?? {
          number: currentNum,
          title: updated.meta.chapterTitle,
          keyEvents: [],
        },
        status: 'complete' as const,
        summary: input.summary,
        keyEvents: input.keyEvents,
      }
      const nextNum = currentNum + 1
      const nextChapter = {
        number: nextNum,
        title: input.nextTitle,
        status: 'in-progress' as const,
        summary: '',
        keyEvents: [],
      }
      updated = {
        ...updated,
        meta: {
          ...updated.meta,
          chapterNumber: nextNum,
          chapterTitle: input.nextTitle,
          closeReady: false,
          closeReason: undefined,
          selfAssessment: undefined,
        },
        chapterFrame: null,
        storySummary: null,  // reset for new chapter
        history: {
          ...updated.history,
          chapters: [
            ...updated.history.chapters.filter((ch) => ch.number !== currentNum),
            { ...completedChapter, messages: updated.history.messages },  // archive messages
            nextChapter,
          ],
          messages: [],  // clear for the new chapter
          rollLog: [],   // reset roll log for new chapter
        },
        world: updated.world.antagonist
          ? { ...updated.world, antagonist: { ...updated.world.antagonist, movedThisChapter: false } }
          : updated.world,
      }
      statChanges.push({ type: 'neutral', label: `Chapter ${nextNum}: ${input.nextTitle}` })
    }

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

    if (result.tool === 'update_antagonist') {
      const input = result.input as {
        action: 'establish' | 'move' | 'defeat'
        name?: string
        description?: string
        agenda?: string
        moveDescription?: string
        status?: 'defeated' | 'dead' | 'fled'
      }
      const world = { ...updated.world }

      if (input.action === 'establish' && input.name && input.description && input.agenda) {
        world.antagonist = {
          name: input.name,
          description: input.description,
          agenda: input.agenda,
          movedThisChapter: false,
          moves: [],
        }
        statChanges.push({ type: 'new', label: `Antagonist: ${input.name}` })
      }

      if (input.action === 'move' && world.antagonist && input.moveDescription) {
        const move: AntagonistMove = {
          chapterNumber: updated.meta.chapterNumber,
          description: input.moveDescription,
          timestamp: new Date().toISOString(),
        }
        world.antagonist = {
          ...world.antagonist,
          movedThisChapter: true,
          moves: [...world.antagonist.moves, move],
        }
        statChanges.push({ type: 'neutral', label: `Antagonist moves` })
      }

      if (input.action === 'defeat' && world.antagonist) {
        world.antagonist = {
          ...world.antagonist,
          status: input.status ?? 'defeated',
        }
        statChanges.push({ type: 'loss', label: `Antagonist ${input.status ?? 'defeated'}` })
      }

      updated = { ...updated, world }
    }

    if (result.tool === 'update_cohesion') {
      const input = result.input as { direction: 1 | 0 | -1; reason: string; companionName?: string }
      const cohesion = updated.world.crewCohesion ?? { score: 3, log: [] }
      const newScore = Math.max(1, Math.min(5, cohesion.score + input.direction))
      const logEntry: CohesionLogEntry = {
        chapterNumber: updated.meta.chapterNumber,
        companionName: input.companionName || 'crew',
        change: input.direction,
        reason: input.reason,
        timestamp: new Date().toISOString(),
      }
      updated = {
        ...updated,
        world: {
          ...updated.world,
          crewCohesion: {
            score: newScore,
            log: [...cohesion.log, logEntry],
          },
        },
      }
    }

    if (result.tool === 'update_clock') {
      const input = result.input as {
        action: 'establish' | 'advance' | 'trigger' | 'resolve'
        id: string
        name?: string
        maxSegments?: 4 | 6
        triggerEffect?: string
        by?: number
        reason?: string
        consequence?: string
        how?: string
      }
      const clocks: TensionClock[] = [...(updated.world.tensionClocks ?? [])]

      if (input.action === 'establish') {
        if (!clocks.find((c) => c.id === input.id)) {
          clocks.push({
            id: input.id,
            name: input.name!,
            maxSegments: input.maxSegments ?? 4,
            filled: 0,
            status: 'active',
            triggerEffect: input.triggerEffect!,
          })
        }
      } else if (input.action === 'advance') {
        const idx = clocks.findIndex((c) => c.id === input.id)
        if (idx >= 0 && clocks[idx].status === 'active') {
          clocks[idx] = {
            ...clocks[idx],
            filled: Math.min(clocks[idx].maxSegments, clocks[idx].filled + (input.by ?? 1)),
          }
        }
      } else if (input.action === 'trigger') {
        const idx = clocks.findIndex((c) => c.id === input.id)
        if (idx >= 0) {
          clocks[idx] = {
            ...clocks[idx],
            status: 'triggered',
            triggerEffect: input.consequence ?? clocks[idx].triggerEffect,
          }
        }
      } else if (input.action === 'resolve') {
        const idx = clocks.findIndex((c) => c.id === input.id)
        if (idx >= 0) {
          clocks[idx] = { ...clocks[idx], status: 'resolved' }
        }
      }

      updated = {
        ...updated,
        world: { ...updated.world, tensionClocks: clocks },
      }
    }

    if (result.tool === 'update_disposition') {
      const input = result.input as { npcName: string; newDisposition: string; reason: string }
      updated = {
        ...updated,
        world: {
          ...updated.world,
          npcs: updated.world.npcs.map((n) =>
            n.name === input.npcName ? { ...n, disposition: input.newDisposition as DispositionTier } : n
          ),
        },
      }
    }

    if (result.tool === 'award_inspiration') {
      const input = result.input as { reason: string }
      const hadIt = updated.character.inspiration
      updated = {
        ...updated,
        character: { ...updated.character, inspiration: true },
      }
      if (!hadIt) {
        statChanges.push({ type: 'gain', label: `Inspiration: ${input.reason}` })
      }
    }

    if (result.tool === 'update_ship') {
      const input = result.input as UpdateShipInput
      const ship = updated.world.ship
      if (ship) {
        let newShip = { ...ship }
        if (input.hullConditionChange !== undefined) {
          newShip.hullCondition = Math.max(0, Math.min(100, ship.hullCondition + input.hullConditionChange))
          statChanges.push({
            type: input.hullConditionChange > 0 ? 'gain' : 'loss',
            label: `Hull: ${newShip.hullCondition}%`,
          })
        }
        if (input.upgradeSystem) {
          newShip.systems = ship.systems.map((s) =>
            s.id === input.upgradeSystem!.id
              ? { ...s, level: input.upgradeSystem!.newLevel, description: input.upgradeSystem!.description }
              : s
          )
          const sysName = input.upgradeSystem.id.replace('_', ' ')
          statChanges.push({ type: 'gain', label: `${sysName} → L${input.upgradeSystem.newLevel}` })
        }
        if (input.addCombatOption) {
          newShip.combatOptions = [...ship.combatOptions, input.addCombatOption]
          statChanges.push({ type: 'new', label: `Ship: ${input.addCombatOption}` })
        }
        if (input.upgradeLogEntry) {
          newShip.upgradeLog = [...ship.upgradeLog, input.upgradeLogEntry]
        }
        updated = { ...updated, world: { ...updated.world, ship: newShip } }
      }
    }

    if (result.tool === 'generate_debrief') {
      const input = result.input as unknown as ChapterDebrief
      const chapters = updated.history.chapters.map((ch) =>
        ch.status === 'complete' && !ch.debrief
          ? { ...ch, debrief: input }
          : ch
      )
      updated = { ...updated, history: { ...updated.history, chapters } }
      statChanges.push({ type: 'new', label: 'Chapter debrief ready' })
    }

    if (result.tool === 'add_clue') {
      const input = result.input as {
        clueId?: string
        title?: string
        content: string
        source: string
        tags: string[]
        isRedHerring?: boolean
        threadTitle?: string
        status?: 'active' | 'solved' | 'archived'
      }
      const world = { ...updated.world }
      const notebook = world.notebook ?? { activeThreadTitle: '', clues: [], connections: [] }

      if (input.clueId) {
        // Update existing clue
        const existingIdx = notebook.clues.findIndex(c => c.id === input.clueId)
        if (existingIdx >= 0) {
          notebook.clues = notebook.clues.map(c =>
            c.id === input.clueId
              ? { ...c, content: input.content, source: input.source, tags: [...new Set([...c.tags, ...input.tags])], ...(input.title ? { title: input.title } : {}), ...(input.status ? { status: input.status } : {}) }
              : c
          )
          statChanges.push({ type: 'new', label: `Clue updated: ${input.title || input.content.slice(0, 35) + '...'}` })
        } else {
          // Fallback: clueId not found, create new
          const clueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          notebook.clues = [...notebook.clues, {
            id: clueId, title: input.title, content: input.content, source: input.source, tags: input.tags,
            discoveredChapter: updated.meta.chapterNumber, connectionIds: [], isRedHerring: input.isRedHerring ?? false,
          }]
          statChanges.push({ type: 'new', label: `Clue: ${input.title || input.content.slice(0, 40) + '...'}` })
        }
      } else {
        // New clue — check for duplicate by title first
        const titleLower = (input.title || '').toLowerCase()
        const duplicate = titleLower ? notebook.clues.find(c => (c.title || '').toLowerCase() === titleLower) : null
        if (duplicate) {
          // Merge into existing clue instead of creating duplicate
          notebook.clues = notebook.clues.map(c =>
            c.id === duplicate.id
              ? { ...c, content: input.content, source: input.source, tags: [...new Set([...c.tags, ...input.tags])], ...(input.title ? { title: input.title } : {}), ...(input.status ? { status: input.status } : {}) }
              : c
          )
          statChanges.push({ type: 'new', label: `Clue updated: ${input.title || input.content.slice(0, 35) + '...'}` })
        } else {
          const clueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
          notebook.clues = [...notebook.clues, {
            id: clueId, title: input.title, content: input.content, source: input.source, tags: input.tags,
            discoveredChapter: updated.meta.chapterNumber, connectionIds: [], isRedHerring: input.isRedHerring ?? false,
          }]
          statChanges.push({ type: 'new', label: `Clue: ${input.title || input.content.slice(0, 40) + '...'}` })
        }
      }

      if (input.threadTitle && !notebook.activeThreadTitle) {
        notebook.activeThreadTitle = input.threadTitle
      }
      world.notebook = notebook
      updated = { ...updated, world }
    }

    if (result.tool === 'connect_clues') {
      // Accept both sourceIds (new) and clueIds (legacy) for backwards compatibility
      const raw = result.input as Record<string, unknown>
      const inputConnectionId = raw.connectionId as string | undefined
      const inputSourceIds = (raw.sourceIds ?? raw.clueIds) as string[] | undefined
      const input = {
        connectionId: inputConnectionId,
        sourceIds: inputSourceIds,
        title: raw.title as string,
        revelation: raw.revelation as string | undefined,
        status: raw.status as 'active' | 'solved' | 'archived' | 'disproven' | undefined,
      }
      const world = { ...updated.world }
      if (world.notebook) {
        const notebook = { ...world.notebook }

        // Update existing connection by ID
        if (input.connectionId) {
          const idx = notebook.connections.findIndex(c => c.id === input.connectionId)
          if (idx >= 0) {
            notebook.connections = notebook.connections.map((c, i) =>
              i === idx ? {
                ...c,
                ...(input.title ? { title: input.title } : {}),
                ...(input.revelation ? { revelation: input.revelation } : {}),
                ...(input.status ? { status: input.status } : {}),
                ...(input.sourceIds ? { sourceIds: input.sourceIds } : {}),
              } : c
            )
            statChanges.push({ type: 'neutral', label: `Connection updated: ${input.title || notebook.connections[idx].title}` })
          }
          world.notebook = notebook
          updated = { ...updated, world }
          continue
        }

        // New connection — sourceIds required
        if (!input.sourceIds || input.sourceIds.length === 0) continue
        const sourceIds = input.sourceIds

        // Derive tier from source types: are any sources connections (vs clues)?
        const sourceIsConnection = sourceIds.map(id => notebook.connections.some(c => c.id === id))
        const hasConnectionSource = sourceIsConnection.some(Boolean)
        const allConnectionSources = sourceIsConnection.every(Boolean)
        // lead+lead or breakthrough+anything = breakthrough; otherwise lead
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

        // Derive tainted flag: any source clue isRedHerring, or any source connection tainted
        const tainted = sourceIds.some(id => {
          const clue = notebook.clues.find(c => c.id === id)
          if (clue) return clue.isRedHerring
          const conn = notebook.connections.find(c => c.id === id)
          return conn?.tainted ?? false
        })

        // Check for duplicate (by title or exact source ID set)
        const normTitle = (s: string) => s.replace(/[^a-z0-9 ]/gi, '').toLowerCase().trim()
        const existingIdx = notebook.connections.findIndex(c =>
          normTitle(c.title) === normTitle(input.title) ||
          (sourceIds.length > 0 && sourceIds.every(id => c.sourceIds.includes(id)) && c.sourceIds.every(id => sourceIds.includes(id)))
        )

        const connId = `conn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`

        if (existingIdx >= 0) {
          // Update existing connection (preserve ID)
          notebook.connections = notebook.connections.map((c, i) =>
            i === existingIdx ? { ...c, sourceIds, title: input.title, revelation: input.revelation ?? c.revelation, tier, tainted, ...(input.status ? { status: input.status } : {}) } : c
          )
          statChanges.push({ type: 'neutral', label: `Connection updated: ${input.title}` })
        } else {
          // New connection
          notebook.connections = [...notebook.connections, {
            id: connId,
            sourceIds,
            title: input.title,
            revelation: input.revelation ?? '',
            tier,
            tainted,
            ...(input.status ? { status: input.status } : {}),
          }]
          statChanges.push({ type: 'new', label: tier === 'breakthrough' ? `Breakthrough: ${input.title}` : `Lead: ${input.title}` })
        }

        // Update connectionIds on source clues
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
        updated = { ...updated, world }
      }
    }
  }

  if (sceneBreaks.length > 0) {
    (updated as GameState & { _sceneBreaks?: string[] })._sceneBreaks = sceneBreaks
  }
  return updated
}
