'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { TopBar } from './top-bar'
import { ChatMessage } from './chat-message'
import { StateDiffBar } from './state-diff-bar'
import { ActionBar } from './action-bar'
import { BurgerMenu } from './burger-menu'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadGameState, saveGameState } from '@/lib/game-data'
import type { GameState, StreamEvent, ToolCallResult, RollRecord, Enemy, InventoryItem, TempModifier } from '@/lib/types'

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
}

export function GameScreen({ initialGameState }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [quickActions, setQuickActions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [lastStatChanges, setLastStatChanges] = useState<StatChange[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)
  const isLoadingRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

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
      }

      return updated
    },
    []
  )

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

      // Add the player message to history
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
      let gmText = ''

      setMessages((prev) => [
        ...prev,
        { id: gmMsgId, type: isMetaQuestion ? 'meta-response' : 'gm', content: '' },
      ])

      try {
        const response = await fetch('/api/game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: playerMessage,
            gameState: stateWithPlayerMessage,
            isMetaQuestion,
            isInitial,
          }),
        })

        if (!response.ok) throw new Error(`API error: ${response.status}`)
        if (!response.body) throw new Error('No response body')

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        const statChanges: StatChange[] = []
        let finalActions: string[] = []

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

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

              if (event.type === 'roll') {
                const rollMsg: DisplayMessage = {
                  id: Date.now().toString() + '_roll',
                  type: 'roll',
                  content: `${event.check} — DC ${event.dc} — ${event.roll}+${event.modifier}=${event.total} — ${event.result.toUpperCase()}`,
                  rollData: {
                    check: event.check,
                    dc: event.dc,
                    roll: event.roll,
                    modifier: event.modifier,
                    total: event.total,
                    result: event.result,
                    reason: event.reason,
                  },
                }
                setMessages((prev) => {
                  const idx = prev.findIndex((m) => m.id === gmMsgId)
                  return idx >= 0
                    ? [...prev.slice(0, idx), rollMsg, ...prev.slice(idx)]
                    : [...prev, rollMsg]
                })
              }

              if (event.type === 'tools') {
                const suggestTool = event.results.find((r) => r.tool === 'suggest_actions')
                if (suggestTool) {
                  finalActions = (suggestTool.input as { actions: string[] }).actions
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
                  stateWithPlayerMessage = applyToolResults(otherResults, stateWithPlayerMessage, statChanges)
                }
              }

              if (event.type === 'done') {
                const gmRole = isMetaQuestion ? 'meta-response' : 'gm'
                const finalState = {
                  ...stateWithPlayerMessage,
                  history: {
                    ...stateWithPlayerMessage.history,
                    messages: [
                      ...stateWithPlayerMessage.history.messages,
                      {
                        id: gmMsgId,
                        role: gmRole as 'gm' | 'meta-response',
                        content: gmText,
                        timestamp: new Date().toISOString(),
                      },
                    ],
                  },
                }
                setGameState(finalState)
                saveGameState(finalState)
                setLastStatChanges(statChanges)
                if (finalActions.length > 0) {
                  setQuickActions(finalActions)
                }
              }

              if (event.type === 'error') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === gmMsgId ? { ...m, content: `[Error: ${event.message}]` } : m
                  )
                )
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Something went wrong'
        setMessages((prev) =>
          prev.map((m) => (m.id === gmMsgId ? { ...m, content: `[Connection error: ${msg}]` } : m))
        )
      } finally {
        isLoadingRef.current = false
        setIsLoading(false)
      }
    },
    [applyToolResults]
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

    if (state.history.messages.length === 0) {
      sendToGM('', state, false, true)
    }
  }, [sendToGM, initialGameState])

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
        onMenuClick={() => setIsMenuOpen(true)}
        onChapterClick={() => setIsMenuOpen(true)}
      />

      <main className="flex flex-1 flex-col pt-14">
        <ScrollArea className="flex-1">
          <div className="mx-auto max-w-[720px] px-4 py-6">
            <div className="flex flex-col gap-4">
              {messages.map((message) =>
                message.type === 'roll' && message.rollData ? (
                  <RollBadge key={message.id} rollData={message.rollData} />
                ) : (
                  <ChatMessage
                    key={message.id}
                    message={{
                      id: message.id,
                      type: message.type as 'gm' | 'player' | 'meta-question' | 'meta-response',
                      content: message.content,
                      timestamp: new Date(),
                    }}
                  />
                )
              )}
              {isLoading && (
                <div className="flex items-center gap-1.5 px-1 pt-1">
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.15s]" />
                  <span className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.3s]" />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>

        <div className="mx-auto w-full max-w-[720px]">
          <StateDiffBar changes={lastStatChanges} />
          <ActionBar
            quickActions={quickActions}
            onActionSelect={handleActionSelect}
            onCustomAction={handleCustomAction}
            disabled={isLoading}
          />
        </div>
      </main>

      <BurgerMenu
        open={isMenuOpen}
        onOpenChange={setIsMenuOpen}
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
          promises: [],
        }}
        chapters={gameState.history.chapters.map((c) => ({
          number: c.number,
          title: c.title,
          status: c.status,
          summary: c.summary,
          keyEvents: c.keyEvents,
          rollLog: [],
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
  const label = isCrit ? 'CRITICAL' : isFumble ? 'FUMBLE' : isSuccess ? 'SUCCESS' : 'FAILURE'

  const colorClass = isSuccess
    ? 'border-green-800/40 bg-green-950/20 text-green-400'
    : 'border-red-800/40 bg-red-950/20 text-red-400'

  return (
    <div
      className={`flex items-center gap-3 rounded border px-3 py-1.5 font-mono text-xs ${colorClass}`}
    >
      <span className="font-semibold">{rollData.check}</span>
      <span className="text-muted-foreground">DC {rollData.dc}</span>
      <span>
        {rollData.roll}
        {rollData.modifier !== 0 && (
          <span className="text-muted-foreground">
            {rollData.modifier > 0 ? '+' : ''}
            {rollData.modifier}
          </span>
        )}{' '}
        = <span className="font-bold">{rollData.total}</span>
      </span>
      <span className="ml-auto font-bold tracking-widest">{label}</span>
    </div>
  )
}
