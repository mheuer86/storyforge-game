# Narrative Forward Motion and Soft Chapter Targets

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Make forward motion a runtime contract across SF2 chapter pacing and procedure guidance. When a load-bearing beat is resolved, failed, or mutated, the next turn should expose changed conditions, new leverage, a successor pressure, or chapter close/reframe pressure. It should not keep restating the same clamp, lock, checkpoint, gate, or permission problem only because the chapter has not reached the default 18-25 target-turn range.

This slice should treat target turns as pacing guidance, not a hard minimum. If the foreground objective has landed around turn 10, the system should either move toward chapter close or explicitly promote a successor pressure. If the objective lands very early, the system should require a new dominant pressure before close rather than stretching the old obstacle.

This slice should consume the tempo/beat-mode contract when it exists, but its core invariant is narrower: once the old obstacle has landed, the next turn must not ask the player to keep solving the same unchanged obstacle.

## Definitions

- **Landed beat** — a load-bearing beat whose dramatic question has been answered. Resolved (overcome), failed (couldn't overcome, consequences taken), or mutated (the obstacle's shape changed materially).
- **Successor pressure** — a new dominant force on the chapter, named explicitly. Should reference live state: a faction now hostile, a creditor on-route, a crew member's trust at risk, hidden cargo discovered, the antagonist responding to the player's last move.
- **Restate-allowed condition** — repeating an obstacle is valid only when at least one of: risk has changed, leverage has changed, cost has changed, clock state has changed, or the player's fictional position has changed materially.

## Successor-pressure examples (40,000 starter)

When the clamp/checkpoint/hold beat resolves around turn 10, valid successor pressures include:

- A creditor or thug shows up at the dock with leverage on the player's debt.
- A crew member objects to the route or cargo and threatens to walk.
- The hidden cargo or passenger reveals itself and creates a new commitment.
- A faction the player just antagonised flags them on broader watchlists.
- An NPC ally surfaces a request that pulls in a new direction.
- The starter's larger plot exposes a piece — pursuer, message, opportunity.

Selection should be state-derived: pick the successor that interacts with active threads, dispositions, or origin pressure rather than a generic escalation.

## Acceptance criteria

- [ ] Chapter pacing distinguishes target-turn guidance from close permission.
- [ ] When the foreground objective is terminal and the chapter has enough runway, close/reframe guidance overrides the default target-turn minimum.
- [ ] When a beat lands (resolved, failed, or mutated), Narrator guidance receives the new condition and a prohibition against restating the same obstacle without one of the restate-allowed conditions.
- [ ] Restate-allowed condition is enforced as a positive check, not just as a prohibition: the system asserts what changed when restate is permitted.
- [ ] Forward-motion guidance consumes beat mode when available; `briefing`, `planning`, `montage`, `debrief`, `aftermath`, `meta` are exempt from forward-motion firing because they are not action-resolution beats.
- [ ] A 40,000-style fixture covers a clamp/checkpoint/hold beat resolving or failing around turn 10, then verifies the next guidance closes, reframes, or promotes a state-derived successor pressure (from the example list above).
- [ ] A negative-case fixture covers a restate that IS allowed: same obstacle, but clock has advanced + new leverage exists. Asserts the restate-allowed condition is met explicitly.
- [ ] Existing objective-gate fixture coverage is preserved or extended so the ten-turn close/reframe rule survives future Author and chapter-close changes.
- [ ] The solution does not force an operation, access/infiltration, exploration, investigation, or combat procedure onto chapters whose live fiction is social, relational, mystery, debt, or crew-building driven.
- [ ] A genre-neutral fixture proves the forward-motion rule works for a physical lock/clamp, social gate, warded threshold, and cyberpunk access barrier without changing core schema.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/11-narrative-tempo-beat-mode-contract.md
