# Roughdraft Review Packet: SF2 GM Handover Briefs
Review goal: tighten the direction and issue granularity before implementation. This packet has been updated with the Storyforge V3 PRD considerations and the 2026-05-21 Roughdraft review decisions.

Applied Roughdraft decisions:

- Setup questions happen after hook selection.
  
- Chapter Meaning is the first integration point for handover compilation; split a Continuity Editor only if needed.
  
- Stronger playtest feel is the primary success metric; faster starts are hygiene; continuity corrections are long-term evidence.
  
- The full handover may remain texture-rich and available as cached/reference prep; Current Story Surface is the priority live layer.
  
- State wins over prose memory on factual divergence, with diagnostics/repair for the handover or Story Surface.
  
- Terminal-runner artifacts should be used as an early validation path before demoting Author waits.
  

Canonical source files:

- `.scratch/sf2-gm-handover/PRD.md`
  
- `.scratch/sf2-gm-handover/issues/01-campaign-setup-produces-start-brief.md`
  
- `.scratch/sf2-gm-handover/issues/02-feed-start-brief-to-narrator-chapter-1.md`
  
- `.scratch/sf2-gm-handover/issues/03-compile-chapter-close-gm-handover.md`
  
- `.scratch/sf2-gm-handover/issues/04-feed-session-brief-to-narrator-continuation.md`
  
- `.scratch/sf2-gm-handover/issues/05-shadow-story-surface-and-scope-telemetry.md`
  
- `.scratch/sf2-gm-handover/issues/06-exercise-brief-flow-through-terminal-runner.md`
  
- `.scratch/sf2-gm-handover/issues/07-retire-author-waits-after-brief-path-proves-out.md`
  

* * *
# PRD: .scratch/sf2-gm-handover/PRD.md
# SF2 GM Handover Briefs
Status: shaping-refined Type: Planning artifact Source: 2026-05-21 conversation, Pale Flame handover examples, and `/Users/martin/Downloads/storyforge_v3_prd.md`
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
| --- | --- | --- |
| GM Memory | How to run this campaign for this player and PC. | Player style, PC interpretation, craft notes, evidence-backed avoid-pattern memory, pacing/tone notes, design wishes. |
| Session Brief | What to run next. | Setting deltas, systems, clocks, roster, letters/evidence, active threads, opening conditions, chapter shape. |
| Quick Reference | One-glance play aid. | Stats, key tensions, active clocks, carried items, drives, companion state. |

The key distinction: these documents preserve **judgment**. They do not merely summarize events. They say what worked, what not to repeat, what ambiguity is intentional, what facts are settled, which costs are still being paid, and what the next scene promises.

Early GM Memory should not pretend to know more than it does. Avoid-pattern memory starts from explicit player corrections, diagnostics, roughdraft/post-session review, and observed repeated failures. It can be sparse at first; it becomes powerful as evidence accumulates.
## What The V3 PRD Adds
The V3 PRD is broader than this handover slice. It names the larger narrative layer: Conductor, Story Surface, Owed Questions, Scene Exhaustion, Sequence Advance, Chapter Job, Major Deltas, embodied pressure, and macro suggested actions.

For this PRD, integrate the parts that make handovers useful without turning the first slice into the whole V3 architecture:

| V3 consideration | Integrate now as | Why |
| --- | --- | --- |
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
1. [Campaign Setup Produces Start Brief](./issues/01-campaign-setup-produces-start-brief.md)
  
2. [Feed Start Brief To Narrator Chapter 1](./issues/02-feed-start-brief-to-narrator-chapter-1.md)
  
3. [Compile Chapter-Close GM Handover](./issues/03-compile-chapter-close-gm-handover.md)
  
4. [Feed Session Brief To Narrator Continuation](./issues/04-feed-session-brief-to-narrator-continuation.md)
  
5. [Shadow Story Surface And Scope Telemetry](./issues/05-shadow-story-surface-and-scope-telemetry.md)
  
6. [Exercise Brief Flow Through Terminal Runner](./issues/06-exercise-brief-flow-through-terminal-runner.md)
  
7. [Retire Author Waits After Brief Path Proves Out](./issues/07-retire-author-waits-after-brief-path-proves-out.md)
  
## Open Questions
- How should the handover/Story Surface repair loop work when state and prose memory disagree?
  
