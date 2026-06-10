# Roll-Density Governor: Enforce Both Band Bounds via Gate-Binding Modulation

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / narrator / roll gates

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

The roll-density band (floor ~1 roll per 5 player turns, ceiling ~1 per 2) is enforced nowhere. Contextual gate hardening (`lib/sf2/narrator/roll-gates.ts`, `contextualizeRollGateBinding`) reacts to scene context but not to accumulated density, so a session can drift below the floor (prototype: 9 rolls/43 turns with free reveals) or above the ceiling (SF2: the Intimidation slot machine).

Build a code-owned density governor that runs in the turn compiler before gates are rendered into the turn delta:

- Maintain a rolling window of the last 10 player turns with their roll outcomes (resolved rolls, not just requests).
- **Below floor** (< 2 rolls in window): escalate the next eligible `expected` gate to `hard`. Eligibility: the action has meaningful uncertainty per the existing gate reason; never escalate pure conversation/table-talk turns.
- **Above ceiling** (> 5 rolls in window): suppress `advisory` gates entirely and soften `expected` gates with explicit "resolve without a roll; land a visible delta" language. Never soften `hard` gates produced by contextual hardening — consequence still binds (Durable Lesson 15).
- Emit a `roll_gate_diagnostic` entry whenever the governor changes a binding, recording window state and direction.

The governor composes with, and runs after, `contextualizeRollGateBinding` — contextual hardening expresses *consequence*; the governor expresses *budget*. Consequence wins upward (hard stays hard); budget wins downward only on advisory/expected tiers.

## Acceptance criteria

- [ ] A density window (last 10 player turns) is tracked in code, derived from the roll ledger, not model output.
- [ ] Below-floor state escalates the next eligible expected gate to hard; above-ceiling state suppresses advisory gates and softens expected gates.
- [ ] Hard gates from contextual hardening are never softened by the governor.
- [ ] Every governor intervention is logged as a diagnostic with window counts and direction.
- [ ] Replay fixture `roll-density-band-floor`: a window with 0–1 rolls produces an escalated hard gate on the next uncertain action.
- [ ] Replay fixture `roll-density-band-ceiling`: a window with 6+ rolls produces suppressed/softened gates while a consequence-hardened gate stays hard.
- [ ] Density sensor from issue 01 reflects governor state so band compliance is observable per session.

## Blocked by

Issue 01 (the density sensor and window definition land there).
