# PRD: SF3 — Prose-First Narration Under a Code-Owned Scarcity Warden

Status: selected
Source: `.scratch/sf2-next-architecture/prompt.md` (the fact-checked architecture prompt), answered against repo ground truth at commit `6677243`
Supersedes: extends `.scratch/sf2-prose-first-narrator/PRD.md` (its architecture is the substrate; this PRD adds the scarcity layer, close ceremony, table talk, and promotion path)

## Three Decisions First

**1. Scarcity moves fully into code, as a Warden, not a prompt.** The prototype's hardened roll gates reached 67% compliance — better, still a one-in-three free-lunch budget. Position: code enforces both roll-density bounds via a density governor that modulates gate bindings, and a Haiku free-lunch sentinel detects decisive gains without roll/cost/setup. The sentinel never rewinds visible prose; it collects *debts* on the next turn. Evidence that would change this: a re-measured post-hardening session showing compliance ≥ 90% and density inside the band without enforcement.

**2. The close loop gets a forcing function; the close ceremony is one streamed pass.** The five-phase controller computes candidacy but the Narrator still declares close — the original "never closes" failure is constrained, not eliminated. Position: after 3 consecutive turns of unblocked `close_candidate` with no `close_intent`, the turn delta becomes a binding landing directive. Close = landing turn → player-facing retrospective (Exhibit A register, streamed, doubles as correction channel) → three-document handover compiled in parallel with the retrospective as input. Evidence that would change this: post-`6677243` sessions closing reliably without escalation.

**3. Prose memory is the Narrator's memory; typed state shrinks to a mechanical spine.** Growing transcript + handover documents in, working-set entity packets out (schema ontology is destiny — Exhibit B). Typed state keeps what code must enforce: character sheet, HP/resources, inventory, clocks, rolls, NPC identity pins, promises/debts. `procedures`/`documents` stop being Narrator-visible entity kinds. Evidence that would change this: texture-survival or continuity scores in the same-seed A/B favoring the packet path.

## Executive Thesis

SF3 is the prose-first prototype promoted to an architecture: a single Sonnet Narrator with a private brief, growing transcript, and prose-shaped handover memory — wrapped by a code-owned **Scarcity Warden** that enforces the three scarce resources (dice via a density governor and free-lunch debts; resources via typed-state math; endings via close-loop escalation and a one-pass close ceremony). The model owns abundance. Code owns scarcity. The player owns the table — through free-text input, a readable retrospective, and table talk persisted as rulebook amendments on the existing Playstyle substrate.

## Core Architecture

```
player input ──► turn compiler (code): gates, density governor, close-loop
                 advisory, debts due, mechanical snapshot → uncached delta
        │
        ▼
   Narrator (Sonnet, streaming, only large-model hot-path call)
        │  prose stream · request_roll pause/resume · narrate_turn
        ▼
   commit (code): roll math, HP/resource/clock mutation via typed handlers,
                  transcript append, persistence
        │
        ├──► Archivist (Haiku, per-turn): hard-fact pins + UI extraction only
        ├──► Free-lunch sentinel (Haiku, post-turn, fail-open): debt ledger
        └──► diagnostics / replay frame
   chapter close ──► landing turn → retrospective stream → handover compile
                     (3 parallel Sonnet calls) → chapter-open compiler (code)
```

## State Model

- **Canonical typed state** (code-enforced, wins all conflicts on hard facts): character sheet, HP/wounds, inventory, credits/resources, clocks, roll ledger, NPC identity pins (name, gender, role, alive/dead), location registry, promises/debts ledger, chapter pacing contract.
- **GM memory** (prose, Narrator-facing): campaign brief; per-chapter Session Brief, GM Memory, Quick Reference; pinned player corrections; rulebook amendments.
- **Transcript**: growing in-chapter turn pairs; compacted by scene folds when over budget; replay/rendering source, never the only memory.
- **Derived**: turn-compiler outputs (gates, advisories, debts), density window, close-loop phase. Recomputed, never persisted as truth.
- **Diagnostics/replay**: existing diagnostics store + replay frames; new sensors below.

## Runtime Loop

**Normal turn:** turn compiler builds the uncached delta (snapshot, hardened gates per density window, close-loop advisory, debts due) → Narrator streams prose → `narrate_turn` carries chapter_status, suggested hooks, table amendments → code commits mechanics, appends transcript, persists → Archivist pins hard facts → sentinel inspects for free lunches.

**Roll pause/resume:** unchanged from prototype — `request_roll` pauses, code resolves d20, `rollResolution` resumes. Core game feel; do not touch timing.

**Free-lunch bounce (debt, not rewind):** sentinel flags a decisive gain without roll/cost/setup → logged; if the turn's gate was hard/hardened or density is below band floor, next turn's delta carries a binding debt directive (the gain gets paid for: follow-up roll, cost, or antagonist move). Fail-open per turn; never blocks the stream; cannot regress to SF2 density because the governor's ceiling also suppresses gates when density exceeds 1 roll per 2 turns.

**Close/open ceremony:** close-loop reaches candidacy → (if ignored 3 unblocked turns) binding landing directive → landing turn (`phase='closed'`) → retrospective streams to the player → player flags corrections inline → handover compiler (3 parallel calls, retrospective as input) → corrections pinned into handover → chapter-open compiler (zero model calls) derives next pacing contract, close conditions, complication budget → next chapter starts on handover docs as system prefix.

## Roles

