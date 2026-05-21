# SF2 GM Handover Briefs

Status: shaping-refined
Type: Planning artifact
Source: 2026-05-21 conversation, Pale Flame handover examples, and `/Users/martin/Downloads/storyforge_v3_prd.md`

## Direction

The handover is the author. The Story Surface is the live face of the handover.

SF2 should learn from the best web Claude cross-chapter results: extensive, readable GM handover documents carried continuity better than hidden Arc Author / Chapter Author passes. The next architecture slice should turn setup and chapter close into handover generation, then let the Narrator run from those artifacts.

This is not a return to transcript memory. It is a second state layer plus a rendering discipline:

- Machine state: typed campaign graph, clocks, rolls, patches, validation.
- GM memory state: interpretive continuity, player technique, PC reading, craft lessons, active tensions, opening conditions, and quick reference.
- Current Story Surface: compact prose memory rendered from machine state plus GM memory for the Narrator's immediate turn.

The full handover can be longer and texture-rich, closer to the web Claude prep documents. The Story Surface is not a replacement for the handover; it is the priority layer that tells the Narrator what matters right now. Later chapters may cache or include the full handover as a reference document while still putting the shorter Story Surface first.

## Causal Model

If setup and chapter close produce handover briefs that preserve judgment rather than only facts, the Narrator can maintain campaign coherence with less hidden pre-authoring delay. The player experiences setup as active GM conversation instead of a waiting exercise, and chapter starts can feel like a GM continuing from prep rather than a separate model inventing a new harness.

If those handovers also compile into a short Current Story Surface, Owed Questions, embodied pressure, and scope guidance, the Narrator gets the same modality it writes in: prose and dramatic obligations, backed by structured state.

## What The Pale Flame Docs Teach

The useful artifact family has three parts:

| Artifact | Purpose | Carries |
|---|---|---|
| GM Memory | How to run this campaign for this player and PC. | Player style, PC interpretation, craft notes, evidence-backed avoid-pattern memory, pacing/tone notes, design wishes. |
| Session Brief | What to run next. | Setting deltas, systems, clocks, roster, letters/evidence, active threads, opening conditions, chapter shape. |
| Quick Reference | One-glance play aid. | Stats, key tensions, active clocks, carried items, drives, companion state. |

The key distinction: these documents preserve **judgment**. They do not merely summarize events. They say what worked, what not to repeat, what ambiguity is intentional, what facts are settled, which costs are still being paid, and what the next scene promises.

Early GM Memory should not pretend to know more than it does. Avoid-pattern memory starts from explicit player corrections, diagnostics, roughdraft/post-session review, and observed repeated failures. It can be sparse at first; it becomes powerful as evidence accumulates.

## What The V3 PRD Adds

The V3 PRD is broader than this handover slice. It names the larger narrative layer: Conductor, Story Surface, Owed Questions, Scene Exhaustion, Sequence Advance, Chapter Job, Major Deltas, embodied pressure, and macro suggested actions.

For this PRD, integrate the parts that make handovers useful without turning the first slice into the whole V3 architecture:

| V3 consideration | Integrate now as | Why |
|---|---|---|
| Current Story Surface | A required priority rendering of each handover into prose context for Narrator openings. | The Narrator writes prose better from prose-shaped memory than from raw entity blocks. |
| Owed Questions | Question-shaped obligations in briefs and quick references. | Threads named as questions are harder to advance with fake progress. |
| Embodied pressure | Every pressure item should name who pays, what hurts, and the visible image. | Prevents procedure from becoming the story surface. |
| Do-not-restage | First-class section in every handover and Narrator opening context. | Stops later chapters from replaying solved emotional/mechanical questions. |
| Chapter Job / Major Deltas | Lightweight chapter motion targets in session briefs. | Makes chapter-scale movement auditable without reintroducing a hidden Author harness. |
| Scene Exhaustion / Scope | Shadow telemetry first, then scoped Narrator guidance. | The system already has narrative tempo work; handovers should feed it, not duplicate it. |

Do not integrate the full Conductor schema yet. Treat the V3 PRD as the north star for later scope control. The immediate handover work should create the artifacts and telemetry that make a Conductor easier to evaluate.

