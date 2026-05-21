# Synthesize Chapter Playstyle Artifact

Status: complete
Labels: complete
Type: AFK
Area: SF2 / chapter close / playstyle personalization

## What to build

Add a separate chapter-close playstyle personalization synthesis path. This path should inspect the completed chapter and emit evidence-backed GM calibration about the human player, not the PC, using the six canonical knobs: information economy, decision architecture, consequence timing, emotional register, NPC legibility, and error tolerance.

This must be a separate role/tool from Chapter Meaning. Chapter Meaning owns literary transition and next-chapter consequence; playstyle personalization owns GM calibration for how future chapters and turns should be run.

Keep this separate from campaign rulebook interpretation. If play reveals that rules need campaign-specific triggers, costs, permissions, taboos, or consequence framing, record that as rulebook interpretation rather than human-player playstyle.

## Acceptance criteria

- [x] A dedicated chapter-close playstyle personalization tool/route exists and uses a single forced tool call.
- [x] The emitted artifact includes the six canonical knobs plus compact `workedPatterns` and `avoidPatterns`.
- [x] The artifact includes evidence references to chapter turns or summaries, not unsupported generic advice.
- [x] The prompt explicitly separates human-player calibration from PC stance, setup backstory, and campaign facts.
- [x] The prompt distinguishes playstyle personalization from campaign rulebook interpretation and does not merge rules guidance into player-style notes.
- [x] The route fails open: chapter transition can continue if personalization synthesis fails.
- [x] A focused replay/helper fixture covers artifact normalization and evidence-backed field validation without a live model call.

## Blocked by

None - can start immediately

## Comments

Implemented `POST /api/sf2/playstyle` with a forced single Anthropic tool call, evidence-backed normalization, fail-open chapter-close integration, and focused replay coverage in `playstyle-artifact-normalization-evidence.json`.
