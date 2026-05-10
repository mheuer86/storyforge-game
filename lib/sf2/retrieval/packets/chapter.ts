import type { Sf2ChapterPacket, Sf2State } from '../../types'

export function buildChapterPacket(state: Sf2State): Sf2ChapterPacket {
  const setup = state.chapter.setup
  const face = setup.antagonistField.currentPrimaryFace
  const currentStep = setup.pressureLadder.find((s) => !s.fired)
  const firedPressureSteps = setup.pressureLadder
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => step.fired && step.firedAtTurn !== undefined)
    .sort((a, b) => (a.step.firedAtTurn ?? 0) - (b.step.firedAtTurn ?? 0))
    .map(({ step, index }) => ({
      step: index + 1,
      firedAtTurn: step.firedAtTurn ?? 0,
      pressure: step.pressure,
    }))
  const arc = state.campaign.arcPlan
  const arcThreadIds = setup.arcLink?.arcThreadIds ?? []
  const activeArcThreads = arcThreadIds
    .map((id) => state.campaign.threads?.[id])
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread))
    .filter((thread) => thread.status === 'active')
    .map((thread) => `${thread.title} ${thread.tension}/10: ${thread.retrievalCue}`)

  return {
    objective: setup.frame.objective,
    crucible: setup.frame.crucible,
    spineThreadId: setup.spineThreadId,
    loadBearingThreadIds: setup.loadBearingThreadIds,
    currentPressureFace: face ? `${face.name} (${face.role}) — ${face.pressureStyle}` : null,
    currentPressureStep: currentStep
      ? { pressure: currentStep.pressure, narrativeEffect: currentStep.narrativeEffect }
      : undefined,
    firedPressureSteps,
    arc: arc
      ? {
          title: arc.title,
          scenario: `${arc.scenarioShape.mode}: ${arc.scenarioShape.premise}`,
          question: arc.arcQuestion,
          chapterFunction: setup.arcLink?.chapterFunction,
          activeArcThreads,
        }
      : undefined,
    pacingContract: setup.pacingContract,
    continuationDramaticTurn: setup.continuationDramaticTurn,
    humanStakes: setup.humanStakes ?? [],
  }
}
