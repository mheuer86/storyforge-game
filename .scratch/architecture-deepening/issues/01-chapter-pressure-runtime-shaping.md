# Shaping: Chapter Pressure Runtime Module

Status: selected
Phase: shaping
Parent: `.scratch/architecture-deepening/issues/01-chapter-pressure-runtime-module.md`
PRD shape: A: SF2 Reliability Spine First
Selected shape: A: Runtime Facade Over Live Pressure Behavior

## Purpose

Shape ticket 01 before implementation. The goal is to deepen SF2 chapter pressure into a clear runtime module without changing the player-facing pressure rhythm by accident.

## Current Live Seams

| Seam | Current owner | Pressure responsibility |
| --- | --- | --- |
| Chapter open | `lib/sf2/pressure/runtime.ts` | Seeds engine anchors, recomputes engine values, initializes thread pressure. |
| Reheat | `lib/sf2/pressure/reheat.ts` | Applies player, NPC agenda, ladder-fire, and local escalation reheat. |
| Archivist patch application | `lib/sf2/validation/apply-patch.ts` | Accepts ladder fires, enforces cooldown and per-turn cap, reheats ladder targets, recomputes engines. |
| Turn finalization | `lib/sf2/runtime/turn-pipeline.ts` | Applies early-spine promotion and pending successor recovery notes. |
| Close readiness | `lib/sf2/chapter-close.ts` | Computes close readiness, stalled fallback, successor requirement, and candidate spine promotion. |
| UI projection | `app/play/v2/page.tsx`, `components/sf2/play-shell.tsx` | Re-derives close-readiness view and pressure panel details from raw state. |
| Dead/hypothetical ladder runtime | `lib/sf2/runtime/pressure-ladder.ts` | Pattern-matches authored natural-language triggers, but live code now uses Archivist-proposed ladder fires. |

## R: Requirements

| Req | Requirement | Status |
| --- | --- | --- |
| R0 | Give chapter pressure one runtime module that owns the live pressure lifecycle from chapter open through per-turn mutation and read projection. | Core goal |
| R1 | Preserve existing pressure behavior unless a fixture-backed intentional behavior change is selected. | Must-have |
| R2 | Keep Archivist patch validation semantics: valid patch parts are accepted, invalid pressure proposals produce drift instead of failing the whole patch. | Must-have |
| R3 | Make validation, turn finalization, UI, and caller code consume pressure operations or projections instead of carrying pressure mechanics inline. | Must-have |
| R4 | Keep pressure code-owned: no prompt-only rules for ladder cooldown, reheat, successor pressure, or close readiness. | Must-have |
| R5 | Cover the slice with deterministic checks or replay fixtures for chapter open, ladder cooldown/cap, ladder reheat, engine recompute, close readiness, and early-spine successor handling. | Must-have |
| R6 | Keep scope bounded to SF2 pressure. Do not touch V1 turn streaming, save normalization, or broad reference policy as part of this ticket. | Must-have |
| R7 | Remove or fold the dead `lib/sf2/runtime/pressure-ladder.ts` seam so future agents do not mistake it for the live ladder path. | Must-have |
| R8 | Improve agent navigation: the module boundary should make the pressure lifecycle obvious from file names, exported operations, and call sites. | Must-have |

## S: Shapes

## A: Runtime Facade Over Live Pressure Behavior

| Part | Mechanism |
| --- | --- |
| A1 | Expand `lib/sf2/pressure/runtime.ts` into the public pressure boundary while preserving the existing helpers behind it. |
| A2 | Move ladder-fire acceptance, cooldown, per-turn cap, ladder target resolution, ladder reheat, and engine recompute out of inline `applyArchivistPatch` code and behind the pressure runtime boundary. |
| A3 | Move or wrap close readiness and early-spine recovery so turn finalization asks pressure runtime for the post-turn pressure recovery action instead of editing that policy inline. |
| A4 | Add a pressure projection consumed by `app/play/v2/page.tsx` and `components/sf2/play-shell.tsx`, including ladder progress, active pressure beat, close-readiness view, successor requirement, and promoted-spine signal. |
| A5 | Delete or fold `lib/sf2/runtime/pressure-ladder.ts` after confirming no live caller depends on it. Preserve the historical lesson in a nearby comment or doc note if useful. |
| A6 | Add focused verification around the moved live behavior, then run the existing relevant replay checks/build path. |

## B: Ladder Acceptance Extraction Only