- How short can the Current Story Surface be while still beating structured-only state for Narrator continuity, and when should the full handover remain available as cached reference context?
  
- Should scope control stay deterministic at first, or should ambiguous pivots get a small model Conductor later?
  

* * *
# Issue 01: .scratch/sf2-gm-handover/issues/01-campaign-setup-produces-start-brief.md
# Campaign Setup Produces Start Brief
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / setup / GM handover
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Turn the existing setup calibration payload into a first-session GM handover artifact.

After the setup conversation collects player-authored answers, compile the selected genre/origin/playbook/hook plus the answers into a campaign-start artifact with three sections: GM memory, Chapter 1 session brief, and quick reference. This artifact should be stored outside transcript history and should remain usable even when the player skips setup.

The artifact should also include the V3-ready primitives needed for live play: an initial Current Story Surface, question-shaped obligations, embodied pressure, do-not-restage constraints, and lightweight chapter motion targets. Keep the full handover textured enough to be useful as GM prep; the Story Surface is the shorter priority rendering for live Narrator use.

This slice does not need to bypass Author roles yet. It proves the artifact shape and persistence path while preserving the current campaign start flow.
## Acceptance criteria
- [ ] 
  
  Setup output includes a migration-safe first-session handover artifact separate from transcript turns.
  
- [ ] 
  
  The artifact has explicit sections for GM memory, Chapter 1 session brief, and quick reference.
  
- [ ] 
  
  The artifact includes an initial Current Story Surface: compact prose that says what this campaign is already about, what the opening must not forget, and what the first scene owes.
  
- [ ] 
  
  The full handover remains available as a diagnostics/export/reference artifact; the Story Surface is derived from it rather than replacing it.
  
- [ ] 
  
  The artifact includes question-shaped obligations rather than only vibe labels, for example oath/debt/relationship/opening-pressure questions with progress/fake-progress hints.
  
- [ ] 
  
  Pressure items name who pays, what hurts, and one visible image, not only abstract clocks or institutions.
  
- [ ] 
  
  The artifact includes a do-not-restage list for setup facts and settled premises.
  
- [ ] 
  
  The session brief includes lightweight chapter motion targets: first decision promise, candidate major delta, and a rough "chapter job" expressed in prose.
  
- [ ] 
  
  GM memory captures campaign-local player/PC guidance derived from setup answers without becoming cross-campaign profiling.
  
- [ ] 
  
  GM memory can represent avoid-pattern memory sparsely at first, using only explicit setup evidence, player correction, diagnostics, or review notes.
  
- [ ] 
  
  The session brief captures opening conditions, immediate pressure, candidate clocks/tensions, and the first decision promise in player-authored terms.
  
- [ ] 
  
  The quick reference captures PC setup, oath/anchor/debt surfaces, key carried facts, and any companion/debt hooks available at start.
  
- [ ] 
  
  Skipped setup still produces a minimal deterministic start brief from selected setup and hook.
  
- [ ] 
  
  Diagnostics/export can inspect the compiled start brief.
  
- [ ] 
  
  A focused replay/helper fixture proves setup answers compile into the artifact and old saves without the artifact normalize safely.
  
## Blocked by
- `.scratch/sf2-narrative-tempo/issues/08-initial-campaign-setup-narrative-calibration-questions.md`
  

* * *
# Issue 02: .scratch/sf2-gm-handover/issues/02-feed-start-brief-to-narrator-chapter-1.md
# Feed Start Brief To Narrator Chapter 1
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / Narrator / chapter start
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Use the first-session handover artifact as the Narrator's Chapter 1 opening context behind a reversible gate.

When the gate is enabled and a valid start brief exists, Chapter 1 should open by sending the brief to the Narrator as private opening context instead of waiting for Arc Author and Chapter Author to invent the opening harness. If the brief path fails, the client should fall back to the existing Arc Author / Chapter Author flow.

Render the start brief into a Current Story Surface plus compact sections for owed questions, embodied pressure, do-not-restage constraints, and opening scope guidance. The full handover may also be available as a cached/reference document; the key is that the live prompt starts with the priority Story Surface instead of forcing the model to infer priorities from a long document every turn.
## Acceptance criteria
- [ ] 
  
  A single internal gate controls whether Chapter 1 can use brief-driven opening.
  
- [ ] 
  
  Narrator initial context includes the first-session brief when the gate is enabled and the artifact is valid.
  
