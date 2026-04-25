// Deterministic payload compilation for the Author call.
// Given an Sf2State and (optionally) a prior chapter close artifact, produce the
// AuthorInputSeed that the Author consumes.
//
// For MVP / Ch1 of Synod Seeker, we return SYNOD_SEEKER_AUTHOR_INPUT_SEED
// directly (pre-authored in game-data.ts). For Ch2+, we derive from state.

import { SYNOD_SEEKER_AUTHOR_INPUT_SEED } from '../game-data'
import type { AuthorInputSeed, Sf2ChapterMeaning, Sf2State } from '../types'

export function compileAuthorInputSeed(
  state: Sf2State | null,
  priorChapterMeaning: Sf2ChapterMeaning | null
): AuthorInputSeed {
  // Ch1 or fresh campaign: use the pre-authored Synod Seeker seed.
  if (!state || state.history.turns.length === 0) {
    return SYNOD_SEEKER_AUTHOR_INPUT_SEED
  }

  // Ch2+: derive a new hook from the prior chapter's meaning + carry-forward
  // active threads. For MVP, we reuse the base world rules and tone rules (they
  // do not change across chapters in the same genre). The hook morphs to reflect
  // where the player landed. Critically: we do NOT pass the Ch1 arcName/title,
  // so the Author doesn't lazily reuse it.
  const base = SYNOD_SEEKER_AUTHOR_INPUT_SEED

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

  // Premise: carry-forward-focused, with explicit "new chapter" framing.
  const premise = priorChapterMeaning
    ? `Chapter ${nextChapterNumber}. Prior chapter closed with: ${priorChapterMeaning.situation} ${priorChapterMeaning.closer}. Open this chapter inside the consequences of that — do NOT reopen the prior chapter's frame.`
    : `Chapter ${nextChapterNumber}. Prior chapter ended with active pressure on: ${highPressureThreads || '(no high-tension threads — derive from state)'}. Open this chapter inside the consequences of where the player landed — this is NOT a reopening of the prior chapter's situation, it is the next beat of the campaign.`

  // Objective/crucible: derive from the highest-tension spine thread if one
  // exists. If there's no spine candidate, fall back to the base hook's
  // crucible only (the base no longer carries an objective — that's always
  // Author-derived now). Ch2+ without a spine is rare; if it happens, the
  // Author picks the objective from the premise.
  const objective = spineCandidate?.resolutionCriteria
  const crucible = spineCandidate?.failureMode ?? base.hook.crucible

  // firstEpisode is optional on the seed. Only carry one when we have a
  // specific continuity signal (prior chapter meaning, or a spine thread to
  // advance). Otherwise let the Author choose the opening camera from the
  // premise alone — same discipline as Ch1.
  const firstEpisode = priorChapterMeaning?.question
    ?? (spineCandidate
      ? `Advance "${spineCandidate.title}" from its current pressure state, or pivot to consequences from it.`
      : undefined)

  return {
    ...base,
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
        'The Seeker has now spent time inside this specific conflict. The world may tighten; the player does not need reintroduction.',
      // mustIntroduce is now optional on the type. Omit entirely rather than
      // setting to []; the prompt's onboarding-budget rule handles this for
      // every chapter, including Ch2+.
    },
  }
}
