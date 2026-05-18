Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# Structural beats into Author role

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Move chapter structural-beat awareness into Chapter Author itself so the system no longer needs Arc Author `chapterFunctionMap` to tell Ch3, Ch4, or Ch5 what kind of chapter they are.

`lib/sf2/structural-beats.ts` already owns the compressed five-chapter beat model. `buildAuthorSituation` already renders `renderStructuralBeatForChapter` for Ch2+. This ticket makes that beat contract explicit and universal.

## Required Behavior

- Author role prompt includes compact structural pacing guidance for Ch1-Ch5.
- Ch1 Author situation renders the Ch1 structural beat.
- Ch2+ continues to render the target chapter structural beat.
- Author no longer relies on ArcPlan `chapterFunctionMap` as the only source of chapter purpose.
- The guidance says a structural beat is a job, not a scene mandate.

Suggested role language to adapt:

```text
Each chapter carries a structural job. You do not need a preplanned arc to know it.
Ch1 establishes the pressure and commits the PC.
Ch2 deepens cost and scope.
Ch3 reverses a belief, loyalty, source, or apparent enemy.
Ch4 converges consequences into crisis.
Ch5 lands the central pressure through accumulated choices.
```

## Surfaces

- `lib/sf2/author/prompt.ts`
- `lib/sf2/structural-beats.ts`
- existing prompt-surface replay fixtures
- `fixtures/sf2/replay/`

## Implementation Notes

- Do not duplicate the full `structural-beats.ts` text in multiple places if a renderer can be reused cleanly.
- Avoid adding dynamic chapter-specific content to cached role text. Generic Ch1-Ch5 descriptions can live in the cached role; current target chapter details belong in `buildAuthorSituation`.
- If snapshot fixtures exist for Author prompt surfaces, update them deliberately.

## Acceptance Criteria

- [ ] Author role includes generic five-chapter structural beat awareness.
- [ ] Ch1 Author situation includes Ch1 structural beat guidance.
- [ ] Ch2+ Author situation still includes target chapter structural beat guidance.
- [ ] Existing ArcPlan-backed behavior still works.
- [ ] No prompt text says Arc Author is the only source of chapter structural purpose.

## Fixture Expectations

Add or update prompt/author fixtures that assert:

- Ch1 no-arc situation includes Ch1 beat guidance.
- Ch3 continuation situation includes midpoint/reversal guidance even when no ArcPlan exists.
- ArcPlan-backed fixtures do not lose structural guidance.

Suggested fixture names:

```bash
fixtures/sf2/replay/author-structural-beat-ch1.json
fixtures/sf2/replay/author-structural-beat-ch3-no-arc.json
```

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/author-structural-beat-ch1.json
npm run sf2:replay -- fixtures/sf2/replay/author-structural-beat-ch3-no-arc.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Changing chapter close timing.
- Deleting ArcPlan or Arc Author.
- Rewriting the Author schema.
