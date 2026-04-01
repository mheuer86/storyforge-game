'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TopBar } from './top-bar'
import { ChatMessage } from './chat-message'
import { StateDiffBar } from './state-diff-bar'
import { ActionBar } from './action-bar'
import { BurgerMenu } from './burger-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadGameState, saveGameState, saveToSlot, saveQuickActions } from '@/lib/game-data'
import type { GameState, StreamEvent, ToolCallResult, RollRecord, RollResolution, Enemy, InventoryItem, TempModifier, AntagonistMove, CohesionLogEntry, UpdateShipInput, ChapterDebrief, DispositionTier, TensionClock } from '@/lib/types'
import { type Genre } from '@/lib/genre-config'
import { track } from '@vercel/analytics'

interface DisplayMessage {
  id: string
  type: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll' | 'scene-break'
  content: string
  isError?: boolean
  rollData?: {
    check: string
    dc: number
    roll: number
    modifier: number
    total: number
    result: 'critical' | 'success' | 'failure' | 'fumble'
    reason: string
    advantage?: 'advantage' | 'disadvantage'
    rawRolls?: [number, number]
    contested?: { npcName: string; npcSkill: string; npcModifier: number }
    npcRoll?: number
    npcTotal?: number
  }
}

interface StatChange {
  type: 'gain' | 'loss' | 'new' | 'neutral'
  label: string
}

interface GameScreenProps {
  initialGameState?: GameState
  onNewGame?: () => void
}

interface RollPrompt {
  check: string
  stat: string
  dc: number
  modifier: number
  reason: string
  toolUseId: string
  pendingMessages: unknown[]
  pendingState: GameState
  advantage?: 'advantage' | 'disadvantage'
  rawRolls?: [number, number]
  contested?: { npcName: string; npcSkill: string; npcModifier: number }
  npcRoll?: number
}

