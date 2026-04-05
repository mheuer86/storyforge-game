# CLAUDE.md

## Project Overview

Storyforge is an AI-powered text RPG game where Claude acts as Game Master, driving branching storylines with D&D 5e-style mechanics. Built with Next.js (App Router) and TypeScript, it features multiple genres (space-opera, fantasy, cyberpunk, grimdark, noire), streaming AI responses with tool-use, character progression, NPC relationships, and inventory management.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm start         # Start production server
npm run lint      # Run ESLint (Next.js defaults)
```

No test framework is configured.

## Architecture

- **`app/`** - Next.js App Router: pages and API routes
  - `api/auth/route.ts` - Session validation with HMAC-SHA256 signed cookies
  - `api/game/route.ts` - Claude streaming + tool-use loop (maxDuration: 90s)
  - `play/page.tsx` - Main game page (client component)
- **`components/`** - React components
  - `game/` - Game UI (game-screen, action-bar, chat-message, dice-roll-modal)
  - `setup/` - Onboarding flow (genre select, character creation, campaign load)
  - `ui/` - shadcn/ui primitives (30+ components)
- **`lib/`** - Core business logic
  - `types.ts` - All TypeScript interfaces for game state
  - `system-prompt.ts` - Claude system prompts
  - `tools.ts` - Anthropic tool definitions for game state mutations
  - `tool-processor.ts` - Applies tool results to game state
  - `genre-config.ts` - Genre definitions (species, classes, traits, theming)
  - `game-data.ts` - localStorage persistence and save/load logic
- **`hooks/`** - Custom React hooks (toast, mobile detection)

## Key Patterns

- **AI integration**: Request -> `/api/game` -> Anthropic SDK -> streaming newline-delimited JSON events. Claude calls tools to mutate game state; when `request_roll` is called, the stream pauses for user dice interaction.
- **State management**: All game state in localStorage (`storyforge_gamestate`). Three manual save slots + auto-save.
- **Genre theming**: CSS variables switch via `[data-genre="..."]` attribute on the root element. Fonts and color palettes change per genre.
- **Tool definitions** use `type: 'object' as const` for Anthropic SDK compatibility.

## Code Style

- **Files**: kebab-case (`game-screen.tsx`)
- **Components/interfaces**: PascalCase (`GameScreen`, `CharacterSetup`)
- **Variables/functions**: camelCase (`gameState`, `handleContinue`)
- **Constants**: CONSTANT_CASE (`STORAGE_KEY`, `RETRY_DELAY_MS`)
- **IDs/keys**: snake_case (`pulse_pistol`, `spirit_wolf`)
- **Styling**: Tailwind CSS utility classes only; use `cn()` from `lib/utils` for conditional classes
- **React**: Functional components with hooks; `'use client'` directive for interactive components
- **TypeScript**: Strict mode enabled; use explicit types and `export type` for type-only exports

## Tech Stack

Next.js 16, React 19, TypeScript 5.7, Tailwind CSS 4, shadcn/ui (Radix), @anthropic-ai/sdk, React Hook Form + Zod, OKLch color space
