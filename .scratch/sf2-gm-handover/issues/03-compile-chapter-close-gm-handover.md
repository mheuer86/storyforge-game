# Compile Chapter-Close GM Handover

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / chapter close / GM handover

## Parent

`.scratch/sf2-gm-handover/PRD.md`

## What to build

Compile a Pale-Flame-style chapter-close handover artifact from existing chapter-close evidence.

At chapter close, after Chapter Meaning and playstyle personalization run, produce a readable handover artifact for the next chapter. It should combine Chapter Meaning, deterministic state, playstyle profile, rulebook interpretations, clocks/tensions, active roster, recent scene summaries, and unresolved promises into GM memory, next-session brief, and quick reference sections.

Fold in the V3 Chapter Meaning lessons: preserve what the chapter did to people, who the player became in others' eyes, irreversible changes, relationship deltas, owed next scenes, unresolved questions, recurring images/objects, and explicit do-not-restage constraints.

This slice should not remove Chapter Author yet. It creates the handover artifact and makes it visible in diagnostics/export.

Prefer integrating this into the existing Chapter Meaning synthesis path first. If the single role/tool becomes too large or unreliable, split a separate Continuity Editor later.

## Acceptance criteria

- [ ] Chapter close stores a migration-safe GM handover artifact for the next chapter.
- [ ] The first implementation attempts to extend/wrap Chapter Meaning rather than adding an unrelated continuity role.
- [ ] The artifact includes GM memory, next-session brief, and quick reference sections.
- [ ] The artifact includes a next Current Story Surface seed for the next chapter opening.
- [ ] The artifact includes question-shaped unresolved obligations with progress and fake-progress hints.
- [ ] The artifact includes irreversible changes, relationship deltas, owed next scenes, recurring images/objects, and do-not-restage constraints from Chapter Meaning and state evidence.
- [ ] The artifact includes chapter motion material: chapter job, candidate major deltas, phase/current-phase notes, and any missed/owed movement from the closing chapter.
- [ ] GM memory captures player technique, PC interpretation, craft lessons, and error/avoid-pattern memory with evidence when available; it does not fabricate a mature error memory from one chapter.
- [ ] The session brief captures setting deltas, clocks/tensions, active roster, open evidence, opening conditions, chapter shape, and explicit do-not-restage constraints.
- [ ] Pressure items are converted into embodied pressure: who pays, what hurts, visible image, and next choice pressure.
- [ ] The quick reference captures stats/mechanics, core tensions, active clocks, carried items/evidence, drives, and companion/faction watchpoints.
- [ ] Playstyle personalization and campaign rulebook interpretation remain separate sections and are not collapsed into generic summary.
- [ ] The compiler fails open: chapter transition can continue without a handover artifact.
- [ ] If handover prose contradicts structured state, diagnostics flag the divergence and the structured state remains authoritative.
- [ ] Diagnostics/export include the handover and validation findings.
- [ ] Focused fixture coverage proves Chapter Meaning + playstyle + state compile into the expected handover fields.

## Blocked by

- `.scratch/sf2-playstyle-personalization/issues/02-persist-artifacts-and-rolling-profile.md`
- `.scratch/sf2-playstyle-personalization/issues/06-campaign-rulebook-interpretation-contract.md`
