import { ENGINE_AGGREGATION_DEFAULT } from './constants'
import { deriveEngineValue, initializeChapterPressure } from './derive'
import { reheatLadderFire } from './reheat'
import { isSf2bState } from '../../sf2b/mode'
import { readSf2bObjectiveGate } from '../../sf2b/objective-gate'
import type {
  Sf2ArchivistFlag,
  Sf2ChapterSetupRuntimeState,
  Sf2EngineRuntime,
  Sf2EntityId,
  Sf2PressureLadderStep,
  Sf2State,
  Sf2Thread,
} from '../types'

const MIN_CLOSE_TURN = 18
const MAX_LADDER_FIRES_PER_TURN = 2

const CLOSE_TERMINAL_THREAD_STATUSES = new Set<Sf2Thread['status']>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
])

export interface ChapterPressureCloseReadiness {
  closeReady: boolean
  chapterTurnCount: number
  spineResolved: boolean
  stalledFallback: boolean
  successorRequired: boolean
  ladderFiredCount: number
  ladderStepCount: number
  spineStatus?: Sf2Thread['status']
  spineTension?: number
  promotedSpineThreadId?: string
  objectiveResolved?: boolean
  objectiveOutcome?: 'active' | 'resolved' | 'failed' | 'deferred'
  reframeCandidateThreadId?: string
  closeOrReframeDirective?: string
}

export interface ChapterPressureStepProjection {
  id: string
  pressure: string
  fired: boolean
}

export interface ChapterPressureProjection {
  activeStep?: ChapterPressureStepProjection
  closeReadiness: ChapterPressureCloseReadiness
  faceName: string
  ladderFiredCount: number
  ladderSteps: ChapterPressureStepProjection[]
  ladderStepCount: number
}

export interface ChapterPressureLadderResult {
  firedThisTurn: Sf2PressureLadderStep[]
  drift: Sf2ArchivistFlag[]
}

export interface ChapterPressureRecoveryResult {
  events: Array<{
    type:
      | 'early_spine_resolved_promoted_successor'
      | 'early_spine_resolved_successor_required'
      | 'sf2b_objective_close_or_reframe'
    data: Record<string, unknown>
  }>
}

function ensureRuntimeEnginesFromArcPlan(state: Sf2State): void {
  const arc = state.campaign.arcPlan
  if (!arc) return
  state.campaign.engines ??= {}
  for (const engine of arc.pressureEngines) {
    const existing = state.campaign.engines[engine.id]
    // Summary stays in sync with the arc-plan's visibleSymptoms while
    // existing.summary still equals what we last seeded from it. Once Phase 6
    // adds `update_engine` patches (archivist-driven summary writes), that
    // overridden summary will diverge from visibleSymptoms and we stop
    // refreshing. This keeps long-arc signal alive instead of frozen at first
    // creation, without clobbering future explicit edits.
    const summaryFromArc = engine.visibleSymptoms
    const summary =
      existing && existing.summary !== existing.visibleSymptoms
        ? existing.summary
        : summaryFromArc
    const runtime: Sf2EngineRuntime = {
      id: engine.id,
      name: engine.name,
      status: existing?.status ?? 'active',
      summary,
      aggregation: existing?.aggregation ?? engine.aggregation ?? ENGINE_AGGREGATION_DEFAULT,
      anchorThreadIds: existing?.anchorThreadIds ?? [],
      primaryThreadId: existing?.primaryThreadId,
      value: existing?.value ?? 0,
      advancesWhen: engine.advancesWhen,
      slowsWhen: engine.slowsWhen,
      visibleSymptoms: engine.visibleSymptoms,
      lastUpdatedTurn: existing?.lastUpdatedTurn,
      lastUpdatedChapter: existing?.lastUpdatedChapter,
    }
    state.campaign.engines[engine.id] = runtime
  }
}

// `priorActiveThreadIds` is the previous chapter's activeThreadIds, captured
// before the new chapter setup overwrote them. Required so the role splitter
// can distinguish "active last chapter" from "background carried into this
// chapter" — the two roles cool by 2 vs 4 (D4) and the bug at the call site
// would silently classify everything as 'active' if we read it from `state`.
function prepareChapterPressureRuntime(
  state: Sf2State,
  chapterSetup: Sf2ChapterSetupRuntimeState,
  priorActiveThreadIds: Sf2EntityId[]
): Sf2ChapterSetupRuntimeState {
  ensureRuntimeEnginesFromArcPlan(state)
  seedSelectedEngineAnchors(state, chapterSetup)
  updateRuntimeEngineValues(state)
  return {
    ...chapterSetup,
    threadPressure: initializeChapterPressure(state, chapterSetup, priorActiveThreadIds),
  }
}

