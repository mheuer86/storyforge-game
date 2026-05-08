# `opening_scene_spec.immediate_choice`: remove or demote

Status: proposed
Category: refactor (field decision)
**Type:** HITL
**Source:** chapter-frame review 2026-05-08

## What to build

`opening_scene_spec.immediate_choice` (`lib/sf2/author/prompt.ts:101`) is a 1-sentence ≤28-word field describing the player's first decision moment of the chapter.

Continuation chapters get an anti-procedural guard at `prompt.ts:341`:

> *"If the opening's immediate choice is just wait/read/answer/scan/clear/lock before a timer, the setup is invalid."*

User position: **the guard exists *because the field invites the failure mode it's guarding against*.**

The whole concept of "the immediate choice" pre-determines the player's first turn. Authors reach for the most concrete, literal choice when forced to commit to one — and the most concrete, literal first choice in v2 chapters is overwhelmingly procedural ("decide whether to sign", "decide whether to wait for the timer", "decide whether to scan the cargo"). The field's structure pulls toward the bug.

### Argument for removal

- The Narrator already has enough to compose the first turn from `opening_scene_spec.{location, atmospheric_condition, initial_state, first_player_facing}` plus, on continuation chapters, `dramatic_situation`, `first_visible_pressure`, `first_human_or_institutional_move`. None of these need an Author-pre-scripted "the immediate choice."
- A pre-scripted choice biases the Narrator toward presenting *that* choice rather than letting the scene's pressure guide the first beat naturally.
- The post-pass playthrough (260508) shows the Narrator opening turns work without depending on `immediate_choice` for shape — the prose flows from the established situation, NPCs, and pressure.
- Removing one field reduces the Author's prompt cost slightly and removes one place procedural framing can leak in.

### Argument for keeping (and tightening)

- A clear first-action surface helps the Narrator avoid drifting into pure exposition on turn 1.
- Removing it means the Narrator has more freedom but also more room to write a no-op opening turn.
- Some chapters genuinely *do* hinge on a binary first-choice moment (a betrayal forcing a snap reaction, a hostile NPC entering with a demand). Pre-scripting that helps.

### The decision

This ticket is HITL. Two options:

- **Option A: delete the field.**
  - Migration: drop from `Sf2OpeningSceneSpec` in `types.ts`, remove from prompt instructions, remove from contract validator, remove from any narrator scene-packet rendering, regenerate replay fixtures.
  - Risk: some Ch1 openings might land softer without a forced first beat. Mitigation: extend the existing "first_player_facing" (Ch1) and "first_human_or_institutional_move" (Ch2+) fields to cover the gap — they already imply an actionable opening surface without pre-scripting the choice.

- **Option B: demote and tighten.**
  - Make `immediate_choice` optional in the contract.
  - Soften the prompt guidance: "if the chapter genuinely hinges on a binary first beat, name it; otherwise omit and let the Narrator's first turn unfold from the scene pressure."
  - Extend the anti-procedural guard from continuation chapters to Ch1.

User lean: **removal**.

## Acceptance criteria

- [ ] HITL decision: delete or demote. Recorded in this ticket before implementation.
- [ ] If delete: field removed from `Sf2OpeningSceneSpec`, prompt, contract validator, narrator scene packet (if it references the field), and persistence normalization. Replay fixtures regenerated. Sample post-change opening manually reviewed: the Narrator still produces a usable opening turn.
- [ ] If demote: field marked optional in contract; prompt guidance softened; anti-procedural guard extended to Ch1. Validator rejects the wait/read/answer/scan/clear/lock-before-timer pattern on Ch1 too.
- [ ] Replay fixtures pass either way.

## Blocked by

HITL decision (delete vs demote).

## Comments

> *The continuation guard ("invalid if just wait/read/answer/scan...") is a tell that the field invites the bug. Better to remove the source than guard the symptom. Save it as Option B in case removal turns out to soften openings more than expected.*
>
> *Order this last among the chapter-frame-hardening tickets. The other four are content cleanups within the existing field set; this one questions whether a field should exist at all, which is easier to reason about once the rest of the frame is settled.*

## Agent Brief

**Category:** refactor (field decision)
**Summary:** Decide whether `opening_scene_spec.immediate_choice` earns its slot; remove or demote.
**Current behavior:** Field is required; biases Narrator toward pre-scripted first choices; anti-procedural guard exists for continuation chapters but not Ch1.
**Desired behavior:** Either field is gone (option A) or it is optional with consistent anti-procedural guarding (option B).
**Key interfaces:** `lib/sf2/types.ts`, `lib/sf2/author/contract.ts`, `lib/sf2/author/prompt.ts`, `lib/sf2/retrieval/scene-packet.ts` (if it surfaces the field), persistence normalization.
**Acceptance criteria:** Issue checklist; replay fixtures pass; post-change opening manually reviewed for usability.
**Out of scope:** Other `opening_scene_spec` fields.
