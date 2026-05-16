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
  const dcText = effectiveDc && effectiveDc !== dc ? `DC ${effectiveDc} (base ${dc})` : `DC ${dc}`
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
        ? 'Trait-granted critical success. Narrate an exceptional outcome that pays off beyond the baseline; do not describe it as luck or a natural 20.'
        : 'Natural 20 or expanded critical. Critical success. Narrate an exceptional outcome that pays off beyond the baseline.')
    )
  }
  if (result === 'fumble') {
    return (
      base +
      'Natural 1. Critical failure. The attempt fails AND a specific thing breaks AND the consequence cascades into a second bad outcome. Compress backfire + escalation + block in one beat. Do NOT render as partial success.'
    )
  }
  if (result === 'success') {
    return (
      base +
      'Success. Narrate the outcome. The PC accomplishes the stated intent and their position visibly improves. You may attach small friction, exposure, or a future cost, but do not turn success into a miss, wrong belief, closed door, or pure delay.'
    )
  }
  return (
    base +
    `Failure — the stated goal is not achieved in the way the player intended; the scene advances through consequence. Pick one pattern: backfire, escalation, or hard block with cost, but do not write those labels in prose. Both halves required: intended goal not achieved AND the scene moves forward through new pressure. Failure is redirection with cost, not a dead end. If this is the second failure against the same obstacle, person, object, or access barrier, do not ask the player to keep retrying the same obstacle; change the situation, reveal the next pressure-bearing route, or have the world move. Do NOT write this as partial success or "success with cost" — that is a different outcome tier. FORBIDDEN: narrator-reveal ("you don't notice…"), hindsight grading ("you didn't catch the seam", "that detail should have opened a door"), meta-commentary on the miss, invention of new facts, hidden-camera narration about unseen actors. Commit to the false reality from inside the PC's POV.`
  )
}