In this PRD, **scope control** means narrative scale control: whether the next response should stay in close micro play, compress a sequence, pivot scenes, run a montage, or make a chapter-level move. It is not a new ownership layer for state writes.

## Relationship To Existing SF2 Work

- Setup calibration already stores player-authored Q/A. Refine it so the interaction produces a first-session handover, not just `playerCalibration` for hidden Author roles.
- Chapter Meaning already creates a transition seed. Expand or wrap it into a richer handover compiler rather than asking Chapter Author to reinterpret a short seed from scratch.
- Playstyle personalization already captures human-player GM technique. It should become a GM Memory section, not only a prompt block for Chapter Author.
- Campaign rulebook interpretation already captures local rule readings. It should appear in the session brief/quick reference when relevant.
- Narrative tempo already introduced scope modes and scene-exhaustion ideas. GM handovers should provide the dramatic obligations and do-not-restage material those modes need.
- Pressure runtime already computes pressure. GM handovers should convert that pressure into human cost before it reaches the Narrator.
- The SF2 terminal-runner plan in `.scratch/sf2-tui/` is the preferred early test harness for brief-driven openings and chapter-close handover generation. Terminal runs can exercise new flows, generate handovers from fixtures, and produce replay/debug artifacts without changing the browser experience first.
- Archivist remains responsible for durable campaign graph writes after visible play. Handover docs can suggest tensions and candidate clocks, but they do not directly create canonical entities.

## Guardrails

- Do not delete Arc Author / Chapter Author in the first slice. Gate and compare the brief-driven path.
- Do not build the full V3 Conductor in the handover slice. Start with brief generation, Story Surface rendering, and shadow scope telemetry.
- Do not let Narrator own durable state writes beyond its current visible mechanical annotations.
- If prose memory and structured state diverge, structured state wins for hard facts. The divergence should create a diagnostic/repair task: regenerate or amend the handover/Story Surface from state and evidence, rather than persisting the prose contradiction as fact.
- Do not make setup mandatory or fragile. Fail open to the current Author path.
- Do not expose internal section names in normal play UI unless diagnostics are open.
- Do not turn GM Memory into cross-campaign player profiling. It remains campaign-local.
- Preserve streaming and roll pause/resume behavior.

## Decisions From Roughdraft Review

- Setup order: character setup -> hook selection -> interactive setup questions -> campaign start. The first version asks questions after hook selection so the handover can tailor a concrete opening destination.
- Chapter Meaning should be extended into the handover compiler first. If one model/tool gets overloaded, split a separate Continuity Editor later.
- First success metric: stronger playtest feel. Faster chapter start is a hygiene metric. Continuity corrections and multi-chapter coherence are long-term metrics.
- Handover length is an experiment. Do not prematurely force the full handover to be tiny; web Claude's longer documents may carry useful texture. Keep the live Story Surface bounded, but allow a fuller cached/reference handover.
- Terminal debug flow should be used to test brief-driven openings and generated handovers before demoting browser Author waits.

## Ticket Index

1. [Campaign Setup Produces Start Brief](issues/01-campaign-setup-produces-start-brief.md)
2. [Feed Start Brief To Narrator Chapter 1](issues/02-feed-start-brief-to-narrator-chapter-1.md)
3. [Compile Chapter-Close GM Handover](issues/03-compile-chapter-close-gm-handover.md)
4. [Feed Session Brief To Narrator Continuation](issues/04-feed-session-brief-to-narrator-continuation.md)
5. [Shadow Story Surface And Scope Telemetry](issues/05-shadow-story-surface-and-scope-telemetry.md)
6. [Exercise Brief Flow Through Terminal Runner](issues/06-exercise-brief-flow-through-terminal-runner.md)
7. [Retire Author Waits After Brief Path Proves Out](issues/07-retire-author-waits-after-brief-path-proves-out.md)

## Open Questions

- How should the handover/Story Surface repair loop work when state and prose memory disagree?
- How short can the Current Story Surface be while still beating structured-only state for Narrator continuity, and when should the full handover remain available as cached reference context?
- Should scope control stay deterministic at first, or should ambiguous pivots get a small model Conductor later?
