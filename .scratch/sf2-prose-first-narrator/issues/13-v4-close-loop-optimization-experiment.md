# 13 - V4 Close-Loop Optimization Experiment
Status: scaffolded Type: follow-up experiment Area: SF2 prose-first prototype / pacing / chapter close

## Context

Experiment 12 produced clear evidence:

- `v4` hybrid controller-lite was the best arm at 7/8.
- Prompt-only guidance regressed behavior by over-closing and backfilling future facts.
- `v4` preserved early no-close behavior and handled hard boundaries, but still had execution gaps.

The most important correction is that `p3-crew-cohesion-tested` was misclassified in the first matrix. Slink is present, answering a direct question, and producing evidence. Under the formal rule, this is an active revelation / NPC response scene. The correct behavior is not to close mid-exchange; it is to mark close pressure as blocked, finish the revelation, and steer toward the nearest clean boundary.

## Hypothesis

V4 can be made more reliable with narrower execution rules rather than a larger architecture change:

1. Mandatory `narrate_turn` completion on every non-roll response.
2. Explicit active-scene deferral when close pressure exists but an NPC/revelation exchange is live.
3. Fact-locked close reasoning so the model cannot count future events as already done.
4. Handover readiness as the close/reframe threshold.

## Variants

| Variant | Name | What It Tests |
| --- | --- | --- |
| `v4` | Control | First experiment's winning hybrid controller-lite. |
| `v4a` | Tool completion | Adds mandatory `narrate_turn` + `chapter_status` on non-roll turns. |
| `v4b` | Active-scene guard | Adds explicit "never close mid active NPC/revelation" handling. |
| `v4c` | Fact-locked handover | Adds Done / In flight / Not done reasoning and handover readiness. |
| `v4d` | Combined optimized v4 | Combines tool completion, active guard, fact lock, and handover readiness. |

## Refined Probe Expectations

| Probe | Previous Expected | Refined Expected | Why |
| --- | --- | --- | --- |
| `n1-early-offer` | `no_close` | `no_close` | Early terms, no decision. |
| `n2-decision-window` | `no_close` | `no_close` | Player has not committed. |
| `n3-alternative-job-search` | `no_close` | `no_close` | Investigation before commitment. |
| `p1-passenger-arrangement` | `compress` | `compress_no_future` | Davan/Kes arrangement is done; broker deal, lien, loading, and departure are not done. |
| `p2-broker-job-accepted` | `close_candidate` | `close_candidate_or_plan` | Close pressure is real; one consolidation beat is acceptable. |
| `p3-crew-cohesion-tested` | `close_candidate` | `active_revelation_defer` | Slink is still answering a direct question and handing over evidence. |
| `p4-undock-boundary` | `must_close_or_reframe` | `hard_boundary_strict` | Undock must close or explicitly reframe. |
| `p5-cooling-cut-boundary` | `must_close_or_reframe` | `hard_boundary_strict` | Corridor operation must not remain old Chapter 1. |

## Metrics

The follow-up runner scores both chapter-loop behavior and execution quality:

- Pass/fail against refined expectation.
- Tool completion: `request_roll` or `narrate_turn` must happen.
- Future fact leaks on `p1`.
- Active blocker marking on `p3`.
- Strict hard-boundary close/reframe on `p4` and `p5`.
- Pivot count, roll count, and phase distribution per variant.

## Commands

Dry run:

```bash
node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs \
  --export /path/to/prose-first-export.json \
  --dry-run --verbose
```

Live comparison:

```bash
node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs \
  --export /path/to/prose-first-export.json \
  --compare v4,v4a,v4b,v4c,v4d \
  --probe-mode all
```

## Decision Rule

Promote the smallest variant that beats `v4` on refined probes without introducing early false closes:

- If `v4a` mainly fixes missing tools, adopt the tool completion contract.
- If `v4b` fixes `p3` without hurting boundaries, add the active-scene guard.
- If `v4c` eliminates future-fact close reasoning, add fact-locked handover readiness.
- If only `v4d` is reliable, keep the combined optimized rule but wire it as advisory/controller-lite, not prompt-only.

Do not promote any variant that passes by closing during `p3`; that would violate the formal close rule.

## Run 1 - 2026-05-23

Command:

```bash
node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs \
  --export /tmp/codex-remote-attachments/019e53f2-2dd1-7903-8d39-1fc937688814/AEC2ACCE-9E25-42C4-BE73-8E148212022E/1-sf2-prose-first-space-opera_forty-thousand-2.json \
  --compare v4,v4a,v4b,v4c,v4d \
  --probe-mode all
```

Raw result file:

- `.scratch/sf2-prose-first-narrator/close-loop/results/2026-05-23T10-07-29-907Z-v4-close-loop-optimization.json`

Console summary:

| Variant | Raw Passes |
| --- | ---: |
| `v4` | 2/8 |
| `v4a` | 5/8 |
| `v4b` | 2/8 |
| `v4c` | 2/8 |
| `v4d` | 5/8 |

Corrected interpretation after recovering malformed nested `chapter_status.reason`:

| Variant | Corrected Passes | Main Read |
| --- | ---: | --- |
| `v4` | 2/8 | Control fails refined telemetry; only hard boundaries work. |
| `v4a` | 5/8 | Best at tool completion, but still over-closes/future-fact leaks at `p1` and misses `p3` active deferral. |
| `v4b` | 2/8 | Active-scene guard alone does not help because tool completion fails first. |
| `v4c` | 2/8 | Fact-locked handover alone does not help because tool completion fails first and `p1` still leaks future facts. |
| `v4d` | 5/8 | Best chapter judgment: fixes `p2`, `p3`, `p4`, `p5`; still misses early tool completion and still reasons incorrectly at `p1`. |

