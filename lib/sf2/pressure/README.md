# SF2 Pressure Vocabulary

SF2 uses several pressure-like signals. They are related, but they live at different layers. Keep the names precise so prompts, validators, and replay fixtures do not blur durable state with chapter-local runtime pressure.

| Concept | Layer | Definition | Primary File | Example |
|---|---|---|---|---|
| `thread.tension` | canonical | Durable urgency on a narrative thread across chapters. It survives chapter transitions and is written by state updates. | `lib/sf2/types.ts`, `lib/sf2/turn-resolution/resolve.ts` | `thread_missing_witness.tension = 6`; per-turn token: `canonical 6/10` |
| `thread.peakTension` | canonical | Highest durable urgency the thread has reached, used when resolved or deferred threads still contribute to larger pressure. | `lib/sf2/types.ts`, `lib/sf2/pressure/derive.ts` | `peak 8/10` |
| `threadPressure.openingFloor` | chapter-runtime | Chapter-local starting pressure after carry-forward cooling, engine floors, or new-thread overrides. | `lib/sf2/pressure/derive.ts` | `opening 4/10` |
| `threadPressure.localEscalation` | chapter-runtime | Chapter-local pressure charged after chapter open, usually from failed rolls or pressure-ladder fires. | `lib/sf2/pressure/reheat.ts`, `lib/sf2/turn-resolution/resolve.ts` | `+3 local` |
| effective thread pressure | chapter-runtime | Current chapter-local pressure: `openingFloor + localEscalation`, clamped to `0..10`. | `lib/sf2/pressure/derive.ts` | `chapter pressure 7/10` |
| `Sf2EngineRuntime.value` | chapter-runtime | Code-owned pressure engine value derived from one or more anchor threads. | `lib/sf2/pressure/runtime.ts`, `lib/sf2/pressure/derive.ts` | `engine_route_heat.value = 7` |
| `pacingAdvisory` | advisory | Code-derived prompt guidance about pacing health; it advises narration but does not mutate pressure. | `lib/sf2/pacing/signals.ts` | `stagnantThreadIds: ["thread_broker_debt"]` |
| ladder-fire event | event | Runtime event that a pressure ladder step fired this turn; it may reheat one or more threads. | `lib/sf2/pressure/runtime.ts`, `lib/sf2/archivist/prompt.ts` | `ladder_fired: ladder_breach`; per-turn token: `Δ +2` on affected thread |
| per-turn `Δ +N` | event | The just-charged amount on a thread this turn. It is an event marker, not a durable field by itself. | `lib/sf2/retrieval/packets/tensions.ts` | `Δ +2` means narrate that named thread’s stake getting visibly hotter now. |

## Reading the Per-Turn Delta

A rendered thread line may contain:

`chapter pressure 7/10 (opening 4/10 +3 local; canonical 6/10; peak 8/10; role spine) · Δ +2`

Read it as:

- `canonical 6/10`: durable `thread.tension`.
- `peak 8/10`: durable `thread.peakTension`.
- `opening 4/10`: chapter-runtime `threadPressure.openingFloor`.
- `+3 local`: chapter-runtime `threadPressure.localEscalation`.
- `chapter pressure 7/10`: current effective chapter pressure.
- `Δ +2`: this-turn event; the Narrator must manifest the charged thread’s stake in this turn’s prose.
