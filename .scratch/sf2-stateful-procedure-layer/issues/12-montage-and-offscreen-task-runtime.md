# Montage and Off-Screen Task Runtime

Status: verified-built
Labels: verified-built
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Add state for compressed time and delegated off-screen work. The player should be able to assign or benefit from tasks such as decoding a message, scouting a route, rebuilding an access plan, modifying gear, tracing ownership, probing a network, preparing a ritual, or checking a contact. Each task should have a generic owner, goal, work window, status, partial result, final result, risk, and links to relevant procedures, threads, clues, procedure facts, or assets.

Montage should be the player-facing way to advance these tasks across compressed time. A montage can move hours or days, surface partial progress, resolve tasks, tick relevant pressures, and feed new constraints or affordances back into the active story.

## Definitions

- **Off-screen task** — work performed by a delegated source during compressed time. Schema: `{ id, owner: { kind, id?, label }, goal, work_window: { duration, units }, status: 'pending'|'in_progress'|'partial'|'complete'|'failed'|'abandoned', risk: 'low'|'medium'|'high', partial_results: Sf2ProcedureResult[], final_result: null|Sf2ProcedureResult, links: { procedure?, thread?, clue?, fact?, asset? } }`.
- **Task owner** — a genre-neutral owner reference. `kind` can be `npc | faction | retinue | asset | software | ritual | location | player_delegate | system`. Examples: crew analyst, hired scout, daemon, ritual circle, ship system, faction cell, retinue squad.
- **Task result** — use the kernel `Sf2ProcedureResult` union: procedure fact, constraint delta, affordance delta, complication delta, clue delta, clock tick, disposition delta, or thread transition. Avoid untyped `object` results.
- **Montage** — a beat-mode (`montage`, see ticket 11) that compresses time. Driven by Narrator with player input on what to focus on. During montage, time advances, off-screen tasks progress, pressure clocks may tick, and a result digest is surfaced.
- **Risk semantics** — `low`: task completes, partial results possible. `medium`: task can produce partial result on schedule, complete result requires the full window. `high`: task can fail outright, complete with caveats, or surface complications. Risk drives what dice roll (if any) is associated with task resolution.

## Canonical task examples

Reference list for fixtures and prompt examples — not exhaustive:

- Decode a captured message, prophecy fragment, intercepted packet, or court cipher (orientation work)
- Scout a physical route, social route, ward pattern, or network path (exploration/access work)
- Rebuild an access plan from new constraints (planning work)
- Modify gear, prepare a ritual component, compile an exploit, or forge a credential (technical/arcane work)
- Trace ownership, lineage, account control, or shell-company chain (logistics/investigation work)
- Vet a contact, cover, credential, seal, token, or pretext through neutral channels (vetting work)
- Reach out to a faction asset, informant, cult cell, courtier, or subnet contact for intelligence (social work)

Each example maps to one of: investigation procedure (clues), operation procedure (procedure facts / assessments), access runtime (route state / credential supports), exploration state, or asset state.

## Montage triggers

Montage beat mode activates when:

- Player explicitly compresses time ("skip ahead," "use the next three days," "while we wait").
- Narrator-initiated when chapter frame includes a preparation window and active off-screen tasks exist.
- Procedure phase transition that implies elapsed time (e.g. operation moving from `preparation` to `engagement` and the preparation window has unfinished tasks).

Montage is never auto-fired against player intent; the player can always interrupt and zoom back in.

## Acceptance criteria

- [ ] Off-screen task state matches the schema in Definitions, including generic owner, risk, work window, typed partial/final results, and links to procedures/threads/clues/facts/assets.
- [ ] Validator/deduper treats task owner, task record, partial result, final result, and linked procedure/world entities as separate scoped records unless kind, parent scope, and semantic role match.
- [ ] Risk semantics drive dice involvement on task resolution: `low` completes silently, `medium` may surface a check on completion, `high` can require a check with failure paths.
- [ ] Archivist patch guidance and validation can create, update, partially-resolve, fully-resolve, fail, or abandon off-screen tasks.
- [ ] Montage beat mode (ticket 11) is the activation surface for time advancement; montage is never auto-fired against player intent.
- [ ] Time advancement or montage surfaces task progress without requiring the player to play every sub-action.
- [ ] Task outcomes can create or update procedure facts (operation), assessments (planning), clues (investigation), constraints, affordances, signals, threads, complications (access/infiltration), or NPC/faction dispositions.
- [ ] Narrator retrieval includes a bounded montage/task packet (target ~250 tokens) when compressed time or recent task results are relevant.
- [ ] The UI exposes a compact task surface showing owner, goal, status, partial results, and ETA when off-screen tasks are active.
- [ ] Pressure clocks, timers, faction pressure, and origin counters can advance during montage when the fiction warrants it.
- [ ] A replay fixture covers a multi-day preparation window with three delegated tasks using different owner kinds (for example NPC, software/ritual, faction/retinue) progressing through a montage and feeding results into an operation plan.
- [ ] A replay fixture covers a `medium`-risk task producing a partial result mid-window, changing the next available player choices without resolving the operation.
- [ ] A replay fixture covers a `high`-risk task failing during montage, surfacing a complication that constrains the operation's `engagement` phase.
- [ ] A genre-neutral fixture proves the same task shape can represent a space-opera crew task, grimdark retinue/ritual task, and cyberpunk daemon/software task.
- [ ] A dedup fixture proves a delegated owner and its task/result remain distinct but linked.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/11-narrative-tempo-beat-mode-contract.md

## Implementation update - 2026-05-10

> *This was generated by AI during triage.*

Verified built as an off-screen task normalization and assertion slice.

- Added off-screen task normalization to `lib/sf2/procedure-planning.ts` with ticket-aligned owner kinds, `pending | in_progress | partial | complete | failed | abandoned` status, `low | medium | high` risk, work window, typed partial/final `Sf2ProcedureResult` outputs, and links to procedure/thread/clue/fact/asset ids.
- Review correction: replaced the initial local status dialect (`queued`, `active`, `resolved`) with the ticket-defined vocabulary while preserving legacy coercion for compatibility.
- Runner now asserts `expected.procedureOffscreenTask`.
- Verified with `npm run build` and `npm run sf2:replay -- fixtures/sf2/replay/procedure-montage-offscreen-task-runtime.json`.