function updateRuntimeEngineValues(state: Sf2State): void {
  const turn = state.history.turns.length
  const chapter = state.meta.currentChapter
  for (const engine of Object.values(state.campaign.engines ?? {})) {
    const nextValue = deriveEngineValue(engine, state.campaign.threads)
    if (engine.value !== nextValue) {
      engine.value = nextValue
      engine.lastUpdatedTurn = turn
      engine.lastUpdatedChapter = chapter
    }
  }
}

function applyArchivistPressureEffects(
  state: Sf2State,
  input: {
    ladderFires?: string[]
    turnIndex: number
  }
): ChapterPressureLadderResult {
  const drift: Sf2ArchivistFlag[] = []
  const firedThisTurn: Sf2PressureLadderStep[] = []
  const requestedFires = input.ladderFires ?? []

  if (requestedFires.length > 0) {
    const firedLastTurn = state.chapter.setup.pressureLadder.some(
      (s) => s.fired && s.firedAtTurn === input.turnIndex - 1
    )
    const proposed = requestedFires.filter((id) =>
      state.chapter.setup.pressureLadder.some((s) => s.id === id && !s.fired)
    )
    if (firedLastTurn) {
      for (const dropId of proposed) {
        drift.push({
          kind: 'contradiction',
          detail: `ladder fire cooldown: ${dropId} deferred (a step fired on the prior turn — consecutive-turn fires are rejected)`,
          entityId: dropId,
        })
      }
    } else {
      const accepted = proposed.slice(0, MAX_LADDER_FIRES_PER_TURN)
      const dropped = proposed.slice(MAX_LADDER_FIRES_PER_TURN)
      const acceptedSet = new Set(accepted)
      for (const step of state.chapter.setup.pressureLadder) {
        if (step.fired) continue
        if (acceptedSet.has(step.id)) {
          step.fired = true
          step.firedAtTurn = input.turnIndex
          firedThisTurn.push(step)
          const explicitThreadIds = (step.threadIds ?? []).filter(
            (id) => Boolean(state.chapter.setup.threadPressure?.[id])
          )
          const ladderTargets = explicitThreadIds.length > 0
            ? explicitThreadIds
            : state.chapter.setup.spineThreadId
              ? [state.chapter.setup.spineThreadId]
              : []
          if (ladderTargets.length > 0) {
            reheatLadderFire(state.chapter.setup, ladderTargets, step.severity)
          }
        }
      }
      for (const dropId of dropped) {
        drift.push({
          kind: 'contradiction',
          detail: `ladder fire cap: ${dropId} deferred (>${MAX_LADDER_FIRES_PER_TURN} proposed fires this turn)`,
          entityId: dropId,
        })
      }
    }
  }

  updateRuntimeEngineValues(state)
  return { firedThisTurn, drift }
}

function computeChapterPressureProjection(
  state: Sf2State,
  input: { pivotSignaled: boolean }
): ChapterPressureProjection {
  const steps = state.chapter.setup.pressureLadder
  const ladderSteps = steps.map((step) => ({
    id: step.id,
    pressure: step.pressure,
    fired: step.fired,
  }))
  const ladderFiredCount = steps.filter((step) => step.fired).length
  return {
    activeStep: ladderSteps.find((step) => !step.fired) ?? ladderSteps[ladderSteps.length - 1],
    closeReadiness: computeChapterCloseReadiness(state, input.pivotSignaled),
    faceName:
      state.chapter.setup.antagonistField.currentPrimaryFace.name ||
      state.chapter.setup.antagonistField.corePressure ||
      'Pressure forming',
    ladderFiredCount,
    ladderSteps,
    ladderStepCount: steps.length,
  }
}