export function GameScreen({ initialGameState, onNewGame }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [quickActions, setQuickActionsRaw] = useState<string[]>([])
  const setQuickActions = useCallback((actions: string[]) => {
    setQuickActionsRaw(actions)
    saveQuickActions(actions)
  }, [])
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [lastStatChanges, setLastStatChanges] = useState<StatChange[]>([])
  const [rollPrompt, setRollPrompt] = useState<RollPrompt | null>(null)
  const [retryContext, setRetryContext] = useState<{ playerMessage: string; state: GameState; isMetaQuestion: boolean; isInitial: boolean; gmMsgId: string } | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const [dicePhase, setDicePhase] = useState<'idle' | 'rolling' | 'revealed'>('idle')
  const [diceDisplay, setDiceDisplay] = useState(1)
  const [diceDisplay2, setDiceDisplay2] = useState(1)
  const [rolledValue, setRolledValue] = useState<number | null>(null)
  const [rawRolls, setRawRolls] = useState<[number, number] | null>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(-1)
  const hasStarted = useRef(false)
  const isLoadingRef = useRef(false)

  useEffect(() => {
    const prev = prevMessageCountRef.current
    const curr = messages.length
    if (curr === prev) return
    prevMessageCountRef.current = curr
    if (curr === 0) return
    // Initial load: scroll to end so history shows bottom; new messages: anchor to top
    const block: ScrollLogicalPosition = prev <= 0 ? 'end' : 'start'
    const behavior: ScrollBehavior = prev === -1 ? 'instant' : 'smooth'
    lastMessageRef.current?.scrollIntoView({ behavior, block })
  }, [messages])


  const applyToolResults = useCallback(
    (results: ToolCallResult[], currentState: GameState, statChanges: StatChange[]): GameState & { _sceneBreaks?: string[] } => {
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
          const input = result.input as {
            addNpcs?: { name: string; description: string; lastSeen: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; vulnerability?: string; disposition?: DispositionTier }[]
            updateNpc?: { name: string; description?: string; lastSeen?: string; relationship?: string; role?: 'crew' | 'contact' | 'npc'; subtype?: 'person' | 'vessel' | 'installation'; disposition?: DispositionTier }
            setLocation?: { name: string; description: string }
            addThread?: { id: string; title: string; status: string; deteriorating: boolean }
            updateThread?: { id: string; status: string; deteriorating?: boolean }
            addFaction?: { name: string; stance: string }
            addPromise?: { id: string; to: string; what: string; status: 'open' | 'strained' | 'fulfilled' | 'broken' }
            updatePromise?: { id: string; status: 'open' | 'strained' | 'fulfilled' | 'broken' }
            setCurrentTime?: string
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
                // Merge into the existing entry, keep the shorter/established name
                const canonical = existing.name.length <= n.name.length ? existing.name : n.name
                world.npcs = world.npcs.map((x) =>
                  x.name === existing.name ? { ...x, ...n, name: canonical } : x
                )
              } else {
                world.npcs = [...world.npcs, n]
                statChanges.push({ type: 'new', label: `Met: ${n.name}` })
              }
            }
          }
          if (input.updateNpc) {
            world.npcs = world.npcs.map((n) =>
              n.name === input.updateNpc!.name ? { ...n, ...input.updateNpc } : n
            )
          }
          if (input.setCurrentTime) {
            world.currentTime = input.setCurrentTime
          }
          if (input.setLocation) {
            world.currentLocation = input.setLocation
            // Insert a scene break header into the message stream
            const timeStr = input.setCurrentTime || world.currentTime
            const sceneLabel = timeStr ? `${input.setLocation.name} · ${timeStr}` : input.setLocation.name
            sceneBreaks.push(sceneLabel)
          }
          if (input.addThread) {
            world.threads = [...world.threads, input.addThread]
            statChanges.push({ type: 'new', label: `Thread: ${input.addThread.title}` })
          }
          if (input.updateThread) {
            world.threads = world.threads.map((t) =>
              t.id === input.updateThread!.id ? { ...t, ...input.updateThread } : t
            )
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
            world.promises = [...world.promises, input.addPromise]
            statChanges.push({ type: 'new', label: `Promise to ${input.addPromise.to}` })
          }
          if (input.updatePromise) {
            world.promises = world.promises.map((p) =>
              p.id === input.updatePromise!.id ? { ...p, status: input.updatePromise!.status } : p
            )
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
          track('chapter_completed', { chapter: currentNum, genre: updated.meta.genre })
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
            // Reset antagonist's per-chapter move tracker
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
            action: 'establish' | 'move'
            name?: string
            description?: string
            agenda?: string
            moveDescription?: string
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

          updated = { ...updated, world }
        }

        if (result.tool === 'update_cohesion') {
          const input = result.input as { direction: 1 | -1; reason: string; companionName?: string }
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
          // Intentionally no statChange — cohesion is hidden from player
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
          // Intentionally no statChange — clocks are hidden from player
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
          // Intentionally no statChange — disposition is hidden from player
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
          // Attach debrief to the most recently completed chapter
          const chapters = updated.history.chapters.map((ch) =>
            ch.status === 'complete' && !ch.debrief
              ? { ...ch, debrief: input }
              : ch
          )
          updated = { ...updated, history: { ...updated.history, chapters } }
          statChanges.push({ type: 'new', label: 'Chapter debrief ready' })
        }
      }

      if (sceneBreaks.length > 0) {
        (updated as GameState & { _sceneBreaks?: string[] })._sceneBreaks = sceneBreaks
      }
      return updated
    },
    []
  )

  const streamRequest = useCallback(async (
    body: Record<string, unknown>,
    gmMsgId: string,
    isMetaQuestion: boolean,
    currentState: GameState,
    onRollPrompt: (prompt: RollPrompt) => void,
    onDone: (finalState: GameState, statChanges: StatChange[]) => void,
    onError: (msg: string) => void,
  ) => {
    let gmText = ''
    let stateWithChanges = currentState

    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      if (!response.body) throw new Error('No response body')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const statChanges: StatChange[] = []
      let finalActions: string[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buf += decoder.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const event = JSON.parse(line) as StreamEvent

            if (event.type === 'text') {
              setRetryCountdown(null)
              gmText += event.content
              setMessages((prev) =>
                prev.map((m) => (m.id === gmMsgId ? { ...m, content: gmText } : m))
              )
            }

            if (event.type === 'roll_prompt') {
              onRollPrompt({
                check: event.check,
                stat: event.stat,
                dc: event.dc,
                modifier: event.modifier,
                reason: event.reason,
                toolUseId: event.toolUseId,
                pendingMessages: event.pendingMessages,
                pendingState: stateWithChanges,
                advantage: event.advantage,
                contested: event.contested,
              })
            }

            if (event.type === 'tools') {
              const suggestTool = event.results.findLast((r) => r.tool === 'suggest_actions')
              if (suggestTool) {
                finalActions = (suggestTool.input as { actions: string[] }).actions
                setQuickActions(finalActions)
              }

              const metaTool = event.results.find((r) => r.tool === 'meta_response')
              if (metaTool) {
                const metaContent = (metaTool.input as { content: string }).content
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === gmMsgId ? { ...m, type: 'meta-response', content: metaContent } : m
                  )
                )
                gmText = metaContent
              }

              const otherResults = event.results.filter(
                (r) => r.tool !== 'suggest_actions' && r.tool !== 'meta_response'
              )
              if (otherResults.length > 0) {
                stateWithChanges = applyToolResults(otherResults, stateWithChanges, statChanges)
                // Insert scene break headers if any location changes occurred
                const breaks = (stateWithChanges as GameState & { _sceneBreaks?: string[] })._sceneBreaks
                if (breaks && breaks.length > 0) {
                  setMessages((prev) => [
                    ...prev.filter(m => m.id !== gmMsgId),  // remove the empty GM placeholder temporarily
                    ...breaks.map(label => ({ id: crypto.randomUUID(), type: 'scene-break' as const, content: label })),
                    { id: gmMsgId, type: 'gm' as const, content: gmText },
                  ])
                  delete (stateWithChanges as GameState & { _sceneBreaks?: string[] })._sceneBreaks
                }
              }
            }

            if (event.type === 'done') {
              setRetryCountdown(null)
              const gmRole = isMetaQuestion ? 'meta-response' : 'gm'
              const finalState = {
                ...stateWithChanges,
                history: {
                  ...stateWithChanges.history,
                  messages: [
                    ...stateWithChanges.history.messages,
                    {
                      id: gmMsgId,
                      role: gmRole as 'gm' | 'meta-response',
                      content: gmText,
                      timestamp: new Date().toISOString(),
                    },
                  ],
                },
              }
              onDone(finalState, statChanges)
            }

            if (event.type === 'retrying') {
              const totalSeconds = Math.ceil(event.delayMs / 1000)
              setRetryCountdown(totalSeconds)
              // Clear the GM message while retrying
              setMessages((prev) =>
                prev.map((m) => (m.id === gmMsgId ? { ...m, content: '' } : m))
              )
              gmText = ''
              // Tick down every second
              const interval = setInterval(() => {
                setRetryCountdown((prev) => {
                  if (prev === null || prev <= 1) { clearInterval(interval); return null }
                  return prev - 1
                })
              }, 1000)
            }

            if (event.type === 'error') {
              setRetryCountdown(null)
              onError(event.message)
            }
          } catch {
            // Skip malformed lines
          }
        }
      }
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Something went wrong')
    }
  }, [applyToolResults, setQuickActions])

  const sendToGM = useCallback(
    async (
      playerMessage: string,
      currentState: GameState,
      isMetaQuestion: boolean,
      isInitial: boolean
    ) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoading(true)
      setLastStatChanges([])

      const playerDisplayMessage: DisplayMessage | null =
        !isInitial && playerMessage
          ? {
              id: crypto.randomUUID(),
              type: isMetaQuestion ? 'meta-question' : 'player',
              content: playerMessage,
            }
          : null

      if (playerDisplayMessage) {
        setMessages((prev) => [...prev, playerDisplayMessage])
      }

      let stateWithPlayerMessage = currentState
      if (playerDisplayMessage) {
        stateWithPlayerMessage = {
          ...currentState,
          history: {
            ...currentState.history,
            messages: [
              ...currentState.history.messages,
              {
                id: playerDisplayMessage.id,
                role: playerDisplayMessage.type as 'player' | 'meta-question',
                content: playerMessage,
                timestamp: new Date().toISOString(),
              },
            ],
          },
        }
      }

      const gmMsgId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        { id: gmMsgId, type: isMetaQuestion ? 'meta-response' : 'gm', content: '' },
      ])
      setRetryContext({ playerMessage, state: stateWithPlayerMessage, isMetaQuestion, isInitial, gmMsgId })

      await streamRequest(
        { message: playerMessage, gameState: stateWithPlayerMessage, isMetaQuestion, isInitial },
        gmMsgId,
        isMetaQuestion,
        stateWithPlayerMessage,
        (prompt) => {
          setRollPrompt(prompt)
          setRetryContext(null)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (finalState, statChanges) => {
          setGameState(finalState)
          saveGameState(finalState)
          setLastStatChanges(statChanges)
          setRetryContext(null)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (msg) => {
          const is504 = msg.includes('504')
          const is529 = msg.includes('529') || msg.toLowerCase().includes('overload')
          const friendlyMsg = is504
            ? 'Request timed out — please try again'
            : is529
            ? 'Claude is overloaded right now — please try again in a moment'
            : `Something went wrong (${msg})`
          setMessages((prev) =>
            prev.map((m) => (m.id === gmMsgId ? { ...m, content: friendlyMsg, isError: true } : m))
          )
          isLoadingRef.current = false
          setIsLoading(false)
        },
      )
    },
    [streamRequest]
  )

  const handleRetry = useCallback(() => {
    if (!retryContext || isLoadingRef.current) return
    const { playerMessage, state, isMetaQuestion, isInitial, gmMsgId } = retryContext
    setRetryContext(null)
    // Replace the error bubble with a fresh empty one, then re-stream
    const newGmMsgId = crypto.randomUUID()
    setMessages((prev) =>
      prev.map((m) => (m.id === gmMsgId ? { ...m, id: newGmMsgId, content: '', isError: false } : m))
    )
    isLoadingRef.current = true
    setIsLoading(true)
    setRetryContext({ playerMessage, state, isMetaQuestion, isInitial, gmMsgId: newGmMsgId })
    streamRequest(
      { message: playerMessage, gameState: state, isMetaQuestion, isInitial },
      newGmMsgId,
      isMetaQuestion,
      state,
      (prompt) => { setRollPrompt(prompt); setRetryContext(null); isLoadingRef.current = false; setIsLoading(false) },
      (finalState, statChanges) => { setGameState(finalState); saveGameState(finalState); setLastStatChanges(statChanges); setRetryContext(null); isLoadingRef.current = false; setIsLoading(false) },
      (msg) => {
        const is504 = msg.includes('504')
        const is529 = msg.includes('529') || msg.toLowerCase().includes('overload')
        const friendlyMsg = is504 ? 'Request timed out — please try again' : is529 ? 'Claude is overloaded right now — please try again in a moment' : `Something went wrong (${msg})`
        setMessages((prev) => prev.map((m) => (m.id === newGmMsgId ? { ...m, content: friendlyMsg, isError: true } : m)))
        isLoadingRef.current = false
        setIsLoading(false)
      },
    )
  }, [retryContext, streamRequest])

  const sendContinuation = useCallback(
    async (roll: number, prompt: RollPrompt) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoading(true)
      setLastStatChanges([])

      const npcTotal = prompt.contested && prompt.npcRoll !== undefined
        ? prompt.npcRoll + prompt.contested.npcModifier
        : undefined

      const rollResolution: RollResolution = {
        roll,
        check: prompt.check,
        stat: prompt.stat,
        dc: prompt.dc,
        modifier: prompt.modifier,
        reason: prompt.reason,
        toolUseId: prompt.toolUseId,
        pendingMessages: prompt.pendingMessages,
        ...(prompt.advantage && { advantage: prompt.advantage }),
        ...(prompt.rawRolls && { rawRolls: prompt.rawRolls }),
        ...(prompt.contested && { contested: prompt.contested }),
        ...(prompt.npcRoll !== undefined && { npcRoll: prompt.npcRoll, npcTotal }),
      }

      const modifier = prompt.modifier
      const total = roll + modifier
      // For contested rolls: compare player total vs NPC total. For static: compare vs DC.
      const effectiveDC = npcTotal !== undefined ? npcTotal : prompt.dc
      const result: 'critical' | 'success' | 'failure' | 'fumble' =
        roll === 20 ? 'critical' : roll === 1 ? 'fumble' : total >= effectiveDC ? 'success' : 'failure'

      const rollMsgId = crypto.randomUUID()
      const gmMsgId = crypto.randomUUID()
      setMessages((prev) => [
        ...prev,
        {
          id: rollMsgId,
          type: 'roll' as const,
          content: '',
          rollData: { check: prompt.check, dc: prompt.dc, roll, modifier, total, result, reason: prompt.reason, advantage: prompt.advantage, rawRolls: prompt.rawRolls, contested: prompt.contested, npcRoll: prompt.npcRoll, npcTotal },
        },
        { id: gmMsgId, type: 'gm' as const, content: '' },
      ])

      await streamRequest(
        { message: '', gameState: prompt.pendingState, isMetaQuestion: false, isInitial: false, rollResolution },
        gmMsgId,
        false,
        prompt.pendingState,
        () => {
          // nested rolls not expected — treat as error
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (finalState, statChanges) => {
          setGameState(finalState)
          saveGameState(finalState)
          setLastStatChanges(statChanges)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (msg) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === gmMsgId ? { ...m, content: `[Error: ${msg}]` } : m))
          )
          isLoadingRef.current = false
          setIsLoading(false)
        },
      )
    },
    [streamRequest]
  )

  const handleConsistencyCheck = useCallback(
    async (flaggedContent: string) => {
      if (isLoadingRef.current || !gameState) return
      isLoadingRef.current = true
      setIsLoading(true)
      setLastStatChanges([])

      const gmMsgId = crypto.randomUUID()
      setMessages((prev) => [...prev, { id: gmMsgId, type: 'meta-response', content: '' }])

      await streamRequest(
        {
          message: '[CONSISTENCY CHECK]',
          gameState,
          isMetaQuestion: true,
          isInitial: false,
          isConsistencyCheck: true,
          flaggedMessage: flaggedContent,
        },
        gmMsgId,
        true,
        gameState,
        () => { isLoadingRef.current = false; setIsLoading(false) },
        (finalState, statChanges) => {
          setGameState(finalState)
          saveGameState(finalState)
          setLastStatChanges(statChanges)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (msg) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === gmMsgId ? { ...m, content: `[Error: ${msg}]` } : m))
          )
          isLoadingRef.current = false
          setIsLoading(false)
        },
      )
    },
    [streamRequest, gameState]
  )

  // Load state and start campaign on mount
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    let state = loadGameState()
    if (!state && initialGameState) {
      state = initialGameState
      saveGameState(state)
    }
    if (!state) return

    setGameState(state)

    const displayMessages: DisplayMessage[] = state.history.messages.map((msg) => ({
      id: msg.id,
      type: msg.role as DisplayMessage['type'],
      content: msg.content,
    }))
    setMessages(displayMessages)

    setQuickActionsRaw([])

    if (state.history.messages.length === 0) {
      sendToGM('', state, false, true)
    }
  }, [sendToGM, initialGameState])

  const handleDiceClick = useCallback(() => {
    if (!rollPrompt || dicePhase !== 'idle') return
    const isAdvantage = rollPrompt.advantage === 'advantage' || rollPrompt.advantage === 'disadvantage'
    const isContested = !!rollPrompt.contested
    const die1 = Math.floor(Math.random() * 20) + 1
    const die2 = isAdvantage ? Math.floor(Math.random() * 20) + 1
      : isContested ? Math.floor(Math.random() * 20) + 1  // NPC die
      : die1
    const kept = rollPrompt.advantage === 'advantage' ? Math.max(die1, die2)
      : rollPrompt.advantage === 'disadvantage' ? Math.min(die1, die2)
      : die1
    setRolledValue(kept)
    if (isAdvantage) setRawRolls([die1, die2])
    if (isContested) {
      // Store NPC roll on the prompt so it flows through to sendContinuation
      rollPrompt.npcRoll = die2
    }
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 20) + 1)
      if (isAdvantage || isContested) setDiceDisplay2(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(isContested ? die2 : die1)  // For contested: display2 = NPC die, display1 used for player below
      setDiceDisplay(die1)
      if (isAdvantage || isContested) setDiceDisplay2(die2)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, dicePhase])

  // After revealing the dice result, auto-continue to phase 2
  useEffect(() => {
    if (dicePhase !== 'revealed' || rolledValue === null || !rollPrompt) return
    const t = setTimeout(() => {
      const capturedPrompt = { ...rollPrompt, rawRolls: rawRolls ?? undefined }
      const capturedRoll = rolledValue
      setRollPrompt(null)
      setDicePhase('idle')
      setDiceDisplay(1)
      setDiceDisplay2(1)
      setRolledValue(null)
      setRawRolls(null)
      sendContinuation(capturedRoll, capturedPrompt)
    }, 1400)
    return () => clearTimeout(t)
  }, [dicePhase, rolledValue, rollPrompt, rawRolls, sendContinuation])

  const handleSave = useCallback(
    (slot: 1 | 2 | 3) => {
      if (!gameState) return
      saveToSlot(slot, gameState)
    },
    [gameState]
  )

  const handleLoad = useCallback(
    (state: GameState) => {
      saveGameState(state)
      setGameState(state)
      const displayMessages: DisplayMessage[] = state.history.messages.map((msg) => ({
        id: msg.id,
        type: msg.role as DisplayMessage['type'],
        content: msg.content,
      }))
      setMessages(displayMessages)
      setQuickActionsRaw([])
      setLastStatChanges([])
      setRollPrompt(null)
      setDicePhase('idle')
      setRolledValue(null)
    },
    [setQuickActionsRaw]
  )

  const handleActionSelect = useCallback(
    (action: string) => {
      if (!gameState || isLoadingRef.current) return
      sendToGM(action, gameState, false, false)
    },
    [gameState, sendToGM]
  )

  const handleCustomAction = useCallback(
    (action: string, isMetaQuestion: boolean) => {
      if (!gameState || isLoadingRef.current) return
      sendToGM(action, gameState, isMetaQuestion, false)
    },
    [gameState, sendToGM]
  )

  if (!gameState) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading campaign...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        chapterTitle={`Chapter ${gameState.meta.chapterNumber}: ${gameState.meta.chapterTitle}`}
        genre={(gameState.meta.genre || 'space-opera') as Genre}
        onMenuClick={() => setIsMenuOpen(true)}
        onChapterClick={() => setIsMenuOpen(true)}
      />

      <main className="flex flex-1 flex-col pt-12">
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-[720px] px-4 py-6">
            <div className="flex flex-col gap-6">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1
                if (message.type === 'scene-break') {
                  return (
                    <div key={message.id} ref={isLast ? lastMessageRef : undefined} className="flex items-center gap-3 py-2">
                      <div className="h-px flex-1 bg-border/15" />
                      <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-tertiary whitespace-nowrap">{message.content}</span>
                      <div className="h-px flex-1 bg-border/15" />
                    </div>
                  )
                }
                return message.type === 'roll' && message.rollData ? (
                  <div key={message.id} ref={isLast ? lastMessageRef : undefined}>
                    <RollBadge rollData={message.rollData} />
                  </div>
                ) : (
                  <div key={message.id} ref={isLast ? lastMessageRef : undefined}>
                    <ChatMessage
                      message={{
                        id: message.id,
                        type: message.type as 'gm' | 'player' | 'meta-question' | 'meta-response',
                        content: message.content,
                        timestamp: new Date(),
                      }}
                      onFlag={message.type === 'gm' && !message.isError ? handleConsistencyCheck : undefined}
                      onRetry={message.isError ? handleRetry : undefined}
                    />
                  </div>
                )
              })}
              {isLoading && (
                <div className="max-w-[85%] border-l border-secondary/20 bg-card/20 rounded-r-lg pl-4 pr-4 py-3">
                  {retryCountdown !== null ? (
                    <div className="flex items-center gap-3">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-warning" />
                      <span className="text-sm text-muted-foreground">
                        Claude is taking a break — retrying in <span className="font-mono font-medium text-foreground">{retryCountdown}s</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0s]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.15s]" />
                      <span className="inline-block h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.3s]" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="mx-auto w-full max-w-[720px]">
          <StateDiffBar changes={lastStatChanges} />
          {rollPrompt && (
            <div className="border-t border-border/30 bg-background/80 px-4 pt-4 pb-2 backdrop-blur-sm">
              {dicePhase === 'idle' ? (
                <button
                  onClick={handleDiceClick}
                  className="w-full rounded-lg border border-primary/40 bg-primary/10 px-6 py-4 text-left transition-all duration-200 hover:border-primary/70 hover:bg-primary/20 active:scale-[0.99]"
                >
                  {rollPrompt.contested ? (
                    /* Contested roll — NPC left, player right */
                    <>
                      <div className="text-center font-heading text-xs font-medium uppercase tracking-wider text-primary/70 mb-3">
                        Contested — {rollPrompt.check} vs {rollPrompt.contested.npcSkill}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-xs text-muted-foreground/60">{rollPrompt.contested.npcName}</div>
                          <div className="font-system text-sm text-foreground/60">{rollPrompt.contested.npcSkill} {rollPrompt.contested.npcModifier >= 0 ? '+' : ''}{rollPrompt.contested.npcModifier}</div>
                          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-lg border border-border/30 bg-card/30 text-2xl">🎲</div>
                        </div>
                        <div className="text-xs text-muted-foreground/40 uppercase tracking-wider">vs</div>
                        <div className="text-right">
                          <div className="text-xs text-primary/60">You</div>
                          <div className="font-system text-sm text-primary">{rollPrompt.check} {rollPrompt.modifier >= 0 ? '+' : ''}{rollPrompt.modifier}</div>
                          <div className="mt-1 flex h-12 w-12 ml-auto items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">🎲</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground/50">{rollPrompt.reason}</div>
                      <div className="mt-2 text-center text-xs text-primary/60">Tap to roll</div>
                    </>
                  ) : (
                    /* Standard roll — DC check */
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-primary/70">
                            {rollPrompt.check} Check
                            {rollPrompt.advantage && (
                              <span className={rollPrompt.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                                — {rollPrompt.advantage}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 font-system text-sm">
                            <span className="text-muted-foreground">DC <span className="font-semibold text-foreground">{rollPrompt.dc}</span></span>
                            <span className="text-muted-foreground/30">|</span>
                            <span className="text-muted-foreground">{rollPrompt.stat} <span className="font-semibold text-primary">{rollPrompt.modifier >= 0 ? '+' : ''}{rollPrompt.modifier}</span></span>
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground/70">
                            {rollPrompt.reason}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-1.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">
                            🎲
                          </div>
                          {rollPrompt.advantage && (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">
                              🎲
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 text-center text-xs text-primary/60">
                        Tap to roll{rollPrompt.advantage ? ' 2d20' : ''}
                      </div>
                    </>
                  )}
                </button>
              ) : (() => {
                const hasAdv = !!rollPrompt.advantage
                const isContested = !!rollPrompt.contested
                const total = rolledValue !== null ? rolledValue + rollPrompt.modifier : null
                const npcTot = isContested && rollPrompt.npcRoll !== undefined ? rollPrompt.npcRoll + rollPrompt.contested!.npcModifier : null
                const effectiveDC = npcTot !== null ? npcTot : rollPrompt.dc
                const result = rolledValue === 20 ? 'critical' : rolledValue === 1 ? 'fumble' : total !== null && total >= effectiveDC ? 'success' : 'failure'
                const die1Kept = dicePhase === 'revealed' && rawRolls && rolledValue === rawRolls[0]
                const die2Kept = dicePhase === 'revealed' && rawRolls && rolledValue === rawRolls[1] && (!die1Kept || rawRolls[0] === rawRolls[1])
                const resultColor = (r: string) =>
                  r === 'critical' ? 'text-tertiary font-bold' :
                  r === 'success' ? 'text-emerald-400 font-bold' :
                  r === 'fumble' ? 'text-red-400 font-bold' :
                  'text-orange-400 font-bold'
                const resultLabel = (r: string) =>
                  r === 'critical' ? 'CRITICAL!' : r === 'success' ? 'SUCCESS' : r === 'fumble' ? 'FUMBLE' : 'FAILURE'
                const dieStyle = (isKept: boolean | null, displayVal: number, isNpc?: boolean) => [
                  'flex shrink-0 items-center justify-center rounded-lg border font-mono font-bold transition-all duration-200',
                  hasAdv ? 'h-14 w-14 text-2xl' : 'h-14 w-14 text-2xl',
                  dicePhase === 'rolling' ? 'border-border/50 bg-card/50 text-muted-foreground animate-pulse' :
                  !isKept && hasAdv ? 'border-border/30 bg-card/20 text-muted-foreground/40 line-through' :
                  isNpc && isContested && dicePhase === 'revealed' && (result === 'success' || result === 'critical') ? 'border-border/30 bg-card/20 text-muted-foreground/40' :
                  isNpc && isContested ? 'border-orange-400/60 bg-orange-400/20 text-orange-400' :
                  displayVal === 20 ? 'dice-crit' :
                  displayVal === 1 ? 'border-red-500/60 bg-red-500/20 text-red-400' :
                  (result === 'success' || result === 'critical') ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-400' :
                  'border-orange-400/60 bg-orange-400/20 text-orange-400',
                ].join(' ')

                const cardColor = [
                  'rounded-lg border px-6 py-4 transition-all duration-500',
                  dicePhase === 'revealed' && result === 'critical' ? 'dice-crit-card'
                  : dicePhase === 'revealed' && result === 'success' ? 'border-emerald-400/60 bg-emerald-400/10'
                  : dicePhase === 'revealed' && result === 'fumble' ? 'border-red-500/60 bg-red-500/10'
                  : dicePhase === 'revealed' ? 'border-orange-400/60 bg-orange-400/10'
                  : 'border-border/50 bg-card/50',
                ].join(' ')

                if (isContested) {
                  // Contested layout — NPC left, player right
                  return (
                    <div className={cardColor}>
                      <div className="text-center font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
                        Contested — {rollPrompt.check} vs {rollPrompt.contested!.npcSkill}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-[10px] text-muted-foreground/50 mb-1">{rollPrompt.contested!.npcName}</div>
                          <div className={dieStyle(null, diceDisplay, true)}>{diceDisplay}</div>
                          {dicePhase === 'revealed' && rollPrompt.npcRoll !== undefined && (
                            <div className="mt-1 font-system text-xs text-muted-foreground/60">
                              {rollPrompt.npcRoll} + {rollPrompt.contested!.npcModifier} = {npcTot}
                            </div>
                          )}
                        </div>
                        <div className="text-center">
                          {dicePhase === 'revealed' && (
                            <span className={resultColor(result)}>{resultLabel(result)}</span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-[10px] text-primary/60 mb-1">You</div>
                          <div className={[dieStyle(true, diceDisplay2), 'ml-auto'].join(' ')}>{diceDisplay2}</div>
                          {dicePhase === 'revealed' && rolledValue !== null && total !== null && (
                            <div className="mt-1 font-system text-xs text-primary/80">
                              {rolledValue} + {rollPrompt.modifier} = {total}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                }

                // Standard roll layout
                return (
                  <div className={cardColor}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {rollPrompt.check} — {rollPrompt.stat}
                          {rollPrompt.advantage && dicePhase === 'revealed' && (
                            <span className={rollPrompt.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                              {rollPrompt.advantage}
                            </span>
                          )}
                        </div>
                        {dicePhase === 'revealed' && rolledValue !== null && total !== null && (
                          <div className="mt-1 font-system text-sm text-foreground">
                            {rolledValue} + {rollPrompt.modifier} = {total} <span className="text-muted-foreground">vs DC {rollPrompt.dc}</span>
                            {' '}
                            <span className={resultColor(result)}>— {resultLabel(result)}</span>
                          </div>
                        )}
                      </div>
                      <div className="ml-4 flex items-center gap-1.5">
                        <div className={dieStyle(hasAdv ? die1Kept : true, diceDisplay)}>
                          {diceDisplay}
                        </div>
                        {hasAdv && (
                          <div className={dieStyle(die2Kept, diceDisplay2)}>
                            {diceDisplay2}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          <ActionBar
            quickActions={rollPrompt ? [] : quickActions}
            onActionSelect={handleActionSelect}
            onCustomAction={handleCustomAction}
            disabled={isLoading}
          />
        </div>
      </main>

      <BurgerMenu
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        genre={(gameState.meta.genre || 'space-opera') as Genre}
        onSave={handleSave}
        onLoad={handleLoad}
        onNewGame={onNewGame}
        character={{
          name: gameState.character.name,
          species: { name: gameState.character.species },
          class: {
            name: gameState.character.class,
            proficiencies: gameState.character.proficiencies.map((p) => ({ name: p })),
            stats: gameState.character.stats as unknown as Record<string, number>,
            startingGear: gameState.character.inventory.map((i) => i.name),
            trait: gameState.character.traits[0]
              ? { name: gameState.character.traits[0].name, description: gameState.character.traits[0].description }
              : { name: '', description: '' },
          },
          level: gameState.character.level,
          hp: gameState.character.hp,
          ac: gameState.character.ac,
          credits: gameState.character.credits,
          inspiration: gameState.character.inspiration ?? false,
          exhaustion: gameState.character.exhaustion ?? 0,
          tempEffects: gameState.character.tempModifiers.map((m) => ({
            name: m.name,
            effect: `+${m.value} ${m.stat}`,
            duration: m.duration,
          })),
        }}
        ship={{
          name: gameState.world.shipName,
          state: gameState.world.ship,
        }}
        world={{
          location: gameState.world.currentLocation,
          factions: gameState.world.factions,
          npcs: gameState.world.npcs.filter(n => n.role !== 'crew'),
          companions: gameState.world.npcs.filter(n => n.role === 'crew'),
          threads: gameState.world.threads.map((t) => ({
            title: t.title,
            status: t.status,
            deteriorating: t.deteriorating,
          })),
          promises: gameState.world.promises,
          antagonist: gameState.world.antagonist,
          tensionClocks: (gameState.world.tensionClocks ?? []).filter((c) => c.status !== 'resolved'),
        }}
        chapters={gameState.history.chapters.map((c) => ({
          number: c.number,
          title: c.title,
          status: c.status,
          summary: c.summary,
          keyEvents: c.keyEvents,
          rollLog: c.status === 'in-progress' ? gameState.history.rollLog : [],
          debrief: c.debrief ?? null,
        }))}
      />
    </div>
  )
}

function RollBadge({
  rollData,
}: {
  rollData: NonNullable<{ check: string; dc: number; roll: number; modifier: number; total: number; result: string; reason: string; advantage?: 'advantage' | 'disadvantage'; rawRolls?: [number, number] }>
}) {
  const isCrit = rollData.result === 'critical'
  const isFumble = rollData.result === 'fumble'
  const isSuccess = rollData.result === 'success' || isCrit
  const label = isCrit ? '— CRITICAL!' : isFumble ? '— FUMBLE' : isSuccess ? '— SUCCESS' : '— FAILURE'
  const hasAdv = !!rollData.advantage && !!rollData.rawRolls

  const cardClass = isCrit
    ? 'dice-crit-card'
    : isSuccess
    ? 'border-emerald-400/60 bg-emerald-400/10'
    : isFumble
    ? 'border-red-500/60 bg-red-500/10'
    : 'border-orange-400/60 bg-orange-400/10'

  const labelClass = isCrit
    ? 'text-tertiary font-bold'
    : isSuccess
    ? 'text-emerald-400 font-bold'
    : isFumble
    ? 'text-red-400 font-bold'
    : 'text-orange-400 font-bold'

  const keptDieClass = isCrit
    ? 'dice-crit'
    : isSuccess
    ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-400'
    : isFumble
    ? 'border-red-500/60 bg-red-500/20 text-red-400'
    : 'border-orange-400/60 bg-orange-400/20 text-orange-400'

  const discardedDieClass = 'border-border/30 bg-card/20 text-muted-foreground/40 line-through'

  return (
    <div className={`rounded-lg border px-6 py-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {rollData.check}
            {rollData.advantage && (
              <span className={rollData.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                {rollData.advantage}
              </span>
            )}
          </div>
          <div className="mt-1 font-system text-sm text-foreground">
            {rollData.roll}
            {rollData.modifier !== 0 && (
              <span className="text-muted-foreground">
                {' '}{rollData.modifier > 0 ? '+' : ''}{rollData.modifier}
              </span>
            )}
            {' '}= {rollData.total} <span className="text-muted-foreground">vs DC {rollData.dc}</span>{' '}
            <span className={labelClass}>{label}</span>
          </div>
        </div>
        <div className="ml-4 flex items-center gap-1.5">
          {hasAdv ? (
            <>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${rollData.rawRolls![0] === rollData.roll ? keptDieClass : discardedDieClass}`}>
                {rollData.rawRolls![0]}
              </div>
              <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border font-mono text-2xl font-bold ${rollData.rawRolls![1] === rollData.roll && (rollData.rawRolls![0] !== rollData.roll || rollData.rawRolls![0] === rollData.rawRolls![1]) ? keptDieClass : discardedDieClass}`}>
                {rollData.rawRolls![1]}
              </div>
            </>
          ) : (
            <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border font-mono text-3xl font-bold ${keptDieClass}`}>
              {rollData.roll}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
