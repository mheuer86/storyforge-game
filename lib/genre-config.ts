import type { InventoryItem, Trait } from './types'

// ─── Genre Config Interface ───────────────────────────────────────────

export type Genre = 'space-opera' | 'fantasy' | 'grimdark' | 'dnd' | 'cyberpunk' | 'western' | 'samurai' | 'mafia' | 'zombie' | 'wasteland' | 'cold-war' | 'high-fantasy'

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
  fontHeading: string
  fontSystem: string
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
  tertiary: string
  tertiaryForeground: string
  scrollbarThumb: string
  scrollbarThumbHover: string
  backgroundEffect: 'starfield' | 'mist'
}

export interface GenreConfig {
  id: Genre
  name: string
  tagline: string
  available: boolean
  species: Species[]
  speciesLabel: string
  classes: CharacterClass[]
  theme: GenreTheme
  currencyName: string
  currencyAbbrev: string
  partyBaseName: string
  settingNoun: string
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
      name: 'Smuggler\'s Luck',
      description: 'Once per day, when caught, searched, or cornered, one contraband item or piece of evidence goes undetected.',
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
      description: 'Once per day, auto-succeed on one hacking check or seize a machine for 1 minute. The intrusion leaves a trace; the GM may introduce a delayed consequence in a later scene.',
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
      name: 'Diplomatic Immunity',
      description: 'Once per day, invoke formal authority to halt a hostile encounter. Works on factions that recognize galactic law. Fails on pirates, outlaws, or the desperate.',
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
      name: 'Xenobiology',
      description: 'Once per day, identify a weakness or vulnerability in a non-human target (creature, alien tech, bioweapon). The GM reveals one exploitable detail. Also stabilizes allies.',
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
  fontNarrative: "'Geist Mono', monospace",
  fontHeading: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.11 0.025 260)',
  foreground: 'oklch(0.92 0.02 250)',
  card: 'oklch(0.15 0.025 260)',
  cardForeground: 'oklch(0.92 0.02 250)',
  primary: 'oklch(0.82 0.15 175)',
  primaryForeground: 'oklch(0.11 0.025 260)',
  secondary: 'oklch(0.20 0.025 260)',
  secondaryForeground: 'oklch(0.80 0.03 240)',
  muted: 'oklch(0.19 0.02 260)',
  mutedForeground: 'oklch(0.75 0.03 200)',
  accent: 'oklch(0.82 0.15 175)',
  accentForeground: 'oklch(0.11 0.025 260)',
  destructive: 'oklch(0.55 0.2 25)',
  border: 'oklch(0.82 0.15 175 / 0.15)',
  input: 'oklch(0.18 0.02 260)',
  ring: 'oklch(0.82 0.15 175)',
  narrative: 'oklch(0.92 0.02 250)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  tertiary: 'oklch(0.82 0.12 85)',
  tertiaryForeground: 'oklch(0.11 0.025 260)',
  titleGlow: '0 0 40px oklch(0.82 0.15 175 / 0.8), 0 0 80px oklch(0.82 0.15 175 / 0.4)',
  actionGlow: '0 0 0 1px rgba(87,241,219,0.2), 0 0 15px -3px rgba(87,241,219,0.15)',
  actionGlowHover: '0 0 0 1px rgba(87,241,219,0.4), 0 0 20px -3px rgba(87,241,219,0.3)',
  scrollbarThumb: 'oklch(0.3 0.02 260)',
  scrollbarThumbHover: 'oklch(0.35 0.02 260)',
  backgroundEffect: 'starfield',
}

