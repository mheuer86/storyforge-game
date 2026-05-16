// Deterministic payload compilation for the Author call.
// Given an Sf2State and (optionally) a prior chapter close artifact, produce the
// AuthorInputSeed that the Author consumes.
//
// For Ch1, return the campaign's selected seed directly. For Ch2+, derive from
// state while preserving the selected seed's world/tone/NPC rules.

import { getSf2SeedForState } from '../game-data'
import { getGenreConfig } from '../../genres/index'
import type { AuthorInputSeed, Sf2ChapterMeaning, Sf2State } from '../types'

export interface ChapterOpeningContinuity {
  priorChapter: number
  nextChapter: number
  closingLocationId: string
  closingLocationName: string
  closingTimeLabel: string
  presentNpcIds: string[]
  establishedFacts: string[]
  lastSceneSummary?: string
  lastVisibleProse?: string
  bridgeInstruction: string
}

export function deriveChapterOpeningContinuity(state: Sf2State): ChapterOpeningContinuity {
  const closingLocation = state.world.sceneSnapshot.location
  const lastTurn = state.history.turns.at(-1)
  const lastSceneSummary = state.chapter.sceneSummaries.at(-1)?.summary

  return {
    priorChapter: state.meta.currentChapter,
    nextChapter: state.meta.currentChapter + 1,
    closingLocationId: closingLocation.id,
    closingLocationName: closingLocation.name,
    closingTimeLabel:
      state.world.sceneSnapshot.timeLabel ||
      state.world.currentTimeLabel ||
      state.meta.currentTimeLabel ||
      '(unspecified)',
    presentNpcIds: state.world.sceneSnapshot.presentNpcIds ?? [],
    establishedFacts: state.world.sceneSnapshot.established.slice(-6),
    lastSceneSummary,
    lastVisibleProse: lastTurn?.narratorProse?.slice(-500),
    bridgeInstruction:
      'Open at the same place, at a traveled-to place explicitly connected to it, or at a justified jump whose opening text names why the prior location no longer holds the camera.',
  }
}

export function renderChapterOpeningContinuity(continuity: ChapterOpeningContinuity): string {
  return [
    `- Prior close: ${continuity.closingLocationName} (${continuity.closingLocationId}); time ${continuity.closingTimeLabel}`,
    `- Present NPC ids at close: ${continuity.presentNpcIds.join(', ') || '(none)'}`,
    continuity.establishedFacts.length
      ? `- Established close facts: ${continuity.establishedFacts.join(' | ')}`
      : '- Established close facts: (none)',
    continuity.lastSceneSummary ? `- Last scene summary: ${continuity.lastSceneSummary}` : null,
    continuity.lastVisibleProse ? `- Last visible prose tail: ${continuity.lastVisibleProse}` : null,
    `- Bridge law: ${continuity.bridgeInstruction}`,
  ].filter((line): line is string => Boolean(line)).join('\n')
}

// Pull the PC's capability surface from state + genre config. Surfaced to the
// Author so chapter design can engage the PC's natural moves; soft enforcement
// via prompt rule, programmatic backstop comes later via option C from
// [[2604270855 Storyforge V2 Playbook Fit]].
function derivePcCapabilities(state: Sf2State): AuthorInputSeed['pcCapabilities'] {
  // genreId on state.meta is `string`; getGenreConfig expects the typed Genre.
  // Cast at the boundary — invalid genres just produce no playbook lookup.
  const genre = getGenreConfig(state.meta.genreId as Parameters<typeof getGenreConfig>[0])
  const playbookList = genre?.playbooks?.[state.meta.originId] ?? []
  const playbook = playbookList.find((p) => p.id === state.meta.playbookId)

  return {
    proficiencies: state.player.proficiencies,
    traits: state.player.traits.map((t) => ({
      name: t.name,
      description: typeof (t as Record<string, unknown>).description === 'string'
        ? ((t as Record<string, unknown>).description as string)
        : undefined,
    })),
    signatureInventory: state.player.inventory
      .filter((item) => item.tags?.includes('weapon') || item.tags?.includes('credential') || item.tags?.includes('signature'))
      .slice(0, 5)
      .map((item) => ({ name: item.name })),
    playbookProfile: playbook?.playbookProfile,
  }
}

function looksProceduralSurface(text: string | undefined): boolean {
  if (!text) return false
  return /(?:route|window|clearance|timer|gate|corridor|door|log|permit|queue|scan|lock|checkpoint|lift|bay|record|file|audit|release|undock|loading|departure|inventory|access)/i.test(text)
}

