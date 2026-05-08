# Finish TemporalAnchor and Timer lifecycle boundary

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** AFK
**Source:** SF2 domain model conversation, TemporalAnchor/Timer overlap review

## What to build

Finish the contract boundary between `Sf2TemporalAnchor` and thread timers. Temporal anchors should be canonical timeline facts. Thread timers should be a pressure interpretation of a deadline, and scene-kernel countdowns should be derived projections.

The basic source-of-truth link is already present in the current worktree: `Sf2Timer.temporalAnchorId`, automatic linking from deadline temporal anchors anchored to active threads, and scene-kernel countdown projection from the linked anchor. This ticket covers the remaining lifecycle and compatibility gaps.

## Acceptance criteria

- [ ] `Sf2Timer.temporalAnchorId` is validated anywhere thread deterioration is validated or normalized
- [ ] Legacy timers with only `deadline` keep working, but migration guidance says when to create/link a temporal anchor
- [ ] Temporal anchor statuses have explicit lifecycle semantics: active, elapsed, resolved, superseded
- [ ] Linked thread timers stop producing active countdowns when the temporal anchor becomes elapsed, resolved, or superseded
- [ ] Superseding a deadline has a clear rule: update the timer link to the successor anchor or leave the old timer as historical fallback
- [ ] Duration, sequence, and recurrence anchors are documented as timeline facts, not pressure timers, unless a concrete deadline is derived
- [ ] Replay fixtures cover active linked deadline, terminal anchor removing countdown pressure, and legacy timer fallback

## Blocked by

- 02-thread-lifecycle-policy-module.md recommended, because timer pressure and thread status should agree

## Related / overlap

- The basic timer-anchor implementation appears present in the current worktree. Treat this as lifecycle completion and verification, not a fresh build from zero.
- Verify against `fixtures/sf2/replay/temporal-anchor-deadline.json` before closing.

## Comments

Already handled in the current worktree:

- `Sf2Timer` can reference `temporalAnchorId`
- Creating a deadline `temporal_anchor` anchored to an active thread links or creates the thread timer
- Thread packet deterioration rendering prefers the canonical deadline anchor
- Scene-kernel countdowns prefer linked thread timers and keep unlinked deadline anchors as standalone countdowns
- `temporal-anchor-deadline.json` now asserts timer-anchor linkage and active countdown projection

Remaining risk:

- The lifecycle table exists as enum values, but the code does not yet make enough decisions from those statuses.
- `deadline` remains a string fallback on timers for compatibility, so the model can still drift if validation/retrieval does not prefer the anchor.

## Agent Brief

**Category:** architecture
**Summary:** Make TemporalAnchor the canonical timeline fact and Timer the thread-pressure interpretation.

**Current behavior:** Temporal anchors and timers can now be linked, but lifecycle and legacy fallback rules are still thin.

**Desired behavior:** Deadlines live once as temporal anchors; active thread timers point at them; countdowns are projections; terminal/superseded anchors stop or redirect pressure predictably.

**Key interfaces:** `Sf2TemporalAnchor`, `Sf2Timer`, `Sf2Deterioration`, `apply-patch.ts`, `invariants.ts`, persistence normalization, scene kernel, retrieval thread packets, replay fixtures.

**Out of scope:** A standalone durable `Timer` entity.
