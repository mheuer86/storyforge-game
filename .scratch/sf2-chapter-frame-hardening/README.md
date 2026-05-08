# sf2 chapter frame hardening

Drafted 2026-05-08 from a chapter-author prompt review following the first post-narrative-quality-pass playthrough (`~/Downloads/260508 Playthrough sf2/`). The pass landed substantial gains — cost halved per turn, prose recognizably v0/v1-class, pressure-manifestation block doing real stakes work (Doss's confession at turn 7 was a textbook NPC-trust-cools beat). This follow-up closes chapter-frame surfaces that still allow procedural framing to slip through.

Specifically:
- `chapter_frame.crucible` was demoted to a flat field alongside four similar ones; its load-bearing role as the chapter's single dramatic question has been lost.
- `chapter_frame.{active_pressure, central_tension, chapter_scope, objective}` accept procedural framings without validation, despite outcome_spectrum getting human-consequence framing in the prior pass.
- `chapter_frame.chapter_scope` is the weakest-named field on the frame; user leans toward removal.
- `antagonist_field.source_system` is free text that doesn't map to any canon entity.
- `escalation_options` and `moral_fault_lines` lack the human-consequence guard that `pressure_ladder` and `outcome_spectrum` got in the prior pass.
- `opening_scene_spec.immediate_choice` exists with an anti-procedural guard for continuation chapters; the guard exists *because the field invites the failure mode it's guarding against*.
- The Ch2+ Author packet currently repeats operational continuity before it gives Author a compact dramatic handoff, so the model is primed toward procedure before validation pushes back.

## Tickets

| # | Title | Type | Status | Blocked by |
|---|---|---|---|---|
| 01 | Restore crucible as dramatic anchor | AFK | ready-for-agent | — |
| 02 | Chapter frame human-consequence framing + chapter_scope decision | HITL→AFK | ready-for-agent | HITL on chapter_scope; coordinates with 01 |
| 03 | Replace `antagonist_field.source_system` with faction reference | HITL→AFK | ready-for-agent | HITL on type shape |
| 04 | Escalation options + moral fault lines: human-consequence guards | AFK | ready-for-agent | — |
| 05 | `immediate_choice`: remove or demote | HITL | proposed | HITL decision |
| 06 | Author packet dramatic handoff before operational continuity | AFK | ready-for-agent | coordinates with 01 and 02 |

## Sequencing

These can mostly run in parallel since they touch different fields of the same file (`lib/sf2/author/prompt.ts` + `author/contract.ts` + `types.ts`). Suggested coordination:

- **#06 first or with #01.** If the packet still over-feeds operational continuity, the frame validators keep fighting the Author's input. The dramatic handoff gives #01 and #02 better source material.
- **#01 next.** Crucible is the strongest single frame restoration; if it's defined as the chapter's single dramatic question, #02's frame-field cleanup gets sharper because the surviving fields are demoted to support roles.
- **#02 and #03 in parallel** with #01 — both reshape adjacent frame surfaces.
- **#04 later** — useful if replay data still shows procedural drift after packet and frame cleanup; less urgent than reducing the procedural pull at source.
- **#05 after the others** — it's a contract-shape decision and easier to reason about once the rest of the frame is settled.

## Source

Chapter-author prompt review conversation 2026-05-08. Triggered by the post-pass playthrough (`~/Downloads/260508 Playthrough sf2/sf2-session-camp_1778263212362-2026-05-08T19-09-54.json`) showing the narrative-quality pass moved the needle but procedural-pull surfaces remain in the chapter frame itself.
