# Narrative Tempo Beat-Mode Contract

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Add a state-derived beat-mode contract for SF2 Narrator and pacing guidance. Beat mode should tell the system whether the current turn is briefing, planning, montage, social pressure, exploration, access/execution, combat, debrief, aftermath, or rules/meta negotiation. The selected beat mode should shape response-length guidance, roll pressure, scope tolerance, suggested-action shape, and close/reframe pressure.

This is not a request to make all chapters longer. It is a request to let the right beat breathe while still closing or reframing as soon as the dramatic question has landed.

## Beat modes (closed enum)

The runtime selects exactly one beat mode per turn from this set. Beat mode is not a procedure; it is a per-turn label that shapes Narrator pacing.

- `briefing` — Information delivery to PC by NPCs. Texture-heavy, low roll pressure.
- `planning` — Group or solo plan construction. May produce assessments, procedure facts, support contributions. Long coherent response permitted.
- `montage` — Compressed time. Off-screen tasks advance, pressures may tick. See ticket 12.
- `social` — In-scene NPC interaction with stakes that are not primarily procedural. Default roll cadence.
- `exploration` — Geography is load-bearing. See ticket 9.
- `access_execution` — Active access, stealth, intrusion, or breach under exposure pressure. See ticket 3.
- `combat` — Active encounter. See ticket 7.
- `debrief` — Post-engagement/reckoning reflection. Texture-heavy, NPC voice-heavy, no rolls unless consequence pending.
- `aftermath` — Same chapter, post-resolution scene where consequences land (praise, blame, disposition shift). Closes/reframes likely.
- `meta` — Player and GM negotiating rules, rewinding for missed rolls, asking "wait, should I have rolled?". Pacing engine pauses entirely.

If multiple modes seem to apply (e.g. access + investigation overlay), beat mode picks the dominant axis; the secondary procedure remains live in retrieval but does not drive pacing this turn.

## Per-mode pacing implications

| Mode | Word budget | Roll pressure | Suggested actions | Close pressure |
|---|---|---|---|---|
| briefing | up to 800 | none unless info uncertain | scene-internal + scene-jump | none |
| planning | up to 1500 | only on consequential assumptions | scene-jump permitted | none until plan committed |
| montage | up to 1200 | task-resolution rolls only | scene-jump (depart/arrive) | none |
| social | 200–500 | default | scene-internal | normal |
| exploration | 200–600 | on movement/observation | scene-internal (move/look) | normal |
| access_execution | 200–500 | high; every consequential action | scene-internal | normal |
| combat | 150–400 | per attack/save | combat actions | normal |
| debrief | up to 1200 | none unless decision pending | scene-jump permitted | active |
| aftermath | 200–800 | rare | scene-jump permitted | active |
| meta | n/a | suspended | n/a | suspended |

## Interaction with existing situation modules

Today's `selectSituationModule()` (Tutorial / Combat / Infiltration / Social / Planning) picks one module per turn and Investigation overlays as appendix. Beat mode does **not** replace situation modules; it sits above them.

- Beat mode is derived first from procedure state, then narrows situation-module selection.
- Investigation overlay should remain composable across all beat modes except `combat` and `meta`.
- When beat mode is `meta`, no situation module is loaded at all — only core + state + meta-mode block.

## Acceptance criteria

- [ ] Runtime derives a single beat mode per turn from active procedure state, chapter setup, recent turn state, and player input.
- [ ] Beat mode is selected from the closed enum above.
- [ ] Narrator dynamic context receives the beat mode plus the per-mode pacing line (word budget, roll pressure, suggested-action shape, close pressure).
- [ ] `briefing`, `planning`, `montage`, `debrief`, `aftermath`, and `meta` are exempt from generic roll-drought pressure unless a consequential uncertainty is active in this turn.
- [ ] `planning` and `debrief` beats receive a coherent response budget up to ~1200–1500 words without forcing an artificial split into two turns.
- [ ] Suggested actions include scene-jump or command-level actions during `planning`, `montage`, `briefing`, `debrief`, and `aftermath` beats when fictionally valid; strict scene-validity remains for `exploration`, `access_execution`, `combat`.
- [ ] Scope warnings are relaxed for `planning` and `access_execution` beats inside an active operation; vignette-scale chapters keep the stricter thresholds.
- [ ] Close/reframe pressure is driven by landed dramatic questions, not by a hard minimum turn count. (Forward-motion contract, see ticket 10.)
- [ ] `meta` beat mode pauses the pacing engine, the roll-drought check, and the forward-motion rule for that turn.
- [ ] Beat mode is observable in instrumentation/logs for fixture assertion.
- [ ] A replay fixture proves a `planning` turn does not receive a forced roll because several texture turns passed.
- [ ] A replay fixture proves a landed objective around turn 10 receives close/reframe pressure rather than more runway.
- [ ] A replay fixture proves a `meta` turn (player asks "should I have rolled?") does not advance pacing or fire forward-motion checks.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md

## Notes

This ticket is the keystone for the user's "don't lift the chapter turn cap; let scenes flex" decision. Chapters stay capped near current target ranges; what changes is that *individual beats* inside a chapter can run long when the dramatic unit warrants it, and procedure carry-forward (ticket 4) handles missions that span more than one chapter.
