import {
  CHAPTER_OPEN_CAP,
  CONTRIBUTION_MULTIPLIERS,
  COOLING_BY_ROLE,
  NEW_THREAD_INITIAL_TENSION_BY_ROLE,
} from './constants'
import type {
  Sf2ChapterSetupRuntimeState,
  Sf2ChapterThreadPressure,
  Sf2EngineRuntime,
  Sf2EntityId,
  Sf2State,
  Sf2Thread,
  Sf2Tension,
  ThreadRole,
} from '../types'

// Contribution floors conservatively (D5: a half-resolved thread shouldn't
// round up into the engine). Aggregation rounds (so averaged engines don't
// silently lose precision across multiple anchors). The asymmetry is
// intentional per the shaping helper.
export function deriveEngineValue(
  engine: Sf2EngineRuntime,
  threads: Record<Sf2EntityId, Sf2Thread>
): Sf2Tension {
  const anchored = engine.anchorThreadIds
    .map((id) => ({ id, thread: threads[id] }))
    .filter((entry): entry is { id: Sf2EntityId; thread: Sf2Thread } => Boolean(entry.thread))

  if (anchored.length === 0) return 0

  const values = anchored.map((entry) => threadContribution(entry.thread))

  switch (engine.aggregation) {
    case 'average':
      return clampRound(values.reduce((sum, v) => sum + v, 0) / values.length)
    case 'weighted': {
      const primaryIndex = engine.primaryThreadId
        ? Math.max(0, anchored.findIndex((entry) => entry.id === engine.primaryThreadId))
        : 0
      const primary = values[primaryIndex] ?? 0
      const rest = values.filter((_, i) => i !== primaryIndex)
      const restAvg = rest.length > 0 ? rest.reduce((sum, v) => sum + v, 0) / rest.length : 0
      return clampRound(0.6 * primary + 0.4 * restAvg)
    }
    case 'max':
    default:
      return clampRound(Math.max(...values))
  }
}

export function threadContribution(thread: Sf2Thread): Sf2Tension {
  const peak = thread.peakTension ?? thread.tension
  switch (thread.status) {
    case 'active':
      return clampFloor(thread.tension * CONTRIBUTION_MULTIPLIERS.active)
    case 'deferred':
      return clampFloor(thread.tension * CONTRIBUTION_MULTIPLIERS.deferred)
    case 'resolved_clean':
      return 0
    case 'resolved_costly':
      return clampFloor(peak * CONTRIBUTION_MULTIPLIERS.resolved_costly)
    case 'resolved_failure':
      return clampFloor(peak * CONTRIBUTION_MULTIPLIERS.resolved_failure)
    case 'resolved_catastrophic':
      return clampFloor(peak * CONTRIBUTION_MULTIPLIERS.resolved_catastrophic)
    case 'abandoned':
      return clampFloor(peak * CONTRIBUTION_MULTIPLIERS.abandoned)
  }
}

// Cool a non-new thread for chapter open. Caller routes new threads through
// `newThreadOpening` instead — this helper only handles carried-over threads.
export function coolThreadForChapterOpen(
  thread: Sf2Thread,
  role: Exclude<ThreadRole, 'new'>,
  engineFloor: number
): { openingFloor: number; cooledAtOpen: boolean } {
  const cooling = COOLING_BY_ROLE[role]
  const decayed = Math.max(0, thread.tension - cooling)
  const engineMin = Math.max(0, engineFloor)
  const openingFloor = clampRange(Math.max(decayed, engineMin), 0, CHAPTER_OPEN_CAP)
  return { openingFloor, cooledAtOpen: openingFloor < thread.tension }
}

export function initializeChapterPressure(
  prevState: Sf2State,
  chapterSetup: Sf2ChapterSetupRuntimeState,
  priorActiveThreadIds: Sf2EntityId[]
): Record<Sf2EntityId, Sf2ChapterThreadPressure> {
  const priorActiveSet = new Set(priorActiveThreadIds)
  const pressure: Record<Sf2EntityId, Sf2ChapterThreadPressure> = {}

  for (const threadId of chapterSetup.activeThreadIds) {
    const thread = prevState.campaign.threads[threadId]
    if (!thread) continue
    if (thread.status.startsWith('resolved_')) continue

    const role = determineThreadRole(threadId, thread, chapterSetup, priorActiveSet)
    const { openingFloor, cooledAtOpen } = role === 'new'
      ? newThreadOpening(threadId, chapterSetup)
      : coolThreadForChapterOpen(thread, role, engineFloorForThread(prevState, threadId))
    pressure[threadId] = {
      threadId,
      role,
      openingFloor,
      localEscalation: 0,
      maxThisChapter: openingFloor,
      cooledAtOpen,
    }
  }

  return pressure
}

export function getEffectiveThreadPressure(
  threadId: Sf2EntityId,
  chapterSetup: Sf2ChapterSetupRuntimeState
): number {
  const entry = chapterSetup.threadPressure[threadId]
  if (!entry) return 0
  return clampRange(entry.openingFloor + entry.localEscalation, 0, 10)
}

function determineThreadRole(
  threadId: Sf2EntityId,
  thread: Sf2Thread,
  chapterSetup: Sf2ChapterSetupRuntimeState,
  priorActiveIds: Set<Sf2EntityId>
): ThreadRole {
  if (thread.chapterCreated === chapterSetup.chapter) return 'new'
  if (chapterSetup.spineThreadId === threadId) return 'spine'
  if (chapterSetup.loadBearingThreadIds.includes(threadId)) return 'load_bearing'
  if (thread.status === 'deferred') return 'deferred'
  if (priorActiveIds.has(threadId)) return 'active'
  return 'background'
}

function engineFloorForThread(state: Sf2State, threadId: Sf2EntityId): number {
  const values = Object.values(state.campaign.engines ?? {})
    .filter((engine) => engine.status === 'active' && engine.anchorThreadIds.includes(threadId))
    .map((engine) => deriveEngineValue(engine, state.campaign.threads))
  if (values.length === 0) return 0
  return Math.max(0, Math.max(...values) - 2)
}

function newThreadOpening(
  threadId: Sf2EntityId,
  chapterSetup: Sf2ChapterSetupRuntimeState
): { openingFloor: number; cooledAtOpen: boolean } {
  const override = chapterSetup.threadInitialTensions?.[threadId]
  if (typeof override === 'number' && Number.isFinite(override)) {
    const rounded = Math.round(override)
    const clamped = clampRange(rounded, 0, CHAPTER_OPEN_CAP)
    if (clamped !== rounded) {
      console.warn('[sf2/pressure] threadInitialTensions override clamped', {
        threadId,
        requested: override,
        applied: clamped,
        cap: CHAPTER_OPEN_CAP,
      })
    }
    return { openingFloor: clamped, cooledAtOpen: false }
  }
  const role: Exclude<ThreadRole, 'new'> = chapterSetup.spineThreadId === threadId
    ? 'spine'
    : chapterSetup.loadBearingThreadIds.includes(threadId)
      ? 'load_bearing'
      : 'active'
  return { openingFloor: NEW_THREAD_INITIAL_TENSION_BY_ROLE[role], cooledAtOpen: false }
}

function clampFloor(value: number): Sf2Tension {
  return clampRange(Math.floor(value), 0, 10)
}

function clampRound(value: number): Sf2Tension {
  return clampRange(Math.round(value), 0, 10)
}

function clampRange(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
