# Archivist Extraction Adapter

Status: implemented
Type: AFK

## Agent readiness

Ready for an implementation agent.

No human shaping decision is open. The expected Interface and behavior-preservation boundaries are specified below. Prefer a focused extraction with one route-facing function and named internal steps, plus replay coverage for at least one newer Archivist patch lane.

## What to build

Extract the route-local Archivist tool normalization and runtime-finalization flow into a deeper Module.

Today `app/api/sf2/archivist/route.ts` owns too much after the Anthropic response returns: tool input normalization, fallback telemetry, apply-patch, rejected-write logging, runtime finalization, and response payload shaping. Keep the route responsible for HTTP concerns and the Anthropic call, but move the post-tool-use processing behind a single route-facing Interface.

Target shape:

- New Module under `lib/sf2/archivist/` such as `extraction.ts` or `turn-extraction.ts`.
- Public Interface accepts:
  - current `Sf2State`
  - raw Archivist tool input as `Record<string, unknown>`
  - `turnIndex`
  - `narratorProse`
- Public Interface returns:
  - normalized `Sf2ArchivistPatch`
  - `ApplyPatchResult`
  - summary from `summarizePatchOutcome`
  - runtime finalization result from `finalizeArchivistTurn`
  - normalization telemetry currently produced by `collectArchivistNormalizationTelemetry`
  - rejected-write summary suitable for route logging
- `app/api/sf2/archivist/route.ts` should call this Interface once after finding the `extract_turn` tool use, then build the same JSON response it builds today.

Do not change the Archivist prompt, tool schema, model settings, tool choice, retry behavior, or apply-patch semantics.

The implementer should choose an Interface shape that preserves readability:

- A single route-facing function returning one struct is acceptable if the internal steps stay named and small.
- A small named-method object is also acceptable if it keeps normalization, application, finalization, and response diagnostics visibly distinct.

Avoid creating one 200-line "moved" function that merely relocates the route's current complexity without improving Locality.

## Current files to inspect

- `app/api/sf2/archivist/route.ts`
- `lib/sf2/validation/apply-patch.ts`
- `lib/sf2/runtime/turn-pipeline.ts`
- `lib/sf2/archivist/tools.ts`
- `fixtures/sf2/replay/*revelation*`
- `fixtures/sf2/replay/*pressure*`
- `fixtures/sf2/replay/*coherence*`

## Implementation notes

Move these route-local functions or their equivalent behavior into the new Module:

- `normalizeArchivistPatch`
- `collectArchivistNormalizationTelemetry`
- `arrayRecords`
- `countConfidenceFallback`
- `countHighRiskPayloadFallbacks`
- `normalizePronounAnchorForTelemetry`
- patch-lane normalizers such as emotional beats, revelation hints, revealed revelations, pressure events, coherence findings, creates, updates, transitions, attachments, and flags.

Keep helper visibility conservative:

- Export only the route-facing extraction function unless replay fixtures need a narrow test hook.
- If test hooks are needed, expose them under an explicit `__sf2ArchivistExtractionTestHooks` object.

The route should still:

- validate request body
- compose system blocks
- call Anthropic
- handle missing tool use
- log rejected writes using the rejected-write summary
- return the same response shape

## Acceptance criteria

- [ ] `app/api/sf2/archivist/route.ts` no longer contains the full raw tool normalization implementation.
- [ ] A single Archivist extraction Module owns raw tool input -> normalized patch -> applied/finalized result.
- [ ] The extraction Module has named internal steps or a small named-method Interface; it is not one large relocated route function.
- [ ] Response JSON fields remain compatible: `nextState`, `patch`, `outcomes`, `deferredWrites`, `drift`, `summary`, `faceShift`, `ladderFired`, `pruneSummary`, `coherenceFindings`, `invariantEvents`, `normalization`, `usage`, `latency`.
- [ ] Rejected writes are still logged with write ref, reason, and confidence tier.
- [ ] Normalization telemetry still reports the same fallback counter categories.
- [ ] No prompt/tool schema/model behavior changes.
- [ ] Existing SF2 replay fixtures pass.
- [ ] Add or extend one focused fixture or replay assertion that exercises raw Archivist normalization for at least one newer lane: `revelation_hints_delivered`, `revelations_revealed`, `pressure_events`, or `coherence_findings`.

## Verification

Run:

```bash
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If full replay cannot run, run the focused changed fixture and state why full replay was skipped.

## Blocked by

None - can start immediately.
