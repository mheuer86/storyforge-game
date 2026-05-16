import type { ScanDisplayOutputOptions } from '../sentinel/display'
import { buildSceneKernel } from '../scene-kernel/build'
import type { Sf2State } from '../types'

export function buildNarratorSentinelContext(state: Sf2State): ScanDisplayOutputOptions {
  const kernel = buildSceneKernel(state)
  return {
    action: 'allow_but_quarantine_writes',
    campaign: state.campaign,
    locationContinuity: {
      recentSceneText: buildLocationContinuityText(state),
    },
    absentSpeakers: {
      absentEntityIds: kernel.absentEntityIds,
      aliasMap: kernel.aliasMap,
    },
  }
}

function buildLocationContinuityText(state: Sf2State): string {
  return [
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...(state.world.sceneSnapshot?.established ?? []),
    ...(state.chapter.sceneSummaries ?? []).slice(-2).map((s) => s.summary),
  ].join(' ')
}
