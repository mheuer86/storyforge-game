---
shaping: true
---

# Shaping: Canonical Reference Policy Module

Status: selected
Phase: shaping
Parent: `.scratch/architecture-deepening/issues/06-canonical-reference-policy-module.md`
PRD shape: A: SF2 Reliability Spine First
Selected shape: A: Reference Policy Facade Around Live Resolution

## Purpose

Shape ticket 06 before implementation. The goal is to deepen SF2's canonical reference policy without changing enforcement mode, save shape, or patch-acceptance semantics by accident.

## Current Live Seams

| Seam | Current owner | Reference-policy responsibility |
| --- | --- | --- |
| Entity reference resolution | `lib/sf2/resolution/entity-references.ts` | Resolves ids/names, synthesized agent ids, NPC/faction/thread/arc/temporal-anchor references, anonymous NPC matches, owner hints, next ids, and fallback faction ids. |
| Scene snapshot ID validation | `lib/sf2/scene-kernel/canonical-ids.ts` | Defines canonical id shape/prefixes and validates Narrator snapshot ids in observe or strict variants. |
| Narrator mechanical snapshot application | `lib/sf2/replay/mechanics.ts` | Observes canonical-id violations, resolves display-style NPC references, creates scene-snapshot placeholder NPCs, and applies cast/interlocutor arrays. |
| Archivist patch application | `lib/sf2/validation/apply-patch.ts` | Resolves create/update/transition references, owner refs, document subjects/parties, anchors, synthesized ids, anonymous supersedes, and per-field drift messages. |
| Model enum coercion | `lib/sf2/validation/apply-patch.ts` | Coerces disposition, faction stance, faction heat, and temp-load tags while logging drift for free-form model values. |
| Author hydration | `lib/sf2/author/hydrate.ts` | Seeds faction records from NPC affiliations, resolves Author `ownerHint`, and falls back to `faction_unknown` for unresolved thread owners. |
| Persistence repair | `lib/sf2/persistence/normalize.ts` | Repairs missing thread owners to `faction_unknown` and creates the fallback faction only when legacy state requires it. |
| Scene kernel and action resolver | `lib/sf2/scene-kernel/build.ts`, `lib/sf2/action-resolver/resolve.ts` | Assume scene snapshot ids are canonical, build aliases from canonical NPC records, and resolve player surfaces/pronouns against the kernel. |

## R: Requirements

| Req | Requirement | Status |
| --- | --- | --- |
| R0 | Give SF2 one canonical reference policy module that owns how raw model/user references become canonical ids, repairs, placeholders, or drift reports. | Core goal |
| R1 | Preserve existing behavior unless a fixture-backed intentional change is selected: partial Archivist acceptance, scene-snapshot observe mode, placeholder creation, fallback owners, and save compatibility must not drift silently. | Must-have |
| R2 | Make `observe`, `strict`, and `repair` behavior explicit at the module interface instead of implied by caller location. | Must-have |
| R3 | Centralize canonical id shape, allowed prefixes, and registry membership checks so scene-kernel validation, persistence repair, Narrator snapshots, and Archivist patching use one policy vocabulary. | Must-have |
| R4 | Preserve deterministic resolution behavior for ids, display names, synthesized canonical-shaped ids, owner hints, aliases, and anonymous on-stage NPC merges. | Must-have |
| R5 | Make placeholder and fallback creation rules explicit: Narrator scene snapshots may create placeholder NPCs in observe/repair mode, persistence may repair legacy fallback owners, and Archivist durable writes still create or merge entities through patch semantics. | Must-have |
| R6 | Move model-drift coercion/reporting policy for disposition, stance, heat, and temp-load tags behind the same reference-policy boundary or an adjacent policy export so callers receive typed results and drift detail consistently. | Must-have |
| R7 | Support future SF2 enforcement work: NPC state-bound rendering, stricter scene-kernel writes, and stricter Archivist validation should be able to switch policy mode without rewriting every caller. | Must-have |
| R8 | Cover the slice with replay or table-driven checks for fake canonical ids, display-name references, anonymous NPC merges, owner hints, fallback factions, synthesized ids, and enum coercions while keeping scope bounded to SF2 reference policy. | Must-have |

