Status: implemented
Labels: enhancement, implemented
Type: AFK

# Narrator prose philosophy

## Parent

`.scratch/sf2-v1-narrative-regression/README.md`

## What to build

Restore V1's prose philosophy to SF2 Narrator craft: honest density, silence as a tool, readable formatting rhythm, and scene transitions that breathe.

SF2 currently has word targets and strong mechanical rules, but less permission to be spare, let dialogue land, or vary density by dramatic moment.

## Required Behavior

- Narrator craft includes "honest density, not word count" framing.
- Narrator craft explicitly permits short turns when a beat should land.
- Narrator craft tells the model to use blank lines between dialogue, italic text, and narrative blocks where helpful for readability.
- Scene transitions should use short headings only when location/time meaningfully changes.
- Existing 150-250 word target and 400 word cap remain as guardrails, but are framed as subordinate to density and dramatic need.
- The turn still ends with pressure, a beat, or an actionable question.

## Surfaces

- `lib/sf2/narrator/prompt/role.ts`
- `lib/system-prompt.ts` as V1 reference
- prompt-surface fixtures under `fixtures/sf2/replay/`

## Implementation Notes

- Keep the prose philosophy in cached Narrator role text; it is generic and world-independent.
- Do not add Markdown features the renderer cannot support.
- Do not weaken fail-forward, hidden-camera, or state-authority rules.
- Avoid adding examples that are too genre-specific.

## Acceptance Criteria

- [x] Narrator role contains density/silence guidance.
- [x] Narrator role retains word target/cap but with density framing.
- [x] Narrator role includes formatting rhythm guidance.
- [x] Prompt-surface fixture confirms the text renders.
- [x] No existing replay fixture fails due to prompt composition.

## Completion Evidence

Completed on 2026-05-18.

- Added honest-density, silence, readable blank-line rhythm, and meaningful-heading guidance to Narrator craft.
- Kept the existing word target and cap as guardrails under dramatic need.
- Covered by `fixtures/sf2/replay/narrator-prose-philosophy.json`.

## Fixture Expectations

Add or update a Narrator prompt fixture.

Suggested fixture name:

```bash
fixtures/sf2/replay/narrator-prose-philosophy.json
```

It should assert the rendered role includes:

- "Silence" or equivalent breath permission
- "honest density" or equivalent density-over-count rule
- formatting rhythm guidance

## Verification

```bash
npm run sf2:replay -- fixtures/sf2/replay/narrator-prose-philosophy.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

## Blocked By

None - can start immediately.

## Out Of Scope

- Changing streaming renderer.
- Changing markdown parsing.
- Rewriting all Narrator craft.