export function computeChapterCloseReadiness(
  state: Sf2State,
  pivotSignaled: boolean
): ChapterPressureCloseReadiness {
  const chapterTurnCount = state.history.turns.filter(
    (t) => t.chapter === state.meta.currentChapter
  ).length

  const spineThread = state.chapter.setup.spineThreadId
    ? state.campaign.threads[state.chapter.setup.spineThreadId]
    : null
  const ladderSteps = state.chapter.setup.pressureLadder
  const ladderFiredCount = ladderSteps.filter((s) => s.fired).length
  const halfLadderFired = ladderSteps.length > 0 && ladderFiredCount >= Math.ceil(ladderSteps.length / 2)
  const spineResolved = spineThread !== null && CLOSE_TERMINAL_THREAD_STATUSES.has(spineThread.status)
  const sf2bObjective = isSf2bState(state) ? readSf2bObjectiveGate(state) : null
  let promotedSpineThreadId: string | undefined
  let successorRequired = false

  if (
    spineThread &&
    spineResolved &&
    chapterTurnCount < MIN_CLOSE_TURN &&
    !sf2bObjective?.shouldCloseOrReframe
  ) {
    const nextSpine = findBestUnresolvedLoadBearingThread(state, spineThread.id)
    if (nextSpine) {
      promotedSpineThreadId = nextSpine.id
    } else {
      successorRequired = true
    }
  }

  const effectiveSpineThread = promotedSpineThreadId
    ? state.campaign.threads[promotedSpineThreadId]
    : spineThread
  const spineResolvedAfterPromotion =
    effectiveSpineThread !== null && CLOSE_TERMINAL_THREAD_STATUSES.has(effectiveSpineThread.status)
  const stalledFallback =
    chapterTurnCount >= 25 && halfLadderFired && (effectiveSpineThread?.tension ?? 0) >= 8
  const closeReady =
    sf2bObjective?.shouldCloseOrReframe ||
    (
      chapterTurnCount >= MIN_CLOSE_TURN &&
      (pivotSignaled || spineResolvedAfterPromotion || stalledFallback)
    )

  return {
    closeReady,
    chapterTurnCount,
    spineResolved: spineResolvedAfterPromotion,
    stalledFallback,
    successorRequired,
    ladderFiredCount,
    ladderStepCount: ladderSteps.length,
    spineStatus: effectiveSpineThread?.status,
    spineTension: effectiveSpineThread?.tension,
    promotedSpineThreadId,
    objectiveResolved: sf2bObjective?.foregroundAnswered,
    objectiveOutcome: sf2bObjective?.foregroundOutcome,
    reframeCandidateThreadId: sf2bObjective?.reframeCandidate?.threadId,
    closeOrReframeDirective: sf2bObjective?.directive,
  }
}

function applyPostTurnPressureRecovery(state: Sf2State): ChapterPressureRecoveryResult {
  const events: ChapterPressureRecoveryResult['events'] = []
  const closeRecovery = computeChapterCloseReadiness(state, false)
  if (closeRecovery.closeOrReframeDirective) {
    state.campaign.pendingRecoveryNotes = Array.from(new Set([
      ...(state.campaign.pendingRecoveryNotes ?? []),
      closeRecovery.closeOrReframeDirective,
    ])).slice(-6)
    events.push({
      type: 'sf2b_objective_close_or_reframe',
      data: {
        chapterTurnCount: closeRecovery.chapterTurnCount,
        objectiveOutcome: closeRecovery.objectiveOutcome,
        spineThreadId: state.chapter.setup.spineThreadId,
        reframeCandidateThreadId: closeRecovery.reframeCandidateThreadId,
      },
    })
  }
  if (closeRecovery.promotedSpineThreadId) {
    const promoted = state.campaign.threads[closeRecovery.promotedSpineThreadId]
    state.chapter.setup.spineThreadId = closeRecovery.promotedSpineThreadId
    if (promoted) {
      promoted.spineForChapter = state.meta.currentChapter
      promoted.loadBearing = true
      promoted.chapterDriverKind = promoted.successorToThreadId
        ? 'successor'
        : promoted.chapterDriverKind ?? 'new_pressure'
    }
    if (!state.chapter.setup.activeThreadIds.includes(closeRecovery.promotedSpineThreadId)) {
      state.chapter.setup.activeThreadIds.push(closeRecovery.promotedSpineThreadId)
    }
    if (!state.chapter.setup.loadBearingThreadIds.includes(closeRecovery.promotedSpineThreadId)) {
      state.chapter.setup.loadBearingThreadIds.push(closeRecovery.promotedSpineThreadId)
    }
    const promotedPressureRole = promoted?.successorToThreadId ? 'load_bearing' : 'spine'
    if (!state.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId]) {
      const openingFloor = Math.max(6, Math.min(10, promoted?.tension ?? 6))
      state.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId] = {
        threadId: closeRecovery.promotedSpineThreadId,
        role: promotedPressureRole,
        openingFloor,
        localEscalation: 0,
        maxThisChapter: openingFloor,
        cooledAtOpen: false,
      }
    } else {
      state.chapter.setup.threadPressure[closeRecovery.promotedSpineThreadId].role = promotedPressureRole
    }
    events.push({
      type: 'early_spine_resolved_promoted_successor',
      data: {
        promotedSpineThreadId: closeRecovery.promotedSpineThreadId,
        chapterTurnCount: closeRecovery.chapterTurnCount,
      },
    })
  }
  if (closeRecovery.successorRequired) {
    const note =
      'The chapter spine resolved before turn 18 and no unresolved load-bearing thread could replace it. This turn must actively establish successor pressure before the chapter can close: surface an existing unresolved thread in visible prose, or manufacture a concrete new complication that follows from the resolved spine. Put the successor question in the prose with an owner, stakes, and an immediate next pressure-bearing choice so the Archivist can create/anchor the successor thread. Do not signal chapter close yet.'
    state.campaign.pendingRecoveryNotes = Array.from(new Set([
      ...(state.campaign.pendingRecoveryNotes ?? []),
      note,
    ]))
    events.push({
      type: 'early_spine_resolved_successor_required',
      data: {
        chapterTurnCount: closeRecovery.chapterTurnCount,
        spineThreadId: state.chapter.setup.spineThreadId,
      },
    })
  }
  return { events }
}

