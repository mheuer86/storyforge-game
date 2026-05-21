# SF2 Terminal Runner and TUI

Status: ready-for-agent
Labels: enhancement, ready-for-agent
Type: Planning artifact

## Problem Statement

Debugging SF2 currently requires driving the browser play surface for most live campaign behavior. That is high-friction for long runs, repeat runs, and agent-assisted investigation. The browser is still the primary player experience, but it is not an ideal debugging harness: playtesters must click through setup, manually enter turns, wait through the UI, handle roll modals, and depend on diagnostics export affordances.

SF2 already has replay fixtures and probe scripts, but those are mainly contract harnesses around captured states or focused model calls. They do not provide a fast way to run a fresh or saved campaign through the same Narrator, roll, Archivist, commit, diagnostics, and replay-frame loop without the web interface.

The missing product is a local terminal-facing runner that can act like a thin debug client for SF2: quick to start, scriptable, artifact-producing, and faithful enough to the browser turn loop that findings translate back to `/play`.

## Solution

Build an SF2 terminal runner that starts as a simple local-API-backed command and grows into an interactive TUI/debug harness.

The first milestone should favor usefulness over polish. It should reuse the same role endpoints and turn orchestration contracts as the browser app, stream Narrator prose to the terminal, resolve rolls through a pluggable terminal roll resolver, commit turns through the same SF2 turn pipeline, and write reproducible artifacts under the local scratch area.

The terminal runner should support two modes:

- One-shot and scripted modes for automated playtest runs.
- Interactive terminal mode for live debugging without the browser.

The local-API-backed version may require the Next dev server to be running. A later decision can determine whether direct Node role adapters are worth extracting so the runner can call Anthropic without HTTP routes.

## User Stories

1. As a Storyforge developer, I want to run a single SF2 turn from the terminal, so that I can debug Narrator and Archivist behavior without opening the browser.
2. As a Storyforge developer, I want terminal runs to use the same Narrator route as `/play`, so that debugging findings are relevant to the real player path.
3. As a Storyforge developer, I want terminal runs to commit through the same SF2 turn pipeline, so that state changes match browser play.
4. As a Storyforge developer, I want terminal runs to stream Narrator prose as it arrives, so that I can observe the same roll-pause and text-cadence contracts in a lighter surface.
5. As a Storyforge developer, I want to load an existing SF2 state file, so that I can reproduce bugs from exported playthroughs.
6. As a Storyforge developer, I want to save the updated state after each terminal turn, so that I can continue debugging from the resulting campaign state.
7. As a Storyforge developer, I want replay frames emitted for terminal turns, so that terminal-discovered bugs can become SF2 replay fixtures.
8. As a Storyforge developer, I want diagnostics written alongside terminal runs, so that I can inspect model usage, sentinel events, invariant events, working-set summaries, and errors after the fact.
9. As a Storyforge developer, I want a transcript artifact, so that I can skim a run without opening raw JSON.
10. As a Storyforge developer, I want a markdown run summary, so that long automated runs produce a quick first-pass report.
11. As a Storyforge developer, I want scripted input mode, so that I can run the same playthrough repeatedly.
12. As a Storyforge developer, I want seeded or deterministic roll mode, so that script results can be meaningfully compared across runs.
13. As a Storyforge developer, I want manual roll entry in interactive mode, so that I can test success, failure, critical, and fumble branches deliberately.
14. As a Storyforge developer, I want automatic roll mode, so that unattended runs do not block on terminal input.
15. As a Storyforge developer, I want terminal roll output to show the persisted roll record, so that mechanical drift is visible immediately.
16. As a Storyforge developer, I want the runner to show suggested actions after a turn, so that I can inspect quick-action quality without the browser UI.
17. As a Storyforge developer, I want slash-style terminal commands for state, actions, debug, save, and quit, so that interactive debugging stays low-friction.
18. As a Storyforge developer, I want a new-campaign command with setup flags, so that I can start fresh runs without clicking through the setup wizard.
19. As a Storyforge developer, I want new-campaign terminal setup to reuse SF2 setup seed and Author flows, so that terminal openings exercise the same campaign-generation contracts as `/play`.
20. As a Storyforge developer, I want terminal runs to capture chapter and turn indexes clearly, so that artifacts are easy to map back to fixtures and logs.
21. As a Storyforge developer, I want terminal runs to fail loudly when the local API server is unavailable, so that setup problems do not look like model failures.
22. As a Storyforge developer, I want terminal runs to preserve existing browser persistence assumptions, so that adding the runner does not regress IndexedDB saves.
23. As a Storyforge developer, I want terminal artifacts to use stable filenames, so that agents and scripts can find them reliably.
24. As a Storyforge developer, I want a command to extract a replay fixture from a terminal run turn, so that observed bugs can be converted into deterministic regression coverage.
25. As a Storyforge developer, I want fixture extraction to preserve the existing replay schema, so that `sf2:replay` remains the canonical deterministic harness.
26. As a Storyforge developer, I want terminal commands to be documented near the SF2 workflow docs, so that future agents know when to use TUI runs versus browser play or replay fixtures.
27. As a playtester, I want to run several turns quickly from a text file, so that I can generate playthrough evidence without babysitting the UI.
28. As a playtester, I want terminal output to be readable in plain logs, so that sharing a run does not require screenshots.
29. As an agent working in the repo, I want an AFK-safe scripted runner, so that I can produce evidence for narrative-state drift or pacing bugs without browser interaction.
30. As an agent working in the repo, I want a clear boundary between debug runner code and browser UI code, so that fixes do not accidentally change player-facing streaming feel.

