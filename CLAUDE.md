# CLAUDE.md

## Project Overview

Storyforge is a solo text RPG where Claude acts as Game Master. Players create a character (genre, species/origin, class), and Claude drives branching storylines with D&D 5e-inspired mechanics. Built with Next.js (App Router) and TypeScript.

Five genres: space-opera, fantasy, cyberpunk, grimdark, noire. Each has unique species/origins, classes, themes, opening hooks, and prompt flavor.

For product vision, current project state, the V1/SF2 distinction, and the project knowledge map, read `CONTEXT.md`.

## Commands

```bash
npm run dev       # Start development server (localhost:3000)
npm run build     # Production build
npm run lint      # ESLint
```

No test framework. Deploy with `npx vercel --prod --yes` (GitHub integration doesn't persist).

## Architecture

### App Layer
- `app/api/game/route.ts` — Claude streaming + tool-use loop. Newline-delimited JSON events. Handles roll pauses, retries, close sequences, audit calls.
- `app/api/auth/route.ts` — Session validation with HMAC-SHA256 signed cookies
- `app/play/page.tsx` — Main game page (client component)

### Components
- `components/game/game-screen.tsx` — Central game loop: message streaming, roll handling, state updates, quick actions. The largest component.
- `components/game/burger-menu.tsx` — Side panel with tabs: Character, World (sub-tabs: Locations/People/Narrative), Intel, Ship, Chapters. Displays all game state.
- `components/game/dice-roll-modal.tsx` — Interactive dice modal. Supports d6/d8/d10/d12/d20 with rollType-aware headlines.
- `components/game/roll-badge.tsx` — Inline roll results in chat. Damage/healing variants.
- `components/setup/` — Onboarding: genre select, character creation, campaign load
- `components/ui/` — shadcn/ui primitives

### Lib (Core Logic)
- `lib/types.ts` — All TypeScript interfaces for game state
- `lib/system-prompt.ts` — Modular prompt system + compressed game state + initial message builder
- `lib/tools.ts` — Anthropic tool definitions (20+ tools for game state mutations)
- `lib/tool-processor.ts` — Applies tool results to game state, generates stat change chips
- `lib/genre-config.ts` — Genre definitions: species (with lore), classes (with traits), opening hooks (with titles), themes, prompt sections. ~1700 lines, pure data.
- `lib/game-data.ts` — localStorage persistence, save/load, migrations

## Key Patterns

### Prompt Architecture (Modular)
The system prompt is assembled from layers, not a monolith:
- **Core layer** (~1800 tokens) — GM identity, universal rules, hidden systems. Always loads.
- **Situation module** (~400-500 tokens) — One of five: Tutorial, Planning, Combat, Infiltration, Social. Selected based on game context.
- **Investigation overlay** — Always loads, appends to any module except combat.
- **Compressed game state** — Every turn, full game state is compressed into a ~500-800 token block (PC stats, inventory, location, NPCs, threads, promises, decisions, clocks, etc.)
- **Adaptive history window** — ~4000 tokens of recent messages, trimmed to fit.

Specialized prompts (separate API calls):
- **Audit prompt** (Haiku) — 14 checks, fires every ~5 player turns. Silent quality control.
- **Close prompt** (Sonnet) — 6-step atomic close sequence at chapter end.

### Opening Hooks & Titles
107 hooks across 5 genres (3 per class + 4 universal per genre). Each hook has a title used as the Chapter 1 header. Selection: 70% class-specific, 30% universal. Hook + title are selected server-side in `buildInitialMessage` before Claude sees anything.

### Origin Lore
Each species/origin has structured lore with three mechanical layers:
1. Starting contact at an explicit disposition tier
2. Advantage on specific check types
3. Vulnerability (disadvantage or social cost)
Lore is injected as an `ORIGIN:` line in compressed state every turn.

### State Management
All game state in localStorage (`storyforge_gamestate`). Three manual save slots + auto-save mirroring. State structure: `GameState { meta, character, world, combat, history, chapterFrame }`.

### AI Integration
Request -> `/api/game` -> Anthropic SDK -> streaming NDJSON events. Types: `text`, `tools`, `roll_prompt`, `chapter_title`, `retrying`, `done`, `error`. When `request_roll` is called, the stream pauses for user dice interaction, then resumes with the roll result.

### Genre Theming
CSS variables switch via `[data-genre="..."]` attribute. Each genre defines full OKLch color palettes, fonts, background effects, and glow styles.

## Game Systems

### World State Systems
- **NPCs**: name, description, role (crew/contact/npc), disposition tier (hidden), voice note, combat tier
- **Threads**: narrative plot lines with deterioration tracking
- **Promises**: player commitments with status lifecycle (open → strained → fulfilled/broken)
- **Decisions**: non-operational player choices (moral/tactical/strategic/relational) with auto-recording, 8-cap, auto-archive
- **Tension Clocks**: 4 or 6 segment clocks that trigger effects when filled
- **Timers**: hard calendar deadlines
- **Heat**: per-faction exposure tracking
- **Ledger**: financial transaction history with 3-layer dedup
- **Operation State**: multi-phase tactical plans (planning → active → extraction → complete)
- **Exploration State**: spatial tracking for facilities/dungeons
- **Notebook/Evidence**: clue tracking with tiered connections (lead → breakthrough)
- **Crew Cohesion**: 1-5 scale affecting crew roll advantages

### Combat
d20 skill checks for attacks, variable-sided dice for damage/healing. Enemy damage auto-resolved via `rollBreakdown`. Spatial tracking with positions and exits. Combat abilities on NPCs.

### Chapter System
Chapters close via `signal_close_ready` → dedicated close prompt → 6-step atomic sequence (wrap narrative, level up, award proficiencies, generate debrief, set next frame, transition).

## Code Style

- **Files**: kebab-case (`game-screen.tsx`)
- **Components/interfaces**: PascalCase (`GameScreen`, `CharacterState`)
- **Variables/functions**: camelCase (`gameState`, `handleContinue`)
- **Constants**: CONSTANT_CASE (`STORAGE_KEY`, `RETRY_DELAY_MS`)
- **IDs/keys**: snake_case (`pulse_pistol`, `spirit_wolf`)
- **Styling**: Tailwind CSS utility classes; `cn()` from `lib/utils` for conditional classes
- **React**: Functional components with hooks; `'use client'` for interactive components
- **TypeScript**: Strict mode; explicit types; `export type` for type-only exports
- **Tool definitions**: use `type: 'object' as const` for Anthropic SDK compatibility

## Tech Stack

Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui (Radix), @anthropic-ai/sdk, React Hook Form + Zod, OKLch color space

## Deploy

`npx vercel --prod --yes` from project root. Production URL: storyforge-flame.vercel.app
