# Operation-Linked Access/Infiltration Runtime

Status: verified-built
Labels: verified-built
Type: AFK

## Parent

.scratch/sf2-stateful-procedure-layer/PRD.md

## What to build

Add a stateful access/infiltration procedure that consumes operation state during active engagement. It tracks access posture, credential or mask (when relevant), scrutiny layers, alert/exposure clock, live complications, route state, and egress phase. Failed stealth, deception, hacking, ritual, social, or fate rolls should mutate this runtime and feed pressure back into the operation.

Credential or mask should be structured when relevant: assumed identity, uniform, forged writ, saint's seal, stolen admin token, daemon session, guest pass, ritual permission, or social pretext. Failure should produce downstream constraints such as escort leash, restricted movement, watchlist flag, ward attention, ICE trace, lost route, or accelerated alert/exposure clock rather than simply blocking entry.

## Definitions

- **Access posture** — how the player is trying to pass a boundary: `open` | `masked` | `authorized` | `covert` | `forced` | `remote` | `social`. Examples: a forged writ in a castle, a dockworker alias on a freighter, a stolen admin token in a network, a priestly seal at a shrine.
- **Credential or mask relevance** — credential/mask state is required when the player relies on assumed authority, false identity, technical credential, ritual permission, uniform, pretext, or exploit to gain access. It is not required for overt entry, hostile assault, or cases where the player's real identity is the asset.
- **Credential/mask status enum** — `clean` (no flags), `flagged` (suspicion recorded but not acted), `compromised` (active challenge or trace), `burned` (credential unusable; reverts to overt or alternate action). Flag and compromise are downstream constraints; burn is a state transition.
- **Scrutiny layers** — concurrent scrutiny sources active at the current boundary or location. Examples: cameras, guards, biometric checkpoint, patrol rotation, comms intercept, behavioral observation, document verification, wards, spirits, court etiquette, intrusion countermeasures, audit logs. Each layer has a defeat condition or workaround. Failed checks against a specific layer can promote that layer to "alerted."
- **Access identity scope** — credential/mask, scrutiny layers, exposure clock, and complications belong to the access runtime and optionally link to a location, area/node, route, NPC, faction, or asset. Validator/deduper must not merge them into those linked entities.
- **Alert/exposure clock** — a tension clock instance scoped to this access procedure, separate from chapter-level pressure clocks. Uses the existing tension clock primitive but is owned by the access runtime and tied to exposure mechanics. On full activation: lockdown, hostile pursuit, egress-only path, ICE trace, ward alarm, or social exposure.
- **Complications** — named, scoped consequences from failed checks that constrain later choices. Each has a `name`, `effect_summary`, `clears_when`, and an optional `linked_layer`. Example: "Jessek leash" — restricts movement to cargo zones until established as adequate, clears after 3 clean turns of work behavior.
- **Route state** — the path through the location, derived from exploration data when present. Tracks committed route, available alternates, and known dead-ends from failed access checks.
- **Egress phase** — explicit terminal phase. Has its own dramatic stakes and may require fresh rolls (Stealth, navigation, vehicle handling, escape, logout, counter-ritual). Distinct from the access/objective phase mechanically and narratively.

## Acceptance criteria

- [ ] Access/infiltration runtime can start from an active operation entering `engagement` phase.
- [ ] Access/infiltration runtime can run with or without credential/mask state; credential/mask is optional, not required.
- [ ] Credential/mask, when present, is structured: label, posture, support refs, known tells/weaknesses, status (clean/flagged/compromised/burned).
- [ ] Scrutiny layers list is initialized from location/operation state and can be updated as new layers are revealed mid-engagement.
- [ ] Validator/deduper treats credential/mask, scrutiny layer, exposure clock, complication, route state, and linked NPC/location/area/node as separate scoped entities.
- [ ] A credential/mask with the same label as an NPC persona, asset, forged item, or access token remains a separate access-runtime record linked to that entity rather than merged into it.
- [ ] A scrutiny layer and an exploration hazard on the same area/node remain distinct unless they share kind, scope, and semantic role.
- [ ] Alert/exposure clock uses the tension-clock primitive, scoped to the access runtime, separate from chapter-level pressure clocks.
- [ ] Failed checks tick the alert clock OR add a named complication (or both), but never silently end the scene.
- [ ] Complications carry `name`, `effect_summary`, `clears_when`, and optional `linked_layer`; they constrain later choices until clears_when is met.
- [ ] Egress is an explicit phase with its own risks; entering egress is a state transition the Narrator can announce.
- [ ] Burn (credential/mask invalidated) reverts the player to overt or alternate action and removes credential-specific affordances.
- [ ] The Narrator packet includes active operation constraints + current scrutiny layers + active complications while access/infiltration is running.
- [ ] The UI surfaces alert/exposure clock, credential/mask status, and egress phase visibly during active access/infiltration.
- [ ] A replay fixture covers: failed credential/mask roll → flagged credential → "leash" or equivalent complication → revised plan → engagement under constraint → alert tick after a stealth/hack/fate fail → egress before full alert.
- [ ] A genre-neutral fixture proves the same runtime shape supports a space-opera credential/mask, grimdark forged writ/ward-pass, and cyberpunk stolen-token intrusion.
- [ ] A dedup fixture proves a forged writ / noble NPC / castle gate scrutiny layer or stolen admin token / user account / firewall scrutiny layer remain distinct but linked.

## Blocked by

- .scratch/sf2-stateful-procedure-layer/issues/00-procedure-kernel-schema-and-role-contracts.md
- .scratch/sf2-stateful-procedure-layer/issues/01-operation-procedure-runtime-mvp.md

## Implementation update - 2026-05-10

> *This was generated by AI during triage.*

Verified built as an access/infiltration packet derivation slice.

- Added `lib/sf2/procedure-access-exploration.ts` with ticket-aligned access posture, credential/mask, scrutiny layer, exposure clock, egress phase, and ambient alertness derivation.
- Review correction: replaced local drift vocab (`permitted`, `blocked`, `valid`, `strained`) with ticket vocabulary (`open`, `masked`, `authorized`, `covert`, `forced`, `remote`, `social`; `clean`, `flagged`, `compromised`, `burned`).
- Runner now asserts `expected.procedureAccessExploration`.
- Verified with `npm run build`, `npm run sf2:replay -- fixtures/sf2/replay/procedure-access-exploration-runtime.json`, and `npm run sf2:replay -- fixtures/sf2/replay/procedure-access-exploration-dedup-boundaries.json`.

## Follow-up - 2026-05-10 playthrough review

This verified the derivation helper, not that live play reliably creates access/infiltration state or feeds the specialized packet into the Narrator as the dominant procedure surface. Ticket 15 covers that activation/consumption gap.
