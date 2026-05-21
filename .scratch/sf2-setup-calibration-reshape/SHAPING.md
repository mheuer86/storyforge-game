# SF2 Setup Calibration Reshape

Status: shaping
Source: user playtest feedback on 2026-05-21 plus `Oaths tested in burning worlds.md`

## Problem

The current setup calibration landed as a deterministic wizard page. It stores useful answers, but it does not feel like the reference session.

The reference interaction worked because the GM did four things the wizard does not:

- opened with genre atmosphere before asking mechanics
- asked one loaded identity question, then reflected the answer back in stronger campaign language
- used the answer to sharpen the next question instead of advancing through a fixed survey
- converted answers into opening conditions, NPC debts, and a first-scene engine before play began

The current UI says "Calibration", shows a 0/5 counter, renders the opening hook as a card, and asks static playbook-shaped questions. That makes the player feel processed, not read.

## Requirements

| Req | Requirement | Status |
|---|---|---|
| R0 | Setup must feel like the GM discovering the character with the player, not like a form or preference survey. | Core goal |
| R1 | The first questions must create identity pressure: oath/commitment, anchor/belief, owed relationships, and opening complication. | Must-have |
| R2 | Each next prompt should respond to the player's prior answer by reflecting, sharpening ambiguity, or asking for the missing edge. | Must-have |
| R3 | The flow must remain optional and skippable, with a deterministic fail-open path into campaign start. | Must-have |
| R4 | The answers must remain setup seed material, not transcript turns and not durable state writes before Arc Author / Author validation. | Must-have |
| R5 | The UI must not expose internal terms such as calibration, seed, hook id, theme, or question count as the main experience. | Must-have |
| R6 | The flow must work across all SF2 genres and playbooks without hand-authoring a full bespoke setup script per genre. | Must-have |
| R7 | The result should give Arc Author / Chapter Author compact, structured player-authored facts and tensions. | Must-have |
| R8 | The implementation must preserve low-friction local play: no fragile setup dead-end if a setup model call fails. | Must-have |

## Shapes

## A: Polish The Existing Wizard Step

| Part | Mechanism |
|---|---|
| A1 | Rename "Calibration" to more atmospheric copy. |
| A2 | Hide the 0/5 counter and soften the hook card. |
| A3 | Improve deterministic question text. |
| A4 | Keep current storage and seed compiler. |

This is cheap, but it only sands the form. It cannot reflect the player's answer or discover a sharper next question.

## B: GM Setup Conversation Before Campaign Creation

| Part | Mechanism |
|---|---|
| B1 | Replace the calibration page with a compact chat-like setup scene. The "GM" opens with 1-2 genre lines, then asks the first identity-pressure question. |
| B2 | Add a setup-conversation API/model role that receives selected genre, origin, playbook, hook, prior setup answers, and the latest player answer. It returns `reflection`, `next_question`, `done`, and a compact `candidate_seed_notes`. |
| B3 | Ask 2-4 questions by default, not 5. Continue only while the model identifies a missing anchor: commitment, belief, debt, pressure, or companion/destination. |
| B4 | Let the player start after any answer. If the setup call fails, fall back to the current deterministic question helper or start without setup answers. |
| B5 | Store the raw Q/A plus a compiled setup summary. The Author receives only the compact summary and the answer list through `playerCalibration`. |
| B6 | The final setup message confirms opening conditions in player-facing language: destination, why now, alone/with whom, and what debt or oath the first scene can test. |

This matches the reference most closely. It lets the app feel like a GM while preserving SF2's state-before-history architecture.

## C: Deterministic Conversation Simulator

| Part | Mechanism |
|---|---|
| C1 | Keep all questions code-owned, but generate them from templates keyed by theme and genre. |
| C2 | Add deterministic reflection snippets that quote or summarize the prior answer. |
| C3 | Continue through a fixed 3-question path unless skipped. |
| C4 | Store the same payload as today. |

This is more reliable than a model call, but the reflection will feel shallow exactly where the reference felt alive.

## D: Move Questions Into The Opening Scene

| Part | Mechanism |
|---|---|
| D1 | Start play immediately after identity selection. |
| D2 | The Narrator asks character-grounding questions in prose during the first scene. |
| D3 | Archivist/Author later extract answers into state. |

