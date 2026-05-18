# SF2 V1 narrative regression - remaining gaps

Status: implemented
Source: 2026-05-18 narrative regression review after genre bible fixes, Arc Author pressure-style validation, and Narrator forbidden-manifestation hardening.

## Thesis

SF2 has stronger state architecture than V1, but it lost some of V1's creative posture. V1 gave the GM a vivid identity, genre tone proportions, prose rhythm rules, lived opening knowledge, and a mandate that the world moves without waiting for the player. SF2's Narrator often receives excellent state packets but writes from a more technical identity.

These tickets restore V1's narrative strengths without weakening SF2's role boundaries.

## Global Read Order

1. `CLAUDE.md`
2. `CONTEXT.md`
3. `lib/system-prompt.ts`
4. `lib/genres/*.ts`
5. `lib/sf2/narrator/prompt/core.ts`
6. `lib/sf2/narrator/prompt/role.ts`
7. `lib/sf2/genre-profile/profiles.ts`
8. `lib/sf2/genre-profile/index.ts`
9. `lib/sf2/setup/compile-seed.ts`
10. `lib/sf2/types.ts`
11. Existing prompt-surface fixtures under `fixtures/sf2/replay/`

## Tickets

| # | Title | Type | Status | Blocked by | Notes |
|---|---|---|---|---|---|
| 01 | Hook-specific opening knowledge | AFK | implemented, low priority | None | Narrow pass-through of existing playbook knowledge; do not design new hook lore. |
| 02 | Rewrite compile-seed factionVoiceRules | AFK | implemented | None | Align Author seed voice with fixed genre bibles. |
| 03 | SF2 Narrator core identity | AFK | implemented | None | Restore V1 creative posture while preserving SF2 state authority. |
| 04 | Narrator tone proportions | AFK | implemented | None | Give Narrator the tone mix Author already sees. |
| 05 | Narrator prose philosophy | AFK | implemented | None | Restore silence, density, formatting rhythm, and breath. |
| 06 | The world moves without the player | AFK | implemented | 03 recommended | Restore offscreen agency as observable traces, not hidden-camera prose. |

## Completion Evidence

Completed on 2026-05-18.

- Low-thinking implementation agents built tickets 01-02 and 03-06 in parallel.
- Code review found no blocking implementation issues after integration.
- `npm run sf2:replay -- fixtures/sf2/replay` passed all 254 replay fixtures.
- `npm run build` passed.
- `npm run lint` could not run because `eslint` is not installed in this workspace.

## Shared Implementation Rules

- Preserve SF2 role ownership. Narrator writes prose and mechanical effects only; Archivist owns durable narrative memory.
- Do not copy V1 rules blindly when SF2 already has code-owned equivalents.
- Keep prompt caching discipline intact. Do not put per-turn dynamic content in cached constants.
- Use prompt-surface fixtures or focused replay fixtures for every prompt behavior change.
- Avoid broad prose-style edits that erase genre distinction.
- If a ticket touches `SF2_CORE`, remember it is shared by multiple SF2 roles, not Narrator-only.

## Recommended Verification

Use focused prompt/replay fixtures first, then the full suite when the prompt surface changes:

```bash
npm run sf2:replay -- fixtures/sf2/replay/<new-focused-fixture>.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

For prompt-only work, include at least one fixture/snapshot that proves the rendered prompt contains the restored guidance and does not contain stale or contradictory guidance.

## Relationship To Other Tracks

`sf2-narrative-quality-pass/` mostly addressed Author pressure, human stakes, and procedure drift. This track addresses Narrator identity, tone, prose rhythm, and setup seed voice.

`sf2-kill-arc-author/` removes the largest upstream source of procedural poison. This track restores the downstream prose posture so the no-arc pipeline has a stronger Narrator.
