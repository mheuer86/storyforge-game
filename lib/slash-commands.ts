export interface SlashCommand {
  name: string
  description: string
  args: string  // placeholder hint for args
  buildInstruction: (args: string) => string
}

export const slashCommands: SlashCommand[] = [
  {
    name: 'connect',
    description: 'Propose a connection between evidence',
    args: '[item] and [item]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /connect ${args}
The player proposes connecting two items from their notebook. Match the names against NOTEBOOK in game state (items can be clues or existing connections).

1. Identify the combination type from the sources:
   - Clue + Clue → LEAD (opens a new line of inquiry)
   - Lead + Clue → ENRICHED LEAD (confirms or sharpens an existing inference)
   - Lead + Lead → BREAKTHROUGH (reframes the case — this is the big moment)
   - Breakthrough + anything → DEEPER BREAKTHROUGH (escalates stakes)

2. Call request_roll for an Investigation check. Set DC based on how obscure the connection is.

3. On success, call connect_clues with sourceIds (use the IDs from NOTEBOOK, not the names). Scale the revelation quality by combination type:
   - LEAD revelation: connects two facts into an inference. "The withdrawal and the manifest suggest she was moving something out." Player says "interesting."
   - ENRICHED LEAD revelation: confirms with new evidence. "The warehouse receipt confirms the financial trail — she wasn't just in debt, she was laundering." Player says "I knew it."
   - BREAKTHROUGH revelation: synthesizes across inference chains. "She wasn't fleeing — she was smuggling evidence of fraud, and the person who killed her hired you to find her." Player says "oh no."
   - DEEPER BREAKTHROUGH: extends the reframing. "The fraud goes higher. The magistrate who assigned you this case ordered the cover-up." Player says "what do I do now."

4. If any source has [TAINTED] in the NOTEBOOK, the connection is tainted. Generate a revelation that is internally consistent but factually wrong — plausible, convincing, pointing in the wrong direction. NEVER mention tainted, red herring, or any meta-information about clue quality in your response. The player must believe the false lead is real.

5. On failure, narrate why the connection doesn't hold yet — but don't dismiss it entirely.`,
  },
  {
    name: 'inspect',
    description: 'Actively examine something',
    args: '[target]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /inspect ${args}\nThe player wants to actively examine "${args}". Call request_roll for a Perception or Investigation check (your choice based on context). Reveal information proportional to the roll result. On success, call add_clue if new evidence is found.`,
  },
  {
    name: 'roll',
    description: 'Request a specific skill check',
    args: '[skill]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /roll ${args}\nThe player is requesting a ${args} check. Determine the appropriate stat, DC (or contested NPC), and reason, then call request_roll. Do not skip the roll or resolve it narratively.`,
  },
  {
    name: 'use',
    description: 'Use an item from inventory',
    args: '[item]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /use ${args}\nThe player wants to use "${args}" from their inventory. Narrate the usage and apply its mechanical effect. If the item has charges, update via update_character. Match the item name against GEAR in game state.`,
  },
  {
    name: 'clue',
    description: 'Flag something as evidence worth tracking',
    args: '[what you noticed]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /clue ${args}\nThe player believes "${args}" is significant evidence worth tracking. Evaluate whether it qualifies as a clue (meaningful information with investigative value). If yes, call add_clue with a descriptive title, the factual content, the source, and relevant tags. If the player is reaching, acknowledge their thinking but explain why it doesn't qualify as evidence yet — without dismissing it entirely.`,
  },
  {
    name: 'challenge',
    description: 'Force a mechanical moment',
    args: '',
    buildInstruction: () =>
      `PLAYER COMMAND: /challenge\nThe player wants this moment to be mechanically significant. Find the highest-stakes uncertainty in the current scene and call request_roll for it. Prefer contested rolls if an NPC is involved. Use advantage/disadvantage if circumstances warrant it. Do not narrate past this — make the dice decide.`,
  },
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
]

export function parseSlashCommand(input: string): { command: SlashCommand; args: string } | null {
  if (!input.startsWith('/')) return null
  const trimmed = input.slice(1).trim()
  const spaceIdx = trimmed.indexOf(' ')
  const name = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)
  const args = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim()

  const command = slashCommands.find(c => c.name === name.toLowerCase())
  if (!command) return null

  return { command, args }
}