## Implementation Decisions

- Build the first version as SF2-only. V1 is legacy and should not be included in this PRD.
- Prefer a local-API-backed terminal runner for the first milestone. It may require the Next dev server and should call the same role endpoints used by the browser app.
- Keep the browser `/play` surface as the authoritative player UI. The terminal runner is a debugging and test-run surface, not a replacement UI.
- Reuse the existing client Narrator turn orchestration contract where practical. The terminal runner should adapt the same stream events to terminal output rather than implementing a divergent protocol.
- Reuse the existing SF2 turn commit pipeline for terminal turns. Narrator output, roll records, Archivist results, mechanical effects, invariant events, replay frames, and state updates should flow through the same commit boundary as browser play.
- Add a terminal run engine as a deep module. Its interface should accept state, input source, role-call adapters, roll resolver, artifact writer, and diagnostics sink, then return updated state and run artifacts. This module should be testable without a real terminal.
- Add role-call adapters for the local API. They should handle request construction, response parsing, error messages, and endpoint availability checks without embedding terminal presentation.
- Add a roll resolver interface. Implement automatic seeded rolls, automatic random rolls, and manual terminal rolls as adapters over the same resolver contract.
- Add a script input source. It should read player turns from a text file, stop at a configured turn limit, and support unattended operation.
- Add an interactive input source. It should support free-text turns plus a small command set: state, actions, debug, save, help, and quit.
- Add a JSON file persistence adapter for terminal runs. It should preserve SF2 state shape and avoid coupling to browser IndexedDB.
- Add an artifact writer that creates one run directory containing transcript, diagnostics, replay frames, final state, turn log, and summary.
- Add a fixture extraction command that converts a terminal run turn into the existing SF2 replay fixture schema.
- New campaign setup should reuse existing SF2 setup options and setup seed compilation. It should support flags for genre, origin, playbook, and hook, and should run the same Author-owned setup flow used by the app.
- Direct Node role calls are a separate architectural decision. Do not extract route internals solely to avoid running the local dev server until the local-API runner proves useful.
- Keep terminal output intentionally plain. A polished pane-based TUI can come later; the first useful tool should work well in normal shell logs and CI-like output.
- Do not change streaming timing, roll pause semantics, or browser UI behavior as part of this feature.

## Testing Decisions

