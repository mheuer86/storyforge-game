import type { GameState, CharacterState, WorldState, InventoryItem, Trait } from './types'

export type Genre = 'space-opera' | 'fantasy' | 'cyberpunk' | 'western'

export interface Species {
  id: string
  name: string
  description: string
  lore: string
}

export interface CharacterClass {
  id: string
  name: string
  concept: string
  primaryStat: string
  proficiencies: string[]
  stats: {
    STR: number
    DEX: number
    CON: number
    INT: number
    WIS: number
    CHA: number
  }
  startingInventory: InventoryItem[]
  startingCredits: number
  startingHp: number
  startingAc: number
  trait: Trait
}

export const STORAGE_KEY = 'storyforge_gamestate'

export const genres: { id: Genre; name: string; available: boolean }[] = [
  { id: 'space-opera', name: 'Space Opera', available: true },
  { id: 'fantasy', name: 'Fantasy', available: false },
  { id: 'cyberpunk', name: 'Cyberpunk', available: false },
  { id: 'western', name: 'Western', available: false },
]

export const tonePresets = [
  { id: 'epic', name: 'Epic', description: 'Grand stakes, heroic moments' },
  { id: 'gritty', name: 'Gritty', description: 'Harsh realities, tough choices' },
  { id: 'witty', name: 'Witty', description: 'Humor, banter, clever twists' },
]

export const species: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, widespread, politically dominant in most systems.',
    lore: 'No special traits — their versatility is the trait. NPCs rarely react to a human with surprise.',
  },
  {
    id: 'vrynn',
    name: 'Vrynn',
    description: 'Insectoid. Chitinous plating, compound eyes, darkvision.',
    lore: 'Uncommon in core systems; often assumed to be from the outer Rim. Tend to unsettle species that rely on facial expressions for trust.',
  },
  {
    id: 'korath',
    name: 'Korath',
    description: 'Broad, dense-boned, grey-skinned. Built for heavy gravity worlds.',
    lore: 'Known for blunt honesty and engineering talent. Respected in industrial sectors, underestimated in diplomacy.',
  },
  {
    id: 'sylphari',
    name: 'Sylphari',
    description: 'Tall, luminescent markings, low-light adapted.',
    lore: 'Originally from tidally locked worlds. Reputation as scholars and mediators, but their calm demeanor is often mistaken for passivity.',
  },
  {
    id: 'zerith',
    name: 'Zerith',
    description: 'Lean, scaled, cold-blooded. Fast reflexes, poor endurance in sustained cold.',
    lore: 'Culturally decentralized; no homeworld loyalty. Often found in mercenary or freelance roles. Trusted by few, which suits most of them fine.',
  },
]