| Role | Disposition | Reason |
|---|---|---|
| Narrator | keep (Sonnet, hot path) | the abundance owner |
| Archivist | keep per-turn, narrowed (Haiku) | hard-fact pinning + UI chips only; explicitly not the memory layer (assumption A) |
| Arc Author | remove | brief + handover carry the long arc; execute the frozen `.scratch/sf2-kill-arc-author/` phase 2 at promotion |
| Chapter Author | rebuild as code compiler | close conditions, pacing contract, complication budget derived with zero model calls and zero hidden wait (assumption C) |
| Chapter Meaning | remove | the retrospective + GM Memory are the transition material |
| Playstyle | keep, extended | becomes the table-talk substrate: player-visible rulebook + negotiated amendments (assumption H) |
| Handover Compiler | keep (3 parallel Sonnet calls) | exists; untested; the A/B proves or kills the three-document split (assumption E) |
| Scarcity Warden | new, code + Haiku sentinel | density governor, free-lunch debts, close escalation |
| Conductor/Scope Controller | not built | tempo stays advisory craft notes; revisit only if A/B shows scope collapse |

## Positions on the Remaining Assumptions

- **B. Working-set retrieval: cut from the hot path.** The growing transcript plus handover docs replace it. A cold-fact lookup over typed pins remains for the chapter-open compiler and conflict checks only. Working-set telemetry retires with it.
- **D. Suggested actions → authorship hooks.** Questions and open hooks, never complete actions; rendered only on player idle (~20s) or on request.
- **F. Output contract v2.** Re-measure recovery post-hardening first; target < 10% via a narrower `narrate_turn` (prose exclusively in the text channel; structure exclusively in tool input; no optional-but-required fields).
- **G. Close escalation:** N=3 unblocked candidacy turns; the existing active-blocker list gates escalation; a Narrator-named novel blocker defers escalation exactly once.

## Cache and Compaction

Four breakpoints, inherited and amended: (1) protocol/system, (2) brief + handover docs + rulebook (mutates only at chapter boundary), (3) transcript prefix advancing each turn, (4) uncached delta (snapshot, gates, debts, advisories, player input). Rulebook amendments live in the delta until the next chapter boundary to avoid poisoning prefix cache. Compaction: when in-chapter transcript exceeds budget (~20k tokens), fold closed scenes into Narrator-authored scene summaries inside the cached prefix. Pause story: accept 5-minute TTL misses (cost math: $2–3/chapter at 50% miss is acceptable); no keepalive pings.

## Persistence

Evolve `storyforge_sf2_prototype` → `storyforge_sf3`: stores `campaigns` (session blob), `save_slots` (3), `handover_artifacts` (per chapter: brief, GM memory, quick ref, retrospective, corrections), `diagnostics`. `storyforge_sf2` untouched until promotion; V1 stays in localStorage. No cross-engine migration of saves — campaigns are engine-versioned.

## Validation and Firewall

Actors: `narrator` (pending_check, narrate_turn surface, table_amendment *proposals*), `archivist` (hard-fact pins, UI extraction), `warden`/`code` (roll math, resource mutation, clock ticks, debts, close escalation, amendments *commit*), `compiler` (pacing contract, close conditions). Typed state wins all hard-fact conflicts; prose-memory contradictions of a pin get flagged to the player-visible surface, never silently rewritten. Fail closed: persistence writes, roll math, close escalation. Fail open: sentinel flags, advisories, tempo.

## Testing

All fixtures land in `fixtures/sf2/replay/` via the existing runner. Named regressions (from the prompt): delta idempotency; assertion pinning; prose seam stitching; harness-vocabulary leakage (extends `display-sentinel-*`); recovery-rate ceiling < 10%; Archivist sizing at 32k against real prototype prose; close-gate firing within grace window (extends `chapter-close-*`); close-gate escalation after 3 ignored turns; free-lunch detection; roll-density band, both bounds. Promotion to `/play` requires every one green.

## Sensors and Kill Criteria

Keep all existing reliability sensors and bands (anchor-miss ≤ 5%, continuity ≥ 50%, cost ≤ $7/session, cache ratio, TTFT, recovery rate). New narrative sensors: roll-density band compliance, free-lunch rate, scene-end cadence, complication-type distribution (subsumes forbidden-repeat), texture-survival score, time-to-emotional-core, speaking-roles breadth. **Promotion test:** same-seed A/B, ≥ 3 seeds × ≥ 3 genres ("The Tithe", "Forty Thousand", one prototype brief), to chapter 3 on candidate and incumbent, both sensor classes plus blind prose preference. Kill criteria: free-lunch rate > 15% of turns after debts enabled; any session parking > 6 turns past unblocked candidacy; recovery ≥ 10% after contract v2; texture-survival < 3/5 median; cost > $4/chapter sustained.

## Migration and Existing-Ticket Disposition

Phases are reversible behind prototype-path toggles; SF2 `/play` is untouched until the promotion gate.

- `.scratch/sf2-prose-first-narrator/` tickets: 01–04, 08–17, 19, 21 implemented or in flight — unchanged. Ticket 05 (feed handover to narrator) and 18 (close→handover flow) are **superseded** by stories 06/09 here. Ticket 07 (retire multi-role pipeline) and 20 (close reflection) fold into stories 16 and 06.
- `.scratch/sf2-kill-arc-author/`: keep frozen; phase 2 deletion executes inside story 16 cleanup.

## Stories

Phase 0 — measure: 01. Phase 1 — warden: 02, 03, 04, 05. Phase 2 — ceremony: 06, 07, 08, 09. Phase 3 — contract & memory: 10, 11, 12. Phase 4 — table: 13, 14. Phase 5 — evaluation & promotion: 15, 16. See `issues/`.
