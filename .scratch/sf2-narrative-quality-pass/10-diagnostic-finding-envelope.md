# Diagnostic finding envelope

Status: ready-for-agent
Category: feature (engineering hygiene)
**Type:** AFK
**Source:** narrative-quality pass + `sf2-domain-model-pruning.md` audit (2026-05-08, proposal #7)

## What to build

The audit identified five advisory/diagnostic concepts that overlap in shape:

- Archivist flags
- coherence findings (`Sf2CoherenceFinding`)
- display sentinel findings (`Sf2DisplaySentinelFinding`)
- replay invariant events (`ReplayInvariantEvent`)
- pending recovery/coherence notes (runtime `pending*` fields)

Each emits "something noteworthy happened" with its own shape, severity convention, and lifecycle. Useful observations end up ad hoc; common queries (e.g. "what's open right now") require touching every shape.

Proposed shared envelope:

```ts
type Sf2DiagnosticFinding = {
  id: string
  source: 'archivist' | 'coherence' | 'sentinel' | 'replay' | 'pending'
  kind: string                               // source-specific subtype
  severity: 'info' | 'warn' | 'error'
  entityRefs: Sf2EntityRef[]
  turnId?: string
  message: string
  status: 'open' | 'acknowledged' | 'resolved' | 'ignored'
  payload?: unknown                          // specialized data per source
}
```

Specialized payloads stay in `payload`. The envelope makes diagnostics queryable, comparable, and lifecycle-aware.

## Acceptance criteria

- [ ] `Sf2DiagnosticFinding` type added.
- [ ] Each existing finding type adapted to emit the envelope (in addition to or instead of its current shape — depending on migration cost).
- [ ] Diagnostics panel (`components/sf2/diagnostics-panel.tsx`) consumes the envelope.
- [ ] At least one cross-source query (e.g. "all open `error`-severity findings for entity X") demonstrates the value.
- [ ] Replay invariant events keep their existing semantics (don't break replay-test infrastructure).
- [ ] Replay fixtures pass.

## Blocked by

None. Pre-pass: low regression risk (mostly a wrapper around existing emissions), and it actively helps debug the post-pass playthrough by making findings cross-source-queryable.

## Comments

> *Originally staged post-pass on the assumption that engineering hygiene shouldn't run during the A/B window. On reflection: the envelope is additive (existing emissions can keep working alongside the new shape), regression risk is low, and unified diagnostics will help diagnose any A/B regressions faster. Pre-pass.*

## Agent Brief

**Category:** feature (engineering hygiene)
**Summary:** Unify five overlapping diagnostic/advisory shapes under one envelope with shared severity, source, status, and entity-ref fields.
**Current behavior:** Each finding type has its own shape; cross-source queries require ad hoc traversal.
**Desired behavior:** One envelope; specialized payloads kept in a typed `payload` slot; diagnostics queryable as a single stream.
**Key interfaces:** `lib/sf2/types.ts`, all diagnostic emission sites (Archivist, coherence, sentinel, replay, pending), `components/sf2/diagnostics-panel.tsx`.
**Acceptance criteria:** Issue checklist; replay fixtures pass; replay-test infrastructure intact.
**Out of scope:** Replacing replay invariant events outright (preserve their existing semantics for the replay test infrastructure); the larger Thread lifecycle module from audit #1.
