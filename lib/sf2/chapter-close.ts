import type { Sf2State, Sf2Thread } from './types'

const MIN_CLOSE_TURN = 18

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
  successorRequired: boolean
  ladderFiredCount: number
  ladderStepCount: number
  spineStatus?: Sf2Thread['status']
  spineTension?: number
  promotedSpineThreadId?: string
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
  let promotedSpineThreadId: string | undefined
  let successorRequired = false

  if (spineThread && spineResolved && chapterTurnCount < MIN_CLOSE_TURN) {
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
    chapterTurnCount >= MIN_CLOSE_TURN &&
    (pivotSignaled || spineResolvedAfterPromotion || stalledFallback)

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

  // Mid-chapter successors can be introduced by the Archivist before the
  // chapter runtime list catches up. If every authored load-bearing thread
  // has already landed, prefer the most pressured active thread over leaving
  // the UI stuck on "successor required" forever.
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
