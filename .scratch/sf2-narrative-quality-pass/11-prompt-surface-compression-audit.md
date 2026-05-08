# Prompt surface compression audit

Status: proposed
Category: refactor
**Type:** HITL→AFK
**Source:** narrative-quality pass follow-up, 2026-05-08

## What to build

Run a deliberate review pass over SF2 prompt surfaces to find duplicate instructions, excessive examples, lengthy bug-patch rules, and prosaic guidance that may be wasting context or priming the wrong behavior.

This is not a "make prompts short" ticket. Some prose is load-bearing: genre identity, craft voice, role ownership, and hard-won failure-mode guidance may deserve the tokens. The pass should separate useful authorial texture from context bloat and move anything enforceable into schemas, validators, replay fixtures, derived projections, or tool contracts.

Also compare SF2 against V1's prompt architecture. V1 shipped with several load-bearing rules that made the GM feel more like a game and less like a generic story generator: genre-section injection, roll discipline, fail-forward rules, NPC information gating, origin as a social modifier, promises/decisions/clocks/timers, post-action checklist, scene boundaries, and compressed-state warnings. The audit should identify which of those rules are intentionally replaced by SF2 code, which survive in SF2 prompts, and which were accidentally lost during the rebuild.

Initial surfaces to inventory:

- `lib/sf2/author/prompt.ts`
- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/archivist/prompt.ts`
- `lib/sf2/arc-author/prompt.ts`
- `lib/sf2/chapter-meaning/prompt.ts`
- `lib/sf2/prompt/compose.ts`
- `lib/sf2b/narrator-role.ts`
- `lib/sf2b/narrator-kernel.ts`

V1 comparison surfaces:

- `lib/system-prompt.ts`
- `docs/prompt-composition.md`
- `lib/tools.ts`
- `lib/tool-processor.ts`
- `lib/genre-config.ts`
- `lib/genres/*`

Current rough size signal from `wc -l`: Author 426 lines, Narrator 693 lines, Archivist 709 lines, Arc Author 100 lines, Chapter Meaning 156 lines, prompt compose 79 lines, SF2B narrator role/kernel 417 combined lines. That does not prove waste, but it is large enough to justify measurement.

Recommended audit categories:

- **Contract rule:** role ownership, JSON/tool shape, cache placement, schema field meaning.
- **Behavior rule:** guidance that changes output but cannot yet be enforced in code.
- **Craft rule:** genre/prose quality guidance that preserves Storyforge's voice.
- **Example:** worked cases, positive/negative contrasts, genre samples.
- **Bug scar:** long instruction added after one observed failure that may now be covered by validator/sentinel/replay.
- **Duplicate:** same instruction repeated across role prompt, per-turn delta, tool schema, validator, or retry prompt.
- **Code-owned candidate:** instruction that should become validation, derived state, diagnostics, or a replay fixture.
- **Lost V1 load-bearing rule:** V1 instruction with no SF2 equivalent in prompt, schema, validator, derived advisory, or replay fixture.
- **Intentionally replaced V1 rule:** V1 instruction that SF2 now owns in code or structured state and should not be reintroduced as prompt prose.

## Acceptance criteria

- [ ] Produce a prompt inventory with each major surface classified as cached role prompt, dynamic per-turn message, retry/repair prompt, or tool/schema contract.
- [ ] Baseline approximate token or character cost for the major prompt surfaces before edits.
- [ ] Produce a V1→SF2 parity table for load-bearing prompt concepts: genre injection, roll discipline, fail forward, failed-investigation POV, NPC information gating, origin/social modifiers, promises/decisions/clocks/timers, scene boundaries, suggested actions, and compressed-state warnings.
- [ ] Classify each V1 concept as preserved in SF2 prompt, replaced by SF2 code/schema/validator, intentionally dropped, or accidentally missing.
- [ ] Identify duplicate or overlapping instructions across Author, Narrator, Archivist, SF2B, tool schemas, validators, and retry prompts.
- [ ] Mark every proposed deletion as either safe to delete, merge into another prompt, move to code/validator, move to per-genre examples, or keep because it is load-bearing.
- [ ] Mark every proposed restoration from V1 as either prompt restoration, code-owned replacement, schema/tool contract addition, replay fixture, or no-op because SF2 has superseded it.
- [ ] Cap worked examples where they are saturating the model's palette; keep examples only when they teach a contrast that validation cannot teach.
- [ ] Preserve genre identity and hard role boundaries; do not sterilize the prompts into generic assistant instructions.
- [ ] If edits are made, run focused replay fixtures for touched contracts plus the full SF2 replay suite.

## Blocked by

Status reconciliation recommended. Narrative tickets #01-#06, #08, and #10 appear partly or fully implemented; verify before auditing them as if they are still future work.

## Coordinates with

- #01 v1-style genre injection refactor: examples should be per-genre instead of universal Hegemony-shaped prose.
- #06 trim mechanism-vocabulary list: narrow instance of example/vocabulary saturation.
- V1 `docs/prompt-composition.md`: useful source map for load-bearing V1 instructions and cache placement.
- Domain 16 Archivist patch lanes: some Archivist prose can move into explicit lane contracts.
- Domain 18 SceneSnapshot/SceneKernel contracts: scene continuity rules may move from prompt prose into reducer/accessor contracts.
- Domain 19 Working Set retrieval contract: retrieval inclusion rules should be measured and instrumented, not repeated as prompt advice.

## Comments

> *Prompt prose can be load-bearing, but it should earn its rent. If a rule is duplicated, stale, enforceable in code, or mainly an example list that primes the wrong palette, it should be merged, moved, or deleted.*

> *V1 comparison is part of the safety rail: compression should not accidentally remove the instructions that made V1 feel playable.*

## Agent Brief

**Category:** refactor
**Summary:** Audit SF2 prompts for duplicate, excessive, stale, or code-owned instructions before doing a compression pass, and compare against V1 to find load-bearing instructions SF2 lost.
**Current behavior:** SF2 role prompts contain long rule blocks and many worked examples; some are valuable, some may duplicate validators or prime procedural behavior. SF2 may also be missing V1 rules that were load-bearing in play.
**Desired behavior:** A measured prompt inventory, a V1→SF2 parity table, and a reviewable edit plan that preserves load-bearing voice and role boundaries while cutting context waste.
**Key interfaces:** `lib/sf2/*/prompt.ts`, `lib/sf2/prompt/compose.ts`, `lib/sf2b/narrator-role.ts`, `lib/sf2b/narrator-kernel.ts`, V1 `lib/system-prompt.ts`, `docs/prompt-composition.md`, tool schemas, validators, replay fixtures.
**Acceptance criteria:** Complete the issue checklist; if prompt edits are included, run focused fixtures and full `npm run sf2:replay -- fixtures/sf2/replay`.
**Out of scope:** Rewriting all prompts in one pass; removing genre/craft voice just because it is prose; changing model roles or streaming behavior.
