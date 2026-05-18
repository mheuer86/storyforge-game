Status: proposed

# Author hookDirect mode for Ch1

## Problem

The Author for Ch1 currently receives: "derive Chapter 1 from the ArcPlan, not directly from the raw hook." The raw hook (premise, crucible, objective, firstEpisode) is treated as palette, not the driver. The ArcPlan is the driver — and the ArcPlan is where procedural shapes originate.

## Change

When no arc plan exists, `buildAuthorSituation` should produce a Ch1 context that gives the Author creative freedom to interpret the hook directly.

The Author gets:
- The full hook (premise, crucible, objective, firstEpisode)
- The AuthorInputSeed (worldRules, toneRules, npcRules, onboardingRules, pcCapabilities)
- Genre guidance from the genre bible
- Structural beat guidance for Ch1 (from `structural-beats.ts`)

The Author creates:
- Everything it creates today (chapter frame, opening scene spec, NPCs, threads, pressure ladder, antagonist field, human stakes, pacing contract)
- **New:** `campaign_forces` — 2-3 durable forces this chapter establishes (replaces arc plan's `durableForces`). These persist in campaign state for future chapters.
- **New:** `stance_seeds` — 1-2 stance axes the opening chapter reveals (replaces arc plan's `playerStanceAxes`). Optional — may emerge from play instead.

The Author does NOT create:
- A 5-chapter arc plan
- Pre-committed arc threads (chapter threads are the threads; arc-level identity emerges from chapter-meaning)
- Latent arc questions (these can be planted by chapter-meaning when the fiction earns them)
- Scenario shape metadata (rejectedDefaultShape, whatThisIsNot)

## Key prompt changes

In `buildAuthorSituation` (Ch1 branch, currently lines 184-193):

Replace the "derive from ArcPlan" framing with:

```
This is the opening chapter of a new campaign. You are the creative interpreter
of the hook — your job is to find the strongest playable shape for this
premise and this PC.

The hook fixes pressure facts, not plot. The same hook played by a different PC
or opened from a different camera would be a different chapter. Your choices:
which angle to enter from, who is on stage, what the first pressure is, and
what the chapter tests.
```

Include the hook fields, AuthorInputSeed worldRules/toneRules/npcRules, pcCapabilities, and the Ch1 structural beat.

## Anti-procedure guardrails

Port the existing anti-procedure rules from the Author prompt (rule 5: personify institutional pressure, rule 6: pressure through one dangerous person) but remove the ArcPlan references. Add:

- "The hook's crucible names a human cost, not a procedure. Your chapter setup must make that cost walk into a room as a person."
- The genre bible's "pressure lives in people" principle applies to every field you author.

## Files

- `lib/sf2/author/prompt.ts:180-193` — `buildAuthorSituation` Ch1 branch (rewrite)
- `lib/sf2/author/prompt.ts:408-452` — `renderArcPlan` (no longer called for Ch1)
- `lib/sf2/author/contract.ts` — `arc_link` validation (make optional for hookDirect)
- `lib/sf2/types.ts` — may need `campaignForces` and `stanceSeeds` on chapter setup or campaign level

## Depends on

- #02 (structural beats in Author role) — Author needs beat awareness without chapterFunctionMap
- #05 (play-app skip) — orchestration must skip arc-author call

## Test approach

Run the same hook (e.g. "Forty Thousand" space opera) with and without arc plan. Compare Ch1 Author output for procedural language, NPC quality, and opening scene quality. The replay fixture suite should pass with hookDirect mode producing valid Author output.
