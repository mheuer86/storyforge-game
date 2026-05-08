# Classify Campaign fields by canonical, index, runtime, advisory, scaffolding

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL
**Source:** SF2 domain model pruning audit and campaign restructuring discussion

## What to build

Produce and approve a target classification for `Sf2Campaign` fields before moving them. The classification should say which fields are canonical durable state, derived indexes, runtime state, advisories, prompt-only scaffolding, or caches.

This issue is intentionally HITL first because broad campaign restructuring can create save-shape and streaming regressions if it starts as a mechanical cleanup.

## Acceptance criteria

- [ ] Every `Sf2Campaign` field is classified as canonical, index, runtime, advisory, scaffolding, or cache
- [ ] The classification names the source of truth for derived fields such as `floatingClueIds`, `pivotalSceneIds`, and owner thread backrefs
- [ ] The classification says which fields may remain flat for compatibility even if conceptually grouped
- [ ] Location and Operation Plan decisions are reflected in the classification
- [ ] A migration sequence is proposed for any physical shape changes
- [ ] The accepted classification is added to local docs or scratch issues before implementation work starts

## Blocked by

- 01-harden-clues-into-investigation-evidence.md
- 02-thread-lifecycle-policy-module.md
- 03-move-chapter-thread-assignment-out-of-durable-thread.md
- 04-split-npc-fiction-role-from-dramatic-role-and-faction-refs.md
- 05-faction-lifecycle-leadership-membership.md
- 06-clarify-arc-blueprint-versus-in-play-arc.md
- 07-consolidate-player-identity-build-and-pc-references.md
- 08-location-source-of-truth-and-connections.md
- 09-singleton-operation-plan-runtime-split.md
- 11-decision-promise-agency-contracts.md
- 12-document-contract-gaps.md
- 13-temporal-anchor-timer-lifecycle-boundary.md
- 14-emotional-beat-trigger-retention-policy.md
- 15-pressure-events-with-human-consequences.md
- 16-archivist-patch-lanes.md

## Comments

This is a decision issue, not an implementation issue. Once the target shape is accepted, split implementation into smaller AFK migration slices.

## Agent Brief

**Category:** architecture
**Summary:** Decide what kind of state each Campaign field is before moving anything.

**Current behavior:** `Sf2Campaign` mixes canonical stores, indexes, plans, pending advisories, and prompt-facing notes.

**Desired behavior:** Campaign field ownership and state kind are explicit, even if physical restructuring is deferred.

**Key interfaces:** `Sf2Campaign`, persistence normalization, retrieval, patch application, runtime turn pipeline.

**Out of scope:** Immediate broad state migration.
