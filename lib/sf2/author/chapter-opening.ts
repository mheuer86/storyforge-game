import { applyLatentArcQuestionChapterOpen } from '../arc-questions'
import { chapterPressureRuntime } from '../pressure/runtime'
import type {
  AuthorChapterSetupV2,
  Sf2ChapterNumber,
  Sf2State,
  Sf2ThreadStatus,
} from '../types'
import { applyAuthoredToCampaign } from './hydrate'

export type Sf2ChapterOpeningPhase = 'chapter_1' | 'continuation'

export interface ApplyAuthorChapterOpeningInput {
  state: Sf2State
  phase: Sf2ChapterOpeningPhase
  authorResult: {
    chapter: number
    runtimeState: Sf2State['chapter']['setup']
    scaffolding: Sf2State['chapter']['scaffolding']
    openingSeed: Sf2State['chapter']['artifacts']['opening']
    authored: AuthorChapterSetupV2
    threadTransitions?: Array<{
      id: string
      toStatus: Sf2ThreadStatus
      reason: string
    }>
  }
}

export interface ApplyAuthorChapterOpeningResult {
  nextState: Sf2State
  telemetry: {
    chapter: number
    title: string
    activeThreadCount: number
    pressureLadderCount: number
  }
  debugSummary: {
    chapter: number
    title: string
    npcCount: number
    threadCount: number
    ladderSteps: number
    threadTransitions: ApplyAuthorChapterOpeningInput['authorResult']['threadTransitions']
    chapterFunction?: string
    pacing?: NonNullable<Sf2State['chapter']['setup']['pacingContract']>['targetTurns']
  }
}

export function applyAuthorChapterOpening(
  input: ApplyAuthorChapterOpeningInput
): ApplyAuthorChapterOpeningResult {
  const { authorResult, phase } = input
  const next: Sf2State = structuredClone(input.state)
  const chapter = authorResult.chapter
  const sceneId = `scene_${chapter}_1`

  const priorActiveThreadIds = next.chapter?.setup.activeThreadIds ?? []

  if (phase === 'continuation') {
    for (const transition of authorResult.threadTransitions ?? []) {
      const thread = next.campaign.threads[transition.id]
      if (!thread) continue
      thread.status = transition.toStatus
      thread.lastAdvancedTurn = next.history.turns.length
    }
  }

  next.meta.currentChapter = chapter
  next.meta.currentSceneId = sceneId
  next.chapter = {
    number: chapter as Sf2ChapterNumber,
    title: authorResult.runtimeState.title,
    setup: authorResult.runtimeState,
    scaffolding: authorResult.scaffolding,
    artifacts: { opening: authorResult.openingSeed },
    sceneSummaries: [],
    currentSceneId: sceneId,
  }

  applyAuthoredToCampaign(
    next,
    authorResult.authored,
    chapter as Sf2ChapterNumber,
    authorResult.runtimeState.loadBearingThreadIds
  )
  applyLatentArcQuestionChapterOpen(
    next,
    chapter,
    authorResult.runtimeState.arcLink?.promotedLatentQuestionIds ?? []
  )
  next.chapter.setup = chapterPressureRuntime.prepareChapterOpen(
    next,
    next.chapter.setup,
    priorActiveThreadIds
  )

  const atmos = authorResult.runtimeState.openingSceneSpec.atmosphericCondition ?? ''
  const derivedTimeLabel = phase === 'continuation'
    ? atmos.split(/[.;]/)[0].trim().slice(0, 80)
    : ''

  if (phase === 'continuation') {
    next.world.currentTimeLabel = derivedTimeLabel
    next.meta.currentTimeLabel = derivedTimeLabel
  }

  next.world.currentLocation = {
    id: phase === 'continuation' ? `loc_ch${chapter}_opening` : 'loc_opening',
    name:
      phase === 'continuation'
        ? authorResult.runtimeState.openingSceneSpec.location || next.world.currentLocation.name
        : authorResult.runtimeState.openingSceneSpec.location,
    description: authorResult.runtimeState.openingSceneSpec.initialState || '',
    atmosphericConditions:
      phase === 'continuation'
        ? (atmos ? [atmos] : undefined)
        : [authorResult.runtimeState.openingSceneSpec.atmosphericCondition],
    chapterCreated: chapter,
  }
  next.campaign.locations[next.world.currentLocation.id] = next.world.currentLocation
  next.world.sceneSnapshot = {
    sceneId,
    location: next.world.currentLocation,
    presentNpcIds: authorResult.openingSeed.visibleNpcIds.filter((id) => next.campaign.npcs[id]),
    timeLabel: derivedTimeLabel,
    established:
      phase === 'continuation'
        ? [`Chapter ${chapter} opens.`, authorResult.runtimeState.openingSceneSpec.initialState]
        : [authorResult.runtimeState.openingSceneSpec.initialState],
    firstTurnIndex: next.history.turns.length,
  }

  if (phase === 'continuation') {
    next.world.sceneBundleCache = undefined
  }

  next.meta.updatedAt = new Date().toISOString()

  const telemetry = {
    chapter,
    title: authorResult.runtimeState.title,
    activeThreadCount: authorResult.runtimeState.activeThreadIds.length,
    pressureLadderCount: authorResult.runtimeState.pressureLadder.length,
  }

  return {
    nextState: next,
    telemetry,
    debugSummary: {
      chapter,
      title: authorResult.runtimeState.title,
      npcCount: authorResult.runtimeState.startingNpcIds.length,
      threadCount: authorResult.runtimeState.activeThreadIds.length,
      ladderSteps: authorResult.runtimeState.pressureLadder.length,
      threadTransitions: authorResult.threadTransitions ?? [],
      chapterFunction: authorResult.runtimeState.arcLink?.chapterFunction,
      pacing: authorResult.runtimeState.pacingContract?.targetTurns,
    },
  }
}
