# Clarify Arc blueprint versus in-play Arc

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, ArcPlan ambiguity

## What to build

Clarify the difference between the authored arc blueprint and the in-play arc entity. The blueprint describes the intended long-form pressure field. The in-play Arc records what actually exists in the campaign: active question, threads, lifecycle, stakes, and emerging outcome.

## Acceptance criteria

- [ ] Naming distinguishes authored blueprint/scaffolding from durable in-play Arc
- [ ] The source of truth for arc-thread membership is documented and enforced
- [ ] Arc lifecycle transitions update relevant progress fields, such as resolved chapter, when appropriate
- [ ] Author and Arc Author outputs hydrate the durable Arc without copying blueprint-only scaffolding into canonical state
- [ ] Save normalization preserves existing `arcPlan` saves while supporting the clarified naming/shape
- [ ] A fixture verifies a thread successor remains attached to the correct in-play Arc

## Blocked by

None - can start immediately

## Comments

HITL decision: whether this is a rename-only clarification first, or whether the durable Arc shape changes in the same slice.

## Agent Brief

**Category:** architecture
**Summary:** Stop `Sf2ArcPlan` and `Sf2Arc` from blurring together.

**Current behavior:** Arc blueprint and in-play Arc overlap in naming and persistence shape.

**Desired behavior:** Blueprint is setup/planning scaffolding; Arc is durable campaign state.

**Key interfaces:** `Sf2Arc`, `Sf2ArcPlan`, `arc-author/transform.ts`, Author hydration, `syncArcPlanStatusFromArcEntity`, persistence normalization.

**Out of scope:** Reauthoring arc content.

