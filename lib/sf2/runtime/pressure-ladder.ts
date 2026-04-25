// Pressure ladder execution. Pure function: reads runtime + state,
// flips `fired: true` on steps whose triggerCondition is met.
//
// Trigger conditions are natural language from the Author; we pattern-match
// against runtime signals (turn count, thread status, specific phrases).

import type {
  Sf2ChapterSetupRuntimeState,
  Sf2PressureLadderStep,
  Sf2State,
} from '../types'

export interface LadderUpdateResult {
  nextLadder: Sf2PressureLadderStep[]
  firedThisTurn: Sf2PressureLadderStep[]
}

export function updatePressureLadder(
  runtime: Sf2ChapterSetupRuntimeState,
  state: Sf2State
): LadderUpdateResult {
  const firedThisTurn: Sf2PressureLadderStep[] = []
  const turnIndex = state.history.turns.length
  const nextLadder = runtime.pressureLadder.map((step, index) => {
    if (step.fired) return step
    if (triggerSatisfied(step, index, runtime, state, turnIndex)) {
      const firedStep = { ...step, fired: true, firedAtTurn: turnIndex }
      firedThisTurn.push(firedStep)
      return firedStep
    }
    return step
  })
  return { nextLadder, firedThisTurn }
}

function triggerSatisfied(
  step: Sf2PressureLadderStep,
  index: number,
  runtime: Sf2ChapterSetupRuntimeState,
  state: Sf2State,
  turnIndex: number
): boolean {
  const cond = step.triggerCondition.toLowerCase()

  // Pattern 1: "Turn N opening" / "turn 1" / first-turn triggers
  if (index === 0 && /\b(turn\s*1|opening|chapter\s*start|first\s+turn)\b/.test(cond)) {
    return turnIndex >= 1
  }

  // Pattern 2: "After N turns" / "more than N turns have passed"
  const turnMatch = cond.match(/(?:after|more than|past turn|beyond turn)\s*(\d+)\s*turns?/)
  if (turnMatch) {
    const threshold = parseInt(turnMatch[1], 10)
    if (turnIndex > threshold) return true
  }

  // Pattern 3: "When the player has accepted" / "when the seeker has"
  // → loose match against recent player input
  const recent = state.history.turns.slice(-3)
  const whenMatch = cond.match(/when\s+(?:the\s+)?(?:seeker|player|pc)\s+(?:has\s+)?(\w+)/)
  if (whenMatch) {
    const verb = whenMatch[1]
    for (const turn of recent) {
      if (turn.playerInput.toLowerCase().includes(verb)) return true
    }
  }

  // Pattern 4: references to specific threads being resolved / unresolved
  if (cond.includes('without') && cond.includes('resolved')) {
    // Heuristic: at least N turns have passed without the spine thread resolving
    if (runtime.spineThreadId) {
      const spine = state.campaign.threads[runtime.spineThreadId]
      if (spine && spine.status === 'active' && turnIndex >= index * 4 + 4) {
        return true
      }
    }
  }

  // Pattern 5: pressure ladder is stepped-in-sequence — once a step fires,
  // the next step becomes available at turnIndex + 2.
  if (index > 0) {
    const prior = runtime.pressureLadder[index - 1]
    if (prior.fired && prior.firedAtTurn !== undefined && turnIndex >= prior.firedAtTurn + 3) {
      // Check for "children" / "hall" / specific escalation phrases that indicate
      // later-stage pressure, but gate on prior step firing.
      if (/children|hall|seized|escalat|harden/.test(cond)) {
        return true
      }
    }
  }

  return false
}
