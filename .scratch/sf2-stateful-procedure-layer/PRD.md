# SF2 Stateful Procedure Layer

Status: needs-triage
Labels: needs-triage
Owner: TBD

## Problem Statement

SF2 has strong durable narrative state, bounded retrieval, roll pauses, pressure engines, and chapter transitions, but it does not yet have the V1-level depth for procedure-heavy play. V1 had useful modules for operations, infiltration, exploration, investigation, and combat. Those modules helped Claude run plans, stealth sequences, clues, clocks, and tactical consequences, but they were prompt-heavy and string-maintained.

The Iron Veil benchmark shows the gap clearly. Great play came from a stateful operation loop: gather intelligence, choose an operational posture, build a plan, earn advantages through preparation, get compromised during access, revise the plan, act under exposure pressure, reach egress, and let the outcome reshape the next chapter. Current SF2 can support pieces of that loop, but its operation model is too thin and chapter continuation rules can accidentally treat an active multi-chapter operation as stale procedure instead of live story.

## Solution

Reintroduce V1-style procedure modules in a V2 shape: a shared genre-neutral procedure kernel, typed state, validation, retrieval packets, player-facing HUDs, replay fixtures, and Narrator/Archivist guidance that reads and mutates procedure state rather than relying on prompt memory.

The first implementation bet is the shared procedure kernel. Operations plus access/infiltration then ship on top of that kernel because the benchmark loop depends on their handoff: planning creates tactical commitments, failed access mutates the plan, access pressure consumes the plan, alert/exposure changes available exits, and egress resolves or reframes the operation.

Procedures are building blocks, not the whole story grammar. A seed, arc, or chapter should not be forced into operation planning just because operations now exist. The 40,000-credit starter may be better served by crew formation, desperate debt, compromised trust, hidden cargo, and stumbling into the larger plot. The procedure layer should activate when the fiction enters a load-bearing procedure, then deactivate, complete, or reframe when that procedure has done its dramatic work.

SF2 also needs a tempo layer. Iron Veil works because the GM can expand a group-planning beat, compress several days of preparation into a montage, zoom into a risky hatch roll, and then slow down for debrief or praise. That should be modeled as state-derived beat mode, not as a blanket permission for 40-60 turn chapters.

Procedural play also needs off-screen task support. Delegated sources should be able to own parallel tasks with a work window and result event: decode a message, scout a route, rebuild an access plan, prepare a ritual, compile an exploit, trace ownership. Those tasks can surface during montage, feed procedure facts, and keep the world moving while the player makes command-level decisions.

The Arc Author remains a pressure-field author, not a mission-beat author. It should produce durable forces, pressure engines, stance axes, and possible endgames. It should not predefine concrete mission chapters like "get hired by Carren" or "storm Pinnacle." Chapter Author remains reactive, but gains a state-derived exception: when an active procedure crosses a chapter boundary, the next chapter should continue or reframe that procedure instead of introducing unrelated escalation.

All core procedure concepts must be reusable across genres. A space-opera freighter insertion, grimdark castle infiltration, cyberpunk network intrusion, fantasy ruin expedition, noir investigation, and tactical fight should share the same kernel vocabulary. Genre-specific phrasing belongs in labels and rendering, not in persistent enum values.

The larger narrative rule is forward motion. Failed rolls should create new constraints. Successes should create new affordances. Revealed facts should change the active question. Once a beat has resolved, failed, or mutated, the system should not keep restating the same obstacle just to satisfy a target turn range.

## User Stories

