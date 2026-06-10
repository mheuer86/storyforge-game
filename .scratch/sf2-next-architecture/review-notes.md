# Review Notes: Next Architecture Prompt

Status: done
Source: fact-check of the 2026-06 architecture prompt against the repo at commit `6677243` (2026-06-10)

The original prompt was strong — the thesis, exhibits, and durable lessons hold up. But it was written against the prototype as it existed *before* the last three commits, and it ignores several systems that already exist on main. An architect answering the original prompt would re-design things that shipped last week and miss constraints that are already in code. The revised prompt (`prompt.md` in this directory) fixes that. Changes, with evidence:

## Stale claims corrected

1. **"Model-owned chapter close (now confirmed failed)" — now half-true.** Commit `efe81a6` added a code-owned close loop controller (`lib/sf2/narrator/prose-first-close-loop.ts`): five-phase machine, grace window from `pacingContract.targetTurns` (default min 12), fact-locks, active-blocker detection; commit `6677243` made `chapter_status` echo mandatory on every `narrate_turn`. What remains true: the Narrator still *declares* close — code computes candidacy but has no forcing function, and no session has crossed a chapter boundary through the controller. The prompt now distinguishes the constrained failure mode from the eliminated one, and adds assumption G (escalation authority) to attack the remaining gap.

2. **"Advisory roll gate (`required: false, binding: expected`)" — superseded.** Commits `935675d` and `6677243` added three binding tiers and contextual hardening (`lib/sf2/narrator/roll-gates.ts:310-337`): NPC info without earned disclosure, resistant-NPC social pressure, clandestine contact, and high-stakes contexts escalate to `hard` ("You MUST call `request_roll`"). The drama-engine + information-cost protocol tripled gate compliance 22% → 67% across 11 scenarios (commit message `935675d`). Still true and now stated precisely: 67% on a SHOULD leaves a one-in-three free-lunch budget, neither density bound is enforced, and no free-lunch detector exists (grepped: zero hits).

3. **"The Archivist rejected narration over 8000 chars" — fixed.** The cap is 32,000 chars (`app/api/sf2/archivist/route.ts:31`). Assumption F was rewritten: the sizing premise is dead; the recovery-rate contract question survives, now with the actual repair inventory (alt-key normalization, carry-forward, synthesized defaults, XML-leak containment) and an instruction to re-measure post-hardening before designing the replacement.

4. **"Instrumentation … had no sensor for drama and no authority to change tempo" — partially stale.** Narrative tempo (8 deterministic modes, `lib/sf2/narrative-tempo.ts`, commit `54ca613`) and pacing trip-wires (`lib/sf2/pacing/signals.ts`: reactivity ratio, scene-link discipline, thread stagnation, arc dormancy, forbidden-repeat — a crude bureaucracy-attractor detector) shipped after the flattening evidence. The prompt now requires the architect to disposition these instead of inventing them from scratch.

## Missing systems added

5. **The Playstyle role.** `app/api/sf2/playstyle/route.ts` (commit `e0d6cd9`) synthesizes a campaign rulebook end-of-chapter and feeds it to Author and Narrator, with a live toggle. The original prompt's table-talk question (Q20) pretended no substrate existed. Added assumption H and threaded it through Q20, the Roles section, and the final-recommendation checklist.

6. **Arc Author's real status.** Still live in the chapter-close path (`components/sf2/play-app.tsx`), with a two-phase removal plan at `.scratch/sf2-kill-arc-author/` (no phase shipped). "Retire Arc Author" is not a fresh decision; the prompt now asks the architect to execute, amend, or cancel the existing plan, and the migration question requires explicit disposition of the open tickets there and in `.scratch/sf2-prose-first-narrator/`.

7. **The governing PRD.** `.scratch/sf2-prose-first-narrator/PRD.md` ("The model is the GM. The harness owns the dice.") supersedes `.scratch/sf2-gm-handover/` and carries ~10 ready-for-agent tickets. The prompt now opens by requiring the design to position itself against these artifacts: adopt, amend, or overturn — never ignore.

8. **Ground Truth Inventory section (new).** Role/model table (Sonnet 4.6 everywhere except Haiku 4.5 Archivist), the existing reliability sensors with their kill-criterion bands (anchor-miss ≤ 5%, thread continuity ≥ 50%, arc advancement ≥ 1/chapter/arc, cost ≤ $7), working-set budgets (6 full / 8 stub / 5 threads), firewall actor sets, the 283-fixture replay harness with existing `chapter-close-*` and `display-sentinel-*` categories, and both IndexedDB databases. The original prompt's "reliability sensors (exist today)" list was vaguer than reality.

## Budgets filled

9. The bracketed `[X]` placeholders are replaced with real figures, each marked *(measured)*, *(target)*, or *(estimated)*: stable prefix ~8,800 tokens, transcript ~600–800 tokens/turn, ~29k/chapter (~15% of window) — measured from Pale Flame artifacts in the prose-first PRD; cost reference points V1 ~$0.30, SF2 ~$0.80, prose-first est. $2–3/chapter; TTFT ≤ 5s and close ≤ 30s as targets; 5-minute cache TTL with the keepalive/accept-miss/1-hour-TTL decision called out. Where a number is a target, the prompt says to pull the live figure from the existing latency instrumentation rather than trust it.

## Evidence hygiene

10. **Number discrepancy flagged, not silently changed.** The prompt says "17 Intimidation" for Stryca; the in-repo PRD says "11 intimidation rolls" for the same transcript. Both may be derivable from the same export at different cut points, so the revised prompt keeps the claim, notes the discrepancy inline, and makes the session export the source of truth.

11. **Counter-evidence included.** The Forty Thousand SF2 3-chapter run (`.scratch/sf2-space-opera-3ch-20260503-234508/`) played 18 turns, ~8 well-targeted rolls, natural close at turn 18 — SF2's pathology is seed/genre-sensitive, which strengthens (and now concretely seeds) the multi-genre same-seed A/B requirement. Candidate seeds with cross-architecture history are named: The Tithe, Forty Thousand, plus one prototype brief.

12. **Exhibit C scoped.** Marked pre-hardening, with the note that the named mechanisms have changed but no post-hardening session has disproven either failure — the evidence still binds, it just binds differently.

## Structural changes

13. Durable Lessons 15 and 16 got *Status* annotations (partially encoded, with file references) instead of reading as pure aspiration; new assumptions G (close-loop forcing function) and H (Playstyle/table talk); two new named regression fixtures (close-gate escalation; Archivist sizing pinned at the real 32k cap against real prototype prose); regression fixtures are required to land in the existing replay harness, not a parallel one; the final instruction now requires naming the file or ticket being overruled when deviating from shipped code or an open PRD.

## What was deliberately kept

The thesis sentence, the four-part abundance/scarcity/table/chapter-2 frame, Exhibits A and B verbatim, the 20 durable lessons (annotated, not rewritten), the banded roll-density target, the texture-survival score, and the output format's "Three Decisions First" device. These are the strongest parts of the original and the codebase contradicts none of them.
