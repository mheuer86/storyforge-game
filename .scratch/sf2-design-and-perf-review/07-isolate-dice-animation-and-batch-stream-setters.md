# 07 — Isolate dice animation + batch post-await setters

## What to build

Two streaming-loop perf fixes that share one PR.

### Isolate dice-roll animation

`play-shell.tsx:1879-1896` runs a 22 Hz `setInterval` for ~720ms during a roll, calling `setDisplay` and (sometimes) `setDisplay2`. Each tick re-renders `DiceTray`, which re-renders `NarrativeWithRolls`, which re-renders the live turn block.

Refactor so the ticking faces don't re-render the parent:

- Move `display` / `display2` into refs.
- Render a tiny inner `<DiceFace>` that owns its own state and exposes an imperative handle, OR mounts a self-contained subscriber that the interval pokes via `forceUpdate`.
- Coalesce ticks to `requestAnimationFrame` (45ms manual interval is close to one frame anyway, but rAF gives the browser the right cue).

The reduced-motion branch at `:1881-1885` should remain — short-circuits the animation entirely.

### Batch post-await setters

The send-turn flow at `page.tsx:586-593` and again at `page.tsx:983-984` runs sequential setStates after `await` boundaries. React 18 only auto-batches synchronously; post-await clusters re-render once per setter.

Wrap the relevant clusters in `React.startTransition`. Candidates:

- `page.tsx:586-593` — pre-flight reset before opening the narrator stream.
- `page.tsx:983-984` and surrounding — post-stream cleanup.
- The stream-event handlers inside the SSE reader loop where multiple state slots are updated together (e.g. when `narrate_turn` arrives).

Be careful not to wrap genuinely urgent updates (the streaming prose `setProse` at `:688` / `:815` should stay outside the transition so the user sees text appear without jank).

## Acceptance criteria

- [ ] Rolling a die does not re-render `NarrativeWithRolls` or any sibling turn block (profiler: only the dice face commits).
- [ ] Reduced-motion branch still skips the animation and resolves immediately.
- [ ] Post-await setter clusters in the send-turn flow commit in a single render where possible.
- [ ] No visible regression in streaming feel — prose still appears token-by-token with no perceptible delay added by transitions.
- [ ] Dice still animates smoothly on supported browsers; final value is correct.

## Blocked by

None — can start immediately. Stacks cleanly after #02 and #03 land but doesn't require them.