- [ ] 
  
  Narrator initial context starts from a Current Story Surface rendered from the brief, not raw JSON alone.
  
- [ ] 
  
  The full start brief can remain available as reference context or diagnostics when useful; priority guidance still comes from the Story Surface and compact obligations.
  
- [ ] 
  
  Owed questions from setup are included as private obligations with fake-progress warnings.
  
- [ ] 
  
  Embodied pressure from the brief reaches Narrator context as who-pays / what-hurts / visible-image guidance.
  
- [ ] 
  
  The initial scope guidance tells Narrator whether the opening should be close play, sequence movement, or relationship setup without exposing internal labels to the player.
  
- [ ] 
  
  The prompt frames the brief as GM prep and opening context, not as player-facing prose to quote.
  
- [ ] 
  
  The Chapter 1 brief path bypasses Arc Author and Chapter Author only when the gate is enabled.
  
- [ ] 
  
  Failure or missing brief falls back to the current Author path without blocking campaign start.
  
- [ ] 
  
  Diagnostics record which path opened the chapter and how much latency was avoided or incurred.
  
- [ ] 
  
  Replay/helper coverage proves the Narrator initial context includes the brief and that Author fallback still works.
  
## Blocked by
- 01-campaign-setup-produces-start-brief.md
  

* * *
# Issue 03: .scratch/sf2-gm-handover/issues/03-compile-chapter-close-gm-handover.md
# Compile Chapter-Close GM Handover
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / chapter close / GM handover
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Compile a Pale-Flame-style chapter-close handover artifact from existing chapter-close evidence.

At chapter close, after Chapter Meaning and playstyle personalization run, produce a readable handover artifact for the next chapter. It should combine Chapter Meaning, deterministic state, playstyle profile, rulebook interpretations, clocks/tensions, active roster, recent scene summaries, and unresolved promises into GM memory, next-session brief, and quick reference sections.

Fold in the V3 Chapter Meaning lessons: preserve what the chapter did to people, who the player became in others' eyes, irreversible changes, relationship deltas, owed next scenes, unresolved questions, recurring images/objects, and explicit do-not-restage constraints.

This slice should not remove Chapter Author yet. It creates the handover artifact and makes it visible in diagnostics/export.

Prefer integrating this into the existing Chapter Meaning synthesis path first. If the single role/tool becomes too large or unreliable, split a separate Continuity Editor later.
## Acceptance criteria
- [ ] 
  
  Chapter close stores a migration-safe GM handover artifact for the next chapter.
  
- [ ] 
  
  The first implementation attempts to extend/wrap Chapter Meaning rather than adding an unrelated continuity role.
  
- [ ] 
  
  The artifact includes GM memory, next-session brief, and quick reference sections.
  
- [ ] 
  
  The artifact includes a next Current Story Surface seed for the next chapter opening.
  
- [ ] 
  
  The artifact includes question-shaped unresolved obligations with progress and fake-progress hints.
  
- [ ] 
  
  The artifact includes irreversible changes, relationship deltas, owed next scenes, recurring images/objects, and do-not-restage constraints from Chapter Meaning and state evidence.
  
- [ ] 
  
  The artifact includes chapter motion material: chapter job, candidate major deltas, phase/current-phase notes, and any missed/owed movement from the closing chapter.
  
- [ ] 
  
  GM memory captures player technique, PC interpretation, craft lessons, and error/avoid-pattern memory with evidence when available; it does not fabricate a mature error memory from one chapter.
  
- [ ] 
  
  The session brief captures setting deltas, clocks/tensions, active roster, open evidence, opening conditions, chapter shape, and explicit do-not-restage constraints.
  
- [ ] 
  
  Pressure items are converted into embodied pressure: who pays, what hurts, visible image, and next choice pressure.
  
- [ ] 
  
  The quick reference captures stats/mechanics, core tensions, active clocks, carried items/evidence, drives, and companion/faction watchpoints.
  
- [ ] 
  
  Playstyle personalization and campaign rulebook interpretation remain separate sections and are not collapsed into generic summary.
  
- [ ] 
  
  The compiler fails open: chapter transition can continue without a handover artifact.
  
- [ ] 
  
  If handover prose contradicts structured state, diagnostics flag the divergence and the structured state remains authoritative.
  
- [ ] 
  
  Diagnostics/export include the handover and validation findings.
  
