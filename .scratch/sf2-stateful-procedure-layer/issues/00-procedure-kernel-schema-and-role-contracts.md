# Procedure Kernel Schema and Role Contracts

Status: verified-built
Labels: verified-built
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Create the shared genre-neutral kernel that every SF2 procedure module uses before operation, access, exploration, investigation, combat, montage, and forward-motion work diverge into their own slices. The kernel should define common state shape, semantic phase vocabulary, cross-links, contribution/result unions, validation invariants, retrieval packet rules, and role ownership across Author, Beat Selector, Narrator, Archivist, Validator, Retrieval, and UI.

The kernel must work for a space-opera freighter insertion, a grimdark castle infiltration, a cyberpunk network intrusion, a fantasy wilderness route, a noir investigation, and a combat scene without changing schema names.

## Shared Vocabulary

- **Procedure** — a typed, stateful activity with lifecycle, stakes, constraints, affordances, complications, links, and role-owned mutations.
- **Procedure kind** — `operation | access | exploration | investigation | combat | montage_task`. Player-facing labels may differ by genre.
- **Procedure status** — `active | paused | resolved | failed | abandoned`.
- **Semantic phase** — genre-neutral phase labels used internally where a procedure has phases: `orientation | commitment | preparation | engagement | egress | reckoning | aftermath`. Genres may render these as "intel/extraction/debrief", "scouting/escape/reckoning", "recon/exfil/cleanup", etc.
- **Procedure fact** — a confirmed, currently true statement that matters to a procedure. Operation tickets may render these as tactical facts, but the kernel stores them as procedure facts.
- **Constraint** — a limit, cost, gate, resource, exposure, social pressure, route restriction, moral bind, technical barrier, or arcane ward that reduces available options until changed.
- **Affordance** — an earned option, route, credential, ally, asset use, evidence leverage, exploit, ritual permission, or tactical advantage that increases available options.
- **Complication** — a named consequence that actively reshapes later choices until cleared, resolved, superseded, or carried forward.
- **Support contribution** — a planning or execution input from any source that can strengthen, challenge, or constrain a procedure. Sources may be NPCs, factions, assets, clues, locations, rituals, software, retinues, preparation, or prior decisions.
- **Identity scope** — the parent context that gives a procedure entity its meaning. An area/node belongs to a location or topology, a route belongs between nodes, a credential/mask belongs to an access runtime, a scrutiny layer belongs to a boundary/location, and a constraint belongs to the procedure or entity it constrains.
- **Dedup boundary** — the rule that two records can only merge when they share entity kind, parent scope, and semantic role. Similar labels are not enough.

## Shared Data Shapes

The implementation may adapt naming to existing SF2 conventions, but each concept should be represented explicitly.