export const chapterPressureRuntime = {
  prepareChapterOpen: prepareChapterPressureRuntime,
  applyArchivistEffects: applyArchivistPressureEffects,
  project: computeChapterPressureProjection,
  recoverAfterTurn: applyPostTurnPressureRecovery,
  updateEngines: updateRuntimeEngineValues,
}

function seedSelectedEngineAnchors(
  state: Sf2State,
  chapterSetup: Sf2ChapterSetupRuntimeState
): void {
  const selectedIds = chapterSetup.arcLink?.pressureEngineIds ?? []
  if (selectedIds.length === 0) return
  const anchorIds = chapterSetup.activeThreadIds.filter((id) => Boolean(state.campaign.threads[id]))
  if (anchorIds.length === 0) return
  for (const engineId of selectedIds) {
    const engine = state.campaign.engines[engineId]
    if (!engine) continue
    engine.anchorThreadIds = unionIds(engine.anchorThreadIds, anchorIds)
  }
}

function findBestUnresolvedLoadBearingThread(
  state: Sf2State,
  previousSpineThreadId: string
): Sf2Thread | null {
  const loadBearing = new Set(state.chapter.setup.loadBearingThreadIds)
  const activeIds = new Set([
    ...state.chapter.setup.activeThreadIds,
    ...Object.values(state.campaign.threads)
      .filter((thread) => thread.status === 'active')
      .map((thread) => thread.id),
  ])
  const activeThreads = [...activeIds]
    .filter((id) => id !== previousSpineThreadId && loadBearing.has(id))
    .map((id) => state.campaign.threads[id])
    .filter((thread): thread is Sf2Thread =>
      Boolean(thread) &&
      thread.status === 'active' &&
      thread.loadBearing
    )
    .sort((a, b) => {
      const driverScore = driverPriority(b) - driverPriority(a)
      if (driverScore !== 0) return driverScore
      return b.tension - a.tension
    })

  if (activeThreads[0]) return activeThreads[0]

  return Object.values(state.campaign.threads)
    .filter((thread) =>
      thread.id !== previousSpineThreadId &&
      thread.status === 'active' &&
      thread.chapterCreated === state.meta.currentChapter
    )
    .sort((a, b) => {
      const driverScore = driverPriority(b) - driverPriority(a)
      if (driverScore !== 0) return driverScore
      const loadBearingScore = Number(b.loadBearing) - Number(a.loadBearing)
      if (loadBearingScore !== 0) return loadBearingScore
      return b.tension - a.tension
    })[0] ?? null
}

function driverPriority(thread: Sf2Thread): number {
  if (thread.chapterDriverKind === 'successor') return 3
  if (thread.chapterDriverKind === 'new_pressure') return 2
  return 1
}

function unionIds(a: Sf2EntityId[], b: Sf2EntityId[]): Sf2EntityId[] {
  return Array.from(new Set([...a, ...b]))
}
