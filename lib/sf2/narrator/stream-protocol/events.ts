import type { Sf2LatencyPayload } from '@/lib/sf2/instrumentation/latency'
import type { Sf2NarrativeTempoMode, Sf2WorkingSet } from '@/lib/sf2/types'

export type Sf2NarratorRollModifierType = 'advantage' | 'disadvantage' | 'challenge'

export type Sf2NarratorRollGateAction = 'none' | 'request_roll' | 'block_narrate_turn'

export type Sf2NarratorRollGateRepair =
  | 'not_needed'
  | 'narrator_complied'
  | 'blocked_missing_request_roll'
  | 'missed_expected_roll_allowed'
  | 'hard_gate_missing_request_roll'

export interface Sf2NarratorTextEvent {
  type: 'text'
  content: string
}

export interface Sf2NarratorNarrateTurnEvent {
  type: 'narrate_turn'
  input: Record<string, unknown>
}

export interface Sf2NarratorRollPromptEvent {
  type: 'roll_prompt'
  toolUseId: string
  skill: string
  requestedSkill?: string
  intendedSkills?: string[]
  skillOverrideReason?: string
  dc: number
  why: string
  consequenceOnFail: string
  modifierType?: Sf2NarratorRollModifierType
  modifierReason?: string
  priorMessages: unknown[]
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

export interface Sf2NarratorWorkingSetEvent {
  type: 'working_set'
  summary: {
    full: string[]
    stub: string[]
    excluded: number
    reasons: Record<string, string[]>
  }
  workingSet: Sf2WorkingSet | null
}

export interface Sf2NarratorPacingAdvisoryEvent {
  type: 'pacing_advisory'
  tripped: boolean
  reactivityRatio: number
  reactivityTripped: boolean
  sceneLinkTripped: boolean
  stagnantThreadIds: string[]
  arcDormantIds: string[]
  recommendedTempoMode?: Sf2NarrativeTempoMode
  requiredDelta?: string
  forbiddenRepeat?: string
}

export interface Sf2NarratorSceneBundleBuiltEvent {
  type: 'scene_bundle_built'
  sceneId: string
  bundleText: string
  builtAtTurn: number
}

export interface Sf2NarratorTokenUsageEvent {
  type: 'token_usage'
  usage: {
    model: string
    inputTokens: number
    outputTokens: number
    cacheWriteTokens: number
    cacheReadTokens: number
  }
}

export interface Sf2NarratorLatencyEvent {
  type: 'latency'
  role: 'narrator'
  latency: Sf2LatencyPayload
}

export interface Sf2NarratorTruncationWarningEvent {
  type: 'truncation_warning'
  outputTokens: number
}

export interface Sf2NarratorRollGateDiagnosticEvent {
  type: 'roll_gate_diagnostic'
  required: boolean
  binding?: string
  source?: string
  kind?: string
  skills?: string[]
  reason?: string
  sourceId?: string
  action: Sf2NarratorRollGateAction
  repair?: Sf2NarratorRollGateRepair
}

export interface Sf2NarratorTempoDiagnosticEvent {
  type: 'tempo_diagnostic'
  recommendedTempoMode: Sf2NarrativeTempoMode
  chosenTempoMode?: Sf2NarrativeTempoMode
  matched: boolean
  reason: string
  remedy: string
  requiredDelta?: string
  forbiddenRepeat?: string
  sceneExhausted?: boolean
  broadGoal?: boolean
}

export interface Sf2NarratorDisplaySentinelFinding {
  type: string
  severity: string
  surface?: string
  entityId?: string
  evidence: string
  matchStart: number
  matchEnd?: number
  recommendedAction: string
}

export interface Sf2NarratorDisplaySentinelEvent {
  type: 'display_sentinel'
  mode: string
  repaired: boolean
  repairedProse?: string
  findings: Sf2NarratorDisplaySentinelFinding[]
}

export interface Sf2NarratorMetaObservedEvent {
  type: 'narrator_meta_observed'
  pattern: string
  snippet: string
  turnIndex: number
}

export interface Sf2NarratorOutputRecoveredEvent {
  type: 'narrator_output_recovered'
  recoveryNotes: string[]
  turnIndex: number
}

export interface Sf2NarratorErrorEvent {
  type: 'error'
  message: string
}

export interface Sf2NarratorDoneEvent {
  type: 'done'
}

export type Sf2NarratorStreamEvent =
  | Sf2NarratorTextEvent
  | Sf2NarratorNarrateTurnEvent
  | Sf2NarratorRollPromptEvent
  | Sf2NarratorWorkingSetEvent
  | Sf2NarratorPacingAdvisoryEvent
  | Sf2NarratorSceneBundleBuiltEvent
  | Sf2NarratorTokenUsageEvent
  | Sf2NarratorLatencyEvent
  | Sf2NarratorTruncationWarningEvent
  | Sf2NarratorRollGateDiagnosticEvent
  | Sf2NarratorTempoDiagnosticEvent
  | Sf2NarratorDisplaySentinelEvent
  | Sf2NarratorMetaObservedEvent
  | Sf2NarratorOutputRecoveredEvent
  | Sf2NarratorErrorEvent
  | Sf2NarratorDoneEvent

export function isRollPromptEvent(
  event: Sf2NarratorStreamEvent
): event is Sf2NarratorRollPromptEvent {
  return event.type === 'roll_prompt'
}
