import { REHEAT } from './constants'
import type { Sf2EntityId, Sf2PressureLadderStep, Sf2State } from '../types'

export function ladderFireDeltaAmount(step: Pick<Sf2PressureLadderStep, 'severity'>): number {
  return step.severity === 'hard' ? REHEAT.LADDER_FIRE_HARD : REHEAT.LADDER_FIRE_STANDARD
}

export function getPressureLadderTargetThreadIds(
  state: Sf2State,
  step: Pick<Sf2PressureLadderStep, 'threadIds'>
): Sf2EntityId[] {
  const explicitThreadIds = (step.threadIds ?? []).filter((id) =>
    Boolean(state.chapter.setup.threadPressure?.[id])
  )
  if (explicitThreadIds.length > 0) return explicitThreadIds
  return state.chapter.setup.spineThreadId ? [state.chapter.setup.spineThreadId] : []
}

export function getRecentLadderPressureDeltas(
  state: Sf2State,
  turnIndex: number
): Map<Sf2EntityId, number> {
  const deltas = new Map<Sf2EntityId, number>()
  const priorTurnIndex = turnIndex - 1
  for (const step of state.chapter.setup.pressureLadder) {
    if (!step.fired || step.firedAtTurn !== priorTurnIndex) continue
    const amount = ladderFireDeltaAmount(step)
    for (const threadId of getPressureLadderTargetThreadIds(state, step)) {
      deltas.set(threadId, (deltas.get(threadId) ?? 0) + amount)
    }
  }
  return deltas
}
