# One-Pass Chapter Close Ceremony: Landing → Retrospective → Handover

Status: blocked-by-05
Labels: blocked
Type: AFK
Area: SF2 / chapter close / handover

## Parent

`.scratch/sf2-next-architecture/PRD.md`
Supersedes: `.scratch/sf2-prose-first-narrator/issues/18-prose-first-chapter-close-handover-flow.md` and folds in `20-prose-first-chapter-close-reflection.md`

## What to build

Today a close (`chapter_status.phase='closed'`) and the handover compiler (`lib/sf2/handover/compiler.ts`) exist separately and have never been exercised together by a real session. Wire them into one continuous ceremony, framed as a writing task the Narrator relishes (Durable Lesson 20), not four disjoint steps:

1. **Landing turn**: Narrator closes per the controller (issue 05). Client detects `phase='closed'`.
2. **Retrospective**: immediately stream a player-facing chapter retrospective from the Narrator — Exhibit A register (`.scratch/sf2-next-architecture/prompt.md`): what happened, what it cost, what was *not* done, the uncontrolled variable going into the next chapter. Full transcript context — this is the one call allowed to notice chapter-long absences. Rendered as a distinct artifact in the UI, not regular prose.
3. **Handover compilation**: on retrospective completion, run the existing three-document parallel compiler with the retrospective text added as input, so the GM Memory chapter debrief and the retrospective cannot diverge. Stream progress states to the UI; partial success tolerated as today.
4. Persist all four artifacts (retrospective + three documents) to the session's handover artifacts; the next chapter open consumes them (issue 09).

One pass means: no player action required between steps 1–3; total ceremony within the PRD wall-clock budget (≤ 30s target, may stream); a single failure path that leaves the session resumable (a failed compile can re-run from the persisted retrospective).

## Acceptance criteria

- [ ] Close detection triggers retrospective automatically; retrospective streams in a visually distinct UI surface.
- [ ] Retrospective prompt asks for the Exhibit A register including one "uncontrolled variable" the player has not addressed.
- [ ] Compiler runs on retrospective completion with the retrospective as additional input; existing three-document contracts unchanged.
- [ ] All four artifacts persist; an interrupted ceremony resumes from the last completed step.
- [ ] `handoverDocuments` is non-empty after a real close — the prototype's Exhibit C failure is structurally impossible.
- [ ] Ceremony wall-clock and per-call latency logged to diagnostics.
- [ ] Replay fixture `close-ceremony-one-pass`: closed turn → retrospective → compile → persisted artifacts, with a resume-after-compile-failure variant.

## Blocked by

Issue 05 (closes must reliably happen for the ceremony to be reachable).