- [ ] 
  
  Focused fixture coverage proves Chapter Meaning + playstyle + state compile into the expected handover fields.
  
## Blocked by
- `.scratch/sf2-playstyle-personalization/issues/02-persist-artifacts-and-rolling-profile.md`
  
- `.scratch/sf2-playstyle-personalization/issues/06-campaign-rulebook-interpretation-contract.md`
  

* * *
# Issue 04: .scratch/sf2-gm-handover/issues/04-feed-session-brief-to-narrator-continuation.md
# Feed Session Brief To Narrator Continuation
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / Narrator / chapter transition
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Use the latest next-session handover brief as the Narrator's opening context for Chapter 2+ behind a reversible gate.

When a chapter closes and a valid handover exists, the next chapter can begin from the brief rather than waiting for Chapter Author to synthesize a new chapter setup. The old Chapter Author path remains fallback until the brief-driven path has enough playtest/replay evidence.

As with Chapter 1, render the handover into live Narrator context: Current Story Surface first, then owed questions, embodied pressure, do-not-restage, current phase/major-delta guidance, and scope hints. The full handover may remain available as cached/reference context, especially for texture-rich cross-chapter continuity.
## Acceptance criteria
- [ ] 
  
  A single internal gate controls whether continuation chapters can use brief-driven opening.
  
- [ ] 
  
  Narrator initial context for Chapter 2+ includes the next-session brief, quick reference, and relevant GM memory when enabled.
  
- [ ] 
  
  Narrator initial context includes the Current Story Surface rendered from the handover.
  
- [ ] 
  
  The full handover can remain available as reference context or diagnostics; the Current Story Surface owns the immediate priorities.
  
- [ ] 
  
  Owed questions and do-not-restage constraints are included and checked in diagnostics for the first turn.
  
- [ ] 
  
  Embodied pressure guidance names who pays and what visible cost should shape the opening.
  
- [ ] 
  
  Phase/current-major-delta guidance tells the Narrator what chapter-scale movement is owed before the local scene can loop.
  
- [ ] 
  
  The brief is treated as private GM prep and must not be quoted as a document in player-facing prose.
  
- [ ] 
  
  Missing, invalid, or failed handover falls back to the current Chapter Author transition path.
  
- [ ] 
  
  State/prose-memory divergence is handled by trusting structured state for facts and logging a handover/Story Surface repair diagnostic.
  
- [ ] 
  
  The chapter close/open flow records diagnostics for brief path vs Author path, including latency and validation findings.
  
- [ ] 
  
  Replay/helper coverage proves a next-session brief reaches Narrator context and that fallback still preserves existing transition behavior.
  
## Blocked by
- 03-compile-chapter-close-gm-handover.md
  

* * *
# Issue 05: .scratch/sf2-gm-handover/issues/05-shadow-story-surface-and-scope-telemetry.md
# Shadow Story Surface And Scope Telemetry
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / diagnostics / narrative scope
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Add diagnostics-only telemetry that evaluates whether the handover-derived Story Surface is producing chapter-scale movement.

This is the V3 Conductor learning slice, but in shadow mode. Do not enforce scope shifts yet. Instead, derive and export signals that show whether the current scene is looping, whether owed questions moved, whether pressure was embodied, and whether a major delta or phase change happened in time.

Scope here means narrative scale: close micro play, sequence advance, montage, pivot scene, downtime/relationship scene, or chapter-level move. This ticket records recommendations only.
## Acceptance criteria
- [ ] 
  
  Diagnostics include the Current Story Surface used for the turn or opening.
  
- [ ] 
  
  Diagnostics include owed-question movement status: touched, sharpened, answered, deferred-with-cost, or untouched.
  
- [ ] 
  
  Diagnostics include repeated-procedure / scene-exhaustion signals such as repeated nouns, repeated obstacle, turns since concrete delta, and recommended scope shift.
  
- [ ] 
  
  Diagnostics include pressure-embodiment status for pressure advances: who pays / what hurts / visible image present or missing.
  
- [ ] 
  
  Diagnostics include any divergence between the Story Surface/handover and structured state, with structured state marked authoritative for hard facts.
  
- [ ] 
  
  Diagnostics include chapter motion status: candidate major deltas, whether one has landed, and whether the chapter is at risk of zero advancement after 8-12 turns.
  
- [ ] 
  
  Shadow scope recommendations are recorded but do not change Narrator behavior yet.
  