This reduces setup friction, but it mixes meta-creation with in-fiction play and risks polluting transcript/history with pre-campaign negotiation.

## Fit Check

| Req | Requirement | Status | A | B | C | D |
|---|---|---|---|---|---|---|
| R0 | Setup must feel like the GM discovering the character with the player, not like a form or preference survey. | Core goal | ❌ | ✅ | ❌ | ✅ |
| R1 | The first questions must create identity pressure: oath/commitment, anchor/belief, owed relationships, and opening complication. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R2 | Each next prompt should respond to the player's prior answer by reflecting, sharpening ambiguity, or asking for the missing edge. | Must-have | ❌ | ✅ | ❌ | ✅ |
| R3 | The flow must remain optional and skippable, with a deterministic fail-open path into campaign start. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R4 | The answers must remain setup seed material, not transcript turns and not durable state writes before Arc Author / Author validation. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R5 | The UI must not expose internal terms such as calibration, seed, hook id, theme, or question count as the main experience. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R6 | The flow must work across all SF2 genres and playbooks without hand-authoring a full bespoke setup script per genre. | Must-have | ✅ | ✅ | ✅ | ✅ |
| R7 | The result should give Arc Author / Chapter Author compact, structured player-authored facts and tensions. | Must-have | ✅ | ✅ | ✅ | ❌ |
| R8 | The implementation must preserve low-friction local play: no fragile setup dead-end if a setup model call fails. | Must-have | ✅ | ✅ | ✅ | ✅ |

**Notes:**
- A fails the feel problem; it is the current implementation with better clothes.
- C fails the adaptive-reflection requirement; deterministic reflection is likely to feel canned.
- D fails the SF2 ownership boundary by letting setup negotiation enter live play.

## Selected Direction

Select **B: GM Setup Conversation Before Campaign Creation**.

Keep the storage and seed compiler from the current implementation, but replace the player-facing setup interaction. The code-owned deterministic helper becomes fallback, not the primary experience.

## Breadboard

| Affordance | UI | Code |
|---|---|---|
| Start setup conversation | After identity selection, show a sparse conversation surface with a genre opening and first GM question. No "Calibration" label, no 0/5 counter. | `CharacterSetup` enters `setup_conversation` mode after hook selection. |
| Player answer | Textarea or command input styled like play input. Primary button says "Answer". Secondary says "Begin without this". | Append answer to local setup conversation state; do not mutate campaign state yet. |
| GM reflection and next question | Render a short GM response above the next question. Reflection may name the tension the player just created. | New `/api/sf2/setup-calibration` route or helper calls a small setup role. Input: setup selection, hook, prior answers, latest answer. Output: reflection, nextQuestion, done, compiledNotes. |
| Stop condition | After 2-4 useful answers, GM offers "Begin the opening" with a short confirmation of destination / why now / pressure. Player can also stop earlier. | Model returns `done: true` when core anchors are sufficient; code hard-caps at 5 answers and fail-opens on errors. |
| Campaign start | Start campaign from compiled setup material. | `Sf2SetupSelection.calibrationAnswers` persists raw Q/A; `playerCalibration.summary` receives compact compiled notes. |
| Fallback | If setup model fails, show one deterministic question or let the player begin immediately. | Reuse `getNextSf2SetupCalibrationQuestion` as fallback; diagnostics record `failed_open`. |

## Implementation Slices

1. Replace visible wizard calibration copy with a conversation shell and hide internal counters/labels.
2. Add setup-conversation role/tool/API returning reflection, next question, done flag, and compiled notes.
3. Preserve current persistence/seed path, adding optional compiled setup summary if needed.
4. Add fixtures for answer clamping, fail-open fallback, and compiled summary reaching Arc Author seed.
5. Browser-smoke setup flow across one desktop and one mobile viewport.

## Open Questions

- Should the first question happen before or after the opening hook is chosen? The reference chooses identity pressure first, then uses it to shape destination. Current SF2 picks hook first. This may need flipping: identity anchors first, then select or adapt hook.
- Should the setup role be live-model only, or should deterministic fallback always ask the first oath/anchor question before any model call?
- Do we want a visible "GM reflection" transcript saved for diagnostics only, or discarded after compiling the seed?
