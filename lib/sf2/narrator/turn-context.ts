import type Anthropic from '@anthropic-ai/sdk'
import { buildMessagesForNarrator } from './messages'
import type { ScanDisplayOutputOptions } from '../sentinel/display'
import type {
  Sf2NarrativeTempoMode,
  Sf2NarrativeTempoRecommendation,
  Sf2State,
  Sf2WorkingSet,
} from '../types'
import type { Sf2RequiredRollGate } from './roll-gates'
import {
  parseSf2NarratorIntentQueue,
  remainingIntentTexts,
  renderSf2IntentQueueBlock,
  type Sf2NarratorIntentQueue,
  type Sf2NarratorQueuedIntentResume,
} from './intent-queue'
import { buildCachedNarratorTools, buildNarratorSystemBlocks } from './system-blocks'
import { buildRollResumeMessages } from './roll-resume'
import {
  buildEmptyNarratorDiagnostics,
  buildPacingEventPayload,
  buildWorkingSetEventPayload,
} from './diagnostics'
import { buildNarratorSentinelContext } from './sentinel-context'
import { buildReplayMetadata } from './replay-metadata'
import type {
  Sf2RollDiceMode,
  Sf2RollResolutionKind,
  Sf2RollResourceSpend,
  Sf2RollSourceBreakdown,
  Sf2SelectedRollAction,
} from '../types'
export { rollResultMessage } from './roll-result'

export interface Sf2NarratorRollResolution {
  toolUseId: string
  skill: string
  dc: number
  effectiveDc?: number
  d20?: number
  modifier: number
  total: number
  result: 'critical' | 'success' | 'failure' | 'fumble'
  resolutionKind?: Sf2RollResolutionKind
  diceMode?: Sf2RollDiceMode
  criticalRange?: number
  sourceBreakdown?: Sf2RollSourceBreakdown[]
  selectedRollAction?: Sf2SelectedRollAction
  spentResources?: Sf2RollResourceSpend[]
  modifierType?: 'advantage' | 'disadvantage' | 'inspiration' | 'challenge'
  modifierReason?: string
  priorMessages: unknown[]
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

export interface Sf2NarratorWorkingSetEventPayload {
  summary: {
    full: string[]
    stub: string[]
    excluded: number
    reasons: Record<string, string[]>
  }
  workingSet: Sf2WorkingSet
}

export interface Sf2NarratorPacingEventPayload {
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

export interface Sf2NarratorSceneBundleEventPayload {
  sceneId: string
  bundleText: string
  builtAtTurn: number
}

export interface Sf2NarratorTurnContext {
  mode: 'normal' | 'roll_resume'
  system: Anthropic.TextBlockParam[]
  messages: Anthropic.MessageParam[]
  cachedTools: Anthropic.Tool[]
  diagnostics: {
    workingSet: Sf2NarratorWorkingSetEventPayload | null
    sceneBundleBuilt: Sf2NarratorSceneBundleEventPayload | null
    pacingAdvisory: Sf2NarratorPacingEventPayload | null
  }
  sentinelContext: ScanDisplayOutputOptions
  failedRollSkill?: string
  requiredRollGate: Sf2RequiredRollGate | null
  narrativeTempo: Sf2NarrativeTempoRecommendation | null
  intentQueue: Sf2NarratorIntentQueue
  replayMetadata: {
    turnIndex: number
    messageCount: number
    assistantMessageCount: number
    sceneBundleRebuilt: boolean
    workingSetComputed: boolean
  }
}

export function buildNarratorTurnContext(input: {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  rollResolution?: Sf2NarratorRollResolution
}): Sf2NarratorTurnContext {
  const { state, playerInput, isInitial, turnIndex, rollResolution } = input
  const intentQueue = parseSf2NarratorIntentQueue(state, playerInput, rollResolution)
  const system = buildNarratorSystemBlocks(state)
  const cachedTools = buildCachedNarratorTools()
  const sentinelContext = buildNarratorSentinelContext(state)
  const failedRollSkill =
    rollResolution && (rollResolution.result === 'failure' || rollResolution.result === 'fumble')
      ? rollResolution.skill
      : undefined
  const requiredRollGate = isInitial ? null : intentQueue.current.requiredRollGate

  if (rollResolution) {
    const messages = buildRollResumeMessages(state, intentQueue, rollResolution)
    return {
      mode: 'roll_resume',
      system,
      messages,
      cachedTools,
      diagnostics: buildEmptyNarratorDiagnostics(),
      sentinelContext,
      failedRollSkill,
      requiredRollGate,
      narrativeTempo: null,
      intentQueue,
      replayMetadata: buildReplayMetadata('roll_resume', turnIndex, messages, null, null),
    }
  }

  const currentPlayerInput = intentQueue.current.text || playerInput
  const built = buildMessagesForNarrator(state, currentPlayerInput, isInitial, turnIndex)
  const messages = appendIntentQueueBlock(built.messages, renderSf2IntentQueueBlock(intentQueue))
  const beatMode = built.packet.mechanics.beatMode?.mode ?? 'social'

  return {
    mode: 'normal',
    system,
    messages,
    cachedTools,
    diagnostics: {
      workingSet: buildWorkingSetEventPayload(built.workingSet),
      sceneBundleBuilt: built.bundleRebuilt,
      pacingAdvisory: beatMode === 'meta' ? null : buildPacingEventPayload(built.packet.pacing),
    },
    sentinelContext,
    failedRollSkill,
    requiredRollGate,
    narrativeTempo: beatMode === 'meta' ? null : built.packet.narrativeTempo,
    intentQueue,
    replayMetadata: buildReplayMetadata('normal', turnIndex, messages, built.workingSet, built.bundleRebuilt),
  }
}

export function buildSf2RollPromptIntentResume(queue: Sf2NarratorIntentQueue): Sf2NarratorQueuedIntentResume {
  return {
    originalInput: queue.originalInput,
    currentIntent: queue.current.text,
    remainingIntents: remainingIntentTexts(queue),
  }
}

function appendIntentQueueBlock(messages: Anthropic.MessageParam[], block: string): Anthropic.MessageParam[] {
  if (!block) return messages
  const next = [...messages]
  const last = next[next.length - 1]
  if (!last || last.role !== 'user') return messages
  if (typeof last.content === 'string') {
    next[next.length - 1] = { ...last, content: `${last.content}${block}` }
    return next
  }
  if (Array.isArray(last.content)) {
    next[next.length - 1] = {
      ...last,
      content: last.content.map((part, index) => {
        if (index !== last.content.length - 1 || part.type !== 'text') return part
        return { ...part, text: `${part.text}${block}` }
      }),
    }
  }
  return next
}
