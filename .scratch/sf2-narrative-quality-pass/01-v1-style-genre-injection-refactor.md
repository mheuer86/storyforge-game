# v1-style genre injection refactor for v2 prompts

Status: ready-for-agent
Category: refactor
**Type:** AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## What to build

v1's `lib/system-prompt.ts:96-363` builds the entire core prompt by genre interpolation: `${ps.role}`, `${ps.setting}`, `${ps.vocabulary}`, `${ps.toneOverride}`, `${ps.npcVoiceGuide}`, `${ps.narrativeCraft}`, `${ps.consumableLabel}`, `${slicedTraits}`, `${method}`, `${config.npcNames}`, `${config.deepLore}`. Per-genre files in `lib/genres/*.ts` provide those strings via a `promptSections` struct. **Zero hardcoded character names, faction names, or genre vocabulary appear in the v1 core prompt.**

v2 regressed on this. While `getSf2BibleForGenre()` returns one of six per-genre bibles, the supposedly genre-neutral role and author prompts are salted with Hegemony specifics that train the LLM toward Hegemony patterns regardless of the player's genre choice:

- `lib/sf2/narrator/prompt.ts:452, 558` — worked roll/quick-action examples use Sova, Kael, Vethis (Hegemony NPCs).
- `lib/sf2/author/prompt.ts:38` — "A Warden collecting tithe meets the village elder as wary or hostile" presents a Hegemony disposition rule as universal.
- `lib/sf2/author/prompt.ts:54-63` — every "good" trigger example is Hegemony bureaucracy (Coll files a secondary notice; Orvath formally invokes process; Fen Sollar attempts to disengage from the Warden; contradicts the official ledger record; survives Corvin's procedural rebuttal).
- `lib/sf2/author/prompt.ts:65` — rule #23's worked case ("the Warden's tithe chapter is inter-faction confrontation, not Synod-internal compliance") presents a Hegemony framing as a universal rule.

Effect: Space Opera, Cyberpunk, Fantasy, Grimdark, and Noir Authors all train on Hegemony bureaucracy as the canonical "good" example pattern. Genre cross-contamination compounds the procedural-trope leak diagnosed in the sparring session.

Bring back v1's pattern. Define a per-genre example struct, populate it for each of the six genres, and replace hardcoded examples in `narrator/prompt.ts` `SF2_NARRATOR_ROLE` and `author/prompt.ts` `SF2_AUTHOR_ROLE` with `${genreExamples.X}` interpolation points.

Recommended struct (extend the existing per-genre bible objects rather than introducing a parallel system):

```ts
type Sf2GenreExamples = {
  entityBoundTriggers: [string, string, string]   // good ladder triggers, genre-flavored, NON-procedural
  sceneCoupledTriggers: [string, string]          // bad triggers, genre-flavored, for the contrast pair
  pcMisfitChapterRule: string                     // genre-specific phrasing of Author rule #23
  npcWorkedExample: { name: string, role: string, body: string } // narrator roll example
  quickActionExamples: string[]                   // 4-6 lines for the [Skill]-tagged examples
}

type Sf2GenreBundle = {
  bible: string                                    // existing SF2_BIBLE_*
  examples: Sf2GenreExamples                       // new
}
```

Builder side: replace direct constant references with `buildNarratorRole(genreId)` / `buildAuthorRole(genreId)` that interpolate the matching bundle. Cache implications: BP2 cache key effectively becomes per-genre (already true via the bibles), so this doesn't change cache behavior.

## Acceptance criteria

- [ ] `Sf2GenreExamples` struct defined, populated for all six genres (hegemony, space-opera, fantasy, cyberpunk, grimdark, noire).
- [ ] `SF2_NARRATOR_ROLE` rewritten to interpolate `${genreExamples.npcWorkedExample.*}` and `${genreExamples.quickActionExamples}` instead of hardcoded Hegemony names.
- [ ] `SF2_AUTHOR_ROLE` rewritten to interpolate `${genreExamples.entityBoundTriggers}`, `${genreExamples.sceneCoupledTriggers}`, and `${genreExamples.pcMisfitChapterRule}`.
- [ ] Builder functions (e.g. `buildNarratorRole(genreId)`, `buildAuthorRole(genreId)`) selected at session start; existing callers updated.
- [ ] No genre-specific NPC names (Sova, Kael, Vethis, Coll, Orvath, Fen Sollar, Corvin, the Warden, Sev) appear in any prompt that is not genre-conditional. `grep -r 'Sova\|Kael\|Vethis\|Coll\|Orvath\|Fen Sollar\|Corvin\|the Warden' lib/sf2/{narrator,author}/prompt.ts` returns no hits outside the per-genre bundle for Hegemony.
- [ ] Replay fixtures continue to pass (or are explicitly updated for the new prompt shape).

## Blocked by

None.

## Comments

> *Drafted from sparring 2026-05-08 cross-referencing v1 system-prompt.ts. v1's Forty Thousand playthrough demonstrated the modularity holding up across genres without bleed-through; v2 lost it when starting with a single playbook (Hegemony) and never restored it.*

## Agent Brief

**Category:** refactor
**Summary:** Reinstate v1's per-genre prompt-section injection pattern in v2's narrator and author role prompts.
**Current behavior:** Role and author prompts have hardcoded Hegemony names and Hegemony-bureaucratic worked examples that train the LLM cross-genre on Hegemony patterns.
**Desired behavior:** All genre-specific examples and worked cases interpolate from a per-genre struct, mirroring v1's `${ps.*}` pattern. Each genre sees its own examples; no Hegemony bleed.
**Key interfaces:** `lib/sf2/narrator/prompt.ts`, `lib/sf2/author/prompt.ts`, `getSf2BibleForGenre`, prompt builder call sites.
**Acceptance criteria:** Complete the issue checklist and run replay fixtures.
**Out of scope:** AI-default-name ban (separate decision, see README); rewriting the bibles themselves; arc-author prompt (already mostly genre-neutral).
