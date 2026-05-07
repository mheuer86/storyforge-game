# Chapter Author Uses a Canon Continuity Lock

Status: needs-triage
Type: AFK
Area: SF2B / Author / chapter handoff

## Parent

`.scratch/sf2b-continuity-locked-hooks/PRD.md`

## What to build

Build a compact, code-derived continuity lock for Chapter 2+ Author calls.

The lock should capture exact facts the next chapter must preserve: established NPC names, current location and route geometry, cargo facts, unresolved contacts, open promises, active threads, and the previous chapter's closing position. The Author may create a new hook and tension score from those facts, but it may not replace Calla Voss with a different broker, Sable Notch with a different port, or the unresolved tail/cutter with unrelated faction pressure unless it explicitly bridges the change.

## Acceptance criteria

- [ ] SF2B derives a `continuityLock` or equivalent payload before Chapter Author calls.
- [ ] The lock includes exact canonical names/ids for carried NPCs, locations, route facts, open cargo facts, active thread ids, unresolved contacts, and recent closing geometry.
- [ ] The Author prompt treats locked facts as hard constraints, not inspiration.
- [ ] Any Author-emitted tension score references locked entity/thread ids for carried pressure lines instead of creating parallel replacements.
- [ ] Author output is validated against the lock before persistence; unbridged name/location/relation replacement is rejected or repaired.
- [ ] A fixture from the SF2B Chapter 1 shape fails if Chapter 2 introduces a replacement broker/location without preserving `Calla Voss`, `Sable Notch`, `Redline/Carrow`, and the unresolved tail/cutter pressure.
- [ ] Valid Author output can still time-jump, relocate, or introduce new NPCs when it explicitly bridges from the locked facts.

## Blocked by

- [SF2B Mode Continuity and Export Identity](01-sf2b-mode-continuity-and-export-identity.md)

## Out of scope

- Freezing all prior facts forever.
- Preventing new chapter pressure.
- Making the Author repeat Chapter 1 instead of escalating it.

## Comments

This ticket names the hybrid: canon is strict; drama is free.
