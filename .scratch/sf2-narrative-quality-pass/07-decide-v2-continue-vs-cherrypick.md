# Decide: continue with v2, or cherry-pick v2's wins back into v1

Status: proposed
Category: decision
**Type:** HITL
**Source:** narrative-quality pass, sparring 2026-05-08

## The question

User-flagged at the close of sparring 2026-05-08:

> *"is it worth continuing with v2 or would it be better to integrate the 2-3 clear improvements that v2 has into v1?"*

v0 (Claude web chat) and v1 (productized v0 with full message history in cache) both produced engaging stakes-driven narratives. v2 (deterministic state, validators, multi-role architecture) produces stable but procedural-trope-heavy narratives. The narrative-quality pass tickets (#01–#06) attempt to fix this within v2.

**Pre-decision: ship the pass and re-evaluate.** Post-pass, decide.

## v2's clear improvements over v1

For the cherry-pick option to be tractable, the user must agree on what's worth keeping. Candidate list:

1. **Per-thread pressure tracking with deterministic charging on failed rolls.** `lib/sf2/pressure/` and the wiring in `turn-resolution/resolve.ts`. v1 had cohesion + clocks but not per-thread pressure with mechanical roll-charge.
2. **Pressure-ladder structure with chapter-pacing discipline.** v1 had no equivalent.
3. **Multi-role architecture (Author / Arc-Author / Narrator / Archivist / Chapter-Meaning).** v1 was a single GM role doing everything.
4. **Schema-driven entity extraction (Archivist).** v1 had a state extractor but less structured.
5. **Cache layering (BP2 / BP3 / BP4) for prompt-cost optimization.** v1 evolved toward this; v2 took it further.
6. **Continuity lock (sf2b).** v1 had nothing equivalent.
7. **Chapter-meaning + transition-seed authored handover between chapters.** v1's chapter handoff was less structured.
8. **Pressure engines with `advancesWhen` / `slowsWhen`.** Stronger than v1's clocks for arc-scale pressure.

## v2's costs

1. **Prompt bloat.** `SF2_NARRATOR_ROLE` alone is 200+ lines; full per-turn prompt approaches v1 system-prompt size despite v2's heavier off-loading to state.
2. **Per-turn latency.** Multi-role architecture serializes Narrator → Archivist (and sometimes Author) per turn.
3. **Cost.** ~$0.80 per chapter from instrumentation (memory note: `project_storyforge_instrumentation`). v1 was variable but generally cheaper per turn.
4. **Genre contamination.** Hegemony-baked examples in role/author prompts (this pass addresses).
5. **Procedural-trope leak.** Narrative degradation diagnosed in sparring (this pass addresses).
6. **Validator complexity.** Author/Archivist/Narrator each have their own validators with overlapping concerns; harder to reason about.
7. **Maintainability gap.** Modifying a rule often requires touching prompt + contract + validator + scene packet + replay fixtures.
8. **The corruption test result.** v2 produced *better* prose when its state was corrupted (`~/Downloads/sf2 Chapter 2 from corrupted state/`); freestyle outperformed bound. Suggests the validators are over-binding the LLM relative to the gain.

## Decision-relevant tests after pass ships

The narrative-quality pass (#01–#06) addresses the leak diagnostically. After it ships, run:

- **A/B replay test.** Same seed (Forty Thousand), two versions: post-pass v2 vs v1. Score on: spark, stakes, character voice, callback richness, cross-chapter coherence.
- **Cost waterfall.** Has the pass moved cost meaningfully? If still ~$0.80/chapter and v1 is ~$0.30/chapter, that's a real ongoing tax.
- **Maintainability proxy.** How many lines of code did the pass touch per rule change? If it's >100 LOC per rule, the v2 architecture is fighting future iteration.
- **Cross-chapter test.** Run a 3-chapter playthrough on post-pass v2. Does Ch2-Ch3 feel earned, or do they still feel like "next scene of the prior chapter"? This is the failure mode v0 dominated and both v1 and v2 struggled with.

## Cherry-pick option (if v1 wins the post-pass A/B)

If v1 produces better narratives at lower cost and the v2 wins are isolatable, cherry-pick:

- **Highest-ROI to port to v1:** per-thread pressure with roll-charge wiring (win #1). Small code surface, big stakes-layer benefit, doesn't require multi-role architecture.
- **Medium-ROI:** continuity lock concept (#6); chapter-meaning + transition-seed (#7).
- **Skip:** multi-role architecture (#3) and validator complexity (cost #6) — these are v2-specific costs without proportional spark benefit.

## Decision criteria

The user must answer (in order):

1. After the narrative-quality pass ships, does v2 produce v0/v1-quality narratives (or close)?
2. If yes → continue v2; this ticket closes as `Status: decided — continue v2`.
3. If no → which of v2's wins (above) is genuinely load-bearing for the v0/v1-quality target? Anything not load-bearing → port to v1, retire v2.

## Suggested timing

Re-evaluate after #01–#06 ship and 1-2 fresh playthroughs. Don't decide pre-pass; the diagnosis suggests the leaks are fixable in-place.

## Comments

> *Pre-decision pass first. Post-pass, the choice should be data-driven from the A/B test, not from sunk-cost reasoning about v2's complexity.*
>
> *Snapshot the v2 codebase before any retirement; the per-thread pressure work is the strongest single contribution and worth preserving as a reference even if v1 wins.*

## Agent Brief

**Category:** decision (HITL)
**Summary:** Decide whether to keep iterating on v2 or cherry-pick v2's wins back into v1, after the narrative-quality pass.
**Current behavior:** v2 produces stable-but-procedural narratives; sparring diagnosis suggests the leaks are at instruction not architecture, but unproven.
**Desired behavior:** Data-driven decision after pass + A/B replay test.
**Key interfaces:** N/A (this is a decision, not an implementation).
**Acceptance criteria:** User answers the three decision questions and writes a short rationale; this ticket gets a `Status: decided` update.
**Out of scope:** Doing the cherry-pick or the v2 continuation itself; only deciding which.
