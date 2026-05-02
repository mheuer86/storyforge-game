# Narrator Turn Context Module

Status: ready-for-human
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: second active deepening slice. Ticket-level shape selected; ready for implementation with human oversight.

Ticket-level shaping: `.scratch/architecture-deepening/issues/02-narrator-turn-context-shaping.md`

Selected ticket shape: **A: Turn Context Facade Around Live Assembly**.

## What to build

Create a deeper SF2 Narrator turn context Module that assembles the bounded scene context for a turn: scene packet, working set, message-cache structure, scene bundle event, pacing event payload, scene-kernel/sentinel context, and replay metadata.

Today, the Narrator context flow is distributed across retrieval, message assembly, route code, action resolution, scene-kernel derivation, and telemetry. Each piece has some Depth, but the caller still has to know ordering and cache invariants.

Relevant files:

- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/narrator/messages.ts`
- `app/api/sf2/narrator/route.ts`
- `lib/sf2/scene-kernel/build.ts`
- `lib/sf2/action-resolver/resolve.ts`
- `lib/sf2/instrumentation/working-set-telemetry.ts`

## Acceptance criteria

- [x] There is one Narrator turn context Module that accepts state, player input, turn index, and roll-resumption mode.
- [x] The Module returns the Anthropic messages plus diagnostics needed by the route: working set, scene bundle build info, pacing advisory payload, sentinel context, and replay metadata.
- [x] Roll resumption remains explicit and does not rebuild or misrepresent the pre-roll working set.
- [x] Cache-marker and dynamic-state placement rules are centralized enough that the route no longer has to remember them directly.
- [x] Existing `sf2:replay` fixtures can verify deterministic context assembly for representative turns.
- [x] Streaming behavior and visible Narrator prose timing are unchanged.

## Blocked by

None - can start immediately. Strategy sequencing says to shape this after `01-chapter-pressure-runtime-module.md`.

## Comments

Architecture review note: this deepens bounded scene context, the other core SF2 reliability surface after computed pressure.

Implementation note: Shape A was implemented with `lib/sf2/narrator/turn-context.ts` as the route-facing boundary. The route still owns Anthropic streaming, tool dispatch, and SSE event names. Verification: `npm run build` and `npm run sf2:replay -- fixtures/sf2/replay` pass; lint is blocked locally because `eslint` is not installed in the current checkout.
