# Wire Public Play Route To SF2

Status: implemented
Type: AFK

## What to build

Make `/play` use the SF2 runtime so Storyforge's public play path is the V2 game, not the legacy V1 game.

This is the migration boundary after the SF2 setup compiler lands. The route flip should be boring for players: landing-page links still go to `/play`, BYOK/demo access still works, campaign creation uses the SF2 setup flow, gameplay uses the SF2 Narrator/Archivist/Author runtime, and `/play/v2` remains available as a temporary compatibility/dev alias during rollout.

## Blocked by

- `12-sf2-setup-compiler-for-v1-hooks-and-playbooks.md`

Recommended after, but not strictly blocked by:

- `11-social-roll-modifier-advisories.md`

## Why this should wait for Ticket 12

Current `/play/v2` still starts from the small SF2 seed dropdown. Flipping `/play` before the setup compiler would make the public migration feel narrower than V1 because the full genre/origin/playbook/hook setup surface would disappear.

After Ticket 12, `/play` can move to SF2 without losing the core player-facing setup breadth.

## Current route state

Current public route:

- `app/play/page.tsx`
- wraps the app in `PassphraseGate` and `DemoBudgetGate`
- uses V1 setup components:
  - `components/setup/world-setup.tsx`
  - `components/setup/character-setup.tsx`
  - `components/setup/campaign-select.tsx`
- uses V1 runtime:
  - `components/game/game-screen.tsx`
  - `lib/game-data.ts`
  - `/api/game`

Current SF2 route:

- `app/play/v2/page.tsx`
- uses SF2 IndexedDB persistence and `sf2_last_campaign_id`
- calls `/api/sf2/narrator`, `/api/sf2/archivist`, `/api/sf2/arc-author`, `/api/sf2/author`, and `/api/sf2/chapter-meaning`
- uses `components/sf2/play-shell.tsx`
- currently does not carry the same public route shell/gates as `/play`

Current links:

- landing page CTA links already point to `/play` and `/play?byok=1`
- chronicles and diagnostics links point to `/play`

## Suggested implementation shape

Extract the SF2 play app from `app/play/v2/page.tsx` into a reusable client component, for example:

- `components/sf2/play-app.tsx`

Then make routes thin:

- `app/play/page.tsx` renders the SF2 app inside `PassphraseGate` and `DemoBudgetGate`
- `app/play/v2/page.tsx` renders the same SF2 app as an alias, ideally with the same gates unless there is an explicit local-dev reason not to
- move the legacy V1 `/play` page to a clearly named route such as `app/play/v1/page.tsx` or `app/play/legacy/page.tsx` for rollback/manual comparison

Avoid duplicating the full SF2 page logic between routes. After migration, there should be one SF2 play app implementation and thin route wrappers.

## Refinement notes from code inspection

Current concrete surfaces:

- `app/play/page.tsx` is the current V1 client route and owns public gates: `PassphraseGate` and `DemoBudgetGate`.
- `app/play/v2/page.tsx` is the SF2 client app. It is currently ungated and contains all SF2 setup/runtime logic inline.
- SF2 API routes already read the BYOK key through `apiHeaders()` / `x-anthropic-key`, and `PassphraseGate` switches to BYOK mode when `?byok=1` is present. Preserving the gate wrapper is enough for `/play?byok=1`.
- SF2 persistence uses `lib/sf2/persistence/indexeddb.ts` and `sf2_last_campaign_id`; it is independent of V1 `storyforge_gamestate` / manual save slots.
- The requested exception route should be `app/play/v1/page.tsx` so legacy play is explicit and discoverable.

Recommended implementation details:

- Extract the entire current default export logic from `app/play/v2/page.tsx` into a client component such as `components/sf2/play-app.tsx`.
- Keep `components/sf2/play-app.tsx` as the sole owner of SF2 runtime state, persistence, setup, Author/Narrator/Archivist calls, diagnostics, and export behavior.
- Replace `app/play/v2/page.tsx` with a thin alias route that renders the extracted SF2 app.
- Move the current V1 route body from `app/play/page.tsx` to `app/play/v1/page.tsx`, preserving the V1 gates and V1 imports there.
- Replace `app/play/page.tsx` with public gates around the SF2 app:
  - `PassphraseGate`
  - `DemoBudgetGate`
  - `Sf2PlayApp`
- Do not redirect `/play/v2` during this ticket. Rendering the same component keeps smoke testing simpler and avoids query-string edge cases.
- Do not delete V1 runtime code or V1 localStorage save logic.

Verification details:

