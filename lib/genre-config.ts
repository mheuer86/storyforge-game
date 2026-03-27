import type { InventoryItem, Trait } from './types'

// ─── Genre Config Interface ───────────────────────────────────────────

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

export interface GenreTheme {
  logo: string
  fontNarrative: string
  background: string
  foreground: string
  card: string
  cardForeground: string
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  border: string
  input: string
  ring: string
  narrative: string
  meta: string
  success: string
  warning: string
  titleGlow: string
  actionGlow: string
  actionGlowHover: string
  scrollbarThumb: string
  scrollbarThumbHover: string
  backgroundEffect: 'starfield' | 'mist'
}

export interface GenreConfig {
  id: Genre
  name: string
  available: boolean
  species: Species[]
  classes: CharacterClass[]
  theme: GenreTheme
  currencyName: string
  currencyAbbrev: string
  partyBaseName: string
  systemPromptFlavor: {
    role: string
    setting: string
    vocabulary: string
    tutorialContext: string
  }
  openingHooks: string[]
  initialChapterTitle: string
  locationNames: string[]
}

// ─── Space Opera ──────────────────────────────────────────────────────

const spaceOperaSpecies: Species[] = [
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

const spaceOperaClasses: CharacterClass[] = [
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

const spaceOperaTheme: GenreTheme = {
  logo: '/storyforge_logo.png',
  fontNarrative: 'var(--font-geist-mono), monospace',
  background: 'oklch(0.12 0.02 260)',
  foreground: 'oklch(0.92 0.01 90)',
  card: 'oklch(0.15 0.02 260)',
  cardForeground: 'oklch(0.92 0.01 90)',
  primary: 'oklch(0.72 0.15 195)',
  primaryForeground: 'oklch(0.12 0.02 260)',
  secondary: 'oklch(0.22 0.02 260)',
  secondaryForeground: 'oklch(0.85 0.01 90)',
  muted: 'oklch(0.18 0.015 260)',
  mutedForeground: 'oklch(0.55 0.01 90)',
  accent: 'oklch(0.72 0.15 195)',
  accentForeground: 'oklch(0.12 0.02 260)',
  destructive: 'oklch(0.55 0.2 25)',
  border: 'oklch(0.25 0.02 260)',
  input: 'oklch(0.2 0.02 260)',
  ring: 'oklch(0.72 0.15 195)',
  narrative: 'oklch(0.91 0.02 85)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  titleGlow: '0 0 40px oklch(0.72 0.15 195 / 0.8), 0 0 80px oklch(0.72 0.15 195 / 0.4)',
  actionGlow: '0 0 0 1px rgba(100,200,220,0.2), 0 0 15px -3px rgba(100,200,220,0.15)',
  actionGlowHover: '0 0 0 1px rgba(100,200,220,0.4), 0 0 20px -3px rgba(100,200,220,0.3)',
  scrollbarThumb: 'oklch(0.3 0.02 260)',
  scrollbarThumbHover: 'oklch(0.35 0.02 260)',
  backgroundEffect: 'starfield',
}

const spaceOperaConfig: GenreConfig = {
  id: 'space-opera',
  name: 'Space Opera',
  available: true,
  species: spaceOperaSpecies,
  classes: spaceOperaClasses,
  theme: spaceOperaTheme,
  currencyName: 'credits',
  currencyAbbrev: 'cr',
  partyBaseName: 'ship',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a fractured space opera universe.',
    setting: `Year 3187. The Galactic Accord that held 200 star systems together has fractured. Pirate fleets, rogue AIs, and a mysterious signal from beyond the Rim threaten everything. The player commands a scrappy frigate (see SHIP in game state) with a small crew, navigating this chaos.

Technology: pulse weapons, FTL drives, cybernetic augments, neural interfaces, alien species, space stations, derelict ships, void creatures. Credits, not gold. Hacking, not spellcasting. Med-patches, not potions.

Vocabulary (never use fantasy terms when the sci-fi equivalent exists):
- Sword → vibro-blade / plasma blade
- Bow → blaster / sniper rifle / pulse pistol
- Armor → composite plating / exo-suit / flight suit
- Magic → psionic ability / tech augment / experimental system
- Spell slots → charges / cooldowns / power cells
- Dungeon → derelict ship / space station sector / underground complex
- Gold → credits
- Tavern → cantina / docking bay lounge
- Monster → hostile alien / rogue AI / void creature`,
    vocabulary: `Consumable terminology: medpatches, stim-packs, grenades, EMP charges, ammo cells.
Rest terminology: Quick repair (short rest), Full cycle (long rest).`,
    tutorialContext: 'The opening scene should be set aboard or near the player\'s ship, at a space station or port. Introduce a crew member NPC early.',
  },
  openingHooks: [
    'The ship just dropped out of FTL at an unfamiliar station. Something is wrong — the docking authority is demanding an unusual fee, and there are armed patrols everywhere.',
    'A distress signal pulled the ship off-course to a derelict freighter drifting in an asteroid belt. The cargo bay doors are open. No life signs.',
    'The crew is docked at a bustling trade hub when an old contact shows up with a job — retrieve a data chip from a locked-down sector of the station. Payment: enough to cover the ship\'s overdue repairs.',
    'The ship is running on fumes, limping into the nearest port after a pirate ambush damaged the FTL drive. The only station in range is controlled by a faction the crew has history with.',
    'A routine cargo run turned sour. The client never showed at the rendezvous point, and now an unknown ship is tailing the crew through a nebula.',
    'Shore leave on a fringe colony. The crew splits up. Then an explosion rocks the market district, and the station goes into lockdown.',
    'The ship received anonymous coordinates and a single encrypted message: "Come alone. Bring the item." The crew doesn\'t know what item the sender means.',
    'Docked for refueling at a mining outpost, the crew witnesses station security dragging someone away. The prisoner locks eyes with the captain and mouths one word: "Help."',
  ],
  initialChapterTitle: 'New Horizons',
  locationNames: [
    'The Last Meridian', 'The Pale Vagrant', 'The Iron Hymn', 'The Quiet Defiance',
    'The Ember Vow', 'The Broken Circlet', 'The Wayward Claim', 'The Stray Fortune',
    'The Dusk Reaver', 'The Silver Contrition',
  ],
}

// ─── Fantasy ──────────────────────────────────────────────────────────

const fantasySpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, politically dominant across most kingdoms.',
    lore: 'No special traits — their versatility is the trait. Common everywhere, rarely questioned.',
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Slender, long-lived, keen-eyed.',
    lore: 'Respected in courts and academies, distrusted in frontier towns as aloof. Reputation for patience that others mistake for indifference.',
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Stocky, dense-boned, mountain-born.',
    lore: 'Known for blunt honesty and craftsmanship. Respected in trade guilds, underestimated in matters of subtlety.',
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small, nimble, deceptively tough.',
    lore: 'Seen as harmless by most, which suits them fine. Natural talent for going unnoticed. Found everywhere, owned by no kingdom.',
  },
  {
    id: 'dragonkin',
    name: 'Dragonkin',
    description: 'Tall, scaled, remnants of an ancient bloodline.',
    lore: 'Fast reflexes, intimidating presence. Culturally scattered since the Fall of the Wyrm Kingdoms. Trusted by few, feared by many.',
  },
]

