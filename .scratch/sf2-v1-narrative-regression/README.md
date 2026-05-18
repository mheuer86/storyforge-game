# SF2 V1 narrative regression — remaining gaps

Drafted 2026-05-18 after restoring genre bibles, Arc Author pressureStyle validation, and Narrator forbidden-manifestation loophole (shipped in commit `1915dfa`).

These tickets cover the remaining narrative-quality regressions found by comparing V1's `lib/system-prompt.ts` and `lib/genres/*.ts` against SF2's narrator prompts, compile-seed, and core identity.

## Tickets

| # | Title | Type | Status | Notes |
|---|---|---|---|---|
| 01 | Hook-specific opening knowledge | AFK | proposed | Low priority per user — only valuable if per-hook, not per-playbook |
| 02 | Rewrite compile-seed factionVoiceRules | AFK | proposed | Parallel copy of genre bible faction voice; currently procedural |
| 03 | SF2 Narrator core identity | AFK | proposed | 7-line technical spec → V1-quality creative brief |
| 04 | Narrator tone proportions | AFK | proposed | V1 had per-genre tone mixes; SF2 narrator gets none |
| 05 | Narrator prose philosophy | AFK | proposed | "Silence is a tool", formatting rules, breathing room |
| 06 | "The world moves without the player" | AFK | proposed | V1 minimums for offscreen agency lost in SF2 |

## Relationship to existing tickets

`sf2-narrative-quality-pass/` addressed the same root problem from a different angle (pressure manifestation, human-stakes, outcome spectrum). These tickets are complementary — they target the narrator's voice and creative identity rather than the Author/pressure layer.

Ticket #11 in that pass (prompt surface compression audit) overlaps with #03 and #05 here. If that ticket proceeds, fold these in.

## Source

V1 baseline: `lib/system-prompt.ts` lines 97-345.
SF2 narrator: `lib/sf2/narrator/prompt/core.ts`, `lib/sf2/narrator/prompt/role.ts`.
SF2 compile-seed: `lib/sf2/setup/compile-seed.ts` lines 28-237.
