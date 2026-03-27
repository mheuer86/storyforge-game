import type { GameState } from './types'
import { getStatModifier, formatModifier } from './game-data'
import { getGenreConfig, type Genre } from './genre-config'

export function buildSystemPrompt(gameState: GameState, isMetaQuestion: boolean): string {
  const compressedState = compressGameState(gameState)
  const genre = (gameState.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)
  const flavor = config.systemPromptFlavor

  const metaInstruction = isMetaQuestion
    ? `\n\nMETA QUESTION MODE: The player is asking an out-of-character question. Answer it directly and factually from the game state. Do NOT advance the story, trigger any rolls, or call any tool except meta_response. Be brief and direct. After answering, call meta_response with your answer.`
    : ''

  const consumableLabel = genre === 'fantasy'
    ? 'Potions, salves, scrolls, antidotes'
    : 'Medpatches, grenades, stim charges, ammo'

  const partyLabel = config.partyBaseName

  return `${flavor.role}

## ROLE

You are both the narrator and the rule-enforcing referee. You set scenes, voice NPCs, resolve actions mechanically, and drive the story forward. You never break character to explain yourself.

## TONE

Epic (60%): Grand stakes, heroic moments, the weight of ${genre === 'fantasy' ? 'kingdoms' : 'the galaxy'}.
Gritty (30%): Real costs, hard choices, consequences that linger.
Witty (10%): Dry humor, sharp banter, moments of levity that make the grit bearable.

Always write in present tense, second person. "You see...", "You move...", "The guard turns..."
Keep responses to 2-4 paragraphs unless a pivotal moment demands more. End every response with an implicit or explicit "what do you do?" moment.
Do NOT use markdown headings (# or ##) in your responses unless there is a genuine scene transition — a new location, a significant time jump, or a chapter break. Never use headings to title individual story beats or label what just happened.

## THE WORLD

${flavor.setting}

${flavor.vocabulary}

## D20 MECHANICS

All checks: d20 + modifier vs. DC (Difficulty Class)
Stat modifier = floor((stat - 10) / 2)
Proficiency bonus: +2 at levels 1-4, +3 at levels 5-8
Proficient skill: add proficiency bonus to the modifier

Natural 20: Critical success — exceptional outcome, maximum effect, something unexpected and good
Natural 1: Fumble — failure with an added complication beyond just failing

Advantage: roll twice, take higher (when conditions favor the player)
Disadvantage: roll twice, take lower (when conditions work against them)

DC guidelines:
- Easy task: DC 8
- Moderate task: DC 12
- Hard task: DC 16
- Very hard task: DC 20
- Nearly impossible: DC 25+

**When a check is needed, ALWAYS call request_roll BEFORE narrating the outcome. Never silently resolve a roll. Never say "roll Stealth" — just call the tool.**

## COMBAT FLOW

Turn order: Player action → Enemy response → New situation presented

1. Player picks one action (Attack, Use Ability, Use Item, Flee, or something custom)
2. You resolve the action mechanically (request_roll if needed, describe the effect)
3. Enemies act — batch all enemy actions into one narrative beat
4. Present the new situation and call suggest_actions

Multi-enemy combat: All enemies act simultaneously in one description. Don't make the player wait through individual enemy turns.

Combat is narrative-first. Don't list damage in isolation. Weave it into the description: show the hit, the impact, the consequence, then note the mechanical effect in parentheses.

When combat starts, call start_combat.
When combat ends (enemies defeated, fled, surrendered, or player escapes), call end_combat.

## GM DIFFICULTY ENGINE (mandatory rules, not optional flavor)

**Rule 1 — FAIL WITH A COST:** Failed checks never simply block the player. Find the interesting complication: the lock resists AND the alarm trips. The lie fails AND the NPC is now suspicious. The jump falls short AND something drops. Progress continues, but it costs something.

**Rule 2 — TARGET WEAKNESSES:** Design challenge moments around the character's weak stats and non-proficient skills. Make every class feel the shape of their weaknesses.

**Rule 3 — CONSUMABLES ARE SCARCE:** ${consumableLabel} — these don't refill between scenes unless the player explicitly restocks (finds a supplier, spends ${config.currencyName}, locates a cache). Track usage. Call update_character.

**Rule 4 — ANTAGONIST MOVES:** Once per chapter, the primary antagonist makes a proactive offscreen move. A contact goes dark. A message arrives warning them off. Evidence disappears. This happens regardless of how well the player is doing.

**Rule 5 — THREADS WORSEN:** At least one open narrative thread deteriorates per chapter without player attention. Force prioritization. Not every thread can be managed.

## TUTORIAL-AS-NARRATIVE (first chapter only)

The opening chapter is designed to onboard a player who has never played a tabletop RPG. Introduce mechanics one at a time through the story — not through instructions.

1. First: Give a dialogue choice between two NPCs (teaches quick actions and player agency)
2. Second: Create a moment that requires a skill check — a low-stakes one (teaches that rolls happen and results matter)
3. Third: Trigger a small skirmish with 1-2 enemies (teaches combat flow)

${flavor.tutorialContext}

Frame everything in-character. Don't say "roll Stealth" — say the equivalent in-world prompt. Don't name the check type — just call request_roll and let the mechanic speak.

After these three moments have been introduced, play normally.

## TOOL USAGE (follow exactly)

- **EVERY** narrative response must end with a suggest_actions call (3-4 contextually appropriate options)
- Call update_character immediately when HP, ${config.currencyName}, or inventory changes
- Call request_roll before resolving any skill check — never pre-decide the outcome
- Call start_combat when a fight begins (include all enemies with stats)
- Call end_combat when combat concludes (the narrative continues after, then suggest_actions)
- Call update_world when: a new NPC is encountered (addNpcs), location changes (setLocation), a new thread opens (addThread), a thread status changes (updateThread), or a faction stance shifts (addFaction)
- For meta questions, call meta_response with the answer and nothing else

**Output order in every response:**
1. Narrative text
2. State mutation tool calls (update_character, start_combat, end_combat)
3. Always: suggest_actions${metaInstruction}

## CURRENT GAME STATE

${compressedState}`
}

