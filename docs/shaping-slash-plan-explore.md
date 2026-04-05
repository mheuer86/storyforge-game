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
| R2 | `/plan` scans recent history (player actions, NPC dialogue, established facts) and DECISIONS in game state, then prefills objectives, tactical facts, and constraints from what's already been discussed | Must-have |
| R3 | Planning mode is conversational — player refines through dialogue, not forced Q&A | Must-have |
| R4 | Transition from planning to execution: Claude suggests confirmation proactively when the plan feels complete, responds to keywords ("let's go", "execute"), or player can type `/plan` again to explicitly trigger the transition | Must-have |
| R5 | `/explore` works at any scale — Claude picks granularity appropriate to context (rooms in a dungeon, districts in a city, terrain features in wilderness) and maps the surrounding explorable area | Must-have |
| R6 | Both commands integrate into existing slash command system (`lib/slash-commands.ts`) | Must-have |
| R7 | `buildInstruction` is detailed enough that Claude reliably produces the correct tool calls | Must-have |
| R8 | `/explore` in non-hostile territory does NOT trigger infiltration mechanics — exploration context is distinct from infiltration context | Must-have |
| R9 | Both commands have explicit exit paths (`/plan abort`, `/explore done`) | Must-have |
| R10 | `/plan` with no args and no prior context surveys the scene and proposes, rather than asking the player to state an objective | Must-have |

---

## Shape A: Slash commands + context detection fix (Selected)

Two parts: (1) slash command entries in `lib/slash-commands.ts`, and (2) a small fix to `detectContext()` in `lib/system-prompt.ts` so exploration doesn't always trigger infiltration.

| Part | Mechanism |
|------|-----------|
| **A1** | `/plan` slash command entry with `buildInstruction` that instructs Claude to: scan history + DECISIONS for discussed plans/objectives/NPC intel, prefill via `setOperationState(phase: "planning")`, then continue conversationally. Does not duplicate rules from the Planning situation module — that module loads automatically when `operationState` exists. |
| **A2** | `/plan` re-invocation handling: if `operationState` already exists and `phase === "planning"`, the instruction tells Claude to present a structured confirmation and transition to `phase: "active"` |
| **A3** | `/plan` proactive transition: instruction includes guidance for Claude to suggest confirmation when the plan feels complete, or respond to keywords like "let's go", "execute", "ready" |
| **A4** | `/plan abort`: recognized arg that tells Claude to clear `operationState` and narrate stepping back from the plan |
| **A5** | `/plan` no-args without context: instruction tells Claude to survey the current situation — threats, opportunities, NPC intel, open threads — and propose what seems plannable, rather than asking the player to state an objective |
| **A6** | `/explore` slash command entry with `buildInstruction` that instructs Claude to: assess the current location, pick appropriate granularity, and call `setExplorationState` with zones mapped from narrative context. Sets `hostile: true/false` based on context. |
| **A7** | `/explore` scale adaptation: instruction tells Claude to pick granularity based on context — rooms for buildings/dungeons, districts for cities, terrain features for wilderness |
| **A8** | `/explore done`: recognized arg that tells Claude to clear `explorationState` and narrate transitioning out of exploration mode |
| **A9** | Context detection fix in `detectContext()`: `explorationState` only triggers infiltration if `explorationState.hostile === true`. Non-hostile exploration stays in social context with spatial tracking active. |

## Fit Check: R × A

| Req | Requirement | A |
|-----|-------------|---|
| R0 | `/plan` initiates operation planning mode via `setOperationState` | A1 ✅ |
| R1 | `/explore` activates spatial exploration via `setExplorationState` | A6 ✅ |
| R2 | `/plan` scans history and prefills from discussed plans, NPC dialogue, established facts | A1 ✅ |
| R3 | Planning mode is conversational, not forced Q&A | A1, A5 ✅ |
| R4 | Transition via proactive suggestion, keywords, or `/plan` re-invocation | A2, A3 ✅ |
| R5 | `/explore` works at any scale with context-appropriate granularity | A7 ✅ |
| R6 | Integrates into existing slash command system | A1, A6 ✅ |
| R7 | `buildInstruction` detailed enough for reliable tool calls | A1, A6 ✅ |
| R8 | `/explore` non-hostile doesn't trigger infiltration | A6, A9 ✅ |
| R9 | Explicit exit paths | A4, A8 ✅ |
| R10 | `/plan` no-args surveys and proposes | A5 ✅ |

