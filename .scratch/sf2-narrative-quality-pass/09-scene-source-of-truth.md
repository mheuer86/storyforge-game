# Scene source of truth

Status: proposed
Category: refactor
**Type:** HITL → AFK
**Source:** narrative-quality pass + `sf2-domain-model-pruning.md` audit (2026-05-08, proposal #4)

## What to build

The audit identified six overlapping sources of "where are we and who is present":

- `world.currentLocation`
- `world.sceneSnapshot`
- `SceneKernel` (commented "not source of truth")
- `set_location` tool
- `set_scene_snapshot` tool
- `sceneBundleCache`

Memory note `project_storyforge_state_architecture` (2026-04-18) already flagged this as the read-side companion to schema-driven entities. Continuity bugs trace back here — NPCs lingering in scene packets after they've left, location strings going stale, the ambiguity over whether `set_location` also writes a scene snapshot.

Recommended split per the audit:

- **Canonical:** `world.currentLocation`, entities, current thread/operation state.
- **Current scene fact object:** either `sceneSnapshot` or a renamed `currentSceneState`.
- **Derived:** `SceneKernel`, `NarratorScenePacket`, `sceneBundleCache`.

Tool contract changes:

- `set_location` changes place AND starts a new scene frame (resets present_npc_ids, time_label, established).
- `set_scene_snapshot` updates only scene-local facts within the current frame.
- `SceneKernel` is always derived, never persisted as source of truth.

Deletion test from the audit: *"no code should need to read both `sceneSnapshot` and `SceneKernel` to answer the same 'where/who/what pressure' question."*

## Acceptance criteria

- [ ] One canonical accessor for "where are we / who is present / what time is it" with a typed signature.
- [ ] `set_location` and `set_scene_snapshot` documented with non-overlapping responsibilities; tool schemas updated; narrator prompt's `set_scene_snapshot` guidance (currently in `narrator/prompt.ts:385`) reconciled.
- [ ] `SceneKernel`'s "derived only" status enforced — assertion at construction, removal of any persistence path, or marker type.
- [ ] No code reads both `sceneSnapshot` and `SceneKernel` to answer the same question. `grep` audit passes.
- [ ] Replay fixtures pass.
- [ ] sf2b mode still consistent with the new contract (its continuity-lock derivation may consume scene state).

## Blocked by

**Post-pass A/B test (ticket #07).** This is a behavior-changing refactor with potential to introduce regressions. Running it before the post-pass A/B would mix variables — if narrative quality regresses, you wouldn't know if it was the narrative-quality pass tickets or this refactor. Defer until post-pass.

If the post-pass call is to continue v2: this becomes the *second* slice (after audit #1 Thread lifecycle, possibly before).
If the post-pass call is to cherry-pick to v1: this becomes a v1 cleanup principle, ported as the v1 scene model is built.

## Comments

> *Strategic value high regardless of v2/v1 direction. Ports cleanly. But behavior-changing during the A/B test window mixes variables. Tracked here so it doesn't get lost.*

## Agent Brief

**Category:** refactor
**Summary:** Establish one canonical answer to "where are we and who is present"; make derived projections explicitly derived; clarify `set_location` vs `set_scene_snapshot` contract.
**Current behavior:** Six overlapping representations of scene state cause continuity drift and ambiguous tool contracts.
**Desired behavior:** Canonical / scene-fact / derived split; non-overlapping tool contract; `SceneKernel` always derived.
**Key interfaces:** `lib/sf2/types.ts`, `lib/sf2/scene-kernel/build.ts`, `lib/sf2/retrieval/scene-packet.ts`, `lib/sf2/narrator/tools.ts`, `lib/sf2/narrator/prompt.ts`.
**Acceptance criteria:** Issue checklist; replay fixtures pass; sf2b consistency verified.
**Out of scope:** Pre-A/B implementation. This ticket is staged for post-pass execution only.
