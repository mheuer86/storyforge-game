Status: proposed

# Structural beats into Author role

## Problem

The Author currently learns its chapter's structural job from `chapterFunctionMap` in the arc plan — e.g. "Ch3: the hidden pressure becomes costly to protect." Without the arc plan, the Author needs structural beat awareness baked into its own role.

`lib/sf2/structural-beats.ts` already defines the 7-point-compressed-to-5 beat structure. The function `renderStructuralBeatForChapter` is already called in `buildAuthorSituation` for Ch2+ (line 261). But for Ch1 it's not called — Ch1 gets its beat from the arc plan's `chapterFunctionMap[0]`.

## Change

1. Call `renderStructuralBeatForChapter` for ALL chapters in `buildAuthorSituation`, including Ch1. This already works — the function takes a chapter number and returns the structural beat description.

2. Add a compact structural beat awareness section to the Author role prompt (`buildAuthorRole`). This replaces the arc plan's `chapterFunctionMap` as the Author's source of structural knowledge:

```
## Structural pacing across a campaign

Each chapter carries a structural job. You don't need a pre-planned arc to know this —
the beats are inherent to story structure:

- Ch1 (Hook + Escalation): Establish the pressure, teach the world through conflict,
  end with a complication that commits the PC.
- Ch2 (Rising Action): Deepen what Ch1 established. New allies, new costs, the scope
  of the problem becomes clear.
- Ch3 (Midpoint Reversal): Something the PC believed flips. A trusted source betrays,
  a hidden truth surfaces, the real enemy is revealed, or the PC's own success
  creates the next problem. This is NOT "more of the same but harder."
- Ch4 (Crisis): The consequences of everything prior converge. The PC must choose
  between irreconcilable goods or face the cost of prior choices.
- Ch5 (Resolution): The arc resolves through the PC's accumulated choices. Not every
  thread closes — but the central pressure reaches a landing.

Honor the beat. A Ch3 that just "deepens the conflict" has failed its structural job.
```

3. For Ch2+, the Author already gets `renderStructuralBeatForChapter` output plus chapter-meaning's `transition_seed`. The structural beat tells it what kind of chapter to write; the transition seed tells it what material to work with.

## Files

- `lib/sf2/author/prompt.ts:19-77` — `buildAuthorRole` (add structural beat awareness)
- `lib/sf2/author/prompt.ts:180-193` — `buildAuthorSituation` Ch1 branch (call `renderStructuralBeatForChapter`)
- `lib/sf2/structural-beats.ts` — already exists, already used for Ch2+

## Notes

The Arc Author's `chapterFunctionMap` entries were things like "Ch4: The hidden cost becomes personal" — specific enough to sound authored but vague enough to be ignored. The structural beat descriptions above are more honest about what each chapter's job actually is, and they don't require 10k tokens of LLM planning to produce.
