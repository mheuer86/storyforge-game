'use client'

// Storyforge v2 · /play/v2
// Stage 2 end-to-end: Narrator streams → Archivist applies patch → IDB persists.
// Includes a minimal pending-check roll flow (d20 + modifier computed client-side,
// result sent as a follow-up turn). The clean tool_result-continuation roll flow
// is Stage 3+ work.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiHeaders } from '@/lib/api-key'
import { applyGenreTheme, type Genre } from '@/lib/genre-config'
import {
  DEFAULT_SF2_SEED_ID,
  SF2_BOOTSTRAP_SEED_OPTIONS,
  createInitialSf2State,
  isArcAuthored,
  isChapterAuthored,
} from '@/lib/sf2/game-data'
import { applyAuthoredToCampaign } from '@/lib/sf2/author/hydrate'
import { computeSessionSummary } from '@/lib/sf2/instrumentation/session-summary'
import {
  createIndexedDbPersistence,
} from '@/lib/sf2/persistence/indexeddb'
import {
  commitSf2Turn,
  observeActorFirewallWrite,
  type Sf2TurnPipelineEvent,
  type Sf2TurnReplayFrame,
} from '@/lib/sf2/runtime/turn-pipeline'
import { computeChapterCloseReadiness } from '@/lib/sf2/chapter-close'
import { prepareChapterPressureRuntime } from '@/lib/sf2/pressure/runtime'
import {
  Sf2PlayShell,
  type Sf2CloseReadinessView,
} from '@/components/sf2/play-shell'
import type { StoryforgePersistence2 } from '@/lib/sf2/persistence/types'
import type {
  AuthorChapterSetupV2,
  Sf2Arc,
  Sf2ArcPlan,
  Sf2State,
  Sf2TurnDiffEntry,
  Sf2WorkingSet,
} from '@/lib/sf2/types'

const LAST_CAMPAIGN_KEY = 'sf2_last_campaign_id'

interface TokenUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

interface LatencyPayload {
  totalMs: number
  apiMs: number
  ttftMs?: number
  attempts?: number
}

interface DebugEntry {
  kind:
    | 'narrate_turn'
    | 'archivist'
    | 'token_usage'
    | 'latency'
    | 'roll'
    | 'truncation'
    | 'error'
    | 'working_set'
    | 'author'
    | 'face_shift'
    | 'ladder_fired'
    | 'pacing_advisory'
    | 'scene_bundle_built'
    | 'sf2.coherence.finding'
    | 'sf2.coherence.clean_turn'
    | 'sf2.invariant'
    | 'display_sentinel'
    | 'narrator_meta_observed'
    | 'narrator_output_recovered'
  at: number
  data: unknown
}

type ReplayFrame = Sf2TurnReplayFrame

interface PendingCheck {
  toolUseId: string
  skill: string
  dc: number
  why: string
  consequenceOnFail: string
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
  priorMessages: unknown[]
}

interface RollOutcome {
  d20: number
  rawRolls?: number[]
  modifier: number
  total: number
  dc: number
  effectiveDc?: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  skill?: string
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  inspirationSpent?: boolean
  originalRoll?: RollOutcome
}

function resolveRoll(d20: number, modifier: number, dc: number, effectiveDc = dc): RollOutcome {
  const total = d20 + modifier
  let result: RollOutcome['result']
  if (d20 === 20) result = 'critical'
  else if (d20 === 1) result = 'fumble'
  else if (total >= effectiveDc) result = 'success'
  else result = 'failure'
  return { d20, modifier, total, dc, effectiveDc, result }
}

function effectiveDcFor(check: Pick<PendingCheck, 'dc' | 'modifierType'>): number {
  return check.modifierType === 'challenge' ? check.dc + 2 : check.dc
}

function firewallTurnIndexFor(state: Sf2State): number {
  return state.history.turns.at(-1)?.index ?? state.history.turns.length
}

// Pick ability by skill name + apply proficiency bonus if the player is
// proficient in the skill. Proficiency bonus scales with level per D&D rules:
// +2 (1-4), +3 (5-8), +4 (9-12), +5 (13-16), +6 (17+).
function modifierForSkill(state: Sf2State, skill: string): number {
  const s = skill.toLowerCase()
  const stats = state.player.stats
  const mod = (v: number) => Math.floor((v - 10) / 2)
  const level = state.player.level ?? 1
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2

  let abilityMod = mod(stats.WIS)
  if (s.includes('investigation') || s.includes('arcana') || s.includes('history') || s.includes('nature')) abilityMod = mod(stats.INT)
  else if (s.includes('persua') || s.includes('decept') || s.includes('intimid') || s.includes('performance')) abilityMod = mod(stats.CHA)
  else if (s.includes('athlet')) abilityMod = mod(stats.STR)
  else if (s.includes('acrob') || s.includes('stealth') || s.includes('sleight')) abilityMod = mod(stats.DEX)
  else if (s.includes('constitution') || s.includes('endur')) abilityMod = mod(stats.CON)
  else if (s.includes('heavy weapon') || s.includes('melee') || s.includes('ranged')) abilityMod = mod(stats.STR)
  // Default WIS for insight/perception/religion/survival/medicine + fallback

  // Proficiency: case-insensitive match against the player's proficiency list.
  // Allows partial matches ("Heavy Weapons" proficient → "Heavy Weapons attack" rolled).
  const isProficient = state.player.proficiencies.some((p) => {
    const pl = p.toLowerCase()
    return s.includes(pl) || pl.includes(s)
  })

  return abilityMod + (isProficient ? proficiencyBonus : 0)
}

