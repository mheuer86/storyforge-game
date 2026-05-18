Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# The world moves without the player

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Restore V1's living-world pressure principle in SF2 Narrator craft: NPCs and factions pursue agendas offscreen, threads can worsen without the player engaging them, and deferred promises/obligations surface through observable play.

This should make the world feel alive without violating SF2's hidden-information and role-ownership rules.

## Required Behavior

- Narrator role includes a world-motion principle.
- Offscreen motion must appear through observable traces the PC can perceive now: a message, absence, changed object state, rumor, visible consequence, later NPC response, or a scene arrival.
- The Narrator must not reveal hidden offscreen thoughts, plans, or facts via hidden-camera prose.
- The Narrator may narrate pressure cues; Archivist records durable thread/faction/NPC changes after the prose.
- The principle should mention at chapter scale, not demand a dramatic world move every turn.
- It should complement existing pressure runtime and fail-forward mechanics, not replace them.

## Surfaces

- `lib/sf2/narrator/prompt/role.ts`
- `lib/system-prompt.ts` as V1 reference
- `lib/sf2/pressure/runtime.ts` for context, likely no edit
- `lib/sf2/retrieval/scene-packet.ts` for existing thread/faction pressure context, likely no edit
- prompt-surface fixtures under `fixtures/sf2/replay/`

## Implementation Notes

- This is a prompt/craft restoration slice. Do not add code-owned thread worsening unless a fixture proves prompt-only guidance cannot be measured.
- Keep the hidden-camera ban stronger than the world-motion rule.
- Good examples: a contact goes dark, a third party warns the PC, a faction's proxy appears, an owed promise is mentioned by an NPC.
- Bad examples: "unseen, Tael decides to file..." or "elsewhere, the buyer realizes..."
- Do not force pressure when the scene needs aftermath or quiet recovery.

## Acceptance Criteria

- [ ] Narrator role includes a world-motion principle adapted to SF2.
- [ ] The principle explicitly requires observable traces instead of hidden-camera narration.
- [ ] The principle does not grant Narrator durable state-write ownership.
- [ ] Prompt fixture confirms the new guidance renders.
- [ ] Existing replay suite passes.

## Fixture Expectations

Add or update a prompt fixture, and if a suitable replay helper exists, add a scene-packet fixture showing dormant/offscreen pressure context.

Suggested fixture name:

```bash
fixtures/sf2/replay/narrator-world-motion-principle.json
```

It should assert:

- rendered role includes offscreen agency/world motion
- rendered role includes observable-trace guard
- hidden-camera ban remains present

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/narrator-world-motion-principle.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

- Recommended after `03-narrator-core-identity.md`, but not technically blocked.

## Out Of Scope

- Adding deterministic offscreen pressure engines.
- Changing Archivist schema.
- Forcing every turn to include offscreen motion.