## S: Shapes

## A: Reference Policy Facade Around Live Resolution

| Part | Mechanism |
| --- | --- |
| A1 | Add a public SF2 reference-policy boundary that wraps the live resolution helpers and exposes mode-aware operations for canonical-id classification, scene snapshot references, durable patch references, owner references, placeholder/fallback decisions, and drift/report formatting. |
| A2 | Move or re-export the canonical id pattern, prefix set, snapshot validators, and violation formatting through the policy boundary so `scene-kernel/canonical-ids.ts` no longer carries an isolated policy vocabulary. |
| A3 | Move scene-snapshot reference resolution into the policy boundary: resolve NPC ids/names/aliases, create placeholder NPCs only when the selected mode allows it, return invariant-event payloads, and keep observe mode as the default live behavior. |
| A4 | Move Archivist-facing reference helpers behind the policy boundary incrementally: agent/thread/arc/temporal/document-party resolution returns typed outcomes plus drift details instead of each patch branch hand-writing equivalent unresolved-reference messages. |
| A5 | Move Author owner-hint and persistence fallback-owner helpers behind explicit policy operations so `faction_unknown` creation remains a legacy/repair fallback rather than a general reference-resolution side effect. |
| A6 | Move disposition/stance/heat/temp-load coercions out of `apply-patch.ts` into the policy boundary or adjacent `reference-policy/coercions` export, preserving current enum mappings and drift wording. |
| A7 | Add focused replay/table checks around the policy results, then run the existing SF2 replay suite and build path. |

## B: Strict Enforcement Flip First

| Part | Mechanism |
| --- | --- |
| B1 | Replace observe-mode snapshot validation with strict canonical-id enforcement immediately. |
| B2 | Reject canonical-shaped ids that are not already in the registry instead of allowing placeholder creation in the live Narrator snapshot path. |
| B3 | Update fixtures to expect rejection or reduced snapshot application where display-style ids currently repair. |

## C: Scene Snapshot Policy Only

| Part | Mechanism |
| --- | --- |
| C1 | Consolidate `scene-kernel/canonical-ids.ts` and the scene-snapshot block in `lib/sf2/replay/mechanics.ts`. |
| C2 | Leave Archivist patch resolution, Author owner hints, persistence fallback owners, and enum coercions in their current files. |
| C3 | Add fixture coverage only for `set_scene_snapshot` canonical id observation and placeholder creation. |

## D: Persistence Foundation First

| Part | Mechanism |
| --- | --- |
| D1 | Treat canonical references as part of save repair and start by normalizing all persisted references across SF2 state. |
| D2 | Move fallback owner creation and missing-registry repair into persistence normalization before touching scene-kernel or patch policy. |
| D3 | Defer live Narrator/Archivist policy calls until save normalization is shaped and implemented. |

## Fit Check

