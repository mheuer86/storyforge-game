# Investigation Procedure Synthesis

Status: needs-triage
Labels: needs-triage
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Add a stateful investigation procedure that sits alongside clues. It should synthesize evidence into known facts, live hypotheses, contradictions, unresolved questions, and next leads, while keeping procedure facts out of the clue lane unless they are true investigation evidence.

Investigation should compose with other beat modes and procedures. A planning table can contain investigation synthesis. A social scene can surface a lead. An access/infiltration beat can reveal evidence. The system should not lose clue-tier guidance just because the current surface is social, planning, or access/infiltration.

## Definitions

- **Procedure fact** (procedure lane) — describes the world's current procedural state. Examples: "the west stair is watched after vespers", "the ICE trace runs every third packet", or "the hangar has 11 personnel during unload." Lives on the relevant procedure runtime.
- **Clue** (investigation lane) — evidence that supports, contradicts, or qualifies a hypothesis about the active investigation question. Examples: construction codes imply compartment conversion, a noble seal contradicts a corpse's clothing, an access log names an impossible user. Lives on investigation runtime.
- **Discriminator rule** — a piece of information is a *clue* if removing it would weaken or invalidate a live hypothesis or open question. Otherwise it is a procedure fact or background texture.
- **Synthesis** — derived structure that organizes clues into:
  - `known_facts` — confirmed claims that no live hypothesis contests.
  - `hypotheses` — proposed explanations with supporting clue refs and a status (`live` | `superseded` | `disproved`).
  - `contradictions` — pairs of clues or hypothesis-vs-clue conflicts that need resolution.
  - `open_questions` — explicit unresolved questions driving the investigation.
  - `next_leads` — actionable follow-ups (locations to check, NPCs to question, rolls to try).

## Activation criteria

Investigation procedure becomes active when **either** of:

- The player explicitly opens an investigation (claims a question, names a mystery, asks "what's going on here?").
- ≥2 clues exist with no active investigation procedure (auto-promotes; the procedure exists to organize them).

Investigation remains active across beat modes (`planning`, `social`, `exploration`, `access_execution`) as a non-exclusive overlay. It does not become active during pure `social` chapters that have no live questions.

## Acceptance criteria

- [ ] Investigation procedure activates per the criteria above; auto-promotes when ≥2 clues accumulate without an active procedure.
- [ ] Investigation synthesis remains active across `planning`, `social`, `exploration`, and `access_execution` beat modes without exclusive module selection.
- [ ] Clues stay distinct from procedure facts; the discriminator rule (would removal weaken a live hypothesis or open question?) is enforced in Archivist validation.
- [ ] Validator/deduper preserves clue, hypothesis, contradiction, open question, next lead, and procedure fact boundaries; related records are linked rather than merged across lanes.
- [ ] Case synthesis schema includes `known_facts`, `hypotheses` (with `live` | `superseded` | `disproved`), `contradictions`, `open_questions`, and `next_leads`.
- [ ] Hypotheses can transition: `live` → `superseded` (better hypothesis exists), `live` → `disproved` (contradicted by confirmed clue).
- [ ] Archivist validation routes routine procedural texture to procedure facts (or rejects), not to clues.
- [ ] Retrieval presents synthesis to the Narrator as a bounded packet (target ~300 tokens).
- [ ] The UI exposes a compact case-board panel showing live hypotheses, top contradictions, and next leads when investigation is active.
- [ ] A replay fixture covers two clues combining into a new live hypothesis, with the prior weaker hypothesis transitioning to `superseded`.
- [ ] A replay fixture covers a procedure fact (e.g. guard rotation timing, ward cycle, or trace interval) being correctly classified as procedure-lane, not clue-lane.
- [ ] A genre-neutral fixture covers clue synthesis in a noir case, grimdark conspiracy, or cyberpunk breach without changing schema shape.
- [ ] A dedup fixture proves a procedure fact and a clue that mention the same object remain distinct when they serve different semantic roles.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
