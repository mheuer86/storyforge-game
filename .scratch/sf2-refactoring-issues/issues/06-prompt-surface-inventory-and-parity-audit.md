# Prompt Surface Inventory And Parity Audit

Status: implemented
Type: HITL->AFK

## Implementation status

Implemented. Do not assign this ticket again. The artifact exists at:

- `.scratch/sf2-refactoring-issues/artifacts/prompt-surface-inventory-and-parity-audit.md`

It has also been reconciled after Tickets 07 and 08, including current ownership for `lib/sf2/genre-profile/` and `lib/sf2/narrator/prompt/`.

Any remaining prompt behavior decisions should become new tickets from the artifact's **Prompt Edit Decision Queue** rather than reopening this audit.

## What to build

Produce a deliberate inventory of SF2 prompt surfaces and a V1-to-SF2 parity audit before any prompt-surface refactor or compression work changes behavior.

The goal is not to make prompts shorter by default. The goal is to know which prompt text is load-bearing contract, which is craft voice, which is duplicate, which is stale bug-scar wording, which belongs in code or validators, and which V1 rules were intentionally replaced or accidentally lost in SF2.

This ticket is an audit gate for later prompt-surface implementation. It should produce a reviewable markdown artifact, not a prompt rewrite.

## Parent / related work

- Current refactoring backlog: `.scratch/sf2-refactoring-issues/README.md`
- Prior narrative-quality follow-up: `.scratch/sf2-narrative-quality-pass/11-prompt-surface-compression-audit.md`
- Prior reconciliation: `.scratch/sf2-narrative-quality-pass/STATUS-RECONCILIATION.md`

This ticket imports the useful audit scope from the narrative-quality pass into the current architecture-refactoring batch.

## Output artifact

Create:

- `.scratch/sf2-refactoring-issues/artifacts/prompt-surface-inventory-and-parity-audit.md`

The artifact should be self-contained enough for a later agent to implement `08-narrator-prompt-surface-module.md` without rereading this conversation.

## Current files to inspect

SF2 prompt and prompt-adjacent surfaces:

- `lib/sf2/narrator/prompt.ts`
- `lib/sf2/narrator/messages.ts`
- `lib/sf2/narrator/turn-context.ts`
- `lib/sf2/narrator/roll-gates.ts`
- `lib/sf2/narrator/intent-queue.ts`
- `lib/sf2/narrator/tools.ts`
- `lib/sf2/author/prompt.ts`
- `lib/sf2/author/retry.ts`
- `lib/sf2/author/tools.ts`
- `lib/sf2/archivist/prompt.ts`
- `lib/sf2/archivist/tools.ts`
- `lib/sf2/arc-author/prompt.ts`
- `lib/sf2/chapter-meaning/prompt.ts`
- `lib/sf2/prompt/compose.ts`
- `lib/sf2/retrieval/scene-packet.ts`
- `lib/sf2/genre-examples.ts`

V1 comparison surfaces:

- `lib/system-prompt.ts`
- `docs/prompt-composition.md`
- `lib/tools.ts`
- `lib/tool-processor.ts`
- `lib/genre-config.ts`
- `lib/genres/*`

Optional if present and still relevant:

- `lib/sf2b/narrator-role.ts`
- `lib/sf2b/narrator-kernel.ts`

## Current rough size baseline

Use current line counts as a first signal, then add approximate character counts or token estimates in the artifact.

Known line-count snapshot from shaping:

- `lib/sf2/author/prompt.ts`: ~492 lines
- `lib/sf2/narrator/prompt.ts`: ~716 lines
- `lib/sf2/archivist/prompt.ts`: ~756 lines
- `lib/sf2/arc-author/prompt.ts`: ~114 lines
- `lib/sf2/chapter-meaning/prompt.ts`: ~154 lines
- `lib/sf2/genre-examples.ts`: ~203 lines
- `lib/sf2/narrator/messages.ts`: ~234 lines
- `lib/sf2/narrator/turn-context.ts`: ~367 lines
- `lib/sf2/prompt/compose.ts`: ~92 lines

Do not treat size as proof of waste. Some of this prose is load-bearing.

## Inventory categories

For each prompt or prompt-adjacent surface, classify the content by category:

