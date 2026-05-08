# Continuation Move 1: stakes, not procedural surface

Status: ready-for-agent
Category: bug
**Type:** AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## What to build

`lib/sf2/author/prompt.ts:75`, Continuation Chapter Law move 1: *"Escalate institutional scale, not protagonist scale."*

The intent is correct — don't level up the protagonist; level up the world's pressure on them. But "institutional" is the easiest word to operationalize as "more bureaucracy," and the Author defaults to that interpretation. There is no companion clause anchoring the institutional escalation in a person's life or a specific faction move.

User diagnosis: *"continuation move clarity → its about bigger stakes (rix uncovered the architect with his old fleet, trying to destroy the galaxy), not about more institutional procedure."*

The v0 Stars & Sovereignty playthrough (`~/vaults/brainforest/references/web-clipper/Stars & Sovereignty chapter 2 part 2.md`) demonstrates the right shape. Chapter 2 escalates by:
1. Naming **the Architect** — a pre-Fracture admiral with a heavy cruiser, building something vast and patient. Threat scale up.
2. Introducing **Solitaire** — a mole receiving Pinnacle orders inside Kessrin's command. Personal-trust scale up.
3. Surfacing **Vasek** — a Helix officer with personal motive (lost people at Athex-7) and the Meridian's transponder ID. Hunter scale up.

Three named threats, three faction-anchored stakes, zero procedural inflation. Compare v2's typical continuation: the audit becomes a 4-6 hour Form 9-C with a secondary review.

Rewrite move 1:

> **1. Escalate stakes, not surface area.** The new chapter must reveal a larger threat or a deeper truth — one that *names a person, a faction, or a hidden party* the player now opposes at higher scale than before. Locate the institutional escalation in a specific person's standing, freedom, loyalty, or relationship. **Bigger stakes mean bigger consequences for the people in the chapter, not more procedural surface to navigate.**
>
> A Compact Remnant audit becoming "an officer Rix once trusted now reports the case to internal affairs" is escalation. A Compact Remnant audit becoming "the audit now requires a Form 9-C and a 48-hour secondary review" is not.

Pair with a worked example block:

> *Worked example (v0 Stars & Sovereignty Ch1 → Ch2):*
> - Ch1 surfaced an old fleet rumor and a Helix relay.
> - Ch2 escalates by *naming* what the rumor was — the Architect, a pre-Fracture admiral building something vast and patient — and introduces *Solitaire* (a mole inside Kessrin's command) and *Vasek* (a personal hunter who lost people at Athex-7). Three named threats, three faction-anchored stakes, zero procedural inflation.

## Acceptance criteria

- [ ] Continuation Move 1 rewritten with the stakes-not-surface framing.
- [ ] At least one explicit *bad* contrast (procedural inflation example) included so the LLM sees the wrong shape labeled.
- [ ] Worked example block added (Stars & Sovereignty escalation OR a synthesized equivalent compatible with each genre's example bundle if #01 has shipped).
- [ ] Replay fixtures for continuation chapters re-validated; Author output names a specific person/faction in `continuation_dramatic_turn` at higher rate than baseline.
- [ ] Coordinated with #06 (mechanism vocabulary trim) so the surrounding rule context isn't fighting the rewrite.

## Blocked by

None. Coordinates with #06 (same prompt section) and #05 (`human_stakes` block, which gives this rule a structural anchor).

## Comments

> *The Stars & Sovereignty Architect-reveal is the canonical example of "escalate stakes, not surface area." The whole second chapter pivots on three named threats; nobody fills out a form. v2's Continuation Move 1 currently flattens this pattern into "more institution = more procedure" because the rule has no anchor in human consequence.*

## Agent Brief

**Category:** bug
**Summary:** Reframe Continuation Move 1 so "institutional escalation" cannot collapse into procedural inflation.
**Current behavior:** Authors interpret "Escalate institutional scale" as "add more bureaucratic surface," producing continuation chapters that read as more-of-the-same procedure.
**Desired behavior:** Continuation Move 1 names a person, faction, or hidden party at higher scale; institutional pressure routes through a specific human cost.
**Key interfaces:** `lib/sf2/author/prompt.ts` Continuation Chapter Law section.
**Acceptance criteria:** Issue checklist; continuation replay fixtures.
**Out of scope:** Restructuring the other four continuation moves (move 2-5 are correct as written).
