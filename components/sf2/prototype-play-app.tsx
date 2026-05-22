'use client'

import {
  Activity,
  ArrowLeft,
  Copy,
  Dice5,
  FileDown,
  FolderOpen,
  Loader2,
  Save,
  ScrollText,
  Send,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Sf2PrototypeHandoverExample } from '@/app/play/prototype/page'
import { apiHeaders } from '@/lib/api-key'
import { normalizeAnthropicErrorMessage } from '@/lib/anthropic-error'
import {
  createSf2PrototypeSlotPersistence,
  type Sf2PrototypeSaveSlotData,
  type Sf2PrototypeSaveSlotNumber,
  type Sf2PrototypeSlotPersistence,
} from '@/lib/sf2/prototype-persistence'
import {
  runSf2ClientNarratorTurn,
  type Sf2ClientLiveRollView,
  type Sf2ClientPendingCheck,
  type Sf2ClientRollOutcome,
} from '@/lib/sf2/runtime/client-turn-orchestrator'
import {
  commitSf2Turn,
  type Sf2TurnArchivistAdapterResult,
  type Sf2TurnPipelineEvent,
} from '@/lib/sf2/runtime/turn-pipeline'
import {
  applySf2RollResourceSpends,
  resolveSf2Roll,
} from '@/lib/sf2/rolls/resolve'
import type { Sf2RollResourceSpend, Sf2State } from '@/lib/sf2/types'
import { renderMarkdown } from '@/components/game/chat-message'
import { cn } from '@/lib/utils'
import {
  appendSf2PrototypeCommittedTurn,
  buildSf2PrototypeFallbackHandoverDocuments,
  buildSf2PrototypeHandoverRequest,
  continueSf2PrototypeWithHandover,
  createSf2PrototypeSession,
  exportSf2PrototypeArtifact,
  getSf2PrototypeBriefSupport,
  listSf2PrototypeBriefs,
  markSf2PrototypeError,
  toProseFirstTranscript,
  type Sf2PrototypeBrief,
  type Sf2PrototypeDiagnosticEntry,
  type Sf2PrototypeTranscriptRoll,
  type Sf2PrototypeSession,
} from './prototype-session'

const API_ENDPOINTS = {
  narrator: '/api/sf2/narrator',
  archivist: '/api/sf2/archivist',
  handover: '/api/sf2/handover',
}
const PROTOTYPE_HANDOVER_TIMEOUT_MS = 150_000
const EMPTY_PROTOTYPE_SAVE_SLOTS: (Sf2PrototypeSaveSlotData | null)[] = [null, null, null]

type PendingCheck = Sf2ClientPendingCheck
type RollOutcome = Sf2ClientRollOutcome

