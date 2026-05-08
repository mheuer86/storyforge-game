# sf2 narrative-quality pass

Drafted 2026-05-08 from a sparring session that diagnosed why v2 produces procedural-trope-heavy chapters where v0 (Claude web chat) and v1 produce stakes-driven ones.

The root-cause audit (`Explore` agent over `lib/sf2/`) confirmed the v2 stakes layer is correctly wired: failed rolls deterministically charge per-thread pressure (+2 / +3) via `turn-resolution/resolve.ts` → `pressure/derive.ts`, and the values flow into the narrator's per-turn delta. **The break is at instruction, not wiring.** The narrator sees `Δ +2` on a thread but isn't told what to do with it; it falls back to procedural escalation because that's the easiest pattern to reach for, and because the Author's prompt teaches procedural triggers as the canonical "good" form.

The narrator-prompt fix (pressure manifestation contract) shipped during the sparring session as a direct edit to `lib/sf2/narrator/prompt.ts`. The remaining tickets address upstream contributors: genre contamination from Hegemony-flavored examples, outcome-spectrum abstractness, mechanism-vocabulary saturation, continuation-move framing, and the missing human-stakes anchor in the chapter setup contract.

## Tickets

| # | Title | Type | Status | Blocked by |
|---|---|---|---|---|
| 01 | v1-style genre injection refactor for v2 prompts | AFK | ready-for-agent | — |
| 02 | Reframe outcome spectrum to human consequences | AFK | ready-for-agent | — |
| 03 | Genre-neutralize trigger-discipline examples | AFK | ready-for-agent | coordinates with 01 |
| 04 | Continuation Move 1: stakes, not procedural surface | AFK | ready-for-agent | coordinates with 06 |
| 05 | Add `human_stakes` block to chapter setup contract | HITL→AFK | ready-for-agent | — |
| 06 | Trim mechanism-vocabulary list | AFK | ready-for-agent | coordinates with 04 |
| 07 | Decide v2 continuation vs cherry-pick into v1 | HITL | proposed | 01–06 (re-evaluate after) |
| 08 | Pressure vocabulary glossary | AFK | ready-for-agent | — |
| 09 | Scene source of truth | HITL→AFK | proposed | post-pass A/B (#07) — under review for pre-pass bump |
| 10 | Diagnostic finding envelope | AFK | ready-for-agent | — |

Tickets #08–#10 derive from the `sf2-domain-model-pruning.md` audit (2026-05-08). All three port cleanly to v1 if we cherry-pick. #08 (glossary + type aliases) and #10 (diagnostic envelope wrapper) are pre-pass: no/low regression risk, and #10 actively helps debug the A/B playthrough. #09 is a real refactor with behavior-changing potential; under discussion whether the existing scene-state continuity bugs make pre-pass the cleaner option anyway, or whether refactor-during-test-window risk wins. Default conservative for now; user call.

## Skipped intentionally

- **AI-default-name ban.** v1's `system-prompt.ts:350` had an explicit ban on Aldric / Kael / Voss / Thorne / Ash / Sable / Petra / Renn / Elara / Lyra / Seraphina / Corvus / Dax as overused AI defaults. v2 dropped the ban; v2's prompts now use Sable / Kael / Voss freely as Hegemony examples, reinforcing the bias rather than pushing against it. Naming conventions per genre deserve their own pass — not a core issue right now.

## Already shipped during sparring

- **Pressure manifestation contract** (`lib/sf2/narrator/prompt.ts`, sibling section to "Fail forward"). When a thread shows `Δ +2` or `+3` in the per-turn delta, the narrator must visibly escalate that thread's stake — not "the world feels heavier," not procedural inflation elsewhere. Forbidden manifestations and standing-pressure rules included. Sub-prefix: `## Pressure manifestation (load-bearing — read with Fail forward)`.

## Source

Sparring conversation 2026-05-08. Materials referenced:
- `~/Downloads/Fourty Thousand v1 Playthrough/` (v1 productized run, 18KB markdown)
- `~/Downloads/Fourty Thousand v2 Playthrough/` (v2 same seed, ~24MB session JSON)
- `~/Downloads/sf2 Chapter 2 from corrupted state/` (v2 freestyle from corrupted state — best v2 prose observed)
- `~/vaults/brainforest/references/web-clipper/Stars & Sovereignty chapter 2 part 2.md` (v0 web chat, 3852 lines, the high-water mark)
- v1 prompt baseline: `lib/system-prompt.ts` and `lib/genres/*.ts`