export default function PlayV2Page() {
  const [state, setState] = useState<Sf2State | null>(null)
  const [playerName, setPlayerName] = useState('Ren')
  const [selectedSeedId, setSelectedSeedId] = useState(DEFAULT_SF2_SEED_ID)
  const [prose, setProse] = useState<string>('')
  const [suggestedActions, setSuggestedActions] = useState<string[]>([])
  const [pendingInput, setPendingInput] = useState<string>('')
  const [pendingCheck, setPendingCheck] = useState<PendingCheck | null>(null)
  const [rollResult, setRollResult] = useState<RollOutcome | null>(null)
  const [inspirationOffer, setInspirationOffer] = useState<RollOutcome | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [debug, setDebug] = useState<DebugEntry[]>([])
  const [replayFrames, setReplayFrames] = useState<ReplayFrame[]>([])
  const [lastNarratorUsage, setLastNarratorUsage] = useState<TokenUsage | null>(null)
  const [lastArchivistUsage, setLastArchivistUsage] = useState<TokenUsage | null>(null)
  const [turnIndex, setTurnIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [pivotSignaled, setPivotSignaled] = useState(false)
  const [isGeneratingChapter, setIsGeneratingChapter] = useState(false)
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null)
  const [generationElapsed, setGenerationElapsed] = useState(0)
  const scrollRef = useRef<HTMLDivElement>(null)
  const persistenceRef = useRef<StoryforgePersistence2 | null>(null)
  // When a roll_prompt arrives mid-stream, we store a resolver the modal calls
  // after the player rolls. The narrator loop awaits this promise before
  // resuming with rollResolution.
  const rollResolverRef = useRef<((outcome: RollOutcome) => void) | null>(null)
  // Inspiration spends are only persisted once the full turn commits. This
  // keeps a paused roll from mutating state that sendTurn later replaces.
  const pendingInspirationSpendRef = useRef(0)
  const selectedSeed = useMemo(
    () => SF2_BOOTSTRAP_SEED_OPTIONS.find((seed) => seed.id === selectedSeedId)
      ?? SF2_BOOTSTRAP_SEED_OPTIONS[0],
    [selectedSeedId],
  )

  // Initialize persistence + try loading last campaign.
  useEffect(() => {
    const p = createIndexedDbPersistence()
    persistenceRef.current = p
    const lastId = typeof window !== 'undefined' ? window.localStorage.getItem(LAST_CAMPAIGN_KEY) : null
    if (lastId) {
      p.loadCampaign(lastId)
        .then((loaded) => {
          if (loaded) {
            setState(loaded)
            setTurnIndex(loaded.history.turns.length)
            setPivotSignaled(chapterHasPivotSignal(loaded))
            // Restore quick actions from the last committed turn. Prose is
            // rendered from history now; live `prose` is reserved for the
            // currently streaming, uncommitted narrator output.
            const lastTurn = loaded.history.turns[loaded.history.turns.length - 1]
            if (lastTurn) {
              setSuggestedActions(lastTurn.narratorAnnotation?.suggestedActions ?? [])
            }
          } else if (typeof window !== 'undefined') {
            window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
          }
        })
        .catch(() => {})
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [prose, isStreaming])

  useEffect(() => {
    if (state) return
    const genreId = selectedSeed.seed.genreId
    try {
      applyGenreTheme(genreId as Genre)
    } catch {
      document.documentElement.setAttribute('data-genre', genreId)
    }
    document.body.setAttribute('data-genre', genreId)
  }, [selectedSeed, state])

  // Live timer while generating a chapter (Author call can take 30-90s).
  useEffect(() => {
    if (!isGeneratingChapter || !generationStartTime) {
      setGenerationElapsed(0)
      return
    }
    const interval = setInterval(() => {
      setGenerationElapsed(Math.floor((Date.now() - generationStartTime) / 1000))
    }, 500)
    return () => clearInterval(interval)
  }, [isGeneratingChapter, generationStartTime])

  const persist = useCallback(async (s: Sf2State) => {
    const p = persistenceRef.current
    if (!p) return
    try {
      await p.saveCampaign(s)
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(LAST_CAMPAIGN_KEY, s.meta.campaignId)
      }
    } catch {
      // non-fatal; surface in debug if needed
    }
  }, [])

  // Session metrics — compute on demand. Must be declared here BEFORE any
  // conditional early returns to satisfy Rules of Hooks.
  const sessionSummary = useMemo(
    () => (state ? computeSessionSummary(state, debug) : null),
    [state, debug]
  )

  function startCampaign() {
    const next = createInitialSf2State({
      campaignId: `camp_${Date.now()}`,
      playerName: playerName.trim() || 'Ren',
      seedId: selectedSeedId,
    })
    setState(next)
    setProse('')
    setSuggestedActions([])
    setDebug([])
    setReplayFrames([])
    setLastNarratorUsage(null)
    setLastArchivistUsage(null)
    setPendingCheck(null)
    setRollResult(null)
    setTurnIndex(0)
    setPivotSignaled(false)
    pendingInspirationSpendRef.current = 0
    persist(next)
  }

  async function resetCampaign() {
    const p = persistenceRef.current
    if (p && state) {
      try {
        await p.deleteCampaign(state.meta.campaignId)
      } catch {}
    }
    if (typeof window !== 'undefined') window.localStorage.removeItem(LAST_CAMPAIGN_KEY)
    setState(null)
    setProse('')
    setSuggestedActions([])
    setDebug([])
    setReplayFrames([])
    setTurnIndex(0)
    setPendingCheck(null)
    setPivotSignaled(false)
    pendingInspirationSpendRef.current = 0
  }

  async function runNarrator(
    currentState: Sf2State,
    playerInput: string,
    isInitial: boolean
  ): Promise<{
    completed: boolean
    prose: string
    annotation: Record<string, unknown> | null
    bundleBuilt: Sf2State['world']['sceneBundleCache'] | null
    rollRecords: Sf2State['history']['rollLog']
    sentinelEvents: Sf2TurnPipelineEvent[]
    workingSet: Sf2WorkingSet | null
  }> {
    setIsStreaming(true)
    setProse('')
    setSuggestedActions([])
    setPendingCheck(null)
    setRollResult(null)
    setInspirationOffer(null)
    pendingInspirationSpendRef.current = 0

    let proseAccum = ''
    let annotation: Record<string, unknown> | null = null
    let rollResolution: object | null = null
    let bundleBuilt: Sf2State['world']['sceneBundleCache'] | null = null
    let turnWorkingSet: Sf2WorkingSet | null = null
    const rollRecords: Sf2State['history']['rollLog'] = []
    // Display sentinel findings for THIS turn — captured during the stream so
    // they land in the per-turn frame's invariantEvents (and via that into the
    // session-log / replay-fixture downloads). Reset on every narrator call.
    const turnSentinelEvents: Sf2TurnPipelineEvent[] = []

    // Loop: each iteration runs one narrator stream. A request_roll mid-stream
    // pauses; we await the player's roll, then loop again with rollResolution
    // in the request body. Terminates when narrate_turn arrives.
    while (true) {
      const body = rollResolution
        ? {
            state: currentState,
            playerInput: '',
            isInitial: false,
            rollResolution,
          }
        : {
            state: currentState,
            playerInput: isInitial ? '' : playerInput,
            isInitial,
          }

      const res = await fetch('/api/sf2/narrator', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify(body),
      })

      if (!res.ok || !res.body) {
        let errorBody: unknown = null
        try { errorBody = await res.json() } catch {
          try { errorBody = await res.text() } catch {}
        }
        setDebug((d) => [
          ...d,
          { kind: 'error', at: Date.now(), data: { status: res.status, source: 'narrator', body: errorBody } },
        ])
        setIsStreaming(false)
        return { completed: false, prose: proseAccum, annotation, bundleBuilt, rollRecords, sentinelEvents: turnSentinelEvents, workingSet: turnWorkingSet }
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let sawRollPrompt: {
        toolUseId: string
        skill: string
        dc: number
        why: string
        consequenceOnFail: string
        modifierType?: 'advantage' | 'disadvantage' | 'challenge'
        modifierReason?: string
        priorMessages: unknown[]
      } | null = null
      let sawNarrateTurn = false
      let sawStreamError = false

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          let event: Record<string, unknown>
          try { event = JSON.parse(line) as Record<string, unknown> } catch { continue }
          switch (event.type) {
            case 'text': {
              proseAccum += String(event.content ?? '')
              setProse(proseAccum)
              break
            }
            case 'roll_prompt': {
              sawRollPrompt = {
                toolUseId: String(event.toolUseId ?? ''),
                skill: String(event.skill ?? ''),
                dc: Number(event.dc ?? 15),
                why: String(event.why ?? ''),
                consequenceOnFail: String(event.consequenceOnFail ?? ''),
                modifierType:
                  event.modifierType === 'advantage' ||
                  event.modifierType === 'disadvantage' ||
                  event.modifierType === 'challenge'
                    ? event.modifierType
                    : undefined,
                modifierReason: typeof event.modifierReason === 'string' ? event.modifierReason : undefined,
                priorMessages: (event.priorMessages as unknown[]) ?? [],
              }
              break
            }
            case 'narrate_turn': {
              annotation = event.input as Record<string, unknown>
              sawNarrateTurn = true
              setDebug((d) => [
                ...d,
                { kind: 'narrate_turn', at: Date.now(), data: annotation },
              ])
              const actions = (annotation?.suggested_actions as string[] | undefined) ?? []
              setSuggestedActions(actions)
              if (annotationHasPivotSignal(annotation)) setPivotSignaled(true)
              break
            }
            case 'token_usage': {
              const usage = event.usage as TokenUsage
              setLastNarratorUsage(usage)
              setDebug((d) => [...d, { kind: 'token_usage', at: Date.now(), data: { role: 'narrator', ...usage } }])
              break
            }
            case 'latency': {
              setDebug((d) => [
                ...d,
                {
                  kind: 'latency',
                  at: Date.now(),
                  data: { role: event.role ?? 'narrator', ...(event.latency as Record<string, unknown>) },
                },
              ])
              break
            }
            case 'working_set':
              turnWorkingSet = (event.workingSet as Sf2WorkingSet | undefined) ?? null
              setDebug((d) => [...d, { kind: 'working_set', at: Date.now(), data: event.summary }])
              break
            case 'scene_bundle_built': {
              const built = {
                sceneId: String(event.sceneId ?? ''),
                bundleText: String(event.bundleText ?? ''),
                builtAtTurn: Number(event.builtAtTurn ?? 0),
              }
              bundleBuilt = built
              setDebug((d) => [...d, {
                kind: 'scene_bundle_built',
                at: Date.now(),
                data: {
                  sceneId: built.sceneId,
                  builtAtTurn: built.builtAtTurn,
                  bundleBytes: built.bundleText.length,
                },
              }])
              break
            }
            case 'pacing_advisory':
              setDebug((d) => [...d, { kind: 'pacing_advisory', at: Date.now(), data: event }])
              break
            case 'narrator_meta_observed':
              setDebug((d) => [...d, {
                kind: 'narrator_meta_observed',
                at: Date.now(),
                data: {
                  pattern: String(event.pattern ?? ''),
                  snippet: String(event.snippet ?? ''),
                  turnIndex: Number(event.turnIndex ?? 0),
                },
              }])
              break
            case 'narrator_output_recovered':
              setDebug((d) => [...d, {
                kind: 'narrator_output_recovered',
                at: Date.now(),
                data: {
                  recoveryNotes: Array.isArray(event.recoveryNotes) ? event.recoveryNotes.map(String) : [],
                  turnIndex: Number(event.turnIndex ?? 0),
                },
              }])
              break
            case 'truncation_warning':
              setDebug((d) => [...d, { kind: 'truncation', at: Date.now(), data: event }])
              break
            case 'display_sentinel': {
              const findings = (event.findings as Array<Record<string, unknown>>) ?? []
              const mode = String(event.mode ?? 'observe')
              // Always emit the entry — even findings.length === 0 is useful
              // signal: "scanner ran, clean turn". This makes the false-
              // positive baseline observable in the session log.
              const entry: Sf2TurnPipelineEvent = {
                kind: 'display_sentinel',
                at: Date.now(),
                data: { mode, findings, findingCount: findings.length },
              }
              turnSentinelEvents.push(entry)
              setDebug((d) => [...d, entry])
              break
            }
            case 'error':
              sawStreamError = true
              setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: event.message }])
              break
            case 'done':
              break
          }
        }
      }

      if (sawStreamError) {
        setIsStreaming(false)
        return { completed: false, prose: proseAccum, annotation, bundleBuilt, rollRecords, sentinelEvents: turnSentinelEvents, workingSet: turnWorkingSet }
      }

      if (sawRollPrompt) {
        // Pause the narrator loop. Show the modal, wait for the player to roll.
        // If a roll chip from an earlier roll in this turn is still visible,
        // clear it so the new modal doesn't compete with stale outcome text.
        setRollResult(null)
        setPendingCheck(sawRollPrompt)
        const outcome = await new Promise<RollOutcome>((resolve) => {
          rollResolverRef.current = resolve
        })
        setPendingCheck(null)
        setRollResult(outcome)
        if (outcome.inspirationSpent) {
          currentState = structuredClone(currentState)
          currentState.player.inspiration = Math.max(0, currentState.player.inspiration - 1)
        }
        setDebug((d) => [
          ...d,
          {
            kind: 'roll',
            at: Date.now(),
            data: {
              ...outcome,
              skill: sawRollPrompt?.skill,
              dc: sawRollPrompt?.dc,
              why: sawRollPrompt?.why,
              consequenceOnFail: sawRollPrompt?.consequenceOnFail,
              turnIndex,
            },
          },
        ])
        rollRecords.push({
          turn: turnIndex,
          skill: sawRollPrompt.skill,
          dc: sawRollPrompt.dc,
          effectiveDc: outcome.effectiveDc,
          rollResult: outcome.d20,
          rawRolls: outcome.rawRolls,
          modifier: outcome.modifier,
          outcome:
            outcome.result === 'critical'
              ? 'critical_success'
              : outcome.result === 'fumble'
                ? 'critical_failure'
                : outcome.result,
          consequenceSummary: sawRollPrompt.consequenceOnFail,
          modifierType: outcome.modifierType,
          modifierReason: outcome.modifierReason,
          inspirationSpent: outcome.inspirationSpent,
          originalRoll: outcome.originalRoll
            ? {
                rollResult: outcome.originalRoll.d20,
                modifier: outcome.originalRoll.modifier,
                total: outcome.originalRoll.total,
                outcome:
                  outcome.originalRoll.result === 'critical'
                    ? 'critical_success'
                    : outcome.originalRoll.result === 'fumble'
                      ? 'critical_failure'
                      : outcome.originalRoll.result,
              }
            : undefined,
        })

        rollResolution = {
          toolUseId: sawRollPrompt.toolUseId,
          skill: sawRollPrompt.skill,
          dc: sawRollPrompt.dc,
          effectiveDc: outcome.effectiveDc,
          d20: outcome.d20,
          modifier: outcome.modifier,
          total: outcome.total,
          result: outcome.result,
          modifierType: outcome.modifierType,
          modifierReason: outcome.modifierReason,
          priorMessages: sawRollPrompt.priorMessages,
        }
        // Chip persists for the rest of this turn. Cleared at next turn start
        // (runNarrator's initial setRollResult(null)) or when a new roll fires.
        continue
      }

      if (sawNarrateTurn) break
      // If neither fired, the stream ended prematurely; bail.
      setDebug((d) => [...d, {
        kind: 'error',
        at: Date.now(),
        data: {
          source: 'narrator',
          message: 'stream ended before narrate_turn; turn was not committed',
        },
      }])
      setIsStreaming(false)
      return { completed: false, prose: proseAccum, annotation, bundleBuilt, rollRecords, sentinelEvents: turnSentinelEvents, workingSet: turnWorkingSet }
    }

    setIsStreaming(false)
    return { completed: true, prose: proseAccum, annotation, bundleBuilt, rollRecords, sentinelEvents: turnSentinelEvents, workingSet: turnWorkingSet }
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
      const res = await fetch('/api/sf2/archivist', {
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
        setDebug((d) => [
          ...d,
          {
            kind: 'error',
            at: Date.now(),
            data: { status: res.status, source: 'archivist', body: errorBody },
          },
        ])
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
      setLastArchivistUsage(data.usage)
      setDebug((d) => [
        ...d,
        {
          kind: 'archivist',
          at: Date.now(),
          data: {
            summary: data.summary,
            patch: data.patch,
            outcomes: data.outcomes,
            deferred: data.deferredWrites,
            drift: data.drift,
          },
        },
      ])
      if (Array.isArray(data.drift)) {
        for (const drift of data.drift as Array<{ kind?: string; detail?: string; entityId?: string }>) {
          if (drift.kind === 'identity_drift' && drift.detail?.startsWith('dedup:')) {
            setDebug((d) => [
              ...d,
              {
                kind: 'sf2.invariant',
                at: Date.now(),
                data: {
                  type: 'placeholder_or_duplicate_npc_merged',
                  entityId: drift.entityId,
                  detail: drift.detail,
                },
              },
            ])
          } else if (drift.kind === 'anchor_reference_missing') {
            setDebug((d) => [
              ...d,
              {
                kind: 'sf2.invariant',
                at: Date.now(),
                data: {
                  type: 'anchor_miss',
                  entityId: drift.entityId,
                  detail: drift.detail,
                },
              },
            ])
          }
        }
      }
      if (data.faceShift) {
        setDebug((d) => [...d, { kind: 'face_shift', at: Date.now(), data: data.faceShift }])
      }
      if (Array.isArray(data.ladderFired) && data.ladderFired.length > 0) {
        setDebug((d) => [...d, { kind: 'ladder_fired', at: Date.now(), data: data.ladderFired }])
      }
      const pruneTotal =
        (data.pruneSummary?.demotedDecisions ?? 0) +
        (data.pruneSummary?.demotedPromises ?? 0) +
        (data.pruneSummary?.consumedClues ?? 0) +
        (data.pruneSummary?.clearedFloatingClues ?? 0)
      if (pruneTotal > 0) {
        setDebug((d) => [...d, { kind: 'archivist', at: Date.now(), data: { pruned: data.pruneSummary } }])
      }
      // If the patch surfaced lexicon additions, log them — they're rare and
      // worth seeing.
      const lex = (data.patch as { lexiconAdditions?: unknown[] } | undefined)?.lexiconAdditions
      if (Array.isArray(lex) && lex.length > 0) {
        setDebug((d) => [...d, { kind: 'archivist', at: Date.now(), data: { lexicon_additions: lex } }])
      }
      // Coherence findings: push each as an event so rate + types are
      // inspectable in the debug stream and aggregatable in session summary.
      // Emit a clean_turn counterpart when zero, so the rate is computable
      // without counting-by-absence.
      const findings = data.coherenceFindings ?? []
      if (findings.length > 0) {
        for (const f of findings) {
          setDebug((d) => [
            ...d,
            { kind: 'sf2.coherence.finding', at: Date.now(), data: f },
          ])
        }
      } else {
        setDebug((d) => [
          ...d,
          { kind: 'sf2.coherence.clean_turn', at: Date.now(), data: null },
        ])
      }
      setDebug((d) => [
        ...d,
        { kind: 'token_usage', at: Date.now(), data: { role: 'archivist', ...data.usage } },
      ])
      if (data.latency) {
        setDebug((d) => [
          ...d,
          { kind: 'latency', at: Date.now(), data: { role: 'archivist', ...data.latency } },
        ])
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
      setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: message }])
      return { nextState: preTurnState, replay: null }
    } finally {
      setIsArchiving(false)
    }
  }

  async function generateArcIfNeeded(currentState: Sf2State): Promise<Sf2State | null> {
    if (isArcAuthored(currentState)) return currentState
    const existingArcPlan = currentState.campaign.arcPlan
    if (existingArcPlan && existingArcPlan.status !== 'active') {
      setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: {
        source: 'arc-author',
        message: 'arc plan is no longer active; automatic next-arc generation is future work',
        arcStatus: existingArcPlan.status,
      } }])
      return null
    }
    setIsArchiving(true)
    setIsGeneratingChapter(true)
    setGenerationStartTime(Date.now())
    try {
      const res = await fetch('/api/sf2/arc-author', {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ state: currentState }),
      })
      if (!res.ok) {
        let body: unknown = null
        try { body = await res.json() } catch {
          try { body = await res.text() } catch {}
        }
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: { status: res.status, source: 'arc-author', body } }])
        return null
      }
      const data = (await res.json()) as {
        arcPlan: Sf2ArcPlan
        arcEntity: Sf2Arc
        selectedArcVariantSeed?: Sf2ArcPlan['sourceHook'] & Record<string, unknown>
        usage: TokenUsage
        latency?: LatencyPayload
      }
      const next: Sf2State = structuredClone(currentState)
      next.campaign.arcPlan = data.arcPlan
      next.campaign.arcs[data.arcEntity.id] = data.arcEntity
      next.meta.updatedAt = new Date().toISOString()
      setDebug((d) => [...d, { kind: 'author', at: Date.now(), data: {
        arc: data.arcPlan.title,
        scenario: data.arcPlan.scenarioShape.mode,
        variantSeed: data.selectedArcVariantSeed,
        selectionRationale: data.arcPlan.scenarioShape.selectionRationale,
        rejectedDefaultShape: data.arcPlan.scenarioShape.rejectedDefaultShape,
        chapterFunctions: data.arcPlan.chapterFunctionMap.map((c) => `${c.chapter}: ${c.function}`),
        engines: data.arcPlan.pressureEngines.map((e) => e.id),
        stanceAxes: data.arcPlan.playerStanceAxes.map((a) => a.id),
      } }])
      setDebug((d) => [...d, { kind: 'token_usage', at: Date.now(), data: { role: 'arc-author', ...data.usage } }])
      if (data.latency) {
        setDebug((d) => [...d, { kind: 'latency', at: Date.now(), data: { role: 'arc-author', ...data.latency } }])
      }
      setState(next)
      persist(next)
      return next
    } catch (err) {
      const message = err instanceof Error ? err.message : 'arc_author_error'
      setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: message }])
      return null
    } finally {
      setIsArchiving(false)
      setIsGeneratingChapter(false)
      setGenerationStartTime(null)
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
      setDebug((d) => [
        ...d,
        {
          kind: 'author',
          at: Date.now(),
          data: {
            note: 'skipped — chapter already authored in state (loaded from IDB?)',
            chapterTitle: currentState.chapter.title,
          },
        },
      ])
      return currentState
    }
    const arced = await generateArcIfNeeded(currentState)
    if (!arced) return null
    currentState = arced
    setIsArchiving(true)
    setIsGeneratingChapter(true)
    setGenerationStartTime(Date.now())
    try {
      // eslint-disable-next-line no-console
      console.log('[sf2/client] generating chapter 1, fetching author endpoint...')
      const arcPlan = currentState.campaign.arcPlan
      if (arcPlan && arcPlan.status !== 'active') {
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: {
          source: 'author',
          message: 'arc plan is no longer active; automatic next-arc generation is future work',
          arcStatus: arcPlan.status,
        } }])
        return null
      }

      const res = await fetch('/api/sf2/author', {
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
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: { status: res.status, source: 'author-ch1', body } }])
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
      setDebug((d) => [...d, { kind: 'author', at: Date.now(), data: {
        chapter: data.chapter,
        title: data.runtimeState.title,
        npcCount: data.runtimeState.startingNpcIds.length,
        threadCount: data.runtimeState.activeThreadIds.length,
        ladderSteps: data.runtimeState.pressureLadder.length,
        chapterFunction: data.runtimeState.arcLink?.chapterFunction,
        pacing: data.runtimeState.pacingContract?.targetTurns,
      } }])
      setDebug((d) => [...d, { kind: 'token_usage', at: Date.now(), data: { role: 'author', ...data.usage } }])
      if (data.latency) {
        setDebug((d) => [...d, { kind: 'latency', at: Date.now(), data: { role: 'author', ...data.latency } }])
      }

      // Apply Ch1 setup to state.
      const next: Sf2State = structuredClone(currentState)
      // Snapshot the prior chapter's active threads BEFORE overwriting
      // next.chapter — pressure-runtime uses this to split 'active' (was-on-
      // stage-last-chapter) from 'background' (carried but quiet). Reading it
      // from the new setup later would always match itself and collapse to
      // 'active'.
      const priorActiveThreadIds = next.chapter?.setup.activeThreadIds ?? []
      next.meta.currentChapter = data.chapter
      next.chapter = {
        number: data.chapter,
        title: data.runtimeState.title,
        setup: data.runtimeState,
        scaffolding: data.scaffolding,
        artifacts: { opening: data.openingSeed },
        sceneSummaries: [],
        currentSceneId: `scene_${data.chapter}_1`,
      }
      // Hydrate campaign.npcs and campaign.threads from the FULL authored
      // payload so voice/affiliation/retrievalCue/resolutionCriteria/failureMode/
      // owner are populated — not the skeletal placeholder seed we used to ship.
      applyAuthoredToCampaign(
        next,
        data.authored,
        data.chapter as Sf2State['chapter']['number'],
        data.runtimeState.loadBearingThreadIds
      )
      next.chapter.setup = prepareChapterPressureRuntime(next, next.chapter.setup, priorActiveThreadIds)
      // Scene snapshot: opening-location name from the opening scene spec.
      next.world.currentLocation = {
        id: 'loc_opening',
        name: data.runtimeState.openingSceneSpec.location,
        description: data.runtimeState.openingSceneSpec.initialState,
        atmosphericConditions: [data.runtimeState.openingSceneSpec.atmosphericCondition],
        chapterCreated: data.chapter,
      }
      next.campaign.locations[next.world.currentLocation.id] = next.world.currentLocation
      next.world.sceneSnapshot = {
        sceneId: `scene_${data.chapter}_1`,
        location: next.world.currentLocation,
        presentNpcIds: data.openingSeed.visibleNpcIds.filter((id) => next.campaign.npcs[id]),
        timeLabel: '',
        established: [data.runtimeState.openingSceneSpec.initialState],
        firstTurnIndex: next.history.turns.length,
      }
      next.meta.currentSceneId = `scene_${data.chapter}_1`
      next.meta.updatedAt = new Date().toISOString()
      setDebug((d) => [...d, observeActorFirewallWrite(next, {
        actor: 'author',
        writeKind: 'chapter_setup',
        turnIndex: firewallTurnIndexFor(next),
        payload: {
          chapter: data.chapter,
          title: data.runtimeState.title,
          activeThreadCount: data.runtimeState.activeThreadIds.length,
          pressureLadderCount: data.runtimeState.pressureLadder.length,
        },
      })])
      setState(next)
      persist(next)
      return next
    } catch (err) {
      const message = err instanceof Error ? err.message : 'author_ch1_error'
      // eslint-disable-next-line no-console
      console.error('[sf2/client] author-ch1 threw', err)
      setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: message }])
      return null
    } finally {
      setIsArchiving(false)
      setIsGeneratingChapter(false)
      setGenerationStartTime(null)
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

    setPendingInput('')

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
      setDebug((d) => [...d, ...committedTurn.invariantEvents])
    }
    setReplayFrames((frames) => [...frames, committedTurn.replayFrame])
    setState(committedTurn.stateAfter)
    setTurnIndex(committedTurn.nextTurnIndex)
    setPivotSignaled(chapterHasPivotSignal(committedTurn.stateAfter))
    setProse('')
    setRollResult(null)
    setInspirationOffer(null)
    pendingInspirationSpendRef.current = 0
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
      const meaningRes = await fetch('/api/sf2/chapter-meaning', {
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
        setDebug((d) => [...d, { kind: 'author', at: Date.now(), data: { chapter_meaning: meaningData.meaning } }])
        setDebug((d) => [...d, { kind: 'token_usage', at: Date.now(), data: { role: 'chapter-meaning', ...meaningData.usage } }])
        if (meaningData.latency) {
          setDebug((d) => [...d, { kind: 'latency', at: Date.now(), data: { role: 'chapter-meaning', ...meaningData.latency } }])
        }

        // Persist meaning on the closing chapter's artifacts.
        authorBaseState = structuredClone(authorBaseState)
        authorBaseState.chapter.artifacts.meaning = meaningData.meaning
        authorBaseState.meta.updatedAt = new Date().toISOString()
        setDebug((d) => [...d, observeActorFirewallWrite(authorBaseState, {
          actor: 'author',
          writeKind: 'chapter_meaning',
          turnIndex: firewallTurnIndexFor(authorBaseState),
          payload: {
            chapter: authorBaseState.chapter.number,
            closingResolution: meaningData.meaning.closingResolution,
          },
        })])
        setState(authorBaseState)
        await persist(authorBaseState)
      } else {
        let body: unknown = null
        try { body = await meaningRes.json() } catch {}
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: { status: meaningRes.status, source: 'chapter-meaning', body } }])
        // Proceed without priorChapterMeaning — Author will fall back to state-derived hook.
      }

      const arcPlan = authorBaseState.campaign.arcPlan
      if (arcPlan && arcPlan.status !== 'active') {
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: {
          source: 'author',
          message: 'arc plan is no longer active; automatic next-arc generation is future work',
          arcStatus: arcPlan.status,
        } }])
        return
      }

      const res = await fetch('/api/sf2/author', {
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
        setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: { status: res.status, source: 'author', body } }])
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

      setDebug((d) => [...d, { kind: 'author', at: Date.now(), data: {
        chapter: data.chapter,
        title: data.runtimeState.title,
        npcCount: data.runtimeState.startingNpcIds.length,
        threadCount: data.runtimeState.activeThreadIds.length,
        ladderSteps: data.runtimeState.pressureLadder.length,
        threadTransitions: data.threadTransitions ?? [],
        chapterFunction: data.runtimeState.arcLink?.chapterFunction,
        pacing: data.runtimeState.pacingContract?.targetTurns,
      } }])
      setDebug((d) => [...d, { kind: 'token_usage', at: Date.now(), data: { role: 'author', ...data.usage } }])
      if (data.latency) {
        setDebug((d) => [...d, { kind: 'latency', at: Date.now(), data: { role: 'author', ...data.latency } }])
      }

      // Apply the new chapter: bump chapter counter, swap setup/scaffolding/opening,
      // reset per-chapter view fields. DOES NOT drop the campaign graph (NPCs, threads,
      // clues carry across; the Author may reference existing ids via ownerHint).
      const next: Sf2State = structuredClone(authorBaseState)
      // Snapshot prior chapter's actives before overwriting next.chapter —
      // see prepareChapterPressureRuntime: this drives the active vs
      // background role split.
      const priorActiveThreadIds = next.chapter?.setup.activeThreadIds ?? []
      next.meta.currentChapter = data.chapter
      next.meta.currentSceneId = `scene_${data.chapter}_1`
      // Apply Author-emitted thread transitions to carried campaign threads.
      // Closes threads whose resolutionCriteria was met in the prior chapter
      // but wasn't transitioned during play.
      for (const t of data.threadTransitions ?? []) {
        const thread = next.campaign.threads[t.id]
        if (!thread) continue
        thread.status = t.toStatus
        thread.lastAdvancedTurn = next.history.turns.length
      }
      next.chapter = {
        number: data.chapter,
        title: data.runtimeState.title,
        setup: data.runtimeState,
        scaffolding: data.scaffolding,
        artifacts: { opening: data.openingSeed },
        sceneSummaries: [],
        currentSceneId: `scene_${data.chapter}_1`,
      }
      // Hydrate campaign graph with full Author payload: new entities get
      // rich fields; carried-forward entities get refreshed voice/affiliation/
      // retrievalCue/resolutionCriteria/failureMode when the Author evolved them.
      applyAuthoredToCampaign(
        next,
        data.authored,
        data.chapter as Sf2State['chapter']['number'],
        data.runtimeState.loadBearingThreadIds
      )
      next.chapter.setup = prepareChapterPressureRuntime(next, next.chapter.setup, priorActiveThreadIds)
      // Reset scene view at chapter transition. Derive a fresh timeLabel
      // from the Author's atmosphericCondition so the new chapter opens at
      // its authored moment instead of inheriting the prior chapter's close
      // time (which caused a regression: Ch1 closed at dusk, Ch2 opening
      // atmospheric said "late afternoon" → Narrator produced conflicting
      // snapshots with time going backwards).
      const atmos = data.runtimeState.openingSceneSpec.atmosphericCondition ?? ''
      const derivedTimeLabel = atmos.split(/[.;]/)[0].trim().slice(0, 80)
      next.world.currentTimeLabel = derivedTimeLabel
      next.meta.currentTimeLabel = derivedTimeLabel
      // Location: use the authored opening location description for the new
      // scene so Narrator doesn't hang on to the prior chapter's location.
      next.world.currentLocation = {
        id: `loc_ch${data.chapter}_opening`,
        name: data.runtimeState.openingSceneSpec.location || next.world.currentLocation.name,
        description: data.runtimeState.openingSceneSpec.initialState || '',
        atmosphericConditions: atmos ? [atmos] : undefined,
        chapterCreated: data.chapter,
      }
      next.campaign.locations[next.world.currentLocation.id] = next.world.currentLocation
      next.world.sceneSnapshot = {
        sceneId: `scene_${data.chapter}_1`,
        location: next.world.currentLocation,
        presentNpcIds: data.openingSeed.visibleNpcIds.filter((id) => next.campaign.npcs[id]),
        timeLabel: derivedTimeLabel,
        established: [`Chapter ${data.chapter} opens.`, data.runtimeState.openingSceneSpec.initialState],
        firstTurnIndex: next.history.turns.length,
      }
      // Scene changed — clear the prior chapter's scene bundle cache. The
      // Narrator route will rebuild on the first turn of the new chapter.
      next.world.sceneBundleCache = undefined
      next.meta.updatedAt = new Date().toISOString()
      setDebug((d) => [...d, observeActorFirewallWrite(next, {
        actor: 'author',
        writeKind: 'chapter_setup',
        turnIndex: firewallTurnIndexFor(next),
        payload: {
          chapter: data.chapter,
          title: data.runtimeState.title,
          activeThreadCount: data.runtimeState.activeThreadIds.length,
          pressureLadderCount: data.runtimeState.pressureLadder.length,
        },
      })])
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
      setDebug((d) => [...d, { kind: 'error', at: Date.now(), data: message }])
    } finally {
      setIsArchiving(false)
    }
  }

  function availableInspiration(s: Sf2State): number {
    return Math.max(0, s.player.inspiration - pendingInspirationSpendRef.current)
  }

  function resolvePendingCheck() {
    if (!state || !pendingCheck) return
    const rollOne = () => 1 + Math.floor(Math.random() * 20)
    const first = rollOne()
    const second =
      pendingCheck.modifierType === 'advantage' || pendingCheck.modifierType === 'disadvantage'
        ? rollOne()
        : undefined
    const d20 =
      pendingCheck.modifierType === 'advantage' && second !== undefined
        ? Math.max(first, second)
        : pendingCheck.modifierType === 'disadvantage' && second !== undefined
          ? Math.min(first, second)
          : first
    const modifier = modifierForSkill(state, pendingCheck.skill)
    const effectiveDc = effectiveDcFor(pendingCheck)
    const outcome = {
      ...resolveRoll(d20, modifier, pendingCheck.dc, effectiveDc),
      rawRolls: second !== undefined ? [first, second] : undefined,
      skill: pendingCheck.skill,
      modifierType: pendingCheck.modifierType,
      modifierReason: pendingCheck.modifierReason,
    }
    const failed = outcome.result === 'failure' || outcome.result === 'fumble'
    if (failed && availableInspiration(state) > 0) {
      setRollResult(outcome)
      setInspirationOffer(outcome)
      return
    }
    // Hand the outcome back to the paused narrator loop.
    const resolver = rollResolverRef.current
    rollResolverRef.current = null
    if (resolver) resolver(outcome)
  }

  function declineInspirationReroll() {
    if (!inspirationOffer) return
    const resolver = rollResolverRef.current
    rollResolverRef.current = null
    setInspirationOffer(null)
    if (resolver) resolver(inspirationOffer)
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
    const modifier = modifierForSkill(state, pendingCheck.skill)
    const effectiveDc = effectiveDcFor(pendingCheck)
    const outcome: RollOutcome = {
      ...resolveRoll(d20, modifier, pendingCheck.dc, effectiveDc),
      skill: pendingCheck.skill,
      modifierType: 'inspiration',
      modifierReason: 'spent after failed roll',
      inspirationSpent: true,
      originalRoll: inspirationOffer,
    }
    setRollResult(outcome)
    setInspirationOffer(null)
    const resolver = rollResolverRef.current
    rollResolverRef.current = null
    if (resolver) resolver(outcome)
  }

  // ────────── Render ──────────

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 font-mono flex items-center justify-center">
        <div className="text-sm text-neutral-500">loading…</div>
      </div>
    )
  }

  if (!state) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 font-mono">
        <div className="max-w-2xl mx-auto space-y-6">
          <h1 className="text-2xl">Storyforge v2 · seed bootstrap</h1>
          <p className="text-sm text-neutral-400">
            {selectedSeed.seed.genreName} · origin: {selectedSeed.seed.originName} · class:{' '}
            {selectedSeed.seed.playbookName} · hook: {selectedSeed.seed.hook.title}.
            On first "Begin" the Author (Haiku) generates the chapter setup from the seed.
          </p>
          <div className="space-y-2">
            <label className="text-sm text-neutral-400" htmlFor="seed">
              Dev seed
            </label>
            <select
              id="seed"
              value={selectedSeedId}
              onChange={(e) => setSelectedSeedId(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-neutral-100"
            >
              {SF2_BOOTSTRAP_SEED_OPTIONS.map((seed) => (
                <option key={seed.id} value={seed.id}>
                  {seed.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">{selectedSeed.description}</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm text-neutral-400" htmlFor="name">
              Character name
            </label>
            <input
              id="name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full bg-neutral-900 border border-neutral-700 rounded px-3 py-2 text-neutral-100"
            />
          </div>
          <button
            onClick={startCampaign}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-amber-100 rounded"
          >
            Create campaign
          </button>
        </div>
      </div>
    )
  }

  const busy = isStreaming || isArchiving
  const chapterPivotSignaled = pivotSignaled || chapterHasPivotSignal(state)

  // Close-ready heuristic. Anchored on chapter-scoped *narrative arc progression*,
  // not on turn count + tension (which let chapters close without their
  // authored climactic beat happening).
  //
  // The chapter is ready to close when any of:
  //   (a) Narrator explicitly signaled pivot (chapter-scoped resolution per
  //       its prompt), OR
  //   (b) The spine thread reached a terminal status — resolved/abandoned.
  //       Deferred is a pause/reopen state, not a landing, OR
  //   (c) Safety fallback: ≥25 turns AND spine tension ≥8 AND ≥half ladder
  //       fired — chapter has stalled well past target length. Close anyway
  //       so the campaign doesn't hang on an unresolved spine.
  //
  // A fired pressure ladder is not enough by itself. Playthrough 11 showed a
  // clean chapter setup reaching the last pressure beat while the actual
  // chapter question remained unresolved ("Will the Warden file?"). In that
  // case the next turn should land the decision, not close the chapter.
  const {
    closeReady,
    chapterTurnCount,
    spineResolved,
    stalledFallback,
    ladderFiredCount,
    ladderStepCount,
    spineStatus,
    spineTension,
    successorRequired,
    promotedSpineThreadId,
  } = computeChapterCloseReadiness(state, chapterPivotSignaled)

  function downloadSessionLog() {
    if (!state) return
    const summary = computeSessionSummary(state, debug)
    const blob = new Blob(
      [JSON.stringify({ summary, state, debug, replayFrames }, null, 2)],
      { type: 'application/json' }
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sf2-session-${state.meta.campaignId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  function downloadReplayFixture() {
    if (!state) return
    const summary = computeSessionSummary(state, debug)
    const fixture = {
      schema: 'sf2-replay-fixture/v1',
      exportedAt: new Date().toISOString(),
      campaignId: state.meta.campaignId,
      summary,
      finalState: state,
      debug,
      frames: replayFrames,
      note:
        'Replay frames are captured model outputs plus before/after states. They are intended for model-free testing of deterministic tool application, cache invalidation, scene packets, and invariants.',
    }
    const blob = new Blob([JSON.stringify(fixture, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sf2-replay-${state.meta.campaignId}-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const campaignStats = {
    npcs: Object.keys(state.campaign.npcs).length,
    threads: Object.keys(state.campaign.threads).length,
    decisions: Object.values(state.campaign.decisions).filter((d) => d.status === 'active').length,
    promises: Object.values(state.campaign.promises).filter((p) => p.status === 'active').length,
    clues: Object.keys(state.campaign.clues).length,
  }

  const closeReadiness: Sf2CloseReadinessView = {
    closeReady,
    chapterPivotSignaled,
    spineResolved,
    stalledFallback,
    ladderFiredCount,
    ladderStepCount,
    spineStatus,
    spineTension: spineTension ?? 0,
    successorRequired,
    promotedSpineThreadId,
  }
  const rollModifier = pendingCheck
    ? modifierForSkill(state, pendingCheck.skill)
    : rollResult?.modifier ?? null
  const currentEffectiveDc = pendingCheck
    ? effectiveDcFor(pendingCheck)
    : rollResult?.effectiveDc ?? rollResult?.dc ?? null

  return (
    <Sf2PlayShell
      state={state}
      scrollRef={scrollRef}
      prose={prose}
      suggestedActions={suggestedActions}
      pendingInput={pendingInput}
      pendingCheck={pendingCheck}
      rollResult={rollResult}
      inspirationOffer={inspirationOffer}
      rollModifier={rollModifier}
      effectiveDc={currentEffectiveDc}
      inspirationRemaining={availableInspiration(state)}
      isStreaming={isStreaming}
      isArchiving={isArchiving}
      isGeneratingChapter={isGeneratingChapter}
      generationElapsed={generationElapsed}
      busy={busy}
      chapterTurnCount={chapterTurnCount}
      closeReadiness={closeReadiness}
      campaignStats={campaignStats}
      sessionSummary={sessionSummary}
      debug={debug}
      lastNarratorUsage={lastNarratorUsage}
      lastArchivistUsage={lastArchivistUsage}
      onPendingInputChange={setPendingInput}
      onSendTurn={sendTurn}
      onResolvePendingCheck={resolvePendingCheck}
      onSpendInspiration={spendInspirationReroll}
      onDeclineInspiration={declineInspirationReroll}
      onCloseChapter={closeChapterAndOpenNext}
      onResetCampaign={resetCampaign}
      onDownloadSessionLog={downloadSessionLog}
      onDownloadReplayFixture={downloadReplayFixture}
    />
  )
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
