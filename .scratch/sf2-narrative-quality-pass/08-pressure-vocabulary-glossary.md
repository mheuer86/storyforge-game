# Pressure vocabulary glossary

Status: ready-for-agent
Category: refactor (naming/glossary)
**Type:** AFK
**Source:** narrative-quality pass + `sf2-domain-model-pruning.md` audit (2026-05-08, proposal #6)

## What to build

The audit identified five overlapping pressure concepts that share related language:

- `thread.tension` — canonical thread urgency (durable state)
- `threadPressure` / `engineRuntime` — code-owned chapter-runtime pressure (`chapter.setup.threadPressure[]`, `Sf2EngineRuntime`)
- `tensionScore` — planning-side scoring signal (`Sf2TensionScore`)
- `pacingAdvisory` — code-derived prompt guidance (`Sf2PacingAdvisory`)
- `ladderFire` — player-visible escalation event (pressure-ladder runtime)

Audit observation: *"Good domain depth, but naming makes it easy to mix canonical state, runtime pressure, and planning scores."*

This conflation directly contributes to the narrative-quality leak diagnosed in sparring 2026-05-08. The narrator pressure-manifestation rule shipped on the same day (`narrator/prompt.ts`) has to reference precise pressure tokens (`Δ +N`, `chapter pressure X/10`, `+N local`, `peak Y/10`) and teach the LLM what each layer means. Vague vocabulary in the codebase yields vague vocabulary in the prompts, which makes the narrator behave vaguely against pressure deltas.

Two parts, no behavior change:

**1. Glossary** at `lib/sf2/pressure/README.md` (or co-located with `pressure/derive.ts`). Each concept gets:
- one-sentence definition
- the layer it belongs to: *canonical* / *chapter-runtime* / *planning* / *advisory* / *event*
- the primary file
- one canonical example value (with the per-turn-delta token if applicable)

Cover, at minimum: `thread.tension`, `threadPressure.openingFloor`, `threadPressure.localEscalation`, `threadPressure.canonicalTension`, `threadPressure.peakTension`, `tensionScore`, `pacingAdvisory`, ladder-fire events.

**2. Type aliases** to make the layer distinction explicit in code:

```ts
type CanonicalThreadTension = number     // thread.tension; durable urgency
type ChapterRuntimePressure = number     // threadPressure; chapter-bound, mechanically charged
type PlanningTensionScore = number       // tensionScore; planning artifact
```

Even without runtime distinction, the named aliases force code readers to think about which layer they're touching. Apply where the cost is low (function signatures, new code); don't sweep through existing usages mechanically.

**3. Cross-check the narrator prompt's pressure-manifestation block** against the glossary. Tokens and layer-distinctions must match. If anything in the prompt is ambiguous against the glossary, fix the prompt — not the glossary.

## Acceptance criteria

- [ ] Glossary added at `lib/sf2/pressure/README.md` covering at least the eight pressure concepts above.
- [ ] Each concept lists: definition, layer, primary file, example value (+ per-turn-delta token where applicable).
- [ ] Type aliases added in `lib/sf2/pressure/derive.ts` or `lib/sf2/types.ts` for canonical / chapter-runtime / planning. Existing usages may be left as-is for this pass.
- [ ] Narrator prompt's `## Pressure manifestation` section cross-checked against the glossary; tokens and definitions consistent.
- [ ] No behavior change. Replay fixtures pass unchanged.

## Blocked by

None.

## Comments

> *Cheap pre-decision win. Whether v2 continues or we cherry-pick to v1, clear pressure vocabulary serves the narrative pass directly. The narrator pressure-manifestation rule depends on the LLM distinguishing Δ-on-a-thread (just-charged) from local escalation (chapter-accumulated) from canonical tension (durable). If v2 wins post-pass, this also unblocks the audit's #1 (Thread lifecycle policy module) by establishing shared vocabulary. If v1 wins, the glossary becomes the porting principle for pressure tracking.*

## Agent Brief

**Category:** refactor (naming/glossary)
**Summary:** Land a glossary plus minimal type aliases that disambiguate five pressure-related concepts at the layer boundary.
**Current behavior:** Five overlapping concepts blur canonical / chapter-runtime / planning / advisory / event distinctions; prompts inherit the blur.
**Desired behavior:** One glossary names each layer; type aliases enforce the distinction in new code; narrator prompt vocabulary aligned.
**Key interfaces:** `lib/sf2/pressure/*`, `lib/sf2/types.ts` (aliases only), `lib/sf2/narrator/prompt.ts` (cross-check).
**Acceptance criteria:** Issue checklist; no behavior change; replay fixtures unchanged.
**Out of scope:** Renaming existing fields (would break replay fixtures); the larger Thread lifecycle policy module from audit #1; audit proposals #4 and #7 (tracked separately as #09 and #10 in this directory).
