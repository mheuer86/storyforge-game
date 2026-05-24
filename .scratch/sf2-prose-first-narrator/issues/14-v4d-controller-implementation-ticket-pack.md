# 14 - V4D Controller Implementation Ticket Pack
Status: draft Type: implementation ticket pack Area: SF2 prose-first prototype / chapter loop / controller

## Source Evidence

This pack translates the close-loop experiments into implementable slices:

- `12-tight-loop-and-chapter-close-experiment.md`
- `13-v4-close-loop-optimization-experiment.md`
- Results:
  - `2026-05-23T09-26-01-216Z-close-loop-experiment.json`
  - `2026-05-23T10-54-12-589Z-v4-close-loop-optimization.json`

Experiment conclusion:

- Prompt-only chapter close guidance regressed behavior.
- `v4d` prompt guidance produced the best chapter judgment, especially active-scene deferral.
- `v4d_controller` reached 8/8 on refined probes after completion retry, schema repair, and fact-lock validation.
- Therefore the implementation should be `v4d` prompt guidance plus a narrow code controller, not a larger SF2 architecture port.

## Ticket Breakdown

1. `15-prose-first-chapter-loop-metadata.md`
   - Type: AFK
   - Adds hidden chapter-loop metadata to prose-first narrator turns.
   - Blocks: 16, 17, 18.

2. `16-prose-first-code-owned-close-advisory.md`
   - Type: AFK
   - Computes and injects a code-owned close/fact advisory for prose-first turns.
   - Blocked by: 15.
   - Blocks: 17, 18.

3. `17-prose-first-controller-repair.md`
   - Type: AFK
   - Implements completion retry, schema repair, and fact-lock retry.
   - Blocked by: 15, 16.
   - Blocks: 18.

4. `18-prose-first-chapter-close-handover-flow.md`
   - Type: AFK
   - Wires validated close/reframe metadata into chapter close and handover continuation.
   - Blocked by: 17.

5. `19-prose-first-close-loop-regression-harness.md`
   - Type: AFK
   - Promotes the probe evidence into a repeatable regression harness.
   - Blocked by: 15, 16, 17.

6. `20-prose-first-chapter-close-reflection.md`
   - Type: HITL
   - Adds a small post-close player reflection / co-direction affordance.
   - Blocked by: 18.

## Recommended Order

Implement 15 -> 16 -> 17 first. That gives a demoable controller without changing chapter transition UX.

Then implement 18 with the hybrid policy: hard-boundary `closed`/`reframed` turns may advance automatically after the final prose lands; soft `close_candidate` turns expose a player-confirmed close affordance.

Add 19 so the behavior does not regress.

Treat 20 as a separate co-creation iteration: after chapter close, let the player reflect on what worked, what did not, and what they want more or less of next chapter. That should inform handover/continuation, but should not block the core close controller.

## Non-Goals

- Do not port the full SF2 Author / scene-bundle / pressure architecture into the prose-first prototype.
- Do not make prompt-only chapter close the production solution.
- Do not make chapter close visible as system text inside narrator prose.
- Do not change streaming prose timing unless the ticket explicitly calls out the tradeoff.
