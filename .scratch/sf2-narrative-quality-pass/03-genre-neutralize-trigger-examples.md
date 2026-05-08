# Genre-neutralize trigger-discipline examples

Status: verified-built
Category: bug
**Type:** AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## Reconciliation

2026-05-08 status pass: verified built. Evidence: trigger examples are sourced from `getSf2GenreExamples` and interpolated by the Author prompt instead of hard-coded single-world examples.

## What to build

`lib/sf2/author/prompt.ts:54-63` lists "good" pressure-ladder trigger examples to teach the Author what entity-bound, scene-invariant triggers look like. Five of the six "good" examples are bureaucratic actions:

- *"When a settlement member directly contradicts the official ledger record in front of authority."*
- *"When the PC submits a written objection that survives Corvin's first procedural rebuttal."*
- *"Coll files a secondary notice"*
- *"Orvath formally invokes process"*
- *"Fen Sollar attempts to disengage from the Warden"* (the only non-procedural one)

Effect: even within the Hegemony genre, the trigger-discipline rule trains the Author to produce paperwork-shaped escalations. Cross-genre, the bias is worse — Space Opera, Cyberpunk, Noir Authors learn that "good" means filing/invoking/submitting/contradicting-records.

User diagnosis: *"even in the hegemony setting no one has fun filing forms to fight procedure."*

Replace the procedural good-examples with entity-bound, scene-invariant, NON-procedural triggers. Examples that meet the rule's discipline without modeling bureaucracy:

- *"When [an NPC] refuses [another NPC]'s instruction in front of a third party still present in the chapter."*
- *"When the secret the chapter has been protecting is named aloud where a hostile NPC can hear."*
- *"When a previously passive witness chooses a side."*
- *"When the NPC the player most trusts cools a disposition tier without warning."*
- *"When a third party calls in a debt the PC owed and forgot."*
- *"When the trusted retainer refuses to take a written order in front of a third witness."*

Each is entity-bound (pivots on a named NPC's action), scene-invariant (survives location change), and non-procedural (no filing, no forms, no compliance review). Same discipline, different palette.

Note: this overlaps with ticket #01 (v1-style genre injection). If #01 ships first, the genre-neutral examples land in the per-genre struct (`Sf2GenreExamples.entityBoundTriggers`); otherwise they replace the hardcoded Hegemony examples directly. Either order works; the content fix is independent of the architectural fix.

## Acceptance criteria

- [ ] Five Hegemony-bureaucratic good-examples replaced (in-place or via per-genre struct from #01).
- [ ] At least three of the new good-examples are non-procedural (no filing/invoking/submitting/compliance language).
- [ ] All replacements remain entity-bound (pivot on a named NPC's action, not a scene element).
- [ ] All replacements remain scene-invariant (would survive a chapter moving from a hearing room to a corridor).
- [ ] `validateAuthorSetup` ladder check (sf2-code-review-issues #06) still passes the new good-examples.
- [ ] If #01 has not shipped, the bad-examples (`author/prompt.ts:61-62`) also lose their Hegemony names ("Fen Sollar" → "[an NPC]", "the seeker" → "the PC").

## Blocked by

None. Coordinates with #01 if both ship.

## Comments

> *User-flagged in sparring 2026-05-08: filing forms is not fun in any genre, and modeling it as "good" pressure-ladder behavior is one of the strongest contributors to the procedural-trope leak.*

## Agent Brief

**Category:** bug
**Summary:** Replace bureaucratic trigger examples with non-procedural ones that preserve entity-bound, scene-invariant discipline.
**Current behavior:** Author trains on "Coll files a secondary notice" / "Orvath formally invokes process" / "submits a written objection" as canonical good triggers, biasing toward paperwork escalation.
**Desired behavior:** Trigger examples model relational, exposure, refusal, and debt-call moves; same discipline, non-procedural surface.
**Key interfaces:** `lib/sf2/author/prompt.ts:54-63` (rule 21 good/bad examples) and `:61-62` (rule 22 entity-bound contrast pair).
**Acceptance criteria:** Issue checklist; verify Author replay fixtures.
**Out of scope:** Refactoring the per-genre injection structure (#01 covers that); adding new validator checks (already covered by sf2-code-review-issues #06).
