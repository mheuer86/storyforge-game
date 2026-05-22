Status: ready-for-agent

# 11 — Move mechanical snapshot below cache prefix in prose-first narrator

## Problem

The prose-first narrator path places the mechanical snapshot in `system[1]` without a cache marker. Because Anthropic's prompt caching is prefix-based (system → tools → messages), the mutable snapshot breaks the cache prefix after `system[0]`, forcing everything downstream — tools (~1-2K tokens) and the entire transcript (~growing) — to be re-written to cache every turn, even though tools are bytewise-identical and most of the transcript hasn't changed.

Observed per-call stats on a typical mid-game turn:
- Cache Read: ~10K tokens (brief + protocol in `system[0]`)
- Cache Write: ~11K tokens (snapshot + tools + transcript re-cached)
- Input: ~24 tokens (current player input)

The brief cache is working. But ~11K of write per turn is wasteful when only ~500 tokens (the snapshot) actually changed.

## Root cause

In `buildProseFirstNarratorMessages` (messages.ts ~line 164):

```ts
const system: Anthropic.TextBlockParam[] = [
  asCacheableTextBlock(stablePrefix),   // system[0] — brief + protocol, cache_control: ephemeral
  {
    type: 'text' as const,
    text: mechanicalSnapshotText,       // system[1] — HP, inventory, turn count — MUTABLE, NO cache marker
  },
]
```

Serialization order: system[0] → system[1] → tools → messages. The prefix hits cache at system[0], then diverges at system[1] because the snapshot changes every turn. Everything after that (tools + transcript) gets re-written.

## Desired cache behaviour

After the fix:
- Cache Read: ~10K (brief) + ~1-2K (tools) + transcript up to previous breakpoint = growing read
- Cache Write: only the new transcript entry + snapshot + player input
- Input: current player input

## Implementation

### 1. Remove snapshot from system blocks

In `buildProseFirstNarratorMessages`, change the system array to only contain the stable brief:

```ts
const system: Anthropic.TextBlockParam[] = [
  asCacheableTextBlock(stablePrefix),
]
```

### 2. Prepend snapshot to the current-turn user message

Append the mechanical snapshot to the final user message in the messages array, where it sits after all cache breakpoints and changes freely without invalidating anything upstream:

```ts
const snapshotPrefix = `<mechanical-snapshot>\n${mechanicalSnapshotText}\n</mechanical-snapshot>\n\n`
const currentInput = input.playerInput.trim()
messages.push({
  role: 'user',
  content: snapshotPrefix + (currentInput || 'Begin from the private campaign brief...'),
})
```

This keeps the snapshot at "user message" priority rather than "system" priority. The narrator protocol already instructs the model to use the mechanical snapshot for state — it doesn't need system-level priority to be respected.

### 3. Verify cache breakpoint budget

After this change, the breakpoints in order are:
1. system[0]: brief + protocol → `cache_control: ephemeral`
2. tools[last]: narrator tools → `cache_control: ephemeral`
3. messages[last transcript]: last prior turn → `cache_control: ephemeral`
4. messages[current]: snapshot + player input → no marker (final content)

That's 3 breakpoints. Anthropic allows 4 max per request, so we're within budget.

### 4. Update the roll-resume path

Check `buildRollResumeMessages` and the roll-resume branch in `buildNarratorTurnContext` (turn-context.ts ~line 161-180). If the prose-first roll-resume also builds system blocks with a snapshot, apply the same move there.

### 5. Update the `Sf2ProseFirstNarratorMessages` return type

The `mechanicalSnapshotText` field on `Sf2ProseFirstNarratorMessages` is currently returned for diagnostics. Keep returning it, but note that it's now embedded in messages rather than system.

## Files to change

- `lib/sf2/narrator/messages.ts` — `buildProseFirstNarratorMessages`: move snapshot from system to final user message
- `lib/sf2/narrator/turn-context.ts` — verify roll-resume path doesn't re-introduce the issue

## Risks

- The mechanical snapshot drops from system priority to user-message priority. The narrator protocol is already in system[0] and instructs the model to respect the snapshot, so this should be fine. If the narrator starts ignoring snapshot data (e.g. wrong HP in prose), that's a regression to watch for.
- The snapshot is now visible in the messages array alongside the transcript. Ensure it doesn't leak into the transcript entries that get passed back on subsequent turns (it shouldn't — it's appended to the final user message, not to a transcript turn).

## Verification

- Run a multi-turn prototype session (3+ turns)
- Check the Anthropic usage stats on each narrator call
- Cache Read should grow each turn (brief + tools + growing transcript prefix)
- Cache Write should stay small (roughly: new transcript entry + snapshot + player input)
- Narrator quality should be unchanged — snapshot data (HP, inventory, clocks) still reflected in prose
