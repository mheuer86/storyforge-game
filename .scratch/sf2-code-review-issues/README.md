# sf2 code review — issue slices

Seventeen tracer-bullet issues drafted from the three-pass code review at `~/vaults/brainforest/zettel/2026-W19/2605062232 Storyforge sf2 code review three passes.md`.

Slice order is rough priority; #1, #2, #6, #7 are quick wins. #3 and #8 are HITL decisions that unlock cleanup work.

| # | Title | Type | Status | Blocked by |
|---|---|---|---|---|
| 1 | Fix `stableJson` to use structural equality | AFK | ready-for-agent | — |
| 2 | Make NPC merges visible (flag + invariant check) | AFK | ready-for-agent | — |
| 3 | Decide firewall fate (enforce or demote) | HITL | implemented | — |
| 4 | Schema-vs-prompt parity test (Archivist prototype) | AFK | ready-for-agent | — |
| 5 | Extend parity test to remaining roles | AFK | ready-for-agent | 4 |
| 6 | Author validator: ladder trigger discipline | AFK | ready-for-agent | — |
| 7 | Extract `CHAPTER_STRUCTURAL_BEATS` to shared module | AFK | ready-for-agent | — |
| 8 | Pick one critical-operational-fact enforcer | HITL | implemented | — |
| 9 | Make display sentinel repair protocol explicit | AFK | ready-for-agent | — |
| 10 | Let coherence findings override bad prior prose | AFK | ready-for-agent | — |
| 11 | Tighten Narrator scene snapshot wire contract | AFK | ready-for-agent | — |
| 12 | Surface mechanical no-ops and cast-wipe recovery | AFK | ready-for-agent | 11 |
| 13 | Type high-risk Archivist payload fields | AFK | ready-for-agent | 4 |
| 14 | Collapse Author validation to normalize-once | AFK | ready-for-agent | 6 |
| 15 | Validate Chapter Meaning transition seeds | AFK | ready-for-agent | — |
| 16 | Share anonymous placeholder markers by genre | AFK | ready-for-agent | 2 |
| 17 | Decide SF2 history retention and clone discipline | HITL | decided | — |

Follow-ups created from #17:

| # | Title | Type | Status | Blocked by |
|---|---|---|---|---|
| 18 | Document SF2 mutable draft boundaries | AFK | follow-up | 17 |
| 19 | Cap or externalize raw turn annotations | AFK | follow-up | 17 |

Slices considered and dropped (not tracer-bullet shaped):
- Full wire-format adapter rewrite - too cross-cutting; #11 and #13 cover safe tracer bullets first
- Prompt bloat reduction - needs sustained passes with playthrough validation, not sprintable
- Genre-portable regexes generally - overlaps with #8; might become moot
