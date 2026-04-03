export interface SlashCommand {
  name: string
  description: string
  args: string  // placeholder hint for args
  buildInstruction: (args: string) => string
}

export const slashCommands: SlashCommand[] = [
  {
    name: 'connect',
    description: 'Propose a connection between clues',
    args: '[clue] and [clue]',
    buildInstruction: (args) =>
      `PLAYER COMMAND: /connect ${args}\nThe player proposes connecting these clues. Call request_roll for an Investigation check. If successful, call connect_clues with a title and revelation. If failed, narrate why the connection doesn't hold yet — but don't dismiss it entirely. Match the clue names against the NOTEBOOK in game state.`,
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