| Part | Mechanism |
| --- | --- |
| B1 | Extract only the ladder-fire block from `applyArchivistPatch` into `lib/sf2/pressure/runtime.ts`. |
| B2 | Leave close readiness in `chapter-close.ts`, early-spine recovery in `turn-pipeline.ts`, and UI projection in the page/component layer. |
| B3 | Remove the dead `pressure-ladder.ts` file. |

## C: Read Projection Only

| Part | Mechanism |
| --- | --- |
| C1 | Leave all write behavior where it is. |
| C2 | Add a pressure projection helper so UI and page code stop deriving pressure display locally. |
| C3 | Treat validation and turn finalization ownership as a future implementation ticket. |

## D: Full Pressure State Machine

| Part | Mechanism |
| --- | --- |
| D1 | Replace the spread-out pressure mutations with pressure events and a reducer-style runtime. |
| D2 | Route chapter open, Archivist ladder fires, reheat, close readiness, successor recovery, and UI projection through the reducer. |
| D3 | Update fixtures around the new event model and pressure event log. |

## Fit Check

| Req | Requirement | Status | A | B | C | D |
| --- | --- | --- | --- | --- | --- | --- |
| R0 | Give chapter pressure one runtime module that owns the live pressure lifecycle from chapter open through per-turn mutation and read projection. | Core goal | ✅ | ❌ | ❌ | ✅ |
| R1 | Preserve existing pressure behavior unless a fixture-backed intentional behavior change is selected. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R2 | Keep Archivist patch validation semantics: valid patch parts are accepted, invalid pressure proposals produce drift instead of failing the whole patch. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R3 | Make validation, turn finalization, UI, and caller code consume pressure operations or projections instead of carrying pressure mechanics inline. | Must-have | ✅ | ❌ | ❌ | ✅ |
| R4 | Keep pressure code-owned: no prompt-only rules for ladder cooldown, reheat, successor pressure, or close readiness. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R5 | Cover the slice with deterministic checks or replay fixtures for chapter open, ladder cooldown/cap, ladder reheat, engine recompute, close readiness, and early-spine successor handling. | Must-have | ✅ | ❌ | ❌ | ✅ |
| R6 | Keep scope bounded to SF2 pressure. Do not touch V1 turn streaming, save normalization, or broad reference policy as part of this ticket. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R7 | Remove or fold the dead `lib/sf2/runtime/pressure-ladder.ts` seam so future agents do not mistake it for the live ladder path. | Must-have | ✅ | ✅ | ❌ | ✅ |
| R8 | Improve agent navigation: the module boundary should make the pressure lifecycle obvious from file names, exported operations, and call sites. | Must-have | ✅ | ❌ | ❌ | ✅ |

Notes:

- B fails the main ownership requirements because it improves the ladder seam while leaving close readiness, successor recovery, and UI projection spread across the old call sites.
- C fails the ownership requirements because it only fixes the read side.
- D fails preservation and scope because an event/reducer rewrite is larger than this reliability slice and would make behavior drift harder to detect.

## Selected Shape

Selected: **A: Runtime Facade Over Live Pressure Behavior**.

This is the smallest shape that satisfies the ticket's ownership goal while keeping the current pressure semantics intact. It deepens the module by moving live responsibilities behind one boundary instead of inventing a new pressure model.

## Breadboard For A

| Affordance | Surface | Wiring |
| --- | --- | --- |
| Prepare chapter pressure | Code | Chapter setup calls pressure runtime to seed engines, anchors, and thread pressure. |
| Apply Archivist pressure effects | Code | `applyArchivistPatch` delegates ladder acceptance/rejection, reheat, drift entries, and engine recompute to pressure runtime. |
| Finalize pressure recovery | Code | Turn finalization delegates early-spine promotion and successor-required recovery to pressure runtime. |
| Compute pressure projection | Code/UI | Page and shell consume one projection instead of rebuilding close readiness and active pressure display from raw state. |
| Retire stale ladder matcher | Code/docs | Remove or fold `runtime/pressure-ladder.ts`; keep the route comment or a doc note that ladder firing is Archivist-driven. |
| Verify pressure behavior | Code | Focused deterministic tests or replay checks cover the moved rules before and after extraction. |

## Decisions

1. Shape A is selected for implementation.
2. Preserve current live pressure semantics while moving ownership behind the pressure runtime boundary.
3. Decide during implementation whether `chapter-close.ts` should move under `lib/sf2/pressure/` or remain as a helper wrapped by the pressure runtime boundary.
4. Keep Narrator/Archivist packet use of the pressure projection out of this ticket unless implementation reveals it is needed for the UI/runtime boundary.