- `contract_rule`: role ownership, tool shape, cache placement, schema field meaning, required output discipline.
- `behavior_rule`: guidance that changes model output but is not yet enforced in code.
- `craft_rule`: prose/genre/voice guidance that preserves Storyforge quality.
- `example`: worked case, positive/negative contrast, genre sample.
- `bug_scar`: long instruction added after a specific observed failure.
- `duplicate`: same instruction repeated across role prompt, per-turn delta, tool schema, validator, retry prompt, or sentinel.
- `code_owned_candidate`: instruction that should become validation, derived state, diagnostic, replay fixture, or tool contract.
- `lost_v1_load_bearing_rule`: V1 instruction with no SF2 equivalent in prompt, schema, validator, derived advisory, or replay fixture.
- `intentionally_replaced_v1_rule`: V1 instruction now owned by SF2 code or structured state and should not be reintroduced as prompt prose.
- `genre_profile_candidate`: text/examples that should move behind the Genre Narrative Profile Module rather than stay embedded in role prompts.

## Required artifact sections

The audit artifact must include:

1. **Prompt Surface Map**
   - Each surface listed with role, cache/dynamic placement, caller, and output authority.
   - Example placement classes: cached system block, chapter-scoped system block, dynamic per-turn message, roll-resume tool result, retry/repair prompt, tool/schema contract.

2. **Cost Baseline**
   - Approximate character count or token estimate for the main prompt surfaces.
   - Separate cached content from per-turn dynamic content where practical.

3. **V1 -> SF2 Parity Table**
   - Include at least:
     - genre injection
     - roll discipline
     - fail forward
     - failed-investigation POV
     - NPC information gating
     - origin/social modifiers
     - promises
     - decisions
     - clocks/timers/heat
     - post-action checklist
     - scene boundaries
     - suggested actions
     - compressed-state warnings
     - roll drought / momentum trap
     - dense scene roster / present NPC authority
     - chapter close timing
   - For each concept, classify as:
     - preserved in SF2 prompt
     - replaced by SF2 code/schema/validator
     - preserved in SF2 dynamic packet
     - intentionally dropped
     - accidentally missing / needs decision

4. **Duplication And Bug-Scar Table**
   - Name the repeated or stale rule.
   - List all places it appears.
   - Recommend one action: keep, merge, delete, move to code, move to validator, move to replay fixture, move to genre profile, or needs human decision.

5. **Prompt Edit Decision Queue**
   - List every proposed edit or restoration that should not be made automatically.
   - Include the decision needed, risk, affected files, and suggested verification.

6. **Implementation Feed For Ticket 08**
   - State which parts of the Narrator prompt surface are safe to turn into a Module without changing content.
   - State which content changes must wait for human approval.
   - State which cache/dynamic placement rules are load-bearing.

## Non-goals

- Do not edit prompt text in this ticket.
- Do not delete examples or copy.
- Do not restore V1 rules yet.
- Do not create validators or replay fixtures yet.
- Do not change Anthropic cache markers.
- Do not change Author, Narrator, Archivist, Arc Author, or Chapter Meaning behavior.
- Do not implement the Narrator Prompt Surface Module in this ticket.

## Acceptance criteria

- [x] The artifact exists at `.scratch/sf2-refactoring-issues/artifacts/prompt-surface-inventory-and-parity-audit.md`.
- [x] Every current SF2 prompt and prompt-adjacent surface listed above is classified.
- [x] The artifact separates cached system content from dynamic per-turn content.
- [x] The artifact includes an approximate size baseline.
- [x] The artifact includes a V1 -> SF2 parity table for the listed load-bearing concepts.
- [x] The artifact identifies duplicate, stale, or code-owned candidates without changing code.
- [x] Every recommended prompt deletion or restoration is marked with a decision state.
- [x] The artifact explicitly feeds `08-narrator-prompt-surface-module.md` by naming safe extraction work versus blocked prompt-content decisions.
- [x] No source code or prompt text changes were made by this audit ticket, except documentation artifacts under `.scratch/`.

## Verification

This is a markdown audit. No replay/build is required if no source files are changed.

If the agent writes helper scripts to count tokens or characters, keep them outside source or discard them before finishing unless they are intentionally useful artifacts.

## Blocked by

None - can start immediately.

## Comments

This ticket preserves architectural work in parallel with implementation work. It lets the codebase become more coherent without sneaking in prompt behavior changes before the prompt surface has been reviewed.
