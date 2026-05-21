# Retire Multi-Role Pipeline

Status: ready-for-human
Labels: ready-for-human
Type: HITL
Area: SF2 / architecture / role pipeline

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to decide

Decide whether Arc Author, Chapter Author, and the scene-bundle narrator context should be removed, demoted to fallback/debug-only paths, or retained for specific scenarios after the prose-first prototype has real evidence.

This is a decision ticket, not an implementation ticket. The risky part is not deleting code; it is deciding whether the prose-first narrator with pre-authored briefs and handover documents now produces better narrative quality than the multi-role pipeline — and whether that quality holds across genres, chapter transitions, and extended play.

## Acceptance criteria

- [ ] At least one full chapter has been run through the terminal runner with the prose-first path, producing an artifact bundle with transcript, roll log, and handover documents.
- [ ] The prose-first transcript is compared side-by-side against the Stryca transcript (SF2 v2 counter-example) and the Pale Flame transcript (web Claude benchmark) on: scope variance, worldbuilding quality, NPC voice, dramatic tension, roll integration, and player-responsive pacing.
- [ ] At least one cross-chapter transition (Chapter 1 close → handover → Chapter 2 open) has been exercised, either through terminal runner or browser play.
- [ ] The comparison includes quantitative signals where available: turn count to first scope change, unique locations visited, distinct NPC interactions, rolls per chapter, and latency per turn.
- [ ] The comparison includes qualitative assessment: does the prose feel like a GM running from prep, or like a model executing a prompt? Does the opening scene match the brief's intent? Do NPC voices remain distinct? Does dramatic irony from the GM Secrets section surface naturally?
- [ ] Diagnostics for the prose-first path are reviewed: narrator latency, cache hit rates, handover compiler latency, any mechanical state drift between narrator prose and Archivist extraction.
- [ ] Decide the future of Arc Author: remove entirely, or retain as a debug/comparison tool.
- [ ] Decide the future of Chapter Author: remove entirely, or retain as a fallback for campaigns without handover documents.
- [ ] Decide the future of scene-bundle narrator context: remove entirely, or retain as the default for non-brief campaigns.
- [ ] If removal is approved: create implementation tickets for removing the gated code paths, cleaning up the Author routes, and updating documentation.
- [ ] If removal is rejected: update this PRD with the narrower role the prose-first path should play (e.g., specific genres only, terminal-only, experimental flag).
- [ ] Update `CONTEXT.md` and `docs/storyforge-2-design.md` to reflect the architectural decision.

## Blocked by

- 03-brief-driven-campaign-start.md
- 04-chapter-close-handover-compiler.md
- 05-feed-handover-to-narrator-continuation.md
- 06-terminal-runner-end-to-end.md
