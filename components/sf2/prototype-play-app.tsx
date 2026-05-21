'use client'

import {
  Activity,
  ArrowLeft,
  Copy,
  Dice5,
  FileDown,
  Loader2,
  ScrollText,
  Send,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { Sf2PrototypeHandoverExample } from '@/app/play/prototype/page'
import { apiHeaders } from '@/lib/api-key'
import { normalizeAnthropicErrorMessage } from '@/lib/anthropic-error'
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
  type Sf2PrototypeSession,
} from './prototype-session'

const API_ENDPOINTS = {
  narrator: '/api/sf2/narrator',
  archivist: '/api/sf2/archivist',
  handover: '/api/sf2/handover',
}
const PROTOTYPE_HANDOVER_TIMEOUT_MS = 150_000

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
  const rollResolverRef = useRef<((outcome: RollOutcome) => void) | null>(null)
  const pendingRollResourceSpendsRef = useRef<Sf2RollResourceSpend[]>([])

  const busy = isStreaming || isArchiving || Boolean(startingBriefId)
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

  async function start(briefId: string) {
    if (busy) return
    setStartError(null)
    setStatusMessage(null)
    setStartingBriefId(briefId)
    setPendingInput('')
    setActivePlayerInput('')
    setLiveProse('')
    setLiveRolls([])
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
          onLiveRollAdded: (roll) => setLiveRolls((cards) => [...cards, roll]),
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
      archivistReplay: committedTurn.archivistReplay,
      suggestedActions,
      diagnostics: [
        ...diagnostics,
        ...committedTurn.invariantEvents.map(toPrototypeDiagnostic),
      ],
    })

    setSession(nextSession)
    setPendingInput('')
    setActivePlayerInput('')
    setLiveProse('')
    setLiveRolls([])
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
      return cards.map((card, index) => index === targetIndex ? { ...card, outcome } : card)
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
  const displayProse = [
    session.prose,
    activePlayerInput ? `> ${activePlayerInput}` : '',
    liveProse,
  ].filter((part) => part.trim()).join('\n\n')

  return (
    <main className="h-screen overflow-hidden bg-background text-foreground">
      <div className="mx-auto grid h-full w-full max-w-7xl gap-4 px-4 py-4 lg:grid-cols-[270px_minmax(0,1fr)_370px]">
        <aside className="space-y-3 overflow-y-auto rounded-lg border border-border/70 bg-card/70 p-4">
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
          <div className="text-sm text-muted-foreground">
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

        <section className="flex min-h-0 flex-col rounded-lg border border-border/70 bg-card/60">
          <div className="border-b border-border/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  Chapter {state.meta.currentChapter} · {session.brief.genre} / {session.brief.hook}
                </p>
                <h1 className="mt-1 text-2xl font-semibold tracking-normal">{session.brief.title}</h1>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void closeChapter()}
                disabled={busy || pendingCheck !== null || session.transcript.length === 0}
              >
                <ScrollText className="h-4 w-4" />
                Close Chapter
              </Button>
            </div>
            {statusMessage ? (
              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {statusMessage}
              </div>
            ) : null}
            {session.lastError ? (
              <div className="mt-3 rounded-md border border-destructive/60 bg-destructive/10 p-3 text-sm text-destructive">
                {session.lastError}
              </div>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            {displayProse ? (
              <article className="max-w-none font-serif text-[18px] leading-8 text-foreground">
                {renderMarkdown(displayProse)}
              </article>
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
          <div className="border-t border-border/70 p-4">
            {session.suggestedActions.length > 0 ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {session.suggestedActions.map((action) => (
                  <Button
                    key={action}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPendingInput(action)}
                    disabled={busy || pendingCheck !== null}
                  >
                    {action}
                  </Button>
                ))}
              </div>
            ) : null}
            <div className="flex gap-2">
              <Textarea
                value={pendingInput}
                onChange={(event) => setPendingInput(event.target.value)}
                onKeyDown={(event) => {
                  if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                    void sendTurn()
                  }
                }}
                placeholder={pendingCheck ? 'Resolve the roll to continue.' : 'Answer the setup question or take your next action.'}
                className="min-h-20 resize-none"
                disabled={busy || pendingCheck !== null}
              />
              <Button
                type="button"
                onClick={() => void sendTurn()}
                disabled={!pendingInput.trim() || busy || pendingCheck !== null}
                className="h-20 w-14 shrink-0"
              >
                {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </section>

        <aside className="space-y-3 overflow-y-auto rounded-lg border border-border/70 bg-card/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <PanelTitle title="Diagnostics" compact />
            <Button variant="outline" size="sm" onClick={() => setDiagnosticsOpen((open) => !open)}>
              <Activity className="h-4 w-4" />
              {diagnosticsOpen ? 'Hide' : 'Show'}
            </Button>
          </div>
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

function KeyValueBlock({ value }: { value: Record<string, number | string> }) {
  const entries = Object.entries(value)
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No stats yet.</p>
  return (
    <div className="grid grid-cols-2 gap-2">
      {entries.map(([key, entry]) => (
        <div key={key} className="rounded border border-border/50 bg-background/35 p-2">
          <div className="text-xs text-muted-foreground">{key}</div>
          <div className="font-mono text-sm text-foreground">{entry}</div>
        </div>
      ))}
    </div>
  )
}

function ListBlock({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">{empty}</p>
  return <ul className="space-y-1 text-sm text-muted-foreground">{items.map((item) => <li key={item}>{item}</li>)}</ul>
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Roll requested</div>
          <div className="mt-1 text-sm text-foreground">{pendingCheck.skill} vs DC {resolution?.effectiveDc ?? pendingCheck.dc}</div>
          <div className="mt-1 text-xs leading-5 text-muted-foreground">{pendingCheck.why}</div>
          {pendingCheck.consequenceOnFail ? (
            <div className="mt-1 text-xs leading-5 text-muted-foreground">Failure: {pendingCheck.consequenceOnFail}</div>
          ) : null}
        </div>
        <Button type="button" onClick={onRoll}>
          <Dice5 className="h-4 w-4" />
          Roll d20 {formatSigned(resolution?.modifier ?? 0)}
        </Button>
      </div>
      {resolution ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
          <span className="rounded border border-border/50 bg-card/70 px-2 py-1">{resolution.diceMode}</span>
          {resolution.sourceBreakdown.slice(0, 5).map((source, index) => (
            <span key={index} className="rounded border border-border/50 bg-card/70 px-2 py-1">
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
    <details className="rounded border border-border/60 bg-background/30 p-3">
      <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">{title}</summary>
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
