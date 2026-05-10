# Stateful Planning Assessments

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Make operation planning a playable stateful mode. When the player gathers support, proposes a plan, or asserts uncertain procedure facts, the system captures the plan and marks uncertain assumptions as assessments. The Narrator should request rolls for assumptions that carry consequence, and support sources should challenge or refine plans based on their role, lane, contribution, and reliability.

Planning should support group-planning scenes, lone preparation, ritual setup, route study, exploit chaining, and asset staging. Relevant support contributions can justify advantage, reduce DC, surface constraints, create procedure facts, add affordances, or add objections. The goal is to make competence legible without reducing planning to a yes-machine scene.

## Definitions

- **Procedure fact** — a confirmed, currently-true statement about the procedural world. Example: "the west tower guard changes at midnight", "the daemon accepts stolen admin tokens for one session", or "the hangar has eleven visible workers during unload." Procedure facts persist until something invalidates them.
- **Assessment** — an *unconfirmed* planning assumption that, if wrong, would create consequences. Carries a `rolled: boolean` flag and a referenced check (skill + DC). Once rolled successfully, an assessment is *promoted* to a procedure fact, stronger signal, constraint shift, or affordance. On failed roll, the assessment becomes a constraint, risk, or weaker confidence — not a hard block.
- **Support contribution** — use the kernel `Sf2SupportContribution` shape. A contribution may come from an NPC, faction, asset, clue, location, ritual, software, retinue, preparation, or prior decision. It has source, lane, kind, summary, and optional effect.
- **Support advantage rule** — a planning roll receives advantage, DC shift, or stronger outcome only when committed support contributions materially reduce uncertainty. This can be two relevant contributors, one decisive asset, a ritual plus clue, a route map plus scout, a daemon plus exploit, etc. The rationale is stated to the player before the roll with support sources named.

## Activation criteria

Planning mode is selected as the beat mode (see ticket 11) when any of:

- An operation procedure is in `orientation`, `commitment`, or `preparation` phase.
- The player message contains plan-construction signals: "what's the plan", "how do we approach", "let's figure out", "before we go", or proposes a multi-step approach.
- The player invites input from support sources, including NPCs, assets, clues, locations, rituals, software, retinue, or prior decisions.

Activation is per-turn. A single chapter can move in and out of planning mode multiple times.

## Acceptance criteria

- [ ] Planning mode is selected as the beat mode per the activation criteria above.
- [ ] Uncertain planning claims are recorded as assessments with a `rolled: boolean` flag and a referenced check.
- [ ] Successful assessment rolls promote the assumption to a procedure fact, stronger signal, constraint shift, or affordance.
- [ ] Failed assessment rolls demote the assumption to a constraint, risk, or weaker plan confidence — never a hard block on the operation.
- [ ] Planning state records support contributions with source kind/id/label, lane, contribution kind, summary, and optional effect.
- [ ] Support advantage rule fires automatically when committed support materially reduces uncertainty, and the rationale is surfaced to the player before the roll.
- [ ] Narrator requests a roll only when a planning assumption would create consequences if wrong; pure brainstorming does not produce roll prompts.
- [ ] Support contributions can add expertise, objections, constraints, resources, cover, routes, evidence, or signals without becoming yes-machines.
- [ ] Procedure facts persist on the operation procedure and are visible in retrieval and the operation HUD.
- [ ] A replay fixture covers a group-planning beat where two support lanes justify advantage or DC shift on a consequential planning roll.
- [ ] A replay fixture covers a lone cyberpunk or grimdark preparation beat where a non-NPC support source justifies a DC shift or affordance.
- [ ] A replay fixture covers a revised operation plan after a failed access/credential/mask beat — the failed roll's downstream constraint is reflected in the new plan's assessments.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/01-operation-procedure-runtime-mvp.md
