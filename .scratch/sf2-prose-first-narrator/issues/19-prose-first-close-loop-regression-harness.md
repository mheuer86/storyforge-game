# 19 - Promote Close-Loop Probe Regression Harness
Status: ready Type: AFK Area: SF2 prose-first prototype / regression testing

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

Turn the close-loop experiment into a repeatable regression harness so the `v4d_controller` behavior can be checked without manually rerunning scratch scripts.

The harness should preserve the eight-probe semantics from the Forty Thousand transcript:

- three no-close probes
- one compress-no-future probe
- one close-candidate-or-plan probe
- one active-revelation-defer probe
- two strict hard-boundary probes

The first version can remain model-backed if necessary, but it should also include deterministic validator tests for controller scoring and repair decisions.

## Acceptance criteria

- [ ] The refined probe expectations are represented in a stable fixture or test input.
- [ ] The controller scoring validates Done / In flight / Not done facts without false positives from Not done phrases.
- [ ] Tests cover `p1` future-fact false close and `p3` active-revelation deferral.
- [ ] Tests cover hard boundary close/reframe behavior.
- [ ] Tests cover malformed nested `chapter_status.reason` recovery.
- [ ] The harness reports tool completion, controller retries, future-fact leaks, active blocker marks, malformed status, and pass/fail by probe.
- [ ] A documented command exists for running the focused close-loop regression.
- [ ] The test path does not require a browser session.

## Blocked by

- `15-prose-first-chapter-loop-metadata.md`
- `16-prose-first-code-owned-close-advisory.md`
- `17-prose-first-controller-repair.md`
