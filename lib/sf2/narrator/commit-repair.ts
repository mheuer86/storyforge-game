import type Anthropic from '@anthropic-ai/sdk'
import type { Sf2NarratorTurnContext } from './turn-context'
import { NARRATOR_TOOL_NAME, narrateTurnTool } from './tools'

export interface MissingNarrateTurnRepairRequest {
  maxTokens: number
  system: Anthropic.TextBlockParam[]
  tools: Anthropic.Tool[]
  toolChoice: { type: 'any'; disable_parallel_tool_use: true }
  messages: Anthropic.MessageParam[]
}

export function buildMissingNarrateTurnRepairRequest(input: {
  turnContext: Pick<Sf2NarratorTurnContext, 'system' | 'messages'>
  completedContent: Anthropic.MessageParam['content']
}): MissingNarrateTurnRepairRequest {
  return {
    maxTokens: 1200,
    system: input.turnContext.system,
    tools: [narrateTurnTool],
    toolChoice: { type: 'any', disable_parallel_tool_use: true },
    messages: [
      ...input.turnContext.messages,
      { role: 'assistant', content: input.completedContent },
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              'COMMIT REPAIR ONLY.',
              'The assistant prose immediately above was already streamed to the player. Do not rewrite it, continue it, summarize it, or add new prose.',
              `Emit exactly one ${NARRATOR_TOOL_NAME} tool call for the already-streamed turn.`,
              'Base mechanical_effects, hinted_entities, authorial_moves, and suggested_actions only on that already-streamed prose and the current scene state.',
              'Do not request a roll. Do not add natural-language commentary.',
            ].join('\n'),
          },
        ],
      },
    ],
  }
}
