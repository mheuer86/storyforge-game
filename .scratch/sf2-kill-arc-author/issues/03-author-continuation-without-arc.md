Status: proposed

# Author continuation mode without arc plan

## Problem

The Ch2+ Author situation (`buildAuthorSituation` lines 196-302) is heavily structured around the arc plan:

- "Stable ArcPlan" block rendered via `renderArcPlan` (~30 lines of arc context)
- `arc_link.thread_links` required — each chapter thread must link to an arc thread
- `arc_link.chapterFunction` derived from `chapterFunctionMap`
- `arc_link.playerStanceRead` derived from `playerStanceAxes`
- Continuation rules say "honor the ArcPlan's selected scenario shape"

Without the arc plan, the Ch2+ Author needs to derive arc coherence from what actually happened — chapter-meaning + campaign state.

## Change

The Ch2+ Author situation already includes everything it needs without the arc plan:

**Already present (keep as-is):**
- Prior chapter retrospective (5-element meaning: situation, tension, ticking, question, closer)
- Closing resolution and how to respond to it (clean/costly/failure/catastrophic/unresolved)
- Transition seed (prior_chapter_meant, earned_consequence, pressure_owner_candidate, worsened_detail, unresolved_question, do_not_restage, procedure_residue)
- Dramatic handoff
- Active carry-forward threads with tension/pressure data
- Live NPCs with disposition and dormancy
- Chapter opening continuity
- Structural beat for next chapter

**Remove:**
- "Stable ArcPlan" block — the rendered arc plan
- `arc_link` requirement in Author contract — chapter threads no longer link to arc threads
- References to "honor the ArcPlan's selected scenario shape"

**Add:**
- Campaign forces context: render any `campaign.forces` (if we add this to campaign state from #01) so the Author knows what institutional/faction forces are in play
- Stronger transition seed emphasis: the transition seed becomes the primary arc-forward mechanism. Promote it from "supporting" to primary context.

The key insight: the Ch2+ Author's `buildAuthorSituation` already has ~120 lines of chapter-meaning, thread state, NPC state, and continuity context. The arc plan block adds ~30 lines of redundant context that duplicates what campaign state already carries. Removing it simplifies the prompt and removes the "derive from the plan" instruction that constrains creative freedom.

## Author prompt rule changes

- Rule 1 currently: "Honor the hook's invariant pressure, but honor the ArcPlan's selected scenario shape." Change to: "Honor the prior chapter's meaning and the campaign's accumulated pressure. The story discovers its shape through play."
- Rule 36 (`buildAuthorRole` line 36): references ArcPlan. Rewrite to reference chapter-meaning transition seed.
- Author contract: `arc_link` fields become optional or removed.

## Files

- `lib/sf2/author/prompt.ts:196-302` — `buildAuthorSituation` Ch2+ branch (remove arc plan block, promote transition seed)
- `lib/sf2/author/prompt.ts:19-77` — `buildAuthorRole` rules referencing ArcPlan
- `lib/sf2/author/contract.ts` — `arc_link` validation (make optional)
- `lib/sf2/author/prompt.ts:289-310` — continuation chapter rules at bottom (remove arc thread linking requirement)

## Depends on

- #02 (structural beats) — Author needs beat awareness for Ch2+ without chapterFunctionMap

## Risk

If chapter-meaning produces a weak transition seed, the Ch2+ Author has less to work with than it did with the arc plan. Mitigation: chapter-meaning already runs on Sonnet 4.6 (per the cost note in its prompt) and the transition seed is well-designed. The real risk is if chapter-meaning fails entirely (API error) — in that case the Author still has carry-forward threads, NPCs, and campaign state.
