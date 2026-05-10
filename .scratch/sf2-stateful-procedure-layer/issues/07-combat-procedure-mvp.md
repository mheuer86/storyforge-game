# Combat Procedure MVP

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Restore combat as a stateful SF2 procedure after operation/access groundwork lands. Combat should track the active encounter, opponents, allies, positions, objectives, hazards, round state, and exit conditions through typed state and validated updates rather than prompt-only memory.

## Definitions

- **Exit conditions** (closed enum) — `defeated_all` (all opponents down), `objective_met` (encounter goal achieved, e.g. egress reached), `fled` (player escaped), `surrendered` (player or opposition surrender), `time_expired` (timer/clock-driven end), `aborted` (encounter ended by external event).
- **Round state** — current round number, initiative order, whose turn is active, pending effects (status conditions with duration).
- **Position** — abstract zone-based or relative position; not full tactical map. Examples: "cover behind crate," "open ground center," "elevated walkway."
- **Combat packet** — bounded retrieval payload when combat is active. Target ~350 tokens. Contains: encounter name, round, initiative, active enemies (HP bars + status), player position + cover, hazards, objectives, exit conditions visible.

## Read order when combat coexists with operation/access

When combat fires inside an active operation or access/infiltration procedure:

1. Combat packet is the primary pacing driver (beat mode `combat`).
2. Operation/access packets ride along as constraints: alert/exposure clocks still tick on detection, complications still apply, constraints still consume.
3. Exit conditions promote back to the parent procedure's beat mode. `objective_met` may complete an operation phase; `fled` typically triggers egress.

## Acceptance criteria

- [ ] Combat procedure state models active encounter, participants, zone-based positions, hazards, objectives, round status, and exit conditions.
- [ ] Exit conditions enum is closed: `defeated_all | objective_met | fled | surrendered | time_expired | aborted`.
- [ ] Narrator roll requests and mechanical effects update combat state through validated paths.
- [ ] Enemy HP, status conditions (with duration), and encounter resolution are visible to the player.
- [ ] Combat coexists with an active operation/access procedure: read order is combat-first for pacing, parent procedure's constraints continue to apply (alert/exposure ticks, complications, constraint use).
- [ ] Exit condition promotes back to parent procedure's beat mode; `objective_met` and `fled` can complete or transition operation phases.
- [ ] Combat resolution can feed consequences back into procedure state, threads, pressure, dispositions, and chapter close readiness.
- [ ] Combat packet is bounded (~350 tokens) and includes encounter name, round, initiative, enemies with HP/status, player position, hazards, objectives, exit conditions.
- [ ] A replay fixture covers a short fight that starts during access/infiltration: alert/exposure clock still ticks, access complications persist, exit returns to egress.
- [ ] A second fixture covers `objective_met` ending combat and completing an operation's `engagement` phase.
- [ ] A genre-neutral fixture proves the same combat procedure can sit inside a station insertion, castle breach, or cyberpunk intrusion.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/01-operation-procedure-runtime-mvp.md
- .scratch/sf2-stateful-procedure-layer/issues/03-operation-linked-infiltration-runtime.md
