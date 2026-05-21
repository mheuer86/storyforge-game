# Direct Node Role Adapter Decision

Status: ready-for-human
Labels: enhancement, ready-for-human
Type: HITL
Area: SF2 / architecture / terminal runner

## What to build

Decide whether the SF2 terminal runner should remain local-API-backed or extract direct Node role adapters that call Anthropic without the Next dev server. This is an architectural decision ticket, not an implementation ticket.

The decision should be made after the local-API-backed runner proves its value, because direct adapters would require more extraction from route-owned behavior and could create parity risks.

## Acceptance criteria

- [ ] The local-API runner's limitations are documented with concrete examples.
- [ ] The benefits of direct Node role adapters are documented.
- [ ] The parity risks of bypassing Next routes are documented.
- [ ] A recommendation is made: keep local-API-only, extract direct adapters, or defer.
- [ ] If extraction is recommended, follow-up AFK implementation tickets are created.

## Blocked by

- [One-Turn SF2 Terminal Runner](01-one-turn-sf2-terminal-runner.md)
- [New Campaign Bootstrap From CLI Flags](02-new-campaign-bootstrap-from-cli-flags.md)
- [Interactive TUI Session Loop](03-interactive-tui-session-loop.md)
- [Deterministic Scripted Run Mode](04-deterministic-scripted-run-mode.md)
- [Run Artifact Export Bundle](05-run-artifact-export-bundle.md)
- [Replay Fixture Extraction From TUI Runs](06-replay-fixture-extraction-from-tui-runs.md)

## User Stories Covered

- PRD stories 21, 22, 26, 30.

## Agent Brief

This is intentionally HITL. Do not implement direct role adapters in this ticket. Produce a decision record grounded in the working local-API runner and concrete friction observed from using it.

## Current Surfaces To Inspect

- The final local-API terminal runner implementation.
- `app/api/sf2/narrator/route.ts`
- `app/api/sf2/archivist/route.ts`
- `app/api/sf2/arc-author/route.ts`
- `app/api/sf2/author/route.ts`
- `app/api/sf2/chapter-meaning/route.ts`
- Prompt/cache composition surfaces under `lib/sf2/*/prompt*`.
- Existing probe scripts that already call Anthropic directly.

## Decision Record Shape

Write the decision record under `.scratch/sf2-tui/`, for example:

```text
.scratch/sf2-tui/direct-node-role-adapter-decision.md
```

Include:

- Current local-API workflow.
- Concrete pain points from local-API usage.
- What direct adapters would need to extract or duplicate.
- Parity risks around prompt caching, repair behavior, diagnostics, headers, retries, and route-only normalization.
- Estimated implementation cost.
- Recommendation.
- Follow-up tickets if extraction is recommended.

## Evaluation Questions

- Does requiring `npm run dev` materially slow down debugging?
- Are local-API failures easy enough to diagnose?
- Do direct Node calls risk drifting from browser route behavior?
- Can route internals be extracted into shared modules without changing streaming semantics?
- Would direct adapters make AFK playtest runs more reliable, or just more complex?

## Verification

- A decision record exists and links to concrete local-API runner behavior.
- The recommendation is explicit.
- If direct adapters are recommended, follow-up AFK tickets are created with clear scope.
- If direct adapters are deferred or rejected, the reason is specific enough to revisit later.

## Out of Scope

- Implementing direct adapters.
- Refactoring route internals.
- Changing model prompts or cache behavior.
