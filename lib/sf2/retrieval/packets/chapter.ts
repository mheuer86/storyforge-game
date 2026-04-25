import type { Sf2ChapterPacket, Sf2State } from '../../types'

export function buildChapterPacket(state: Sf2State): Sf2ChapterPacket {
  const setup = state.chapter.setup
  const face = setup.antagonistField.currentPrimaryFace
  const currentStep = setup.pressureLadder.find((s) => !s.fired)

  return {
    objective: setup.frame.objective,
    crucible: setup.frame.crucible,
    spineThreadId: setup.spineThreadId,
    loadBearingThreadIds: setup.loadBearingThreadIds,
    currentPressureFace: face ? `${face.name} (${face.role}) — ${face.pressureStyle}` : null,
    currentPressureStep: currentStep
      ? { pressure: currentStep.pressure, narrativeEffect: currentStep.narrativeEffect }
      : undefined,
  }
}
