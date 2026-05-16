import type { Sf2State } from '../../types'

export function buildNarratorSituation(state: Sf2State): string {
  const { chapter } = state
  const setup = chapter.setup
  const frame = setup.frame
  const arc = state.campaign.arcPlan
  const arcLink = setup.arcLink
  const pacing = setup.pacingContract
  const spineThread = setup.spineThreadId
    ? state.campaign.threads[setup.spineThreadId]
    : undefined

  return `## Chapter ${chapter.number}: ${chapter.title}

### Frame
- Objective: ${frame.objective}
- Crucible: ${frame.crucible}
- Active pressure: ${frame.activePressure}

### Outcome spectrum (how this chapter can resolve)
- Clean: ${frame.outcomeSpectrum.clean}
- Costly: ${frame.outcomeSpectrum.costly}
- Failure: ${frame.outcomeSpectrum.failure}
- Catastrophic: ${frame.outcomeSpectrum.catastrophic}

### Antagonist field
- Source faction: ${setup.antagonistField.sourceFactionLabel ?? setup.antagonistField.sourceFactionId ?? '(none)'}
- Core pressure: ${setup.antagonistField.corePressure}
- Default face: ${setup.antagonistField.defaultFace.name} (${setup.antagonistField.defaultFace.role}) — ${setup.antagonistField.defaultFace.pressureStyle}
- Escalation logic: ${setup.antagonistField.escalationLogic}

### Pressure ladder plan
${setup.pressureLadder.length > 0
  ? setup.pressureLadder
      .map((step, index) => `- ${index + 1}. "${step.pressure}" — fires when: ${step.triggerCondition}; effect: ${step.narrativeEffect}`)
      .join('\n')
  : '- No authored ladder steps.'}

${spineThread ? `### Spine thread anchor\n${spineThread.title} (${spineThread.id}) — ${spineThread.retrievalCue}` : ''}

${arc ? `### Arc context
- Arc: ${arc.title}
- Scenario shape for GM use: ${arc.scenarioShape.mode} — ${arc.scenarioShape.premise}
  Do not use the scenario-shape label as diegetic wording unless characters in the fiction have explicitly named it.
- Arc question: ${arc.arcQuestion}
- Chapter function: ${arcLink?.chapterFunction ?? '(not set)'}
- Player stance read: ${arcLink?.playerStanceRead ?? '(not set)'}
- Active arc threads: ${renderActiveArcThreadPlan(state, arcLink?.arcThreadIds ?? [])}` : ''}

${pacing ? `### Chapter pacing contract
- Target: ${pacing.targetTurns.min}-${pacing.targetTurns.max} turns
- Chapter question: ${pacing.chapterQuestion}
- Early pressure: ${pacing.earlyPressure}
- Middle pressure: ${pacing.middlePressure}
- Late pressure: ${pacing.latePressure}
- Close when: ${pacing.closeWhenAny.join(' | ')}

Do not open a new major branch unless it helps land the chapter question.` : ''}`
}

function renderActiveArcThreadPlan(
  state: Sf2State,
  ids: string[]
): string {
  const selected = ids.length > 0
    ? ids
        .map((id) => state.campaign.threads[id])
        .filter((thread): thread is NonNullable<typeof thread> => Boolean(thread))
    : []
  return selected
    .map((thread) => `${thread.title} (${thread.id}; ${thread.retrievalCue})`)
    .join('; ') || '(none selected)'
}
