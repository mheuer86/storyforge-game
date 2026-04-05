---
shaping: true
---

# /plan and /explore Slash Commands — Shaping

## Problem

Players have no way to explicitly enter operation planning or spatial exploration mode. These modes exist in the tool system (`setOperationState`, `setExplorationState`) but only activate when Claude decides to use them. Players should be able to trigger them directly, bringing structure to moments that benefit from it.

## Outcome

Two new slash commands (`/plan`, `/explore`) that reliably activate their respective modes, with Claude producing the right tool calls and adapting to what's already been established in the narrative.

---

## Requirements (R)

| ID | Requirement | Status |
|----|-------------|--------|
| R0 | `/plan` initiates operation planning mode via `setOperationState` | Core goal |
| R1 | `/explore` activates spatial exploration at the player's current location via `setExplorationState` | Core goal |
| R2 | `/plan` scans recent history (player actions, NPC dialogue, established facts) and prefills objectives, tactical facts, and constraints from what's already been discussed | Must-have |
| R3 | Planning mode is conversational — player refines through dialogue, not forced Q&A | Must-have |
| R4 | Transition from planning to execution: Claude suggests confirmation proactively when the plan feels complete, responds to keywords ("let's go", "execute"), or player can type `/plan` again to explicitly trigger the transition | Must-have |
| R5 | `/explore` works at any scale — Claude picks granularity appropriate to context (rooms in a dungeon, districts in a city, terrain features in wilderness) and maps the surrounding explorable area | Must-have |
| R6 | Both commands integrate into existing slash command system (`lib/slash-commands.ts`) | Must-have |
| R7 | `buildInstruction` is detailed enough that Claude reliably produces the correct tool calls | Must-have |

---

## Shape A: Add to slash commands array (Selected)

Single shape — mechanism is two `buildInstruction` entries in `lib/slash-commands.ts`. No UI changes, no new tools, no new types.

| Part | Mechanism |
|------|-----------|
| **A1** | `/plan` slash command entry with `buildInstruction` that instructs Claude to: scan history for discussed plans/objectives/NPC intel, prefill via `setOperationState(phase: "planning")`, then continue conversationally |
| **A2** | `/plan` re-invocation handling: if `operationState` already exists and `phase === "planning"`, the instruction tells Claude to present a structured confirmation and transition to `phase: "active"` |
| **A3** | `/plan` proactive transition: instruction includes guidance for Claude to suggest confirmation when the plan feels complete, or respond to keywords like "let's go", "execute", "ready" |
| **A4** | `/explore` slash command entry with `buildInstruction` that instructs Claude to: assess the current location, pick appropriate granularity, and call `setExplorationState` with zones mapped from narrative context |
| **A5** | `/explore` scale adaptation: instruction tells Claude to pick granularity based on context — rooms for buildings/dungeons, districts for cities, terrain features for wilderness |

## Fit Check: R × A

| Req | Requirement | Status | A |
|-----|-------------|--------|---|
| R0 | `/plan` initiates operation planning mode via `setOperationState` | Core goal | ✅ |
| R1 | `/explore` activates spatial exploration via `setExplorationState` | Core goal | ✅ |
| R2 | `/plan` scans history and prefills from discussed plans, NPC dialogue, established facts | Must-have | ✅ |
| R3 | Planning mode is conversational, not forced Q&A | Must-have | ✅ |
| R4 | Transition via proactive suggestion, keywords, or `/plan` re-invocation | Must-have | ✅ |
| R5 | `/explore` works at any scale with context-appropriate granularity | Must-have | ✅ |
| R6 | Integrates into existing slash command system | Must-have | ✅ |
| R7 | `buildInstruction` detailed enough for reliable tool calls | Must-have | ✅ |

**Notes:**
- R2/R3 satisfied by instruction text — Claude already has full conversation history in context, the instruction just directs it to extract and prefill
- R4 satisfied by A2 (explicit re-invocation) + A3 (proactive + keyword detection), all encoded in the instruction
- R7 depends on instruction quality — see implementation details below

---

## Implementation

### V1 — `/plan` and `/explore` slash commands

**Single file change:** `lib/slash-commands.ts`

#### `/plan` — buildInstruction

```typescript
{
  name: 'plan',
  description: 'Enter operation planning mode',
  args: '[objective]',
  buildInstruction: (args) => {
    const hasArgs = args.trim().length > 0
    return `PLAYER COMMAND: /plan${hasArgs ? ` ${args}` : ''}

