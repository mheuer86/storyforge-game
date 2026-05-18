Status: implemented
Labels: enhancement, implemented
Type: AFK

# SF2 Narrator core identity

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Restore a stronger Storyforge creative identity to SF2's shared core prompt while preserving SF2's state authority and role boundaries.

Current `SF2_CORE` is mostly an architecture note: typed state is authoritative, bounded packets, role-owned tools. V1's GM prompt gave the model a creative posture: impartial intelligence, world alive enough to push back, not adversary, not cheerleader, not a mechanics narrator.

SF2 should have both.

## Critical Constraint

`SF2_CORE` is shared by multiple roles, not just the Narrator. Do not put Narrator-only tool instructions, prose-length rules, or per-turn behavior into `SF2_CORE`. Keep role-specific rules in role prompts.

## Required Behavior

- `SF2_CORE` gives Storyforge a creative identity, not only an implementation identity.
- It preserves typed state authority and role-owned write boundaries.
- It says the system honors player intelligence and agency.
- It says the world pushes back through coherent consequence, not hidden punishment.
- It keeps hidden information hidden; no telegraphing unseen facts.
- It does not weaken Archivist/Author/Narrator ownership boundaries.

## Surfaces

- `lib/sf2/narrator/prompt/core.ts`
- `lib/system-prompt.ts` as V1 reference
- `lib/sf2/prompt/compose.ts` only to verify cache/dynamic assumptions, not to edit
- prompt-surface fixtures under `fixtures/sf2/replay/`

## Implementation Notes

- Keep the core world-independent and cache-safe.
- Aim for a compact creative brief, not a long manifesto.
- Do not mention a specific genre.
- Do not duplicate detailed roll/fail-forward rules already in Narrator role.
- If there are prompt snapshot fixtures, update them intentionally and explain the behavioral reason.

## Acceptance Criteria

- [x] `SF2_CORE` includes a clear creative Storyforge identity.
- [x] `SF2_CORE` still states typed state and role-owned tools are authoritative.
- [x] No role-specific dynamic content is added to the cached core.
- [x] Rendered prompt fixtures reflect the new identity.
- [x] No existing SF2 replay fixture fails due to prompt composition or dynamic leak assertions.

## Completion Evidence

Completed on 2026-05-18.

- Strengthened `SF2_CORE` with Storyforge creative identity, player agency, hidden-information boundaries, and coherent consequence language.
- Preserved typed state authority and role-owned write boundaries.
- Covered by `fixtures/sf2/replay/narrator-core-identity.json`.

## Fixture Expectations

Add or update a prompt-surface fixture that renders the shared core through a Narrator call.

Suggested fixture name:

```bash
fixtures/sf2/replay/narrator-core-identity.json
```

It should assert presence of:

- creative Storyforge identity
- state authority
- player agency / world pushback

And absence of:

- per-turn dynamic facts
- Narrator-only tool details inside the core

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/narrator-core-identity.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Rewriting full Narrator craft rules.
- Changing Author, Archivist, or Chapter Meaning role prompts beyond what the shared core naturally affects.
- Changing model routing.
