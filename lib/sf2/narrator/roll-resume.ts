import type Anthropic from '@anthropic-ai/sdk'
import type { Sf2State } from '../types'
import { resolvePlayerInputThreadTargets } from '../turn-resolution/targets'
import {
  renderSf2RollResumeIntentQueueBlock,
  type Sf2NarratorIntentQueue,
} from './intent-queue'
import type { Sf2NarratorRollResolution } from './turn-context'
import { rollResultMessage } from './roll-result'

export function buildRollResumeMessages(
  state: Sf2State,
  intentQueue: Sf2NarratorIntentQueue,
  rollResolution: Sf2NarratorRollResolution
): Anthropic.MessageParam[] {
  const pressureInstruction = buildRollPressureManifestationInstruction(
    state,
    rollResolution.currentIntent ?? intentQueue.originalInput,
    rollResolution
  )
  const intentQueueInstruction = renderSf2RollResumeIntentQueueBlock(intentQueue)
  const content = `${rollResultMessage(rollResolution)}${pressureInstruction}${intentQueueInstruction}`

  return [
    ...(rollResolution.priorMessages as Anthropic.MessageParam[]),
    {
      role: 'user',
      content: [
        {
          type: 'tool_result' as const,
          tool_use_id: rollResolution.toolUseId,
          content,
        },
      ],
    },
  ]
}

export function buildRollPressureManifestationInstruction(
  state: Sf2State,
  playerInput: string,
  rollResolution: Sf2NarratorRollResolution
): string {
  if (rollResolution.result !== 'failure' && rollResolution.result !== 'fumble') return ''
  const trimmedInput = playerInput.trim()
  if (!trimmedInput) return ''
  const pressureDelta = rollResolution.result === 'fumble' ? 3 : 2
  const { targetThreadIds } = resolvePlayerInputThreadTargets(state, trimmedInput)
  if (targetThreadIds.length === 0) return ''
  const humanStakes = state.chapter.setup.humanStakes ?? []
  const lines = targetThreadIds.map((threadId) => {
    const thread = state.campaign.threads[threadId]
    const matchingStakes = humanStakes.filter((stake) => stake.triggeringPressure === threadId)
    const stakeText = matchingStakes.length > 0
      ? matchingStakes.map((stake) => {
          const whoPays = stake.whoPays === 'the PC'
            ? 'the PC'
            : `${state.campaign.npcs[stake.whoPays]?.name ?? stake.whoPays} (${stake.whoPays})`
          return `${whoPays} risks ${stake.costSurface}: ${stake.whatIsLost}`
        }).join(' | ')
      : 'no matching human_stakes entry'
    return `- ${thread?.title ?? threadId} (${threadId}) · Δ +${pressureDelta} · human stake: ${stakeText}`
  })

  return `\n\n---\n\n### Private roll pressure manifestation (mandatory, never mention)\nThe failed roll will deterministically charge the targeted thread(s) when this turn commits. Treat the continuation as if the per-turn delta already showed:\n${lines.join('\n')}\nManifest this pressure in the continuation prose now. Do not say "delta", "thread", "human_stakes", or quote this instruction. Do not save or mutate state here; the commit pipeline applies the pressure after narration.`
}