**Notes:**
- R2/R3 satisfied by instruction text — Claude already has full conversation history in context, the instruction just directs it to extract and prefill
- R4 satisfied by A2 (explicit re-invocation) + A3 (proactive + keyword detection), all encoded in the instruction
- R7 depends on instruction quality — see implementation details below
- R8 requires a type change: `ExplorationState` needs a `hostile` boolean
- R9 uses arg parsing within the buildInstruction, not new slash command entries — keeps the command list compact

---

## Architecture note: exploration ≠ infiltration

**Current behavior (broken):** `detectContext()` in `system-prompt.ts` line 705 treats any `explorationState` as infiltration:

```typescript
if (gs.world.explorationState) return 'infiltration'
```

This means exploring a friendly city market loads infiltration rules ("every movement past a detection layer is a potential check", escalation model, cover identity DCs). That's wrong.

**Fix:** Add `hostile: boolean` to `ExplorationState`. The `/explore` instruction tells Claude to assess hostility from context (enemy territory, stealth required, active threats → hostile; friendly town, open wilderness, safe zones → not hostile). Then `detectContext()` checks:

```typescript
if (gs.world.explorationState?.hostile) return 'infiltration'
// non-hostile exploration stays in social context — spatial tracking
// still works via explorationState, just without stealth/detection pressure
```

Non-hostile exploration gets social module behavior (NPC texture, dialogue, character moments) while still tracking zones, resources, and movement via `explorationState`. The player can transition to hostile mid-exploration if things go south — Claude updates `hostile: true` and the next turn loads infiltration.

**Type change:** `ExplorationState` in `lib/types.ts` gains `hostile: boolean`.

---

## Implementation

### V1 — `/plan` and `/explore` slash commands

**File changes:**
1. `lib/slash-commands.ts` — add `/plan` and `/explore` entries
2. `lib/types.ts` — add `hostile: boolean` to `ExplorationState`
3. `lib/system-prompt.ts` — fix `detectContext()` to check `explorationState.hostile`

#### `/plan` — buildInstruction

```typescript
{
  name: 'plan',
  description: 'Enter operation planning mode',
  args: '[objective] or "abort"',
  buildInstruction: (args) => {
    const trimmed = args.trim().toLowerCase()

    if (trimmed === 'abort' || trimmed === 'cancel') {
      return `PLAYER COMMAND: /plan abort

The player wants to abandon the current plan. Call update_world with setOperationState: null to clear the operation state. Narrate stepping back — the plan is shelved, not failed. The situation remains as it was. Suggest what's next.`
    }

    const hasArgs = args.trim().length > 0
    return `PLAYER COMMAND: /plan${hasArgs ? ` ${args}` : ''}

Check OPERATION STATE in the current game state.

**If no operation is active (operationState is null):**
Enter planning mode. ${hasArgs
  ? `The player's stated objective: "${args}".`
  : `The player wants to plan but hasn't stated a specific objective. Survey the current situation: active threats, open threads, NPC intel, recent events, and DECISIONS in game state. Propose what seems plannable: "Based on what you know — [summary of situation] — the most pressing move seems to be [proposal]. Want to plan around that, or something else?" This is a suggestion, not a commitment.`}

1. Scan recent conversation history — player statements, NPC dialogue, established facts, known threats, available assets. Also check DECISIONS in game state for active choices that affect the operation (trust, alliances, resource commitments). Extract anything relevant to the upcoming operation.

2. Call update_world with setOperationState to initialize the plan:
   - name: a short evocative operation name based on the objective
   - phase: "planning"
   - objectives: prefill from what's already been discussed (if anything). ${hasArgs ? `Primary objective: "${args}".` : 'Primary objective from your proposal, if accepted.'}
   - tacticalFacts: any relevant intel from recent history (NPC info, scouted locations, known guard patterns, etc.). Include relevant active decisions.
   - assetConstraints: known capabilities and limitations of the party/crew
   - abortConditions: leave empty for now — discuss with player
   - signals: leave empty for now — discuss with player
   - assessments: flag any uncertain facts from history as unrolled assessments