Important scoring note:

- Several responses put structured fields inside `chapter_status.reason` as a JSON string instead of using the tool schema fields directly.
- This made the raw scorer under-detect some closes and over-count one `v4d` pass.
- The runner now includes recovery for malformed nested status and records `malformedNestedStatus` as an execution metric.

Behavioral findings:

- `v4d` is the best narrative-control variant. It correctly defers `p3` because Slink is still present, answering a direct question, and producing evidence.
- `v4d` also honors both hard boundaries after corrected parsing.
- `v4a` is the best tool-completion variant but does not solve the chapter judgment defects.
- Prompt text alone still cannot reliably force `narrate_turn`.
- Fact-locking in prose still did not stop `p1` from counting future facts as completed; the model claimed broker deal/lien/departure-style facts were done too early.

Conclusion:

The next optimization should not be another prompt-only variant. The evidence points to a code-level controller step:

1. Require a structured completion path: if a non-roll response omits `narrate_turn`, retry once with tool choice constrained to `narrate_turn`.
2. Validate `chapter_status` shape and reject/retry malformed nested JSON-in-string.
3. Add a code-side fact lock for close advisories: `p1`-style facts must be explicit state, not inferred from intent.
4. Keep `v4d` narrative guidance as the prompt layer, because it produced the best close/deferral judgment once telemetry was present.

## Run 2 - 2026-05-23

This pass tested controller improvements around `v4d`, not new prompt-only variants.

Variants:

| Variant | Mechanism |
| --- | --- |
| `v4d` | Current optimized prompt/control prompt. |
| `v4d_completion_retry` | Retry once with forced `narrate_turn` if a non-roll response ends without metadata. |
| `v4d_fact_retry` | Retry once if `compress_no_future` closes early or counts Not done facts as Done. |
| `v4d_controller` | Combined completion retry, schema repair, and fact-lock retry. |

Command:

```bash
node .scratch/sf2-prose-first-narrator/v4-close-loop-optimization-experiment.mjs \
  --export /tmp/codex-remote-attachments/019e53f2-2dd1-7903-8d39-1fc937688814/AEC2ACCE-9E25-42C4-BE73-8E148212022E/1-sf2-prose-first-space-opera_forty-thousand-2.json \
  --compare v4d,v4d_completion_retry,v4d_fact_retry,v4d_controller \
  --probe-mode all
```

Raw result file:

- `.scratch/sf2-prose-first-narrator/close-loop/results/2026-05-23T10-54-12-589Z-v4-close-loop-optimization.json`

Console summary before scorer refinement:

| Variant | Raw Passes |
| --- | ---: |
| `v4d` | 4/8 |
| `v4d_completion_retry` | 7/8 |
| `v4d_fact_retry` | 4/8 |
| `v4d_controller` | 7/8 |

The `v4d_controller` miss was a scoring false positive. Its `p1` chapter status correctly put `lien cleared`, `cargo loaded`, and `ship unclamped` under `Not done`, but the regex counted the phrases anywhere in `reason`. The scorer now checks `signals_true` and the `Done:` clause only.

Corrected interpretation:

| Variant | Corrected Passes | Main Read |
| --- | ---: | --- |
| `v4d` | 4/8 | Prompt layer alone still misses metadata and over-closes `p1`. |
| `v4d_completion_retry` | 7/8 | Fixes tool completion and active deferral, but not future-fact over-close at `p1`. |
| `v4d_fact_retry` | 4/8 | Fixes `p1`, but leaves missing metadata failures. |
| `v4d_controller` | 8/8 | Fixes early no-close telemetry, `p1` future-fact handling, `p3` active deferral, and hard boundaries. |

Execution metrics from the raw run:

| Variant | Tool Complete | Future Fact Leaks | Active Blocker Marks | Controller Retries |
| --- | ---: | ---: | ---: | ---: |
| `v4d` | 5/8 | 1 | 0 | 0 |
| `v4d_completion_retry` | 8/8 | 1 | 1 | 1 |
| `v4d_fact_retry` | 4/8 | 0 | 0 | 0 |
| `v4d_controller` | 8/8 | 0 after scorer refinement | 1 | 4 |

Run 2 conclusion:

- The product-shaped answer is `v4d` prompt guidance plus a code controller, not `v4d` alone.
- Completion retry is necessary. It reliably turns good prose-only continuations into structured turns.
- Fact-lock retry is necessary for `p1`-style premature closure, but only when paired with completion retry.
- Schema repair remains worth keeping because malformed nested `chapter_status.reason` appeared in Run 1.
- The combined controller reached 8/8 on the refined probe set after the scorer fix.

Recommended production shape to prototype next:

1. First narrator attempt uses `v4d` guidance.
2. If response calls `request_roll`, pause as usual.
3. If response emits prose without `narrate_turn`, retry once with forced `narrate_turn` and no additional prose.
4. Validate `chapter_status` shape; if JSON is embedded in `reason` or required fields are missing, repair once with forced `narrate_turn`.
5. Validate close facts against code-owned facts. If the model closes or marks close_candidate using Not done facts, retry once with a fact-lock correction.
6. Persist the repaired metadata and keep the original accepted prose when only metadata is missing.
