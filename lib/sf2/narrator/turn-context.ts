import type Anthropic from '@anthropic-ai/sdk'
import {
  buildMessagesForNarrator,
  buildProseFirstNarratorMessages,
  prependMechanicalSnapshotToUserContent,
  type Sf2ProseFirstNarratorMessagesInput,
  type Sf2ProseFirstNarratorTranscriptTurn,
} from './messages'
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
import {
  buildProseFirstCloseLoopAdvisory,
  buildProseFirstCloseLoopInputFromState,
  type ProseFirstCloseLoopAdvisory,
  type ProseFirstCloseLoopInput,
} from './prose-first-close-loop'
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

export interface Sf2NarratorProseFirstCloseLoopEventPayload {
  input: ProseFirstCloseLoopInput
  advisory: ProseFirstCloseLoopAdvisory
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
    proseFirstCloseLoop: Sf2NarratorProseFirstCloseLoopEventPayload | null
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

export interface Sf2ProseFirstNarratorContextInput {
  systemPrompt: string
  systemPromptLabel?: string
  transcript: Sf2ProseFirstNarratorTranscriptTurn[]
  recentInventoryChanges?: string[]
  recentEquipmentChanges?: string[]
}

function buildProseFirstInput(
  proseFirst: Sf2ProseFirstNarratorContextInput,
  state: Sf2State,
  playerInput: string,
  transcript: Sf2ProseFirstNarratorTranscriptTurn[]
): Sf2ProseFirstNarratorMessagesInput {
  const closeLoopInput = buildProseFirstCloseLoopInputFromState({
    state,
    playerInput,
    transcript,
  })
  const closeLoopAdvisory = buildProseFirstCloseLoopAdvisory(closeLoopInput)
  return {
    enabled: true,
    brief: { text: proseFirst.systemPrompt, label: proseFirst.systemPromptLabel },
    transcript,
    playerInput,
    mechanicalSnapshot: {
      state,
      recentInventoryChanges: proseFirst.recentInventoryChanges,
      recentEquipmentChanges: proseFirst.recentEquipmentChanges,
    },
    closeLoopAdvisoryText: closeLoopAdvisory.text,
  }
}

function buildProseFirstCloseLoopDiagnostics(
  state: Sf2State,
  playerInput: string,
  transcript: Sf2ProseFirstNarratorTranscriptTurn[]
): Sf2NarratorProseFirstCloseLoopEventPayload {
  const closeLoopInput = buildProseFirstCloseLoopInputFromState({
    state,
    playerInput,
    transcript,
  })
  return {
    input: closeLoopInput,
    advisory: buildProseFirstCloseLoopAdvisory(closeLoopInput),
  }
}

export function buildNarratorTurnContext(input: {
  state: Sf2State
  playerInput: string
  isInitial: boolean
  turnIndex: number
  rollResolution?: Sf2NarratorRollResolution
  proseFirst?: Sf2ProseFirstNarratorContextInput
}): Sf2NarratorTurnContext {
  const { state, playerInput, isInitial, turnIndex, rollResolution } = input
  const intentQueue = parseSf2NarratorIntentQueue(state, playerInput, rollResolution)
  const cachedTools = buildCachedNarratorTools()
  const sentinelContext = buildNarratorSentinelContext(state)
  const failedRollSkill =
    rollResolution && (rollResolution.result === 'failure' || rollResolution.result === 'fumble')
      ? rollResolution.skill
      : undefined
  const requiredRollGate = isInitial ? null : intentQueue.current.requiredRollGate

  if (rollResolution) {
    let messages = buildRollResumeMessages(state, intentQueue, rollResolution)
    const proseFirstCloseLoop = input.proseFirst
      ? buildProseFirstCloseLoopDiagnostics(state, 'Continue from the roll result.', [])
      : null
    const proseFirstResume = input.proseFirst
      ? buildProseFirstNarratorMessages(
          buildProseFirstInput(input.proseFirst, state, 'Continue from the roll result.', [])
        )
      : null
    if (proseFirstResume) {
      messages = prependMechanicalSnapshotToLastUserMessage(
        messages,
        proseFirstResume.mechanicalSnapshotText,
        proseFirstResume.closeLoopAdvisoryText
      )
    }
    return {
      mode: 'roll_resume',
      system: proseFirstResume?.system ?? buildNarratorSystemBlocks(state),
      messages,
      cachedTools,
      diagnostics: { ...buildEmptyNarratorDiagnostics(), proseFirstCloseLoop },
      sentinelContext,
      failedRollSkill,
      requiredRollGate,
      narrativeTempo: null,
      intentQueue,
      replayMetadata: buildReplayMetadata('roll_resume', turnIndex, messages, null, null),
    }
  }

  const currentPlayerInput = intentQueue.current.text || playerInput
  if (input.proseFirst) {
    const proseFirstCloseLoop = buildProseFirstCloseLoopDiagnostics(
      state,
      currentPlayerInput,
      input.proseFirst.transcript
    )
    const built = buildProseFirstNarratorMessages(
      buildProseFirstInput(input.proseFirst, state, currentPlayerInput, input.proseFirst.transcript)
    )
    if (!built) {
      throw new Error('Prose-first narrator context was enabled but did not build.')
    }
    const messages = appendIntentQueueBlock(built.messages, renderSf2IntentQueueBlock(intentQueue))
    return {
      mode: 'normal',
      system: built.system,
      messages,
      cachedTools,
      diagnostics: { ...buildEmptyNarratorDiagnostics(), proseFirstCloseLoop },
      sentinelContext,
      failedRollSkill,
      requiredRollGate,
      narrativeTempo: null,
      intentQueue,
      replayMetadata: buildReplayMetadata('normal', turnIndex, messages, null, null),
    }
  }

  const built = buildMessagesForNarrator(state, currentPlayerInput, isInitial, turnIndex)
  const messages = appendIntentQueueBlock(built.messages, renderSf2IntentQueueBlock(intentQueue))
  const beatMode = built.packet.mechanics.beatMode?.mode ?? 'social'

  return {
    mode: 'normal',
    system: buildNarratorSystemBlocks(state),
    messages,
    cachedTools,
    diagnostics: {
      workingSet: buildWorkingSetEventPayload(built.workingSet),
      sceneBundleBuilt: built.bundleRebuilt,
      pacingAdvisory: beatMode === 'meta' ? null : buildPacingEventPayload(built.packet.pacing),
      proseFirstCloseLoop: null,
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

function prependMechanicalSnapshotToLastUserMessage(
  messages: Anthropic.MessageParam[],
  mechanicalSnapshotText: string,
  closeLoopAdvisoryText?: string
): Anthropic.MessageParam[] {
  const lastIndex = messages.length - 1
  const last = messages[lastIndex]
  if (!last || last.role !== 'user') return messages

  const next = [...messages]
  if (typeof last.content === 'string') {
    next[lastIndex] = {
      ...last,
      content: prependMechanicalSnapshotToUserContent(last.content, mechanicalSnapshotText, closeLoopAdvisoryText),
    }
    return next
  }

  if (Array.isArray(last.content)) {
    next[lastIndex] = {
      ...last,
      content: [
        ...last.content,
        {
          type: 'text' as const,
          text: prependMechanicalSnapshotToUserContent('', mechanicalSnapshotText, closeLoopAdvisoryText).trim(),
        },
      ],
    }
  }

  return next
}
