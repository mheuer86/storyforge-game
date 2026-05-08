# SF2 domain model hardening

Status: proposed
Source: 2026-05-08 domain-model pruning conversation and `.scratch/sf2-domain-model-pruning.md`

## Context

SF2 has useful core entities, but several contracts are doing more than one job:

- Player identity/build is split between `state.player` and campaign meta.
- NPC `role` mixes fiction job and dramatic function.
- Faction has pressure state but little lifecycle or membership shape.
- Thread carries both durable tension and chapter-specific assignment fields.
- Arc and ArcPlan need clearer ownership.
- Campaign stores canonical state, derived indexes, scaffolding, and advisories side by side.
- Clues are collecting small world facts and present-moment observations, not only investigation evidence.

This track turns the discussion into local markdown issues. The first pass keeps them `proposed`; promote individual issues to `ready-for-agent` after reviewing dependencies and granularity.

Whole-set reconciliation with `.scratch/sf2-narrative-quality-pass/` lives in `WHOLE-SET-REVIEW.md`.

## Tickets

| # | Title | Type | Status | Blocked by |
|---|---|---|---|---|
| 01 | Harden clues into investigation evidence | HITL -> AFK | proposed | None |
| 02 | Add a thread lifecycle policy module | AFK | proposed | None |
| 03 | Move chapter thread assignment out of durable Thread | HITL -> AFK | proposed | 02 |
| 04 | Split NPC fiction role from dramatic role and faction refs | HITL -> AFK | proposed | None |
| 05 | Give factions lifecycle, leadership, and membership refs | HITL -> AFK | proposed | 04 |
| 06 | Clarify Arc blueprint versus in-play Arc | HITL -> AFK | proposed | None |
| 07 | Consolidate Player identity, build, and PC references | HITL -> AFK | proposed | None |
| 08 | Clarify Location source of truth and optional connections | HITL -> AFK | proposed | None |
| 09 | Split singleton Operation Plan from live Operation Runtime | HITL -> AFK | proposed | None |
| 10 | Classify Campaign fields by canonical, index, runtime, advisory, scaffolding | HITL | proposed | 01-09 and 11+ inform final shape |
| 11 | Clarify Decision and Promise agency contracts | HITL -> AFK | proposed | 02 recommended |
| 12 | Close remaining Document contract gaps | HITL -> AFK | proposed | None |
| 13 | Finish TemporalAnchor and Timer lifecycle boundary | AFK | proposed | 02 recommended |
| 14 | Tighten EmotionalBeat trigger and retention policy | HITL -> AFK | proposed | 07 recommended |
| 15 | Define pressure events with human consequences | HITL -> AFK | proposed | 02 and 03 recommended |
| 16 | Separate Archivist patch lanes by semantic role | HITL -> AFK | proposed | 15 informs pressure-event lane |
| 17 | Clarify revelations as human hidden truths, not procedural twists | HITL -> AFK | proposed | 15 recommended |
| 18 | Clarify SceneSnapshot and SceneKernel contracts | HITL -> AFK | proposed | 08 recommended |
| 19 | Harden Working Set as the retrieval selection contract | HITL -> AFK | proposed | 01, 12, 14, 18 recommended |

## Intentional non-ticket for now

Do not add a broad `Fact` entity yet. The current discomfort with clues should first be addressed by making clues sharper and redirecting non-clue observations to existing homes: thread progress events, temporal anchors, NPC/faction updates, documents, scene state, or no durable write.

## Review questions

- Does this split feel too coarse or too fine?
- Should clue hardening happen before thread lifecycle, or after thread `resolutionMode` exists?
- Should campaign restructuring be a doc-only decision first, or an implementation issue later?
- Are the HITL/AFK labels right?

## Conversation updates

- Location should gain durable identity fields such as kind, parent location, owning/associated faction, lifecycle/access status, and maybe optional `connectsTo` edges. Atmosphere should not live as durable location identity.
- Location `connectsTo` should be optional, not required topology. Use it when navigation, adjacency, containment, or travel constraints matter.
- Operation should split the singleton player-facing plan from live runtime/procedure state. The plan remains a singleton for now, but gains anchors and lifecycle clarity.
- Decisions and promises need clearer agency. A Decision should know who made it and why it matters after the anchor thread closes. A Promise should split promisor from promisee; current `owner` means recipient.
- Promise may need an intermediate `strained` state for obligations that remain active but are under visible pressure. Prefer code-derived strain triggers where possible.
- Documents are already partly hardened with type/status enums, locked attribution, revisions, and fixtures. Remaining work should close contract gaps rather than reinvent the entity.
- Temporal anchors should remain the canonical timeline facts. Thread timers should reference anchors or derive from them, while scene-kernel countdowns remain a projection.
- Emotional beats already have sparse-capture guidance and a one-per-turn cap. Remaining work is to make durable capture trigger-driven enough that routine mood, color, and repeated confessions do not pollute retrievable memory.
- Pressure should not become procedural paperwork. Every pressure increase or stage fire needs a human consequence: who is hunted, exposed, cornered, betrayed, endangered, bound, or forced to choose.
- Archivist patch output mixes state writes, turn events, memory captures, classifications, and diagnostics in one envelope. The next hardening step is to classify those lanes and make their evidence/confidence/idempotency contracts explicit.
- Revelations should not default to procedure-shaped facts such as filings, audits, logs, or forms. A revelation is a hidden truth that recontextualizes human agency, betrayal, coercion, danger, power, or obligation. Documentary surfaces remain valid only when the document exposes that human truth.
- Revelations may also be useful for failed-roll aftermath: the PC plausibly believes X after a miss or partial read, while hidden truth Y can later surface under condition Z and recontextualize the failed scene. This must not become omniscient narrator reveal; the false read is player-facing, the truth is withheld until earned by later evidence, confession, consequence, or pressure.
- Revelation cleanup should split the durable authored hidden truth from the turn events that advance or reveal it. Consider renaming `PossibleRevelation` to `AuthoredReveal` or `HiddenTruth`, with separate `hintDelivered` and `truthRevealed` events.
- SceneSnapshot should be the mutable, current-scene truth: scene id, current location reference, on-stage cast, focused interlocutors, time label, visible established facts, and replay-window cursor. SceneKernel should remain a derived read/enforcement view, never a model-written object. The current weak spot is that `set_scene_snapshot` is a broad direct write surface doing location, cast, time, scene transition, and established-fact changes at once.
- Working Set is the last major reviewed concept in this pass. It should be the deterministic retrieval selection contract: full/stub/excluded ids plus reasons and budget telemetry. Current code has the core scorer, but `stubEntityIds` barely feed Narrator context, documents/locations/temporal anchors are mostly outside the selector, and telemetry is not yet closing the loop into weight/budget calibration.
