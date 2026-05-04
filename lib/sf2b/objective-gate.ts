import type { Sf2ChapterTensionScoreLine, Sf2State, Sf2Thread, Sf2ThreadStatus } from '../sf2/types'

const TERMINAL_STATUSES = new Set<Sf2ThreadStatus>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
  'deferred',
])

const SUCCESS_STATUSES = new Set<Sf2ThreadStatus>([
  'resolved_clean',
  'resolved_costly',
])

const FAILURE_STATUSES = new Set<Sf2ThreadStatus>([
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
])

export interface Sf2bObjectiveGateRead {
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

export function readSf2bObjectiveGate(state: Sf2State): Sf2bObjectiveGateRead {
  const chapterTurnCount = state.history.turns.filter(
    (turn) => turn.chapter === state.meta.currentChapter
  ).length
  const foregroundThread = selectForegroundThread(state)
  const foregroundStatus = foregroundThread?.status
  const foregroundAnswered = Boolean(foregroundStatus && TERMINAL_STATUSES.has(foregroundStatus))
  const reframeCandidate = foregroundAnswered
    ? selectReframeCandidate(state, foregroundThread?.id, state.chapter.setup.tensionScore)
    : undefined
  const foregroundOutcome = foregroundStatus ? outcomeForStatus(foregroundStatus) : 'active'
  const shouldCloseOrReframe = foregroundAnswered && chapterTurnCount >= 10

  const directive = shouldCloseOrReframe
    ? reframeCandidate
      ? `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" is ${foregroundOutcome}; close this chapter or explicitly reframe around "${reframeCandidate.title}" instead of extending the old question.`
      : `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" is ${foregroundOutcome}; move toward chapter close instead of adding runway.`
    : foregroundAnswered && reframeCandidate
      ? `Foreground objective "${foregroundThread?.title ?? 'chapter objective'}" resolved very early; make the new dominant pressure "${reframeCandidate.title}" explicit before close.`
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
  const scoreThreadId = state.chapter.setup.tensionScore?.find(
    (line) => line.role === 'foreground_objective' && line.sourceThreadId
  )?.sourceThreadId
  if (scoreThreadId && state.campaign.threads[scoreThreadId]) {
    return state.campaign.threads[scoreThreadId]
  }
  return state.chapter.setup.spineThreadId
    ? state.campaign.threads[state.chapter.setup.spineThreadId]
    : undefined
}

function outcomeForStatus(status: Sf2ThreadStatus): Sf2bObjectiveGateRead['foregroundOutcome'] {
  if (SUCCESS_STATUSES.has(status)) return 'resolved'
  if (FAILURE_STATUSES.has(status)) return 'failed'
  if (status === 'deferred') return 'deferred'
  return 'active'
}

function selectReframeCandidate(
  state: Sf2State,
  previousThreadId: string | undefined,
  tensionScore: Sf2ChapterTensionScoreLine[] | undefined
): Sf2bObjectiveGateRead['reframeCandidate'] {
  const scoreByThreadId = new Map(
    (tensionScore ?? [])
      .filter((line) => line.sourceThreadId && line.role !== 'foreground_objective')
      .map((line) => [line.sourceThreadId as string, tensionRoleScore(line.role)])
  )
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
    .sort((a, b) => compareReframeThreads(a, b, scoreByThreadId))

  const candidate = active[0]
  if (!candidate) return undefined
  return {
    threadId: candidate.id,
    title: candidate.title,
    reason: reframeReason(candidate),
  }
}

function compareReframeThreads(a: Sf2Thread, b: Sf2Thread, scoreByThreadId: Map<string, number>): number {
  const score = (scoreByThreadId.get(b.id) ?? 0) - (scoreByThreadId.get(a.id) ?? 0)
  if (score !== 0) return score
  const driver = driverScore(b) - driverScore(a)
  if (driver !== 0) return driver
  const loadBearing = Number(b.loadBearing) - Number(a.loadBearing)
  if (loadBearing !== 0) return loadBearing
  const spine = Number(Boolean(b.spineForChapter)) - Number(Boolean(a.spineForChapter))
  if (spine !== 0) return spine
  return b.tension - a.tension
}

function tensionRoleScore(role: Sf2ChapterTensionScoreLine['role']): number {
  if (role === 'relational_social_pressure') return 4
  if (role === 'shadow_faction_pressure') return 3
  if (role === 'cargo_system_pressure') return 2
  if (role === 'environmental_pressure') return 1
  return 0
}

function driverScore(thread: Sf2Thread): number {
  if (thread.chapterDriverKind === 'successor') return 3
  if (thread.chapterDriverKind === 'new_pressure') return 2
  return 1
}

function reframeReason(thread: Sf2Thread): string {
  const role = thread.chapterDriverKind ? `${thread.chapterDriverKind} pressure` : 'unresolved pressure'
  return `${role}; tension ${thread.tension}/10; ${thread.retrievalCue}`
}
