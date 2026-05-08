# Move chapter thread assignment out of durable Thread

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Thread over-engineering note

## What to build

Move chapter-specific thread scheduling concepts out of durable `Sf2Thread` and into a chapter runtime assignment model. Durable Thread should keep unresolved tension, owner, criteria, pressure history, gates, progress, and successor/predecessor links. Chapter runtime should own whether a thread is the spine, load-bearing, background, new, successor, or deferred for the current chapter.

## Acceptance criteria

- [ ] A chapter thread assignment value object exists and carries chapter-only role/driver fields
- [ ] `Sf2Thread` no longer needs durable `loadBearing`, `spineForChapter`, or `chapterDriverKind` semantics for current-chapter scheduling
- [ ] Author hydration and pressure initialization read chapter assignments rather than mutating durable Thread for scheduling
- [ ] Narrator scene packet still receives the same useful pressure and role information
- [ ] Save normalization migrates existing saves without losing active chapter pressure behavior
- [ ] Replay fixture verifies existing chapter pressure behavior remains stable after migration

## Blocked by

- 02-thread-lifecycle-policy-module.md

## Comments

HITL decision: confirm the exact chapter assignment vocabulary before implementation. Candidate roles: `spine`, `load_bearing`, `active`, `deferred`, `background`, `new`, `successor`.

## Agent Brief

**Category:** architecture
**Summary:** Separate durable Thread identity from chapter scheduling.

**Current behavior:** Durable `Sf2Thread` carries fields that describe how a specific chapter is using it.

**Desired behavior:** Durable Thread represents long-lived unresolved tension; chapter runtime owns per-chapter assignment.

**Key interfaces:** `Sf2Thread`, `Sf2ChapterSetupRuntimeState`, Author hydration, pressure runtime, scene packet tension projection.

**Out of scope:** Rewriting the entire pressure engine.

