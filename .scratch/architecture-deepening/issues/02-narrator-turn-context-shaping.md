# Shaping: Narrator Turn Context Module

Status: selected
Phase: shaping
Parent: `.scratch/architecture-deepening/issues/02-narrator-turn-context-module.md`
PRD shape: A: SF2 Reliability Spine First
Selected shape: A: Turn Context Facade Around Live Assembly

## Purpose

Shape ticket 02 before implementation. The goal is to deepen SF2's bounded Narrator context path without changing streaming behavior, roll pauses, or visible prose timing.

## Current Live Seams

| Seam | Current owner | Narrator-context responsibility |
| --- | --- | --- |
| Request parsing and roll resume shape | `app/api/sf2/narrator/route.ts` | Validates request body, distinguishes normal turns from roll resumption, formats roll result tool output, stores `failedRollSkill`. |
| System block composition | `app/api/sf2/narrator/route.ts`, `lib/sf2/prompt/compose.ts`, `lib/sf2/narrator/prompt.ts` | Builds cached core/bible/role/situation blocks and asserts dynamic content does not leak into cached blocks. |
| Message assembly | `lib/sf2/narrator/messages.ts` | Builds scene packet, scene bundle, in-scene replay messages, per-turn delta, dynamic guard blocks, and message-level cache markers. |
| Retrieval and working set | `lib/sf2/retrieval/scene-packet.ts`, `lib/sf2/retrieval/working-set.ts` | Computes bounded scene packet, working set, action resolution, and rendered per-turn delta content. |
| Pacing diagnostics | `lib/sf2/pacing/signals.ts`, `app/api/sf2/narrator/route.ts` | Computes pacing inside the scene packet, then the route computes another advisory payload for SSE diagnostics. |
| Scene bundle diagnostics | `lib/sf2/narrator/messages.ts`, `app/api/sf2/narrator/route.ts` | Message builder decides whether a bundle was rebuilt; route translates that into the `scene_bundle_built` event. |
| Display sentinel context | `app/api/sf2/narrator/route.ts`, `lib/sf2/scene-kernel/build.ts`, `lib/sf2/sentinel/display.ts` | After model output, route rebuilds scene kernel and location continuity context before scanning prose. |
| Output recovery | `app/api/sf2/narrator/route.ts`, `lib/sf2/narrator/suggested-actions.ts` | Repairs malformed `narrate_turn` tool input and quick-action suggestions. |
| Replay assertions | `scripts/sf2-replay.ts` | Calls `buildMessagesForNarrator` directly to verify message contents, replay window, cache-sensitive fragments, and skill-tag injection. |

## R: Requirements

| Req | Requirement | Status |
| --- | --- | --- |
| R0 | Give the Narrator one turn-context module that owns bounded context assembly for both normal turns and roll resumption. | Core goal |
| R1 | Preserve the route's streaming behavior, Anthropic stream handling, tool dispatch, SSE event names, and visible prose timing. | Must-have |
| R2 | Keep roll resumption explicit: reuse prior messages plus a roll tool result, do not rebuild the pre-roll scene packet, and do not emit misleading fresh working-set, bundle, or pacing diagnostics. | Must-have |
| R3 | Centralize cache-marker and dynamic-state placement rules so callers do not have to remember which blocks are cache-safe or which message gets the single message-level marker. | Must-have |
| R4 | Return all route diagnostics needed before and after the model call: working set event payload, scene-bundle event payload, pacing event payload, sentinel context, failed-roll recovery context, and replay metadata. | Must-have |
| R5 | Preserve code-owned bounded context: working set, action resolution, pacing advisories, scene-kernel/sentinel context, and message assembly should remain deterministic code paths, not prompt-only instructions. | Must-have |
| R6 | Keep output parsing and salvage behavior compatible with the existing `narrate_turn`, `request_roll`, suggested-action repair, and display-sentinel observe mode. | Must-have |
| R7 | Add or update replay coverage so representative normal turns, scene-bundle cache reuse/rebuild, skill-tag binding, roll resumption, and sentinel context are verifiable without a model call. | Must-have |
| R8 | Keep scope bounded to SF2 Narrator context. Do not refactor the client roll loop, V1 streaming route, Archivist validation, or broad reference policy in this ticket. | Must-have |

## S: Shapes

## A: Turn Context Facade Around Live Assembly

| Part | Mechanism |
| --- | --- |
| A1 | Add a Narrator turn-context module that accepts parsed request data and returns the system blocks, messages, cached tools, mode, and route diagnostics needed for the model call. |
| A2 | Move normal-turn setup from the route into the module: system block composition, dynamic-leak assertions, `buildMessagesForNarrator`, working-set event payload, scene-bundle event payload, pacing event payload, and replay metadata. |
| A3 | Move roll-resume setup into the same module: append the roll tool result to `priorMessages`, compute `failedRollSkill`, and explicitly suppress fresh working-set, scene-bundle, and pacing diagnostics. |
| A4 | Precompute sentinel context in the module for post-output scanning: scene kernel absent-speaker context and location-continuity text. The route still runs the scan after prose exists. |
| A5 | Keep `buildMessagesForNarrator` as the lower-level message builder unless implementation reveals a cleaner split. The new module becomes the public route-facing boundary. |
| A6 | Update replay assertions to target the new module while preserving existing message-level fixtures. |