- [ ] 
  
  Replay/helper coverage proves the telemetry fires for a procedural-loop fixture and stays quiet for a scene with concrete delta.
  
## Blocked by
- 01-campaign-setup-produces-start-brief.md
  
- 03-compile-chapter-close-gm-handover.md
  

* * *
# Issue 06: .scratch/sf2-gm-handover/issues/06-exercise-brief-flow-through-terminal-runner.md
# Exercise Brief Flow Through Terminal Runner
Status: ready-for-agent Labels: ready-for-agent Type: AFK Area: SF2 / terminal runner / GM handover validation
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to build
Use the SF2 terminal-runner plan as the first practical test harness for brief-driven openings and chapter-close handover generation.

The browser remains the real player surface, but the handover path needs fast iteration: generate a campaign or load a fixture state, compile a start or next-session handover, run the Narrator opening from that handover, and write artifacts that can be inspected or converted into replay fixtures. This slice connects the GM handover work to `.scratch/sf2-tui/` instead of requiring every experiment to go through the browser UI.
## Acceptance criteria
- [ ] 
  
  Terminal runner docs or command help describe how to run a handover-driven campaign start or chapter transition once the relevant gates exist.
  
- [ ] 
  
  A terminal/debug path can generate or load a first-session handover and show the rendered Current Story Surface before the Narrator call.
  
- [ ] 
  
  A terminal/debug path can generate or load a chapter-close handover from a state/replay fixture and write the handover artifact to the run bundle.
  
- [ ] 
  
  Terminal artifacts include the handover, Current Story Surface, owed questions, embodied pressure, do-not-restage list, shadow scope telemetry, and final Narrator output where available.
  
- [ ] 
  
  The path can be used without changing browser `/play` behavior.
  
- [ ] 
  
  The path produces enough artifact data to compare brief-driven opening against the current Author path.
  
- [ ] 
  
  Documentation links this workflow to `.scratch/sf2-tui/` and explains when to use terminal runs versus browser play or replay fixtures.
  
## Blocked by
- `.scratch/sf2-tui/issues/01-one-turn-sf2-terminal-runner.md`
  
- `.scratch/sf2-tui/issues/05-run-artifact-export-bundle.md`
  
- 01-campaign-setup-produces-start-brief.md
  
- 03-compile-chapter-close-gm-handover.md
  

* * *
# Issue 07: .scratch/sf2-gm-handover/issues/07-retire-author-waits-after-brief-path-proves-out.md
# Retire Author Waits After Brief Path Proves Out
Status: ready-for-human Labels: ready-for-human Type: HITL Area: SF2 / architecture / role pipeline
## Parent
`.scratch/sf2-gm-handover/PRD.md`
## What to decide
Decide whether Arc Author and Chapter Author should be removed, demoted to fallback/debug-only paths, or retained for specific scenarios after the brief-driven setup and transition paths have real evidence.

This is deliberately a decision ticket, not an implementation ticket. The risky part is not deleting code; it is deciding whether the GM handover + Narrator + Archivist loop now carries enough structure to replace hidden authoring waits without regressing chapter coherence.
## Acceptance criteria
- [ ] 
  
  Compare at least one campaign start and one cross-chapter transition through the brief path against the old Author path.
  
- [ ] 
  
  Include at least one terminal-run artifact bundle in the comparison, so the decision is based on repeatable evidence and not only browser feel.
  
- [ ] 
  
  Review diagnostics for latency, continuity corrections, rejected patches, display leaks, unresolved pressure, story-surface quality, owed-question movement, scene-exhaustion signals, major-delta movement, and player-visible setup feel.
  
- [ ] 
  
  Decide the future role of Arc Author: remove, fallback-only, or keep for multi-chapter arc planning.
  
- [ ] 
  
  Decide the future role of Chapter Author: remove, fallback-only, or keep for specific chapter types.
  
- [ ] 
  
  If removal/demotion is approved, create AFK implementation tickets with concrete migration and fallback steps.
  
- [ ] 
  
  If removal/demotion is rejected, update the GM handover PRD with the narrower supported role.
  
## Blocked by
- 02-feed-start-brief-to-narrator-chapter-1.md
  
- 04-feed-session-brief-to-narrator-continuation.md
  
- 05-shadow-story-surface-and-scope-telemetry.md
  
- 06-exercise-brief-flow-through-terminal-runner.md
