# 06 — Long-session render hygiene

## What to build

Two surgical fixes for sessions with many committed turns.

### `content-visibility` on turn blocks

`play-shell.tsx:1275-1289` renders one block per committed turn (scene marker + player message + narrative + roll cards + state diff). After ~30 turns the off-screen ones still cost layout on every parent render.

Add to each turn `<div key={turn.index}>`:

```tsx
style={{ contentVisibility: 'auto', containIntrinsicSize: '320px' }}
```

Pick the intrinsic size to roughly match a typical turn block; a too-small value will cause scroll-jump as blocks paint. Test with a 30+ turn session.

### Throttled scroll-to-bottom

`page.tsx:421-423` runs scroll-to-bottom on every prose token update:

```tsx
useEffect(() => {
  if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
}, [prose, isStreaming])
```

Coalesce to one scroll per animation frame. Either:

- Wrap the assignment in `requestAnimationFrame` and cancel the prior frame on each effect run, or
- Switch the trigger to `isStreaming` rising/falling edges plus a `ResizeObserver` that calls `scrollTo` when the scroll container's content height grows.

Either approach should keep the user pinned to the bottom while not assigning `scrollTop` 30+ times per second.

## Acceptance criteria

- [ ] Each chapter-turn block has `content-visibility: auto` and a tuned `contain-intrinsic-size`.
- [ ] Scrolling past 30 turns no longer drops frames during streaming (profile with the Performance tab; layout cost of off-screen turns ≈ 0).
- [ ] Scroll-to-bottom assignment runs at most once per animation frame during streaming.
- [ ] User remains pinned to the bottom during a streaming turn.
- [ ] No visible jump or flicker on scroll-up to read older turns.

## Blocked by

None — can start immediately.
