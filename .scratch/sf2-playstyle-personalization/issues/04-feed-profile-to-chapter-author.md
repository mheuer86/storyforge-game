# Feed Profile To Chapter Author

Status: complete
Labels: complete
Type: AFK
Area: SF2 / Author / playstyle personalization

## What to build

Feed the compact rolling playstyle profile into Chapter Author input so future chapter setup adapts to observed playstyle. Author should use it for chapter-level decisions such as choice presentation, pacing contract, consequence timing, NPC opacity, and avoid-patterns.

This is one of two live consumers. The Narrator also receives the profile in a separate slice so turn execution can adapt between chapter openings.

## Acceptance criteria

- [x] Author input rendering includes a compact playstyle personalization block when the live gate is enabled.
- [x] The block is campaign-local and does not include cross-campaign assumptions.
- [x] The Author prompt tells the model how to use the six knobs without treating them as fiction facts.
- [x] Chapter setup validation or replay coverage proves the block is present when enabled and absent when disabled.
- [x] Prompt/cache boundaries are respected: mutable profile content stays out of cached system blocks.
- [x] Existing Chapter Meaning and transition-seed behavior remain unchanged.

## Blocked by

- 02-persist-artifacts-and-rolling-profile.md
- 03-reversible-live-gate-and-diagnostics.md

## Comments

Added a dynamic Author prompt block sourced from the campaign-local rolling profile and kept it outside cached system text. Replay fixtures cover enabled and disabled rendering.
