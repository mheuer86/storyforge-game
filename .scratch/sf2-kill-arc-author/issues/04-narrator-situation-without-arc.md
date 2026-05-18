Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: AFK

# Narrator situation without arc context

## Parent

`.scratch/sf2-kill-arc-author/README.md`

## What to build

Verify and harden the Narrator's prompt/packet path when no `campaign.arcPlan` exists. The Narrator should be driven by chapter setup, scene packet, current pressure, and pacing contract rather than Arc context.

The current arc block in `lib/sf2/narrator/prompt/situation.ts` is already conditional. This ticket makes the no-arc path intentionally covered and ensures the lost arc-question/chapter-function signal is replaced by existing chapter fields.

## Required Behavior

- No-arc Narrator situation renders without empty or invalid arc placeholders.
- Chapter frame, chapter objective, central tension, active pressure, and `pacing_contract.chapterQuestion` remain prominent.
- Retrieval chapter packet works when `chapter.arc` is undefined.
- If no-arc mode loses a useful "what this chapter tests" sentence, surface `pacing_contract.chapterQuestion` more clearly before adding a new schema field.
- No Narrator instructions should tell the model to recover an ArcPlan or invent arc metadata.

## Surfaces

- `lib/sf2/narrator/prompt/situation.ts`
- `lib/sf2/retrieval/packets/chapter.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/narrator/messages.ts`
- `fixtures/sf2/replay/`

## Implementation Notes

- Prefer fixture coverage over prompt churn. If the no-arc situation already renders correctly, keep the code change minimal.
- Do not add a new `chapter_dramatic_thesis` field unless existing `pacing_contract.chapterQuestion` is insufficient in fixtures.
- Do not remove arc rendering for old saves; keep it conditional.

## Acceptance Criteria

- [ ] Narrator situation renders cleanly with no `campaign.arcPlan`.
- [ ] Chapter packet renders cleanly with no arc block.
- [ ] No-arc Narrator situation includes enough chapter-level purpose to replace arc question/chapter function.
- [ ] Old ArcPlan-backed narrator situation still renders its arc context.
- [ ] No prompt text says an arc plan is required for narration.

## Fixture Expectations

Add or update a no-arc narrator prompt/scene-packet fixture.

Suggested fixture name:

```bash
fixtures/sf2/replay/narrator-situation-no-arc.json
```

It should assert:

- no `campaign.arcPlan`
- no "missing arc" text in rendered situation or packet
- chapter question/objective/central tension are present
- suggested actions and roll discipline remain unaffected

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/narrator-situation-no-arc.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

- `01-author-hook-direct-ch1.md`

## Out Of Scope

- Deleting arc packet support for old saves.
- Rewriting Narrator role prompt.
- Changing streaming event shape.