```ts
type Sf2ProcedureKind =
  | 'operation'
  | 'access'
  | 'exploration'
  | 'investigation'
  | 'combat'
  | 'montage_task'

type Sf2ProcedureStatus =
  | 'active'
  | 'paused'
  | 'resolved'
  | 'failed'
  | 'abandoned'

type Sf2SemanticPhase =
  | 'orientation'
  | 'commitment'
  | 'preparation'
  | 'engagement'
  | 'egress'
  | 'reckoning'
  | 'aftermath'

type Sf2ProcedureLink = {
  kind:
    | 'procedure'
    | 'thread'
    | 'arc'
    | 'npc'
    | 'faction'
    | 'location'
    | 'area_node'
    | 'route'
    | 'credential_mask'
    | 'scrutiny_layer'
    | 'clue'
    | 'asset'
    | 'clock'
    | 'decision'
    | 'promise'
  id: string
  parentKind?: 'procedure' | 'location' | 'area_node' | 'route'
  parentId?: string
}

type Sf2ProcedureFact = {
  id: string
  text: string
  confidence: 'confirmed' | 'contested'
  sourceRefs: Sf2ProcedureLink[]
  invalidatesWhen?: string
  lastUpdatedTurn: number
}

type Sf2ProcedureConstraint = {
  id: string
  label: string
  kind: 'resource' | 'time' | 'access' | 'exposure' | 'social' | 'route' | 'moral' | 'technical' | 'arcane' | 'physical'
  status: 'active' | 'consumed' | 'resolved' | 'superseded'
  current?: number
  max?: number
  clearsWhen?: string
  linkedRefs: Sf2ProcedureLink[]
}

type Sf2ProcedureAffordance = {
  id: string
  label: string
  kind: 'credential' | 'route' | 'ally' | 'asset' | 'evidence' | 'leverage' | 'exploit' | 'ritual' | 'position'
  status: 'available' | 'used' | 'expired' | 'lost'
  consumesConstraintId?: string
  linkedRefs: Sf2ProcedureLink[]
}

type Sf2ProcedureComplication = {
  id: string
  label: string
  effectSummary: string
  status: 'active' | 'cleared' | 'superseded'
  clearsWhen?: string
  linkedRefs: Sf2ProcedureLink[]
}

type Sf2SupportContribution = {
  id: string
  source: {
    kind: 'npc' | 'faction' | 'asset' | 'clue' | 'location' | 'ritual' | 'software' | 'retinue' | 'preparation' | 'decision'
    id?: string
    label: string
  }
  lane: string
  kind: 'expertise' | 'objection' | 'constraint' | 'signal' | 'resource' | 'cover' | 'route' | 'evidence'
  summary: string
  effect?: 'advantage' | 'dc_shift' | 'new_fact' | 'new_constraint' | 'new_affordance' | 'roll_required'
}

type Sf2ProcedureResult =
  | { kind: 'procedure_fact'; fact: Sf2ProcedureFact }
  | { kind: 'constraint_delta'; constraint: Sf2ProcedureConstraint }
  | { kind: 'affordance_delta'; affordance: Sf2ProcedureAffordance }
  | { kind: 'complication_delta'; complication: Sf2ProcedureComplication }
  | { kind: 'clue_delta'; clueId: string }
  | { kind: 'clock_tick'; clockId: string; delta: number; reason: string }
  | { kind: 'disposition_delta'; npcOrFactionId: string; delta: number; reason: string }
  | { kind: 'thread_transition'; threadId: string; toStatus: string; reason: string }

type Sf2ProcedureRuntime = {
  id: string
  kind: Sf2ProcedureKind
  status: Sf2ProcedureStatus
  label: string
  genreSurface?: {
    phaseLabel?: string
    procedureLabel?: string
  }
  phase?: Sf2SemanticPhase
  objective?: string
  stakes?: string
  facts: Sf2ProcedureFact[]
  constraints: Sf2ProcedureConstraint[]
  affordances: Sf2ProcedureAffordance[]
  complications: Sf2ProcedureComplication[]
  contributions: Sf2SupportContribution[]
  linkedRefs: Sf2ProcedureLink[]
  createdAtTurn: number
  updatedAtTurn: number
}
```

## Role Contracts

- **Author / Chapter Author** creates pressure fields, chapter setup, and possible procedure opportunities. It does not directly mutate live procedure runtime during play.
- **Beat Selector** derives the current beat mode from committed state, recent turns, and player input. It is deterministic and observable in instrumentation.
- **Narrator** reads procedure packets, writes prose, frames choices, and requests rolls. It may reference procedure state but does not persist procedure mutations.
- **Archivist** proposes semantic procedure patches after the turn: create, update, transition phase, resolve, fail, abandon, clear, link, or carry residue.
- **Validator** resolves IDs, enforces genre-neutral enums, validates lifecycle/phase transitions, accepts valid patch parts, rejects drift, and records instrumentation.
- **Deduper / Normalizer** is part of validation. It merges aliases only inside the same entity kind, parent scope, and semantic role. It may attach aliases or links across related entities, but it must not collapse a parent container into a child entity or flatten a procedure-specific record into a generic world entity.
- **Retrieval** builds bounded packets from committed procedure state only.
- **UI** renders committed procedure state only; it does not infer hidden procedure transitions from prose.