1. As a player, I want an operation to remember its objectives, so that my plan still matters after several turns.
2. As a player, I want procedure facts to stay visible, so that confirmed information does not dissolve back into prose.
3. As a player, I want asset constraints to be tracked, so that limited tools like a single-use cloak or charge matter.
4. As a player, I want abort conditions to be explicit, so that I understand what makes a plan fail or change shape.
5. As a player, I want signals and contingency triggers to persist, so that crew coordination can pay off later.
6. As a player, I want uncertain planning assumptions to require rolls, so that planning is play rather than summary.
7. As a player, I want support sources to challenge and refine plans, so that council scenes, lone preparation, ritual setup, and technical staging feel alive.
8. As a player, I want failed access, credential, stealth, hack, ritual, or social rolls to mutate the operation, so that failure creates constraints instead of dead ends.
9. As a player, I want alert/exposure clocks visible during access and infiltration, so that rising danger is concrete.
10. As a player, I want egress to be a real phase, so that getting out is not hand-waved after the objective is complete.
11. As a player, I want long operations to survive chapter boundaries, so that a multi-chapter mission does not reset into unrelated pressure.
12. As a player, I want new NPCs inside an operation to fold into the live plan, so that Carren/Jessek-style complications feel organic.
13. As a player, I want investigation evidence to be synthesized into case state, so that clues become actionable theories and unresolved questions.
14. As a player, I want procedure facts and investigation clues to remain distinct, so that procedural texture is not rejected as clue spam.
15. As a player, I want combat to have stateful procedure support, so that tactical fights have positions, threats, objectives, and consequences.
16. As a player, I want exploration to track current area, mapped routes, unexplored branches, hazards, and resources, so that moving through a facility is tactical play rather than prose geography.
17. As a player, I want quick actions to reflect the active procedure, so that suggested actions respect the current plan and pressure.
18. As a player, I want the Arc Author to create flexible pressure fields, so that the same hook can become investigation, access/infiltration, assault, egress, social bargain, hack, ritual, or political fallout depending on play.
19. As a player, I want Chapter Author to respond to the prior chapter landing, so that the next chapter feels earned rather than prewritten.
20. As a developer, I want procedure state to be validated before persistence, so that model drift does not corrupt the campaign.
21. As a developer, I want procedure retrieval packets to be bounded and testable, so that complex operations do not blow up context.
22. As a developer, I want replay fixtures for Iron Veil-like play, so that procedure behavior can regress safely.
23. As a player, I want procedures to appear only when the fiction calls for them, so that social, crew-building, mystery, and fallout chapters are not flattened into mission planning.
24. As a player, I want a failed or resolved procedural beat to change my options, so that play moves forward instead of repeating the same locked door, clamp, checkpoint, or access gate.
25. As a player, I want a chapter to close or reframe when its dramatic question has landed, so that an early resolution does not stall until an arbitrary turn count is reached.
26. As a player, I want planning, montage, engagement, reckoning, and aftermath beats to use different pacing, so that the story can breathe when the dramatic unit needs it.
27. As a player, I want delegated support sources to carry off-screen tasks, so that expertise produces concrete results instead of flavor.
28. As a player, I want compressed time to advance tasks and pressures, so that skipping days does not feel like skipping consequence.
29. As a player, I want planning to remember who or what contributed, so that earned advantages and objections come from actual support sources.
30. As a developer, I want a shared genre-neutral procedure kernel, so that operation, access, exploration, investigation, combat, and montage state do not invent incompatible schema dialects.
31. As a player, I want the same procedure rules to support a station insertion, castle infiltration, network hack, or ruin expedition, so that genre changes alter texture without breaking mechanics.
32. As a player, I want a chapter to close, reframe, or promote a successor when its foreground objective lands, so that the game does not keep adding fees, reviews, locks, or gates because a target turn floor has not been reached.
33. As a player, I want procedure state to activate only when it changes my future options, so that the game gains tactical depth without forcing every seed into an operation.
34. As a player, I want multi-part inputs to resolve in order, including multiple rolls when needed, so that "do X, then Y" plays like an ordered plan instead of one blended outcome.
35. As a player, I want roll gates to fire reliably before outcomes, so that meaningful uncertainty uses dice like V1 did.
36. As a player, I want obligations, gates, and deadlines to be represented as hard state, so that debt, clearance, payment, and time pressure cannot contradict themselves in prose.
37. As a player, I want NPC first observations to anchor identity and profile facts, so that later turns do not reintroduce the same person as if they just became legible.

