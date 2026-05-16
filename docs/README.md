# Storyforge Documentation

Root docs describe the current SF2 game that runs at `/play`.

The old V1-oriented root docs were preserved under `docs/v1/`. Use those only when working on `/play/v1`, `app/api/game/route.ts`, `components/game/*`, or V1 save migration behavior.

## Current Docs

| Doc | Use it for |
|---|---|
| `architecture.md` | Current SF2 route map, role pipeline, state flow, persistence, and UI shell |
| `storyforge-2-design.md` | Shipped SF2 design thesis and role ownership model |
| `game-systems.md` | Game systems as experienced by the player and represented in state |
| `rules-engine.md` | Code-owned rules: pressure, roll gates, validation, sentinels, replay fixtures |
| `prompt-composition.md` | Prompt/cache composition for Narrator, Archivist, Author, and chapter roles |
| `tool-reference.md` | SF2 role tool surfaces and what each model is allowed to emit |
| `genre-config-system.md` | Shared genre config, SF2 setup selection, and Author seed compilation |
| `genres.md` | Current genre catalogue and genre-specific system surfaces |
| `srd.md` | Player-facing system reference for mechanics and campaign play |
| `byok-security.md` | Access gate, BYOK header flow, local key storage, and CSP |

## Route Split

| Route | Engine | Notes |
|---|---|---|
| `/play` | SF2 | Primary play path. Uses `Sf2PlayApp` and `/api/sf2/*`. |
| `/play/v2` | SF2 | Alias retained for older links and A/B-era references. |
| `/play/v1` | V1 | Legacy client for existing V1 localStorage saves. |

## Working Rule

Current behavior lives in code first. When docs and code disagree, update the docs or record the inconsistency in `.scratch/sf2-docs-pass-notes.md` before changing behavior.