const fantasyClasses: CharacterClass[] = [
  {
    id: 'shadowblade',
    name: 'Shadowblade',
    concept: 'Rogue / Infiltrator',
    primaryStat: 'DEX',
    proficiencies: ['Stealth', 'Sleight of Hand', 'Lockpicking', 'Acrobatics'],
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    startingInventory: [
      { id: 'short_sword', name: 'Short Sword', description: 'Light, quick blade', quantity: 1, damage: '1d6+DEX' },
      { id: 'throwing_knives', name: 'Throwing Knives', description: 'Balanced for throwing, 20ft range', quantity: 6, damage: '1d4' },
      { id: 'cloak_of_shadows', name: 'Cloak of Shadows', description: 'Advantage on Stealth checks', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'thieves_tools', name: "Thieves' Tools", description: 'Lockpicks, wire cutters, and probes', quantity: 1 },
    ],
    startingCredits: 120,
    startingHp: 9,
    startingAc: 15,
    trait: {
      name: 'Uncanny Dodge',
      description: 'Once per day, halve the damage from one attack you can see coming.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'warden',
    name: 'Warden',
    concept: 'Knight / Tank',
    primaryStat: 'STR',
    proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Shield Tactics'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
    startingInventory: [
      { id: 'longsword', name: 'Longsword', description: 'Versatile steel blade', quantity: 1, damage: '1d10' },
      { id: 'tower_shield', name: 'Tower Shield', description: '+2 AC when equipped', quantity: 1 },
      { id: 'throwing_axe', name: 'Throwing Axe', description: 'Balanced for throwing, 20ft range', quantity: 3, damage: '1d6' },
      { id: 'healing_salve', name: 'Healing Salve', description: 'Heals 1d6+2 HP when applied', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
    ],
    startingCredits: 80,
    startingHp: 12,
    startingAc: 16,
    trait: {
      name: 'Battle Surge',
      description: 'Once per day, make a bonus attack immediately after a successful attack.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    concept: 'Wizard / Scholar',
    primaryStat: 'INT',
    proficiencies: ['Arcana', 'Investigation', 'History', 'Enchantment'],
    stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'spell_focus', name: 'Spell Focus', description: '+3 to spell attack rolls', quantity: 1 },
      { id: 'arcane_bolt', name: 'Arcane Bolt', description: 'Ranged magical attack', quantity: 1, damage: '1d6 arcane, range 30ft' },
      { id: 'dispel_scroll', name: 'Dispel Scroll', description: 'Nullify one active magical effect', quantity: 2 },
      { id: 'component_pouch', name: 'Component Pouch', description: 'Spell components and reagents', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 8,
    startingAc: 12,
    trait: {
      name: 'Spell Mastery',
      description: 'Once per day, auto-succeed on one Arcana check or force a re-save on a resisted spell.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'herald',
    name: 'Herald',
    concept: 'Bard / Negotiator',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Insight', 'History'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 11, CHA: 17 },
    startingInventory: [
      { id: 'dagger', name: 'Dagger', description: 'Concealable blade', quantity: 1, damage: '1d4' },
      { id: 'ward_charm', name: 'Ward Charm', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'forged_seal', name: 'Forged Seal of Nobility', description: 'Convincing credentials for restricted areas', quantity: 1 },
      { id: 'cipher_journal', name: 'Cipher Journal', description: 'Encoded notes and contacts', quantity: 1 },
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
    id: 'mender',
    name: 'Mender',
    concept: 'Cleric / Survivalist',
    primaryStat: 'WIS',
    proficiencies: ['Medicine', 'Perception', 'Survival', 'Religion'],
    stats: { STR: 10, DEX: 13, CON: 14, INT: 13, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'mace', name: 'Mace', description: 'Sturdy blunt weapon, DC 12 CON save or stunned 1 round', quantity: 1, damage: '1d6 + stun' },
      { id: 'healing_touch', name: 'Healing Touch', description: 'Divine healing — restores 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
      { id: 'antidote_kit', name: 'Antidote Kit', description: 'Neutralize poisons and venoms', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'divination_bones', name: 'Divination Bones', description: 'Read omens and sense danger', quantity: 1 },
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
    id: 'ranger',
    name: 'Ranger',
    concept: 'Archer / Scout',
    primaryStat: 'DEX',
    proficiencies: ['Tracking', 'Sharpshooting', 'Acrobatics', 'Animal Handling'],
    stats: { STR: 10, DEX: 16, CON: 13, INT: 12, WIS: 13, CHA: 11 },
    startingInventory: [
      { id: 'longbow', name: 'Longbow', description: 'Long-range precision bow', quantity: 1, damage: '1d10, range 120ft' },
      { id: 'hand_axe', name: 'Hand Axe', description: 'Reliable melee backup', quantity: 1, damage: '1d6' },
      { id: 'studded_leather', name: 'Studded Leather', description: '+1 AC, light armor', quantity: 1 },
      { id: 'grappling_hook', name: 'Grappling Hook', description: 'Hook and rope, 60ft', quantity: 1 },
    ],
    startingCredits: 90,
    startingHp: 10,
    startingAc: 14,
    trait: {
      name: 'Dead Eye',
      description: 'Once per day, treat one ranged attack as a critical hit (on a 19-20). Also has terrain expertise: advantage on all Survival checks in the wilds.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const fantasyTheme: GenreTheme = {
  logo: '/logo_fantasy.png',
  fontNarrative: "var(--font-lora), 'Lora', Georgia, serif",
  background: 'oklch(0.12 0.02 45)',
  foreground: 'oklch(0.92 0.02 80)',
  card: 'oklch(0.15 0.02 45)',
  cardForeground: 'oklch(0.92 0.02 80)',
  primary: 'oklch(0.72 0.14 75)',
  primaryForeground: 'oklch(0.12 0.02 45)',
  secondary: 'oklch(0.22 0.02 45)',
  secondaryForeground: 'oklch(0.85 0.02 80)',
  muted: 'oklch(0.18 0.015 45)',
  mutedForeground: 'oklch(0.55 0.02 70)',
  accent: 'oklch(0.72 0.14 75)',
  accentForeground: 'oklch(0.12 0.02 45)',
  destructive: 'oklch(0.55 0.2 25)',
  border: 'oklch(0.25 0.03 50)',
  input: 'oklch(0.2 0.02 45)',
  ring: 'oklch(0.72 0.14 75)',
  narrative: 'oklch(0.91 0.02 80)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  titleGlow: '0 0 40px oklch(0.72 0.14 75 / 0.8), 0 0 80px oklch(0.72 0.14 75 / 0.4)',
  actionGlow: '0 0 0 1px rgba(200,170,80,0.2), 0 0 15px -3px rgba(200,170,80,0.15)',
  actionGlowHover: '0 0 0 1px rgba(200,170,80,0.4), 0 0 20px -3px rgba(200,170,80,0.3)',
  scrollbarThumb: 'oklch(0.3 0.02 45)',
  scrollbarThumbHover: 'oklch(0.35 0.02 45)',
  backgroundEffect: 'mist',
}

const fantasyConfig: GenreConfig = {
  id: 'fantasy',
  name: 'Fantasy',
  available: true,
  species: fantasySpecies,
  classes: fantasyClasses,
  theme: fantasyTheme,
  currencyName: 'gold',
  currencyAbbrev: 'gp',
  partyBaseName: 'company',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a crumbling medieval fantasy world.',
    setting: `The Five Kingdoms have been at peace for a generation, but the Accord of Thorns is fraying. Border raids, a plague spreading from the eastern marshes, and whispers of something stirring beneath the old ruins threaten everything. The player leads a small company of companions, navigating a world where old alliances mean less every day.

A world of swords, sorcery, ancient ruins, dark forests, walled cities, and creatures older than any kingdom. Gold, not credits. Spells, not tech. Potions, not stim-packs.

Vocabulary (never use sci-fi terms when the fantasy equivalent exists):
- Blaster → bow / crossbow / longbow
- Armor plating → chainmail / plate / leather armor
- Tech augment → spell / enchantment / magical ability
- Power cells → spell slots / charges / uses per day
- Space station → fortress / castle / tower
- Credits → gold pieces
- Cantina → tavern / inn
- Hostile alien → monster / beast / fiend`,
    vocabulary: `Consumable terminology: potions, elixirs, scrolls, healing salves, antidotes.
Rest terminology: Short rest, Long rest.`,
    tutorialContext: 'The opening scene should be set in a tavern, village, or on the road. Introduce a companion NPC early.',
  },
  openingHooks: [
    'The tavern door slams open. A wounded rider staggers in, clutching a sealed message. "For the company at the back table," he gasps, then collapses. The seal bears a crest no one has seen in twenty years.',
    'A merchant hired the company to escort a cart through the Thornwood. Simple job. But the cart is heavier than it should be, and the merchant keeps looking over his shoulder.',
    'The company arrives at a crossroads village to find it half-abandoned. The remaining villagers won\'t say why. But at night, lights move in the ruins on the hill.',
    'A job board in the guild hall: "Retrieve stolen heirloom from the Greymoor crypt. Payment: 200gp. Warning: previous party did not return." The posting is three weeks old.',
    'The company is camped in the foothills when a stranger approaches the fire. She offers information about a bounty on the company\'s heads, but her price is a favor she won\'t name yet.',
    'Market day in the capital. The company splits up to resupply. Then the cathedral bells start ringing — not for prayer. The city gates are closing.',
    'A map found in a dead adventurer\'s pack leads to a hidden entrance beneath an ancient watchtower. The markings are in a language nobody in the company reads.',
    'Passing through a mountain pass, the company finds a caravan overturned and looted. One survivor, badly hurt, begs for help: "They took the children into the mines."',
  ],
  initialChapterTitle: 'The First Step',
  locationNames: [
    'The Ashen Company', 'The Thorn Vanguard', 'The Wayward Oath',
    'The Last Watch', 'The Ember March', 'The Broken Crown',
    'The Dusk Accord', 'The Silver Vigil', 'The Iron Covenant', 'The Pale Banner',
  ],
}

// ─── Registry ─────────────────────────────────────────────────────────

const genreConfigs: Record<string, GenreConfig> = {
  'space-opera': spaceOperaConfig,
  'fantasy': fantasyConfig,
}

export const genres: { id: Genre; name: string; available: boolean }[] = [
  { id: 'space-opera', name: 'Space Opera', available: true },
  { id: 'fantasy', name: 'Fantasy', available: true },
  { id: 'cyberpunk', name: 'Cyberpunk', available: false },
  { id: 'western', name: 'Western', available: false },
]

export function getGenreConfig(genre: Genre): GenreConfig {
  const config = genreConfigs[genre]
  if (!config) throw new Error(`Unknown genre: ${genre}`)
  return config
}

export function applyGenreTheme(genre: Genre): void {
  const theme = getGenreConfig(genre).theme
  const root = document.documentElement

  root.style.setProperty('--background', theme.background)
  root.style.setProperty('--foreground', theme.foreground)
  root.style.setProperty('--card', theme.card)
  root.style.setProperty('--card-foreground', theme.cardForeground)
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-foreground', theme.primaryForeground)
  root.style.setProperty('--secondary', theme.secondary)
  root.style.setProperty('--secondary-foreground', theme.secondaryForeground)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--muted-foreground', theme.mutedForeground)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--accent-foreground', theme.accentForeground)
  root.style.setProperty('--destructive', theme.destructive)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--input', theme.input)
  root.style.setProperty('--ring', theme.ring)
  root.style.setProperty('--narrative', theme.narrative)
  root.style.setProperty('--meta', theme.meta)
  root.style.setProperty('--success', theme.success)
  root.style.setProperty('--warning', theme.warning)
  root.style.setProperty('--title-glow', theme.titleGlow)
  root.style.setProperty('--action-glow', theme.actionGlow)
  root.style.setProperty('--action-glow-hover', theme.actionGlowHover)
  root.style.setProperty('--scrollbar-thumb', theme.scrollbarThumb)
  root.style.setProperty('--scrollbar-thumb-hover', theme.scrollbarThumbHover)
  root.style.setProperty('--font-narrative', theme.fontNarrative)

  // Toggle background effect classes
  const body = document.body
  const starfield = document.querySelector('.starfield')
  const gridOverlay = document.querySelector('.grid-overlay')
  const mistBg = document.querySelector('.mist-bg')

  if (theme.backgroundEffect === 'starfield') {
    starfield?.classList.remove('hidden')
    gridOverlay?.classList.remove('hidden')
    mistBg?.classList.add('hidden')
  } else {
    starfield?.classList.add('hidden')
    gridOverlay?.classList.add('hidden')
    mistBg?.classList.remove('hidden')
  }
}
