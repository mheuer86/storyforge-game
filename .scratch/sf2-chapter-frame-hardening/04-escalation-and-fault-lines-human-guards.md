# Escalation options + moral fault lines: human-consequence guards

Status: ready-for-agent
Category: feature (validator + prompt)
**Type:** AFK
**Source:** chapter-frame review 2026-05-08

## What to build

The narrative-quality pass added human-consequence guards to two surfaces:
- `pressure_ladder` (`lib/sf2/author/prompt.ts:109`): procedural-surface rungs must name who pays, who gains leverage, who is exposed.
- `outcome_spectrum` (`lib/sf2/author/prompt.ts:119`): each outcome must name who is kept, owed, exposed, hunted, cooled, or broken.

Two adjacent surfaces of escalation didn't get the same treatment:

### `escalation_options[].{condition, consequence}`

`author/prompt.ts:113`. No human-consequence requirement. Authors can write entries like:

- *condition: "the corridor narrows", consequence: "the route closes"* — purely procedural.
- *condition: "the audit deadline hits", consequence: "the lien escalates"* — bureaucratic mechanics.

These pass validation today. They primes the Narrator to treat escalation as state-machine mechanics rather than pressure on people.

### `moral_fault_lines[].{tension, side_a, side_b, why_it_hurts}`

`author/prompt.ts:112`. No anti-procedural guard. Authors can produce:

- *tension: "Comply with the audit vs. resist it"* — that's a procedural choice, not a moral fault line.
- *tension: "Sign now vs. wait for the secondary review"* — same problem.

A real moral fault line names a *human cost* on each side:
- *tension: "Protect Doss's family in Kess-Prime vs. expose her broker network to clear your own name."*
- *side_a: "Doss's family stays unmarked, but the PC stays under Vantabloc's lien."*
- *side_b: "The PC is clear, but Doss's family becomes a target the PC chose to make targetable."*

### The fix

Apply the same rule pattern that `pressure_ladder` got. For each surface:
- If the entry names a procedural surface (audit, filing, log, deadline, permit, ledger, queue, gate, route, scan), the entry must also name who pays / who gains leverage / who is exposed / what relationship surface worsens.
- For `moral_fault_lines`, "side" cannot be only a procedural action — each side must name an NPC, faction, or relationship cost.
- Add worked good/bad examples to each.
- Author validator catches procedural-only entries.

## Acceptance criteria

- [ ] `escalation_options` field guidance gets the human-consequence pair rule (mirror of `pressure_ladder` rule at `prompt.ts:109`).
- [ ] `moral_fault_lines` field guidance: must name a person, faction, or relationship cost on each side; "side" cannot be only a procedural action.
- [ ] Worked good/bad examples added for each.
- [ ] Author validator rejects:
  - escalation_options entries that name a procedural surface without naming who pays
  - moral_fault_lines entries where neither `side_a` nor `side_b` names an NPC, faction, or relationship word
- [ ] Test fixture: moral fault line `"Comply with the audit vs. resist it"` fails validation.
- [ ] Test fixture: moral fault line `"Protect Doss's family vs. expose her broker network"` passes.
- [ ] Test fixture: escalation_option `condition: "deadline expires", consequence: "secondary review opens"` fails validation.
- [ ] Test fixture: escalation_option `condition: "Vantabloc's broker contacts the PC's prior client", consequence: "the prior client cools toward the PC"` passes.
- [ ] Replay fixtures pass.

## Blocked by

None.

## Comments

> *The pressure-ladder guard from the prior pass is the model. Apply it consistently to the other escalation surfaces so Authors can't get away with procedural framing on any of them. This is pure pattern-mirroring; the rule shape is already validated, just unapplied here.*

## Agent Brief

**Category:** feature (validator + prompt)
**Summary:** Apply pressure-ladder-style human-consequence guards to `escalation_options` and `moral_fault_lines`.
**Current behavior:** Both surfaces accept procedurally-shaped entries without validation, despite `pressure_ladder` and `outcome_spectrum` having the guard.
**Desired behavior:** Procedural-surface entries must pair with named human consequence; moral fault lines must name people, factions, or relationship costs on each side.
**Key interfaces:** `lib/sf2/author/prompt.ts`, `lib/sf2/author/contract.ts`.
**Acceptance criteria:** Issue checklist; replay fixtures pass.
**Out of scope:** Restructuring the entry shapes themselves; renaming fields.
