import type Anthropic from '@anthropic-ai/sdk'
import type { Sf2WorkingSet } from '../types'
import type { Sf2NarratorSceneBundleEventPayload, Sf2NarratorTurnContext } from './turn-context'

export function buildReplayMetadata(
  mode: Sf2NarratorTurnContext['mode'],
  turnIndex: number,
  messages: Anthropic.MessageParam[],
  workingSet: Sf2WorkingSet | null,
  sceneBundleBuilt: Sf2NarratorSceneBundleEventPayload | null
): Sf2NarratorTurnContext['replayMetadata'] {
  return {
    turnIndex,
    messageCount: messages.length,
    assistantMessageCount: messages.filter((message) => message.role === 'assistant').length,
    sceneBundleRebuilt: Boolean(sceneBundleBuilt),
    workingSetComputed: mode === 'normal' && Boolean(workingSet),
  }
}
