import { isThreadResolved, isThreadTerminal } from '../thread-lifecycle'
import type { Sf2State, Sf2Thread, Sf2ThreadStatus } from '../types'

export interface Sf2ObjectiveGateRead {
  chapterTurnCount: number
  foregroundThreadId?: string
  foregroundThreadTitle?: string
  foregroundStatus?: Sf2ThreadStatus
  foregroundAnswered: boolean
  foregroundOutcome: 'active' | 'resolved' | 'failed' | 'deferred'
  shouldCloseOrReframe: boolean
  reframeCandidate?: {
    threadId: string
    title: string
    reason: string
  }
  directive?: string
}

const MIN_OBJECTIVE_CLOSE_OR_REFRAME_TURNS = 5

export function readSf2ObjectiveGate(state: Sf2State): Sf2ObjectiveGateRead {
  const chapterTurnCount = state.history.turns.filter(
    (turn) => turn.chapter === state.meta.currentChapter
  ).length
  const foregroundThread = selectForegroundThread(state)
  const foregroundStatus = foregroundThread?.status
  const foregroundAnswered = Boolean(
    foregroundStatus && (isThreadTerminal(foregroundStatus) || foregroundStatus === 'deferred')
  )
  const reframeCandidate = foregroundAnswered
    ? selectReframeCandidate(state, foregroundThread?.id)
    : undefined
  const foregroundOutcome = foregroundStatus ? outcomeForStatus(foregroundStatus) : 'active'
  const shouldCloseOrReframe =
    foregroundAnswered && chapterTurnCount >= MIN_OBJECTIVE_CLOSE_OR_REFRAME_TURNS

  const directive = shouldCloseOrReframe
    ? reframeCandidate
      ? `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" is ${foregroundOutcome}; close this chapter or explicitly reframe around "${reframeCandidate.title}" instead of extending the old question.`
      : `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" is ${foregroundOutcome}; move toward chapter close instead of adding runway.`
    : foregroundAnswered && reframeCandidate
      ? `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" resolved very early; make the new dominant pressure "${reframeCandidate.title}" explicit before close.`
      : foregroundAnswered
        ? `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" resolved very early; establish successor pressure or an explicit immediate-close reason before extending the old question.`
        : undefined

  return {
    chapterTurnCount,
    foregroundThreadId: foregroundThread?.id,
    foregroundThreadTitle: foregroundThread?.title,
    foregroundStatus,
    foregroundAnswered,
    foregroundOutcome,
    shouldCloseOrReframe,
    reframeCandidate,
    directive,
  }
}

function selectForegroundThread(state: Sf2State): Sf2Thread | undefined {
  return state.chapter.setup.spineThreadId
    ? state.campaign.threads[state.chapter.setup.spineThreadId]
    : undefined
}

function outcomeForStatus(status: Sf2ThreadStatus): Sf2ObjectiveGateRead['foregroundOutcome'] {
  if (status === 'resolved_clean' || status === 'resolved_costly') return 'resolved'
  if (status === 'deferred') return 'deferred'
  if (isThreadTerminal(status) || isThreadResolved(status)) return 'failed'
  return 'active'
}

function selectReframeCandidate(
  state: Sf2State,
  previousThreadId: string | undefined
): Sf2ObjectiveGateRead['reframeCandidate'] {
  const active = Object.values(state.campaign.threads)
    .filter((thread) =>
      thread.status === 'active' &&
      thread.id !== previousThreadId &&
      (
        thread.loadBearing ||
        state.chapter.setup.loadBearingThreadIds.includes(thread.id) ||
        state.chapter.setup.activeThreadIds.includes(thread.id)
      )
    )
    .sort(compareReframeThreads)

  const candidate = active[0]
  if (!candidate) return undefined
  return {
    threadId: candidate.id,
    title: candidate.title,
    reason: reframeReason(candidate),
  }
}

function compareReframeThreads(a: Sf2Thread, b: Sf2Thread): number {
  const driver = driverScore(b) - driverScore(a)
  if (driver !== 0) return driver
  const loadBearing = Number(b.loadBearing) - Number(a.loadBearing)
  if (loadBearing !== 0) return loadBearing
  const spine = Number(Boolean(b.spineForChapter)) - Number(Boolean(a.spineForChapter))
  if (spine !== 0) return spine
  return b.tension - a.tension
}

function driverScore(thread: Sf2Thread): number {
  if (thread.chapterDriverKind === 'successor') return 3
  if (thread.chapterDriverKind === 'arc_promoted') return 3
  if (thread.chapterDriverKind === 'new_pressure') return 2
  return 1
}

function reframeReason(thread: Sf2Thread): string {
  const role = thread.chapterDriverKind ? `${thread.chapterDriverKind} pressure` : 'unresolved pressure'
  return `${role}; tension ${thread.tension}/10; ${thread.retrievalCue}`
}
