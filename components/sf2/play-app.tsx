'use client'

// Storyforge v2 play app
// Stage 2 end-to-end: Narrator streams → Archivist applies patch → IDB persists.
// Includes a minimal pending-check roll flow (d20 + modifier computed client-side,
// result sent as a follow-up turn). The clean tool_result-continuation roll flow
// is Stage 3+ work.

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { apiHeaders } from '@/lib/api-key'
import { CharacterSetup } from '@/components/setup/character-setup'
import { WorldSetup } from '@/components/setup/world-setup'
import { applyGenreTheme, getGenreConfig, type CharacterClass, type Genre, type Species } from '@/lib/genre-config'
import {
  createInitialSf2State,
  isArcAuthored,
  isChapterAuthored,
} from '@/lib/sf2/game-data'
import {
  listSf2SetupHooks,
} from '@/lib/sf2/setup/options'
import type { Sf2SetupCalibrationAnswer, Sf2SetupSelection } from '@/lib/sf2/setup/types'
import { applyAuthorChapterOpening } from '@/lib/sf2/author/chapter-opening'
import { computeSessionSummary } from '@/lib/sf2/instrumentation/session-summary'
import {
  diagnosticsStore,
  type TokenUsage,
} from '@/lib/sf2/diagnostics-store'
import {
  runSf2ClientNarratorTurn,
  type Sf2ClientPendingCheck,
  type Sf2ClientRollOutcome,
} from '@/lib/sf2/runtime/client-turn-orchestrator'
import {
  applySf2RollResourceSpends,
  resolveSf2Roll,
} from '@/lib/sf2/rolls/resolve'
import { normalizeAnthropicErrorMessage } from '@/lib/anthropic-error'
import {
  createIndexedDbPersistence,
} from '@/lib/sf2/persistence/indexeddb'
import {
  applyChapterPlaystyleArtifact,
  markPlaystylePersonalizationStatus,
} from '@/lib/sf2/playstyle/profile'
import {
  commitSf2Turn,
  observeActorFirewallWrite,
  type Sf2TurnPipelineEvent,
  type Sf2TurnReplayFrame,
} from '@/lib/sf2/runtime/turn-pipeline'
import {
  chapterPressureRuntime,
} from '@/lib/sf2/pressure/runtime'
import {
  Sf2PlayShell,
  type Sf2CloseReadinessView,
  type Sf2LiveRollView,
} from '@/components/sf2/play-shell'
import type {
  Sf2SaveSlotData,
  Sf2SaveSlotNumber,
  StoryforgePersistence2,
} from '@/lib/sf2/persistence/types'
import type {
  AuthorChapterSetupV2,
  Sf2Arc,
  Sf2ArcPlan,
  Sf2Faction,
  Sf2RollResourceSpend,
  Sf2State,
  Sf2Thread,
  Sf2TurnDiffEntry,
} from '@/lib/sf2/types'

const LAST_CAMPAIGN_KEY = 'sf2_last_campaign_id'
const DEFAULT_SF2_SETUP_GENRE_ID: Genre = 'space-opera'
const EMPTY_SAVE_SLOTS: (Sf2SaveSlotData | null)[] = [null, null, null]

const API_ENDPOINTS = {
  narrator: '/api/sf2/narrator',
  archivist: '/api/sf2/archivist',
  arcAuthor: '/api/sf2/arc-author',
  author: '/api/sf2/author',
  chapterMeaning: '/api/sf2/chapter-meaning',
  playstyle: '/api/sf2/playstyle',
}

interface LatencyPayload {
  totalMs: number
  apiMs: number
  ttftMs?: number
  attempts?: number
}

type ReplayFrame = Sf2TurnReplayFrame

type PendingCheck = Sf2ClientPendingCheck
type RollOutcome = Sf2ClientRollOutcome
type SetupStep = 'world' | 'character'