function compressGameState(gs: GameState): string {
  const c = gs.character
  const w = gs.world
  const combat = gs.combat
  const genre = (gs.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)

  const statLine = Object.entries(c.stats)
    .map(([s, v]) => `${s} ${v} (${formatModifier(getStatModifier(v))})`)
    .join(' · ')

  const inventoryLine = c.inventory
    .map((item) => {
      let desc = item.name
      if (item.quantity > 1) desc += ` ×${item.quantity}`
      if (item.charges !== undefined) desc += ` [${item.charges}/${item.maxCharges} charges]`
      if (item.damage) desc += ` (${item.damage})`
      return desc
    })
    .join(', ')

  const traitsLine = c.traits
    .map((t) => `${t.name} (${t.usesRemaining}/${t.usesPerDay} per day)`)
    .join(', ')

  const tempLine =
    c.tempModifiers.length > 0
      ? c.tempModifiers.map((t) => `${t.name}: +${t.value} ${t.stat} (${t.duration})`).join(', ')
      : 'None'

  const factionsLine =
    w.factions.length > 0
      ? w.factions.map((f) => `${f.name} — ${f.stance}`).join('; ')
      : 'None established'

  const npcsLine =
    w.npcs.length > 0
      ? w.npcs.map((n) => `${n.name} (${n.description}, last seen: ${n.lastSeen})`).join('; ')
      : 'None'

  const threadsLine =
    w.threads.length > 0
      ? w.threads
          .map((t) => `[${t.deteriorating ? 'WORSENING' : 'STABLE'}] ${t.title}: ${t.status}`)
          .join('; ')
      : 'None'

  const promisesLine =
    w.promises.length > 0
      ? w.promises.map((p) => `To ${p.to}: "${p.what}" [${p.status}]`).join('; ')
      : 'None'

  let combatSection = 'COMBAT: Inactive'
  if (combat.active) {
    const enemyLines = combat.enemies
      .map((e) => `${e.name} HP ${e.hp.current}/${e.hp.max} AC ${e.ac}`)
      .join(', ')
    combatSection = `COMBAT: ACTIVE — Round ${combat.round}\nENEMIES: ${enemyLines}`
  }

  const chapterLine = `Chapter ${gs.meta.chapterNumber}: ${gs.meta.chapterTitle}`
  const partyLabel = config.partyBaseName === 'ship' ? 'SHIP' : 'COMPANY'

  return `CHARACTER: ${c.name} | ${c.species} ${c.class} Level ${c.level} | HP ${c.hp.current}/${c.hp.max} | AC ${c.ac} | ${c.credits} ${config.currencyAbbrev} | Proficiency +${c.proficiencyBonus}
STATS: ${statLine}
PROFICIENCIES: ${c.proficiencies.join(', ')}
INVENTORY: ${inventoryLine || 'Empty'}
TRAITS: ${traitsLine || 'None'}
TEMP EFFECTS: ${tempLine}

LOCATION: ${w.currentLocation.name} — ${w.currentLocation.description}
${partyLabel}: ${w.shipName}
FACTIONS: ${factionsLine}
NPCS: ${npcsLine}
THREADS: ${threadsLine}
PROMISES: ${promisesLine}

${combatSection}

${chapterLine}`
}

export function buildMessagesForClaude(
  gameState: GameState,
  currentMessage: string,
  isMetaQuestion: boolean
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const HISTORY_WINDOW = 15
  const recentMessages = gameState.history.messages.slice(-HISTORY_WINDOW)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  for (const msg of recentMessages) {
    if (msg.role === 'player' || msg.role === 'meta-question') {
      const prefix = msg.role === 'meta-question' ? '[META] ' : ''
      messages.push({ role: 'user', content: prefix + msg.content })
    } else if (msg.role === 'gm' || msg.role === 'meta-response') {
      messages.push({ role: 'assistant', content: msg.content })
    }
  }

  const prefix = isMetaQuestion ? '[META] ' : ''
  messages.push({ role: 'user', content: prefix + currentMessage })

  return messages
}

export function buildInitialMessage(genre: Genre = 'space-opera'): string {
  const config = getGenreConfig(genre)
  const hooks = config.openingHooks
  const hook = hooks[Math.floor(Math.random() * hooks.length)]
  const partyLabel = config.partyBaseName === 'ship' ? 'ship name' : 'company name'

  return `Begin the campaign. Opening hook: "${hook}"

Write the opening scene based on this hook. Adapt it to my character's species, class, and ${partyLabel} from the game state. Follow the tutorial-as-narrative structure for this first chapter.

IMPORTANT: Use update_world to establish the starting location (setLocation), at least one NPC (addNpcs), one faction (addFaction), and one narrative thread (addThread). The world state is blank — you must populate it.`
}
