# Define pressure events with human consequences

Status: verified-built
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, pressure review

## Reconciliation

2026-05-08 status pass: verified built. Evidence: `Sf2PressureEvent` is typed and persisted, Archivist schema/prompt can emit `pressure_events`, route normalization maps tool payloads, apply-patch validates target threads, idempotency, source/scope/severity, evidence, and required human consequence, and persistence normalization repairs/drops invalid legacy entries. Fixtures `pressure-event-missing-human-consequence-rejected.json` and `pressure-event-duplicate-idempotency-dedupes.json` passed in the full SF2 replay suite.

## What to build

Define an explicit pressure-event contract so SF2 pressure means human danger, leverage, exposure, pursuit, loss, betrayal, or narrowed choices instead of procedural task friction.

The current pressure system has useful pieces: canonical thread tension, chapter-local pressure, pressure ladder fires, player/NPC reheat, failed-roll pressure, pacing advisories, human stakes, and SF2B tension scores. The missing contract is the link between "pressure changed" and "why this matters to people in the fiction."

The motivating failure mode is Hegemony drifting into administrative errands: forms, clearances, fuel credits, permits, and deadlines that ask the PC to complete bureaucracy rather than face a human consequence. Administrative surfaces are allowed only when they reveal coercion: who gains leverage, who pays, who is exposed, who must enforce it, and what gets harder.

## Acceptance criteria

- [ ] Introduce or document a `PressureEvent` shape that records source, target thread ids, scope, amount/severity, evidence, idempotency, and human consequence
- [ ] Pressure events require a human consequence: who pays, who gains leverage, what gets harder, what is at risk, and what becomes visible in play
- [ ] Pressure ladder stages separate procedural surface from human consequence and world/state effect
- [ ] Author pressure-surface guidance rejects procedural-only pressure, especially bureaucracy-as-quest structures
- [ ] Archivist patch guidance distinguishes pressure events from generic `tension_deltas` and records why pressure changed
- [ ] Pressure runtime applies pressure through one narrow module interface instead of scattered local mutation paths where practical
- [ ] Narrator scene packets surface pressure as human stakes and immediate dramatic pressure, not as paperwork instructions
- [ ] Replay fixtures cover a bad procedural pressure surface being rejected or repaired, and a good Hegemony pressure event where institutional action creates pursuit, exposure, coercion, or human cost

## Blocked by

- 02-thread-lifecycle-policy-module.md recommended, because pressure event targets and terminal thread behavior depend on lifecycle semantics
- 03-move-chapter-thread-assignment-out-of-durable-thread.md recommended, because event scope should distinguish durable thread pressure from chapter-local runway pressure

## Related / overlap

- `.scratch/sf2-narrative-quality-pass/02-outcome-spectrum-human-consequences.md`
- `.scratch/sf2-narrative-quality-pass/05-human-stakes-block-chapter-setup.md`
- `.scratch/sf2-narrative-quality-pass/08-pressure-vocabulary-glossary.md`
- The Narrator pressure-manifestation rule and `human_stakes` contract appear to be present in the current code. This ticket should build the deeper `PressureEvent` contract on top of those pieces rather than redoing them.

## Comments

Working model:

```ts
type PressureEvent = {
  id: string
  turn: number
  source:
    | 'failed_roll'
    | 'npc_agenda'
    | 'faction_move'
    | 'deadline'
    | 'decision'
    | 'promise_neglected'
    | 'clue_revealed'
    | 'ladder_fire'
  targetThreadIds: Sf2EntityId[]
  scope: 'canonical_thread' | 'chapter_local'
  amount?: number
  severity?: 'standard' | 'hard'
  evidenceQuote: string
  humanConsequence: {
    whoPays: Sf2EntityId | 'pc'
    whoGainsLeverage?: Sf2EntityId
    whatGetsHarder: string
    whatIsAtRisk: string
    visiblePressure: string
  }
  idempotencyKey: string
}
```

Pressure stages should look less like "file form 3A within 24 hours" and more like:

- "The hunter identifies the village that hid the Jedi."
- "Kess must either expose the PC's patron or lose protection."
- "The settlement elder can now trade the PC's delay to the occupying force."
- "The faction stops negotiating and sends someone the PC cannot ignore."

Administrative details can remain as texture, but they must not be the point of play. The Hegemony fantasy is coercive human leverage, pursuit, loyalty under threat, and institutional violence wearing polite language; not clerical obstacle courses.

## Agent Brief

**Category:** architecture
**Summary:** Make pressure events carry human consequences, not procedural chores.

**Current behavior:** Pressure can change through tension updates, ladder fires, failed rolls, agenda reheats, player engagement, chapter cooling, and SF2B tension scores, but the human consequence is not a required contract.

**Desired behavior:** Every pressure change or pressure stage answers: who is hurt, hunted, exposed, cornered, indebted, compromised, or forced to choose? Procedural surfaces are valid only as expressions of human leverage.

**Key interfaces:** `Sf2Thread`, `Sf2ChapterThreadPressure`, `Sf2PressureLadderStep`, `Sf2HumanStake`, `Sf2PacingClassification`, `ladderFires`, `pressure/runtime.ts`, `pressure/reheat.ts`, Author pressure surface schema, Archivist patch schema, retrieval chapter/thread packets, replay fixtures.

**Out of scope:** Replacing all pressure code in one refactor or removing bureaucratic Hegemony texture entirely.
