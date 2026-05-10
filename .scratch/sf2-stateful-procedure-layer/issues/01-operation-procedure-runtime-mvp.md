# Operation Procedure Runtime MVP

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Create the first SF2 procedure runtime around operations using the shared procedure kernel. The player can commit to a bounded undertaking with objectives, procedure facts, constraints, abort conditions, signals, assessments, and mission-like semantic phases such as orientation, commitment, preparation, engagement, egress, reckoning, and aftermath. That state persists, appears in retrieval, is visible in the play UI, and can be updated or cleared through validated patch application.

This is not a new top-level Mission entity. Operation runtime should be broad enough to carry Iron Veil-style mission structure for now, while still remaining optional when the live fiction is social, mystery, crew-building, or fallout-driven.

This should build on the existing singleton operation-plan split described in `.scratch/sf2-domain-model-hardening/issues/09-singleton-operation-plan-runtime-split.md`.

## Definitions

- **Operation phase set** — use the kernel semantic phase enum: `orientation` | `commitment` | `preparation` | `engagement` | `egress` | `reckoning` | `aftermath`. Phases are an *ordered enum but not a required sequence*: an operation can skip phases (e.g. straight to `engagement` with no preparation) and can step back (rare, e.g. egress failed → re-enter preparation). Phase transitions are explicit state mutations. Genre-specific labels render separately: space opera may show "intel/extraction/debrief", grimdark may show "scouting/escape/reckoning", cyberpunk may show "recon/exfil/cleanup".
- **Procedure fact** — see ticket 2 Definitions. Persists on the operation runtime, distinct from clues (ticket 6). Player-facing UI may call these tactical facts when that fits the genre.
- **Assessment** — see ticket 2 Definitions. Lives on the operation runtime, scoped to the operation.
- **Constraint** — use the kernel constraint shape. Operation constraints include resource, time, access, exposure, social, route, moral, technical, arcane, or physical limits. Examples: single-use cloak charge, ward-key with one use, exploit token, fuel limit, ritual window, time-in-castle budget.
- **Abort condition** — a named condition that, if met, ends or transforms the operation with a stated outcome tier. Visible to the player. Example: "exposure clock fills → egress-only under pursuit."
- **Signal** — a pre-arranged coordination trigger. Has `name`, `meaning`, `trigger`, `consumed: bool`. Examples: burst comm window, bell-rope signal, dead-drop mark, daemon callback, liturgy phrase.
- **Operation packet (retrieval)** — the bounded payload sent to Narrator when an operation is active. Target ~400 tokens. Contains: phase, objectives, top-3 procedure facts (most relevant), open assessments, active constraints with current values, abort conditions, signals not yet consumed.

## Relationship to existing `Sf2OperationPlan`

`Sf2OperationPlan` (singleton) remains as the *intended plan* artifact: what the player has committed to do. This ticket adds the *live runtime* alongside it. Specifically:

- `Sf2OperationPlan` carries: stated objective, planned approach, support contributions, intended assets.
- Operation runtime (this ticket) carries: phase, procedure facts, assessments (with rolled status), constraint current values, complications, signals consumed, phase transitions, abort conditions met.
- Migration: existing campaigns with the old shallow `operationPlan` shape should normalize on load — keep the plan record, initialize an empty runtime in `orientation` phase if narratively appropriate, otherwise leave runtime null.

## Acceptance criteria

- [ ] Operation procedure state distinguishes intended plan (`Sf2OperationPlan`) from live runtime; both can coexist for the same operation.
- [ ] Operation runtime supports objectives, procedure facts, constraints (with `current`/`max` when applicable), abort conditions, signals (with `consumed` flag), and assessments (per ticket 2).
- [ ] Operation runtime supports the shared semantic phase enum `orientation | commitment | preparation | engagement | egress | reckoning | aftermath`; phases are skippable and re-entrable, and genre-specific labels render separately.
- [ ] Phase transitions are explicit state mutations recorded in instrumentation.
- [ ] Validator/deduper treats intended plan, live runtime, procedure facts, constraints, affordances, signals, complications, and linked world entities as separate scoped records unless kind, parent scope, and semantic role match.
- [ ] Operation runtime can reference off-screen tasks (ticket 12) when they exist, but does not depend on the montage runtime to ship.
- [ ] Operation runtime survives chapter boundaries (per ticket 4 carry-forward rule).
- [ ] Archivist patch guidance and validation can create, update, transition phase, resolve, abandon, or clear the operation runtime.
- [ ] Narrator retrieval emits a bounded operation packet (~400 tokens) when an operation is active. Packet contents: phase, objectives, top-3 most-relevant procedure facts, open assessments, active constraints with current values, abort conditions, unconsumed signals.
- [ ] The V2 play UI shows a compact operation brief: genre-rendered phase indicator, objectives, constraints (visual), abort conditions, signals, and a procedure-facts list.
- [ ] Save normalization handles campaigns with the old shallow `operationPlan` shape; existing plans migrate without data loss; runtime initializes empty when narratively appropriate.
- [ ] A focused replay fixture proves an operation survives 5+ turns without losing objectives, procedure facts, or constraint values.
- [ ] A second fixture proves a constraint with `current: 1, max: 1` is correctly consumed on use, surfaces in retrieval as `consumed`, and cannot be reused.
- [ ] A genre-neutral fixture proves the same semantic phase values can render as space-opera, grimdark, and cyberpunk surface labels without changing persisted state.
- [ ] A dedup fixture proves a named asset and a constraint on that asset remain distinct but linked.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
