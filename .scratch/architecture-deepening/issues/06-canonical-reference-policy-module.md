# Canonical Reference Policy Module

Status: needs-triage
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: deferred SF2 foundation slice. Pull forward when NPC state-bound rendering, scene-kernel enforcement, canonical ID validation, or stricter Archivist validation moves from observe mode to enforcement.

## What to build

Deepen one SF2 canonical reference policy Module that owns canonical ID shape, display-name/id resolution, placeholder rules, fallback owner semantics, and coercion/reporting behavior.

Today, `entity-references` already has real Leverage, but related policy is split across scene-kernel canonical ID validation, persistence fallback faction creation, Author hydration placeholders, apply-patch enum coercion, and reference resolution.

Relevant files:

- `lib/sf2/resolution/entity-references.ts`
- `lib/sf2/scene-kernel/canonical-ids.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/validation/apply-patch.ts`
- `lib/sf2/author/hydrate.ts`
- `lib/sf2/types.ts`

## Acceptance criteria

- [ ] One canonical reference policy Module owns canonical ID validation, ID/name resolution, anonymous NPC handling, placeholder creation rules, fallback owners, and coercion/reporting policy.
- [ ] Persistence, Author hydration, Narrator scene snapshots, and Archivist patching use mode-specific Adapters at that Seam.
- [ ] Strict vs observe behavior is explicit at the Interface rather than implied by caller location.
- [ ] Existing identity, reference, scene-kernel, and apply-patch fixtures still pass or are updated with intentional behavior changes.
- [ ] Table-driven tests cover fake canonical IDs, display-name references, anonymous NPC merges, owner hints, fallback factions, and enum coercions.
- [ ] The Module preserves SF2's flat writes, structured storage principle.

## Blocked by

None - can start immediately. Deferred by selected-shape sequencing.

## Comments

Architecture review note: this ticket should become more urgent if NPC state-bound rendering, scene-kernel enforcement, or stricter Archivist validation moves from observe mode to enforcement.
