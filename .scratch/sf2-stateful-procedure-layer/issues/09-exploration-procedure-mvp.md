# Exploration Procedure MVP

Status: verified-built
Labels: verified-built
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Restore exploration as a stateful SF2 procedure for facilities, wilderness spaces, stations, ships, ruins, castles, networks, districts, and other spaces where geography or topology is load-bearing. Exploration should track current area/node, explored areas, unexplored branches, route constraints, hazards, resources, and ambient alertness. It should also interoperate with operation and access/infiltration state when the player is moving through hostile, restricted, or mission-critical space.

## Definitions

- **Area/node** — a node in the exploration graph: name, description, exits/edges (named), discovered/undiscovered features, hazards present. In cyberpunk this can be a network segment; in grimdark this can be a bailey, tower, crypt, or warded threshold.
- **Route constraint** — a known limit on a route: locked door requiring a key, sealed bulkhead requiring tools, alarmed corridor requiring stealth, heavy patrol requiring timing, warded gate requiring rite, firewall requiring exploit.
- **Ambient alertness** — ambient awareness level of the location/topology itself, distinct from access alert. Examples: quiet maintenance tunnel, sleeping castle wing, passive subnet, active hangar, patrolled rampart, monitored admin node. Affects DCs for stealth and observation, independent of whether the player has triggered an alert.
- **Exploration identity scope** — location/topology is the parent container; area/nodes are children; exits/edges connect nodes; route constraints attach to routes or nodes. Validator/deduper must preserve those boundaries even when names overlap.
- **Exploration packet** — bounded retrieval payload (~250 tokens) when exploration is active: current area/node, known exits/edges, route constraints in current + adjacent, active hazards, ambient alertness.

## Interop with access/infiltration

When the player enters an area/node where they're operating under a credential/mask (or otherwise under exposure pressure), exploration runtime continues to track geography/topology while access runtime owns credential, scrutiny, alert/exposure, and complication mechanics. Roles:

- Exploration owns: current area/node, route options, geography/topology facts, ambient alertness, route constraints, hazards.
- Access/infiltration owns: credential/mask status, alert/exposure clock, scrutiny layers, complications, egress phase.
- Both can be active simultaneously. Beat mode (ticket 11) determines which procedure drives pacing in any given turn.
- Handoff: entering hostile/restricted space activates access/infiltration if credential, scrutiny, or alert mechanics are needed. Leaving access pressure returns to plain exploration with route history preserved.

## Acceptance criteria

- [ ] Exploration procedure state models current area/node, explored nodes, unexplored branches, route constraints (locked/sealed/alarmed/patrol-timed/warded/firewalled), hazards, resources, and ambient alertness.
- [ ] Areas/nodes form a graph; exits/edges are named and discovered/undiscovered.
- [ ] Validator/deduper treats location/topology, area/node, exit/edge, route constraint, hazard, and ambient alertness as separate scoped entities.
- [ ] A location and an area/node with similar labels remain distinct records linked by parent scope rather than being merged.
- [ ] A route constraint and a hazard on the same area/node remain distinct unless they share kind, scope, and semantic role.
- [ ] Area transitions update exploration state through validated patch application.
- [ ] The Narrator receives a bounded exploration packet (~250 tokens) when exploration is active. Packet: current area/node, known exits/edges, route constraints in current + adjacent, active hazards, ambient alertness.
- [ ] The UI exposes a compact exploration surface showing current area/node, known exits/routes/edges, hazards, and relevant resources.
- [ ] Exploration coexists with access/infiltration: exploration owns geography/topology, access owns credential/scrutiny/alert. Beat mode picks the dominant pacing axis.
- [ ] Handoff: entering hostile/restricted space can activate access/infiltration runtime; leaving it preserves route history.
- [ ] Operation state can reference exploration routes or constraints when a mission depends on navigation.
- [ ] A replay fixture covers entering a facility/castle/network, discovering a branch route, encountering a hazard, and carrying route knowledge into a later operation/access beat.
- [ ] A second fixture covers exploration + access/infiltration coexisting: route knowledge persists while credential/scrutiny/alert mechanics drive a stealth or intrusion sequence.
- [ ] A dedup fixture covers a castle gate / gatehouse node / warded gate constraint or network gateway / gateway node / firewall constraint and proves the records stay separate.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/01-operation-procedure-runtime-mvp.md
- .scratch/sf2-stateful-procedure-layer/issues/03-operation-linked-infiltration-runtime.md

## Implementation update - 2026-05-10

> *This was generated by AI during triage.*

Verified built as an exploration packet derivation slice.

- `lib/sf2/procedure-access-exploration.ts` derives exploration nodes, routes, hazards, ambient alertness, and bounded facts/constraints/affordances/complications from active exploration procedure records.
- The derivation preserves dedup boundaries between location/topology, area nodes, routes, route constraints, hazards, and access-owned scrutiny/credential state.
- Runner now asserts `expected.procedureAccessExploration`.
- Verified with `npm run build`, `npm run sf2:replay -- fixtures/sf2/replay/procedure-access-exploration-runtime.json`, and `npm run sf2:replay -- fixtures/sf2/replay/procedure-access-exploration-dedup-boundaries.json`.