Check OPERATION STATE in the current game state.

**If no operation is active (operationState is null):**
Enter planning mode. ${hasArgs ? `The player's stated objective: "${args}".` : 'The player wants to plan their next move.'}

1. Scan recent conversation history — player statements, NPC dialogue, established facts, known threats, available assets. Extract anything relevant to the upcoming operation.

2. Call update_world with setOperationState to initialize the plan:
   - name: a short evocative operation name based on the objective
   - phase: "planning"
   - objectives: prefill from what's already been discussed (if anything). ${hasArgs ? `Primary objective: "${args}".` : 'Ask the player what the primary objective is if unclear.'}
   - tacticalFacts: any relevant intel from recent history (NPC info, scouted locations, known guard patterns, etc.)
   - assetConstraints: known capabilities and limitations of the party/crew
   - abortConditions: leave empty for now — discuss with player
   - signals: leave empty for now — discuss with player
   - assessments: flag any uncertain facts from history as unrolled assessments

3. Present what you've gathered conversationally: "Here's what I've pieced together..." Show the prefilled plan naturally, then ask what's missing or wrong. Do NOT use a rigid Q&A format — let the player guide the discussion.

4. As the player refines the plan through conversation, update operationState with each significant change.

5. When the plan feels complete (objectives clear, key risks addressed, abort conditions set), proactively suggest: "Ready to commit to this plan?" Also watch for player keywords like "let's go", "execute", "ready", "do it".

**If an operation is already in planning phase:**
The player is signaling they're ready to execute. Present a structured confirmation:

"**Operation: [name]**
- **Objectives:** [list]
- **Assets:** [list]
- **Abort conditions:** [list]
- **Signals:** [list]
- **Unresolved:** [any flagged assessments]"

Ask for final confirmation. On confirmation, update operationState phase to "active" (or "pre-insertion" if there's a setup phase). Then narrate the transition into action.

**If an operation is already active/in-progress:**
Tell the player the current operation status and ask if they want to update objectives or abort.`
  },
},
```

#### `/explore` — buildInstruction

```typescript
{
  name: 'explore',
  description: 'Activate exploration mode',
  args: '[location]',
  buildInstruction: (args) => {
    const hasArgs = args.trim().length > 0
    return `PLAYER COMMAND: /explore${hasArgs ? ` ${args}` : ''}

The player wants to explore ${hasArgs ? `"${args}"` : 'their current surroundings'}.

Check EXPLORATION STATE in the current game state.

**If no exploration is active:**
Activate spatial exploration mode. Based on the current location and narrative context, call update_world with setExplorationState:

1. Assess the scale of what's being explored and pick appropriate granularity:
   - **Building/dungeon/facility:** Map room by room or section by section
   - **City/town/settlement:** Map by district, neighborhood, or quarter
   - **Wilderness/overworld:** Map by terrain feature, landmark, or trail
   - **Single large room/area:** Map by notable features, corners, or sub-areas
   ${hasArgs ? `The player specifically wants to explore "${args}" — use that as the focus.` : 'Use the current location from game state as the starting point.'}

2. Set the exploration state:
   - facilityName: name of the area being explored
   - status: overall situation (e.g. "unexplored", "hostile, guards present", "quiet, abandoned")
   - current: the zone the player is in right now (name + description with layout, exits, features)
   - explored: empty (just starting)
   - unexplored: 2-5 zones the player can sense or infer from their current position (name + sensory hints — sounds, light, smells, visible paths). Don't reveal what's inside, just what can be perceived.
   - resources: any trackable resources relevant to the exploration (torches, time, alert level, etc.)
   - alertLevel: if applicable (hostile territory, stealth situation)

3. Narrate the moment of shifting into exploration mode — the player pauses, takes stock of their surroundings. Describe what they can see, hear, and sense. End with the available directions/zones.

4. Call suggest_actions with exploration-appropriate options (investigate current area, move to [zone], search for [thing], etc.)

**If exploration is already active:**
${hasArgs ? `The player wants to explore "${args}" specifically. Check if it matches an unexplored zone. If yes, transition to that zone — update current, move the old current to explored, and describe the new area. If no match, treat it as investigating something in the current zone.` : 'Show the current exploration status: where they are, what they\'ve explored, what remains. Ask what they want to investigate or where they want to go next.'}`
  },
},
```

---

## File Change Summary

| File | Change |
|------|--------|
| `lib/slash-commands.ts` | Add `/plan` and `/explore` entries to `slashCommands` array |
