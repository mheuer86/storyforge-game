# 17 - Add Prose-First Chapter Loop Controller Repair
Status: ready Type: AFK Area: SF2 prose-first prototype / controller repair

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

Implement the `v4d_controller` behavior proven by the experiment:

1. If a non-roll narrator response emits prose but omits `narrate_turn`, retry once with forced `narrate_turn` and no additional prose.
2. If chapter-loop metadata is malformed, especially JSON embedded inside a reason string, repair once with forced `narrate_turn`.
3. If the narrator closes, reframes, or marks close-candidate using Not done facts, retry once with a fact-lock correction.

The repair should preserve already-streamed prose when only metadata is missing. It should not ask the model to rewrite or continue the scene unless the original output cannot be accepted safely.

## Acceptance criteria

- [ ] Missing `narrate_turn` on a completed prose-first response is repaired by a commit-only retry.
- [ ] The repair uses forced `narrate_turn` tool choice and does not stream additional player-facing prose.
- [ ] Malformed chapter-loop metadata is detected and repaired, including JSON stuffed into a string field.
- [ ] Fact-lock validation detects close claims based on code-owned Not done facts.
- [ ] Fact-lock repair clears premature close/pivot state and produces a non-close phase for `compress_no_future` situations.
- [ ] Hard roll gates remain higher priority than commit repair; a required roll is not bypassed by chapter-loop repair.
- [ ] Repair attempts emit diagnostics with reason, before/after phase, and whether prose was reused.
- [ ] Repair retries are bounded to one pass per repair kind to avoid loops.
- [ ] A focused regression fixture covers: missing metadata, malformed metadata, and premature future-fact close.

## Blocked by

- `15-prose-first-chapter-loop-metadata.md`
- `16-prose-first-code-owned-close-advisory.md`
