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
  const pressureEngineIds = setup.arcLink?.pressureEngineIds ?? []
  const runtimeEngines = Object.values(state.campaign.engines ?? {})
  const activePressureEngines = (pressureEngineIds.length > 0
    ? pressureEngineIds
        .map((id) => state.campaign.engines?.[id])
        .filter((e): e is NonNullable<typeof e> => Boolean(e))
    : runtimeEngines.slice(0, 2)
  ).map((e) => {
    const anchors = e.anchorThreadIds.length > 0 ? `; anchors: ${e.anchorThreadIds.join(', ')}` : ''
    const status = e.status !== 'active' ? `; status: ${e.status}` : ''
    return `${e.name} ${e.value}/10: ${e.visibleSymptoms}${anchors}${status}`
  })

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
          activePressureEngines,
        }
      : undefined,
    pacingContract: setup.pacingContract,
  }
}
