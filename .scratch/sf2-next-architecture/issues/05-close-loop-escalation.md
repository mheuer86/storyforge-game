# Close-Loop Escalation: Binding Landing Directive After Ignored Candidacy

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / narrator / close loop

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

The close loop controller (`lib/sf2/narrator/prose-first-close-loop.ts`) computes close candidacy in code, but the Narrator still declares close via `chapter_status` — nothing forces a landing if candidacy is ignored indefinitely. Both pre-controller sessions parked at their climax forever; the controller constrains that failure but cannot end it.

Add an escalation forcing function to the controller:

- Track consecutive turns where phase is `close_candidate_or_plan`, the active-blocker list is empty, and the Narrator's `chapter_status.close_intent` is not `close_this_turn`.
- At 3 such turns, the turn delta's close-loop advisory becomes a **binding landing directive** (hard-gate register): the Narrator MUST land the chapter this turn — author the landing freely (how, never whether), or name one concrete in-fiction blocker.
- If the Narrator names a novel blocker not on the computed list, defer escalation exactly once (reset the counter to 2, not 0) and log it; a second novel blocker does not defer again.
- If the directive turn still does not close, log a `close_escalation_ignored` diagnostic with high severity — this is a kill-criterion event per the PRD (parking > 6 turns past unblocked candidacy).

Respect the existing phase machine: escalation never fires in `active_revelation_defer` or while blockers are present; `hard_boundary_strict` keeps its existing immediate behavior. All counters and decisions live in code and are visible in `prose_first_close_loop` diagnostics; nothing about phases or escalation leaks into player-visible prose.

## Acceptance criteria

- [ ] Unblocked-candidacy counter implemented in the controller, derived from controller state + `chapter_status` echoes, persisted across turns.
- [ ] At 3 turns, the advisory upgrades to a binding landing directive with MUST register, offering land-or-name-one-blocker.
- [ ] Novel-blocker deferral works exactly once; second novel blocker does not defer.
- [ ] `close_escalation_ignored` diagnostic fires if the directive turn does not close.
- [ ] Escalation never fires with active blockers or in defer/strict phases.
- [ ] No harness vocabulary or phase labels in player-visible prose (extend display-sentinel checks).
- [ ] Replay fixture `close-gate-escalation`: 3 ignored unblocked candidacy turns produce the binding directive; a blocker mid-sequence resets correctly.
- [ ] Existing `chapter-close-*` fixtures still pass.

## Blocked by

Nothing.