| Req | Requirement | Status | A | B | C | D |
| --- | --- | --- | --- | --- | --- | --- |
| R0 | Give SF2 one canonical reference policy module that owns how raw model/user references become canonical ids, repairs, placeholders, or drift reports. | Core goal | ✅ | ✅ | ❌ | ❌ |
| R1 | Preserve existing behavior unless a fixture-backed intentional change is selected: partial Archivist acceptance, scene-snapshot observe mode, placeholder creation, fallback owners, and save compatibility must not drift silently. | Must-have | ✅ | ❌ | ✅ | ❌ |
| R2 | Make `observe`, `strict`, and `repair` behavior explicit at the module interface instead of implied by caller location. | Must-have | ✅ | ✅ | ❌ | ❌ |
| R3 | Centralize canonical id shape, allowed prefixes, and registry membership checks so scene-kernel validation, persistence repair, Narrator snapshots, and Archivist patching use one policy vocabulary. | Must-have | ✅ | ✅ | ❌ | ❌ |
| R4 | Preserve deterministic resolution behavior for ids, display names, synthesized canonical-shaped ids, owner hints, aliases, and anonymous on-stage NPC merges. | Must-have | ✅ | ❌ | ❌ | ❌ |
| R5 | Make placeholder and fallback creation rules explicit: Narrator scene snapshots may create placeholder NPCs in observe/repair mode, persistence may repair legacy fallback owners, and Archivist durable writes still create or merge entities through patch semantics. | Must-have | ✅ | ❌ | ❌ | ✅ |
| R6 | Move model-drift coercion/reporting policy for disposition, stance, heat, and temp-load tags behind the same reference-policy boundary or an adjacent policy export so callers receive typed results and drift detail consistently. | Must-have | ✅ | ❌ | ❌ | ❌ |
| R7 | Support future SF2 enforcement work: NPC state-bound rendering, stricter scene-kernel writes, and stricter Archivist validation should be able to switch policy mode without rewriting every caller. | Must-have | ✅ | ✅ | ❌ | ❌ |
| R8 | Cover the slice with replay or table-driven checks for fake canonical ids, display-name references, anonymous NPC merges, owner hints, fallback factions, synthesized ids, and enum coercions while keeping scope bounded to SF2 reference policy. | Must-have | ✅ | ✅ | ❌ | ❌ |

Notes:

- B fails preservation because it flips enforcement before the system has measured and contained display-style or placeholder recovery behavior.
- C fails the ownership requirements because it fixes the scene-snapshot path while leaving patch, owner, fallback, and coercion policy split across old call sites.
- D fails current SF2 reliability sequencing because it reopens the broader save-normalization slice instead of shaping the live reference policy seam.

## Selected Shape

Selected: **A: Reference Policy Facade Around Live Resolution**.

This keeps the live recovery behavior intact while making the policy explicit. The point is not to become stricter yet; it is to make every future strict/observe/repair choice pass through one boundary.

## Breadboard For A

| Affordance | Surface | Wiring |
| --- | --- | --- |
| Classify canonical ids | Code | Scene-kernel, snapshot validation, and future patch reducers call one policy operation for prefix/shape/registry classification. |
| Resolve scene snapshot cast | Code | Narrator mechanical snapshot application delegates raw present/interlocutor ids to policy and receives resolved ids, placeholder creations, and invariant-event payloads. |
| Resolve Archivist references | Code | `applyArchivistPatch` delegates repeated agent/thread/arc/temporal/document-party reference resolution and receives typed outcomes plus drift detail. |
| Resolve Author owners | Code | Author hydration delegates `ownerHint` parsing and stakeholder extraction to policy; faction creation remains explicit and reportable. |
| Repair fallback owners | Code | Persistence normalization delegates legacy missing-owner repair to policy and creates `faction_unknown` only in repair mode. |
| Coerce model enums | Code | Patch creation/update branches call policy coercions for disposition, stance, heat, and temp-load tag and receive typed value plus drift text. |
| Verify reference policy | Replay/tests | Focused fixtures or table-driven tests cover fake canonical ids, display names, placeholders, anonymous supersedes, owner hints, fallback factions, synthesized ids, and enum coercions. |

## Decisions

1. Shape A is selected for implementation.
2. Keep live scene-snapshot canonical-id handling in observe mode.
3. Do not flip strict Archivist enforcement in this ticket; make the mode explicit so a later ticket can flip it deliberately.
4. Keep placeholder NPC creation allowed only through explicit scene-snapshot repair/observe policy and durable NPC creation through Archivist patch semantics.
5. Keep `faction_unknown` as a legacy/repair fallback, not as the default answer for all unresolved owners.
6. Treat broader persisted-state cleanup as ticket 05, not part of this ticket.