export function Sf2PrototypePlayApp({
  briefs,
  handoverExamples = [],
}: {
  briefs: Sf2PrototypeBrief[]
  handoverExamples?: Sf2PrototypeHandoverExample[]
}) {
  const briefCards = useMemo(() => listSf2PrototypeBriefs(briefs), [briefs])
  const [session, setSession] = useState<Sf2PrototypeSession | null>(null)
  const [pendingInput, setPendingInput] = useState('')
  const [activePlayerInput, setActivePlayerInput] = useState('')
  const [liveProse, setLiveProse] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [startingBriefId, setStartingBriefId] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null)
  const [rollResult, setRollResult] = useState<RollOutcome | null>(null)
  const [liveRolls, setLiveRolls] = useState<Sf2ClientLiveRollView[]>([])
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true)
  const [saveSlots, setSaveSlots] = useState<(Sf2PrototypeSaveSlotData | null)[]>(() => [...EMPTY_PROTOTYPE_SAVE_SLOTS])
  const [saveSlotStatus, setSaveSlotStatus] = useState<string | null>(null)
  const [loadingSaveSlots, setLoadingSaveSlots] = useState(true)
  const rollResolverRef = useRef<((outcome: RollOutcome) => void) | null>(null)
  const pendingRollResourceSpendsRef = useRef<Sf2RollResourceSpend[]>([])
  const slotPersistenceRef = useRef<Sf2PrototypeSlotPersistence | null>(null)
  const liveRollsRef = useRef<Sf2ClientLiveRollView[]>([])

  const busy = isStreaming || isArchiving || Boolean(startingBriefId)
  const hasSavedPrototypeSlots = saveSlots.some(Boolean)
  const handoverForSession = session
    ? handoverExamples.find((example) => example.briefId === session.brief.id)
    : null
  const artifact = useMemo(() => {
    if (!session) return null
    const base = exportSf2PrototypeArtifact(session)
    if (!base.handoverDocuments.sessionBrief && handoverForSession) {
      base.handoverDocuments = handoverForSession.documents
    }
    return base
  }, [session, handoverForSession])

  useEffect(() => {
    const persistence = createSf2PrototypeSlotPersistence()
    slotPersistenceRef.current = persistence
    let cancelled = false

    async function bootSaveSlots() {
      try {
        const slots = await persistence.listSaveSlots()
        if (!cancelled) setSaveSlots(slots)
      } catch (error) {
        if (!cancelled) {
          setSaveSlotStatus(error instanceof Error ? error.message : 'Could not load prototype save slots')
        }
      } finally {
        if (!cancelled) setLoadingSaveSlots(false)
      }
    }

    void bootSaveSlots()
    return () => {
      cancelled = true
    }
  }, [])

  function setTransientSaveStatus(message: string, durationMs = 3000) {
    setSaveSlotStatus(message)
    window.setTimeout(() => setSaveSlotStatus(null), durationMs)
  }

  async function refreshSaveSlots() {
    const persistence = slotPersistenceRef.current
    if (!persistence) return
    try {
      setSaveSlots(await persistence.listSaveSlots())
    } catch {
      setSaveSlots([...EMPTY_PROTOTYPE_SAVE_SLOTS])
    }
  }

  async function persistIfSavedSlot(nextSession: Sf2PrototypeSession) {
    const persistence = slotPersistenceRef.current
    if (!persistence) return
    try {
      const slots = await persistence.listSaveSlots()
      const matchingSlot = slots.find((slot) => slot?.campaignId === nextSession.state.meta.campaignId)
      if (matchingSlot) {
        await persistence.saveToSlot(matchingSlot.slot, nextSession)
        setSaveSlots(await persistence.listSaveSlots())
      } else {
        setSaveSlots(slots)
      }
    } catch {
      // Prototype saves are a convenience layer; never interrupt the live turn loop.
    }
  }

  async function savePrototypeToSlot(slot: Sf2PrototypeSaveSlotNumber) {
    if (!session) return
    const persistence = slotPersistenceRef.current
    if (!persistence) return
    try {
      await persistence.saveToSlot(slot, session)
      await refreshSaveSlots()
      setTransientSaveStatus(`Saved slot ${slot}`)
    } catch (error) {
      setTransientSaveStatus(error instanceof Error ? error.message : 'Save failed', 5000)
    }
  }

  function loadPrototypeSaveSlot(slot: Sf2PrototypeSaveSlotData) {
    if (busy) return
    setSession(slot.session)
    setStartError(null)
    setStatusMessage(null)
    setPendingInput('')
    setActivePlayerInput('')
    setLiveProse('')
    setLiveRolls([])
    liveRollsRef.current = []
    setRollResult(null)
    setPendingCheck(null)
    rollResolverRef.current = null
    pendingRollResourceSpendsRef.current = []
    setTransientSaveStatus(`Loaded slot ${slot.slot}`)
  }

  async function start(briefId: string) {
    if (busy) return
    setStartError(null)
    setStatusMessage(null)
    setStartingBriefId(briefId)
    setPendingInput('')
    setActivePlayerInput('')
    setLiveProse('')
    setLiveRolls([])
    liveRollsRef.current = []
    setRollResult(null)
    setPendingCheck(null)
    pendingRollResourceSpendsRef.current = []

    try {
      const created = createSf2PrototypeSession(briefs, briefId)
      setSession(created)
      await runPrototypeTurn(created, '', true)
    } catch (error) {
      setSession(null)
      setStartError(error instanceof Error ? error.message : 'Could not start the prototype brief.')
    } finally {
      setStartingBriefId(null)
    }
  }

  async function sendTurn() {
    if (!session || busy || pendingCheck) return
    const cleanInput = pendingInput.trim()
    if (!cleanInput) return
    setPendingInput('')
    await runPrototypeTurn(session, cleanInput, false)
  }

  async function runPrototypeTurn(
    baseSession: Sf2PrototypeSession,
    playerInput: string,
    isInitialOverride?: boolean
  ) {
    const diagnostics: Sf2PrototypeDiagnosticEntry[] = []
    let suggestedActions: string[] = []
    const currentChapterTurns = baseSession.state.history.turns.filter(
      (turn) => turn.chapter === baseSession.state.meta.currentChapter
    ).length
    const isInitial = isInitialOverride ?? currentChapterTurns === 0

    setStatusMessage(isInitial ? 'Opening live narrator stream...' : 'Streaming narrator turn...')
    setActivePlayerInput(isInitial ? '' : playerInput)
    setLiveProse('')
    setLiveRolls([])
    liveRollsRef.current = []
    setRollResult(null)
    setPendingCheck(null)
    pendingRollResourceSpendsRef.current = []

    const recordDiagnostic = (entry: Sf2PrototypeDiagnosticEntry) => {
      diagnostics.push(entry)
    }

    let narratorResult: Awaited<ReturnType<typeof runSf2ClientNarratorTurn>>
    try {
      narratorResult = await runSf2ClientNarratorTurn({
        state: baseSession.state,
        playerInput,
        isInitial,
        turnIndex: baseSession.currentTurn,
        fetchNarrator: (body) => {
          const payload = body && typeof body === 'object' ? body as Record<string, unknown> : {}
          return fetch(API_ENDPOINTS.narrator, {
            method: 'POST',
            headers: apiHeaders(),
            body: JSON.stringify({
              ...payload,
              proseFirst: {
                enabled: true,
                systemPrompt: baseSession.chapterSystemPrompt,
                systemPromptLabel: baseSession.systemPromptLabel,
                transcript: toProseFirstTranscript(baseSession),
              },
            }),
          })
        },
        requestRoll: () => new Promise<RollOutcome>((resolve) => {
          rollResolverRef.current = resolve
        }),
        effects: {
          onStreamingChange: setIsStreaming,
          onProse: setLiveProse,
          onSuggestedActions: (actions) => {
            suggestedActions = actions
            setSession((current) => current ? { ...current, suggestedActions: actions } : current)
          },
          onPendingCheck: setPendingCheck,
          onRollResult: setRollResult,
          onLiveRollAdded: (roll) => {
            liveRollsRef.current = [...liveRollsRef.current, roll]
            setLiveRolls(liveRollsRef.current)
          },
          onInspirationOffer: () => {},
          onResetPendingInspirationSpend: () => {
            pendingRollResourceSpendsRef.current = []
          },
          onAnnotation: (annotation) => {
            recordDiagnostic({ kind: 'narrator_annotation', at: Date.now(), data: annotation })
          },
          onNarratorUsage: (usage) => {
            recordDiagnostic({ kind: 'token_usage', at: Date.now(), data: { role: 'narrator', ...usage } })
          },
          onDiagnostic: (entry) => recordDiagnostic(toPrototypeDiagnostic(entry)),
        },
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'narrator_request_failed'
      setSession(markSf2PrototypeError(baseSession, `Narrator failed: ${normalizeAnthropicErrorMessage(message)}`, diagnostics))
      setPendingInput(isInitial ? '' : playerInput)
      setActivePlayerInput('')
      setLiveProse('')
      setLiveRolls([])
      liveRollsRef.current = []
      setRollResult(null)
      setPendingCheck(null)
      setStatusMessage(null)
      pendingRollResourceSpendsRef.current = []
      return
    }

    if (!narratorResult.completed) {
      const message = narratorResult.errorMessage
        ? `Narrator failed: ${normalizeAnthropicErrorMessage(narratorResult.errorMessage)}`
        : narratorResult.prose.trim()
          ? 'Narrator output was discarded because it did not commit state. Retry the action.'
          : 'Narrator did not commit the turn. Retry the action.'
      const failedSession = markSf2PrototypeError(baseSession, message, diagnostics)
      setSession(failedSession)
      setPendingInput(isInitial ? '' : playerInput)
      setActivePlayerInput('')
      setLiveProse('')
      setLiveRolls([])
      liveRollsRef.current = []
      setRollResult(null)
      setStatusMessage(null)
      pendingRollResourceSpendsRef.current = []
      return
    }

    setStatusMessage('Running Archivist extraction...')
    const committedTurn = await commitSf2Turn({
      stateBefore: baseSession.state,
      turnIndex: baseSession.currentTurn,
      playerInput,
      isInitial,
      narrator: {
        prose: narratorResult.prose,
        annotation: narratorResult.annotation,
        bundleBuilt: narratorResult.bundleBuilt,
        rollRecords: narratorResult.rollRecords,
        sentinelEvents: narratorResult.sentinelEvents,
        workingSet: narratorResult.workingSet,
      },
      applyArchivist: ({ stateWithTurnLogged, narratorProse, narratorAnnotation, nextTurnIndex }) =>
        runArchivist(stateWithTurnLogged, narratorProse, narratorAnnotation, nextTurnIndex, diagnostics),
    })

    const stateAfter = structuredClone(committedTurn.stateAfter)
    stateAfter.history.recentTurns = stateAfter.history.turns.slice(-6)
    committedTurn.replayFrame.stateAfter = structuredClone(stateAfter)

    const nextSession = appendSf2PrototypeCommittedTurn({
      session: baseSession,
      stateAfter,
      turnIndex: baseSession.currentTurn,
      nextTurnIndex: committedTurn.nextTurnIndex,
      playerInput: isInitial ? '' : playerInput,
      narratorProse: narratorResult.prose,
      rollRecords: buildPrototypeTranscriptRolls(narratorResult.rollRecords, liveRollsRef.current),
      archivistReplay: committedTurn.archivistReplay,
      suggestedActions,
      diagnostics: [
        ...diagnostics,
        ...committedTurn.invariantEvents.map(toPrototypeDiagnostic),
      ],
    })

    setSession(nextSession)
    void persistIfSavedSlot(nextSession)
    setPendingInput('')
    setActivePlayerInput('')
    setLiveProse('')
    setLiveRolls([])
    liveRollsRef.current = []
    setRollResult(null)
    setPendingCheck(null)
    setStatusMessage(null)
    pendingRollResourceSpendsRef.current = []
  }

  async function runArchivist(
    preTurnState: Sf2State,
    narratorProse: string,
    narratorAnnotation: Record<string, unknown> | null,
    nextTurnIndex: number,
    diagnostics: Sf2PrototypeDiagnosticEntry[]
  ): Promise<Sf2TurnArchivistAdapterResult> {
    setIsArchiving(true)
    try {
      const res = await fetch(API_ENDPOINTS.archivist, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          state: preTurnState,
          narratorProse,
          narratorAnnotation: narratorAnnotation ?? undefined,
          turnIndex: nextTurnIndex,
        }),
      })

      if (!res.ok) {
        let errorBody: unknown = null
        try {
          errorBody = await res.json()
        } catch {
          try { errorBody = await res.text() } catch {}
        }
        diagnostics.push({
          kind: 'error',
          at: Date.now(),
          data: { status: res.status, source: 'archivist', body: errorBody },
        })
        return { nextState: preTurnState, replay: null }
      }

      const data = await res.json() as {
        nextState: Sf2State
        patch: unknown
        outcomes: unknown
        deferredWrites: unknown
        drift: unknown
        summary: unknown
        coherenceFindings?: unknown
        invariantEvents?: unknown
        usage?: unknown
        latency?: unknown
      }
      diagnostics.push({
        kind: 'archivist',
        at: Date.now(),
        data: {
          summary: data.summary,
          patch: data.patch,
          outcomes: data.outcomes,
          deferred: data.deferredWrites,
          drift: data.drift,
          coherenceFindings: data.coherenceFindings ?? [],
        },
      })
      if (data.usage) {
        diagnostics.push({ kind: 'token_usage', at: Date.now(), data: { role: 'archivist', ...objectValue(data.usage) } })
      }
      if (data.latency) {
        diagnostics.push({ kind: 'latency', at: Date.now(), data: { role: 'archivist', ...objectValue(data.latency) } })
      }

      return {
        nextState: data.nextState,
        replay: {
          patch: data.patch,
          outcomes: data.outcomes,
          deferredWrites: data.deferredWrites,
          drift: data.drift,
          summary: data.summary,
          coherenceFindings: data.coherenceFindings ?? [],
        },
        invariantEvents: Array.isArray(data.invariantEvents)
          ? data.invariantEvents as Sf2TurnPipelineEvent[]
          : undefined,
      }
    } catch (error) {
      diagnostics.push({
        kind: 'error',
        at: Date.now(),
        data: error instanceof Error ? error.message : 'archivist_error',
      })
      return { nextState: preTurnState, replay: null }
    } finally {
      setIsArchiving(false)
    }
  }

  async function closeChapter() {
    if (!session || busy || pendingCheck) return
    if (session.transcript.length === 0) {
      setSession(markSf2PrototypeError(session, 'Play at least one narrated turn before compiling a handover.'))
      return
    }

    setIsArchiving(true)
    setStatusMessage('Compiling chapter handover...')
    let continuationSession: Sf2PrototypeSession | null = null
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), PROTOTYPE_HANDOVER_TIMEOUT_MS)
    try {
      const res = await fetch(API_ENDPOINTS.handover, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(buildSf2PrototypeHandoverRequest(session)),
        signal: controller.signal,
      })
      if (!res.ok) {
        let body: unknown = null
        try { body = await res.json() } catch {
          try { body = await res.text() } catch {}
        }
        const documents = buildSf2PrototypeFallbackHandoverDocuments(
          session,
          `handover route failed: HTTP ${res.status}`
        )
        continuationSession = continueSf2PrototypeWithHandover({
          ...session,
          lastHandoverResult: {
            ok: false,
            documents: null,
            diagnostics: [{
              code: 'prototype_handover_http_error',
              severity: 'warning',
              message: `Handover route failed with HTTP ${res.status}.`,
            }],
            error: 'prototype_handover_http_error',
            message: typeof body === 'string' ? body : JSON.stringify(body),
            status: res.status,
            model: 'prototype-fallback',
          },
        }, documents)
        setSession(continuationSession)
        setStatusMessage('Opening Chapter 2 from fallback handover...')
      } else {
        const result = await res.json() as NonNullable<Sf2PrototypeSession['lastHandoverResult']>
        if (!result.ok) {
          const documents = buildSf2PrototypeFallbackHandoverDocuments(
            session,
            result.message ? `compiler failed open: ${result.message}` : `compiler failed open: ${result.error}`
          )
          continuationSession = continueSf2PrototypeWithHandover({
            ...session,
            lastHandoverResult: result,
            diagnostics: [
              ...session.diagnostics,
              {
                kind: 'handover_fallback',
                at: Date.now(),
                data: result,
              },
            ],
          }, documents)
          setSession(continuationSession)
          setStatusMessage('Opening Chapter 2 from fallback handover...')
        } else {
          continuationSession = continueSf2PrototypeWithHandover({
            ...session,
            lastHandoverResult: result,
          }, result.documents)
          setSession(continuationSession)
          setStatusMessage('Opening Chapter 2 from handover...')
        }
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'handover_error'
      const errorName = error instanceof Error ? error.name : ''
      if (errorName === 'AbortError') {
        const documents = buildSf2PrototypeFallbackHandoverDocuments(
          session,
          `compiler timed out after ${PROTOTYPE_HANDOVER_TIMEOUT_MS / 1000}s`
        )
        continuationSession = continueSf2PrototypeWithHandover({
          ...session,
          lastHandoverResult: {
            ok: false,
            documents: null,
            diagnostics: [{
              code: 'prototype_handover_timeout',
              severity: 'warning',
              message: `Prototype handover compiler timed out after ${PROTOTYPE_HANDOVER_TIMEOUT_MS / 1000}s.`,
            }],
            error: 'prototype_handover_timeout',
            message: reason,
            model: 'prototype-fallback',
          },
        }, documents)
        setSession(continuationSession)
        setStatusMessage('Opening Chapter 2 from fallback handover...')
      } else {
        setSession(markSf2PrototypeError(
          session,
          reason,
          [{
            kind: 'handover',
            at: Date.now(),
            data: reason,
          }]
        ))
      }
    } finally {
      window.clearTimeout(timeout)
      setIsArchiving(false)
    }

    if (continuationSession) {
      void persistIfSavedSlot(continuationSession)
      await runPrototypeTurn(continuationSession, '', true)
    }
  }

  function stateWithPendingRollSpends(state: Sf2State): Sf2State {
    return applySf2RollResourceSpends(state, pendingRollResourceSpendsRef.current)
  }

  function rememberRollResourceSpends(outcome: RollOutcome) {
    if (!outcome.spentResources || outcome.spentResources.length === 0) return
    pendingRollResourceSpendsRef.current = [
      ...pendingRollResourceSpendsRef.current,
      ...outcome.spentResources,
    ]
  }

  function completePendingRoll(outcome: RollOutcome) {
    rememberRollResourceSpends(outcome)
    const resolver = rollResolverRef.current
    rollResolverRef.current = null
    if (resolver) resolver(outcome)
  }

  function setLatestLiveRollOutcome(outcome: RollOutcome) {
    setLiveRolls((cards) => {
      let pendingIndex = -1
      for (let i = cards.length - 1; i >= 0; i -= 1) {
        if (!cards[i].outcome) {
          pendingIndex = i
          break
        }
      }
      const targetIndex = pendingIndex >= 0 ? pendingIndex : cards.length - 1
      if (targetIndex < 0) return cards
      const nextCards = cards.map((card, index) => index === targetIndex ? { ...card, outcome } : card)
      liveRollsRef.current = nextCards
      return nextCards
    })
  }

  function resolvePendingCheck() {
    if (!session || !pendingCheck) return
    const resolution = resolveSf2Roll(stateWithPendingRollSpends(session.state), pendingCheck)
    if (resolution.resolutionKind === 'trait_auto_success' || resolution.resolutionKind === 'trait_auto_critical') {
      const outcome: RollOutcome = {
        modifier: resolution.modifier,
        total: resolution.effectiveDc,
        dc: pendingCheck.dc,
        effectiveDc: resolution.effectiveDc,
        result: resolution.resolutionKind === 'trait_auto_critical' ? 'critical' : 'success',
        resolutionKind: resolution.resolutionKind,
        diceMode: resolution.diceMode,
        criticalRange: resolution.criticalRange,
        sourceBreakdown: resolution.sourceBreakdown,
        selectedRollAction: resolution.selectedRollAction,
        spentResources: resolution.spentResources,
        skill: pendingCheck.skill,
        modifierType: resolution.modifierType,
        modifierReason: resolution.modifierReason,
      }
      setLatestLiveRollOutcome(outcome)
      completePendingRoll(outcome)
      return
    }

    const first = rollD20()
    const second =
      resolution.diceMode === 'advantage' || resolution.diceMode === 'disadvantage'
        ? rollD20()
        : undefined
    const d20 =
      resolution.diceMode === 'advantage' && second !== undefined
        ? Math.max(first, second)
        : resolution.diceMode === 'disadvantage' && second !== undefined
          ? Math.min(first, second)
          : first
    const outcome: RollOutcome = {
      ...resolveRoll(d20, resolution.modifier, pendingCheck.dc, resolution.effectiveDc, resolution.criticalRange),
      rawRolls: second !== undefined ? [first, second] : undefined,
      skill: pendingCheck.skill,
      resolutionKind: 'rolled',
      diceMode: resolution.diceMode,
      criticalRange: resolution.criticalRange,
      sourceBreakdown: resolution.sourceBreakdown,
      selectedRollAction: resolution.selectedRollAction,
      spentResources: resolution.spentResources,
      modifierType: resolution.modifierType,
      modifierReason: resolution.modifierReason,
    }
    setLatestLiveRollOutcome(outcome)
    completePendingRoll(outcome)
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background text-foreground">
        <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 py-8">
          <div className="mb-7">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground">SF2 prose-first prototype</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-normal">Choose a campaign brief</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              The prototype now calls the live Narrator, live Archivist, and handover compiler. Unsupported briefs stay visible but cannot start until SF2 has state metadata for them.
            </p>
            {startError ? (
              <div className="mt-4 rounded-lg border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
                {startError}
              </div>
            ) : null}
          </div>
          {loadingSaveSlots || hasSavedPrototypeSlots || saveSlotStatus ? (
            <div className="mb-7">
              {loadingSaveSlots ? (
                <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-card/70 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Loading slots
                </div>
              ) : (
                <PrototypeSaveSlotsPanel
                  slots={saveSlots}
                  status={saveSlotStatus}
                  busy={busy}
                  canSave={false}
                  onLoadSaveSlot={loadPrototypeSaveSlot}
                />
              )}
            </div>
          ) : null}
          {briefCards.length === 0 ? (
            <div className="rounded-lg border border-border/70 bg-card/80 p-5 text-sm leading-6 text-muted-foreground">
              No active SF2 campaign briefs could be loaded.
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-3">
            {briefCards.map((brief) => {
              const support = getSf2PrototypeBriefSupport(brief)
              const isStarting = startingBriefId === brief.id
              return (
                <button
                  key={brief.id}
                  type="button"
                  onClick={() => support.supported && void start(brief.id)}
                  disabled={!support.supported || Boolean(startingBriefId)}
                  className={cn(
                    'rounded-lg border border-border/70 bg-card/80 p-5 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                    support.supported
                      ? 'hover:border-primary/70 hover:bg-card'
                      : 'cursor-not-allowed opacity-60',
                  )}
                >
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">{brief.genre} / {brief.hook}</div>
                  <h2 className="mt-3 text-xl font-semibold tracking-normal">{brief.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{brief.premise}</p>
                  <p className="mt-5 border-t border-border/60 pt-3 text-xs leading-5 text-muted-foreground">
                    {support.supported ? brief.toneReference : support.unsupportedReason}
                  </p>
                  {isStarting ? (
                    <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Starting live loop
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      </main>
    )
  }

  const state = session.state
  const latestSnapshot = session.snapshots.at(-1)
  const currentRollResolution = pendingCheck
    ? resolveSf2Roll(stateWithPendingRollSpends(state), pendingCheck)
    : null
  const hasNarrativeContent =
    session.transcript.length > 0 || activePlayerInput.trim().length > 0 || liveProse.trim().length > 0

  return (
    <main className="min-h-dvh overflow-x-hidden bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <div className="mx-auto grid min-h-dvh w-full max-w-7xl gap-3 px-3 py-3 lg:h-full lg:grid-cols-[270px_minmax(0,1fr)_370px] lg:gap-4 lg:px-4 lg:py-4">
        <aside className="order-2 min-w-0 space-y-3 overflow-visible rounded-lg border border-border/70 bg-card/70 p-3 sm:p-4 lg:order-none lg:overflow-y-auto">
          <Button
            variant="ghost"
            size="sm"
            className="mb-2 px-2"
            onClick={() => setSession(null)}
            disabled={busy}
          >
            <ArrowLeft className="h-4 w-4" />
            Briefs
          </Button>
          <PanelTitle title="Character" />
          <div className="min-w-0 text-sm text-muted-foreground [overflow-wrap:anywhere]">
            <div className="font-medium text-foreground">{state.player.name}</div>
            <div>{state.player.origin.name} {state.player.class.name}</div>
            <div>HP {state.player.hp.current}/{state.player.hp.max} · AC {state.player.ac}</div>
          </div>
          <PanelTitle title="Stats" />
          <KeyValueBlock value={latestSnapshot?.stats ?? {}} />
          <PanelTitle title="Inventory" />
          <ListBlock items={latestSnapshot?.inventory ?? []} empty="No inventory recorded." />
          <PanelTitle title="Clocks" />
          <ListBlock
            items={(latestSnapshot?.clocks ?? []).map((clock) => `${clock.name}: ${clock.value}/${clock.max}`)}
            empty="No active clocks yet."
          />
          <PanelTitle title="NPCs" />
          <ListBlock items={latestSnapshot?.npcs ?? []} empty="Archivist has not recorded NPCs yet." />
        </aside>

        <section className="order-1 flex min-h-[calc(100dvh-1.5rem)] min-w-0 flex-col rounded-lg border border-border/70 bg-card/60 lg:order-none lg:min-h-0">
          <div className="border-b border-border/70 p-3 sm:p-4">
            <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground [overflow-wrap:anywhere] sm:text-[11px] sm:tracking-[0.16em]">
                  Chapter {state.meta.currentChapter} · {session.brief.genre} / {session.brief.hook}
                </p>
                <h1 className="mt-1 break-words text-xl font-semibold tracking-normal sm:text-2xl">{session.brief.title}</h1>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => void closeChapter()}
                disabled={busy || pendingCheck !== null || session.transcript.length === 0}
              >
                <ScrollText className="h-4 w-4" />
                Close Chapter
              </Button>
            </div>
            {statusMessage ? (
              <div className="mt-3 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                <span className="min-w-0 break-words">{statusMessage}</span>
              </div>
            ) : null}
            {session.lastError ? (
              <div className="mt-3 rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
                {session.lastError}
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
            {hasNarrativeContent ? (
              <div className="mx-auto flex w-full max-w-3xl flex-col space-y-5">
                {session.transcript.map((entry) => (
                  entry.speaker === 'player' ? (
                    <PlayerMessage key={entry.id}>{entry.content}</PlayerMessage>
                  ) : entry.speaker === 'narrator' ? (
                    <NarratorProse key={entry.id} prose={entry.content} rolls={entry.rolls} />
                  ) : null
                ))}
                {activePlayerInput ? <PlayerMessage>{activePlayerInput}</PlayerMessage> : null}
                {liveProse ? (
                  <NarratorProse prose={liveProse} trailing={isStreaming ? <span className="animate-pulse text-primary"> |</span> : undefined} />
                ) : null}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Waiting for the live narrator...
              </div>
            )}
          </div>
          {pendingCheck ? (
            <RollPanel
              pendingCheck={pendingCheck}
              resolution={currentRollResolution}
              rollResult={rollResult}
              liveRolls={liveRolls}
              onRoll={resolvePendingCheck}
            />
          ) : null}
          <div className="border-t border-border/70 p-3 sm:p-4">
            {session.suggestedActions.length > 0 ? (
              <div className="mb-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                {session.suggestedActions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto min-h-8 max-w-full shrink whitespace-normal px-3 py-2 text-left leading-snug"
                    onClick={() => setPendingInput(action)}
                    disabled={busy || pendingCheck !== null}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
              <Textarea
                value={pendingInput}
                onChange={(event) => setPendingInput(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    void sendTurn()
                  }
                }}
                placeholder={pendingCheck ? 'Resolve the roll to continue.' : 'Answer the setup question or take your next action.'}
                className="min-h-20 min-w-0 resize-none"
                disabled={busy || pendingCheck !== null}
              />
              <Button
                type="button"
                onClick={() => void sendTurn()}
                disabled={!pendingInput.trim() || busy || pendingCheck !== null}
                className="h-11 w-full shrink-0 sm:h-20 sm:w-14"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>

        <aside className="order-3 min-w-0 space-y-3 overflow-visible rounded-lg border border-border/70 bg-card/70 p-3 sm:p-4 lg:order-none lg:overflow-y-auto">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle title="Diagnostics" compact />
            <Button variant="outline" size="sm" onClick={() => setDiagnosticsOpen((open) => !open)}>
              <Activity className="h-4 w-4" />
              {diagnosticsOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
          <PrototypeSaveSlotsPanel
            slots={saveSlots}
            status={saveSlotStatus}
            busy={busy}
            canSave
            onSaveToSlot={(slot) => {
              void savePrototypeToSlot(slot)
            }}
            onLoadSaveSlot={loadPrototypeSaveSlot}
          />
          {diagnosticsOpen && artifact ? (
            <div className="space-y-3">
              <DiagnosticSection title="Loaded Brief" value={session.brief.brief} />
              <DiagnosticSection title="Growing Transcript" value={formatTranscript(session)} />
              <DiagnosticSection title="Latest Mechanical Snapshot" value={JSON.stringify(latestSnapshot, null, 2)} />
              <DiagnosticSection title="Current Sf2 State" value={JSON.stringify(session.state, null, 2)} />
              <DiagnosticSection title="Archivist Output" value={JSON.stringify(session.archivistOutputs, null, 2)} />
              {session.handoverDocuments ? (
                <>
                  <DiagnosticSection title="Handover: Session Brief" value={session.handoverDocuments.sessionBrief} />
                  <DiagnosticSection title="Handover: GM Memory" value={session.handoverDocuments.gmMemory} />
                  <DiagnosticSection title="Handover: Quick Reference" value={session.handoverDocuments.quickReference} />
                </>
              ) : handoverForSession ? (
                <>
                  <DiagnosticSection title="Example Handover: Session Brief" value={handoverForSession.documents.sessionBrief} />
                  <DiagnosticSection title="Example Handover: GM Memory" value={handoverForSession.documents.gmMemory} />
                  <DiagnosticSection title="Example Handover: Quick Reference" value={handoverForSession.documents.quickReference} />
                </>
              ) : null}
              <DiagnosticSection title="Runtime Diagnostics" value={JSON.stringify(session.diagnostics, null, 2)} />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" onClick={() => navigator.clipboard?.writeText(JSON.stringify(artifact, null, 2))}>
                  <Copy className="h-4 w-4" />
                  Copy
                </Button>
                <Button variant="outline" size="sm" onClick={() => downloadArtifact(artifact, session.brief.id)}>
                  <FileDown className="h-4 w-4" />
                  JSON
                </Button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </main>
  )
}

function PanelTitle({ title, compact = false }: { title: string; compact?: boolean }) {
  return <h2 className={cn('font-mono text-[11px] uppercase tracking-[0.16em] text-primary', compact ? 'mt-0' : 'mt-4 first:mt-0')}>{title}</h2>
}

function PlayerMessage({ children }: { children: ReactNode }) {
  return (
    <div
      className="ml-auto max-w-[92%] whitespace-pre-wrap rounded-l-lg border-r border-primary/35 bg-primary/15 py-3 pl-5 pr-5 text-foreground shadow-[0_0_22px_-12px] shadow-primary/20 md:max-w-[82%] md:py-4 md:pl-6 md:pr-6"
      style={{ fontFamily: 'var(--font-narrative)', lineHeight: 1.65 }}
    >
      {children}
    </div>
  )
}

function NarratorProse({
  prose,
  rolls,
  trailing,
  children,
}: {
  prose?: string
  rolls?: Sf2PrototypeTranscriptRoll[]
  trailing?: ReactNode
  children?: ReactNode
}) {
  const articleClass = "max-w-none font-serif text-[17px] leading-7 text-foreground [overflow-wrap:anywhere] sm:text-[18px] sm:leading-8"

  // If no rolls with offsets, render simply
  const rollsWithOffsets = rolls?.filter((r) => typeof r.proseOffset === 'number') ?? []
  if (!prose || rollsWithOffsets.length === 0) {
    return (
      <article className={articleClass}>
        {prose ? renderMarkdown(prose) : children}
        {trailing}
        {rolls?.length ? (
          <div className="mt-4 space-y-3">
            {rolls.map((roll, index) => (
              <RollResultCard key={`${roll.turn}-${roll.proseOffset ?? index}-${index}`} roll={roll} />
            ))}
          </div>
        ) : null}
      </article>
    )
  }

  // Split prose at roll offsets and interleave roll cards
  const sorted = [...rollsWithOffsets].sort((a, b) => (a.proseOffset ?? 0) - (b.proseOffset ?? 0))
  const nodes: ReactNode[] = []
  let cursor = 0

  sorted.forEach((roll, index) => {
    const offset = Math.max(cursor, Math.min(prose.length, roll.proseOffset!))
    const before = prose.slice(cursor, offset)
    if (before.trim()) {
      nodes.push(
        <div key={`prose-${index}`}>{renderMarkdown(before)}</div>
      )
    }
    nodes.push(
      <div key={`roll-${index}`} className="my-4">
        <RollResultCard roll={roll} />
      </div>
    )
    cursor = offset
  })

  const after = prose.slice(cursor)
  if (after.trim() || trailing) {
    nodes.push(
      <div key="prose-final">
        {after.trim() ? renderMarkdown(after) : null}
        {trailing}
      </div>
    )
  }

  // Any rolls without offsets go at the end
  const rollsWithoutOffsets = rolls?.filter((r) => typeof r.proseOffset !== 'number') ?? []

  return (
    <article className={articleClass}>
      {nodes}
      {rollsWithoutOffsets.length ? (
        <div className="mt-4 space-y-3">
          {rollsWithoutOffsets.map((roll, index) => (
            <RollResultCard key={`no-offset-${index}`} roll={roll} />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function RollResultCard({ roll }: { roll: Sf2PrototypeTranscriptRoll }) {
  const tone = rollToneForPrototypeRoll(roll.outcome)
  const dc = roll.effectiveDc ?? roll.dc
  const total = roll.total ?? (roll.rollResult !== undefined ? roll.rollResult + roll.modifier : dc)

  return (
    <div className={cn(
      'rounded-lg border p-3 font-mono text-sm leading-normal shadow-sm',
      tone === 'critical' && 'border-primary/60 bg-primary/15 text-primary',
      tone === 'success' && 'border-success/55 bg-success/10 text-success',
      tone === 'failure' && 'border-warning/55 bg-warning/10 text-warning',
      tone === 'fumble' && 'border-severe/60 bg-severe/10 text-severe',
    )}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{roll.skill} vs DC {dc}</span>
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">{rollOutcomeLabel(roll.outcome)}</span>
      </div>
      <div className="mt-2 text-xs text-foreground/80">
        {roll.rollResult !== undefined ? `d20(${roll.rollResult})` : roll.resolutionKind ?? 'auto'} {formatSigned(roll.modifier)} = {total}
      </div>
      {roll.why ? (
        <div className="mt-2 text-xs leading-5 text-foreground/75">{roll.why}</div>
      ) : null}
      {roll.consequenceSummary ? (
        <div className="mt-2 text-xs leading-5 text-foreground/75">{roll.consequenceSummary}</div>
      ) : roll.consequenceOnFail ? (
        <div className="mt-2 text-xs leading-5 text-foreground/75">Failure: {roll.consequenceOnFail}</div>
      ) : null}
    </div>
  )
}

function buildPrototypeTranscriptRolls(
  rollRecords: Sf2State['history']['rollLog'],
  liveRolls: Sf2ClientLiveRollView[]
): Sf2PrototypeTranscriptRoll[] {
  return rollRecords.map((roll, index) => {
    const liveRoll = liveRolls[index]
      ?? liveRolls.find((candidate) => candidate.proseOffset === roll.proseOffset)
    return {
      ...roll,
      why: liveRoll?.check.why,
      consequenceOnFail: liveRoll?.check.consequenceOnFail,
    }
  })
}

function rollToneForPrototypeRoll(outcome: Sf2State['history']['rollLog'][number]['outcome']) {
  if (outcome === 'critical_success') return 'critical'
  if (outcome === 'critical_failure') return 'fumble'
  if (outcome === 'success') return 'success'
  return 'failure'
}

function rollOutcomeLabel(outcome: Sf2State['history']['rollLog'][number]['outcome']) {
  if (outcome === 'critical_success') return 'Critical'
  if (outcome === 'critical_failure') return 'Fumble'
  if (outcome === 'success') return 'Success'
  return 'Failure'
}

function KeyValueBlock({ value }: { value: Record<string, number | string> }) {
  const entries = Object.entries(value)
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No stats yet.</p>
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {entries.map(([key, entry]) => (
        <div key={key} className="min-w-0 rounded border border-border/50 bg-background/35 p-2">
          <div className="break-words text-xs text-muted-foreground">{key}</div>
          <div className="break-words font-mono text-sm text-foreground">{entry}</div>
        </div>
      ))}
    </div>
  )
}

function ListBlock({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return (
    <ul className="min-w-0 space-y-1 text-sm text-muted-foreground [overflow-wrap:anywhere]">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function PrototypeSaveSlotsPanel({
  slots,
  status,
  busy,
  canSave,
  onSaveToSlot,
  onLoadSaveSlot,
}: {
  slots: (Sf2PrototypeSaveSlotData | null)[]
  status?: string | null
  busy: boolean
  canSave: boolean
  onSaveToSlot?: (slot: Sf2PrototypeSaveSlotNumber) => void
  onLoadSaveSlot: (slot: Sf2PrototypeSaveSlotData) => void
}) {
  return (
    <section className="min-w-0 rounded-lg border border-border/60 bg-background/30 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Save Games</h2>
        {status ? (
          <span className="min-w-0 break-words text-right font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            {status}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-2">
        {([1, 2, 3] as const).map((slotNumber) => {
          const slot = slots[slotNumber - 1]
          return (
            <div
              key={slotNumber}
              className={cn(
                'grid gap-2 border-t border-border/25 pt-2 first:border-t-0 first:pt-0',
                canSave ? 'sm:grid-cols-[minmax(0,1fr)_auto_auto]' : 'sm:grid-cols-[minmax(0,1fr)_auto]',
              )}
            >
              <div className="min-w-0">
                {slot ? (
                  <>
                    <div className="truncate text-sm font-semibold tracking-normal text-foreground/90">
                      Slot {slotNumber}: {slot.title}
                    </div>
                    <div className="mt-0.5 truncate text-xs leading-snug text-muted-foreground/80">
                      {slot.playerName} / {slot.playerClass} / Ch.{slot.chapterNumber}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground/65">
                      {timeAgo(slot.savedAt)} / {slot.turnCount} turns
                    </div>
                  </>
                ) : (
                  <div className="text-xs leading-snug text-muted-foreground/75">Slot {slotNumber}: empty</div>
                )}
              </div>
              {canSave ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onSaveToSlot?.(slotNumber)}
                  disabled={busy}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => slot && onLoadSaveSlot(slot)}
                disabled={busy || !slot}
              >
                <FolderOpen className="h-4 w-4" />
                Load
              </Button>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function RollPanel({
  pendingCheck,
  resolution,
  rollResult,
  liveRolls,
  onRoll,
}: {
  pendingCheck: PendingCheck
  resolution: ReturnType<typeof resolveSf2Roll> | null
  rollResult: RollOutcome | null
  liveRolls: Sf2ClientLiveRollView[]
  onRoll: () => void
}) {
  const latestRoll = liveRolls.at(-1)
  return (
    <div className="border-t border-border/70 bg-background/45 p-4">
      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0 [overflow-wrap:anywhere]">
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Roll requested</div>
          <div className="mt-1 text-sm text-foreground">{pendingCheck.skill} vs DC {resolution?.effectiveDc ?? pendingCheck.dc}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{pendingCheck.why}</div>
          {pendingCheck.consequenceOnFail ? (
            <div className="mt-1 text-xs leading-5 text-muted-foreground">Failure: {pendingCheck.consequenceOnFail}</div>
          ) : null}
        </div>
        <Button type="button" className="w-full sm:w-auto" onClick={onRoll}>
          <Dice5 className="h-4 w-4" />
          Roll d20 {formatSigned(resolution?.modifier ?? 0)}
        </Button>
      </div>
      {resolution ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="max-w-full rounded border border-border/50 bg-card/70 px-2 py-1 break-words">{resolution.diceMode}</span>
          {resolution.sourceBreakdown.slice(0, 5).map((source, index) => (
            <span key={index} className="max-w-full rounded border border-border/50 bg-card/70 px-2 py-1 break-words">
              {source.label}
            </span>
          ))}
        </div>
      ) : null}
      {rollResult ?? latestRoll?.outcome ? (
        <div className="mt-3 rounded border border-border/60 bg-card/70 p-3 text-sm">
          {formatRollOutcome(rollResult ?? latestRoll?.outcome)}
        </div>
      ) : null}
    </div>
  )
}

function DiagnosticSection({ title, value }: { title: string; value: string }) {
  return (
    <details className="min-w-0 rounded border border-border/60 bg-background/30 p-3">
      <summary className="cursor-pointer break-words font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground [overflow-wrap:anywhere]">{title}</summary>
      <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{value}</pre>
    </details>
  )
}

function formatTranscript(session: Sf2PrototypeSession): string {
  return session.transcript
    .map((entry) => `[CH${entry.chapter} T${entry.turn} ${entry.speaker.toUpperCase()}] ${entry.content}`)
    .join('\n\n')
}

function downloadArtifact(artifact: unknown, briefId: string) {
  const blob = new Blob([JSON.stringify(artifact, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `sf2-prose-first-${briefId}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20)
}

function resolveRoll(d20: number, modifier: number, dc: number, effectiveDc = dc, criticalRange = 20): RollOutcome {
  const total = d20 + modifier
  const normalizedCriticalRange = Math.min(20, Math.max(2, Math.trunc(criticalRange)))
  let result: RollOutcome['result']
  if (d20 === 1) result = 'fumble'
  else if (d20 === 20 || d20 >= normalizedCriticalRange) result = 'critical'
  else if (total >= effectiveDc) result = 'success'
  else result = 'failure'
  return { d20, modifier, total, dc, effectiveDc, result }
}

function formatSigned(value: number): string {
  if (value > 0) return `+${value}`
  return String(value)
}

function formatRollOutcome(outcome: RollOutcome | undefined): string {
  if (!outcome) return ''
  const roll = outcome.d20 === undefined ? 'auto' : `d20 ${outcome.d20}`
  return `${roll} ${formatSigned(outcome.modifier)} = ${outcome.total} vs DC ${outcome.effectiveDc ?? outcome.dc}: ${outcome.result}`
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

function toPrototypeDiagnostic(entry: { kind: string; at: number; data: unknown }): Sf2PrototypeDiagnosticEntry {
  return {
    kind: entry.kind,
    at: entry.at,
    data: entry.data,
  }
}

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : { value }
}
