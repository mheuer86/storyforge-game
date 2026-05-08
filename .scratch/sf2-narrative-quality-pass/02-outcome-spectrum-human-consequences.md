# Reframe outcome spectrum to human consequences

Status: verified-built
Category: feature
**Type:** AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## Reconciliation

2026-05-08 status pass: verified built. Evidence: Author prompt and validators require human outcome anchors; `author-outcome-spectrum-rejects-procedural-only.json` passed.

## What to build

`lib/sf2/author/prompt.ts:94`: `chapter_frame.outcome_spectrum.{clean, costly, failure, catastrophic}` constrains each to "1 sentence each (≤18 words)." There is no constraint that outcomes name a *human* consequence. Authors default to procedural framings — *"clean: the audit closes without exposure"* — which read as factual state changes rather than stakes the player cares about.

User diagnosis: *"human consequences in outcome spectrum — why does it matter, not only what it does factually."*

Reframe the schema and prompt to require each outcome answer a human-stakes question, not a state-fact:

- **clean:** *who do you still have / what trust survives?* (e.g. "Kessrin still calls you back; Laine's promise still feels reachable.")
- **costly:** *who has cooled / what are you now obligated to?* (e.g. "Renn now treats you as an asset to deploy; Patel's second bottle is owed.")
- **failure:** *who is now exposed / what hunts you?* (e.g. "Vasek now has your transponder ID; Sable's contact is burned.")
- **catastrophic:** *what broke open that won't reseal?* (e.g. "Solitaire knows your face; the beacon corridor is hostile to your registry forever.")

Keep the 1-sentence cap but require the sentence answer the human question, not describe the procedure's outcome. Update the field's prompt-side guidance and add a validator check that rejects outcomes whose sole content is a state-fact ("the audit closes," "the warrant releases," "the cipher fails").

Heuristic for the validator: must contain at least one named entity (NPC id, faction name, or character role) OR a relationship word (trust / cooled / owed / burned / exposed / hunts / knows / promise / debt / cost).

Touches:
- `lib/sf2/author/prompt.ts` (field caps + new framing rules around `outcome_spectrum`)
- `lib/sf2/author/contract.ts` (validator: reject procedural-only outcomes)
- Replay fixtures may need updates to pass the stricter validator

## Acceptance criteria

- [ ] Author prompt's `chapter_frame.outcome_spectrum.*` field guidance rewritten to ask the human-stakes question for each outcome tier.
- [ ] Worked example block added to the prompt with a clean/costly/failure/catastrophic set that names NPCs and consequences (not state changes).
- [ ] Validator rejects outcome strings that contain no NPC/faction/relationship/cost reference. Allowed list maintained alongside the validator.
- [ ] Test fixture: outcome `"the audit closes without exposure"` fails validation.
- [ ] Test fixture: outcome `"Kessrin still calls you back; Laine's promise still feels reachable"` passes.
- [ ] Replay fixtures regenerated or explicitly updated.

## Blocked by

None. Coordinates with #05 (`human_stakes` block) — outcome spectrum and human stakes are sibling concerns; if both ship, the outcome spectrum can reference `human_stakes` entries directly.

## Comments

> *The outcome spectrum is the chapter's contract with the player about what's at stake. Procedural-only outcomes train the Narrator to manifest the chapter as state-management; human-anchored outcomes give the Narrator a roster of stakes to escalate. Pairs with the pressure-manifestation contract shipped to narrator/prompt.ts on 2026-05-08.*

## Agent Brief

**Category:** feature
**Summary:** Make chapter outcome spectrum mandate human consequences, not procedural state changes.
**Current behavior:** Outcomes can be procedural ("the audit closes"), passing validation despite naming no human stake.
**Desired behavior:** Each outcome names who is kept/lost/owed/exposed/hunted; validator enforces this.
**Key interfaces:** `author/prompt.ts` (field caps, outcome_spectrum guidance), `author/contract.ts` (validator).
**Acceptance criteria:** Issue checklist + Author replay fixtures.
**Out of scope:** Reshaping the outcome tier definitions (clean/costly/failure/catastrophic stay).