## Implementation Decisions

- Build a procedure layer, not a bundle of prompt modules. A procedure is active, typed campaign/chapter state with lifecycle, packets, validation, UI surface, and replay coverage.
- Build a shared procedure kernel before specialized modules. The kernel owns lifecycle, links, semantic phases, facts, constraints, affordances, complications, support contributions, typed results, role contracts, and validation invariants.
- Store genre-neutral semantic values and render genre-specific labels separately.
- Preserve procedure granularity in validation and deduplication. Dedup should merge only within the same entity kind and parent scope; it should link related records rather than flattening locations into areas/nodes, routes into route constraints, credentials into NPCs, scrutiny layers into hazards, or procedure facts into clues.
- Treat every procedure as an optional building block. Procedure selection should be state-derived from the live fiction, not imposed by seed, genre, arc, or chapter type.
- Add a beat-mode tempo contract around procedure play. Beat mode should affect word budget, roll pressure, scope tolerance, suggested-action shape, and close pressure.
- Add off-screen task state for delegated work during compressed time. Tasks should have a generic owner, goal, status, work window, typed partial result, typed final result, and links to relevant procedures, threads, clues, or facts.
- Start specialized modules with operation plus access/infiltration because they form one benchmark loop. Operation without access pressure is a briefing document. Access pressure without operation is just stealth checks.
- Let operation phases be mission-like without creating a separate Mission entity yet. Operation runtime can cover orientation, commitment, preparation, engagement, egress, reckoning, and aftermath when the live fiction needs those phases.
- Keep `Sf2OperationPlan` as the player's intended plan, but split it from live runtime/procedure state. Existing domain-model work on the singleton operation plan should be treated as prior art.
- Operation state should recover the useful V1 fields in kernel language: phase, objectives, procedure facts, constraints, abort conditions, signals, and assessments.
- Planning assessments should preserve a `rolled` flag or equivalent so untested assumptions can be surfaced and resolved.
- Access/infiltration state should model access posture, credential/mask status, alert/exposure clock, scrutiny layers, active complications, and egress phase.
- Exploration state should model current area, explored areas, unexplored branches, hazards, route constraints, facility resources, and alertness when the location itself is load-bearing.
- Investigation state should distinguish evidence clues from procedure facts and add a synthesis layer for known facts, live hypotheses, contradictions, and unresolved questions.
- Combat should be restored after operation/access as a stateful procedure module, not as the first slice.
- Arc Author should keep authoring durable pressure fields. It should be evaluated against operation-arc seeds, but it should not output a fixed mission itinerary.
- Chapter Author should continue to avoid stale restaging, but active procedure state should override generic "new chapter means new consequence" behavior when an unresolved procedure is still live.
- Procedure state should feed the Narrator through bounded packets and the UI through compact player-facing surfaces.
- Resolved, failed, or mutated beats should advance the dramatic question. Repeating the same obstacle is valid only when the available leverage, risk, or fictional position has changed.
- Chapter target turns should behave as pacing guidance, not as permission to close. If the foreground objective lands early, chapter machinery should close, reframe, or promote a successor pressure instead of stretching the old question.
- The shipped procedure kernel is necessary but not sufficient. Live play must activate procedure records when the fiction enters load-bearing procedure, and Narrator context must consume specialized packets rather than only generic procedure summaries.
- Roll discipline should follow the V1 lesson: private roll-gate guidance is useful, but the route must enforce a required roll before outcome narration when code has detected meaningful uncertainty.
- Multi-intent player inputs should become an ordered intent queue. The current intent resolves first; remaining intents survive roll pauses and can trigger additional rolls in the same player turn.
- Debts, liens, tithes, fees, favors, and other owed balances are obligations, not player wallet deltas. Currency changes and obligation balance changes are separate state events.
- Resolution gates must distinguish "this progress mentions a gate" from "this progress satisfies a gate." Gate satisfaction, failure, and waiver are explicit state transitions.
- Temporal anchors are canonical timeline facts. Scene time labels and timer pressure should derive from anchors when a deadline is load-bearing.
- First visible NPC introductions should anchor identity/profile facts when prose provides them, because later invariant protection only works after the first write exists.

