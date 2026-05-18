# Kill the Arc Author

Drafted 2026-05-18. The Arc Author costs 10k tokens per campaign, produces bland procedural setups (clamp releases, logs, filings, permission slips), and front-loads commitment to an arc plan before any fiction exists.

## Thesis

V1 proved that a narrator with a good hook, good genre guidance, and game state produces better fiction than a planning pipeline. SF2's Author role is still useful (structural harness for the Narrator), but the Arc Author layer on top is pure overhead that produces worse results.

**Replace the Arc Author with:**
1. The Author working directly from the hook (creative freedom to interpret it)
2. Structural beat awareness baked into the Author role (so it knows "Ch3 = midpoint reversal" without a pre-generated plan)
3. Chapter-meaning `transition_seed` carrying arc coherence forward organically

## What the Arc Author currently produces

- `scenarioShape` (mode, premise, whatThisIsNot, rejectedDefaultShape)
- `arcQuestion`, `coreCrucible`
- `invariantFacts`, `variableTruthsForThisRun`
- `durableForces` (3 factions with agenda/leverage/fear/pressureStyle)
- `durableNpcSeeds` (3 reusable role seeds)
- `playerStanceAxes` (3 axes with poles/hardening)
- `chapterFunctionMap` (5 structural beat slots)
- `possibleEndgames`
- `arcThreadIds` (pre-planned arc-level threads)
- `latentArcQuestions` (pre-authored questions selected by code for chapter promotion)

## What actually matters downstream

- **Author** consumes the full arc plan to derive each chapter setup
- **Narrator** sees arc context (title, scenario shape, arc question, chapter function) in `situation.ts` and chapter packet
- **Chapter packet** includes arc title, scenario, question, and chapter function
- **Arc-thread linking** — each chapter thread links to an arc thread via `arc_link.thread_links`
- **Latent arc questions** — code selects candidates for promotion each chapter

## What doesn't matter / is actively harmful

- `scenarioShape.rejectedDefaultShape` — patch for Arc Author's tendency to pick obvious shapes
- `possibleEndgames` — never consumed downstream
- `chapterFunctionMap` pre-commitment — Author only looks at its own chapter's entry
- `invariantFacts` / `variableTruthsForThisRun` — hook already carries invariant pressure; variable truths emerge from play
- `durableNpcSeeds` — the Author creates better NPCs when working from the hook directly than when promoting abstract "role seeds"
- `pressureStyle` on durable forces — was the #1 source of procedural language poisoning downstream roles

## Tickets

| # | Title | Phase | Status | Notes |
|---|---|---|---|---|
| 01 | Author hookDirect mode for Ch1 | 1 | proposed | Author interprets hook directly, no arc plan |
| 02 | Structural beats into Author role | 1 | proposed | Author knows Ch3 = reversal without chapterFunctionMap |
| 03 | Author continuation mode without arc plan | 1 | proposed | Ch2+ Author uses chapter-meaning + campaign state |
| 04 | Narrator situation without arc context | 1 | proposed | Narrator works from chapter setup only |
| 05 | play-app skip arc-author call | 1 | proposed | Orchestration change to bypass arc-author endpoint |
| 06 | Remove Arc Author endpoint and lib | 2 | blocked-by-05 | Delete after Phase 1 validates |
| 07 | Clean up arc plan type references | 2 | blocked-by-06 | Make Sf2ArcPlan optional/removed across codebase |

Phase 1 makes the Arc Author skippable. Phase 2 removes it after testing confirms better results.

## Risk

Without a pre-committed arc plan, the Author for Ch4 might not know the arc should be approaching crisis. Mitigation: structural beat awareness (#02) tells the Author "you are in the late-arc crisis beat" based on chapter number alone.

The bigger risk is that chapter-meaning transitions might not carry enough forward pressure. If Ch2's Author doesn't know what forces are in play beyond what chapter-meaning told it, the arc could lose coherence. Mitigation: campaign state already carries active threads, NPCs, factions, and decisions forward — the Author sees all of this in `buildAuthorSituation`. The arc plan was redundant with campaign state for everything except the pre-committed structural beats.

## Files affected

Core changes:
- `lib/sf2/author/prompt.ts` — Ch1 hookDirect mode, Ch2+ without arc plan
- `lib/sf2/narrator/prompt/situation.ts` — arc context block becomes optional/removed
- `lib/sf2/retrieval/packets/chapter.ts` — arc block in chapter packet
- `components/sf2/play-app.tsx` — orchestration skip
- `lib/sf2/structural-beats.ts` — used by Author directly instead of via chapterFunctionMap

Cleanup (Phase 2):
- `app/api/sf2/arc-author/route.ts` — delete
- `lib/sf2/arc-author/` — delete directory
- `lib/sf2/arc-questions.ts` — latent question selection (rethink or delete)
- `lib/sf2/types.ts` — `Sf2ArcPlan` interface
- `lib/sf2/author/contract.ts` — arc_link validation
- `lib/sf2/state-indexes.ts` — arc plan indexing
- `lib/sf2/persistence/normalize.ts` — arc plan normalization
- `lib/sf2/game-data.ts` — seed registry arc plan references