- Browser smoke must cover `/play` after Ticket 12 lands:
  - `/play?byok=1` shows the BYOK path from `PassphraseGate`.
  - `/play` opens the SF2 setup compiler UI, not V1 `WorldSetup`.
  - creating a campaign hits Arc Author before Chapter Author before Narrator.
  - reload of `/play` loads `sf2_last_campaign_id`.
  - `/play/v2` renders the same SF2 app.
  - `/play/v1` renders the legacy V1 setup/save flow.
- If model calls are not possible during smoke, still verify route/component wiring, setup selections, IndexedDB/localStorage keys, and visible app identity.

## Public route requirements

- `/play` opens the SF2 setup/play experience.
- `/play?byok=1` still opens the BYOK access-key path.
- Demo access and monthly demo budget behavior are preserved.
- Existing SF2 saves in IndexedDB continue to load through `/play`.
- New campaigns created on `/play` persist through SF2 persistence, not V1 `storyforge_gamestate`.
- `/play/v2` remains usable as an alias during this migration phase.
- Legacy V1 play remains reachable at a non-primary route for rollback/comparison, unless explicitly removed in a later cleanup ticket.

## Save and persistence requirements

- Do not try to migrate V1 localStorage saves to SF2 in this ticket.
- Do not delete V1 localStorage keys or V1 manual save slots.
- If a V1 save exists, it may remain accessible only through the legacy route.
- SF2 uses `lib/sf2/persistence/indexeddb.ts` and `sf2_last_campaign_id`; keep that behavior.
- If any public UI references "auto-save" or "save slots" inherited from V1, make sure it reflects SF2 persistence reality.

## Required behavior to preserve

- SF2 startup flow remains: setup selection -> create initial SF2 state -> Arc Author -> Chapter Author -> Narrator opening.
- SF2 roll pause/resume, diagnostics, replay/session export, and chapter transition behavior continue working.
- Existing `/api/sf2/*` endpoints are not renamed.
- Existing `/play/v2` browser smoke path still works, even if it becomes an alias.
- Landing-page links do not need to change if `/play` is now SF2.
- V1 code is not deleted in this ticket.

## Non-goals

- Do not remove the V1 runtime.
- Do not migrate V1 saves to SF2.
- Do not redesign the setup UI beyond what Ticket 12 already introduced.
- Do not add new prompt behavior.
- Do not restore witness marks, passive perception, failed-investigation machinery, or pacing-pressure systems.
- Do not change SF2 API contracts except route wrapper plumbing.

## Acceptance criteria

- [x] `/play` renders the SF2 play app.
- [x] `/play?byok=1` still starts in BYOK mode.
- [x] `/play/v2` still renders the same SF2 play app or redirects/aliases to `/play` without breaking smoke tests.
- [x] Legacy V1 play is still reachable at a clearly named non-primary route, or the ticket explicitly documents why it was not kept.
- [x] The SF2 play app logic is not duplicated wholesale between `/play` and `/play/v2`.
- [x] New SF2 campaigns created from `/play` persist and reload through SF2 IndexedDB persistence.
- [x] Existing SF2 campaigns previously created on `/play/v2` can still be loaded from `/play`.
- [x] Landing-page CTA links work without changes or are updated if necessary.
- [x] Browser smoke covers `/play`, not only `/play/v2`.
- [x] `npm run build` passes.

## Verification

Run:

```bash
npm run build
```

Browser smoke on `/play`:

- open `/play?byok=1` and verify BYOK mode still appears
- open `/play` with access available and create a new SF2 campaign
- run Arc Author + Chapter Author
- run the opening Narrator turn
- play at least one committed turn
- resolve one roll pause if the opening produces one
- reload `/play` and confirm the SF2 campaign reloads
- verify diagnostics and replay/session copy exports still work

Also check:

- `/play/v2` still opens the SF2 app or redirects cleanly
- the legacy route opens the V1 game if it was retained

If browser smoke cannot be run, state exactly which route/build checks ran and what remains unverified.

## Notes for agent

This ticket is intentionally route/plumbing heavy. The dangerous part is not code volume; it is accidentally losing public access gating, BYOK behavior, or save loading while flipping the primary route. Keep the runtime behavior boring.

## Implementation note

Implemented on 2026-05-16 by extracting the SF2 app to `components/sf2/play-app.tsx`, making `/play` the gated SF2 public route, keeping `/play/v2` as an SF2 alias, and preserving legacy V1 at `/play/v1`. The SF2 diagnostics "Back to v1" link now points to `/play/v1`.
