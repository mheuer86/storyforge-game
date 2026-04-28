import type { Sf2State, Sf2Thread } from './types'

const CLOSE_TERMINAL_THREAD_STATUSES = new Set<Sf2Thread['status']>([
  'resolved_clean',
  'resolved_costly',
  'resolved_failure',
  'resolved_catastrophic',
  'abandoned',
])

export interface ChapterCloseReadiness {
  closeReady: boolean
  chapterTurnCount: number
  spineResolved: boolean
  stalledFallback: boolean
  ladderFiredCount: number
  ladderStepCount: number
  spineStatus?: Sf2Thread['status']
  spineTension?: number
}

export function computeChapterCloseReadiness(
  state: Sf2State,
  pivotSignaled: boolean
): ChapterCloseReadiness {
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
  const stalledFallback =
    chapterTurnCount >= 25 && halfLadderFired && (spineThread?.tension ?? 0) >= 8

  return {
    closeReady: pivotSignaled || spineResolved || stalledFallback,
    chapterTurnCount,
    spineResolved,
    stalledFallback,
    ladderFiredCount,
    ladderStepCount: ladderSteps.length,
    spineStatus: spineThread?.status,
    spineTension: spineThread?.tension,
  }
}
