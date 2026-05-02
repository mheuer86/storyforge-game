# Canonical Reference Policy Module

Status: ready-for-human
Type: HITL

## Parent

`.scratch/architecture-deepening/PRD.md`

## Selected shape context

Selected PRD shape: **A: SF2 Reliability Spine First**.

Backlog position: third SF2 reliability-spine slice. Ticket-level shape selected; ready for implementation with human oversight.

Ticket-level shaping: `.scratch/architecture-deepening/issues/06-canonical-reference-policy-shaping.md`

Selected ticket shape: **A: Reference Policy Facade Around Live Resolution**.

## What to build

Deepen one SF2 canonical reference policy Module that owns canonical ID shape, display-name/id resolution, placeholder rules, fallback owner semantics, strict/observe/repair modes, and coercion/reporting behavior.

Today, `entity-references` already has real Leverage, but related policy is split across scene-kernel canonical ID validation, persistence fallback faction creation, Author hydration placeholders, apply-patch enum coercion, and reference resolution.

Relevant files:

- `lib/sf2/reference-policy/*` or `lib/sf2/resolution/entity-references.ts`
- `lib/sf2/resolution/entity-references.ts`
- `lib/sf2/scene-kernel/canonical-ids.ts`
- `lib/sf2/replay/mechanics.ts`
- `lib/sf2/persistence/normalize.ts`
- `lib/sf2/validation/apply-patch.ts`
- `lib/sf2/author/hydrate.ts`
- `lib/sf2/types.ts`

## Acceptance criteria

- [x] One canonical reference policy Module owns canonical ID validation, ID/name resolution, anonymous NPC handling, placeholder creation rules, fallback owners, and coercion/reporting policy.
- [x] Persistence, Author hydration, Narrator scene snapshots, and Archivist patching use mode-specific Adapters or policy operations at that boundary.
- [x] Strict, observe, and repair behavior are explicit at the Interface rather than implied by caller location.
- [x] Existing identity, reference, scene-kernel, and apply-patch fixtures still pass or are updated with intentional behavior changes.
- [x] Table-driven tests cover fake canonical IDs, display-name references, anonymous NPC merges, owner hints, fallback factions, and enum coercions.
- [x] The Module preserves SF2's flat writes, structured storage principle.

## Blocked by

None - can start immediately.

## Comments

Architecture review note: this ticket became the next SF2 slice after pressure runtime and Narrator turn context because it prepares NPC state-bound rendering, scene-kernel enforcement, and stricter Archivist validation without flipping enforcement yet.

Implementation note: Shape A was implemented with `lib/sf2/reference-policy/index.ts` as the SF2 policy boundary. `scene-kernel/canonical-ids.ts` is now a compatibility export; Narrator scene snapshots, Author owner hints, persistence fallback owners, and Archivist coercions/resolution import through the policy boundary. Live scene snapshots remain in observe mode, and strict mode is exposed for future enforcement. Verification: `npm run build` and `npm run sf2:replay -- fixtures/sf2/replay` pass.