- Tests should cover external behavior of the terminal runner: request sequencing, roll resolution behavior, artifact shapes, scripted input handling, and fixture extraction.
- Unit-test the terminal run engine with fake role adapters and fake roll resolvers. The tests should assert committed outputs and artifacts, not private helper calls.
- Unit-test the script input source with blank lines, comments if supported, turn limits, and end-of-file behavior.
- Unit-test seeded roll resolution for deterministic output and persisted roll-record parity.
- Unit-test artifact writing by asserting the presence and rough schema of transcript, diagnostics, final state, replay frames, and summary files.
- Unit-test fixture extraction against a small run artifact, then run the extracted fixture through the existing SF2 replay harness where practical.
- Add focused replay fixtures only when terminal-run work exposes a distinct SF2 contract bug. The TUI itself should not depend on live Anthropic calls for deterministic tests.
- Do not test terminal rendering details beyond stable, user-visible command behavior. The runner is a debug tool; terminal cosmetics should not make tests brittle.
- Prior art exists in the current SF2 replay, probe, and fixture-transform scripts. The new tests should preserve that style: deterministic local contracts first, live model probes only when explicitly requested.

## Out of Scope

- Replacing the browser `/play` experience.
- Supporting V1 terminal play.
- Building a full pane-based terminal UI in the first milestone.
- Running in production or exposing a hosted debug terminal.
- Changing IndexedDB browser persistence.
- Changing SF2 save shape except through existing migration-safe state updates.
- Changing Narrator, Archivist, Author, or Chapter Meaning prompt behavior solely for the TUI.
- Changing streaming feel, roll pause timing, or player-facing browser interactions.
- Direct Node Anthropic role adapters in the first implementation milestone.
- A general-purpose campaign simulator or AI player. Scripted mode feeds predefined player inputs; it does not decide actions itself.

## Further Notes

## AFK Agent Entry Notes

Before implementing any ticket, read `CLAUDE.md`, `CONTEXT.md`, this PRD, and the specific issue being picked up. If the ticket depends on earlier TUI tickets, inspect the landed implementation first and preserve its public command shape unless the current ticket explicitly changes it.

The intended implementation direction is:

- Add a small script entrypoint under `scripts/` and a matching `package.json` command. Existing SF2 scripts use a CommonJS wrapper plus `jiti` for TypeScript sources; follow that pattern unless the repo has moved on.
- Put reusable terminal-run behavior in a deep module under SF2 runtime or tooling code rather than burying it in one large script. The module should be testable with fake role adapters and fake roll resolvers.
- Keep local API calls behind adapter functions. The terminal runner should not duplicate route internals in the first milestone.
- Treat `components/sf2/play-app.tsx` as reference behavior, not an implementation destination. Do not move terminal logic into React components.
- Reuse `runSf2ClientNarratorTurn` and `commitSf2Turn` where practical. If either interface needs small additive changes for terminal use, preserve browser call sites and tests.
- Keep artifacts under `.scratch/sf2-tui/` by default. Do not write into fixture directories except when the fixture extraction command is explicitly invoked.
- Keep the browser save shape and IndexedDB path untouched.
- Do not make live Anthropic calls in deterministic tests. Use fake local API/role adapters for tests and leave real model runs as manual verification.

Implementation ticket sequence:

1. [One-Turn SF2 Terminal Runner](issues/01-one-turn-sf2-terminal-runner.md)
2. [New Campaign Bootstrap From CLI Flags](issues/02-new-campaign-bootstrap-from-cli-flags.md)
3. [Interactive TUI Session Loop](issues/03-interactive-tui-session-loop.md)
4. [Deterministic Scripted Run Mode](issues/04-deterministic-scripted-run-mode.md)
5. [Run Artifact Export Bundle](issues/05-run-artifact-export-bundle.md)
6. [Replay Fixture Extraction From TUI Runs](issues/06-replay-fixture-extraction-from-tui-runs.md)
7. [Roll Parity Controls For Terminal Play](issues/07-roll-parity-controls-for-terminal-play.md)
8. [Direct Node Role Adapter Decision](issues/08-direct-node-role-adapter-decision.md)

The highest-value first milestone is the smallest artifact-producing path: one terminal command that can run a turn, resolve rolls automatically, commit state, and write replay/debug artifacts. Scripted deterministic runs should follow soon after because they unlock repeatable playtest evidence without browser interaction.

The main product tradeoff is local-API fidelity versus standalone convenience. Requiring the dev server is less elegant, but it keeps the first runner aligned with the browser route behavior and avoids prematurely extracting model-call internals.