## Testing Decisions

- Tests should assert external behavior: state transitions, packet contents, validation decisions, UI-visible summaries, and replay outcomes.
- Prefer SF2 replay fixtures for narrative contracts and pure helper fixtures for validators, packet builders, and transition logic.
- Add focused fixtures before broad playthrough fixtures. Each fixture should fail on old behavior and pass after the slice lands.
- Reuse nearby fixture patterns for operation persistence, pressure deltas, chapter transitions, roll gates, and clue validation.
- The benchmark acceptance layer should use Iron Veil-shaped synthetic states, not live Anthropic calls.
- Operation/access tests should cover: planning creation, assessment roll capture, failed credential/mask mutating runtime, alert/exposure clock ticks, egress phase, and procedure completion.
- Tempo tests should cover beat-mode selection and its visible effects on roll pressure, response-length guidance, suggested actions, and close/reframe guidance.
- Montage tests should cover off-screen task creation, time advancement, partial results, final results, and procedure/thread/clue mutations from task outcomes.
- Chapter transition tests should cover an active operation crossing from one chapter into the next without being restaged or replaced by unrelated pressure.
- Forward-motion tests should cover a load-bearing obstacle that resolves or fails around turn 10 and verify that the next guidance closes, reframes, or surfaces new anchors rather than repeating the obstacle until the 18-25 target range.
- Objective-gate tests should cover early legitimate resolution, false turn-1 close, and core SF2 parity with the SF2B objective gate.
- Procedure activation tests should include a negative case where no procedure is created because the scene is social/relational, and a positive case where repeated clearance/access/departure pressure creates or uses owning state.
- Roll tests should assert route-level enforcement, not only that the Narrator received advisory text.
- Intent-queue tests should cover one input producing multiple roll prompts and ordered state commits.
- Obligation/gate/timer tests should cover the Forty Thousand lien shape, a clearance gate that cannot be both satisfied and pending, and a deadline update that supersedes prior time truth.
- Identity/profile tests should cover first-observation anchoring and same-day second-meeting reintroduction drift.
- Arc Author calibration should include human review of generated pressure fields before enforcing quality with stricter checks.

## Out of Scope

- Rewriting SF2 from scratch.
- Removing the Arc Author.
- Predefining full five-chapter mission itineraries.
- Forcing every seed, arc, or chapter into operation, access/infiltration, exploration, investigation, or combat form.
- Treating Iron Veil's original single-chapter label as a requirement that SF2 must support very long chapters by default.
- Introducing a separate top-level Mission entity before operation runtime proves it cannot carry mission-like phases.
- Multiple simultaneous operation plans.
- Full tactical map combat.
- Live model-call regression tests.
- UI redesign beyond the minimum procedure surfaces needed for play.

## Further Notes

The product principle is: procedures are where SF2 makes player competence legible, but they are not the only way story happens. A plan should not just be remembered; it should constrain, empower, and mutate play. A crew chapter should make relationships and obligations legible. A mystery chapter should make questions and evidence legible. A fallout chapter should make consequence legible.

The initial target is not "all V1 modules return." The target is one convincing Iron Veil-style loop in kernel terms: planning, compromised access, active access pressure, egress, reckoning/debrief, and chapter carry-forward.

Iron Veil's deeper lesson is not "every story should become an op." It is that the game should convert each meaningful beat into changed state and then move on.
