# 18 - Wire Validated Chapter Close To Handover Flow
Status: ready Type: AFK Area: SF2 prose-first prototype / chapter close / handover

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

Use validated prose-first chapter-loop metadata to close or reframe chapters instead of leaving chapter transition entirely manual.

When the controller accepts a turn as `closed` or `reframed`, the prototype should transition through the existing handover compiler and continue from the new chapter handover. The player-facing experience should feel like a literary chapter close, not a system interruption.

Use the hybrid policy:

- Hard-boundary `closed` / `reframed` turns can advance automatically after the final narrator prose lands.
- Soft `close_candidate` turns do not compile handover automatically. They expose a player-confirmed close affordance or suggested action.
- Active-scene deferrals never close immediately; they steer to the nearest clean boundary.

## Acceptance criteria

- [ ] The app distinguishes `close_candidate`, `closed`, and `reframed`.
- [ ] `close_candidate` does not automatically compile handover; it only informs suggested actions, diagnostics, or a UI affordance.
- [ ] `closed` / `reframed` after controller validation can trigger the handover compiler.
- [ ] Automatic close only fires for hard-boundary validated `closed` / `reframed` turns, not for ordinary soft close pressure.
- [ ] Soft close candidates expose a player-confirmed close affordance, such as "Close chapter after this beat" or an equivalent suggested action.
- [ ] The final chapter-close narrator prose remains visible before any handover/continuation work starts.
- [ ] If handover compilation fails or times out, the existing fallback handover path is used.
- [ ] Chapter number, system prompt label, transcript chapter stamps, and continuation session state update coherently.
- [ ] The transition preserves existing save/export behavior.
- [ ] The hybrid UX policy is documented in diagnostics or developer docs before implementation is marked done.

## Blocked by

- `17-prose-first-controller-repair.md`

## UX Policy

Use hybrid close:

- Automatic for validated hard-boundary closes.
- Player-confirmed for soft close candidates.
- No close during active NPC/revelation/negotiation scenes.
