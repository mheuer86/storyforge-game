'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TopBar } from './top-bar'
import { ChatMessage } from './chat-message'
import { StateDiffBar } from './state-diff-bar'
import { ActionBar } from './action-bar'
import { BurgerMenu } from './burger-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadGameState, saveGameState, saveToSlot, loadQuickActions, saveQuickActions } from '@/lib/game-data'
import type { GameState, StreamEvent, ToolCallResult, RollRecord, RollResolution, Enemy, InventoryItem, TempModifier, AntagonistMove } from '@/lib/types'
import { type Genre } from '@/lib/genre-config'

interface DisplayMessage {
  id: string
  type: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll'
  content: string
  rollData?: {
    check: string
    dc: number
    roll: number
    modifier: number
    total: number
    result: 'critical' | 'success' | 'failure' | 'fumble'
    reason: string
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
  const [dicePhase, setDicePhase] = useState<'idle' | 'rolling' | 'revealed'>('idle')
  const [diceDisplay, setDiceDisplay] = useState(1)
  const [rolledValue, setRolledValue] = useState<number | null>(null)
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
    (results: ToolCallResult[], currentState: GameState, statChanges: StatChange[]): GameState => {
      let updated = { ...currentState }

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
            addNpcs?: { name: string; description: string; lastSeen: string; relationship?: string }[]
            updateNpc?: { name: string; description?: string; lastSeen?: string; relationship?: string }
            setLocation?: { name: string; description: string }
            addThread?: { id: string; title: string; status: string; deteriorating: boolean }
            updateThread?: { id: string; status: string; deteriorating?: boolean }
            addFaction?: { name: string; stance: string }
            addPromise?: { id: string; to: string; what: string; status: 'open' | 'fulfilled' | 'broken' }
            updatePromise?: { id: string; status: 'open' | 'fulfilled' | 'broken' }
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
          if (input.setLocation) {
            world.currentLocation = input.setLocation
            statChanges.push({ type: 'neutral', label: `Location: ${input.setLocation.name}` })
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
              }
            }

            if (event.type === 'done') {
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

            if (event.type === 'error') {
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
              id: Date.now().toString(),
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

      const gmMsgId = (Date.now() + 1).toString()
      setMessages((prev) => [
        ...prev,
        { id: gmMsgId, type: isMetaQuestion ? 'meta-response' : 'gm', content: '' },
      ])

      await streamRequest(
        { message: playerMessage, gameState: stateWithPlayerMessage, isMetaQuestion, isInitial },
        gmMsgId,
        isMetaQuestion,
        stateWithPlayerMessage,
        (prompt) => {
          setRollPrompt(prompt)
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

  const sendContinuation = useCallback(
    async (roll: number, prompt: RollPrompt) => {
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoading(true)
      setLastStatChanges([])

      const rollResolution: RollResolution = {
        roll,
        check: prompt.check,
        stat: prompt.stat,
        dc: prompt.dc,
        modifier: prompt.modifier,
        reason: prompt.reason,
        toolUseId: prompt.toolUseId,
        pendingMessages: prompt.pendingMessages,
      }

      const gmMsgId = (Date.now() + 1).toString()
      setMessages((prev) => [...prev, { id: gmMsgId, type: 'gm', content: '' }])

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

    // Restore quick actions from localStorage (they aren't part of game state)
    const savedActions = loadQuickActions()
    if (savedActions.length > 0) {
      setQuickActionsRaw(savedActions)
    }

    if (state.history.messages.length === 0) {
      sendToGM('', state, false, true)
    }
  }, [sendToGM, initialGameState])

  const handleDiceClick = useCallback(() => {
    if (!rollPrompt || dicePhase !== 'idle') return
    const roll = Math.floor(Math.random() * 20) + 1
    setRolledValue(roll)
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(roll)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, dicePhase])

  // After revealing the dice result, auto-continue to phase 2
  useEffect(() => {
    if (dicePhase !== 'revealed' || rolledValue === null || !rollPrompt) return
    const t = setTimeout(() => {
      const capturedPrompt = rollPrompt
      const capturedRoll = rolledValue
      setRollPrompt(null)
      setDicePhase('idle')
      setDiceDisplay(1)
      setRolledValue(null)
      sendContinuation(capturedRoll, capturedPrompt)
    }, 1400)
    return () => clearTimeout(t)
  }, [dicePhase, rolledValue, rollPrompt, sendContinuation])

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

      <main className="flex flex-1 flex-col pt-14">
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-[720px] px-4 py-6">
            <div className="flex flex-col gap-4">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1
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
                    />
                  </div>
                )
              })}
              {isLoading && (
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
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
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium uppercase tracking-wider text-primary/70">
                        Roll required
                      </div>
                      <div className="mt-0.5 font-mono text-base text-foreground">
                        {rollPrompt.check} — DC {rollPrompt.dc}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {rollPrompt.reason}
                      </div>
                    </div>
                    <div className="ml-4 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">
                      🎲
                    </div>
                  </div>
                  <div className="mt-3 text-center text-xs text-primary/60">
                    Tap to roll
                  </div>
                </button>
              ) : (() => {
                const total = rolledValue !== null ? rolledValue + rollPrompt.modifier : null
                const result = rolledValue === 20 ? 'critical' : rolledValue === 1 ? 'fumble' : total !== null && total >= rollPrompt.dc ? 'success' : 'failure'
                return (
                  <div className={[
                    'rounded-lg border px-6 py-4 transition-all duration-500',
                    dicePhase === 'revealed' && result === 'critical' ? 'border-yellow-400/60 bg-yellow-400/10'
                    : dicePhase === 'revealed' && result === 'success' ? 'border-primary/60 bg-primary/10'
                    : dicePhase === 'revealed' && result === 'fumble' ? 'border-red-500/60 bg-red-500/10'
                    : dicePhase === 'revealed' ? 'border-orange-400/60 bg-orange-400/10'
                    : 'border-border/50 bg-card/50',
                  ].join(' ')}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {rollPrompt.check} — DC {rollPrompt.dc}
                        </div>
                        {dicePhase === 'revealed' && rolledValue !== null && total !== null && (
                          <div className="mt-1 font-mono text-sm text-foreground">
                            {rolledValue} + {rollPrompt.modifier} = {total}
                            {' '}
                            <span className={
                              result === 'critical' ? 'text-yellow-400 font-bold' :
                              result === 'success' ? 'text-primary font-bold' :
                              result === 'fumble' ? 'text-red-400 font-bold' :
                              'text-orange-400 font-bold'
                            }>
                              {result === 'critical' ? '— CRITICAL!' : result === 'success' ? '— SUCCESS' : result === 'fumble' ? '— FUMBLE' : '— FAILURE'}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className={[
                        'ml-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border font-mono text-3xl font-bold transition-all duration-200',
                        dicePhase === 'rolling' ? 'border-border/50 bg-card/50 text-muted-foreground animate-pulse' :
                        diceDisplay === 20 ? 'border-yellow-400/60 bg-yellow-400/20 text-yellow-300' :
                        diceDisplay === 1 ? 'border-red-500/60 bg-red-500/20 text-red-400' :
                        (result === 'success' || result === 'critical') ? 'border-primary/60 bg-primary/20 text-primary' :
                        'border-orange-400/60 bg-orange-400/20 text-orange-400',
                      ].join(' ')}>
                        {diceDisplay}
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
          tempEffects: gameState.character.tempModifiers.map((m) => ({
            name: m.name,
            effect: `+${m.value} ${m.stat}`,
            duration: m.duration,
          })),
        }}
        ship={{
          name: gameState.world.shipName,
          class: 'Frigate',
          condition: 'Operational',
          systems: [],
          refitHistory: [],
        }}
        world={{
          location: gameState.world.currentLocation,
          factions: gameState.world.factions,
          npcs: gameState.world.npcs,
          threads: gameState.world.threads.map((t) => ({
            title: t.title,
            status: t.status,
            deteriorating: t.deteriorating,
          })),
          promises: gameState.world.promises,
          antagonist: gameState.world.antagonist,
        }}
        chapters={gameState.history.chapters.map((c) => ({
          number: c.number,
          title: c.title,
          status: c.status,
          summary: c.summary,
          keyEvents: c.keyEvents,
          rollLog: c.status === 'in-progress' ? gameState.history.rollLog : [],
          debrief: null,
        }))}
      />
    </div>
  )
}

function RollBadge({
  rollData,
}: {
  rollData: NonNullable<{ check: string; dc: number; roll: number; modifier: number; total: number; result: string; reason: string }>
}) {
  const isCrit = rollData.result === 'critical'
  const isFumble = rollData.result === 'fumble'
  const isSuccess = rollData.result === 'success' || isCrit
  const label = isCrit ? '— CRITICAL!' : isFumble ? '— FUMBLE' : isSuccess ? '— SUCCESS' : '— FAILURE'

  const cardClass = isCrit
    ? 'border-yellow-400/60 bg-yellow-400/10'
    : isSuccess
    ? 'border-primary/60 bg-primary/10'
    : isFumble
    ? 'border-red-500/60 bg-red-500/10'
    : 'border-orange-400/60 bg-orange-400/10'

  const labelClass = isCrit
    ? 'text-yellow-400 font-bold'
    : isSuccess
    ? 'text-primary font-bold'
    : isFumble
    ? 'text-red-400 font-bold'
    : 'text-orange-400 font-bold'

  const dieClass = isCrit
    ? 'border-yellow-400/60 bg-yellow-400/20 text-yellow-300'
    : isSuccess
    ? 'border-primary/60 bg-primary/20 text-primary'
    : isFumble
    ? 'border-red-500/60 bg-red-500/20 text-red-400'
    : 'border-orange-400/60 bg-orange-400/20 text-orange-400'

  return (
    <div className={`rounded-lg border px-6 py-4 ${cardClass}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {rollData.check} — DC {rollData.dc}
          </div>
          <div className="mt-1 font-mono text-sm text-foreground">
            {rollData.roll}
            {rollData.modifier !== 0 && (
              <span className="text-muted-foreground">
                {' '}{rollData.modifier > 0 ? '+' : ''}{rollData.modifier}
              </span>
            )}
            {' '}= {rollData.total}{' '}
            <span className={labelClass}>{label}</span>
          </div>
        </div>
        <div className={`ml-4 flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border font-mono text-3xl font-bold ${dieClass}`}>
          {rollData.roll}
        </div>
      </div>
    </div>
  )
}