function pickPressureOwnerLabel(state: Sf2State, transitionSeed: NonNullable<Sf2ChapterMeaning['transitionSeed']> | undefined): string {
  if (transitionSeed?.pressureOwnerCandidate?.trim()) return transitionSeed.pressureOwnerCandidate.trim()

  const activeThreads = Object.values(state.campaign.threads).filter((t) => t.status === 'active')
  const spineCandidate = activeThreads
    .sort((a, b) => b.tension - a.tension)[0]

  if (spineCandidate?.owner?.id) return spineCandidate.owner.id

  const hottestFaction = Object.values(state.campaign.factions).sort((a, b) => {
    const heatRank = { none: 0, low: 1, medium: 2, high: 3, boiling: 4 }
    return heatRank[b.heat] - heatRank[a.heat]
  })[0]
  if (hottestFaction) return hottestFaction.name

  const liveNpc = Object.values(state.campaign.npcs).find((n) => n.status === 'alive')
  return liveNpc?.name ?? state.meta.playbookId
}

function buildDramaticHandoff(
  state: Sf2State,
  priorChapterMeaning: Sf2ChapterMeaning,
  pressureOwnerLabel: string
): string {
  const transitionSeed = priorChapterMeaning.transitionSeed
  const activeThreads = Object.values(state.campaign.threads).filter((t) => t.status === 'active')
  const topThread = activeThreads.sort((a, b) => b.tension - a.tension)[0]
  const liveConstraint = transitionSeed?.procedureResidue.keepAs === 'leverage'
    ? `${transitionSeed.procedureResidue.mechanism} stays in ${pressureOwnerLabel}'s hands.`
    : transitionSeed?.procedureResidue.mechanism
      ? `${transitionSeed.procedureResidue.mechanism} stays background.`
      : (topThread ? `${topThread.title} still exerts pressure.` : 'No procedural surface should drive the opening.')

  const whoPaysNow = topThread?.owner?.id
    ? `${topThread.owner.id} pays first if ${pressureOwnerLabel} pushes too hard.`
    : `The PC pays first if ${pressureOwnerLabel} turns leverage into a demand.`

  const relationshipOrReputationCost = topThread
    ? `The chapter should make ${topThread.title.toLowerCase()} cost standing or loyalty, not just time.`
    : `The chapter should turn the old pressure into a relationship or reputation cost.`

  const newHumanMove = transitionSeed?.unresolvedQuestion
    ? `Someone now asks a person, not a system, to answer the question "${transitionSeed.unresolvedQuestion}".`
    : `Someone now makes a human move against ${pressureOwnerLabel} before procedure can take over.`

  const forbiddenRestages = transitionSeed?.doNotRestage?.length
    ? transitionSeed.doNotRestage.slice(0, 4).join(', ')
    : (topThread ? topThread.retrievalCue : 'the same procedural beat')

  return [
    `Prior meaning: ${priorChapterMeaning.situation} ${priorChapterMeaning.closer}.`,
    `Leverage shift: ${transitionSeed?.earnedConsequence ?? 'The chapter consequence now belongs to someone with leverage.'}`,
    `Pressure owner: ${pressureOwnerLabel}.`,
    `Who pays now: ${whoPaysNow}`,
    `Relationship or reputation cost: ${relationshipOrReputationCost}`,
    `New human move: ${newHumanMove}`,
    `Live constraint: ${liveConstraint}`,
    `Forbidden restages: ${forbiddenRestages}`,
  ].join(' ')
}

