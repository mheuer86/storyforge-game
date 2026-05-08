# Replace `antagonist_field.source_system` with faction reference

Status: ready-for-agent
Category: bug (schema + prompt)
**Type:** HITL → AFK
**Source:** chapter-frame review 2026-05-08

## What to build

`lib/sf2/author/prompt.ts:104`:

```
antagonist_field.{source_system, core_pressure, escalation_logic}: 1 sentence each (≤25 words)
```

`source_system` is institutional-by-name. "System" is a procedural construction by definition. Authors fill it with *"the compliance review"*, *"the audit office"*, *"the corridor authority"* — bureaucracy framed as antagonist.

User flag: **`source_system` doesn't map to an entity in our model.** SF2 has factions, NPCs, threads, locations as durable entities. There is no "system" entity class. The field is a free-text slot that drifts toward bureaucratic abstraction without grounding in any actual canon. The Narrator can't reference it as anything more than the string the Author wrote; the Archivist can't validate it against state.

Most antagonists in actual play *do* have a faction (Vantabloc, the Compact Remnant, Pinnacle, the Synod, Helix). When a faction exists, reference it canonically.

### Proposed shape

```ts
type Sf2AntagonistField = {
  // Replace `source_system: string` with:
  source_faction_id?: string         // primary faction the antagonism flows from
  source_faction_label?: string      // display label if no canonical faction yet exists
  default_face: Sf2AntagonistFace    // who first wears it (already in current contract)
  core_pressure: string              // human-framed: who is hurt, hunted, exposed
  escalation_logic: string           // human-framed: what happens to whom as it intensifies
}
```

When the antagonism is genuinely faceless or pre-faction (e.g. a rumor, a market shift, a world condition), use the label fallback.

The benefit:
- `default_face` (already in the contract) is the human face *now*.
- `source_faction_id` is the institution behind them.
- `core_pressure` and `escalation_logic` describe how that faction's pressure routes through people.

Three layers, each grounded in actual canon entities, no free-floating "system" abstraction.

### Also harden core_pressure and escalation_logic

Same human-consequence framing as #02 applies. Each must name a person, faction, or relationship cost. Worked examples:

- *core_pressure: "Vantabloc collects from people who run cargo for them and then walk away. Doss is the one who'll pay first if the PC tries to disengage."*
- *escalation_logic: "If pressure is resisted, Vantabloc shifts the lien to a successor broker — and Doss's family on Kess-Prime stops being plausibly deniable."*

## Acceptance criteria

- [ ] HITL decision on the new shape: single `source_faction_id` vs allow multi-faction; whether `source_faction_label` is required when no faction id is given; whether the migration drops or preserves old `source_system` strings.
- [ ] `Sf2AntagonistField` type updated in `lib/sf2/types.ts`.
- [ ] Author contract validator: if `source_faction_id` is present, it must reference an existing faction in state. If only `source_faction_label` is provided, validator allows it but flags as "not yet canonical".
- [ ] At least one of {`source_faction_id`, `source_faction_label`} must be present.
- [ ] Author prompt updated with the new field shape and a worked good-example pair.
- [ ] `core_pressure` and `escalation_logic` get human-consequence framing in their field guidance.
- [ ] Save normalization migrates existing `source_system: string` values: try to match to an existing faction (substring match on faction names); fall through to `source_faction_label`.
- [ ] Replay fixtures regenerated.

## Blocked by

HITL on the type shape (single vs multi-faction; label-fallback policy).

## Comments

> *"Source system" was a phantom field. The model couldn't validate it because it didn't reference any real entity. Replacing it with faction references puts the antagonist's institutional identity in canon and makes the Narrator's "who is the pressure source" question answerable.*
>
> *Coordinates with sf2-domain-model-hardening #05 (faction lifecycle / leadership / membership), but doesn't depend on it — pointing at a faction id that has minimal lifecycle today is still a strict improvement over pointing at nothing.*

## Agent Brief

**Category:** bug (schema + prompt)
**Summary:** Replace ungrounded `source_system: string` with faction id + label fallback that map to actual canon entities.
**Current behavior:** `source_system` is free text drifting toward bureaucratic abstraction; not validated against any entity; the Narrator can't reference it as anything more than a string.
**Desired behavior:** Antagonist source is grounded in a faction id (or label fallback for pre-canonical cases); validator checks it; pressure logic is human-framed.
**Key interfaces:** `lib/sf2/types.ts`, `lib/sf2/author/contract.ts`, `lib/sf2/author/prompt.ts`, `lib/sf2/persistence/normalize.ts`.
**Acceptance criteria:** Issue checklist; replay fixtures pass.
**Out of scope:** Faction lifecycle hardening (sf2-domain-model-hardening #05).