## Invariants

- Schema names must be genre-neutral. Genre-specific language belongs in labels, examples, or `genreSurface`, not core enum values.
- All cross-entity references use `Sf2ProcedureLink`-style refs and must resolve before persistence.
- All procedure entities have an explicit identity scope when they are children of another entity. Location, area/node, route, route constraint, credential/mask, scrutiny layer, procedure fact, clue, constraint, affordance, and complication are distinct entity kinds even when their labels overlap.
- Dedup keys must include entity kind plus parent scope. The validator/deduper must never merge a location with one of its area/nodes, an area/node with a route, a route with a route constraint, a credential/mask with a persona/NPC, a scrutiny layer with a general location hazard, or a procedure fact with an investigation clue.
- If two records seem related but have different kinds or scopes, validation should preserve both and create a link/alias note instead of merging them.
- Procedure state cannot be created solely because a genre or seed exists; activation must be state-derived from live fiction.
- Resolved, failed, abandoned, and paused procedures must classify residue for chapter transition.
- Packets must be bounded and deterministic: same state plus same beat mode produces the same packet.
- Validator must reject direct Narrator-authored persistence and any patch that invents unresolved refs.

## Acceptance Criteria

- [ ] Shared procedure kernel types or equivalent schema cover runtime, facts, constraints, affordances, complications, support contributions, links, semantic phases, and typed procedure results.
- [ ] All procedure modules can reference the shared kernel instead of defining incompatible local shapes.
- [ ] Internal semantic phases are genre-neutral; genre-specific phase labels render through labels or `genreSurface`.
- [ ] Role contracts are represented in prompt/tool/validator guidance so Author, Narrator, Archivist, Validator, Retrieval, and UI have clear ownership.
- [ ] Validator enforces lifecycle transitions, cross-ref resolution, genre-neutral enum values, and packet-boundedness assumptions.
- [ ] Validator/deduper preserves procedure granularity by deduping only within matching entity kind + parent scope + semantic role.
- [ ] A fixture proves a location and its area/node with similar names remain distinct but linked.
- [ ] A fixture proves a route constraint, scrutiny layer, credential/mask, procedure fact, and clue are not merged merely because they reference the same fictional object.
- [ ] A replay or pure fixture proves the same kernel shape can represent a space-opera station insertion, a grimdark castle infiltration, and a cyberpunk network intrusion.
- [ ] Instrumentation records beat mode, procedure patch acceptance/rejection, phase transition, and residue classification.

## Blocked by

None - can start immediately

## Implementation update - 2026-05-10

> *This was generated by AI during triage.*

Verified built as the shared foundation for the stateful procedure layer.

- Added `lib/sf2/procedure.ts` as the genre-neutral kernel for procedure kind/status, semantic phases, links, facts, constraints, affordances, complications, support contributions, planning assessments, operation abort conditions/signals, normalization, stable scoped keys, active-procedure detection, and bounded retrieval packets.
- Wired procedure ownership through SF2 state, save normalization, entity references, scene kernel active procedure ids, mechanics packets, scene-packet rendering, Archivist tool schema/prompt guidance, and patch application.
- Review findings addressed: removed a duplicate operation-runtime helper that diverged from the kernel, hardened nested procedure normalization against malformed persisted/model data, and kept meta pacing suppression aligned between diagnostics and prompt text.
- Verified with `npm run build` plus focused fixtures:
  - `npm run sf2:replay -- fixtures/sf2/replay/procedure-operation-runtime-surfaces.json`
  - `npm run sf2:replay -- fixtures/sf2/replay/procedure-archivist-create-operation-runtime.json`
  - `npm run sf2:replay -- fixtures/sf2/replay/beat-mode-meta-pauses-pacing.json`
