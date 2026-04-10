# BYOK Security Model

Storyforge supports two modes: **demo** (server-side API key, access code protected) and **BYOK** (Bring Your Own Key, player provides their own Anthropic API key). This document explains how BYOK keys are handled, how demo budget enforcement works, and what protections are in place.

## Demo budget & BYOK enforcement

Demo mode has a client-side monthly token budget of **2M tokens** per browser (`DEMO_MONTHLY_BUDGET` in `lib/api-key.ts`). Token usage is tracked in localStorage (`storyforge_demo_usage`) and resets on the 1st of each month (keyed by `YYYY-MM`).

When the budget is exhausted, players are prompted to enter their own API key at three points:

1. **Before setup** (`DemoBudgetGate`): if budget is already exhausted when arriving at `/play`, a full-screen form blocks access until a key is entered. Players never go through character creation only to be blocked.
2. **Mid-game** (`game-screen.tsx`): if budget runs out during play, a modal dialog with key entry replaces the inline error. The game state is preserved; entering a key lets the player continue immediately.
3. **API errors**: if the demo key's Anthropic account runs dry (credit/balance/billing errors), the same modal dialog appears for demo users.

The budget is approximate — it tracks tokens seen in API responses, not the actual Anthropic billing. It's a guardrail, not an accounting system.

## How the key flows

1. Player enters their `sk-ant-...` key in the passphrase gate (`?byok=1`), the demo budget gate, the in-game budget dialog, or the burger menu settings
2. Key is stored in the browser's `localStorage` under `storyforge_api_key`
3. On each game request, the key is sent as an `x-anthropic-key` header to `/api/game`
4. The server creates a one-time `Anthropic()` client with the player's key and forwards the request
5. The key is never persisted server-side, never logged, never sent to any third party

```
Browser (localStorage) ──x-anthropic-key──> /api/game ──apiKey──> Anthropic API
                                              │
                                         not stored
                                         not logged
```

## Protections in place

### Content Security Policy (middleware.ts)

The CSP header locks down what the browser can do:

- `connect-src 'self'` — the browser can only make requests to the Storyforge origin. A malicious script or browser extension cannot exfiltrate the key to a third-party domain.
- `frame-ancestors 'none'` — prevents the page from being embedded in an iframe (clickjacking).
- `script-src 'self' 'unsafe-inline'` — only scripts from the same origin can execute. `unsafe-inline` is required for Next.js hydration.

### What CSP does NOT protect against

- A compromised browser or OS-level malware can still read localStorage directly. CSP operates at the network/document level, not at the process level.
- `unsafe-inline` means an attacker who achieves HTML injection could run inline script. However, `connect-src 'self'` still prevents that script from sending data anywhere.

### Additional headers

- `X-Frame-Options: DENY` — redundant with `frame-ancestors 'none'`, covers older browsers
- `X-Content-Type-Options: nosniff` — prevents MIME-type confusion attacks
- `Referrer-Policy: strict-origin-when-cross-origin` — doesn't leak URL paths cross-origin
- `Permissions-Policy` — disables camera, microphone, geolocation

## localStorage vs sessionStorage

The key is stored in `localStorage` (persists across browser sessions) rather than `sessionStorage` (cleared on tab close). This is a deliberate tradeoff: players shouldn't have to re-enter their key every time they open the game. The risk is that the key persists on disk until explicitly cleared.

Players can remove their key at any time from the in-game menu (burger menu > settings) or by running `localStorage.removeItem('storyforge_api_key')` in the browser console.

## Server-side handling

In `/api/game/route.ts`, the BYOK key is read from the request header and used to create an Anthropic client for that single request. Key details:

- The key is never written to any persistent store (no database, no file, no cache)
- The key is never included in error responses sent back to the client
- The key is never logged (no `console.log` of request headers)
- The server does not validate the key before use; if it's invalid, the Anthropic API returns an auth error which is forwarded as a game error

## Self-hosting

Players who don't want their key to transit any server can run Storyforge locally:

```bash
git clone https://github.com/mheuer86/storyforge-game
cd storyforge-game
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
npm install && npm run dev
```

In this mode, the key stays in `.env.local` and the server uses it directly. No BYOK header is involved.
