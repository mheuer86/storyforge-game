Status: proposed (low priority)

# Hook-specific opening knowledge

## Problem

V1 playbooks carry rich `openingKnowledge` prose — e.g. the Driftrunner's "You know the beacon corridors the way a river rat knows the current..." (`lib/genres/space-opera.ts:217`). This gives the narrator a lived-in character voice from turn 1.

SF2's `compile-seed.ts` extracts `pcCapabilities` (proficiencies, traits, items, playbookProfile) but drops `openingKnowledge`. The Arc Author and Author never see it.

## Why low priority

The V1 `openingKnowledge` is per-playbook, not per-hook. The same Driftrunner knowledge appears whether the hook is "Forty Thousand" or "The Defector." This means it shapes character voice but not situation-specific tension.

The real value would be **hook-specific** opening knowledge — what the PC knows about THIS situation, not just their general worldview. That's a design question, not a restoration task.

## If we proceed

Option A: Pass existing `openingKnowledge` through `compileSf2SetupSeed` into the Author seed. Low effort, modest value.

Option B: Design hook-specific opening knowledge as part of a richer hook authoring format. Higher effort, higher value. Intersects with the Arc Author architecture question.

## Files

- `lib/genres/space-opera.ts` (and all genre files) — V1 `openingKnowledge` definitions
- `lib/sf2/setup/compile-seed.ts:362-368` — `compilePcCapabilities` drops it
- `lib/sf2/types.ts:1262-1264` — `playbookProfile` type (could extend)
