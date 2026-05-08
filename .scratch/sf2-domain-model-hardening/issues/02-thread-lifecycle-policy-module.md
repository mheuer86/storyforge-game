# Add a thread lifecycle policy module

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** AFK
**Source:** SF2 domain model pruning audit

## What to build

Create one thread lifecycle policy module that owns status meaning, valid transitions, and predicates used by patch application, pressure, indexes, chapter close readiness, and SF2B overlays.

The goal is to replace local status sets with a deep module interface such as `isThreadTerminal`, `isThreadResolved`, `isThreadPressureEligible`, and `isThreadOwnerBackrefEligible`.

## Acceptance criteria

- [ ] Thread statuses are defined once as a const vocabulary used by the type and lifecycle table
- [ ] Valid thread transitions are represented in one table and enforced for Archivist transition writes
- [ ] Local thread status sets are removed from patch validation, pressure runtime, author contract, state indexes, meaning digest, and objective gate where applicable
- [ ] Pressure contribution, owner backrefs, close readiness, and objective outcome semantics all read from the lifecycle policy or named predicates
- [ ] A replay fixture verifies an invalid thread transition is rejected or logged as drift
- [ ] Full SF2 replay suite passes, or focused fixture coverage is reported if full suite cannot run

## Blocked by

None - can start immediately

## Comments

This should be the first implementation slice for thread cleanup. It deletes duplication without changing the durable entity shape yet.

## Agent Brief

**Category:** architecture
**Summary:** Centralize Thread status meaning.

**Current behavior:** Thread status policies are repeated as local sets across multiple modules.

**Desired behavior:** One lifecycle module owns status semantics and transition validity.

**Key interfaces:** `Sf2ThreadStatus`, `apply-patch.ts`, `pressure/runtime.ts`, `pressure/derive.ts`, `author/contract.ts`, `state-indexes.ts`, `sf2b/objective-gate.ts`, `sf2b/meaning-digest.ts`.

**Out of scope:** Moving chapter assignment fields off `Sf2Thread`.

