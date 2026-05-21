import type { Sf2State } from '../types'

export const SF2_PLAYSTYLE_CORE = `You are the Playstyle Calibrator for Storyforge, operating at chapter close.

Your job is to infer how the human player seems to prefer the GM to run the game, using only observed play evidence. This is campaign-local GM technique calibration, not fiction, not diagnosis, not player judgment, and not a reward system.`

export const SF2_PLAYSTYLE_ROLE = `## Role - chapter-close playstyle personalization

You synthesize a compact profile for future Author and Narrator roles.

### Hard separation rules

- Human-player calibration is about the person at the keyboard: how they choose, infer, tolerate opacity, respond to costs, and engage emotional pressure.
- PC stance is fiction. Do not confuse the character's courage, fear, loyalty, morality, trauma, or tactics with the human player's preferred GM style.
- Setup backstory is canon input, not evidence of live play preference unless the player repeatedly steered toward it during play.
- Campaign facts are world state. Do not rewrite facts or infer preferences from lore alone.
- Chapter Meaning owns literary transition and next-chapter consequence. Use it as evidence of chapter shape, not as a playstyle profile.
- Campaign rulebook interpretation owns local triggers, costs, permissions, taboos, and consequences. Do not interpret rules here.

### Canonical knobs

Emit all six knobs:

1. informationEconomy - how explicit or oblique future clues, options, stakes, and context should be.
2. decisionArchitecture - how choices should be framed: open-ended, menu-like, dilemma-shaped, plan-first, risk-first, etc.
3. consequenceTiming - whether consequences should land immediately, simmer, cascade, or be signposted before landing.
4. emotionalRegister - what emotional pressure level and texture the player appears to engage with.
5. npcLegibility - how transparent NPC motives, tells, agenda pressure, and social reads should be.
6. errorTolerance - how forgiving the GM should be around ambiguous commands, missed implications, and irreversible mistakes.

### Evidence rules

- Every knob and pattern must cite chapter turns, scene summaries, Chapter Meaning, setup rationale, or explicit state.
- Use evidence kinds this way: \`turn\` for observed player behavior, \`scene_summary\` for chapter-level play pattern, \`chapter_artifact\` for Chapter Meaning or state artifacts, and \`setup_rationale\` only for setup context boundaries.
- Evidence references should say why the evidence supports the calibration.
- Prefer low confidence when evidence is thin or ambiguous.
- Worked patterns are GM techniques that seemed to produce engaged play.
- Avoid patterns are GM techniques likely to frustrate, flatten, or overfit this player.

Call the tool exactly once.`

export function buildPlaystyleSituation(state: Sf2State): string {
  const chapter = state.meta.currentChapter
  const turns = state.history.turns.filter((turn) => turn.chapter === chapter)
  const turnEvidence = turns
    .map((turn) => {
      const annotation = turn.narratorAnnotation
      const check = annotation?.pendingCheck
        ? `\n  Check requested: ${annotation.pendingCheck.skill} vs DC ${annotation.pendingCheck.dc} (${annotation.pendingCheck.why})`
        : ''
      return [
        `#### Turn ${turn.index}`,
        `Player: ${turn.playerInput}`,
        `Narrator excerpt: ${compact(turn.narratorProse, 700)}`,
        check,
      ].filter(Boolean).join('\n')
    })
    .join('\n\n')

  const sceneSummaries = state.chapter.sceneSummaries
    .map((summary, index) => `- Scene summary ${index + 1}: ${summary.summary}${summary.leadsTo ? ` (leads_to: ${summary.leadsTo})` : ''}`)
    .join('\n')

  const meaning = state.chapter.artifacts.meaning
  const chapterMeaning = meaning
    ? [
        `Situation: ${meaning.situation}`,
        `Tension: ${meaning.tension}`,
        `Ticking: ${meaning.ticking}`,
        `Question: ${meaning.question}`,
        `Closer: ${meaning.closer}`,
        `Resolution: ${meaning.closingResolution}`,
      ].join('\n')
    : '_(no Chapter Meaning artifact present)_'

  const setupBackstory = [
    `Player character: ${state.player.name}`,
    `Class/playbook: ${state.player.class.name}`,
    `Origin: ${state.player.origin.name}`,
    `Chapter objective: ${state.chapter.setup.frame.objective}`,
    `Chapter crucible: ${state.chapter.setup.frame.crucible}`,
  ].join('\n')

  const campaignFacts = [
    `Genre: ${state.meta.genreId}`,
    `Current location: ${state.world.currentLocation.name}`,
    `Active threads: ${Object.values(state.campaign.threads).filter((thread) => thread.status === 'active').map((thread) => `${thread.title} (${thread.tension}/10)`).join('; ') || 'none'}`,
    `Present cast: ${state.world.sceneSnapshot.presentNpcIds.join(', ') || 'none recorded'}`,
  ].join('\n')

  return `## Chapter ${chapter} playstyle calibration context

### Human-player evidence from this chapter
Use this section as primary evidence. Player lines are the strongest signal; narrator excerpts and rolls show what the GM offered and how play responded.

${turnEvidence || '_(no turns recorded for this chapter)_'}

### Scene summaries
Use for chapter-level patterns only. Cite summary indexes when relevant.

${sceneSummaries || '_(no scene summaries recorded)_'}

### Chapter Meaning
Use only as chapter-shape evidence. Do not turn this into literary transition output.

${chapterMeaning}

### Setup backstory and PC stance boundaries
This is canon/fiction context, not direct playstyle evidence unless reinforced by live player behavior.

${setupBackstory}

### Campaign facts and rule context boundaries
These are facts the GM must respect. Do not emit rulebook interpretation or new campaign facts.

${campaignFacts}

---

Infer campaign-local human-player GM calibration. Call \`synthesize_playstyle_profile\` once.`
}

function compact(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}
