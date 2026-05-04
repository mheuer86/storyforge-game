import type { Sf2RollRecord } from '../sf2/types'

export type Sf2bRollOutcome =
  | Sf2RollRecord['outcome']
  | 'critical'
  | 'fumble'

export interface Sf2bRollConsequenceInput {
  skill: Sf2RollRecord['skill']
  dc?: Sf2RollRecord['dc']
  effectiveDc?: Sf2RollRecord['effectiveDc']
  outcome: Sf2bRollOutcome
  why?: string
  consequenceOnFail?: string
  playerGoal?: string
  observedFacts?: string[]
  interpretations?: string[]
  constraints?: string[]
  isInformationGathering?: boolean
}

export function buildSf2bRollConsequenceInstruction(input: Sf2bRollConsequenceInput): string {
  const outcome = normalizeOutcome(input.outcome)
  const failed = outcome === 'failure' || outcome === 'critical_failure'
  const infoRoll = input.isInformationGathering ?? isInformationSkill(input.skill)
  const lines: string[] = []

  lines.push('## SF2B roll continuation contract')
  lines.push(`- Check: ${input.skill}${input.dc !== undefined ? ` vs DC ${input.effectiveDc ?? input.dc}` : ''}`)
  lines.push(`- Outcome: ${outcome.replace('_', ' ')}`)
  if (input.playerGoal) lines.push(`- Player goal: ${input.playerGoal}`)
  if (input.why) lines.push(`- Uncertainty: ${input.why}`)

  lines.push('\n### Observed facts')
  appendList(
    lines,
    input.observedFacts,
    'Only facts the PC can directly see, hear, touch, or verify right now. These may be true even on a failed roll.'
  )

  lines.push('\n### Interpretations')
  appendList(
    lines,
    input.interpretations,
    infoRoll
      ? 'Keep inference separate from fact. On failure, the PC may form an incomplete, overconfident, or wrong read; do not later treat that read as cleanly confirmed without reframing or cost.'
      : 'Name what the PC thinks the facts mean, if the fiction needs an inference. Do not smuggle hidden-camera knowledge into this section.'
  )

  lines.push('\n### Consequence')
  if (failed) {
    lines.push(
      `- The stated goal is not achieved as intended. The scene must move through a concrete consequence${input.consequenceOnFail ? `: ${input.consequenceOnFail}` : '.'}`
    )
    if (infoRoll) {
      lines.push(
        '- Failed information gathering can reveal partial real facts, but the failed part must land in interpretation, certainty, timing, exposure, or cost.'
      )
      lines.push(
        '- Do not narrate what the PC missed. Do not write "you do not notice", "what you miss", or a sidebar about unseen truth.'
      )
    }
    lines.push('- Open or reveal the next pressure-bearing path; do not leave the player at the same blocked prompt.')
  } else {
    lines.push('- The PC accomplishes the stated intent and their position visibly improves.')
    lines.push('- Any friction must be secondary; do not turn success into a disguised miss.')
  }

  if (input.constraints && input.constraints.length > 0) {
    lines.push('\n### Hard constraints')
    appendList(lines, input.constraints, '')
  }

  lines.push('\n### Prose guardrails')
  lines.push('- Keep die values, totals, and DC math out of player-facing prose; the roll UI owns numbers.')
  lines.push('- Write the fiction from limited PC POV, with causality the player can track.')

  return lines.join('\n')
}

function normalizeOutcome(outcome: Sf2bRollOutcome): Sf2RollRecord['outcome'] {
  if (outcome === 'critical') return 'critical_success'
  if (outcome === 'fumble') return 'critical_failure'
  return outcome
}

function isInformationSkill(skill: string): boolean {
  return /insight|perception|investigation|history|arcana|nature|religion|survival|analysis|read/i.test(skill)
}

function appendList(lines: string[], values: string[] | undefined, fallback: string): void {
  const clean = (values ?? []).map((v) => v.trim()).filter(Boolean)
  if (clean.length === 0) {
    if (fallback) lines.push(`- ${fallback}`)
    return
  }
  for (const value of clean.slice(0, 5)) lines.push(`- ${value}`)
  if (clean.length > 5) lines.push(`- ...${clean.length - 5} more omitted`)
}
