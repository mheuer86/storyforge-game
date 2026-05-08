# Clarify Decision and Promise agency contracts

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Decision/Promise review

## What to build

Clarify Decision and Promise as durable player-agency memory, not just thread decorations. Decisions should know who made the choice and what future constraint or consequence it creates. Promises should distinguish the promisor from the promisee so PC-owned promises can be queried explicitly.

## Acceptance criteria

- [ ] Decision has an explicit actor/maker reference instead of only `madeByPC: boolean`
- [ ] Decision lifecycle is documented and validated; closed anchor threads do not automatically mean the decision is invalid
- [ ] Promise splits current `owner` semantics into clear promisor/promisee fields, with `pc` supported where needed
- [ ] Promise lifecycle is documented and validated: active, strained, kept, broken, and released have explicit transition rules
- [ ] Retrieval and scene packet rendering include enough agency context to tell who chose/promised what
- [ ] `pruneGraph` no longer demotes active decisions/promises solely because all anchor threads are non-active unless the lifecycle policy says that is correct
- [ ] Save normalization migrates existing decisions and promises safely
- [ ] Replay fixtures cover a PC promise to an NPC, an NPC promise to the PC, and a decision whose consequence persists after its thread resolves

## Blocked by

- 02-thread-lifecycle-policy-module.md recommended, because decision/promise pruning currently depends on thread status semantics

## Comments

Current shape:

- `Sf2Decision` has `summary`, `madeByPC`, `anchoredTo`, and status.
- `Sf2Promise.owner` is documented as "to whom the promise is made", so the field name is misleading.
- `pruneGraph` invalidates active decisions and releases active promises when all anchor threads stop being active.

Promise lifecycle note:

- `strained` is a useful intermediate state for a promise that still exists but is under visible pressure or has lingered without action.
- Do not make `strained` a free-form Archivist vibe. Prefer code-derived transitions when possible: deadline proximity, repeated scene-end `unpaid_promise`, explicit refusal/delay by promisor, promisee pressure, or an anchored thread deteriorating while the obligation remains open.
- Open design question: should `strained` be a durable status, or a derived advisory from active promise + temporal/thread pressure?

Open design question: whether a Decision always belongs to the PC, or whether NPC/faction decisions should use the same entity. Default recommendation: support a general actor ref, but keep Archivist guidance focused on PC decisions unless a non-PC decision creates durable future constraints.

## Agent Brief

**Category:** architecture
**Summary:** Make Decision and Promise preserve agency, not just thread-local notes.

**Current behavior:** Decisions are mostly summaries with a PC boolean. Promises know the recipient but not the promisor. Both are pruned based on anchor thread activity.

**Desired behavior:** Decisions and promises have explicit participants, lifecycle tables, and retrieval output that preserves who owes/chose what. Promise strain is represented deliberately, either as a validated status or derived advisory, not as vague sentiment.

**Key interfaces:** `Sf2Decision`, `Sf2Promise`, `Sf2OwnerRef` or a new participant ref, `apply-patch.ts`, `runtime/prune-graph.ts`, `retrieval/packets/tensions.ts`, `retrieval/scene-packet.ts`, Archivist prompt/tool schemas.

**Out of scope:** Full reputation or obligation economy.
