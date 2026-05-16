import type {
  Sf2PassiveAwarenessCue,
  Sf2PassiveAwarenessEvaluation,
  Sf2Player,
  Sf2State,
} from '../types'

export function computePassivePerception(player: Sf2Player): number {
  const wisModifier = Math.floor(((player.stats?.WIS ?? 10) - 10) / 2)
  const level = Math.max(1, player.level ?? 1)
  const proficiencyBonus = Math.floor((level - 1) / 4) + 2
  const perceptionProficient = (player.proficiencies ?? []).some(
    (p) => p.toLowerCase() === 'perception'
  )
  return 10 + wisModifier + (perceptionProficient ? proficiencyBonus : 0)
}

export function evaluatePassiveAwareness(input: {
  state: Sf2State
  sceneId?: string
  turnIndex: number
}): Sf2PassiveAwarenessEvaluation {
  const { state } = input
  const sceneId = input.sceneId ?? state.world.sceneSnapshot.sceneId
  const passivePerception = computePassivePerception(state.player)
  const cues = state.chapter.scaffolding.passiveAwarenessCues ?? []
  const delivered = state.chapter.scaffolding.passiveAwarenessDelivered ?? {}
  const met: Sf2PassiveAwarenessCue[] = []
  const unmet: Array<{ cueId: string; passiveDc: number }> = []

  for (const cue of cues) {
    if (!isEligibleCue(cue, state, sceneId)) continue
    if (delivered[cue.id]) continue

    if (passivePerception >= cue.passiveDc) {
      met.push(cue)
    } else {
      unmet.push({ cueId: cue.id, passiveDc: cue.passiveDc })
    }
  }

  return {
    passivePerception,
    met,
    unmet,
    advisoryText: renderPassiveAwarenessBlock({ met }),
  }
}

export function renderPassiveAwarenessBlock(
  result: Pick<Sf2PassiveAwarenessEvaluation, 'met'>
): string {
  if (result.met.length === 0) return ''

  const lines = [
    '### Passive awareness met (private; surface naturally, never explain the mechanic)',
    'These are observable surface details only. Weave them into PC POV prose if relevant; do not mention passive Perception, DCs, missed cues, or hidden explanations. Do not create a clue unless later prose and Archivist extraction establish one.',
  ]

  for (const cue of result.met) {
    lines.push(`- ${cue.surfaceText}`)
    if (cue.followupQuestion) {
      lines.push(`  follow-up pressure: ${cue.followupQuestion}`)
    }
  }

  return lines.join('\n')
}

export function markPassiveAwarenessDelivered(input: {
  state: Sf2State
  sceneId?: string
  turnIndex: number
}): string[] {
  const sceneId = input.sceneId ?? input.state.world.sceneSnapshot.sceneId
  const result = evaluatePassiveAwareness({
    state: input.state,
    sceneId,
    turnIndex: input.turnIndex,
  })
  if (result.met.length === 0) return []

  const scaffolding = input.state.chapter.scaffolding
  scaffolding.passiveAwarenessDelivered = {
    ...(scaffolding.passiveAwarenessDelivered ?? {}),
  }

  for (const cue of result.met) {
    scaffolding.passiveAwarenessDelivered[cue.id] = {
      sceneId,
      turnIndex: input.turnIndex,
    }
  }

  return result.met.map((cue) => cue.id)
}

function isEligibleCue(
  cue: Sf2PassiveAwarenessCue,
  state: Sf2State,
  sceneId: string
): boolean {
  if (!cue.id || !cue.surfaceText || !Number.isFinite(cue.passiveDc)) return false
  if (cue.sceneId && cue.sceneId !== sceneId) return false
  if (
    cue.locationId &&
    cue.locationId !== state.world.currentLocation.id &&
    cue.locationId !== state.world.sceneSnapshot.location?.id
  ) {
    return false
  }
  if (cue.npcId && !state.world.sceneSnapshot.presentNpcIds.includes(cue.npcId)) {
    return false
  }
  return true
}