interface WizardSetupData {
  genre: Genre
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

function firewallTurnIndexFor(state: Sf2State): number {
  return state.history.turns.at(-1)?.index ?? state.history.turns.length
}


export function Sf2PlayApp() {
  const [state, setState] = useState<Sf2State | null>(null)
  const [lastCampaign, setLastCampaign] = useState<Sf2State | null>(null)
  const [showCampaignSelect, setShowCampaignSelect] = useState(false)
  const [saveSlots, setSaveSlots] = useState<(Sf2SaveSlotData | null)[]>(() => [...EMPTY_SAVE_SLOTS])
  const [saveSlotStatus, setSaveSlotStatus] = useState<string | null>(null)
  const [setupStep, setSetupStep] = useState<SetupStep>('world')
  const [setupData, setSetupData] = useState<WizardSetupData>({ genre: DEFAULT_SF2_SETUP_GENRE_ID })
  const [setupError, setSetupError] = useState<string | null>(null)
  const [prose, setProse] = useState<string>('')
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [pendingInput, setPendingInput] = useState<string>('')
  const [activePlayerInput, setActivePlayerInput] = useState<string>('')
  const [turnCommitError, setTurnCommitError] = useState<string | null>(null)
  const [liveRolls, setLiveRolls] = useState<Sf2LiveRollView[]>([])
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null)
  const [rollResult, setRollResult] = useState<RollOutcome | null>(null)
  const [inspirationOffer, setInspirationOffer] = useState<RollOutcome | null>(null)
  const [selectedRollActionId, setSelectedRollActionId] = useState<string | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const replayFramesRef = useRef<ReplayFrame[]>([])
  const [turnIndex, setTurnIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pivotSignaled, setPivotSignaled] = useState(false)
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false)
  const generationStartTimeRef = useRef<number | null>(null)
  const [generationElapsed, setGenerationElapsed] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pendingInitialBottomScrollRef = useRef(false)
  const pendingLiveTurnScrollRef = useRef(false)
  const [liveTurnScrollKey, setLiveTurnScrollKey] = useState(0)
  const persistenceRef = useRef<StoryforgePersistence2 | null>(null)
  // When a roll_prompt arrives mid-stream, we store a resolver the modal calls
  // after the player rolls. The narrator loop awaits this promise before
  // resuming with rollResolution.
  const rollResolverRef = useRef<((outcome: RollOutcome) => void) | null>(null)
  // Inspiration spends are only persisted once the full turn commits. This
  // keeps a paused roll from mutating state that sendTurn later replaces.
  const pendingInspirationSpendRef = useRef(0)
  const pendingRollResourceSpendsRef = useRef<Sf2RollResourceSpend[]>([])

  function stateWithPendingRollSpends(s: Sf2State): Sf2State {
    return applySf2RollResourceSpends(s, pendingRollResourceSpendsRef.current)
  }

  const refreshSaveSlots = useCallback(async () => {
    const p = persistenceRef.current
    if (!p) return
    try {
      setSaveSlots(await p.listSaveSlots())
    } catch {
      setSaveSlots([...EMPTY_SAVE_SLOTS])
    }
  }, [])

  const activateCampaign = useCallback((loaded: Sf2State) => {
    pendingInitialBottomScrollRef.current = true
    setState(loaded)
    setLastCampaign(loaded)
    setShowCampaignSelect(false)
    setProse('')
    setPendingInput('')
    setActivePlayerInput('')
    setTurnCommitError(null)
    setLiveRolls([])
    setPendingCheck(null)
    setRollResult(null)
    setInspirationOffer(null)
    setTurnIndex(loaded.history.turns.length)
    setPivotSignaled(chapterHasPivotSignal(loaded))
    pendingInspirationSpendRef.current = 0
    pendingRollResourceSpendsRef.current = []
    setSelectedRollActionId(null)
    const lastTurn = loaded.history.turns[loaded.history.turns.length - 1]
    setSuggestedActions(lastTurn?.narratorAnnotation?.suggestedActions ?? [])
    try {
      applyGenreTheme(loaded.meta.genreId as Genre)
    } catch {
      document.documentElement.setAttribute('data-genre', loaded.meta.genreId)
    }
    document.body.setAttribute('data-genre', loaded.meta.genreId)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LAST_CAMPAIGN_KEY, loaded.meta.campaignId)
    }
  }, [])

  // Initialize persistence + list campaigns/save slots.
  useEffect(() => {
    const p = createIndexedDbPersistence()
    persistenceRef.current = p
    const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_CAMPAIGN_KEY) : null

    async function boot() {
      try {
        const [loaded, slots] = await Promise.all([
          lastId ? p.loadCampaign(lastId) : Promise.resolve(null),
          p.listSaveSlots(),
        ])
        setLastCampaign(loaded)
        setSaveSlots(slots)
        if (loaded) {
          try {
            applyGenreTheme(loaded.meta.genreId as Genre)
          } catch {
            document.documentElement.setAttribute('data-genre', loaded.meta.genreId)
          }
          document.body.setAttribute('data-genre', loaded.meta.genreId)
        } else if (lastId && typeof window !== 'undefined') {
          window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
        }
        setShowCampaignSelect(Boolean(loaded || slots.some(Boolean)))
      } catch {
        if (lastId && typeof window !== 'undefined') {
          window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
        }
        setLastCampaign(null)
        setSaveSlots([...EMPTY_SAVE_SLOTS])
        setShowCampaignSelect(false)
      } finally {
        setLoading(false)
      }
    }

    void boot()
  }, [])

  useLayoutEffect(() => {
    if (!state || loading || !pendingInitialBottomScrollRef.current) return
    const scroller = scrollRef.current
    if (!scroller) return
    pendingInitialBottomScrollRef.current = false
    requestAnimationFrame(() => {
      scroller.scrollTop = scroller.scrollHeight
    })
  }, [loading, state])

  useLayoutEffect(() => {
    if (!pendingLiveTurnScrollRef.current || liveTurnScrollKey === 0) return
    const scroller = scrollRef.current
    const liveTurn = scroller?.querySelector<HTMLElement>('[data-sf2-live-turn]')
    if (!scroller || !liveTurn) return
    pendingLiveTurnScrollRef.current = false
    requestAnimationFrame(() => {
      liveTurn.scrollIntoView({ block: 'start' })
    })
  }, [liveTurnScrollKey, activePlayerInput, prose, isStreaming, isGeneratingChapter, isArchiving])

  useEffect(() => {
    if (state || showCampaignSelect) return
    try {
      applyGenreTheme(setupData.genre)
    } catch {
      document.documentElement.setAttribute('data-genre', setupData.genre)
    }
    document.body.setAttribute('data-genre', setupData.genre)
  }, [setupData.genre, showCampaignSelect, state])

  // Live timer while generating a chapter (Author call can take 30-90s).
  useEffect(() => {
    if (!isGeneratingChapter) {
      setGenerationElapsed(0)
      return
    }
    const interval = setInterval(() => {
      const start = generationStartTimeRef.current
      if (start === null) return
      setGenerationElapsed(Math.floor((Date.now() - start) / 1000))
    }, 500)
    return () => clearInterval(interval)
  }, [isGeneratingChapter])

  const persist = useCallback(async (s: Sf2State) => {
    const p = persistenceRef.current
    if (!p) return
    try {
      await p.saveCampaign(s)
      const slots = await p.listSaveSlots()
      const matchingSlot = slots.find((slot) => slot?.campaignId === s.meta.campaignId)
      if (matchingSlot) {
        await p.saveToSlot(matchingSlot.slot, s)
        setSaveSlots(await p.listSaveSlots())
      } else {
        setSaveSlots(slots)
      }
      setLastCampaign(s)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CAMPAIGN_KEY, s.meta.campaignId)
      }
    } catch {
      // non-fatal; surface in debug if needed
    }
  }, [])

  function handleWorldSetupComplete(data: { genre: Genre }) {
    setSetupData({ genre: data.genre })
    setSetupStep('character')
    setSetupError(null)
    try {
      applyGenreTheme(data.genre)
    } catch {
      document.documentElement.setAttribute('data-genre', data.genre)
    }
    document.body.setAttribute('data-genre', data.genre)
  }

  function handleBackToWorldSetup() {
    setSetupError(null)
    setSetupStep('world')
  }

  function startCampaignFromWizard(data: {
    name: string
    species: Species
    characterClass: CharacterClass
    gender: 'he' | 'she' | 'they'
    hookId?: string
    calibrationAnswers?: Sf2SetupCalibrationAnswer[]
  }) {
    let hooks: ReturnType<typeof listSf2SetupHooks> = []
    try {
      hooks = listSf2SetupHooks(setupData.genre, data.species.id, data.characterClass.id)
    } catch {
      hooks = []
    }
    if (hooks.length === 0) {
      setSetupError('No SF2 opening hook is available for that origin and playbook yet.')
      return
    }
    const hook =
      hooks.find((candidate) => candidate.id === data.hookId) ??
      hooks[Math.min(Math.floor(Math.random() * hooks.length), hooks.length - 1)]
    const calibrationAnswers = (data.calibrationAnswers ?? []).filter((answer) =>
      answer.question.trim() && answer.answer.trim()
    ).slice(0, 5)
    const setupSelection: Sf2SetupSelection = {
      genreId: setupData.genre,
      originId: data.species.id,
      playbookId: data.characterClass.id,
      hookId: hook.id,
      characterName: data.name,
      ...(calibrationAnswers.length > 0 ? { calibrationAnswers } : {}),
    }
    const next = createInitialSf2State({
      campaignId: `camp_${Date.now()}`,
      playerName: data.name,
      setupSelection,
    })
    setState(next)
    setLastCampaign(next)
    setShowCampaignSelect(false)
    setSaveSlotStatus(null)
    setProse('')
    setTurnCommitError(null)
    setSuggestedActions([])
    diagnosticsStore.resetAll()
    replayFramesRef.current = []
    setPendingCheck(null)
    setRollResult(null)
    setTurnIndex(0)
    setPivotSignaled(false)
    pendingInspirationSpendRef.current = 0
    pendingRollResourceSpendsRef.current = []
    setSelectedRollActionId(null)
    diagnosticsStore.pushDebug({
      kind: 'experiment',
      at: Date.now(),
      data: {
        seedId: next.meta.seedId,
        setupSelection,
        setupSurface: 'v1_wizard',
        hookTitle: hook.title,
        calibrationStatus: calibrationAnswers.length === 0
          ? 'skipped'
          : calibrationAnswers.length >= 5
            ? 'completed'
            : 'answered',
        calibrationAnswerCount: calibrationAnswers.length,
      },
    })
    persist(next)
  }

  async function resetCampaign() {
    const p = persistenceRef.current
    if (p && state) {
      try {
        await p.deleteCampaign(state.meta.campaignId)
      } catch {}
    }
    if (typeof window !== 'undefined' && state) {
      window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
    }
    setState(null)
    setLastCampaign(null)
    setShowCampaignSelect(false)
    setSaveSlotStatus(null)
    setSetupStep('world')
    setSetupData({ genre: DEFAULT_SF2_SETUP_GENRE_ID })
    setSetupError(null)
    setProse('')
    setTurnCommitError(null)
    setActivePlayerInput('')
    setLiveRolls([])
    setSuggestedActions([])
    diagnosticsStore.resetDebug()
    replayFramesRef.current = []
    setTurnIndex(0)
    setPendingCheck(null)
    setPivotSignaled(false)
    pendingInspirationSpendRef.current = 0
    pendingRollResourceSpendsRef.current = []
    setSelectedRollActionId(null)
    void refreshSaveSlots()
  }

  function continueLastCampaign() {
    if (!lastCampaign) return
    activateCampaign(lastCampaign)
  }

  function startNewCampaignSetup() {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
    }
    setState(null)
    setLastCampaign(null)
    setShowCampaignSelect(false)
    setSaveSlotStatus(null)
    setSetupStep('world')
    setSetupData({ genre: DEFAULT_SF2_SETUP_GENRE_ID })
    setSetupError(null)
    setProse('')
    setTurnCommitError(null)
    setActivePlayerInput('')
    setPendingInput('')
    setLiveRolls([])
    setSuggestedActions([])
    setPendingCheck(null)
    setRollResult(null)
    setInspirationOffer(null)
    setTurnIndex(0)
    setPivotSignaled(false)
    pendingInspirationSpendRef.current = 0
    pendingRollResourceSpendsRef.current = []
    setSelectedRollActionId(null)
  }

  async function saveToSlot(slot: Sf2SaveSlotNumber) {
    if (!state) return
    const p = persistenceRef.current
    if (!p) return
    try {
      await p.saveCampaign(state)
      await p.saveToSlot(slot, state)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CAMPAIGN_KEY, state.meta.campaignId)
      }
      setLastCampaign(state)
      setSaveSlots(await p.listSaveSlots())
      setSaveSlotStatus(`Saved slot ${slot}`)
      window.setTimeout(() => setSaveSlotStatus(null), 3000)
    } catch (error) {
      setSaveSlotStatus(error instanceof Error ? error.message : 'Save failed')
      window.setTimeout(() => setSaveSlotStatus(null), 5000)
    }
  }

  async function loadSaveSlot(slot: Sf2SaveSlotData) {
    if (state) {
      await persist(state)
    }
    activateCampaign(slot.state)
    await persist(slot.state)
    await refreshSaveSlots()
  }

  function cleanNarratorErrorMessage(message: string): string {
    return normalizeAnthropicErrorMessage(message)
  }

  async function runNarrator(
    currentState: Sf2State,
    playerInput: string,
    isInitial: boolean
  ) {
    setLiveRolls([])
    return runSf2ClientNarratorTurn({
      state: currentState,
      playerInput,
      isInitial,
      turnIndex,
      fetchNarrator: (body) => fetch(API_ENDPOINTS.narrator, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      }),
      requestRoll: () => {
        // The modal resolves this promise after the player rolls.
        return new Promise<RollOutcome>((resolve) => {
          rollResolverRef.current = resolve
        })
      },
      effects: {
        onStreamingChange: setIsStreaming,
        onProse: setProse,
        onSuggestedActions: setSuggestedActions,
        onPendingCheck: (check) => {
          setPendingCheck(check)
          setSelectedRollActionId(null)
        },
        onRollResult: setRollResult,
        onLiveRollAdded: (roll) => setLiveRolls((cards) => [...cards, roll]),
        onInspirationOffer: setInspirationOffer,
        onResetPendingInspirationSpend: () => {
          pendingInspirationSpendRef.current = 0
          pendingRollResourceSpendsRef.current = []
          setSelectedRollActionId(null)
        },
        onAnnotation: (annotation) => {
          if (annotationHasPivotSignal(annotation)) setPivotSignaled(true)
        },
        onNarratorUsage: (usage) => diagnosticsStore.setNarratorUsage(usage),
        onDiagnostic: (entry) => diagnosticsStore.pushDebug(entry),
      },
    })
  }

  async function runArchivist(
    preTurnState: Sf2State,
    narratorProse: string,
    narratorAnnotation: Record<string, unknown> | null,
    nextTurnIndex: number
  ): Promise<{
    nextState: Sf2State
    replay: ReplayFrame['archivist']
    invariantEvents?: Sf2TurnPipelineEvent[]
  }> {
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
          try {
            errorBody = await res.text()
          } catch {}
        }
        diagnosticsStore.pushDebug({
            kind: 'error',
            at: Date.now(),
            data: { status: res.status, source: 'archivist', body: errorBody },
          })
        return { nextState: preTurnState, replay: null }
      }
      const data = (await res.json()) as {
        nextState: Sf2State
        patch: unknown
        outcomes: unknown
        deferredWrites: unknown
        drift: unknown
        summary: unknown
        faceShift: unknown
        ladderFired: unknown[]
        pruneSummary?: { demotedDecisions: number; demotedPromises: number; consumedClues: number; clearedFloatingClues: number }
        coherenceFindings?: Array<{
          type: string
          severity: 'low' | 'medium' | 'high'
          evidenceQuote: string
          stateReference: string
          suggestedNote: string
        }>
        invariantEvents?: Sf2TurnPipelineEvent[]
        usage: TokenUsage
        latency?: LatencyPayload
      }
      diagnosticsStore.setArchivistUsage(data.usage)
      const archivistPatch = data.patch && typeof data.patch === 'object'
        ? data.patch as { flags?: unknown[] }
        : null
      diagnosticsStore.pushDebug({
          kind: 'archivist',
          at: Date.now(),
          data: {
            summary: data.summary,
            patch: data.patch,
            flags: Array.isArray(archivistPatch?.flags) ? archivistPatch.flags : [],
            outcomes: data.outcomes,
            deferred: data.deferredWrites,
            drift: data.drift,
          },
        })
      if (Array.isArray(data.drift)) {
        for (const drift of data.drift as Array<{ kind?: string; detail?: string; entityId?: string }>) {
          if (drift.kind === 'identity_drift' && drift.detail?.startsWith('dedup:')) {
            diagnosticsStore.pushDebug({
                kind: 'sf2.invariant',
                at: Date.now(),
                data: {
                  type: 'placeholder_or_duplicate_npc_merged',
                  entityId: drift.entityId,
                  detail: drift.detail,
                },
              })
          } else if (drift.kind === 'anchor_reference_missing') {
            diagnosticsStore.pushDebug({
                kind: 'sf2.invariant',
                at: Date.now(),
                data: {
                  type: 'anchor_miss',
                  entityId: drift.entityId,
                  detail: drift.detail,
                },
              })
          }
        }
      }
      if (data.faceShift) {
        diagnosticsStore.pushDebug({ kind: 'face_shift', at: Date.now(), data: data.faceShift })
      }
      if (Array.isArray(data.ladderFired) && data.ladderFired.length > 0) {
        diagnosticsStore.pushDebug({ kind: 'ladder_fired', at: Date.now(), data: data.ladderFired })
      }
      const pruneTotal =
        (data.pruneSummary?.demotedDecisions ?? 0) +
        (data.pruneSummary?.demotedPromises ?? 0) +
        (data.pruneSummary?.consumedClues ?? 0) +
        (data.pruneSummary?.clearedFloatingClues ?? 0)
      if (pruneTotal > 0) {
        diagnosticsStore.pushDebug({ kind: 'archivist', at: Date.now(), data: { pruned: data.pruneSummary } })
      }
      // If the patch surfaced lexicon additions, log them — they're rare and
      // worth seeing.
      const lex = (data.patch as { lexiconAdditions?: unknown[] } | undefined)?.lexiconAdditions
      if (Array.isArray(lex) && lex.length > 0) {
        diagnosticsStore.pushDebug({ kind: 'archivist', at: Date.now(), data: { lexicon_additions: lex } })
      }
      // Coherence findings: push each as an event so rate + types are
      // inspectable in the debug stream and aggregatable in session summary.
      // Emit a clean_turn counterpart when zero, so the rate is computable
      // without counting-by-absence.
      const findings = data.coherenceFindings ?? []
      if (findings.length > 0) {
        for (const f of findings) {
          diagnosticsStore.pushDebug({ kind: 'sf2.coherence.finding', at: Date.now(), data: f })
        }
      } else {
        diagnosticsStore.pushDebug({ kind: 'sf2.coherence.clean_turn', at: Date.now(), data: null })
      }
      diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'archivist', ...data.usage } })
      if (data.latency) {
        diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'archivist', ...data.latency } })
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
        invariantEvents: data.invariantEvents,
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'archivist_error'
      diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: message })
      return { nextState: preTurnState, replay: null }
    } finally {
      setIsArchiving(false)
    }
  }

  async function generateArcIfNeeded(currentState: Sf2State): Promise<Sf2State | null> {
    if (isArcAuthored(currentState)) return currentState
    const existingArcPlan = currentState.campaign.arcPlan
    if (existingArcPlan && existingArcPlan.status !== 'active') {
      diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: {
        source: 'arc-author',
        message: 'arc plan is no longer active; automatic next-arc generation is future work',
        arcStatus: existingArcPlan.status,
      } })
      return null
    }
    setIsArchiving(true)
    setIsGeneratingChapter(true)
    generationStartTimeRef.current = Date.now()
    try {
      const res = await fetch(API_ENDPOINTS.arcAuthor, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ state: currentState }),
      })
      if (!res.ok) {
        let body: unknown = null
        try { body = await res.json() } catch {
          try { body = await res.text() } catch {}
        }
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: { status: res.status, source: 'arc-author', body } })
        return null
      }
      const data = (await res.json()) as {
        arcPlan: Sf2ArcPlan
        arcEntity: Sf2Arc
        arcThreads?: Sf2Thread[]
        arcFactions?: Sf2Faction[]
        selectedArcVariantSeed?: Sf2ArcPlan['sourceHook'] & Record<string, unknown>
        usage: TokenUsage
        latency?: LatencyPayload
      }
      const next: Sf2State = structuredClone(currentState)
      next.campaign.arcPlan = data.arcPlan
      next.campaign.arcs[data.arcEntity.id] = data.arcEntity
      for (const faction of data.arcFactions ?? []) {
        next.campaign.factions[faction.id] = next.campaign.factions[faction.id] ?? faction
      }
      for (const thread of data.arcThreads ?? []) {
        next.campaign.threads[thread.id] = next.campaign.threads[thread.id] ?? thread
        const owner = thread.owner.kind === 'faction' ? next.campaign.factions[thread.owner.id] : undefined
        if (owner && !owner.ownedThreadIds.includes(thread.id)) owner.ownedThreadIds.push(thread.id)
      }
      next.meta.updatedAt = new Date().toISOString()
      diagnosticsStore.pushDebug({ kind: 'author', at: Date.now(), data: {
        arc: data.arcPlan.title,
        scenario: data.arcPlan.scenarioShape.mode,
        variantSeed: data.selectedArcVariantSeed,
        selectionRationale: data.arcPlan.scenarioShape.selectionRationale,
        rejectedDefaultShape: data.arcPlan.scenarioShape.rejectedDefaultShape,
        chapterFunctions: data.arcPlan.chapterFunctionMap.map((c) => `${c.chapter}: ${c.function}`),
        arcThreads: data.arcPlan.arcThreadIds,
        latentQuestions: data.arcPlan.latentArcQuestions.map((q) => q.id),
        stanceAxes: data.arcPlan.playerStanceAxes.map((a) => a.id),
      } })
      diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'arc-author', ...data.usage } })
      if (data.latency) {
        diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'arc-author', ...data.latency } })
      }
      setState(next)
      persist(next)
      return next
    } catch (err) {
      const message = err instanceof Error ? err.message : 'arc_author_error'
      diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: message })
      return null
    } finally {
      setIsArchiving(false)
      setIsGeneratingChapter(false)
      generationStartTimeRef.current = null
    }
  }

  async function generateChapter1IfNeeded(currentState: Sf2State): Promise<Sf2State | null> {
    const authored = isChapterAuthored(currentState)
    // eslint-disable-next-line no-console
    console.log('[sf2/client] generateChapter1IfNeeded check', {
      alreadyAuthored: authored,
      chapterTitle: currentState.chapter.title,
      frameTitle: currentState.chapter.setup.frame.title,
      npcCount: Object.keys(currentState.campaign.npcs).length,
      threadCount: Object.keys(currentState.campaign.threads).length,
    })
    if (authored) {
      diagnosticsStore.pushDebug({
          kind: 'author',
          at: Date.now(),
          data: {
            note: 'skipped — chapter already authored in state (loaded from IDB?)',
            chapterTitle: currentState.chapter.title,
          },
        })
      return currentState
    }
    const arced = await generateArcIfNeeded(currentState)
    if (!arced) return null
    currentState = arced
    setIsArchiving(true)
    setIsGeneratingChapter(true)
    generationStartTimeRef.current = Date.now()
    try {
      // eslint-disable-next-line no-console
      console.log('[sf2/client] generating chapter 1, fetching author endpoint...')
      const arcPlan = currentState.campaign.arcPlan
      if (arcPlan && arcPlan.status !== 'active') {
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: {
          source: 'author',
          message: 'arc plan is no longer active; automatic next-arc generation is future work',
          arcStatus: arcPlan.status,
        } })
        return null
      }

      const res = await fetch(API_ENDPOINTS.author, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          state: currentState,
          priorChapterMeaning: null,
          targetChapter: 1,
        }),
      })
      // eslint-disable-next-line no-console
      console.log('[sf2/client] author fetch returned, status:', res.status)
      if (!res.ok) {
        let body: unknown = null
        try { body = await res.json() } catch {
          try { body = await res.text() } catch {}
        }
        // eslint-disable-next-line no-console
        console.error('[sf2/client] author failed', res.status, body)
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: { status: res.status, source: 'author-ch1', body } })
        return null
      }
      const data = (await res.json()) as {
        chapter: number
        runtimeState: Sf2State['chapter']['setup']
        scaffolding: Sf2State['chapter']['scaffolding']
        openingSeed: Sf2State['chapter']['artifacts']['opening']
        authored: AuthorChapterSetupV2
        usage: TokenUsage
        latency?: LatencyPayload
      }
      const opened = applyAuthorChapterOpening({
        state: currentState,
        phase: 'chapter_1',
        authorResult: data,
      })
      diagnosticsStore.pushDebug({ kind: 'author', at: Date.now(), data: opened.debugSummary })
      diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'author', ...data.usage } })
      if (data.latency) {
        diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'author', ...data.latency } })
      }

      const next = opened.nextState
      diagnosticsStore.pushDebug(observeActorFirewallWrite(next, {
        actor: 'author',
        writeKind: 'chapter_setup',
        turnIndex: firewallTurnIndexFor(next),
        payload: opened.telemetry,
      }))
      setState(next)
      persist(next)
      return next
    } catch (err) {
      const message = err instanceof Error ? err.message : 'author_ch1_error'
      // eslint-disable-next-line no-console
      console.error('[sf2/client] author-ch1 threw', err)
      diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: message })
      return null
    } finally {
      setIsArchiving(false)
      setIsGeneratingChapter(false)
      generationStartTimeRef.current = null
    }
  }

  async function sendTurn(input: string) {
    if (!state || isStreaming || isArchiving || pendingCheck) return
    const playerInput = input.trim()
    // "Initial" = first turn of the CURRENT chapter. turnIndex is monotonic
    // across chapters now, so derive chapter-scope from history.
    const currentChapterTurns = state.history.turns.filter(
      (t) => t.chapter === state.meta.currentChapter
    ).length
    const isInitial = currentChapterTurns === 0
    if (!playerInput && !isInitial) return

    setSuggestedActions([])
    setPendingInput('')
    setTurnCommitError(null)
    setActivePlayerInput(isInitial ? '' : playerInput)
    pendingLiveTurnScrollRef.current = true
    setLiveTurnScrollKey((key) => key + 1)

    // On first turn: ensure Chapter 1 has been authored before Narrator opens.
    let effectiveState = state
    if (isInitial && !isChapterAuthored(state)) {
      const generated = await generateChapter1IfNeeded(state)
      if (!generated) return // Author failed; debug panel shows why
      effectiveState = generated
    }

    // Narrator
    const narratorResult = await runNarrator(effectiveState, playerInput, isInitial)
    if (!narratorResult.completed) {
      pendingInspirationSpendRef.current = 0
      pendingRollResourceSpendsRef.current = []
      setSelectedRollActionId(null)
      setProse('')
      setSuggestedActions([])
      setPendingInput(isInitial ? '' : playerInput)
      setActivePlayerInput('')
      setLiveRolls([])
      setRollResult(null)
      setTurnCommitError(
        narratorResult.errorMessage
          ? `Narrator failed: ${cleanNarratorErrorMessage(narratorResult.errorMessage)}`
          : narratorResult.prose.trim()
          ? 'Narrator output was discarded because it did not commit state. Retry the action.'
          : 'Narrator did not commit the turn. Retry the action.'
      )
      return
    }
    const {
      prose: narratorProse,
      annotation,
      bundleBuilt,
      rollRecords,
      sentinelEvents: turnSentinelEvents,
      workingSet,
    } = narratorResult

    // Order note: Archivist runs BEFORE mechanical effects.
    //
    // The Narrator's set_scene_snapshot mechanical effect can reference new
    // NPCs the prose introduces (e.g. "Elder Moth is in the processing
    // annex"). If mechanical effects applied first, resolveNpcReference
    // would fail for the new name (not yet in registry) and silently drop
    // it from presentNpcIds — Moth gets elided from the scene even though
    // prose established her. The Archivist creates those NPCs from prose;
    // running it first means set_scene_snapshot can resolve them below.
    const committedTurn = await commitSf2Turn({
      stateBefore: effectiveState,
      turnIndex,
      playerInput,
      isInitial,
      narrator: {
        prose: narratorProse,
        annotation,
        bundleBuilt,
        rollRecords,
        sentinelEvents: turnSentinelEvents,
        workingSet,
      },
      applyArchivist: ({ stateWithTurnLogged, narratorProse, narratorAnnotation, nextTurnIndex }) =>
        runArchivist(stateWithTurnLogged, narratorProse, narratorAnnotation, nextTurnIndex),
    })

    const stateDiff = buildTurnStateDiff(effectiveState, committedTurn.stateAfter)
    const turnRecord = committedTurn.stateAfter.history.turns.find((t) => t.index === turnIndex)
      ?? committedTurn.stateAfter.history.turns.at(-1)
    if (turnRecord && stateDiff.length > 0) {
      turnRecord.stateDiff = stateDiff
    }
    committedTurn.stateAfter.history.recentTurns = committedTurn.stateAfter.history.turns.slice(-6)
    committedTurn.replayFrame.stateAfter = structuredClone(committedTurn.stateAfter)

    if (committedTurn.invariantEvents.length > 0) {
      diagnosticsStore.pushDebugMany(committedTurn.invariantEvents)
    }
    replayFramesRef.current = [...replayFramesRef.current, committedTurn.replayFrame]
    setState(committedTurn.stateAfter)
    setTurnIndex(committedTurn.nextTurnIndex)
    setPivotSignaled(chapterHasPivotSignal(committedTurn.stateAfter))
    setProse('')
    setActivePlayerInput('')
    setLiveRolls([])
    setRollResult(null)
    setInspirationOffer(null)
    pendingInspirationSpendRef.current = 0
    pendingRollResourceSpendsRef.current = []
    setSelectedRollActionId(null)
    persist(committedTurn.stateAfter)
  }

  async function closeChapterAndOpenNext() {
    if (!state || isStreaming || isArchiving) return
    const targetChapter = state.meta.currentChapter + 1
    setIsArchiving(true)
    try {
      let authorBaseState = state
      // Step 1: synthesize chapter_meaning (Haiku retrospective by default).
      // Step 2: pass it to Author as priorChapterMeaning.
      // Step 3: persist meaning on chapter.artifacts.
      const meaningRes = await fetch(API_ENDPOINTS.chapterMeaning, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ state }),
      })

      let priorChapterMeaning: Sf2State['chapter']['artifacts']['meaning'] | null = null
      if (meaningRes.ok) {
        const meaningData = (await meaningRes.json()) as {
          meaning: NonNullable<Sf2State['chapter']['artifacts']['meaning']>
          usage: TokenUsage
          latency?: LatencyPayload
        }
        priorChapterMeaning = meaningData.meaning
        diagnosticsStore.pushDebug({ kind: 'author', at: Date.now(), data: { chapter_meaning: meaningData.meaning } })
        diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'chapter-meaning', ...meaningData.usage } })
        if (meaningData.latency) {
          diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'chapter-meaning', ...meaningData.latency } })
        }

        // Persist meaning on the closing chapter's artifacts.
        authorBaseState = structuredClone(authorBaseState)
        authorBaseState.chapter.artifacts.meaning = meaningData.meaning
        authorBaseState.meta.updatedAt = new Date().toISOString()
        diagnosticsStore.pushDebug(observeActorFirewallWrite(authorBaseState, {
          actor: 'author',
          writeKind: 'chapter_meaning',
          turnIndex: firewallTurnIndexFor(authorBaseState),
          payload: {
            chapter: authorBaseState.chapter.number,
            closingResolution: meaningData.meaning.closingResolution,
          },
        }))
        setState(authorBaseState)
        await persist(authorBaseState)
      } else {
        let body: unknown = null
        try { body = await meaningRes.json() } catch {}
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: { status: meaningRes.status, source: 'chapter-meaning', body } })
        // Proceed without priorChapterMeaning — Author will fall back to state-derived hook.
      }

      try {
        const playstyleRes = await fetch(API_ENDPOINTS.playstyle, {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ state: authorBaseState }),
        })
        if (playstyleRes.ok) {
          const playstyleData = (await playstyleRes.json()) as {
            artifact: NonNullable<Sf2State['chapter']['artifacts']['playstyle']>
            validationFindings?: unknown[]
            usage: TokenUsage
            latency?: LatencyPayload
          }
          authorBaseState = structuredClone(authorBaseState)
          applyChapterPlaystyleArtifact(authorBaseState, playstyleData.artifact)
          authorBaseState.meta.updatedAt = new Date().toISOString()
          diagnosticsStore.pushDebug({
            kind: 'playstyle',
            at: Date.now(),
            data: {
              status: authorBaseState.campaign.playstylePersonalization?.lastStatus?.status ?? 'enabled',
              artifact: playstyleData.artifact,
              rollingProfile: authorBaseState.campaign.playstylePersonalization?.rollingProfile,
              validationFindings: playstyleData.validationFindings ?? [],
            },
          })
          diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'playstyle', ...playstyleData.usage } })
          if (playstyleData.latency) {
            diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'playstyle', ...playstyleData.latency } })
          }
          setState(authorBaseState)
          await persist(authorBaseState)
        } else {
          let body: unknown = null
          try { body = await playstyleRes.json() } catch {}
          authorBaseState = structuredClone(authorBaseState)
          markPlaystylePersonalizationStatus(authorBaseState, 'failed_open', `status ${playstyleRes.status}`)
          diagnosticsStore.pushDebug({
            kind: 'playstyle',
            at: Date.now(),
            data: {
              status: 'failed_open',
              source: 'playstyle',
              httpStatus: playstyleRes.status,
              body,
            },
          })
          setState(authorBaseState)
          await persist(authorBaseState)
          // Proceed without personalization input updates; Author still opens the next chapter.
        }
      } catch (error) {
        authorBaseState = structuredClone(authorBaseState)
        markPlaystylePersonalizationStatus(authorBaseState, 'failed_open', error instanceof Error ? error.message : 'playstyle request failed')
        diagnosticsStore.pushDebug({
          kind: 'playstyle',
          at: Date.now(),
          data: {
            status: 'failed_open',
            source: 'playstyle',
            message: error instanceof Error ? error.message : 'playstyle request failed',
          },
        })
        setState(authorBaseState)
        await persist(authorBaseState)
      }

      const persistence = persistenceRef.current
      if (persistence) {
        try {
          await persistence.saveChapterArtifact({
            campaignId: authorBaseState.meta.campaignId,
            chapter: authorBaseState.chapter.number,
            artifacts: authorBaseState.chapter.artifacts,
            storedAt: new Date().toISOString(),
          })
        } catch (error) {
          diagnosticsStore.pushDebug({
            kind: 'error',
            at: Date.now(),
            data: {
              source: 'chapter-artifact-persistence',
              message: error instanceof Error ? error.message : 'artifact persistence failed',
            },
          })
        }
      }

      const arcPlan = authorBaseState.campaign.arcPlan
      if (arcPlan && arcPlan.status !== 'active') {
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: {
          source: 'author',
          message: 'arc plan is no longer active; automatic next-arc generation is future work',
          arcStatus: arcPlan.status,
        } })
        return
      }

      const res = await fetch(API_ENDPOINTS.author, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({
          state: authorBaseState,
          priorChapterMeaning,
          targetChapter,
        }),
      })
      if (!res.ok) {
        let body: unknown = null
        try { body = await res.json() } catch {}
        diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: { status: res.status, source: 'author', body } })
        return
      }
      const data = (await res.json()) as {
        chapter: number
        runtimeState: Sf2State['chapter']['setup']
        scaffolding: Sf2State['chapter']['scaffolding']
        openingSeed: Sf2State['chapter']['artifacts']['opening']
        threadTransitions?: Array<{
          id: string
          toStatus: Sf2State['campaign']['threads'][string]['status']
          reason: string
        }>
        authored: AuthorChapterSetupV2
        usage: TokenUsage
        latency?: LatencyPayload
      }

      const opened = applyAuthorChapterOpening({
        state: authorBaseState,
        phase: 'continuation',
        authorResult: data,
      })
      diagnosticsStore.pushDebug({ kind: 'author', at: Date.now(), data: opened.debugSummary })
      diagnosticsStore.pushDebug({ kind: 'token_usage', at: Date.now(), data: { role: 'author', ...data.usage } })
      if (data.latency) {
        diagnosticsStore.pushDebug({ kind: 'latency', at: Date.now(), data: { role: 'author', ...data.latency } })
      }

      const next = opened.nextState
      diagnosticsStore.pushDebug(observeActorFirewallWrite(next, {
        actor: 'author',
        writeKind: 'chapter_setup',
        turnIndex: firewallTurnIndexFor(next),
        payload: opened.telemetry,
      }))
      setState(next)
      await persist(next)
      // Reset scene view — but KEEP turnIndex monotonic across chapters so
      // history.turns[].index stays unique. "Is this the first turn of the
      // chapter?" is derived from history in sendTurn / render via
      // chapterTurnCount === 0 instead.
      setProse('')
      setSuggestedActions([])
      setPendingCheck(null)
      setPivotSignaled(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'author_error'
      diagnosticsStore.pushDebug({ kind: 'error', at: Date.now(), data: message })
    } finally {
      setIsArchiving(false)
    }
  }

  function availableInspiration(s: Sf2State): number {
    return Math.max(0, s.player.inspiration - pendingInspirationSpendRef.current)
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
    setSelectedRollActionId(null)
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
      return cards.map((card, i) => i === targetIndex ? { ...card, outcome } : card)
    })
  }

  function resolvePendingCheck() {
    if (!state || !pendingCheck) return
    const rollState = stateWithPendingRollSpends(state)
    const resolution = resolveSf2Roll(rollState, pendingCheck, selectedRollActionId)
    if (resolution.resolutionKind === 'trait_auto_success' || resolution.resolutionKind === 'trait_auto_critical') {
      const outcome: RollOutcome = {
        d20: undefined,
        rawRolls: undefined,
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

    const rollOne = () => 1 + Math.floor(Math.random() * 20)
    const first = rollOne()
    const second =
      resolution.diceMode === 'advantage' || resolution.diceMode === 'disadvantage'
        ? rollOne()
        : undefined
    const d20 =
      resolution.diceMode === 'advantage' && second !== undefined
        ? Math.max(first, second)
        : resolution.diceMode === 'disadvantage' && second !== undefined
          ? Math.min(first, second)
          : first
    const outcome = {
      ...resolveRoll(d20, resolution.modifier, pendingCheck.dc, resolution.effectiveDc, resolution.criticalRange),
      rawRolls: second !== undefined ? [first, second] : undefined,
      skill: pendingCheck.skill,
      resolutionKind: 'rolled' as const,
      diceMode: resolution.diceMode,
      criticalRange: resolution.criticalRange,
      sourceBreakdown: resolution.sourceBreakdown,
      selectedRollAction: resolution.selectedRollAction,
      spentResources: resolution.spentResources,
      modifierType: resolution.modifierType,
      modifierReason: resolution.modifierReason,
    }
    setLatestLiveRollOutcome(outcome)
    const failed = outcome.result === 'failure' || outcome.result === 'fumble'
    const hasTraitReroll = resolution.actionOptions.some((option) => option.kind === 'reroll')
    if (failed && (availableInspiration(state) > 0 || hasTraitReroll)) {
      setRollResult(outcome)
      setInspirationOffer(outcome)
      return
    }
    completePendingRoll(outcome)
  }

  function declineInspirationReroll() {
    if (!inspirationOffer) return
    setInspirationOffer(null)
    completePendingRoll(inspirationOffer)
  }

  // Inspiration is a flat reroll, not advantage-equivalent: a way out of a
  // failed check, not stacked dice. Original outcome is preserved as
  // originalRoll so the chronicle can show "rolled 7, spent inspiration,
  // rolled 14".
  function spendInspirationReroll() {
    if (!state || !pendingCheck || !inspirationOffer) return
    if (availableInspiration(state) <= 0) return
    pendingInspirationSpendRef.current += 1

    const d20 = 1 + Math.floor(Math.random() * 20)
    const rollState = stateWithPendingRollSpends(state)
    const resolution = resolveSf2Roll(rollState, pendingCheck)
    const outcome: RollOutcome = {
      ...resolveRoll(d20, resolution.modifier, pendingCheck.dc, resolution.effectiveDc),
      skill: pendingCheck.skill,
      resolutionKind: 'rolled',
      diceMode: 'normal',
      criticalRange: 20,
      sourceBreakdown: [
        ...resolution.sourceBreakdown,
        {
          kind: 'selected_trait',
          source: 'Inspiration',
          label: 'Inspiration reroll',
          detail: 'spent after failed roll',
        },
      ],
      spentResources: inspirationOffer.spentResources,
      modifierType: 'inspiration',
      modifierReason: 'spent after failed roll',
      inspirationSpent: true,
      originalRoll: inspirationOffer,
    }
    setRollResult(outcome)
    setLatestLiveRollOutcome(outcome)
    setInspirationOffer(null)
    completePendingRoll(outcome)
  }

  function spendTraitReroll(actionId: string) {
    if (!state || !pendingCheck || !inspirationOffer) return
    const rollState = stateWithPendingRollSpends(state)
    const resolution = resolveSf2Roll(rollState, pendingCheck, actionId)
    const selected = resolution.selectedRollAction
    if (!selected || selected.kind !== 'reroll') return

    const d20 = 1 + Math.floor(Math.random() * 20)
    const outcome: RollOutcome = {
      ...resolveRoll(d20, resolution.modifier, pendingCheck.dc, resolution.effectiveDc),
      skill: pendingCheck.skill,
      resolutionKind: 'rolled',
      diceMode: 'normal',
      criticalRange: 20,
      sourceBreakdown: resolution.sourceBreakdown,
      selectedRollAction: selected,
      spentResources: [
        ...(inspirationOffer.spentResources ?? []),
        ...resolution.spentResources,
      ],
      modifierType: undefined,
      modifierReason: selected.label,
      originalRoll: inspirationOffer,
    }
    setRollResult(outcome)
    setLatestLiveRollOutcome(outcome)
    setInspirationOffer(null)
    completePendingRoll(outcome)
  }

  // ────────── Render ──────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-mono text-foreground">
        <div className="text-sm text-muted-foreground">loading...</div>
      </div>
    )
  }

  if (showCampaignSelect) {
    return (
      <Sf2CampaignSelect
        activeCampaign={lastCampaign}
        slots={saveSlots}
        onContinue={continueLastCampaign}
        onLoadSlot={(slot) => {
          void loadSaveSlot(slot)
        }}
        onNewCampaign={startNewCampaignSetup}
      />
    )
  }

  if (!state) {
    if (setupStep === 'world') {
      return (
        <WorldSetup
          onNext={handleWorldSetupComplete}
          onBack={saveSlots.some(Boolean) || lastCampaign ? () => setShowCampaignSelect(true) : undefined}
        />
      )
    }

    return (
      <div className="relative">
        <CharacterSetup
          genre={setupData.genre}
          onBack={handleBackToWorldSetup}
          onStart={startCampaignFromWizard}
        />
        {setupError && (
          <div className="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-md rounded-lg border border-destructive/45 bg-card/95 px-4 py-3 text-center text-sm text-destructive shadow-lg">
            {setupError}
          </div>
        )}
      </div>
    )
  }

  const busy = isStreaming || isArchiving
  const chapterPivotSignaled = pivotSignaled || chapterHasPivotSignal(state)

  const pressureProjection = chapterPressureRuntime.project(state, {
    pivotSignaled: chapterPivotSignaled,
  })
  const { chapterTurnCount } = pressureProjection.closeReadiness

  function buildSessionLogExport() {
    if (!state) return null
    const debugSnapshot = diagnosticsStore.getDebug()
    const summary = computeSessionSummary(state, debugSnapshot)
    return {
      filename: `sf2-session-${state.meta.campaignId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
      payload: { summary, state, debug: debugSnapshot, replayFrames: replayFramesRef.current },
    }
  }

  function buildReplayFixtureExport() {
    if (!state) return null
    const debugSnapshot = diagnosticsStore.getDebug()
    const summary = computeSessionSummary(state, debugSnapshot)
    return {
      filename: `sf2-replay-${state.meta.campaignId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`,
      payload: {
        schema: 'sf2-replay-fixture/v1',
        exportedAt: new Date().toISOString(),
        campaignId: state.meta.campaignId,
        summary,
        finalState: state,
        debug: debugSnapshot,
        frames: replayFramesRef.current,
        note:
          'Replay frames are captured model outputs plus before/after states. They are intended for model-free testing of deterministic tool application, cache invalidation, scene packets, and invariants.',
      },
    }
  }

  function downloadJsonExport(exportData: { filename: string; payload: unknown } | null) {
    if (!exportData) return
    const blob = new Blob([JSON.stringify(exportData.payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportData.filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadSessionLog() {
    downloadJsonExport(buildSessionLogExport())
  }

  function downloadReplayFixture() {
    downloadJsonExport(buildReplayFixtureExport())
  }

  async function copyJsonExport(label: 'session' | 'replay', exportData: { filename: string; payload: unknown } | null) {
    if (!exportData) return
    const json = JSON.stringify(exportData.payload, null, 2)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = json
        textarea.setAttribute('readonly', 'true')
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        textarea.remove()
      }
      diagnosticsStore.setExportCopyStatus(`Copied ${label} JSON: ${exportData.filename}`)
    } catch (error) {
      diagnosticsStore.setExportCopyStatus(`Copy failed: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
    window.setTimeout(() => diagnosticsStore.setExportCopyStatus(null), 5000)
  }

  function copySessionLog() {
    void copyJsonExport('session', buildSessionLogExport())
  }

  function copyReplayFixture() {
    void copyJsonExport('replay', buildReplayFixtureExport())
  }

  const campaignStats = {
    npcs: Object.keys(state.campaign.npcs).length,
    threads: Object.keys(state.campaign.threads).length,
    decisions: Object.values(state.campaign.decisions).filter((d) => d.status === 'active').length,
    promises: Object.values(state.campaign.promises).filter((p) => p.status === 'active').length,
    clues: Object.keys(state.campaign.clues).length,
  }

  const closeReadiness: Sf2CloseReadinessView = {
    closeReady: pressureProjection.closeReadiness.closeReady,
    chapterPivotSignaled,
    spineResolved: pressureProjection.closeReadiness.spineResolved,
    stalledFallback: pressureProjection.closeReadiness.stalledFallback,
    ladderFiredCount: pressureProjection.closeReadiness.ladderFiredCount,
    ladderStepCount: pressureProjection.closeReadiness.ladderStepCount,
    spineStatus: pressureProjection.closeReadiness.spineStatus,
    spineTension: pressureProjection.closeReadiness.spineTension ?? 0,
    successorRequired: pressureProjection.closeReadiness.successorRequired,
    promotedSpineThreadId: pressureProjection.closeReadiness.promotedSpineThreadId,
  }
  const currentRollResolution = pendingCheck
    ? resolveSf2Roll(stateWithPendingRollSpends(state), pendingCheck, selectedRollActionId)
    : null
  const rollModifier = currentRollResolution?.modifier ?? rollResult?.modifier ?? null
  const currentEffectiveDc = currentRollResolution?.effectiveDc ?? rollResult?.effectiveDc ?? rollResult?.dc ?? null

  return (
    <Sf2PlayShell
      state={state}
      scrollRef={scrollRef}
      prose={prose}
      turnCommitError={turnCommitError}
      activePlayerInput={activePlayerInput}
      liveRolls={liveRolls}
      suggestedActions={suggestedActions}
      pendingInput={pendingInput}
      pendingCheck={pendingCheck}
      rollResult={rollResult}
      inspirationOffer={inspirationOffer}
      rollModifier={rollModifier}
      effectiveDc={currentEffectiveDc}
      rollDiceMode={currentRollResolution?.diceMode ?? rollResult?.diceMode ?? null}
      rollSourceBreakdown={currentRollResolution?.sourceBreakdown ?? rollResult?.sourceBreakdown ?? []}
      rollActionOptions={currentRollResolution?.actionOptions ?? []}
      selectedRollActionId={selectedRollActionId}
      inspirationRemaining={availableInspiration(state)}
      isStreaming={isStreaming}
      isArchiving={isArchiving}
      isGeneratingChapter={isGeneratingChapter}
      generationElapsed={generationElapsed}
      busy={busy}
      chapterTurnCount={chapterTurnCount}
      pressureProjection={pressureProjection}
      closeReadiness={closeReadiness}
      campaignStats={campaignStats}
      saveSlots={saveSlots}
      saveSlotStatus={saveSlotStatus}
      onPendingInputChange={setPendingInput}
      onSendTurn={sendTurn}
      onResolvePendingCheck={resolvePendingCheck}
      onSelectRollAction={setSelectedRollActionId}
      onSpendInspiration={spendInspirationReroll}
      onSpendTraitReroll={spendTraitReroll}
      onDeclineInspiration={declineInspirationReroll}
      onCloseChapter={closeChapterAndOpenNext}
      onResetCampaign={resetCampaign}
      onSaveToSlot={(slot) => {
        void saveToSlot(slot)
      }}
      onLoadSaveSlot={(slot) => {
        void loadSaveSlot(slot)
      }}
      onDownloadSessionLog={downloadSessionLog}
      onDownloadReplayFixture={downloadReplayFixture}
      onCopySessionLog={copySessionLog}
      onCopyReplayFixture={copyReplayFixture}
    />
  )
}

function Sf2CampaignSelect({
  activeCampaign,
  slots,
  onContinue,
  onLoadSlot,
  onNewCampaign,
}: {
  activeCampaign: Sf2State | null
  slots: (Sf2SaveSlotData | null)[]
  onContinue: () => void
  onLoadSlot: (slot: Sf2SaveSlotData) => void
  onNewCampaign: () => void
}) {
  const hasSlots = slots.some(Boolean)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <div className="min-h-screen bg-background px-6 py-14 text-foreground">
      <div className="pointer-events-none fixed inset-0" style={{
        background: [
          'radial-gradient(circle at 16% 0%, color-mix(in oklch, var(--primary) 14%, transparent), transparent 30%)',
          'radial-gradient(circle at 84% 8%, color-mix(in oklch, var(--accent) 10%, transparent), transparent 28%)',
          'linear-gradient(180deg, transparent, color-mix(in oklch, var(--background) 82%, var(--card) 18%))',
        ].join(', '),
      }} />
      <div className="relative mx-auto flex max-w-2xl flex-col gap-12">
        <div className="text-center">
          <div className="font-heading text-2xl font-semibold uppercase tracking-[0.25em] text-primary">
            Storyforge
          </div>
          <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
            Storyforge v2
          </div>
        </div>

        {activeCampaign && (() => {
          const summary = summarizeCampaign(activeCampaign)
          return (
            <section>
              <SectionKicker>Active Campaign</SectionKicker>
              <button
                type="button"
                onClick={onContinue}
                className="group relative w-full text-left"
              >
                <div
                  className="absolute -inset-4 rounded-2xl opacity-0 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"
                  style={{ background: summary.accent, opacity: 0.05 }}
                />
                <div
                  className="relative rounded-xl border-l-2 px-5 py-5 transition-colors hover:bg-card/35"
                  style={{ borderColor: `color-mix(in oklch, ${summary.accent} 42%, transparent)` }}
                >
                  <div className="mb-3 flex items-center gap-3">
                    <span
                      className="rounded-sm px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.15em]"
                      style={{ color: summary.accent, backgroundColor: `color-mix(in oklch, ${summary.accent} 10%, transparent)` }}
                    >
                      {summary.genreName}
                    </span>
                    <span className="text-[10px] text-muted-foreground/50">Chapter {summary.chapterNumber}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{timeAgo(summary.savedAt)}</span>
                  </div>
                  <h1 className="mb-1.5 font-heading text-3xl font-bold tracking-normal text-foreground sm:text-4xl">
                    {summary.chapterTitle}
                  </h1>
                  <p className="text-base text-foreground/70">
                    {summary.playerName}
                    <span className="text-muted-foreground/50"> / {summary.playerClass}</span>
                  </p>
                  <div
                    className="mt-4 text-sm font-medium transition-transform duration-200 group-hover:translate-x-1"
                    style={{ color: summary.accent }}
                  >
                    Continue Story
                  </div>
                </div>
              </button>
            </section>
          )
        })()}

        {hasSlots && (
          <section>
            <SectionKicker>Saved Games</SectionKicker>
            <div className="flex flex-col gap-1">
              {slots.map((slot, index) => {
                if (!slot) return null
                const summary = summarizeSaveSlot(slot)
                return (
                  <button
                    key={slot.slot}
                    type="button"
                    onClick={() => onLoadSlot(slot)}
                    className="group w-full rounded-lg px-4 py-3.5 text-left transition-colors duration-200 hover:bg-secondary/10"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="truncate text-base font-medium text-foreground">
                          Slot {index + 1}: {summary.playerName}
                        </div>
                        <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-2 text-xs text-muted-foreground/65">
                          <span>{summary.playerClass}</span>
                          <span className="text-muted-foreground/25">/</span>
                          <span>Ch. {summary.chapterNumber}</span>
                          <span className="text-muted-foreground/25">/</span>
                          <span className="truncate">{summary.chapterTitle}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className="text-[10px] font-medium uppercase tracking-[0.1em]"
                          style={{ color: summary.accent }}
                        >
                          {summary.genreName}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{timeAgo(summary.savedAt)}</span>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onNewCampaign}
            className="rounded-lg border border-primary/25 px-10 py-3 text-sm font-medium text-foreground/70 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
          >
            Start New Campaign
          </button>
        </div>
      </div>
    </div>
  )
}

function SectionKicker({ children }: { children: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div className="h-px w-6 bg-primary/40" />
      <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-primary/80">{children}</span>
    </div>
  )
}

function summarizeCampaign(state: Sf2State) {
  const genre = genrePresentation(state.meta.genreId)
  return {
    playerName: state.player.name,
    playerClass: state.player.class.name,
    genreName: genre.name,
    accent: genre.accent,
    chapterNumber: state.meta.currentChapter,
    chapterTitle: state.chapter.title || state.meta.hookTitle || 'Chapter setup pending',
    savedAt: state.meta.updatedAt,
  }
}

function summarizeSaveSlot(slot: Sf2SaveSlotData) {
  const genre = genrePresentation(slot.genreId)
  return {
    playerName: slot.playerName,
    playerClass: slot.playerClass,
    genreName: genre.name,
    accent: genre.accent,
    chapterNumber: slot.chapterNumber,
    chapterTitle: slot.chapterTitle,
    savedAt: slot.savedAt,
  }
}

function genrePresentation(genreId: string): { name: string; accent: string } {
  try {
    const config = getGenreConfig(genreId as Genre)
    return { name: config.name, accent: config.theme.primary }
  } catch {
    return { name: genreId, accent: 'oklch(0.82 0.15 175)' }
  }
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
// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DISPOSITION_SCORE: Record<string, number> = {
  hostile: 0,
  wary: 1,
  neutral: 2,
  favorable: 3,
  trusted: 4,
}

function buildTurnStateDiff(before: Sf2State, after: Sf2State): Sf2TurnDiffEntry[] {
  const entries: Sf2TurnDiffEntry[] = []
  const hpDelta = after.player.hp.current - before.player.hp.current
  if (hpDelta !== 0) {
    entries.push({
      kind: 'hp',
      label: `HP ${formatDiffSigned(hpDelta)}`,
      tone: hpDelta > 0 ? 'gain' : after.player.hp.current === 0 ? 'severe' : 'loss',
      from: before.player.hp.current,
      to: after.player.hp.current,
      value: hpDelta,
    })
  }

  const creditDelta = after.player.credits - before.player.credits
  if (creditDelta !== 0) {
    entries.push({
      kind: 'credits',
      label: `CRED ${formatDiffSigned(creditDelta)}`,
      tone: creditDelta > 0 ? 'gain' : 'loss',
      from: before.player.credits,
      to: after.player.credits,
      value: creditDelta,
    })
  }

  const beforeInventory = new Map(before.player.inventory.map((item) => [item.name, item.qty]))
  const afterInventory = new Map(after.player.inventory.map((item) => [item.name, item.qty]))
  for (const name of new Set([...beforeInventory.keys(), ...afterInventory.keys()])) {
    const from = beforeInventory.get(name) ?? 0
    const to = afterInventory.get(name) ?? 0
    if (from === to) continue
    entries.push({
      kind: 'inventory',
      label: `${compactLabel(name)} ${from}->${to}`,
      tone: to > from ? 'gain' : 'loss',
      from,
      to,
      value: to - from,
    })
  }

  const currentChapter = after.meta.currentChapter
  const newClues = Object.values(after.campaign.clues)
    .filter((clue) => !before.campaign.clues[clue.id])
    .filter((clue) => clue.chapterCreated === currentChapter)
  if (newClues.length > 0) {
    entries.push({
      kind: 'intel',
      label: newClues.length === 1 ? '+Intel' : `+${newClues.length} Intel`,
      tone: 'gain',
      entityId: newClues[0]?.id,
      value: newClues.length,
    })
  }

  for (const npc of Object.values(after.campaign.npcs)) {
    const prior = before.campaign.npcs[npc.id]
    if (!prior || prior.disposition === npc.disposition) continue
    const delta = (DISPOSITION_SCORE[npc.disposition] ?? 0) - (DISPOSITION_SCORE[prior.disposition] ?? 0)
    if (delta === 0) continue
    entries.push({
      kind: 'npc',
      label: `${compactLabel(npc.name)} ${formatDiffSigned(delta)}`,
      tone: delta > 0 ? 'gain' : 'loss',
      entityId: npc.id,
      from: prior.disposition,
      to: npc.disposition,
      value: delta,
    })
  }

  const newLocations = Object.values(after.campaign.locations)
    .filter((location) => !before.campaign.locations[location.id])
    .filter((location) => location.chapterCreated === currentChapter && location.id !== 'loc_pending')
  if (newLocations.length > 0) {
    entries.push({
      kind: 'location',
      label: newLocations.length === 1 ? `+${compactLabel(newLocations[0].name || 'Location')}` : `+${newLocations.length} Locations`,
      tone: 'gain',
      entityId: newLocations[0]?.id,
      value: newLocations.length,
    })
  }

  if (operationPlanChanged(before, after)) {
    entries.push({
      kind: 'operation_plan',
      label: before.campaign.operationPlan ? 'Ops plan updated' : '+Ops plan',
      tone: 'change',
    })
  }

  for (const thread of Object.values(after.campaign.threads)) {
    const prior = before.campaign.threads[thread.id]
    if (!prior || prior.tension === thread.tension) continue
    const delta = thread.tension - prior.tension
    entries.push({
      kind: 'thread',
      label: `${compactLabel(thread.title)} ${formatDiffSigned(delta)}`,
      tone: delta > 0 ? 'loss' : 'gain',
      entityId: thread.id,
      from: prior.tension,
      to: thread.tension,
      value: delta,
    })
  }

  return entries
}

function operationPlanChanged(before: Sf2State, after: Sf2State): boolean {
  const prior = before.campaign.operationPlan
  const next = after.campaign.operationPlan
  if (!prior && !next) return false
  if (!prior || !next) return true
  return (
    prior.name !== next.name ||
    prior.target !== next.target ||
    prior.approach !== next.approach ||
    prior.fallback !== next.fallback ||
    prior.status !== next.status
  )
}

function compactLabel(label: string): string {
  const trimmed = label.trim()
  if (trimmed.length <= 18) return trimmed
  return `${trimmed.slice(0, 17)}...`
}

function formatDiffSigned(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function annotationHasPivotSignal(annotation: Record<string, unknown> | null | undefined): boolean {
  if (!annotation) return false
  const rawMoves = annotation.authorial_moves as Record<string, unknown> | undefined
  const normalizedMoves = annotation.authorialMoves as Record<string, unknown> | undefined
  return rawMoves?.pivot_signaled === true ||
    rawMoves?.pivotSignaled === true ||
    normalizedMoves?.pivotSignaled === true ||
    normalizedMoves?.pivot_signaled === true
}

function chapterHasPivotSignal(state: Sf2State): boolean {
  return state.history.turns.some((turn) =>
    turn.chapter === state.meta.currentChapter &&
    (
      turn.narratorAnnotation?.authorialMoves?.pivotSignaled === true ||
      annotationHasPivotSignal(turn.narratorAnnotationRaw)
    )
  )
}
