'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { TopBar } from './top-bar'
import { ChatMessage } from './chat-message'
import { RollBadge, EnemyRollBadge } from './roll-badge'
import { ActionBar } from './action-bar'
import { BurgerMenu } from './burger-menu'
import { ChapterCloseOverlay, ChapterCloseLoading } from './chapter-close-overlay'
import { ScrollArea } from '@/components/ui/scroll-area'
import { loadGameState, saveGameState, saveToSlot, saveQuickActions, loadQuickActions } from '@/lib/game-data'
import { applyToolResults, type StatChange } from '@/lib/tool-processor'
import { runRulesEngine } from '@/lib/rules-engine'
import type { GameState, StreamEvent, ToolCallResult, RollRecord, RollResolution, RollDisplayData, RollBreakdown, TensionClock } from '@/lib/types'
import { type Genre, applyGenreTheme } from '@/lib/genre-config'
import { track } from '@vercel/analytics'
import { cn } from '@/lib/utils'
import { slashCommands as slashCommandDefs } from '@/lib/slash-commands'

interface DisplayMessage {
  id: string
  type: 'gm' | 'player' | 'meta-question' | 'meta-response' | 'roll' | 'scene-break' | 'chapter-header'
  content: string
  isError?: boolean
  statChanges?: StatChange[]
  rollData?: RollDisplayData
  rollBreakdown?: RollBreakdown
  sceneBreak?: string  // location/time header attached to this GM message
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
  priorToolResults?: unknown[]
  sides?: number
  rollType?: 'check' | 'damage' | 'healing'
  damageType?: string
}

