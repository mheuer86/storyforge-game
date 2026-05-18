import type { Sf2NarratorRollResolution } from './turn-context'

export function rollResultMessage(resolution: Omit<Sf2NarratorRollResolution, 'priorMessages' | 'toolUseId'>): string {
  const {
    skill,
    dc,
    effectiveDc,
    d20,
    modifier,
    total,
    result,
    resolutionKind,
    modifierType,
    modifierReason,
    selectedRollAction,
    sourceBreakdown,
  } = resolution
  const dcText = effectiveDc !== undefined && effectiveDc !== dc ? `DC ${effectiveDc} (base ${dc})` : `DC ${dc}`
  const modifierText = modifierType
    ? ` Modifier: ${modifierType}${modifierReason ? ` (${modifierReason})` : ''}.`
    : ''
  const sourceText = sourceBreakdown?.length
    ? ` Sources: ${sourceBreakdown.map((source) => source.label).slice(0, 6).join('; ')}.`
    : ''
  const traitText = selectedRollAction
    ? ` Selected ${selectedRollAction.sourceType}: ${selectedRollAction.label}.`
    : ''
  const base = resolutionKind === 'trait_auto_success' || resolutionKind === 'trait_auto_critical'
    ? `Trait result — ${skill} vs ${dcText}: ${selectedRollAction?.label ?? 'selected trait'} resolved without a random d20. Total is recorded as ${total}.${modifierText}${sourceText}${traitText} `
    : `Roll result — ${skill} vs ${dcText}: rolled d20=${d20} + ${modifier} = ${total}.${modifierText}${sourceText}${traitText} `
  if (result === 'critical') {
    return (
      base +
      (resolutionKind === 'trait_auto_critical'
        ? 'Trait-granted critical success. Strong success — yes, and. Narrate an exceptional outcome that pays off beyond the baseline with extra leverage; do not describe it as luck or a natural 20.'
        : 'Natural 20 or expanded critical. Strong success — yes, and. Narrate an exceptional outcome that pays off beyond the baseline with extra leverage.')
    )
  }
  if (result === 'fumble') {
    return (
      base +
      'Natural 1. Hard failure — no, and now the board changes. The attempt fails AND a specific thing breaks AND the consequence cascades into a second bad outcome. Compress backfire + escalation + block in one beat, then leave a new playable situation. Do NOT render as partial success.'
    )
  }
  if (result === 'success') {
    return (
      base +
      `Success. Narrate the outcome. ${successOutcomeGuidance(total, effectiveDc ?? dc)} The PC accomplishes the stated intent and their position visibly improves. Do not turn success into a miss, wrong belief, closed door, pure delay, or partial recovery.`
    )
  }
  return (
    base +
    `Failure — the stated goal is not achieved in the way the player intended; the scene advances through consequence. ${failureOutcomeGuidance(total, effectiveDc ?? dc)} Pick one pattern: backfire, escalation, hard block with cost, or close-miss opening, but do not write those labels in prose. Both halves required: intended goal not achieved AND the scene moves forward through new pressure or a newly playable route. Failure is redirection with cost, not a dead end. If this is the second failure against the same obstacle, person, object, or access barrier, do not ask the player to keep retrying the same obstacle; change the situation, reveal the next pressure-bearing route, or have the world move. Do NOT write this as success with cost — that is a success outcome. FORBIDDEN: narrator-reveal ("you don't notice…"), hindsight grading ("you didn't catch the seam", "that detail should have opened a door"), meta-commentary on the miss, hidden-camera narration about unseen actors. Commit to the false reality from inside the PC's POV. Any opening you introduce must be visible to the PC now as a consequence of the attempt, not an omniscient sidebar.`
  )
}

function successOutcomeGuidance(total: number, dc: number): string {
  const margin = total - dc
  if (margin >= 5) {
    return 'Strong success — yes, and. The PC gets the stated intent plus leverage: extra intel, reduced pressure, a better position, a bonus route, ally trust, or a saved resource.'
  }
  if (margin <= 2) {
    return 'Narrow success — yes, but. The PC gets the stated intent; attach a visible cost around it such as pressure ticking, gear burning, time lost, an enemy closing, ally strain, or wound risk. Do NOT downgrade this into partial recovery or incomplete objective progress.'
  }
  return 'Clean success — yes. The PC gets the stated intent and the situation moves forward without an extra cost.'
}

function failureOutcomeGuidance(total: number, dc: number): string {
  const margin = total - dc
  if (margin >= -2) {
    return 'Narrow failure — no, but. The clean result does not happen, but the attempt reveals a new opening, changed route, or pressure-bearing next situation. Use partial success only for divisible goals where "partly yes, partly no" is honest.'
  }
  return 'Failure — no, and. The goal is missed and the situation worsens: pressure advances, an encounter triggers, a route closes, a resource is lost, or an enemy gains position.'
}
