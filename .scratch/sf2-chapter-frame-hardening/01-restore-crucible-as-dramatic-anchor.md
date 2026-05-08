# Restore crucible as dramatic anchor

Status: ready-for-agent
Category: feature (prompt + validator)
**Type:** AFK
**Source:** chapter-frame review 2026-05-08, post-first-playthrough findings

## What to build

`chapter_frame.crucible` exists today (`lib/sf2/types.ts:837`, `lib/sf2/author/contract.ts:345`, `lib/sf2/author/transform.ts:173` → `state.chapter.chapterCrucible`, surfaced to Archivist at `lib/sf2/archivist/prompt.ts:475`). But in `lib/sf2/author/prompt.ts:99`:

```
chapter_frame.{active_pressure, central_tension, chapter_scope, objective, crucible}: 1 sentence each (≤25 words)
```

Five fields, no definitions, flat. Authors invent their own meaning for each, and "crucible" collapses into a rephrasing of the others.

The closest thing in the prompt to "the chapter's most important dramatic beat" today is the hard-severity ladder rung (`prompt.ts:60`):

> *"The hard-severity rung (typically step 3) is the chapter's dramatic crystallising beat — the moment the chapter question becomes inescapable."*

That's load-bearing language sitting on a *ladder rung*, not on `crucible`. The crucible has been demoted to a flat free-text frame field while its semantic role has migrated elsewhere.

Restore crucible as the chapter's single dramatic question, tied explicitly to the hard-severity rung. They should be the same thing seen from two angles:
- **Crucible** = the *question* the chapter has to land on. *"Whether Doss's loyalty was ever truly mine."*
- **Hard rung** = the *moment* that asks the question. *"When Doss confesses she set up the lien six months ago."*

Three changes:

**1. Add a load-bearing definition to the field.** Something like:

> *`crucible`: The chapter's single dramatic question. Phrase it as a question, not a state. It must name a person or relationship surface. The hard-severity rung of your pressure ladder is the moment that asks this question.*

**2. Author validator: crucible must reference an NPC id, "the PC", or a named relationship surface.** Permissive heuristic — must contain at least one entity reference or relationship word (trust, loyalty, debt, owed, betrayed, exposed, hunts, knows).

**3. Author validator: crucible must link to the hard-severity ladder rung.** The rung's `narrative_effect` (or `pressure`) must answer (or be a step toward answering) the crucible question. Permissive heuristic: shared NPC id or shared relationship word between crucible and the hard rung.

**4. Worked example pair.** Add a paired good-example block to the prompt:

> *Good crucible: "Whether Doss's loyalty was ever truly mine, or whether she's been the broker route from the start."*
> *Matched hard rung trigger: "When Doss admits she filed the lien herself before the PC arrived at Ossuary."*

## Acceptance criteria

- [ ] `crucible` field gets a load-bearing definition in the prompt: must be phrased as a question, must name a person or relationship surface, must map to the hard-severity ladder rung.
- [ ] Worked good-example pair added (crucible question + matching hard-rung trigger).
- [ ] Author validator: `crucible` must mention an NPC id, "the PC", or a relationship word.
- [ ] Author validator: hard-severity ladder rung must share an entity or relationship reference with `crucible`. Permissive — string overlap on NPC ids OR shared relationship word.
- [ ] Test fixture: crucible `"Will the audit close before the deadline"` fails validation (no entity / relationship reference).
- [ ] Test fixture: crucible `"Whether Doss's loyalty was ever truly mine"` paired with hard-rung trigger naming Doss passes.
- [ ] Replay fixtures pass.

## Blocked by

None. Coordinates with #02 (which may reshape the surrounding frame fields).

## Comments

> *Crucible's demotion was the headline finding from the chapter-author review on 2026-05-08. It's the strongest single restoration available. The hard rung already does the dramatic-crystallization work; tying crucible to it makes both fields earn their slots and gives the Narrator a single question to navigate the whole chapter toward.*

## Agent Brief

**Category:** feature (prompt + validator)
**Summary:** Restore `crucible` as the chapter's single dramatic question, tied to the hard-severity ladder rung.
**Current behavior:** `crucible` is one of five flat frame fields with no definition; collapses into rephrasing of the others; the dramatic-anchor role has migrated to the hard ladder rung without a paired field.
**Desired behavior:** `crucible` is the chapter's single dramatic question, named in PC-stakes terms, paired and validated against the hard-severity rung that makes it inescapable.
**Key interfaces:** `lib/sf2/author/prompt.ts`, `lib/sf2/author/contract.ts`, `lib/sf2/archivist/prompt.ts` (surface as the question, not a flat label).
**Acceptance criteria:** Issue checklist; replay fixtures pass.
**Out of scope:** Removing or merging other frame fields (covered in #02); changes to ladder rung shape itself.
