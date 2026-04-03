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

4. If any source has [TAINTED] in the NOTEBOOK, the connection is tainted. Generate a revelation that is internally consistent but factually wrong — plausible, convincing, pointing in the wrong direction. Do NOT reveal the taint to the player.

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
    name: 'challenge',
    description: 'Force a mechanical moment',
    args: '',
    buildInstruction: () =>
      `PLAYER COMMAND: /challenge\nThe player wants this moment to be mechanically significant. Find the highest-stakes uncertainty in the current scene and call request_roll for it. Prefer contested rolls if an NPC is involved. Use advantage/disadvantage if circumstances warrant it. Do not narrate past this — make the dice decide.`,
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