export function compileAuthorInputSeed(
  state: Sf2State | null,
  priorChapterMeaning: Sf2ChapterMeaning | null
): AuthorInputSeed {
  if (!state) {
    throw new Error('compileAuthorInputSeed requires selected SF2 state. Pass an explicit seed when no state exists.')
  }
  const base = getSf2SeedForState(state).seed

  // Ch1 or fresh campaign: use the selected pre-authored seed.
  if (state.history.turns.length === 0) {
    // State exists (player has selected playbook/origin) but no turns yet —
    // we can still surface PC capabilities so Ch1 Author sees them.
    return { ...base, pcCapabilities: derivePcCapabilities(state) }
  }

  // Ch2+: derive a new hook from the prior chapter's meaning + carry-forward
  // active threads. For MVP, we reuse the base world rules and tone rules (they
  // do not change across chapters in the same genre). The hook morphs to reflect
  // where the player landed. Critically: we do NOT pass the Ch1 arcName/title,
  // so the Author doesn't lazily reuse it.
  const activeThreads = Object.values(state.campaign.threads).filter(
    (t) => t.status === 'active'
  )
  const spineCandidate = activeThreads
    .filter((t) => t.tension >= 6)
    .sort((a, b) => b.tension - a.tension)[0]

  const highPressureThreads = activeThreads
    .filter((t) => t.tension >= 6)
    .slice(0, 3)
    .map((t) => `"${t.title}" (tension ${t.tension}/10, owner ${t.owner.kind}:${t.owner.id})`)
    .join('; ')

  const nextChapterNumber = state.meta.currentChapter + 1
  const continuity = deriveChapterOpeningContinuity(state)
  const closingGeometry = ` Closing geometry: ${continuity.closingLocationName}${continuity.lastSceneSummary ? ` — ${continuity.lastSceneSummary}` : ''}. Bridge law: ${continuity.bridgeInstruction}`
  const transitionSeed = priorChapterMeaning?.transitionSeed
  const pressureOwnerLabel = transitionSeed ? pickPressureOwnerLabel(state, transitionSeed) : state.meta.playbookId
  const dramaticFallback = priorChapterMeaning
    ? buildDramaticHandoff(state, priorChapterMeaning, pressureOwnerLabel)
    : ''
  const transitionContext = transitionSeed
    ? ` Transition seed support: prior chapter meant "${transitionSeed.priorChapterMeant}"; earned consequence "${transitionSeed.earnedConsequence}"; likely pressure owner "${transitionSeed.pressureOwnerCandidate}"; unresolved question "${transitionSeed.unresolvedQuestion}"; do not restage ${transitionSeed.doNotRestage.join(', ') || '(none)'}.`
    : ''

  // Premise: carry-forward-focused, with explicit "new chapter" framing.
  const premise = priorChapterMeaning
    ? `Chapter ${nextChapterNumber}. ${dramaticFallback}${closingGeometry}${transitionContext} Open this chapter inside the consequences of that — do NOT reopen the prior chapter's frame.`
    : `Chapter ${nextChapterNumber}. Prior chapter ended with active pressure on: ${highPressureThreads || '(no high-tension threads — derive from state)'}.${closingGeometry} Open this chapter inside the consequences of where the player landed — this is NOT a reopening of the prior chapter's situation, it is the next beat of the campaign.`

  // Objective/crucible: derive from the highest-tension spine thread if one
  // exists. If there's no spine candidate, fall back to the base hook's
  // crucible only (the base no longer carries an objective — that's always
  // Author-derived now). Ch2+ without a spine is rare; if it happens, the
  // Author picks the objective from the premise.
  const objective = spineCandidate && !looksProceduralSurface(spineCandidate.resolutionCriteria)
    ? spineCandidate.resolutionCriteria
    : priorChapterMeaning
      ? `Make ${pressureOwnerLabel} spend leverage on a person, not a procedure.`
      : spineCandidate?.resolutionCriteria
  const crucible = spineCandidate && !looksProceduralSurface(spineCandidate.failureMode)
    ? spineCandidate.failureMode
    : priorChapterMeaning
      ? `The next choice should turn consequence into a human cost, not a checkpoint.`
      : base.hook.crucible

  // firstEpisode is optional on the seed. Only carry one when we have a
  // specific continuity signal (prior chapter meaning, or a spine thread to
  // advance). Otherwise let the Author choose the opening camera from the
  // premise alone — same discipline as Ch1.
  const firstEpisode = transitionSeed?.unresolvedQuestion
    ?? priorChapterMeaning?.question
    ?? (spineCandidate
      ? `Advance "${spineCandidate.title}" from its current pressure state, or pivot to consequences from it.`
      : undefined)

  return {
    ...base,
    pcCapabilities: derivePcCapabilities(state),
    hook: {
      // Deliberately NOT passing a pre-authored title/arcName. The Author must
      // synthesize a fresh title from the premise + carried threads. Giving it
      // a title here causes lazy reuse (observed Ch1→Ch2: same title).
      title: `(derive from premise; this is Chapter ${nextChapterNumber}, not Chapter ${state.meta.currentChapter})`,
      premise,
      crucible,
      ...(objective !== undefined ? { objective } : {}),
      arcName: `(derive; do not reuse Chapter ${state.meta.currentChapter}'s frame)`,
      ...(firstEpisode !== undefined ? { firstEpisode } : {}),
    },
    onboardingRules: {
      ...base.onboardingRules,
      // By Ch2+ the PC is not new to the world; loosen onboarding constraints.
      playerKnowledgeAssumption:
        `The ${base.playbookName} has now spent time inside this specific conflict. The world may tighten; the player does not need reintroduction.`,
      // mustIntroduce is now optional on the type. Omit entirely rather than
      // setting to []; the prompt's onboarding-budget rule handles this for
      // every chapter, including Ch2+.
    },
  }
}
