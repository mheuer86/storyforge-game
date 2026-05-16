# SF2 Documentation Pass Notes

Date: 2026-05-16

Purpose: capture observations from the documentation refresh that do not fit cleanly into stable docs yet: stale references, partial implementations, incoherent naming, and follow-up questions.

## Observed Stale Documentation

- `CONTEXT.md` still described V1 as the shipped `/play` path and SF2 as `/play/v2`. Current routing shows `/play` imports `Sf2PlayApp`, `/play/v1` keeps the V1 client, and `/play/v2` is an SF2 alias.
- `CLAUDE.md` still had V1 as the primary architecture map, with `app/api/game/route.ts`, `components/game/game-screen.tsx`, and `lib/system-prompt.ts` as the main route/system surfaces. That is now legacy-primary knowledge for `/play/v1`.
- Existing root docs were written for V1 and moved to `docs/v1/`. The moved set includes `storyforge-2-design.md`, which is not V1 documentation but was part of the pre-refresh root-doc snapshot. New root docs should treat it as historical design context, not shipped behavior.

## Implementation Notes To Treat Carefully

- `components/sf2/play-app.tsx` still carries a top comment saying the "clean tool_result-continuation roll flow is Stage 3+ work", but the current SF2 Narrator route uses `request_roll`, streams a `roll_prompt`, and resumes with prior messages plus roll resolution. The comment may be stale or at least underspecified.
- `lib/sf2/scene-kernel/build.ts` comments describe some enforcement as "later" or "Phase A", while display sentinel integration exists through `app/api/sf2/narrator/route.ts` and `lib/sf2/sentinel/display.ts`. The kernel is still a derived read model, but comments may lag the current enforcement/observe split.
- `lib/sf2/pressure/runtime.ts` keeps legacy `Sf2EngineRuntime` support but `ensureRuntimeEnginesFromArcPlan()` and `seedSelectedEngineAnchors()` are currently no-ops. Current docs should describe thread pressure as primary and engines as legacy compatibility.
- `chapterPressureRuntime.computeChapterCloseReadiness()` uses `MIN_CLOSE_TURN = 18`; V1 docs talked about 10-18 turn chapters and 20-turn hard fallback. Current SF2 close logic is more conservative and objective-gate driven.
- `recordObservation()` throws for actor-firewall violations outside production, while surrounding comments sometimes call the firewall "observe" or "production no-op signal." Docs should separate local/dev enforcement from production telemetry.

## Documentation Choices Made

- Root docs will document current shipped SF2 behavior. V1 references stay under `docs/v1/`.
- Diagrams will use Mermaid inside markdown rather than generated image files unless the browser UI proves useful enough to capture.
- Browser screenshots were not added in this pass because the useful explanatory surfaces are architecture/state/turn flows rather than one transient gated UI state. Root docs use Mermaid diagrams where visuals clarify flow and ownership.
- `CLAUDE.md`, `CONTEXT.md`, and `docs/agents/domain.md` were updated to treat SF2 as current `/play` and V1 as `/play/v1` legacy documentation.

## Follow-Up Candidates

- Consider updating or deleting the stale Stage 3 roll-flow comment in `components/sf2/play-app.tsx` during the next code cleanup pass.
- Consider clarifying scene-kernel comments around observe-mode versus enforced display sentinels.
- Consider either documenting or removing legacy `campaign.engines` fields once old state compatibility is no longer needed.

## Validation Notes

- `npm run lint` did not run because the workspace does not currently expose `eslint` (`sh: eslint: command not found`), even though `node_modules/` exists.
- Local checks run instead: docs inventory, stale-reference scans, required file existence check, Mermaid/code-fence balance check, and non-ASCII scan for newly edited docs/handbooks.