export function GameScreen({ initialGameState, onNewGame }: GameScreenProps) {
  const [gameState, setGameState] = useState<GameState | null>(null)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [quickActions, setQuickActionsRaw] = useState<string[]>([])
  const setQuickActions = useCallback((actions: string[]) => {
    setQuickActionsRaw(actions)
    saveQuickActions(actions)
  }, [])
  const [tokenLog, setTokenLog] = useState<Array<{ input: number; output: number; cacheWrite: number; cacheRead: number; timestamp: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [menuInitialTab, setMenuInitialTab] = useState<string | undefined>(undefined)
  const [lastStatChanges, setLastStatChanges] = useState<StatChange[]>([])
  const [rollPrompt, setRollPrompt] = useState<RollPrompt | null>(null)
  const [retryContext, setRetryContext] = useState<{ playerMessage: string; state: GameState; isMetaQuestion: boolean; isInitial: boolean; gmMsgId: string; rollResolution?: RollResolution } | null>(null)
  const [retryCountdown, setRetryCountdown] = useState<number | null>(null)
  const [dicePhase, setDicePhase] = useState<'idle' | 'rolling' | 'revealed'>('idle')
  const [diceDisplay, setDiceDisplay] = useState(1)
  const [diceDisplay2, setDiceDisplay2] = useState(1)
  const [rolledValue, setRolledValue] = useState<number | null>(null)
  const [rawRolls, setRawRolls] = useState<[number, number] | null>(null)
  const [selectedItemBonus, setSelectedItemBonus] = useState<{ name: string; bonus: number } | null>(null)
  const [inspirationOffered, setInspirationOffered] = useState(false)
  const [closeInProgress, setCloseInProgress] = useState(false)
  const [actionBarPrefill, setActionBarPrefill] = useState<string | undefined>(undefined)
  const auditInFlightRef = useRef(false)
  // chapterClosed is derived from game state, not React state — survives reload
  const [originalRoll, setOriginalRoll] = useState<{ value: number; total: number; result: string; displayData: RollDisplayData } | null>(null)
  const originalRollRef = useRef<{ value: number; total: number; result: string; displayData: RollDisplayData } | null>(null)
  const lastMessageRef = useRef<HTMLDivElement>(null)
  const prevMessageCountRef = useRef(-1)
  const hasStarted = useRef(false)
  const isLoadingRef = useRef(false)

  const prevLastMsgIdRef = useRef<string | null>(null)
  useEffect(() => {
    const prev = prevMessageCountRef.current
    const curr = messages.length
    if (curr === prev) return
    prevMessageCountRef.current = curr
    if (curr === 0) return
    const lastMsg = messages[messages.length - 1]
    const lastId = lastMsg?.id ?? null
    // Only scroll when the LAST message changes (new message added at end).
    // Scene breaks inserted mid-array change length but not the last message.
    if (lastId === prevLastMsgIdRef.current && prev > 0) return
    prevLastMsgIdRef.current = lastId
    // Initial load: scroll to end so history shows bottom; new messages: anchor to top
    const block: ScrollLogicalPosition = prev <= 0 ? 'end' : 'start'
    const behavior: ScrollBehavior = prev === -1 ? 'instant' : 'smooth'
    lastMessageRef.current?.scrollIntoView({ behavior, block })
  }, [messages])

  const applyTools = useCallback(
    (results: ToolCallResult[], currentState: GameState, statChanges: StatChange[]): GameState & { _sceneBreaks?: string[] } => {
      return applyToolResults(results, currentState, statChanges, track)
    },
    []
  )

  /** Silent background audit — fires every AUDIT_INTERVAL player turns. */
  const runAudit = useCallback(async (state: GameState) => {
    if (auditInFlightRef.current) return
    auditInFlightRef.current = true
    try {
      const response = await fetch('/api/game', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: '',
          gameState: state,
          isMetaQuestion: false,
          isInitial: false,
          isAudit: true,
        }),
      })
      if (!response.ok || !response.body) return
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buf = ''
      const statChanges: StatChange[] = []
      let auditedState = state
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
            if (event.type === 'tools') {
              const corrections = event.results.filter(
                (r) => r.tool !== 'meta_response'
              )
              if (corrections.length > 0) {
                auditedState = applyToolResults(corrections, auditedState, statChanges, track)
              }
            }
          } catch { /* skip malformed */ }
        }
      }
      if (statChanges.length > 0) {
        setGameState(auditedState)
        saveGameState(auditedState)
      }
    } catch { /* audit failure is non-critical */ } finally {
      auditInFlightRef.current = false
    }
  }, [])

  // Scene summaries are now generated inline by Claude (scene_end + scene_summary in commit_turn).
  // The old fixed-interval Haiku summarizer has been removed.

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
      let lastRollBreakdown: RollBreakdown | undefined
      let finalActions: string[] = []
      let sceneEndSummary: string | undefined
      let sceneToneSignature: string | undefined
      let lastCommitInput: Record<string, unknown> | undefined

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

            // Hook-derived chapter title for new games
            if ((event as Record<string, unknown>).type === 'chapter_title') {
              const title = (event as Record<string, unknown>).title as string
              if (title) {
                stateWithChanges = {
                  ...stateWithChanges,
                  meta: { ...stateWithChanges.meta, chapterTitle: title },
                  history: {
                    ...stateWithChanges.history,
                    chapters: stateWithChanges.history.chapters.map((ch, i) =>
                      i === stateWithChanges.history.chapters.length - 1 ? { ...ch, title } : ch
                    ),
                  },
                }
                // Update the displayed chapter header
                const headerContent = `Chapter ${stateWithChanges.meta.chapterNumber}: ${title}`
                setMessages((prev) =>
                  prev.map((m) => m.type === 'chapter-header' ? { ...m, content: headerContent } : m)
                )
              }
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
                priorToolResults: event.priorToolResults,
                sides: event.sides,
                rollType: event.rollType,
                damageType: event.damageType,
              })
            }

            if (event.type === 'token_usage') {
              setTokenLog(prev => [...prev, {
                input: event.usage.inputTokens,
                output: event.usage.outputTokens,
                cacheWrite: event.usage.cacheWriteTokens,
                cacheRead: event.usage.cacheReadTokens,
                timestamp: new Date().toISOString(),
              }])
            }

            if (event.type === 'tools') {
              // Extract suggested_actions from commit_turn
              const commitTool = event.results.findLast((r) => r.tool === 'commit_turn')
              if (commitTool) {
                lastCommitInput = commitTool.input as Record<string, unknown>
                const commitInput = commitTool.input as { suggested_actions?: string[] }
                if (commitInput.suggested_actions && commitInput.suggested_actions.length > 0) {
                  finalActions = commitInput.suggested_actions
                  setQuickActions(finalActions)
                }

                // Extract enemy roll breakdown from commit_turn.character.roll_breakdown
                const charInput = commitTool.input as { character?: { roll_breakdown?: RollBreakdown } }
                if (charInput.character?.roll_breakdown) {
                  lastRollBreakdown = charInput.character.roll_breakdown
                }

                // Extract scene boundary from commit_turn
                const sceneInput = commitTool.input as { scene_end?: boolean; scene_summary?: string; tone_signature?: string; world?: { set_location?: unknown } }
                // Auto-detect scene boundary: if set_location present but no scene_end, force it
                const hasLocationChange = !!sceneInput.world?.set_location
                const hasSceneEnd = !!sceneInput.scene_end
                if (hasSceneEnd || hasLocationChange) {
                  if (sceneInput.scene_summary) {
                    sceneEndSummary = sceneInput.scene_summary
                  } else if (hasLocationChange && !hasSceneEnd) {
                    // Location change without scene_end — create a minimal summary
                    sceneEndSummary = '[Scene boundary detected from location change]'
                  }
                  if (sceneInput.tone_signature) {
                    sceneToneSignature = sceneInput.tone_signature
                  }
                  // If scene_end without scene_summary, messages stay raw (no worse than before).
                  // Claude should almost always include scene_summary per prompt instructions.
                }
              }

              const metaTool = event.results.find((r) => r.tool === 'meta_response')
              if (metaTool) {
                const metaContent = (metaTool.input as { content: string }).content
                // Only use tool content as fallback — if Claude streamed text, that's the real answer.
                if (!gmText.trim()) {
                  gmText = metaContent
                }
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === gmMsgId ? { ...m, type: 'meta-response', content: gmText } : m
                  )
                )
              }

              // Apply state changes from commit_turn and other internal tools (excluding meta_response)
              const stateResults = event.results.filter(
                (r) => r.tool !== 'meta_response'
              )
              if (stateResults.length > 0) {
                stateWithChanges = applyTools(stateResults, stateWithChanges, statChanges)
                delete (stateWithChanges as GameState & { _sceneBreaks?: string[] })._sceneBreaks
              }
            }

            if (event.type === 'done') {
              setRetryCountdown(null)
              // Clear stale quick actions if the GM didn't provide new ones
              // But preserve them during meta questions (meta responses don't call commit_turn)
              if (finalActions.length === 0 && !isMetaQuestion) {
                setQuickActions([])
              }
              const gmRole = isMetaQuestion ? 'meta-response' : 'gm'
              let finalState: GameState = {
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
                      ...(statChanges.length > 0 && { statChanges }),
                      ...(lastRollBreakdown && { rollBreakdown: lastRollBreakdown }),
                    },
                  ],
                },
              }
              // Attach rollBreakdown to the GM display message
              if (lastRollBreakdown) {
                setMessages((prev) =>
                  prev.map((m) => (m.id === gmMsgId ? { ...m, rollBreakdown: lastRollBreakdown } : m))
                )
              }

              // Append scene summary if a scene boundary occurred
              if (sceneEndSummary) {
                const existing = finalState.sceneSummaries ?? []
                const lastScene = existing[existing.length - 1]
                const fromIdx = lastScene ? lastScene.toMessageIndex + 1 : 0
                const toIdx = finalState.history.messages.length - 1
                const sceneNum = (lastScene?.sceneNumber ?? 0) + 1
                finalState.sceneSummaries = [
                  ...existing,
                  { text: sceneEndSummary, sceneNumber: sceneNum, fromMessageIndex: fromIdx, toMessageIndex: toIdx, ...(sceneToneSignature && { toneSignature: sceneToneSignature }) },
                ]
              }

              // Detect scope signals from commit_turn and increment counter
              if (lastCommitInput) {
                let signals = 0
                const world = lastCommitInput.world as Record<string, unknown> | undefined
                if (world) {
                  if (world.set_location) signals++
                  const addNpcs = world.add_npcs as unknown[] | undefined
                  if (addNpcs && addNpcs.length >= 3) signals++
                  const antagonist = world.antagonist as { action?: string } | undefined
                  if (antagonist?.action === 'establish') signals++
                  const clocks = world.clocks as { action?: string }[] | undefined
                  if (clocks?.some(c => c.action === 'establish')) signals++
                  if (world.add_timer) signals++
                  if (world.set_operation) signals++
                }
                if (signals > 0) {
                  finalState.scopeSignals = (finalState.scopeSignals ?? 0) + signals
                }
              }

              // Run rules engine (persistent counters, threshold warnings)
              finalState = runRulesEngine(finalState, lastCommitInput ?? null)

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
  }, [applyTools, setQuickActions])

  const sendToGM = useCallback(
    async (
      playerMessage: string,
      currentState: GameState,
      isMetaQuestion: boolean,
      isInitial: boolean,
      displayOverride?: string  // show this in chat instead of the raw message (for slash commands)
    ) => {
      // Auto-detect forge:dev prefix as meta question
      if (playerMessage.toLowerCase().startsWith('forge:dev')) {
        isMetaQuestion = true
      }
      if (isLoadingRef.current) return
      isLoadingRef.current = true
      setIsLoading(true)
      setLastStatChanges([])

      const displayContent = displayOverride || playerMessage
      const playerDisplayMessage: DisplayMessage | null =
        !isInitial && displayContent
          ? {
              id: crypto.randomUUID(),
              type: isMetaQuestion ? 'meta-question' : 'player',
              content: displayContent,
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
                content: displayContent,
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
          // Trigger background audit every 8 player turns (non-blocking)
          const AUDIT_INTERVAL = 8
          if (!isInitial && !isMetaQuestion) {
            const playerTurns = finalState.history.messages.filter(m => m.role === 'player').length
            if (playerTurns > 0 && playerTurns % AUDIT_INTERVAL === 0) {
              runAudit(finalState)
            }
          }
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
    [streamRequest, runAudit]
  )

  const handleRetry = useCallback(() => {
    if (!retryContext || isLoadingRef.current) return
    const { playerMessage, state, isMetaQuestion, isInitial, gmMsgId, rollResolution } = retryContext
    setRetryContext(null)
    // Replace the error bubble with a fresh empty one, then re-stream
    const newGmMsgId = crypto.randomUUID()
    setMessages((prev) =>
      prev.map((m) => (m.id === gmMsgId ? { ...m, id: newGmMsgId, content: '', isError: false } : m))
    )
    isLoadingRef.current = true
    setIsLoading(true)
    setRetryContext({ playerMessage, state, isMetaQuestion, isInitial, gmMsgId: newGmMsgId, rollResolution })
    streamRequest(
      { message: playerMessage, gameState: state, isMetaQuestion, isInitial, ...(rollResolution && { rollResolution }) },
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
        ...(prompt.priorToolResults && prompt.priorToolResults.length > 0 && { priorToolResults: prompt.priorToolResults }),
        ...(prompt.sides && { sides: prompt.sides }),
        ...(prompt.rollType && { rollType: prompt.rollType }),
        ...(prompt.damageType && { damageType: prompt.damageType }),
      }

      const modifier = prompt.modifier
      const total = roll + modifier
      const isDmgOrHeal = prompt.rollType === 'damage' || prompt.rollType === 'healing'
      // For contested rolls: compare player total vs NPC total. For static: compare vs DC.
      const effectiveDC = npcTotal !== undefined ? npcTotal : prompt.dc
      const result: 'critical' | 'success' | 'failure' | 'fumble' =
        isDmgOrHeal ? 'success' : roll === 20 ? 'critical' : roll === 1 ? 'fumble' : total >= effectiveDC ? 'success' : 'failure'

      const rollMsgId = crypto.randomUUID()
      const gmMsgId = crypto.randomUUID()
      const rollDisplayData: RollDisplayData = { check: prompt.check, dc: prompt.dc, roll, modifier, total, result, reason: prompt.reason, advantage: prompt.advantage, rawRolls: prompt.rawRolls, contested: prompt.contested, npcRoll: prompt.npcRoll, npcTotal, sides: prompt.sides, rollType: prompt.rollType, damageType: prompt.damageType }

      // If this is a reroll after inspiration, inject the original failed roll first
      const origRoll = originalRollRef.current
      const inspirationMessages: DisplayMessage[] = origRoll ? [
        {
          id: crypto.randomUUID(),
          type: 'roll' as const,
          content: '',
          rollData: { ...origRoll.displayData, isOriginal: true },
        },
        {
          id: crypto.randomUUID(),
          type: 'scene-break' as const,
          content: '◆ Inspiration — Reroll',
        },
      ] : []
      originalRollRef.current = null

      setMessages((prev) => [
        ...prev,
        ...inspirationMessages,
        {
          id: rollMsgId,
          type: 'roll' as const,
          content: '',
          rollData: rollDisplayData,
        },
        { id: gmMsgId, type: 'gm' as const, content: '' },
      ])

      // Persist the roll message to history so it survives reload
      const stateWithRoll = {
        ...prompt.pendingState,
        history: {
          ...prompt.pendingState.history,
          messages: [
            ...prompt.pendingState.history.messages,
            // If inspiration reroll, persist original roll + scene break
            ...(origRoll ? [
              {
                id: crypto.randomUUID(),
                role: 'roll' as const,
                content: '',
                timestamp: new Date().toISOString(),
                rollData: { ...origRoll.displayData, isOriginal: true },
              },
              {
                id: crypto.randomUUID(),
                role: 'scene-break' as const,
                content: '◆ Inspiration — Reroll',
                timestamp: new Date().toISOString(),
              },
            ] : []),
            {
              id: rollMsgId,
              role: 'roll' as const,
              content: '',
              timestamp: new Date().toISOString(),
              rollData: rollDisplayData,
            },
          ],
        },
      }

      // Track NPC failure for contested rolls
      let stateForContinuation = stateWithRoll
      if ((result === 'failure' || result === 'fumble') && prompt.contested && !isDmgOrHeal) {
        const npcName = prompt.contested.npcName
        const approach = prompt.check  // skill name (e.g. "Deception", "Intimidation")
        const failures = stateForContinuation.npcFailures ?? []
        const existing = failures.find(f => f.npcName === npcName && f.approach === approach)
        if (existing) {
          const newCount = existing.failures + 1
          stateForContinuation = {
            ...stateForContinuation,
            npcFailures: failures.map(f =>
              f.npcName === npcName && f.approach === approach
                ? { ...f, failures: newCount, closed: newCount >= 3 }
                : f
            ),
          }
        } else {
          stateForContinuation = {
            ...stateForContinuation,
            npcFailures: [...failures, { npcName, approach, failures: 1, closed: false }],
          }
        }
      }

      await streamRequest(
        { message: '', gameState: stateForContinuation, isMetaQuestion: false, isInitial: false, rollResolution },
        gmMsgId,
        false,
        stateForContinuation,
        (nextRollPrompt) => {
          // Chained roll (e.g. damage after a hit) — show dice modal again
          setRollPrompt(nextRollPrompt)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (finalState, statChanges) => {
          // Run rules engine with roll context for trait detection
          const rollCtx = { check: prompt.check, result }
          finalState = runRulesEngine(finalState, null, rollCtx)
          setGameState(finalState)
          saveGameState(finalState)
          setLastStatChanges(statChanges)
          isLoadingRef.current = false
          setIsLoading(false)
        },
        (msg) => {
          const is504 = msg.includes('504')
          const is529 = msg.includes('529') || msg.toLowerCase().includes('overload')
          const friendlyMsg = is504 ? 'Request timed out — please try again' : is529 ? 'Claude is overloaded right now — please try again in a moment' : `Something went wrong (${msg})`
          setMessages((prev) =>
            prev.map((m) => (m.id === gmMsgId ? { ...m, content: friendlyMsg, isError: true } : m))
          )
          setRetryContext({ playerMessage: '', state: stateWithRoll, isMetaQuestion: false, isInitial: false, gmMsgId, rollResolution })
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
      ...(msg.rollData && { rollData: msg.rollData }),
      ...(msg.statChanges && { statChanges: msg.statChanges }),
      ...(msg.rollBreakdown && { rollBreakdown: msg.rollBreakdown }),
    }))
    setMessages(displayMessages)

    setQuickActionsRaw(state.history.messages.length > 0 ? loadQuickActions() : [])

    if (state.history.messages.length === 0) {
      // Show chapter header before first GM message
      const headerMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        type: 'chapter-header',
        content: `Chapter ${state.meta.chapterNumber}: ${state.meta.chapterTitle}`,
      }
      setMessages([headerMsg])
      sendToGM('', state, false, true)
    }
  }, [sendToGM, initialGameState])

  // Find inventory items whose effect matches the current roll check
  const relevantItems = useMemo(() => {
    if (!rollPrompt || !gameState) return []
    const check = rollPrompt.check.toLowerCase()
    return gameState.character.inventory.filter((item) => {
      if (!item.effect) return false
      const effect = item.effect.toLowerCase()
      // Match if the effect mentions the check type or the stat
      return effect.includes(check) || effect.includes(rollPrompt.stat.toLowerCase())
    }).map((item) => {
      // Try to extract bonus number from effect string (e.g. "+2 to Interrogation")
      const match = item.effect?.match(/[+-](\d+)/)
      return { name: item.name, bonus: match ? parseInt(match[1]) : 0, effect: item.effect || '' }
    }).filter((item) => item.bonus > 0)
  }, [rollPrompt, gameState])

  const handleDiceClick = useCallback(() => {
    if (!rollPrompt || dicePhase !== 'idle') return
    // Apply item bonus to modifier before rolling
    if (selectedItemBonus) {
      rollPrompt.modifier += selectedItemBonus.bonus
    }
    const dieSides = rollPrompt.sides || 20
    const isDmgOrHeal = rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing'
    // Advantage/disadvantage and contested only apply to d20 checks
    const isAdvantage = !isDmgOrHeal && (rollPrompt.advantage === 'advantage' || rollPrompt.advantage === 'disadvantage')
    const isContested = !isDmgOrHeal && !!rollPrompt.contested
    const die1 = Math.floor(Math.random() * dieSides) + 1
    const die2 = isAdvantage ? Math.floor(Math.random() * dieSides) + 1
      : isContested ? Math.floor(Math.random() * 20) + 1  // NPC die always d20
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
    setInspirationOffered(false)
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * dieSides) + 1)
      if (isAdvantage || isContested) setDiceDisplay2(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(isContested ? die2 : die1)
      setDiceDisplay(die1)
      if (isAdvantage || isContested) setDiceDisplay2(die2)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, dicePhase, selectedItemBonus])

  const handleInspirationReroll = useCallback(() => {
    if (!rollPrompt || !gameState || rolledValue === null) return
    // Save original roll for display
    const origTotal = rolledValue + rollPrompt.modifier
    const origEffDC = rollPrompt.contested && rollPrompt.npcRoll !== undefined
      ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : rollPrompt.dc
    const origResult = rolledValue === 20 ? 'critical' : rolledValue === 1 ? 'fumble' : origTotal >= origEffDC ? 'success' : 'failure'
    const origDisplayData: RollDisplayData = {
      check: rollPrompt.check, dc: rollPrompt.dc, roll: rolledValue, modifier: rollPrompt.modifier,
      total: origTotal, result: origResult as RollDisplayData['result'], reason: rollPrompt.reason,
      advantage: rollPrompt.advantage, rawRolls: rawRolls ?? undefined,
      contested: rollPrompt.contested, npcRoll: rollPrompt.npcRoll,
      npcTotal: rollPrompt.contested && rollPrompt.npcRoll !== undefined ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : undefined,
    }
    const origData = { value: rolledValue, total: origTotal, result: origResult, displayData: origDisplayData }
    setOriginalRoll(origData)
    originalRollRef.current = origData

    // Consume inspiration — update both live state and the pending state on the roll prompt
    const updated = {
      ...gameState,
      character: { ...gameState.character, inspiration: false },
    }
    setGameState(updated)
    saveGameState(updated)
    // Update pendingState so the consumed inspiration persists through sendContinuation
    rollPrompt.pendingState = {
      ...rollPrompt.pendingState,
      character: { ...rollPrompt.pendingState.character, inspiration: false },
    }

    // Immediately reroll
    const isAdvantage = rollPrompt.advantage === 'advantage' || rollPrompt.advantage === 'disadvantage'
    const newDie1 = Math.floor(Math.random() * 20) + 1
    const newDie2 = isAdvantage ? Math.floor(Math.random() * 20) + 1 : newDie1
    const newKept = rollPrompt.advantage === 'advantage' ? Math.max(newDie1, newDie2)
      : rollPrompt.advantage === 'disadvantage' ? Math.min(newDie1, newDie2)
      : newDie1
    setRolledValue(newKept)
    if (isAdvantage) setRawRolls([newDie1, newDie2])
    setInspirationOffered(false)
    setDicePhase('rolling')

    const interval = setInterval(() => {
      setDiceDisplay(Math.floor(Math.random() * 20) + 1)
      if (isAdvantage) setDiceDisplay2(Math.floor(Math.random() * 20) + 1)
    }, 50)

    setTimeout(() => {
      clearInterval(interval)
      setDiceDisplay(newDie1)
      if (isAdvantage) setDiceDisplay2(newDie2)
      setDicePhase('revealed')
    }, 700)
  }, [rollPrompt, gameState, rolledValue])

  const handleDeclineInspiration = useCallback(() => {
    if (!rollPrompt || rolledValue === null) return
    setInspirationOffered(false)
    // Continue with the failed roll
    const capturedPrompt = { ...rollPrompt, rawRolls: rawRolls ?? undefined }
    const capturedRoll = rolledValue
    setRollPrompt(null)
    setDicePhase('idle')
    setDiceDisplay(1)
    setDiceDisplay2(1)
    setRolledValue(null)
    setRawRolls(null)
    setSelectedItemBonus(null)
    sendContinuation(capturedRoll, capturedPrompt)
  }, [rollPrompt, rolledValue, rawRolls, sendContinuation])

  // After revealing the dice result, auto-continue to phase 2
  // Unless: roll failed and player has inspiration → offer reroll (not for damage/healing)
  useEffect(() => {
    if (dicePhase !== 'revealed' || rolledValue === null || !rollPrompt) return
    const isDmgOrHeal = rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing'
    const total = rolledValue + rollPrompt.modifier
    const npcTot = rollPrompt.contested && rollPrompt.npcRoll !== undefined
      ? rollPrompt.npcRoll + rollPrompt.contested.npcModifier : null
    const effectiveDC = npcTot !== null ? npcTot : rollPrompt.dc
    const isFail = !isDmgOrHeal && rolledValue !== 20 && (rolledValue === 1 || total < effectiveDC)
    const hasInspiration = gameState?.character.inspiration ?? false

    if (isFail && hasInspiration && !originalRoll) {
      // Don't auto-continue — show inspiration reroll option (only on first roll, not after reroll)
      if (!inspirationOffered) setInspirationOffered(true)
      return  // Always return — never set timeout while inspiration is available
    }

    const t = setTimeout(() => {
      const capturedPrompt = { ...rollPrompt, rawRolls: rawRolls ?? undefined }
      const capturedRoll = rolledValue
      setRollPrompt(null)
      setDicePhase('idle')
      setDiceDisplay(1)
      setDiceDisplay2(1)
      setRolledValue(null)
      setRawRolls(null)
      setSelectedItemBonus(null)
      setInspirationOffered(false)
      setOriginalRoll(null)
      sendContinuation(capturedRoll, capturedPrompt)
    }, originalRoll ? 2000 : 1400)  // slightly longer pause when showing inspiration comparison
    return () => clearTimeout(t)
  }, [dicePhase, rolledValue, rollPrompt, rawRolls, sendContinuation, gameState, inspirationOffered, originalRoll])

  // Attach stat changes to the last GM message as inline tags
  useEffect(() => {
    if (lastStatChanges.length === 0) return
    setMessages((prev) => {
      const lastGmIdx = prev.findLastIndex((m) => m.type === 'gm' && !m.isError)
      if (lastGmIdx === -1) return prev
      const updated = [...prev]
      updated[lastGmIdx] = { ...updated[lastGmIdx], statChanges: lastStatChanges }
      return updated
    })
  }, [lastStatChanges])

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
      applyGenreTheme(state.meta.genre as Genre)
      const displayMessages: DisplayMessage[] = state.history.messages.map((msg) => ({
        id: msg.id,
        type: msg.role as DisplayMessage['type'],
        content: msg.content,
        ...(msg.rollData && { rollData: msg.rollData }),
        ...(msg.statChanges && { statChanges: msg.statChanges }),
        ...(msg.rollBreakdown && { rollBreakdown: msg.rollBreakdown }),
      }))
      setMessages(displayMessages)
      setQuickActions([])
      setLastStatChanges([])
      setRollPrompt(null)
      setDicePhase('idle')
      setRolledValue(null)
    },
    [setQuickActions]
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
      // closeReady stays on game state — the button reappears after the GM responds.
      // The player typing means "one more thing before I close", not "cancel the close".
      sendToGM(action, gameState, isMetaQuestion, false)
    },
    [gameState, sendToGM]
  )

  const handleConnectEvidence = useCallback(() => {
    setIsMenuOpen(false)
    setActionBarPrefill('/connect ')
  }, [])

  const handleSlashCommand = useCallback(
    (commandName: string, args: string) => {
      if (!gameState || isLoadingRef.current) return
      const cmd = slashCommandDefs.find(c => c.name === commandName)
      if (!cmd) return
      const instruction = cmd.buildInstruction(args)
      // Send as a normal player message with the instruction injected
      // The player sees their slash command, the GM gets the instruction
      const displayText = args ? `/${commandName} ${args}` : `/${commandName}`
      sendToGM(instruction, gameState, false, false, displayText)
    },
    [gameState, sendToGM]
  )

  const handleDismissClose = useCallback(() => {
    if (!gameState) return
    const dismissedState = {
      ...gameState,
      meta: { ...gameState.meta, closeReady: false, closeReason: undefined },
    }
    setGameState(dismissedState)
    saveGameState(dismissedState)
  }, [gameState])

  const handleCloseChapter = useCallback(async () => {
    if (!gameState) return
    // Force-reset loading state — a stuck ref shouldn't block chapter close
    isLoadingRef.current = false
    isLoadingRef.current = true
    setIsLoading(true)
    setLastStatChanges([])

    setCloseInProgress(true)
    const preCloseState = gameState
    // Safety: snapshot messages before close sequence in case it fails mid-way
    try {
      localStorage.setItem('storyforge_preclose_messages', JSON.stringify({
        chapter: gameState.meta.chapterNumber,
        title: gameState.meta.chapterTitle,
        messages: gameState.history.messages,
        timestamp: new Date().toISOString(),
      }))
    } catch { /* localStorage full — non-critical */ }
    const gmMsgId = crypto.randomUUID()
    // Don't add a message — the overlay replaces the text stream.
    // streamRequest will try to update a message with this ID but find nothing, which is fine.

    // Three-phase Haiku close sequence
    const runClosePhase = (phase: 1 | 2 | 3, currentState: GameState): Promise<GameState> => {
      return new Promise((resolve, reject) => {
        const phaseGmMsgId = crypto.randomUUID()
        streamRequest(
          {
            message: '',
            gameState: currentState,
            isMetaQuestion: false,
            isInitial: false,
            isChapterClose: true,
            closePhase: phase,
          },
          phaseGmMsgId,
          true,
          currentState,
          () => { /* no roll prompt in close */ },
          (phaseState) => {
            setGameState(phaseState)
            saveGameState(phaseState)
            resolve(phaseState)
          },
          () => reject(new Error(`Close phase ${phase} failed`)),
        )
      })
    }

    try {
      // Phase 1: Close + Level-up + Audit + Frame
      let currentState = await runClosePhase(1, gameState)

      // Phase 2: Skill Points + Debrief
      currentState = await runClosePhase(2, currentState)

      // Phase 3: Narrative Curation (pivotal scenes + signature lines)
      currentState = await runClosePhase(3, currentState)

      // Build close overlay data from pre/post state comparison
      const completedChapter = currentState.history.chapters.find(
        ch => ch.number === preCloseState.meta.chapterNumber && ch.status === 'complete'
      )
      const newProfs = currentState.character.proficiencies.filter(
        p => !preCloseState.character.proficiencies.includes(p)
      )
      const closeData: import('@/lib/types').CloseData = {
        completedChapterNumber: preCloseState.meta.chapterNumber,
        completedChapterTitle: preCloseState.meta.chapterTitle,
        nextChapterTitle: currentState.meta.chapterTitle,
        resolutionMet: '',
        forwardHook: '',
        levelUp: {
          oldLevel: preCloseState.character.level,
          newLevel: currentState.character.level,
          hpIncrease: currentState.character.hp.max - preCloseState.character.hp.max,
          oldHpMax: preCloseState.character.hp.max,
          newHpMax: currentState.character.hp.max,
          newProficiencyBonus: currentState.character.proficiencyBonus !== preCloseState.character.proficiencyBonus
            ? currentState.character.proficiencyBonus : undefined,
        },
        skillPointsAwarded: newProfs,
        debrief: completedChapter?.debrief ?? null,
        nextFrame: currentState.chapterFrame,
      }
      const closedState = {
        ...currentState,
        meta: { ...currentState.meta, chapterClosed: true, closeData },
      }
      setGameState(closedState)
      saveGameState(closedState)
      setCloseInProgress(false)
      isLoadingRef.current = false
      setIsLoading(false)
    } catch {
      setCloseInProgress(false)
      isLoadingRef.current = false
      setIsLoading(false)
    }
  }, [gameState, streamRequest])

  const handleStartNextChapter = useCallback(() => {
    if (!gameState) return
    // Archive current messages to the most recently completed chapter
    const completedChapters = gameState.history.chapters.filter(ch => ch.status === 'complete')
    const lastCompleted = completedChapters[completedChapters.length - 1]
    if (lastCompleted) {
      const archivedChapters = gameState.history.chapters.map(ch =>
        ch.number === lastCompleted.number
          ? { ...ch, messages: gameState.history.messages.map(m => ({ ...m })) }
          : ch
      )
      const newState: GameState = {
        ...gameState,
        meta: { ...gameState.meta, chapterClosed: false, closeData: undefined },
        history: {
          ...gameState.history,
          chapters: archivedChapters,
          messages: [],
          rollLog: [],
        },
      }
      setGameState(newState)
      saveGameState(newState)

      // Clear chat and show chapter header
      const subtitle = newState.chapterFrame?.objective
      const headerMsg: DisplayMessage = {
        id: crypto.randomUUID(),
        type: 'chapter-header',
        content: `Chapter ${newState.meta.chapterNumber}: ${newState.meta.chapterTitle}`,
        sceneBreak: subtitle, // reuse sceneBreak field for the objective subtitle
      }
      setMessages([headerMsg])
      setQuickActions([])

      // Send initial message for the new chapter
      sendToGM('', newState, false, true)
    }
  }, [gameState, sendToGM, setQuickActions])

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
          <div className="mx-auto max-w-[720px] px-4 py-6 overflow-hidden">
            <div className="flex flex-col gap-6">
              {messages.map((message, index) => {
                const isLast = index === messages.length - 1
                if (message.type === 'chapter-header') {
                  return (
                    <div key={message.id} ref={isLast ? lastMessageRef : undefined} className="flex flex-col items-center gap-2 py-6">
                      <div className="h-px w-16 bg-primary/20" />
                      <h2 className="text-center font-heading text-lg font-medium italic text-primary/80" style={{ fontFamily: 'var(--font-narrative)' }}>
                        {message.content}
                      </h2>
                      {message.sceneBreak && (
                        <p className="text-center text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground/70 max-w-[80%]">
                          {message.sceneBreak}
                        </p>
                      )}
                      <div className="h-px w-16 bg-primary/20" />
                    </div>
                  )
                }
                if (message.type === 'scene-break') {
                  return (
                    <div key={message.id} ref={isLast ? lastMessageRef : undefined} className="flex items-center gap-3 py-2">
                      <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-tertiary">{message.content}</span>
                      <div className="h-px flex-1 bg-tertiary/20" />
                    </div>
                  )
                }
                return message.type === 'roll' && message.rollData ? (
                  <div key={message.id} ref={isLast ? lastMessageRef : undefined}>
                    <RollBadge rollData={message.rollData} />
                  </div>
                ) : (
                  <div key={message.id} ref={isLast ? lastMessageRef : undefined}>
                    {message.sceneBreak && (
                      <div className="flex items-center gap-3 py-2 mb-1">
                        <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.2em] text-tertiary">{message.sceneBreak}</span>
                        <div className="h-px flex-1 bg-tertiary/20" />
                      </div>
                    )}
                    <ChatMessage
                      message={{
                        id: message.id,
                        type: message.type as 'gm' | 'player' | 'meta-question' | 'meta-response',
                        content: message.content,
                        timestamp: new Date(),
                      }}
                      statChanges={message.statChanges}
                      onFlag={message.type === 'gm' && !message.isError ? handleConsistencyCheck : undefined}
                      onRetry={message.isError ? handleRetry : undefined}
                    />
                    {message.rollBreakdown && (
                      <div className="mt-2">
                        <EnemyRollBadge breakdown={message.rollBreakdown} />
                      </div>
                    )}
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
          {rollPrompt && (
            <div className="border-t border-border/30 px-4 pt-4 pb-2">
              {dicePhase === 'idle' ? (
                <>
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
                          <div className="text-xs font-medium text-foreground/60">{rollPrompt.contested.npcName}</div>
                          <div className="font-system text-sm text-foreground/60">{rollPrompt.contested.npcSkill} {rollPrompt.contested.npcModifier >= 0 ? '+' : ''}{rollPrompt.contested.npcModifier}</div>
                          <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-lg border border-border/30 bg-card/30 text-2xl">🎲</div>
                        </div>
                        <div className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium">vs</div>
                        <div className="text-right">
                          <div className="text-xs text-primary/60">You</div>
                          <div className="font-system text-sm text-primary">{rollPrompt.check} {rollPrompt.modifier >= 0 ? '+' : ''}{rollPrompt.modifier}</div>
                          <div className="mt-1 flex h-12 w-12 ml-auto items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">🎲</div>
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-foreground/50 italic leading-relaxed">{rollPrompt.reason}</div>
                      <div className="mt-2 text-center text-xs text-primary/60">Tap to roll</div>
                    </>
                  ) : (
                    /* Standard roll — DC check or damage/healing */
                    <>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-primary/70">
                            {rollPrompt.rollType === 'damage' ? `Attack Damage — ${rollPrompt.check}`
                              : rollPrompt.rollType === 'healing' ? `Healing — ${rollPrompt.check}`
                              : `${rollPrompt.check} Check`}
                            {rollPrompt.advantage && !rollPrompt.rollType?.match(/damage|healing/) && (
                              <span className={rollPrompt.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                                — {rollPrompt.advantage}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 flex items-center gap-3 font-system text-sm">
                            {rollPrompt.rollType !== 'damage' && rollPrompt.rollType !== 'healing' && (
                              <>
                                <span className="text-muted-foreground">DC <span className="font-semibold text-foreground">{rollPrompt.dc}</span></span>
                                <span className="text-muted-foreground/30">|</span>
                              </>
                            )}
                            <span className="text-muted-foreground">
                              {rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing' ? `d${rollPrompt.sides || 20}` : rollPrompt.stat}
                              {' '}<span className="font-semibold text-primary">{(rollPrompt.modifier + (selectedItemBonus?.bonus ?? 0)) >= 0 ? '+' : ''}{rollPrompt.modifier + (selectedItemBonus?.bonus ?? 0)}</span>
                              {selectedItemBonus && <span className="text-primary/50 ml-1">({selectedItemBonus.name})</span>}
                            </span>
                            {rollPrompt.damageType && (
                              <>
                                <span className="text-muted-foreground/30">|</span>
                                <span className="text-muted-foreground capitalize">{rollPrompt.damageType}</span>
                              </>
                            )}
                          </div>
                          <div className="mt-1 text-xs text-foreground/50 italic leading-relaxed">
                            {rollPrompt.reason}
                          </div>
                        </div>
                        <div className="ml-4 flex items-center gap-1.5">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">
                            🎲
                          </div>
                          {rollPrompt.advantage && !rollPrompt.rollType?.match(/damage|healing/) && (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/30 bg-primary/5 text-2xl">
                              🎲
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Item bonus toggles — inside the card */}
                      {relevantItems.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {relevantItems.map((item) => {
                            const active = selectedItemBonus?.name === item.name
                            return (
                              <div
                                key={item.name}
                                role="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedItemBonus(active ? null : item)
                                }}
                                className={cn(
                                  'flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-mono transition-all cursor-pointer',
                                  active
                                    ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-400'
                                    : 'border-border/15 bg-secondary/5 text-foreground/40 hover:border-primary/25 hover:text-foreground/60'
                                )}
                              >
                                <span>{active ? '◆' : '◇'}</span>
                                <span>{item.name}</span>
                                <span className={active ? 'text-emerald-400 ml-auto' : 'text-primary/60 ml-auto'}>+{item.bonus}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="mt-3 text-center text-xs text-primary/60">
                        Tap to roll{rollPrompt.advantage && rollPrompt.rollType !== 'damage' && rollPrompt.rollType !== 'healing' ? ' 2d20' : rollPrompt.sides && rollPrompt.sides !== 20 ? ` d${rollPrompt.sides}` : ''}
                      </div>
                    </>
                  )}
                </button>
                </>
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
                const playerWins = result === 'success' || result === 'critical'
                const dieStyle = (isKept: boolean | null, displayVal: number, isNpc?: boolean) => [
                  'flex shrink-0 items-center justify-center rounded-lg border font-mono font-bold transition-all duration-200',
                  'h-14 w-14 text-2xl',
                  dicePhase === 'rolling' ? 'border-border/50 bg-card/50 text-muted-foreground animate-pulse' :
                  !isKept && hasAdv ? 'border-border/30 bg-card/20 text-muted-foreground/40 line-through' :
                  // Contested: grey out the loser
                  isNpc && isContested && dicePhase === 'revealed' && playerWins ? 'border-border/30 bg-card/20 text-muted-foreground/40' :
                  !isNpc && isContested && dicePhase === 'revealed' && !playerWins ? 'border-border/30 bg-card/20 text-muted-foreground/40' :
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
                  // diceDisplay = die1 (player), diceDisplay2 = die2 (NPC)
                  return (
                    <div className={cardColor}>
                      <div className="text-center font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground/60 mb-3">
                        Contested — {rollPrompt.check} vs {rollPrompt.contested!.npcSkill}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <div className="text-xs font-medium text-foreground/60 mb-1">{rollPrompt.contested!.npcName}</div>
                          <div className={dieStyle(null, diceDisplay2, true)}>{diceDisplay2}</div>
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
                          <div className="text-xs font-medium text-foreground/70 mb-1">You</div>
                          <div className={[dieStyle(true, diceDisplay, false), 'ml-auto'].join(' ')}>{diceDisplay}</div>
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
                  <div>
                    {/* Original roll (shown dimmed when inspiration reroll happened) */}
                    {originalRoll && dicePhase === 'revealed' && (
                      <>
                        <div className="rounded-lg border border-border/20 bg-card/20 px-6 py-3 opacity-50">
                          <div className="font-system text-sm text-foreground/60">
                            {originalRoll.value} + {rollPrompt.modifier} = {originalRoll.total} <span className="text-muted-foreground/60">vs DC {rollPrompt.dc}</span>
                            {' '}
                            <span className="text-orange-400/60 line-through">{resultLabel(originalRoll.result)}</span>
                          </div>
                        </div>
                        <div className="my-2 text-center text-[10px] font-semibold uppercase tracking-wider text-tertiary">
                          ◆ Inspiration used — Reroll
                        </div>
                      </>
                    )}
                    <div className={rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing' ? [
                      'rounded-lg border px-6 py-4 transition-all duration-500',
                      dicePhase === 'revealed'
                        ? rollPrompt.rollType === 'healing' ? 'border-emerald-400/40 bg-emerald-400/5' : 'border-primary/40 bg-primary/5'
                        : 'border-border/50 bg-card/50',
                    ].join(' ') : cardColor}>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 font-heading text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {rollPrompt.rollType === 'damage' ? `Attack Damage — ${rollPrompt.check}`
                              : rollPrompt.rollType === 'healing' ? `Healing — ${rollPrompt.check}`
                              : `${rollPrompt.check} — ${rollPrompt.stat}`}
                            {rollPrompt.advantage && dicePhase === 'revealed' && rollPrompt.rollType !== 'damage' && rollPrompt.rollType !== 'healing' && (
                              <span className={rollPrompt.advantage === 'advantage' ? 'text-emerald-400' : 'text-orange-400'}>
                                {rollPrompt.advantage}
                              </span>
                            )}
                          </div>
                          {dicePhase === 'revealed' && rolledValue !== null && total !== null && (
                            <div className="mt-1 font-system text-sm text-foreground">
                              {rolledValue}{rollPrompt.modifier !== 0 && <span className="text-muted-foreground"> {rollPrompt.modifier > 0 ? '+' : ''}{rollPrompt.modifier}</span>} = <span className={rollPrompt.rollType === 'healing' ? 'font-bold text-emerald-400' : rollPrompt.rollType === 'damage' ? 'font-bold text-primary' : ''}>{total}</span>
                              {rollPrompt.rollType === 'damage' || rollPrompt.rollType === 'healing' ? (
                                <span className="text-muted-foreground capitalize"> {rollPrompt.damageType || (rollPrompt.rollType === 'healing' ? 'HP' : 'damage')}</span>
                              ) : (
                                <>
                                  {' '}<span className="text-muted-foreground">vs DC {rollPrompt.dc}</span>
                                  {' '}<span className={resultColor(result)}>— {resultLabel(result)}</span>
                                </>
                              )}
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
                    {/* Post-roll: Inspiration reroll offer */}
                    {inspirationOffered && dicePhase === 'revealed' && (
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={handleInspirationReroll}
                          className="flex-1 rounded-lg border border-tertiary/50 bg-tertiary/10 px-4 py-2.5 text-xs font-medium text-tertiary transition-all hover:bg-tertiary/20"
                        >
                          Reroll — use Inspiration
                        </button>
                        <button
                          onClick={handleDeclineInspiration}
                          className="rounded-lg border border-border/40 bg-secondary/10 px-4 py-2.5 text-xs text-foreground/50 transition-all hover:bg-secondary/20"
                        >
                          Accept
                        </button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
          <ActionBar
            quickActions={rollPrompt ? [] : quickActions}
            onActionSelect={handleActionSelect}
            onCustomAction={handleCustomAction}
            onSlashCommand={handleSlashCommand}
            disabled={isLoading}
            closeReady={!!gameState.meta.closeReady}
            closeReason={gameState.meta.closeReason}
            onCloseChapter={handleCloseChapter}
            prefill={actionBarPrefill}
            onPrefillConsumed={() => setActionBarPrefill(undefined)}
            notebook={gameState.world.notebook}
            operationState={gameState.world.operationState}
            onOpenIntel={() => { setMenuInitialTab('intel'); setIsMenuOpen(true) }}
          />
        </div>
      </main>

      <BurgerMenu
        open={isMenuOpen}
        onOpenChange={(open) => { setIsMenuOpen(open); if (!open) setMenuInitialTab(undefined) }}
        initialTab={menuInitialTab}
        genre={(gameState.meta.genre || 'space-opera') as Genre}
        chapterMission={gameState.chapterFrame}
        onConnectEvidence={handleConnectEvidence}
        onSave={handleSave}
        onLoad={handleLoad}
        onNewGame={onNewGame}
        tokenLog={tokenLog}
        character={{
          name: gameState.character.name,
          species: { name: gameState.character.species },
          class: {
            name: gameState.character.class,
            proficiencies: gameState.character.proficiencies.map((p) => ({ name: p })),
            stats: gameState.character.stats as unknown as Record<string, number>,
            gear: gameState.character.inventory.map((i) => ({
              name: i.name,
              description: i.description,
              damage: i.damage,
              effect: i.effect,
              charges: i.charges,
              maxCharges: i.maxCharges,
            })),
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
          decisions: gameState.world.decisions ?? [],
          antagonist: gameState.world.antagonist,
          tensionClocks: (gameState.world.tensionClocks ?? []).filter((c) => c.status !== 'resolved'),
          notebook: gameState.world.notebook ?? null,
          operationState: gameState.world.operationState ?? null,
          explorationState: gameState.world.explorationState ?? null,
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

      {/* Chapter Close Loading */}
      {closeInProgress && (
        <ChapterCloseLoading chapterTitle={gameState.meta.chapterTitle} />
      )}

      {/* Chapter Close Overlay */}
      {!closeInProgress && gameState.meta.chapterClosed && gameState.meta.closeData && (
        <ChapterCloseOverlay
          closeData={gameState.meta.closeData}
          characterName={gameState.character.name}
          onStartNextChapter={handleStartNextChapter}
        />
      )}
    </div>
  )
}

