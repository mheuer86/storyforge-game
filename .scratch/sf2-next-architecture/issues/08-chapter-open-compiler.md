# Chapter-Open Compiler: Pacing Contract, Close Conditions, Complication Budget in Code

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / chapter open / turn compiler

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

Replace the Chapter Author model role with a code compiler on the prototype path (PRD assumption C: zero model calls, zero hidden wait). The close loop controller already consumes a `pacingContract` from chapter setup; this compiler becomes that contract's source.

At chapter open, derive from the campaign brief (chapter 1) or the handover documents + typed state (chapter 2+):

- **Pacing contract**: `targetTurns` from the brief's Session Shape section when parseable, else genre defaults (current default min 12 in `lib/sf2/narrator/prose-first-close-loop.ts`).
- **Close conditions**: the clock set and objective statements the close loop's fact-locks will check against — compiled from active clocks in typed state and the brief/Session Brief's chapter shape. These are the close-gate condition source (prompt question 16).
- **Complication budget**: per-genre minimum shares for interpersonal and physical complications, denominated so paperwork cannot be the cheapest complication (Durable Lesson 17). Expressed as private craft notes in the Narrator's system prefix, not as schema entities.

Parsing the brief is heuristic by design: section-header matching over the convergent brief format (GM Style → World → Game System → … → Session Shape, per `.scratch/sf2-prose-first-narrator/PRD.md`). Every fallback to a default is logged as a diagnostic so brief-format drift is visible. The compiler is pure and synchronous — input documents in, contract out — and unit-testable through replay fixtures.

## Acceptance criteria

- [ ] A pure function compiles `{ pacingContract, closeConditions, complicationBudget }` from brief/handover + typed state with zero model calls.
- [ ] Close loop controller consumes the compiled pacing contract and close conditions instead of ad-hoc defaults.
- [ ] Complication budget renders as private craft notes in the system prefix; no new Narrator-visible entity kinds.
- [ ] Heuristic parse failures fall back to genre defaults with a diagnostic per fallback.
- [ ] Chapter open on the prototype path makes no Chapter Author / Arc Author model call and adds no hidden wait.
- [ ] Replay fixture `chapter-open-compile`: a real brief compiles to a stable contract; a malformed brief falls back with diagnostics.
- [ ] Replay fixture `close-gate-firing`: a compiled close condition (full clock / met objective) produces a landing directive within the grace window (named regression from the prompt).

## Blocked by

Nothing (issue 06 consumes its output for chapter 2+, but chapter 1 compilation stands alone).