const spaceOperaConfig: GenreConfig = {
  id: 'space-opera',
  name: 'Space Opera',
  tagline: 'A fractured galaxy. One ship. No good options.',
  available: true,
  species: spaceOperaSpecies,
  speciesLabel: 'Species',
  classes: spaceOperaClasses,
  theme: spaceOperaTheme,
  currencyName: 'credits',
  currencyAbbrev: 'cr',
  partyBaseName: 'Ship',
  settingNoun: 'universe',
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
      name: 'Shadow Step',
      description: 'Once per day, vanish from sight and reappear within striking distance of a target you can see. Useless in broad daylight with no cover.',
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
      name: 'Arcane Surge',
      description: 'Once per day, auto-succeed on an Arcana check or force a re-save. On nat 1 spell checks, wild magic surges with a random effect (helpful, harmful, or strange).',
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
      name: 'Bardic Echo',
      description: 'Once per day, invoke a story, song, or legend that shifts the mood of a scene. A crowd calms, a guard hesitates, an enemy pauses. Requires speaking; useless when silenced or ambushed.',
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
      name: 'Divine Favor',
      description: 'Healing strength tied to deity alignment. Acting in alignment: heal at full power + bonus. Acting against: heal at half. The GM tracks favor silently, creating moral tension.',
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
  fontNarrative: "'Lora', Georgia, serif",
  fontHeading: "'Lora', Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
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
  tertiary: 'oklch(0.72 0.14 75)',
  tertiaryForeground: 'oklch(0.12 0.02 45)',
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
  tagline: 'Ancient magic, chosen heroes, and the world worth saving.',
  available: true,
  species: fantasySpecies,
  speciesLabel: 'Race',
  classes: fantasyClasses,
  theme: fantasyTheme,
  currencyName: 'gold',
  currencyAbbrev: 'gp',
  partyBaseName: 'Quarters',
  settingNoun: 'world',
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

// ─── Cyberpunk ────────────────────────────────────────────────────────

const cyberpunkSpecies: Species[] = [
  {
    id: 'street-kid',
    name: 'Street Kid',
    description: 'Born in the gutter wards. Knows every shortcut, every gang corner, every unwritten rule.',
    lore: 'Underestimated everywhere above street level. That assumption is a weapon.',
  },
  {
    id: 'corpo',
    name: 'Corpo Dropout',
    description: 'Former corporate employee. Polished accent, expensive habits, one bad decision.',
    lore: 'Still dresses the part, which opens doors — but corp contacts remember faces. Some relationships survive the fall. Most don\'t.',
  },
  {
    id: 'nomad',
    name: 'Nomad',
    description: 'Arrived from the badlands with a car, a gun, and clan instincts.',
    lore: 'Clan loyalty is deep-wired — city people read it as suspicion. The badlands bred a different kind of toughness: no corpo safety net, no NCPD response time.',
  },
  {
    id: 'undercity-born',
    name: 'Undercity Born',
    description: 'Grew up in the maintenance warrens and black-market tunnels beneath the city\'s visible layers.',
    lore: 'Invisible to corps, trusted by no one above ground — which is exactly the point. Knows routes, people, and systems that don\'t appear on any official map.',
  },
  {
    id: 'syndicate-blood',
    name: 'Syndicate Blood',
    description: 'Raised inside an organized crime family or gang hierarchy. Knows how authority actually works.',
    lore: 'Understands the difference between power and the performance of power. Has obligations that don\'t expire — and contacts that open doors most people don\'t know exist.',
  },
]

const cyberpunkClasses: CharacterClass[] = [
  {
    id: 'ghost',
    name: 'Ghost',
    concept: 'Infiltrator / Social Engineer',
    primaryStat: 'DEX',
    proficiencies: ['Stealth', 'Deception', 'Hacking', 'Acrobatics'],
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    startingInventory: [
      { id: 'smart_pistol', name: 'Smart Pistol', description: 'Self-tracking rounds, +2 to hit', quantity: 1, damage: '1d8' },
      { id: 'monowire', name: 'Monowire', description: 'Retractable arm-mounted wire blade', quantity: 1, damage: '1d6+DEX' },
      { id: 'optical_camo', name: 'Optical Camo Module', description: 'Advantage on Stealth checks, 1 charge', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'faceswap_chip', name: 'Faceswap Chip', description: 'Forged biometric ID, passes most scanners', quantity: 1 },
    ],
    startingCredits: 1200,
    startingHp: 9,
    startingAc: 15,
    trait: {
      name: 'Ghost Protocol',
      description: 'Once per day, automatically leave no trace on one security scan, camera network, or access log.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'razorback',
    name: 'Razorback',
    concept: 'Chrome Street Samurai / Enforcer',
    primaryStat: 'STR',
    proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Cyberware Maintenance'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
    startingInventory: [
      { id: 'mantis_blades', name: 'Mantis Blades', description: 'Retractable arm blades — always equipped', quantity: 1, damage: '1d10+STR' },
      { id: 'combat_shotgun', name: 'Combat Shotgun', description: 'Brutal at close range', quantity: 1, damage: '2d6, close range only' },
      { id: 'subdermal_plates', name: 'Subdermal Armor Plates', description: 'Implanted — always active, +2 AC', quantity: 1 },
      { id: 'stim_shot', name: 'Stim-Shot', description: 'Combat stimulant — heals 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
    ],
    startingCredits: 800,
    startingHp: 12,
    startingAc: 16,
    trait: {
      name: 'Adrenaline Overclocked',
      description: 'Once per day, make a bonus melee attack immediately after a successful hit.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'netrunner',
    name: 'Netrunner',
    concept: 'Hacker / Remote Operator',
    primaryStat: 'INT',
    proficiencies: ['Hacking', 'Investigation', 'Electronics', 'Net Architecture'],
    stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'neural_deck', name: 'Neural Interface Deck', description: '+3 to all Hacking checks', quantity: 1 },
      { id: 'quickhack_suite', name: 'Quickhack Arsenal', description: 'Remote attack daemon', quantity: 1, damage: '1d6 system shock, range 30ft' },
      { id: 'ice_breaker', name: 'ICE Breaker v2', description: 'Crack security systems in the Net', quantity: 2 },
      { id: 'pocket_drone', name: 'Pocket Drone', description: 'Compact scouting drone, remote feed', quantity: 1 },
    ],
    startingCredits: 1000,
    startingHp: 8,
    startingAc: 12,
    trait: {
      name: 'Deep Dive',
      description: 'Once per day, auto-succeed on a Hacking check or seize a networked device. Each use adds neural stress. After 3 cumulative uses without a rest chapter, the GM introduces a cyberpsychosis episode.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'fixer',
    name: 'Fixer',
    concept: 'Information Broker / Face',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Insight', 'Street Lore'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 11, CHA: 17 },
    startingInventory: [
      { id: 'concealable_smartgun', name: 'Concealable Smartgun', description: 'Auto-targeting, easy to hide', quantity: 1, damage: '1d6' },
      { id: 'personal_daemon', name: 'Personal Daemon', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
      { id: 'corp_id_kit', name: 'Forged Corp ID Kit', description: 'Convincing credentials for secure facilities', quantity: 1 },
      { id: 'encrypted_comm', name: 'Encrypted Comm Unit', description: 'Untraceable calls, can intercept signals in range', quantity: 1 },
    ],
    startingCredits: 2000,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'Favor Owed',
      description: 'Once per day, call in a contact for one thing: information, a door opened, a message delivered, a small job done. The contact becomes unavailable until next chapter.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'medtech',
    name: 'Medtech',
    concept: 'Combat Medic / Body Modder',
    primaryStat: 'WIS',
    proficiencies: ['Medicine', 'Perception', 'Survival', 'Cyberware Installation'],
    stats: { STR: 10, DEX: 13, CON: 14, INT: 13, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'stun_baton', name: 'Stun Baton', description: 'Non-lethal, DC 12 CON save or stunned 1 round', quantity: 1, damage: '1d6 shock' },
      { id: 'trauma_kit', name: 'Trauma Kit v3', description: 'Advanced field med — heals 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
      { id: 'detox_injector', name: 'Detox Injector', description: 'Neutralize toxins, drugs, and cyberware poison', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'neural_scanner', name: 'Neural Scanner', description: 'Read vital signs, augment status, and trauma assessment', quantity: 1 },
    ],
    startingCredits: 1000,
    startingHp: 10,
    startingAc: 13,
    trait: {
      name: 'Field Triage',
      description: 'Once per day, stabilize a downed ally or gain advantage on Medicine checks as a bonus action.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'solo',
    name: 'Solo',
    concept: 'Contract Killer / Survivor',
    primaryStat: 'CON',
    proficiencies: ['Endurance', 'Marksmanship', 'Threat Assessment', 'Pain Suppression'],
    stats: { STR: 13, DEX: 14, CON: 17, INT: 11, WIS: 12, CHA: 10 },
    startingInventory: [
      { id: 'heavy_pistol', name: 'Heavy Pistol', description: 'Reliable, no-frills sidearm — never jams', quantity: 1, damage: '1d8' },
      { id: 'ballistic_vest', name: 'Ballistic Vest', description: 'Reinforced, +2 AC, shows wear', quantity: 1 },
      { id: 'trauma_derms', name: 'Trauma Derms', description: 'Combat stim patches — heals 1d6+2 HP', quantity: 1, effect: '1d6+2 HP', charges: 3, maxCharges: 3 },
      { id: 'threat_dossier', name: 'Threat Dossier', description: 'Intel on one target; advantage on first encounter with a contract mark', quantity: 1 },
    ],
    startingCredits: 1500,
    startingHp: 12,
    startingAc: 15,
    trait: {
      name: 'Dead Man Walking',
      description: 'Once per day, ignore all damage from one attack. You felt it; you just don\'t stop.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const cyberpunkTheme: GenreTheme = {
  logo: '/logo_cyberpunk.png',
  fontNarrative: "'Geist Mono', monospace",
  fontHeading: "var(--font-space-grotesk), 'Space Grotesk', sans-serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.09 0.02 260)',
  foreground: 'oklch(0.90 0.01 80)',
  card: 'oklch(0.12 0.015 260)',
  cardForeground: 'oklch(0.90 0.01 80)',
  primary: 'oklch(0.75 0.22 145)',
  primaryForeground: 'oklch(0.09 0.02 260)',
  secondary: 'oklch(0.18 0.015 260)',
  secondaryForeground: 'oklch(0.82 0.01 80)',
  muted: 'oklch(0.14 0.01 260)',
  mutedForeground: 'oklch(0.50 0.01 80)',
  accent: 'oklch(0.65 0.25 330)',
  accentForeground: 'oklch(0.09 0.02 260)',
  destructive: 'oklch(0.55 0.22 25)',
  border: 'oklch(0.22 0.03 260)',
  input: 'oklch(0.16 0.02 260)',
  ring: 'oklch(0.75 0.22 145)',
  narrative: 'oklch(0.90 0.01 80)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  tertiary: 'oklch(0.65 0.25 330)',
  tertiaryForeground: 'oklch(0.09 0.02 260)',
  titleGlow: '0 0 40px oklch(0.75 0.22 145 / 0.8), 0 0 80px oklch(0.75 0.22 145 / 0.4)',
  actionGlow: '0 0 0 1px rgba(80,220,120,0.2), 0 0 15px -3px rgba(80,220,120,0.15)',
  actionGlowHover: '0 0 0 1px rgba(80,220,120,0.4), 0 0 20px -3px rgba(80,220,120,0.3)',
  scrollbarThumb: 'oklch(0.25 0.02 260)',
  scrollbarThumbHover: 'oklch(0.30 0.02 260)',
  backgroundEffect: 'starfield',
}

const cyberpunkConfig: GenreConfig = {
  id: 'cyberpunk',
  name: 'Cyberpunk',
  tagline: 'The city owns everything. You\'re about to steal some of it back.',
  available: true,
  species: cyberpunkSpecies,
  speciesLabel: 'Origin',
  classes: cyberpunkClasses,
  theme: cyberpunkTheme,
  currencyName: 'eddies',
  currencyAbbrev: '€$',
  partyBaseName: 'Safehouse',
  settingNoun: 'city',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a sprawling megacity in the near-future.',
    setting: `The city never sleeps and it doesn't care if you do. Megacorporations own the law, the media, and most of the people worth knowing. The player runs with a small crew from a safehouse somewhere in the city's grinding middle layers — not poor enough to be invisible, not rich enough to be safe.

Technology: cyberware, neural interfaces, quickhacks, smart weapons, ICE (Intrusion Countermeasure Electronics), the Net, aerial drones, braindances, ripperdocs, fixers, corpo security, NCPD, Trauma Team, gang territories, megacorp arcologies.

Vocabulary (never use fantasy or generic sci-fi terms when the cyberpunk equivalent exists):
- Sword → monowire / mantis blades / combat knife
- Magic / tech augment → quickhack / daemon / neural ability / cyberware
- Potion → stim-shot / medpatch / trauma kit / toxin flush
- Tavern → bar / dive bar / the Afterlife
- Dungeon → corp facility / server vault / gang compound / undercity
- Horse / vehicle → car / AV (aerodyne) / stolen ride
- Credits / gold → eddies / €$
- Monster → gang enforcer / corpo agent / rogue AI / cyberpsycho
- Inn / rest → safehouse / the crew's base`,
    vocabulary: `Consumable terminology: stim-shots, medpatches, trauma kits, toxin flushes, stims.
Rest terminology: Quick patch (short rest), Full reboot (long rest).`,
    tutorialContext: 'The opening scene should be set in a bar, safehouse, or on the street. Introduce a fixer contact or local NPC early. Establish the crew\'s current situation — broke, hunted, or sitting on a job they shouldn\'t have taken.',
  },
  openingHooks: [
    'The job was supposed to be clean: grab the data chip, ghost out. Then corpo security showed up two hours early, and now the crew is pinned in a ventilation shaft forty floors up with no way down.',
    'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours.',
    'The crew wakes up in a med-bay with a gap in their memory logs and someone else\'s coordinates loaded into their neural buffer. No explanation. No sender. Just a location and a time.',
    'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of the crew that no one should have.',
    'A rival crew is dead. Their equipment, their job board, and their contacts are up for grabs — but so is whoever killed them.',
    'A corp access card shows up in the safehouse mail slot. The face on the ID matches no one in the crew. The clearance level is maximum.',
    'Street rumor: a cargo AV is floating dead over the industrial sector, loaded with corp merchandise and no crew aboard. First come, first served — if NCPD doesn\'t get there first.',
    'The city goes dark. Not a power failure — a targeted blackout in a six-block radius. In the silence, a voice on every local channel says a name. It\'s the player\'s.',
  ],
  initialChapterTitle: 'Night One',
  locationNames: [
    'The Ghost Circuit', 'The Neon Dogs', 'The Iron Ghosts', 'The Static Crew',
    'The Last Signal', 'The Chrome Accord', 'The Grid Runners', 'The Null Faction',
    'The Blind Protocol', 'The Ashen Wire',
  ],
}

// ─── Grimdark ─────────────────────────────────────────────────────────

const grimdarkSpecies: Species[] = [
  {
    id: 'house-veldran',
    name: 'House Veldran',
    description: 'Merchant nobility. Politically dominant, widely spread, no special bloodline traits.',
    lore: 'Wealth over blood. They are everywhere and own most of what matters. NPCs rarely question a Veldran face.',
  },
  {
    id: 'house-sylvara',
    name: 'House Sylvara',
    description: 'Ancient woodland bloodline. Long-lived, keen-eyed, patient to a fault.',
    lore: 'Respected in courts, distrusted in frontier towns. Their calm is often read as coldness — or worse, contempt.',
  },
  {
    id: 'house-stonemark',
    name: 'House Stonemark',
    description: 'Mountain clan bloodline. Dense-boned, blunt-spoken, legendary craftsmen.',
    lore: 'Trusted in trade guilds, underestimated in matters of subtlety. Their debts run generations.',
  },
  {
    id: 'wandering-kin',
    name: 'The Wandering Kin',
    description: 'Rootless small folk. No house, no loyalty, found in every city and camp.',
    lore: 'Seen as harmless by most, which suits them fine. Owned by no kingdom — a fact some call freedom and others call exile.',
  },
  {
    id: 'house-ashfang',
    name: 'House Ashfang',
    description: 'Fallen bloodline. Scaled, fast, remnants of the Wyrm Kingdoms.',
    lore: 'Once feared as conquerors. Now scattered, distrusted, and carrying a reputation they didn\'t choose. Trusted by few — which has made them careful.',
  },
]

const grimdarkClasses: CharacterClass[] = [
  {
    id: 'cutthroat',
    name: 'Cutthroat',
    concept: 'Assassin / Shadow Operative',
    primaryStat: 'DEX',
    proficiencies: ['Stealth', 'Sleight of Hand', 'Lockpicking', 'Poisoncraft'],
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    startingInventory: [
      { id: 'serrated_dirk', name: 'Serrated Dirk', description: 'Ugly blade, efficient work', quantity: 1, damage: '1d6+DEX' },
      { id: 'throwing_knives_gd', name: 'Throwing Knives', description: 'Balanced for throwing, 20ft range', quantity: 6, damage: '1d4' },
      { id: 'toxin_vial', name: 'Toxin Vial', description: 'Coat a weapon; DC 13 CON save or poisoned for 3 rounds', quantity: 2 },
      { id: 'dark_cloak_gd', name: 'Dark Cloak', description: 'Advantage on Stealth checks in dim light or darkness', quantity: 1, charges: 1, maxCharges: 1 },
    ],
    startingCredits: 80,
    startingHp: 9,
    startingAc: 15,
    trait: {
      name: 'Marked',
      description: 'Once per day, designate a target as Marked. Your first hit against them deals +1d6 bonus damage.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'ironclad',
    name: 'Ironclad',
    concept: 'Hardened Mercenary / Heavy Weapons',
    primaryStat: 'STR',
    proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Shield Tactics'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
    startingInventory: [
      { id: 'warhammer', name: 'Warhammer', description: 'Heavy, brutal, versatile', quantity: 1, damage: '1d10' },
      { id: 'battered_shield', name: 'Battered Shield', description: '+2 AC when equipped — dented but solid', quantity: 1 },
      { id: 'throwing_hatchets', name: 'Throwing Hatchets', description: 'Balanced for throwing, 20ft range', quantity: 3, damage: '1d6' },
      { id: 'field_dressing', name: 'Field Dressing', description: 'Rough but effective — heals 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
    ],
    startingCredits: 60,
    startingHp: 12,
    startingAc: 16,
    trait: {
      name: 'Unbroken',
      description: 'Once per day, when reduced to 0 HP, drop to 1 HP instead and keep fighting.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'hexblade',
    name: 'Hexblade',
    concept: 'Forbidden Magic / Curseworker',
    primaryStat: 'INT',
    proficiencies: ['Forbidden Lore', 'Investigation', 'Hexcrafting', 'Corruption Resistance'],
    stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'cursed_focus', name: 'Cursed Focus', description: 'Bone fetish — +3 to hex attack rolls', quantity: 1 },
      { id: 'hex_bolt', name: 'Hex Bolt', description: 'Ranged necrotic attack', quantity: 1, damage: '1d6 necrotic, range 30ft' },
      { id: 'binding_scroll', name: 'Binding Scroll', description: 'Restrain a target; DC 14 STR to break', quantity: 2 },
      { id: 'grimoire_fragment', name: 'Grimoire Fragment', description: 'Encoded spells — advantage on Forbidden Lore checks', quantity: 1 },
    ],
    startingCredits: 70,
    startingHp: 8,
    startingAc: 12,
    trait: {
      name: 'Corruption Tap',
      description: 'Once per day, auto-succeed on one forbidden magic check or inflict a minor curse. Each use darkens your reputation with NPCs who sense forbidden magic. Priests recoil, commoners whisper.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'schemer',
    name: 'Schemer',
    concept: 'Political Operative / Spy',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Insight', 'Noble Etiquette'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 11, CHA: 17 },
    startingInventory: [
      { id: 'concealed_blade', name: 'Concealed Blade', description: 'Hidden on the body — rarely seen coming', quantity: 1, damage: '1d4' },
      { id: 'forged_house_seal', name: 'Forged House Seal', description: 'Convincing credentials for restricted areas', quantity: 1 },
      { id: 'blackmail_dossier', name: 'Blackmail Dossier', description: 'Leverage on one named NPC — single use', quantity: 1 },
      { id: 'cipher_ledger', name: 'Cipher Ledger', description: 'Encoded contacts, favors owed, debts outstanding', quantity: 1 },
    ],
    startingCredits: 150,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'Leverage',
      description: 'Once per day, reveal a secret about a target NPC that changes the conversation. Only works if the player has had prior interaction or gathered intel. The target remembers.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'plague-doctor',
    name: 'Plague Doctor',
    concept: 'Battlefield Medic / Apothecary',
    primaryStat: 'WIS',
    proficiencies: ['Medicine', 'Perception', 'Survival', 'Apothecary'],
    stats: { STR: 10, DEX: 13, CON: 14, INT: 13, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'surgeons_lancet', name: "Surgeon's Lancet", description: 'Precise blade — DC 12 CON or minor infection', quantity: 1, damage: '1d4' },
      { id: 'medicinal_tinctures', name: 'Medicinal Tinctures', description: 'Field medicine — heals 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
      { id: 'antidote_kit_gd', name: 'Antidote Kit', description: 'Neutralize poisons, venoms, and early-stage contagion', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'diagnostic_tools', name: 'Diagnostic Instruments', description: 'Assess condition, detect contagion, read symptoms', quantity: 1 },
    ],
    startingCredits: 80,
    startingHp: 10,
    startingAc: 13,
    trait: {
      name: 'Bitter Medicine',
      description: 'Once per day, heal an ally for 1d8+WIS, but the treatment has a side effect chosen by the GM: nausea, hallucinations, or dependency. Nothing is free.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'inquisitor',
    name: 'Inquisitor',
    concept: 'Sanctioned Interrogator / Institutional Authority',
    primaryStat: 'INT',
    proficiencies: ['Interrogation', 'Investigation', 'Intimidation', 'Anatomy'],
    stats: { STR: 11, DEX: 12, CON: 13, INT: 17, WIS: 14, CHA: 10 },
    startingInventory: [
      { id: 'inquisitors_seal', name: "Inquisitor's Seal", description: 'Institutional authority; advantage on Intimidation when shown', quantity: 1 },
      { id: 'iron_pincers', name: 'Iron Pincers', description: 'Interrogation tool; +2 to Interrogation checks', quantity: 1 },
      { id: 'journal_confessions', name: 'Journal of Confessions', description: 'Detailed notes; advantage on Investigation checks against known subjects', quantity: 1 },
      { id: 'stiletto', name: 'Stiletto', description: 'Concealed blade, always on person', quantity: 1, damage: '1d4+DEX' },
    ],
    startingCredits: 90,
    startingHp: 9,
    startingAc: 13,
    trait: {
      name: 'The Question',
      description: 'Once per day, after 1+ rounds of dialogue with a target, force a WIS save (DC = 8 + INT mod). On failure, the target reveals one true piece of information. On success, they know you tried.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const grimdarkTheme: GenreTheme = {
  logo: '/logo_grimdark.png',
  fontNarrative: "'Lora', Georgia, serif",
  fontHeading: "'Lora', Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.10 0.02 35)',
  foreground: 'oklch(0.88 0.02 75)',
  card: 'oklch(0.13 0.02 35)',
  cardForeground: 'oklch(0.88 0.02 75)',
  primary: 'oklch(0.58 0.16 28)',
  primaryForeground: 'oklch(0.95 0.01 90)',
  secondary: 'oklch(0.20 0.02 35)',
  secondaryForeground: 'oklch(0.82 0.02 75)',
  muted: 'oklch(0.16 0.015 35)',
  mutedForeground: 'oklch(0.52 0.02 70)',
  accent: 'oklch(0.55 0.10 270)',
  accentForeground: 'oklch(0.95 0.01 90)',
  destructive: 'oklch(0.55 0.2 25)',
  border: 'oklch(0.23 0.03 40)',
  input: 'oklch(0.18 0.02 35)',
  ring: 'oklch(0.58 0.16 28)',
  narrative: 'oklch(0.88 0.02 75)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  tertiary: 'oklch(0.55 0.10 270)',
  tertiaryForeground: 'oklch(0.95 0.01 90)',
  titleGlow: '0 0 40px oklch(0.58 0.16 28 / 0.8), 0 0 80px oklch(0.58 0.16 28 / 0.4)',
  actionGlow: '0 0 0 1px rgba(180,80,60,0.2), 0 0 15px -3px rgba(180,80,60,0.15)',
  actionGlowHover: '0 0 0 1px rgba(180,80,60,0.4), 0 0 20px -3px rgba(180,80,60,0.3)',
  scrollbarThumb: 'oklch(0.28 0.02 35)',
  scrollbarThumbHover: 'oklch(0.33 0.02 35)',
  backgroundEffect: 'mist',
}

const grimdarkConfig: GenreConfig = {
  id: 'grimdark',
  name: 'Grimdark',
  tagline: 'Kingdoms rot from the inside. Someone has to survive it.',
  available: true,
  species: grimdarkSpecies,
  speciesLabel: 'Bloodline',
  classes: grimdarkClasses,
  theme: grimdarkTheme,
  currencyName: 'crowns',
  currencyAbbrev: 'cr',
  partyBaseName: 'Company',
  settingNoun: 'world',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a crumbling medieval world where empires rot and survival is political.',
    setting: `The Five Kingdoms have held peace for a generation, but the Accord of Thorns is fraying. A plague spreads from the eastern marshes. Border lords raise private armies. The Church of the Pale Flame burns reformers and calls it salvation. Something stirs beneath the old ruins that predate every kingdom alive today.

This is a world of moral compromise, political betrayal, hard winters, and bodies in the mud. The player commands a small mercenary company navigating a world where old allegiances mean less every week.

Weapons: swords, axes, crossbows, bows, knives, polearms. No guns. Magic exists but is feared, costly, and rarely clean. No potions — medicinal tinctures, field dressings, antidote kits. Gold, not credits.

Vocabulary (never use sci-fi terms; fantasy terms that imply heroism should be used sparingly):
- Spell → hex / curse / forbidden working / corrupted craft
- Potion → tincture / salve / kit / vial
- Quest → contract / job / commission
- Party → company / crew / band
- Inn → tavern / waystation / camp
- Temple → keep / monastery / shrine`,
    vocabulary: `Consumable terminology: tinctures, field dressings, antidote kits, toxin vials.
Rest terminology: Short rest, Long rest. Tone: bleak, morally ambiguous, politically complex. Victories are never clean.`,
    tutorialContext: 'Open in a burned village, a tavern with a wanted poster, or the aftermath of a skirmish. Introduce a morally complex NPC early — someone who needs the company but cannot be fully trusted.',
  },
  openingHooks: [
    'The village paid for protection. Three days in, the captain is dead and the company is being blamed for the raid they were hired to stop.',
    'A sealed contract arrives from a house that doesn\'t officially exist. Payment is generous. The task: retrieve something from a crypt three previous parties never returned from.',
    'The company is camped outside a city under quarantine. Inside: a contact with critical intelligence. The gates are locked and the walls are watched.',
    'A child walks into camp alone, carrying a signet ring from a dead lord. She won\'t say where she got it — only: "They said to find the Company."',
    'The battle is over. The wrong side won. The company\'s employer is dead, and the victors are offering amnesty to surrendering mercenaries. The kind that ends with a noose.',
    'A courier brings payment for a job the company didn\'t do. Someone is using the company\'s name — and whoever hired them wants a reckoning.',
    'Mid-winter. The road north is blocked by snow. The only shelter: an abandoned monastery with fresh tracks going in and none coming out.',
    'A lord hires the company to investigate missing grain shipments. The trail leads to the lord\'s own steward. Now the company knows too much.',
  ],
  initialChapterTitle: 'First Blood',
  locationNames: [
    'The Ashfang Company', 'The Iron Accord', 'The Pale March',
    'The Thorn Company', 'The Last Warrant', 'The Grey Vanguard',
    'The Ember Compact', 'The Broken Seal', 'The Hollow Banner', 'The Black Vigil',
  ],
}

// ─── Stubs ────────────────────────────────────────────────────────────
// Stub configs for genres not yet fully implemented. Available: false —
// they show as "Soon" in the genre picker. No species/classes/hooks needed
// until the stub is promoted. Theme inherits from Space Opera until defined.

function makeStub(
  id: Genre,
  name: string,
  tagline: string,
  currencyName: string,
  currencyAbbrev: string,
  partyBaseName: string,
): GenreConfig {
  return {
    id,
    name,
    tagline,
    available: false,
    species: [],
    speciesLabel: 'Origin',
    classes: [],
    theme: { ...spaceOperaTheme },
    currencyName,
    currencyAbbrev,
    partyBaseName,
    settingNoun: 'world',
    systemPromptFlavor: { role: '', setting: '', vocabulary: '', tutorialContext: '' },
    openingHooks: [],
    initialChapterTitle: 'New Horizons',
    locationNames: ['Base'],
  }
}

const dndConfig         = makeStub('dnd',          'Classic D&D',   'Roll for initiative. Try not to die.',                           'gold',    'gp',  'Tavern')
const highFantasyConfig = makeStub('high-fantasy',  'High Fantasy',  'The age of heroes isn\'t over. Not yet.',                        'gold',    'gp',  'Quarters')
const westernConfig     = makeStub('western',       'Western',       'The frontier doesn\'t ask where you came from.',                 'dollars', '$',   'Camp')
const samuraiConfig     = makeStub('samurai',       'Samurai',       'Duty binds. Honor breaks. The blade decides.',                  'mon',     '¥',   'Dojo')
const mafiaConfig       = makeStub('mafia',         'Mafia',         'Everyone\'s family until the money runs out.',                  'dollars', '$',   'The Family')
const zombieConfig      = makeStub('zombie',        'Zombie Apocalypse', 'The dead keep moving. The living keep making it worse.',    'supplies', 'sup', 'Enclave')
const wastelandConfig   = makeStub('wasteland',     'Post-Atomic Wasteland', 'The bombs fell. Something stranger rose in their place.', 'caps',    'ƈ',   'Settlement')
const coldWarConfig     = makeStub('cold-war',      'Cold War',      'No shots fired. Everyone\'s already compromised.',              'dollars', '$',   'Safe House')

// ─── Registry ─────────────────────────────────────────────────────────

const genreConfigs: Record<string, GenreConfig> = {
  'space-opera':  spaceOperaConfig,
  'fantasy':      fantasyConfig,
  'grimdark':     grimdarkConfig,
  'cyberpunk':    cyberpunkConfig,
  'dnd':          dndConfig,
  'high-fantasy': highFantasyConfig,
  'western':      westernConfig,
  'samurai':      samuraiConfig,
  'mafia':        mafiaConfig,
  'zombie':       zombieConfig,
  'wasteland':    wastelandConfig,
  'cold-war':     coldWarConfig,
}

export const genres: { id: Genre; name: string; available: boolean }[] = [
  { id: 'space-opera',  name: 'Space Opera',   available: true  },
  { id: 'fantasy',      name: 'Fantasy',        available: true  },
  { id: 'grimdark',     name: 'Grimdark',       available: true  },
  { id: 'cyberpunk',    name: 'Cyberpunk',      available: true  },
  { id: 'dnd',          name: 'Classic D&D',    available: false },
  { id: 'high-fantasy', name: 'High Fantasy',   available: false },
  { id: 'western',      name: 'Western',        available: false },
  { id: 'samurai',      name: 'Samurai',        available: false },
  { id: 'mafia',        name: 'Mafia',          available: false },
  { id: 'zombie',       name: 'Zombie Apocalypse',      available: false },
  { id: 'wasteland',    name: 'Post-Atomic Wasteland',  available: false },
  { id: 'cold-war',     name: 'Cold War',       available: false },
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
  root.style.setProperty('--tertiary', theme.tertiary)
  root.style.setProperty('--tertiary-foreground', theme.tertiaryForeground)
  root.style.setProperty('--font-narrative', theme.fontNarrative)
  root.style.setProperty('--font-heading', theme.fontHeading)
  root.style.setProperty('--font-system', theme.fontSystem)
  root.dataset.genre = genre

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