## B: Route Cleanup Only

| Part | Mechanism |
| --- | --- |
| B1 | Extract a few small helpers from `app/api/sf2/narrator/route.ts` for roll-result messages, pacing event shaping, and sentinel context. |
| B2 | Leave system composition, message assembly, roll-resume setup, and diagnostics orchestration spread between the route and `buildMessagesForNarrator`. |
| B3 | Keep replay tests pointed only at `buildMessagesForNarrator`. |

## C: Full Narrator Runtime

| Part | Mechanism |
| --- | --- |
| C1 | Create a runtime module that owns context assembly, Anthropic streaming, tool dispatch, output recovery, sentinel scanning, and all SSE event emission. |
| C2 | Reduce the route to request parsing and returning the runtime stream. |
| C3 | Update client and replay harness around the new runtime event source. |

## D: Retrieval Packet Boundary Only

| Part | Mechanism |
| --- | --- |
| D1 | Deepen `buildScenePacket` and working-set assembly into a retrieval module. |
| D2 | Leave system composition, message-cache markers, roll resumption, diagnostics, scene bundle events, and sentinel context in the route/message builder split. |
| D3 | Treat route-facing context orchestration as a later ticket. |

## Fit Check

| Req | Requirement | Status | A | B | C | D |
| --- | --- | --- | --- | --- | --- | --- |
| R0 | Give the Narrator one turn-context module that owns bounded context assembly for both normal turns and roll resumption. | Core goal | ✅ | ❌ | ✅ | ❌ |
| R1 | Preserve the route's streaming behavior, Anthropic stream handling, tool dispatch, SSE event names, and visible prose timing. | Must-have | ✅ | ✅ | ❌ | ✅ |
| R2 | Keep roll resumption explicit: reuse prior messages plus a roll tool result, do not rebuild the pre-roll scene packet, and do not emit misleading fresh working-set, bundle, or pacing diagnostics. | Must-have | ✅ | ❌ | ✅ | ❌ |
| R3 | Centralize cache-marker and dynamic-state placement rules so callers do not have to remember which blocks are cache-safe or which message gets the single message-level marker. | Must-have | ✅ | ❌ | ✅ | ❌ |
| R4 | Return all route diagnostics needed before and after the model call: working set event payload, scene-bundle event payload, pacing event payload, sentinel context, failed-roll recovery context, and replay metadata. | Must-have | ✅ | ❌ | ✅ | ❌ |
| R5 | Preserve code-owned bounded context: working set, action resolution, pacing advisories, scene-kernel/sentinel context, and message assembly should remain deterministic code paths, not prompt-only instructions. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R6 | Keep output parsing and salvage behavior compatible with the existing `narrate_turn`, `request_roll`, suggested-action repair, and display-sentinel observe mode. | Must-have | ✅ | ✅ | ❌ | ✅ |
| R7 | Add or update replay coverage so representative normal turns, scene-bundle cache reuse/rebuild, skill-tag binding, roll resumption, and sentinel context are verifiable without a model call. | Must-have | ✅ | ❌ | ✅ | ❌ |
| R8 | Keep scope bounded to SF2 Narrator context. Do not refactor the client roll loop, V1 streaming route, Archivist validation, or broad reference policy in this ticket. | Must-have | ✅ | ✅ | ❌ | ✅ |

Notes:

- B fails the ownership requirements because it tidies the route but leaves the route responsible for remembering the context lifecycle.
- C fails preservation and scope because streaming/tool dispatch is a high-risk integration surface and not necessary to deepen bounded context.
- D fails the ticket because retrieval is already relatively deep; the missing boundary is the route-facing turn context.

## Selected Shape

Selected: **A: Turn Context Facade Around Live Assembly**.

This keeps the model streaming loop stable while removing setup ceremony from the route. The module should gather the pieces the route needs before the Anthropic call, then hand back pre-shaped diagnostics and sentinel context so the route no longer has to know the full context assembly order.

## Breadboard For A

| Affordance | Surface | Wiring |
| --- | --- | --- |
| Build normal turn context | Code | Route delegates parsed state/input/isInitial/turnIndex to the turn-context module and receives system blocks, messages, tools, and diagnostics. |
| Build roll-resume context | Code | Route delegates roll resolution; module appends the tool result to prior messages and marks diagnostics as roll-resume suppressed. |
| Emit pre-call diagnostics | Code/SSE | Route emits working-set, scene-bundle, and pacing events from module-provided payloads without recomputing them. |
| Stream model response | Route | Existing route keeps Anthropic stream handling, text deltas, token usage, roll tool detection, and narrate tool detection. |
| Scan display output | Route + Code | Route passes final prose plus module-provided sentinel context into display-sentinel scanning. |
| Recover final tool input | Route + Code | Existing recovery stays compatible, using module-provided failed-roll context. |
| Verify context assembly | Replay | Replay harness exercises the new module for normal turns and roll resume while retaining lower-level message assertions where useful. |

## Decisions

1. Shape A is selected for implementation.
2. Keep the route's Anthropic streaming loop, text deltas, tool dispatch, token usage, and SSE event names stable.
3. Keep `buildMessagesForNarrator` exported as a lower-level helper unless implementation proves that it should become internal.
4. Treat `chapterPressureRuntime.project` adoption inside Narrator chapter packet text as optional only if it is behavior-preserving and helps the context boundary.
