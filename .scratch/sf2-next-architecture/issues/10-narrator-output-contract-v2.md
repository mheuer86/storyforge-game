# Narrator Output Contract v2: Recovery Under 10%

Status: blocked-by-01
Labels: blocked
Type: AFK
Area: SF2 / narrator / stream protocol

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

`narrator_output_recovered` fired on ~half of pre-hardening turns; the repair inventory (alt-key normalization, carry-forward, synthesized defaults, XML-leak containment in `app/api/sf2/narrator/route.ts`) survives a leaky contract instead of fixing it. After issue 01 re-measures the post-hardening rate and per-strategy breakdown, redesign the contract so recovery falls below 10% of turns:

- **Prose lives only in the text channel; structure lives only in tool input.** No structured data is ever parsed out of prose; no prose is ever carried in tool fields beyond short labels.
- **No optional-but-actually-required fields.** Every `narrate_turn` field is either always required (schema-enforced) or genuinely optional with a code-owned default — the current failure class where `suggested_actions` or `chapter_status` sub-fields go missing must become a schema violation visible at the API layer, not a silent repair.
- Collapse field-shape variance: one canonical key set (snake_case), no alt-key tolerance in the happy path — alt-key normalization remains only as a logged repair, expected to trend to zero.
- Keep repairs as a safety net but re-tier them: repairs that change meaning (synthesized defaults, carry-forwards) log at high severity; cosmetic normalization logs low. The recovery-rate sensor (issue 01) gates the fixture below.

Use the measured per-strategy breakdown to attack the top sources first; if the data shows `chapter_status` sub-fields dominate, consider moving stable booleans (`never_close_mid_active`) out of the model's hands into code defaults — the model should only assert what only it knows.

## Acceptance criteria

- [ ] Revised `narrate_turn` schema with no optional-but-required fields; code-owned defaults documented per optional field.
- [ ] Prose/structure separation holds: no parsing of structure from prose anywhere in the route.
- [ ] Repair tiers (meaning-changing vs cosmetic) logged distinctly.
- [ ] Replay fixture `narrator-recovery-ceiling`: a replayed session's recovery rate computes < 10%, else the fixture fails (named regression).
- [ ] Replay fixture `prose-seam-stitching`: pre-roll/post-roll concatenation produces no seam artifacts ("…actually do it.Thessaly's…") (named regression).
- [ ] Replay fixture `harness-vocab-leak`: gate/debt/close-loop vocabulary in prose is flagged by the display sentinel (named regression, extends `display-sentinel-*`).
- [ ] Measured recovery rate on a fresh prototype session is below 10%; result recorded in Comments.

## Blocked by

Issue 01 (post-hardening measurement decides what the contract must fix).
