# Separate Archivist patch lanes by semantic role

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Archivist patch envelope review

## What to build

Clarify the `Sf2ArchivistPatch` envelope by separating its top-level fields into semantic lanes: state write proposals, turn events, memory captures, classifications, and diagnostics.

This does not have to start as a physical refactor. The first slice is to document and enforce the contract so callers, prompts, replay fixtures, and patch application all agree what each lane means and what evidence/confidence/idempotency rules apply.

## Acceptance criteria

- [ ] Every top-level `Sf2ArchivistPatch` field is classified as one of: state write proposal, turn event, memory capture, classification, or diagnostic
- [ ] The patch contract explains which lanes mutate canonical state, which mutate derived/runtime state, which only feed next-turn prompt context, and which are debug-only
- [ ] State write proposals retain partial-accept semantics with explicit confidence and source evidence
- [ ] Turn events have evidence and idempotency rules, especially `ladderFires` and future pressure events
- [ ] Memory captures (`lexiconAdditions`, `emotionalBeats`, revelation hint evidence) either gain lane-specific confidence/evidence rules or are deliberately documented as sidecars
- [ ] `flags` and `coherenceFindings` have distinct names/roles: patch/application diagnostics vs next-turn coherence observations
- [ ] `pacingClassification` is documented as classification input with side effects, or split so pressure mutation inputs are not hidden inside advisory-looking fields
- [ ] Replay fixtures cover malformed/misclassified fields in at least one risky lane: pacing classification, ladder fires, coherence findings, or memory captures

## Blocked by

- 15-pressure-events-with-human-consequences.md informs the shape of the pressure-event lane

## Related / overlap

- `.scratch/sf2-narrative-quality-pass/10-diagnostic-finding-envelope.md`
- `Sf2DiagnosticFinding` and `lib/sf2/diagnostics.ts` appear to be present in the current code. Treat diagnostics as a partially answered lane and focus this ticket on the remaining patch-lane semantics.

## Comments

Current envelope:

```ts
Sf2ArchivistPatch {
  creates
  updates
  transitions
  attachments
  sceneResult
  pacingClassification
  flags
  lexiconAdditions
  emotionalBeats
  revelationHintsDelivered
  revelationsRevealed
  ladderFires
  coherenceFindings
}
```

Working classification:

| Lane | Fields | Meaning |
|---|---|---|
| State write proposals | `creates`, `updates`, `transitions`, `attachments` | Proposed mutations, partially accepted/rejected by code |
| Turn events | `sceneResult`, `ladderFires`, `revelationHintsDelivered`, `revelationsRevealed` | Events the prose made true this turn |
| Memory captures | `lexiconAdditions`, `emotionalBeats` | Sparse durable memory sidecars |
| Classifications | `pacingClassification` | Model classification used by code and pacing advisories |
| Diagnostics | `flags`, `coherenceFindings` | Drift/application diagnostics and next-turn coherence observations |

Possible target shape:

```ts
ArchivistTurnEnvelope {
  stateWrites: WriteProposal[]
  turnEvents: TurnEvent[]
  memoryCaptures: MemoryCapture[]
  classifications: TurnClassification[]
  diagnostics: DiagnosticObservation[]
}
```

Open design questions:

- Should `emotionalBeats` and `lexiconAdditions` become `creates` for first-class entities, or remain sidecars with their own sparse-capture contracts?
- Should `ladderFires` become a `PressureEvent` lane once pressure events exist?
- Should `pacingClassification.worldInitiated` be allowed to trigger pressure reheat, or should that side effect move into an explicit event/classification result?
- Should `flags` be reserved for code/application diagnostics, leaving model-observed drift only in `coherenceFindings`?

## Agent Brief

**Category:** architecture
**Summary:** Make the Archivist patch envelope legible by separating write, event, memory, classification, and diagnostic lanes.

**Current behavior:** `Sf2ArchivistPatch` is one envelope containing mutations, events, classifications, memory captures, and diagnostics. Some fields mutate state without the same confidence/evidence contract as `creates` and `updates`.

**Desired behavior:** Each patch lane has a small, explicit interface. Callers can tell whether a field is a command, event, observation, advisory, or memory capture, and code can validate each lane through the right rules.

**Key interfaces:** `Sf2ArchivistPatch`, `Sf2ArchivistCreate`, `Sf2ArchivistUpdate`, `Sf2ArchivistTransition`, `Sf2ArchivistAttachment`, `Sf2PacingClassification`, `Sf2ArchivistFlag`, `Sf2CoherenceFinding`, `extractTurnTool`, `normalizeArchivistPatch`, `applyArchivistPatch`, `finalizeArchivistTurn`, replay fixtures.

**Out of scope:** Replacing the whole Archivist tool call in one migration.
