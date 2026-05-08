# Split singleton Operation Plan from live Operation Runtime

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, Operation Plan review

## What to build

Keep `Sf2OperationPlan` as a singleton tactical plan, but clarify its contract and split it from any live operation runtime/procedure state. The plan represents the PC's current intended tactic. Runtime represents what is happening while the tactic is being executed.

## Acceptance criteria

- [ ] `Sf2OperationPlan` remains a singleton but gains clear anchors to threads, target entities, and target locations
- [ ] Operation plan lifecycle/status is explicit and validated
- [ ] Operation runtime/procedure state is separate from the plan and replaces or clarifies `world.operation?: { phase: string; status: string }`
- [ ] Mechanics packet and scene kernel distinguish the plan from active runtime
- [ ] Archivist update guidance says when to update the plan versus when to update live runtime/procedure state
- [ ] Save normalization migrates existing `campaign.operationPlan` and `world.operation` safely
- [ ] A replay fixture covers committing to a plan, executing it, and resolving or abandoning it without losing thread pressure

## Blocked by

None - can start immediately

## Comments

HITL decision captured: the plan should stay a singleton for now. Do not model multiple simultaneous operation plans unless playthrough evidence demands it.

Candidate split:

```ts
Sf2OperationPlan {
  name?: string
  objective: string
  anchoredThreadIds: Sf2EntityId[]
  targetEntityIds: Sf2EntityId[]
  targetLocationIds: Sf2EntityId[]
  approach: string
  fallback: string
  knownRisks: string[]
  status: 'draft' | 'active' | 'paused' | 'resolved' | 'abandoned'
  lastUpdatedTurn: number
}

Sf2OperationRuntime {
  phase: string
  status: 'stable' | 'compromised' | 'blocked' | 'complete'
  planLastSeenTurn?: number
}
```

## Agent Brief

**Category:** architecture
**Summary:** Keep Operation Plan singleton, but separate plan from live procedure state.

**Current behavior:** `campaign.operationPlan` stores a mutable plan, while `world.operation` is a weak stringly runtime stub.

**Desired behavior:** The singleton plan has anchors and lifecycle. Runtime/procedure state is separate and typed.

**Key interfaces:** `Sf2OperationPlan`, `world.operation`, mechanics packet, scene kernel, Archivist update schema, patch validation, persistence normalization.

**Out of scope:** Multiple simultaneous operation plans.