export const characterClasses: CharacterClass[] = [
  {
    id: 'driftrunner',
    name: 'Driftrunner',
    concept: 'Smuggler / Infiltrator',
    primaryStat: 'DEX',
    proficiencies: ['Stealth', 'Sleight of Hand', 'Piloting', 'Hacking'],
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    startingInventory: [
      { id: 'pulse_pistol', name: 'Pulse Pistol', description: 'Standard sidearm', quantity: 1, damage: '1d8 energy' },
      { id: 'vibro_knife', name: 'Vibro-Knife', description: 'Compact blade with vibrating edge', quantity: 1, damage: '1d4+DEX' },
      { id: 'holo_cloak', name: 'Holo-Cloak', description: 'Advantage on Stealth checks', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'lockbreaker_kit', name: 'Lockbreaker Kit', description: 'Electronic lock bypass tools', quantity: 1 },
    ],
    startingCredits: 120,
    startingHp: 9,
    startingAc: 15,
    trait: {
      name: 'Slippery',
      description: 'Once per day, automatically succeed on escaping a grapple, restraint, or tight spot.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'vanguard',
    name: 'Vanguard',
    concept: 'Frontline Soldier / Tank',
    primaryStat: 'STR',
    proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Armor Systems'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
    startingInventory: [
      { id: 'plasma_rifle', name: 'Plasma Rifle', description: 'Heavy energy rifle', quantity: 1, damage: '1d10 energy' },
      { id: 'combat_shield', name: 'Combat Shield', description: '+2 AC when equipped', quantity: 1 },
      { id: 'frag_grenade', name: 'Frag Grenade', description: '2d6 damage, 15ft radius, DC 13 DEX save for half', quantity: 3 },
      { id: 'medpatch', name: 'Medpatch', description: 'Heals 1d6+2 HP when applied', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
    ],
    startingCredits: 80,
    startingHp: 12,
    startingAc: 16,
    trait: {
      name: 'Adrenaline Surge',
      description: 'Once per day, make a bonus attack immediately after a successful attack.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'technomancer',
    name: 'Technomancer',
    concept: 'Hacker / Tech Specialist',
    primaryStat: 'INT',
    proficiencies: ['Hacking', 'Investigation', 'Engineering', 'Xenotech'],
    stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'neural_jack', name: 'Neural Jack', description: '+3 to all Hacking checks', quantity: 1 },
      { id: 'shock_drone', name: 'Shock Drone', description: 'Remote attack drone', quantity: 1, damage: '1d6 shock, range 30ft' },
      { id: 'emp_grenade', name: 'EMP Grenade', description: 'Disables electronics in 20ft radius for 1 round', quantity: 2 },
      { id: 'repair_kit', name: 'Repair Kit', description: 'Fix mechanical and electronic devices', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 8,
    startingAc: 12,
    trait: {
      name: 'System Override',
      description: 'Once per day, auto-succeed on one hacking check or take control of a non-sentient machine for 1 minute.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'diplomat',
    name: 'Diplomat',
    concept: 'Face / Negotiator / Leader',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Insight', 'Galactic Lore'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 11, CHA: 17 },
    startingInventory: [
      { id: 'holdout_pistol', name: 'Holdout Pistol', description: 'Compact, concealable sidearm', quantity: 1, damage: '1d6 energy' },
      { id: 'personal_shield', name: 'Personal Shield', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'forged_credentials', name: 'Forged Credentials', description: 'Convincing ID for restricted areas', quantity: 1 },
      { id: 'comm_scrambler', name: 'Comm Scrambler', description: 'Block or redirect communications in range', quantity: 1 },
    ],
    startingCredits: 200,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'Silver Tongue',
      description: 'Once per day, reroll a failed CHA check and take the higher result. Also grants +2 to initial NPC disposition.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'medic',
    name: 'Medic',
    concept: 'Field Doctor / Survivalist',
    primaryStat: 'WIS',
    proficiencies: ['Medicine', 'Perception', 'Survival', 'Xenobiology'],
    stats: { STR: 10, DEX: 13, CON: 14, INT: 13, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'stun_pistol', name: 'Stun Pistol', description: 'Non-lethal, DC 12 CON save or stunned 1 round', quantity: 1, damage: '1d6 stun' },
      { id: 'med_suite', name: 'Med-Suite', description: 'Advanced medical kit — heals 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
      { id: 'antitox_kit', name: 'Antitox Kit', description: 'Neutralize poisons and toxins', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'bioscanner', name: 'Bioscanner', description: 'Detailed health and biology readouts', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 10,
    startingAc: 13,
    trait: {
      name: 'Triage',
      description: 'Once per day, stabilize an ally or gain advantage on Medicine checks as a bonus action.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'ace',
    name: 'Ace',
    concept: 'Pilot / Sharpshooter',
    primaryStat: 'DEX',
    proficiencies: ['Piloting', 'Sharpshooting', 'Acrobatics', 'Mechanics'],
    stats: { STR: 10, DEX: 16, CON: 13, INT: 12, WIS: 13, CHA: 11 },
    startingInventory: [
      { id: 'sniper_blaster', name: 'Sniper Blaster', description: 'Long-range precision rifle', quantity: 1, damage: '1d10 energy, range 120ft' },
      { id: 'sidearm', name: 'Sidearm', description: 'Reliable close-range backup', quantity: 1, damage: '1d6 energy' },
      { id: 'flight_suit', name: 'Flight Suit', description: '+1 AC, sealed for vacuum', quantity: 1 },
      { id: 'grapple_launcher', name: 'Grapple Launcher', description: 'Fires a retractable anchor line, 60ft range', quantity: 1 },
    ],
    startingCredits: 90,
    startingHp: 10,
    startingAc: 14,
    trait: {
      name: 'Dead Eye',
      description: 'Once per day, treat one ranged attack as a critical hit (on a 19-20). Also has vehicle expertise: advantage on all piloting checks.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

export function getStatModifier(value: number): number {
  return Math.floor((value - 10) / 2)
}

export function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`
}

export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2
  if (level <= 8) return 3
  if (level <= 12) return 4
  return 5
}

export function createInitialGameState(
  characterName: string,
  speciesId: string,
  classId: string,
): GameState {
  const selectedClass = characterClasses.find((c) => c.id === classId)
  const selectedSpecies = species.find((s) => s.id === speciesId)

  if (!selectedClass || !selectedSpecies) {
    throw new Error(`Invalid class (${classId}) or species (${speciesId})`)
  }

  const now = new Date().toISOString()

  const character: CharacterState = {
    name: characterName,
    species: selectedSpecies.name,
    class: selectedClass.name,
    level: 1,
    hp: { current: selectedClass.startingHp, max: selectedClass.startingHp },
    ac: selectedClass.startingAc,
    credits: selectedClass.startingCredits,
    stats: { ...selectedClass.stats },
    proficiencies: [...selectedClass.proficiencies],
    proficiencyBonus: getProficiencyBonus(1),
    inventory: selectedClass.startingInventory.map((item) => ({ ...item })),
    tempModifiers: [],
    traits: [{ ...selectedClass.trait }],
  }

  const world: WorldState = {
    shipName: 'The Last Meridian',
    currentLocation: {
      name: 'Station Orja-9',
      description: 'Fringe station at the edge of Accord space. Corrupt Docking Authority, black market bazaar.',
    },
    factions: [
      { name: 'Docking Authority', stance: 'Hostile — demanding 400 credits in "security fees"' },
      { name: 'Bazaar Merchants Guild', stance: 'Neutral — open for business' },
    ],
    npcs: [
      {
        name: 'Torr',
        description: 'Korath engineer, crew of the Last Meridian. Blunt, reliable.',
        lastSeen: 'Last Meridian engine bay',
        relationship: 'Crew member',
      },
    ],
    threads: [
      {
        id: 'docking_shakedown',
        title: 'Docking Authority Shakedown',
        status: '400 credits demanded or they clamp the ship',
        deteriorating: true,
      },
    ],
    promises: [],
  }

  return {
    meta: {
      version: '1.0',
      createdAt: now,
      lastSaved: now,
      chapterNumber: 1,
      chapterTitle: 'Trouble at Orja-9',
      genre: 'space-opera',
      sessionCount: 1,
    },
    character,
    world,
    combat: {
      active: false,
      round: 0,
      enemies: [],
      log: [],
    },
    history: {
      messages: [],
      chapters: [
        {
          number: 1,
          title: 'Trouble at Orja-9',
          status: 'in-progress',
          summary: '',
          keyEvents: [],
        },
      ],
      rollLog: [],
    },
  }
}

export function loadGameState(): GameState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as GameState
  } catch {
    return null
  }
}

export function saveGameState(state: GameState): void {
  if (typeof window === 'undefined') return
  const updated = { ...state, meta: { ...state.meta, lastSaved: new Date().toISOString() } }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
}

export function clearGameState(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}

// Legacy type kept for UI component compatibility
export interface ChatMessage {
  id: string
  type: 'gm' | 'player' | 'meta-question' | 'meta-response'
  content: string
  timestamp: Date
}
