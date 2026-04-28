import type { Sf2EngineAggregation, ThreadRole } from '../types'

export const CHAPTER_OPEN_CAP = 8

export const COOLING_BY_ROLE: Record<ThreadRole, number> = {
  spine: 0,
  load_bearing: 1,
  active: 2,
  deferred: 3,
  background: 4,
  new: 0,
}

export const NEW_THREAD_INITIAL_TENSION_BY_ROLE: Record<ThreadRole, number> = {
  spine: 6,
  load_bearing: 5,
  active: 4,
  deferred: 2,
  background: 2,
  new: 4,
}

export const ENGINE_AGGREGATION_DEFAULT: Sf2EngineAggregation = 'max'

export const REHEAT = {
  PLAYER_ENGAGEMENT_FLOOR: 2,
  NPC_AGENDA_STANDARD: 1,
  NPC_AGENDA_MAJOR: 2,
  LADDER_FIRE_STANDARD: 2,
  LADDER_FIRE_HARD: 3,
} as const

export const CONTRIBUTION_MULTIPLIERS = {
  active: 1.0,
  deferred: 0.5,
  resolved_clean: 0.0,
  resolved_costly: 0.5,
  resolved_failure: 1.0,
  resolved_catastrophic: 1.0,
  abandoned: 0.3,
} as const

