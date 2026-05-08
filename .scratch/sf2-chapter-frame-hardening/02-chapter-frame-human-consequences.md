# Chapter frame human-consequence framing + `chapter_scope` decision

Status: ready-for-agent
Category: feature (prompt + validator)
**Type:** HITL → AFK
**Source:** chapter-frame review 2026-05-08

## What to build

`lib/sf2/author/prompt.ts:99` lists five `chapter_frame` descriptive fields with no human-consequence requirement:

```
chapter_frame.{active_pressure, central_tension, chapter_scope, objective, crucible}: 1 sentence each (≤25 words)
```

These are the fields the Narrator reads first when running a chapter. They set the tone for everything downstream. Without a human-consequence requirement, Authors produce procedurally-shaped frames:

- *active_pressure: "The compliance review threatens the PC's standing"*
- *central_tension: "Will the audit close before the deadline"*
- *objective: "Clear the lien before the window closes"*

All formally compliant, all procedurally-shaped, all priming the Narrator for procedural prose.

The outcome spectrum got this treatment in the narrative-quality pass (`prompt.ts:119` — *"each naming who is kept, owed, exposed, hunted, cooled, or broken"*). The frame fields themselves didn't. **Mirror the treatment here.**

### Part 1: human-consequence framing for the surviving frame fields

Each must name a person, faction, or relationship cost. Worked good examples:

- *active_pressure: "Vantabloc holds Doss's debt; if she fails, they collect from her family on Kess-Prime."*
- *central_tension: "Whether the PC keeps Doss as a trusted second, or recognizes her as the broker who set them up."*
- *objective: "Get Doss's word on the buyer at the far end before the corridor opens — and decide whether to confront her about the lien before then."*

Bad examples to label:
- *active_pressure: "The compliance review threatens the PC's standing."* — no person named.
- *central_tension: "Will the audit close before the deadline."* — no relationship surface.
- *objective: "Clear the lien."* — pure procedural goal.

### Part 2: HITL on `chapter_scope`

`chapter_scope` is the weakest-named field on the frame. "Scope" defaults toward procedural surface ("the docking arm and its clearance system"). Among the five fields it's the one most likely to be filled with procedural texture and least likely to add value the others don't.

User lean: **delete it.**

Two options:

- **A. Delete.** Drop from contract, prompt, persistence normalization. Migration: existing saves' `chapter_scope` values are dropped; replay fixtures regenerated.
- **B. Repurpose as `human_surface_area`.** Define it as the relationships, factions, and stakes in play this chapter — explicitly distinct from `crucible` (single question) and `objective` (concrete chapter goal). Worked example: *"Doss, Vantabloc, the Compact Remnant scan authority at Ossuary, and the PC's reputation among independent crews."*

User direction: pre-implementation HITL, leans option A.

### Coordination with #01

If #01 (crucible restoration) ships first, the surviving frame fields are: `crucible`, `central_tension`, `active_pressure`, `objective`. Possibly mergeable to fewer:
- `crucible` = the question
- `central_tension` = the relationship/stakes axis
- `active_pressure` = the institutional + human pressure now bearing on the PC
- `objective` = the concrete chapter goal

That's distinct enough to keep all four, as long as each has a definition and human-consequence requirement.

## Acceptance criteria

- [ ] HITL decision on `chapter_scope`: delete or repurpose. Decision recorded in this ticket before implementation.
- [ ] Each surviving frame field gets a human-consequence-framed definition in the prompt: must name an NPC id, faction, or relationship surface.
- [ ] Worked good/bad examples added for each surviving field.
- [ ] Author validator: each frame field must mention at least one NPC id, faction id, or relationship word (trust, loyalty, debt, owed, cooled, exposed, hunts, betrayed, knows).
- [ ] Test fixture: frame field `"the audit closes before the deadline"` fails validation.
- [ ] Test fixture: frame field `"Whether Doss's loyalty was ever truly mine"` passes.
- [ ] If `chapter_scope` is deleted: type, contract, prompt, persistence, and replay fixtures all updated.
- [ ] Replay fixtures pass.

## Blocked by

HITL decision on `chapter_scope`. Coordinates with #01.

## Comments

> *The frame fields are the chapter's contract with the Narrator. Procedural framing here primes procedural prose throughout the chapter. The outcome spectrum got the treatment in the prior pass; the frame's own descriptive fields shouldn't be exempt.*

## Agent Brief

**Category:** feature (prompt + validator)
**Summary:** Apply human-consequence framing to `chapter_frame`'s descriptive fields; decide `chapter_scope`'s fate.
**Current behavior:** Frame fields accept procedural framings without validation; `chapter_scope` is the weakest-named and most procedurally-prone field.
**Desired behavior:** Each surviving frame field names a person, faction, or relationship cost. `chapter_scope` is deleted or repurposed.
**Key interfaces:** `lib/sf2/author/prompt.ts`, `lib/sf2/author/contract.ts`, `lib/sf2/types.ts` (if `chapter_scope` is removed), persistence normalization.
**Acceptance criteria:** Issue checklist; replay fixtures pass.
**Out of scope:** Crucible restoration (#01); antagonist_field changes (#03).
