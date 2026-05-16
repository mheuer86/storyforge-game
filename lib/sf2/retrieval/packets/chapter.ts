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
  const activeArcThreads = renderChapterArcThreadLinks(state)

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

function renderChapterArcThreadLinks(state: Sf2State): string[] {
  const setup = state.chapter.setup
  const links = setup.arcLink?.threadLinks ?? []
  if (links.length > 0) {
    return links.map((link) => {
      const activeThread = state.campaign.threads?.[link.activeThreadId]
      const arcThread = state.campaign.threads?.[link.arcThreadId]
      const activeLabel = activeThread
        ? `${activeThread.title} ${activeThread.tension}/10`
        : link.activeThreadId
      const arcLabel = arcThread?.title ?? link.arcThreadId
      const cue = activeThread?.retrievalCue ? `: ${activeThread.retrievalCue}` : ''
      return `${activeLabel} -> ${arcLabel} (${link.relation})${cue}`
    })
  }

  return (setup.arcLink?.arcThreadIds ?? [])
    .map((id) => state.campaign.threads?.[id])
    .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread))
    .filter((thread) => thread.status === 'active')
    .map((thread) => `${thread.title} ${thread.tension}/10: ${thread.retrievalCue}`)
}
