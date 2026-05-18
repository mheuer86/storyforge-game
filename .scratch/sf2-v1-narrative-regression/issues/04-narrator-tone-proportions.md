Status: proposed

# Narrator tone proportions

## Problem

V1 gives the narrator per-genre tone mixes — e.g. Space Opera:

> Epic (60%): Grand stakes, heroic moments, the weight of the galaxy.
> Gritty (30%): Real costs, hard choices, consequences that linger.
> Witty (10%): Dry humor, sharp banter, moments of levity that make the grit bearable.

Each genre overrides this via `toneOverride` in genre config. The narrator sees it in every turn's system block.

SF2's narrator gets zero tone guidance. The compile-seed *does* extract `toneMix` from genre config (`compile-seed.ts:305`) and feeds it to the Author seed, but the Author doesn't write prose — the Narrator does, and the Narrator never sees it.

## Why this matters

Without tone proportions, the narrator defaults to whatever register the model finds easiest for the genre. For Space Opera that's often procedural-serious. For Grimdark that's relentless bleakness without the dark humor that makes Abercrombie work. The tone mix is what creates tonal variety within a genre — the 10% wit that keeps grit from becoming monotone.

## Fix

Pass genre tone mix to the Narrator. Two options:

Option A: Include `toneMix` in the scene packet or narrator system block (the per-genre data the narrator already receives from the genre profile). Cleanest — the narrator sees it every turn.

Option B: Add tone guidance to the genre bible's narrative craft section. We just rewrote those; could add a "Tone" subsection. Slightly redundant with the existing `toneOverride` in genre config.

## Files

- `lib/sf2/narrator/prompt/role.ts` — narrator role (receives genre examples but not tone)
- `lib/sf2/genre-profile/profiles.ts` — genre bibles (could add tone section)
- `lib/sf2/genre-profile/index.ts` — genre example extraction
- `lib/sf2/setup/compile-seed.ts:302-314` — `buildToneRules` (feeds Author, not Narrator)
- `lib/genres/space-opera.ts` (and others) — V1 `toneOverride` definitions
