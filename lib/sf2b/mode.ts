export const SF2B_EXPERIMENT_MODE = 'sf2b-hook' as const
export const SF2B_CAMPAIGN_ID_PREFIX = 'sf2b_camp_' as const
export const SF2B_LAST_CAMPAIGN_KEY = 'sf2b_last_campaign_id' as const
export const SF2B_DEFAULT_SEED_ID = 'space-opera/human/operative/forty-thousand' as const

export type Sf2bExperimentMode = typeof SF2B_EXPERIMENT_MODE
export type Sf2RuntimeMode = 'sf2' | 'sf2b'

export interface Sf2bModeMarker {
  experimentMode?: Sf2bExperimentMode | string
  mode?: Sf2bExperimentMode | string
  meta?: {
    campaignId?: string
    experimentMode?: Sf2bExperimentMode | string
    mode?: Sf2bExperimentMode | string
    seedId?: string
  }
}

export type Sf2bRequestPayload<T extends Record<string, unknown> = Record<string, unknown>> =
  T & {
    experimentMode: Sf2bExperimentMode
    sf2b: true
  }

export function isSf2bState(state: unknown): state is Sf2bModeMarker {
  if (!state || typeof state !== 'object') return false

  const marker = state as Sf2bModeMarker
  const campaignId = marker.meta?.campaignId

  return (
    marker.experimentMode === SF2B_EXPERIMENT_MODE ||
    marker.mode === SF2B_EXPERIMENT_MODE ||
    marker.meta?.experimentMode === SF2B_EXPERIMENT_MODE ||
    marker.meta?.mode === SF2B_EXPERIMENT_MODE ||
    (typeof campaignId === 'string' && campaignId.startsWith(SF2B_CAMPAIGN_ID_PREFIX))
  )
}

export function runtimeModeForState(state: unknown): Sf2RuntimeMode {
  return isSf2bState(state) ? 'sf2b' : 'sf2'
}

export function makeSf2bCampaignId(now: Date | number | string = new Date()): string {
  const date = now instanceof Date ? now : new Date(now)
  const stamp = Number.isNaN(date.getTime())
    ? new Date().toISOString()
    : date.toISOString()
  return `${SF2B_CAMPAIGN_ID_PREFIX}${stamp.replace(/[-:.TZ]/g, '').slice(0, 17)}`
}

export function sf2bRequestPayload<T extends Record<string, unknown>>(
  payload: T
): Sf2bRequestPayload<T> {
  return {
    ...payload,
    experimentMode: SF2B_EXPERIMENT_MODE,
    sf2b: true,
  }
}
