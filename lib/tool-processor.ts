import type { GameState, ToolCallResult, Enemy, InventoryItem, TempModifier, AntagonistMove, CohesionLogEntry, UpdateShipInput, ChapterDebrief, DispositionTier, TensionClock, RollRecord } from './types'

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

  for (const result of results) {
    if (result.tool === 'update_character') {
      const input = result.input as {
        hpChange?: number
        hpSet?: number
        creditsChange?: number
        inventoryAdd?: InventoryItem[]
        inventoryRemove?: string[]
        inventoryUse?: { id: string }
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
        const newCredits = char.credits + input.creditsChange
        if (input.creditsChange < 0) {
          statChanges.push({ type: 'loss', label: `${char.credits}cr → ${newCredits}cr` })
        } else {
          statChanges.push({ type: 'gain', label: `+${input.creditsChange}cr` })
        }
        char.credits = newCredits
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
        char.inventory = char.inventory.map((item) => {
          if (item.id === input.inventoryUse!.id) {
            const newCharges = (item.charges ?? 1) - 1
            if (newCharges <= 0 && item.charges !== undefined) {
              statChanges.push({ type: 'loss', label: `${item.name} depleted` })
            }
            return { ...item, charges: Math.max(0, newCharges) }
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
        setCurrentTime?: string
        setSceneSnapshot?: string
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
      updated = { ...updated, world }
    }

    if (result.tool === 'close_chapter') {
      const input = result.input as {
        summary: string
        keyEvents: string[]
        nextTitle: string
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
        },
        history: {
          ...updated.history,
          chapters: [
            ...updated.history.chapters.filter((ch) => ch.number !== currentNum),
            completedChapter,
            nextChapter,
          ],
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
          const existing = notebook.clues[existingIdx]
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
            discoveredChapter: updated.meta.chapterNumber, connected: [], isRedHerring: input.isRedHerring ?? false,
          }]
          statChanges.push({ type: 'new', label: `Clue: ${input.title || input.content.slice(0, 40) + '...'}` })
        }
      } else {
        // New clue
        const clueId = `clue_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
        notebook.clues = [...notebook.clues, {
          id: clueId, title: input.title, content: input.content, source: input.source, tags: input.tags,
          discoveredChapter: updated.meta.chapterNumber, connected: [], isRedHerring: input.isRedHerring ?? false,
        }]
        statChanges.push({ type: 'new', label: `Clue: ${input.title || input.content.slice(0, 40) + '...'}` })
      }

      if (input.threadTitle && !notebook.activeThreadTitle) {
        notebook.activeThreadTitle = input.threadTitle
      }
      world.notebook = notebook
      updated = { ...updated, world }
    }

    if (result.tool === 'connect_clues') {
      const input = result.input as {
        clueIds: string[]
        title: string
        revelation: string
        status?: 'active' | 'solved' | 'archived'
      }
      const world = { ...updated.world }
      if (world.notebook) {
        const notebook = { ...world.notebook }
        // Check if this connection already exists (match by title or same clue IDs)
        const normTitle = (s: string) => s.replace(/[^a-z0-9 ]/gi, '').toLowerCase().trim()
        const existingIdx = notebook.connections.findIndex(c =>
          normTitle(c.title) === normTitle(input.title) ||
          (input.clueIds.length > 0 && input.clueIds.every(id => c.clueIds.includes(id)) && c.clueIds.every(id => input.clueIds.includes(id)))
        )
        if (existingIdx >= 0) {
          // Update existing connection
          notebook.connections = notebook.connections.map((c, i) =>
            i === existingIdx ? { ...c, ...input } : c
          )
          statChanges.push({ type: 'neutral', label: `Connection updated: ${input.title}` })
        } else {
          // New connection
          notebook.connections = [...notebook.connections, {
            clueIds: input.clueIds,
            title: input.title,
            revelation: input.revelation,
            ...(input.status ? { status: input.status } : {}),
          }]
          statChanges.push({ type: 'new', label: 'Connection discovered' })
        }
        notebook.clues = notebook.clues.map(c =>
          input.clueIds.includes(c.id)
            ? { ...c, connected: [...new Set([...c.connected, ...input.clueIds.filter(id => id !== c.id)])] }
            : c
        )
        // Deduplicate connections by normalized title (keep the one with status if set)
        const seen = new Map<string, number>()
        notebook.connections = notebook.connections.filter((c, i) => {
          const key = normTitle(c.title)
          if (!seen.has(key)) { seen.set(key, i); return true }
          // Keep the one with a status, drop the one without
          const prevIdx = seen.get(key)!
          if (c.status && !notebook.connections[prevIdx].status) {
            // Replace previous with this one
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
