# Arc Author Operation-Arc Calibration

Status: needs-triage
Labels: needs-triage
Type: HITL

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Create an evaluation path for Arc Author pressure fields using Iron Veil-like procedure-heavy seeds. The goal is to verify that Arc Author produces flexible pressure fields: durable forces, pressure engines, stance axes, and possible endgames that allow investigation, assault, access/infiltration, egress, social bargain, hack, ritual, or political fallout depending on player choices.

The evaluation should not ask Arc Author to reproduce a fixed chapter itinerary or a 50-turn chapter. It should check whether the arc creates pressure jobs that Chapter Author and procedure state can realize differently depending on play.

## Pass bar

An Arc Author output passes review when **all of**:

- Arc structure names durable forces / pressure engines, not concrete mission scenes.
- ≥2 stance axes are identified (e.g. investigation-vs-assault, covert-vs-direct, alone-vs-coalition, ritual-vs-steel, exploit-vs-social-engineering).
- ≥3 plausible endgames are described, none of which is the only possible one.
- Chapter functions are pressure jobs (e.g. "introduce a deadline force," "raise inclusion stakes") rather than fixed scenes (e.g. "get hired by Carren").
- The arc remains coherent if the player chooses the alternate stance on each axis.
- For non-operation seeds, the arc does not force operation/access shape onto a crew/debt/social setup.

Re-author trigger: any pass-bar item failing kicks the arc back for re-author with a one-line note on which item failed.

## Findings capture

Findings live in `.scratch/sf2-stateful-procedure-layer/artifacts/arc-author-eval-NN.md` (numbered per evaluation pass). Each finding note records: seed, generated arc summary, pass-bar checklist, human-review verdict, and re-author notes if applicable.

## Acceptance criteria

- [ ] Add an Iron Veil-like seed or probe input for Arc Author evaluation.
- [ ] Add at least one grimdark castle-infiltration and one cyberpunk intrusion seed or probe input using the same pressure-field pass bar.
- [ ] The probe records selected scenario shape, pressure engines, stance axes, chapter function map, and possible endgames.
- [ ] Evaluation applies the pass-bar checklist defined above.
- [ ] Evaluation distinguishes benchmark pattern fidelity from literal benchmark chapter length.
- [ ] Evaluation checks that the arc remains valid if the player chooses assault, ritual, social leverage, or technical intrusion instead of investigation (alternate-stance test on at least one axis).
- [ ] Evaluation includes at least one non-operation seed (40,000-style crew/debt setup) to confirm Arc Author does not force every arc into mission planning.
- [ ] Evaluation checks for pressure engines equivalent to deadline, surveillance exposure, military escalation, and trust/inclusion risk.
- [ ] Human review verdict is recorded per evaluation pass.
- [ ] Re-author trigger fires when any pass-bar item fails; one-line note states which item.
- [ ] Findings are captured in `artifacts/arc-author-eval-NN.md` with numbered passes, seed, output, checklist, verdict.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