Note: once operationState exists, the system prompt automatically loads the Planning situation module with detailed behavioral rules. This instruction only needs to trigger the mode and prefill — the module handles the rest.

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
  args: '[location] or "done"',
  buildInstruction: (args) => {
    const trimmed = args.trim().toLowerCase()

    if (trimmed === 'done' || trimmed === 'exit' || trimmed === 'leave') {
      return `PLAYER COMMAND: /explore done

The player is done exploring. Call update_world with setExplorationState: null to clear the exploration state. Narrate the transition — the player steps back from detailed exploration, takes stock of where they are, and returns to the broader scene. Summarize what was discovered during exploration (zones visited, resources found, threats identified).`
    }

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

2. **Assess hostility** from context and set the hostile flag:
   - **hostile: true** — enemy territory, active threats, stealth required, infiltrating a guarded location, behind enemy lines. **Also true if an active operation is in progress** (operationState with phase "active" or "extraction") — ops imply risk.
   - **hostile: false** — friendly town, open wilderness, crime scene under investigation, safe zones, social exploration, shopping district, ally territory. No active operation, or operation is still in planning phase.
   This flag determines whether the system loads infiltration rules (detection layers, escalation, cover identities) or social rules (NPC texture, dialogue, character moments). Get it right — a detective examining a crime scene shouldn't feel like infiltrating a base.

3. Set the exploration state:
   - facilityName: name of the area being explored
   - status: overall situation (e.g. "unexplored", "hostile, guards present", "quiet, abandoned", "busy market district")
   - hostile: true or false (from assessment above)
   - current: the zone the player is in right now (name + description with layout, exits, features)
   - explored: empty (just starting)
   - unexplored: 2-5 zones the player can sense or infer from their current position (name + sensory hints — sounds, light, smells, visible paths). Don't reveal what's inside, just what can be perceived.
   - resources: any trackable resources relevant to the exploration (torches, time, alert level, etc.)
   - alertLevel: if applicable (hostile territory, stealth situation). Omit for friendly exploration.

4. Narrate the moment of shifting into exploration mode — the player pauses, takes stock of their surroundings. Describe what they can see, hear, and sense. End with the available directions/zones.

5. Call suggest_actions with exploration-appropriate options (investigate current area, move to [zone], search for [thing], talk to [NPC in zone], etc.)

Note: once explorationState is set, the system prompt automatically loads the appropriate situation module — infiltration for hostile, social for non-hostile. Spatial tracking works in both. This instruction only needs to initialize the state.

**If exploration is already active:**
${hasArgs ? `The player wants to explore "${args}" specifically. Check if it matches an unexplored zone. If yes, transition to that zone — update current, move the old current to explored, and describe the new area. If no match, treat it as investigating something in the current zone.` : 'Show the current exploration status: where they are, what they\'ve explored, what remains. Ask what they want to investigate or where they want to go next.'}

**Hostility can change mid-exploration.** If the player triggers an alarm, gets caught, or enters hostile territory from a safe zone, update hostile to true via update_world. The next turn will load infiltration rules automatically. Likewise, if the player clears a threat or reaches safety, update hostile to false.`
  },
},
```

#### `detectContext()` fix — system-prompt.ts

```typescript
// Current (broken):
if (gs.world.explorationState) return 'infiltration'

// Fixed:
if (gs.world.explorationState?.hostile) return 'infiltration'
// Non-hostile exploration stays in social context with spatial tracking
```

#### `ExplorationState` type change — types.ts

```typescript
// Add to ExplorationState interface:
hostile: boolean  // true = infiltration rules, false = social rules with spatial tracking
```

---

## File Change Summary

| File | Change |
|------|--------|
| `lib/slash-commands.ts` | Add `/plan` and `/explore` entries to `slashCommands` array |
| `lib/types.ts` | Add `hostile: boolean` to `ExplorationState` |
| `lib/system-prompt.ts` | Fix `detectContext()` to check `explorationState.hostile` instead of `explorationState` |

---

## Decisions

**Active operations auto-set hostile.** If `operationState` exists and phase is `active` or `extraction`, `/explore` sets `hostile: true` regardless of the location description. Operations imply risk. The player can override by explicitly saying the area is safe, but the default assumption is: if you're on an op, exploration is tense.

**Non-hostile exploration is a real mode.** A noir detective exploring a crime scene, a fantasy ranger surveying a forest, a diplomat walking through a foreign city — these are spatial, structured, but not hostile. The social module handles them adequately: NPC texture, dialogue, character moments all apply. The pacing rule ("if social scenes exceed 15 turns, push toward action") works here too — exploration shouldn't be aimless.

No new module needed. Social + explorationState is the right combination for non-hostile exploration.
