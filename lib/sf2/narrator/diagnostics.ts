import { computePacingAdvisory } from '../pacing/signals'
import type { Sf2WorkingSet } from '../types'
import type {
  Sf2NarratorPacingEventPayload,
  Sf2NarratorWorkingSetEventPayload,
} from './turn-context'

export function buildEmptyNarratorDiagnostics() {
  return {
    workingSet: null,
    sceneBundleBuilt: null,
    pacingAdvisory: null,
    proseFirstCloseLoop: null,
  }
}

export function buildWorkingSetEventPayload(workingSet: Sf2WorkingSet): Sf2NarratorWorkingSetEventPayload | null {
  if (workingSet.fullEntityIds.length === 0 && workingSet.stubEntityIds.length === 0) {
    return null
  }
  return {
    summary: {
      full: workingSet.fullEntityIds,
      stub: workingSet.stubEntityIds,
      excluded: workingSet.excludedEntityIds.length,
      reasons: workingSet.reasonsByEntityId,
    },
    workingSet,
  }
}

export function buildPacingEventPayload(
  pacing: ReturnType<typeof computePacingAdvisory>
): Sf2NarratorPacingEventPayload {
  return {
    tripped:
      pacing.reactivityTripped ||
      pacing.sceneLinkTripped ||
      pacing.stagnantThreadIds.length > 0 ||
      pacing.arcDormantIds.length > 0,
    reactivityRatio: pacing.reactivityRatio,
    reactivityTripped: pacing.reactivityTripped,
    sceneLinkTripped: pacing.sceneLinkTripped,
    stagnantThreadIds: pacing.stagnantThreadIds,
    arcDormantIds: pacing.arcDormantIds,
    recommendedTempoMode: pacing.recommendedTempoMode,
    requiredDelta: pacing.requiredDelta,
    forbiddenRepeat: pacing.forbiddenRepeat,
  }
}
