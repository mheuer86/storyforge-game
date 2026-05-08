# Add `human_stakes` block to chapter setup contract

Status: ready-for-agent
Category: feature (contract change)
**Type:** HITL → AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## What to build

The Hegemony bible currently tells the Narrator (`lib/sf2/narrator/prompt.ts:127`):

> *"If the scene starts to feel like a filing queue, move the pressure back to the person, family, officer, retainer, or Resonant who will pay for the wording."*

The Author has no equivalent rule. A chapter can be authored with pressure that names no human cost. The Narrator inherits a procedural skeleton with nobody to pay, and defaults to procedural escalation when pressure charges. (Diagnosed at length in sparring 2026-05-08.)

Add a `human_stakes` block to the chapter setup contract:

```ts
type Sf2HumanStake = {
  whoPays: string                    // NPC id (preferred) or "the PC"
  costSurface: 'standing' | 'freedom' | 'loyalty' | 'relationship' | 'safety' | 'reputation'
  whatIsLost: string                 // 1 sentence, ≤24 words
  triggeringPressure: string         // thread id or pressure-engine id; what charging this stake means realization
}

// chapter setup contract gets:
human_stakes: [Sf2HumanStake, Sf2HumanStake, Sf2HumanStake?]  // 2-3 required
```

**Author requirements:**
- Emit 2-3 `human_stakes` per chapter.
- At least one `whoPays` must be a starting_npc id (the chapter must put the cost-bearer on stage at some point).
- `costSurface` must be one of the enum values (closed list keeps Authors honest).
- `triggeringPressure` must reference a thread id or pressure-engine id from the same setup; orphan stakes fail validation.

**Narrator surface:**
- The scene packet exposes `human_stakes` in the per-turn delta.
- The narrator pressure-manifestation rule (shipped 2026-05-08 in `narrator/prompt.ts`) is updated to: when a thread charges Δ +2/+3 and a `human_stake`'s `triggeringPressure` references that thread, the manifestation should visibly threaten or realize that specific stake.

This is a contract change — HITL up front because it touches:
- `lib/sf2/types.ts` (chapter setup type)
- `lib/sf2/author/contract.ts` (validation)
- `lib/sf2/author/prompt.ts` (instructions + field caps)
- `lib/sf2/retrieval/scene-packet.ts` (narrator surfacing)
- `lib/sf2/narrator/prompt.ts` (pressure manifestation update referencing `human_stakes`)
- Replay fixtures (need a regen pass)
- sf2b mode (if it has its own chapter setup variant)

After the contract is agreed, implementation is AFK.

## Acceptance criteria

- [ ] `Sf2HumanStake` type added to `lib/sf2/types.ts`.
- [ ] Chapter setup contract requires 2-3 `human_stakes` entries (Ch1 same as Ch2+, except Ch1 may use 2 if the chapter is character-onboarding-heavy).
- [ ] Author validator rejects: missing `human_stakes`, fewer than 2 entries, invalid `costSurface` enum, orphan `triggeringPressure`, all `whoPays = "the PC"` (at least one external NPC required).
- [ ] Author prompt section explains the `human_stakes` block with a worked example (mirrors the Hegemony bible's "person who pays for the wording" guidance).
- [ ] Scene packet surfaces `human_stakes` in the per-turn delta in a stable format.
- [ ] Narrator pressure-manifestation block updated: when a charged thread is `triggeringPressure` for a `human_stake`, the manifestation must visibly threaten/realize *that* stake.
- [ ] Replay fixtures pass.
- [ ] sf2b mode either inherits the contract or explicitly opts out with a documented reason.

## Blocked by

HITL alignment on the `Sf2HumanStake` shape. Specifically:
- `costSurface` enum values — the proposed list (standing / freedom / loyalty / relationship / safety / reputation) is a starting point, not a final cut.
- Whether `triggeringPressure` is single or multi-thread.
- Whether `human_stakes` is per-chapter (proposed) or per-thread.

## Comments

> *This is the structural fix the narrator pressure-manifestation rule depends on long-term. The narrator was given an obligation in the 2026-05-08 edit ("when a thread charges, the named thread's stake must escalate") but has no canonical roster of stakes to escalate. `human_stakes` provides that roster, authored at chapter setup, surfaced to the narrator at every turn.*

## Agent Brief

**Category:** feature (contract change)
**Summary:** Mandate Authors name 2-3 human stakes per chapter; surface them to the Narrator for pressure-manifestation grounding.
**Current behavior:** Authors can produce chapters with no named human cost; Narrator pressure manifestation has no roster to escalate against; procedural escalation fills the vacuum.
**Desired behavior:** Every chapter has a 2-3 element `human_stakes` block tying threads/engines to specific people and consequences.
**Key interfaces:** Sf2 chapter setup type, Author contract validator, Author prompt, scene packet builder, Narrator role.
**Acceptance criteria:** Issue checklist; replay fixtures regenerated; HITL signoff on the type shape.
**Out of scope:** Building a UI to display stakes to the player (state-only change for now).
