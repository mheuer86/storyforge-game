import type { InventoryItem, Trait, ShipState } from './types'

// ─── Genre Config Interface ───────────────────────────────────────────

export type Genre = 'space-opera' | 'fantasy' | 'grimdark' | 'cyberpunk' | 'noire' | 'western' | 'zombie' | 'wasteland' | 'cold-war'

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
  promptSections: {
    role: string
    setting: string
    vocabulary: string
    toneOverride: string
    assetMechanic: string
    traitRules: string
    consumableLabel: string
    tutorialContext: string
    npcVoiceGuide: string
    buildAssetState: ((ship: ShipState, shipName: string) => string) | null
    investigationGuide: string
  }
  notebookLabel: string
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
  fontHeading: "var(--font-space-grotesk), sans-serif",
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
  promptSections: {
    role: 'You are the Game Master of a space opera tabletop RPG campaign. You narrate a galaxy of fractured alliances, rogue fleets, and secrets buried in the dark between stars.',
    setting: 'The galaxy is post-collapse. A once-unified government has fractured into competing remnants, criminal syndicates, corporate blocs, and unaligned frontier systems. FTL travel exists but is constrained by infrastructure — beacons, gates, charted corridors. Outside those corridors, navigation is dangerous and slow. The frontier is lawless. The core is political.',
    vocabulary: 'Use spacefaring language naturally: bulkheads not walls, decks not floors, berths not parking spots. Weapons are pulse, plasma, kinetic, or energy-based. Ships have drives, not engines. FTL is via beacon corridors or jump calculations. Comms are encrypted or open-channel. Currency is credits. AI exists but is distrusted.',
    toneOverride: '',
    assetMechanic: `## SHIP MECHANIC (call update_ship)\n\nShip systems are levels 1-3. Apply automatically:\n- Engines L2: -2 piloting DCs. L3: -4, can always escape.\n- Weapons L2: 1d10. L3: 1d12 + boarding.\n- Shields L2: -1 damage per hit. L3: -2 + deflect one per encounter.\n- Sensors L2: detect hidden threats. L3: reveal enemy intent.\n- Crew Quarters L2: cohesion +1 at chapter start. L3: +1 cohesion + companions recover 1d4 HP.\n\nShip combat options appear as quick actions. Hull: -15 to -25 per hit, +20 to +40 repair. Below 30%: disadvantage on piloting.\n\nChapter-end refit: embed 2-3 options in narrative.`,
    traitRules: `## TRAIT RULES\n\n- **System Override:** Intrusion leaves a trace. Delayed consequence possible.\n- **Diplomatic Immunity:** Only works on factions recognizing galactic law.\n- **Xenobiology:** Reveals one exploitable detail about a non-human target.\n- **Smuggler's Luck:** One item goes undetected during a search.`,
    consumableLabel: 'Medpatches, grenades, stim charges, ammo',
    tutorialContext: 'The opening chapter introduces the ship, one crew member, and a simple job that goes sideways. First check: piloting or docking. First combat: a small boarding action.',
    npcVoiceGuide: 'Military officers: short declarative sentences, rank-conscious. Engineers: precise, detail-oriented. Intelligence operatives: measured, say less than they know. Smugglers: casual, transactional, use questions as deflection. Aliens: speech reflects physiology and culture, not accents.',
    buildAssetState: (ship, shipName) => {
      const systemsLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      const combatLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      return `\nSHIP: ${shipName} | Hull ${ship.hullCondition}%\nSYSTEMS: ${systemsLine}\nSHIP OPTIONS: ${combatLine}`
    },
    investigationGuide: 'Intelligence dossier — intercepted comms, surveillance data, NPC observations, operational intel. When the crew gathers intelligence, track it as narrative threads. Clues come from ship sensors, hacked terminals, NPC debriefs, and overheard transmissions.',
  },
  notebookLabel: 'Dossier',
  openingHooks: [
    'The ship just dropped out of FTL at an unfamiliar station. Something is wrong — the docking authority is demanding an unusual fee, and there are armed patrols everywhere.',
    'A distress signal pulled the ship off-course to a derelict freighter drifting in an asteroid belt. The cargo bay doors are open. No life signs.',
    'The crew is docked at a bustling trade hub when an old contact shows up with a job — retrieve a data chip from a locked-down sector of the station. Payment: enough to cover the ship\'s overdue repairs.',
    'The ship is running on fumes, limping into the nearest port after a pirate ambush damaged the FTL drive. The only station in range is controlled by a faction the crew has history with.',
    'A routine cargo run turned sour. The client never showed at the rendezvous point, and now an unknown ship is tailing the crew through a nebula.',
    'Shore leave on a fringe colony. The crew splits up. Then an explosion rocks the market district, and the station goes into lockdown.',
    'The ship received anonymous coordinates and a single encrypted message: "Come alone. Bring the item." The crew doesn\'t know what item the sender means.',
    'Docked for refueling at a mining outpost, the crew witnesses station security dragging someone away. The prisoner locks eyes with the captain and mouths one word: "Help."',
    'You just completed the biggest score of your career. The cargo bay is full, the crew is celebrating, and your comm is lighting up with three buyers — all offering too much.',
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
  promptSections: {
    role: 'You are the Game Master of a fantasy tabletop RPG campaign. You narrate a world of ancient magic, fractured kingdoms, and the long shadows of powers that predate civilization.',
    setting: 'A world of medieval-level technology augmented by magic. Kingdoms, city-states, and wild territories coexist uneasily. Magic is real but not ubiquitous — studied, feared, worshipped, or hunted. Ancient ruins hold pre-collapse knowledge. The wilderness is genuinely dangerous. Gods may or may not exist, but their churches do.',
    vocabulary: 'Use grounded fantasy language: stone and timber, torches and lanterns, horses and carts. Magic has a physical cost — fatigue, nosebleeds, trembling. Spells are cast or invoked, not activated. Weapons are steel, iron, or enchanted. Currency is gold, silver, copper. Avoid modern idioms.',
    toneOverride: 'Adjust tone: Epic (70%), Gritty (20%), Witty (10%). The grandeur is real — ancient halls, vast forests, the weight of prophecy. The grit grounds it: mud on boots, hunger on the road.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Arcane Surge:** On nat 1 spell checks, wild magic surges. GM picks a random effect.\n- **Bardic Echo:** GM determines effect of story or song. Requires speech — useless when silenced.\n- **Divine Favor:** GM silently tracks deity alignment. In alignment: full power. Against: half.\n- **Shadow Step:** Requires shadow or cover — useless in open daylight.`,
    consumableLabel: 'Potions, salves, scrolls, antidotes',
    tutorialContext: 'The opening chapter introduces a settlement, one ally, and a local problem hinting at something larger. First check: social or investigation. First combat: bandits, beasts, or undead.',
    npcVoiceGuide: 'Nobles: formal, indirect, power through what they don\'t say. Soldiers: direct, rank-aware, duty and obligation. Scholars: precise, irritated by imprecision. Common folk: practical, concrete terms. Clergy: measured, parable-prone.',
    buildAssetState: null,
    investigationGuide: 'Lore codex — prophecy fragments, historical connections, magical phenomena, ancient texts. When the player researches mysteries, track discoveries as narrative threads. Clues come from libraries, ruins, NPC scholars, and divination.',
  },
  notebookLabel: 'Codex',
  openingHooks: [
    'The tavern door slams open. A wounded rider staggers in, clutching a sealed message. "For the company at the back table," he gasps, then collapses. The seal bears a crest no one has seen in twenty years.',
    'A merchant hired the company to escort a cart through the Thornwood. Simple job. But the cart is heavier than it should be, and the merchant keeps looking over his shoulder.',
    'A warlord\'s army is three days from the city. The council offers you command of the defense — but you recognize the warlord\'s banner. You served under it once.',
    'The healer who saved your life asks one favor in return: escort her to a temple that her own church has declared heretical.',
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
  fontHeading: "var(--font-space-grotesk), sans-serif",
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
  accent: 'oklch(0.75 0.22 145)',
  accentForeground: 'oklch(0.09 0.02 260)',
  destructive: 'oklch(0.55 0.22 25)',
  border: 'oklch(0.22 0.03 260)',
  input: 'oklch(0.16 0.02 260)',
  ring: 'oklch(0.75 0.22 145)',
  narrative: 'oklch(0.90 0.01 80)',
  meta: 'oklch(0.55 0.08 220)',
  success: 'oklch(0.65 0.18 145)',
  warning: 'oklch(0.75 0.15 85)',
  tertiary: 'oklch(0.78 0.12 85)',
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
  promptSections: {
    role: 'You are the Game Master of a cyberpunk tabletop RPG campaign. You narrate a world of neon-soaked megacities, corporate warfare, and the desperate hustle of people living in the cracks.',
    setting: 'The world is dominated by megacorporations that function as nation-states. Cities are vertical — stratified by wealth. Cyberware is ubiquitous. The net is a parallel world. Street-level life runs on fixers, gangs, mercenary crews, and the black market. Law enforcement is privatized. Privacy is a commodity.',
    vocabulary: 'Use street-level cyberpunk language: chrome for cyberware, flatline for kill, jack in for net access, meat for organic body, zero for nobody, corpo for corporate. Weapons are smart-linked or EMP. Money is eddies. Neighborhoods have texture.',
    toneOverride: 'Adjust tone: Gritty (50%), Witty (30%), Epic (20%). The grandeur is in small victories — surviving the night, keeping your crew alive. Humor is gallows humor. Hope is rare.',
    assetMechanic: `## TECH RIG MECHANIC (call update_ship)\n\nPersonal tech rig uses the ship system mechanically. Modules are levels 1-3:\n- Neurofence L2: auto-deflect first hack per scene. L3: counter-hack.\n- Spectra L2: advantage evading surveillance. L3: full cloak, once/chapter.\n- Redline L2: boost two checks per chapter. L3: no burnout risk.\n- Panoptik L2: detect threats through walls. L3: predict enemy actions.\n- Skinweave L2: corporate-grade ID forgery. L3: full biometric clone.\n\nRig combat options as quick actions. Integrity: -15 to -25 per incident. Below 30%: disadvantage on tech checks.\n\nIf ship is null, introduce rig narratively in next scene.`,
    traitRules: `## TRAIT RULES\n\n- **Deep Dive:** Track cumulative uses. After 3 without rest chapter, GM introduces cyberpsychosis episode.\n- **Favor Owed:** Contact unavailable until next chapter after being called in. Tab accumulates.`,
    consumableLabel: 'Stim injectors, EMP charges, ICE breakers, ammo',
    tutorialContext: 'The opening chapter introduces the neighborhood, one contact (fixer or ripperdoc), and a street-level job. First check: social or stealth. First combat: gang or corporate security.',
    npcVoiceGuide: 'Fixers: smooth, transactional, every sentence has a price. Corpos: polished, euphemistic, threaten through implication. Street muscle: blunt, territorial. Ripperdocs: clinical when working, human when not. Netrunners: fast-talking, impatient with meatspace.',
    buildAssetState: (ship, _shipName) => {
      const modulesLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      const abilitiesLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      return `\nRIG: Tech Rig | Integrity ${ship.hullCondition}%\nMODULES: ${modulesLine}\nRIG OPTIONS: ${abilitiesLine}`
    },
    investigationGuide: 'Data cache — netrunner intercepts, camera feeds, contact reports, corp documents. When the player gathers intel, track it as narrative threads. Clues come from hacked systems, surveillance footage, informants, and intercepted communications.',
  },
  notebookLabel: 'Data Cache',
  openingHooks: [
    'The job was supposed to be clean: grab the data chip, ghost out. Then corpo security showed up two hours early, and now the crew is pinned in a ventilation shaft forty floors up with no way down.',
    'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours.',
    'The crew wakes up in a med-bay with a gap in their memory logs and someone else\'s coordinates loaded into their neural buffer. No explanation. No sender. Just a location and a time.',
    'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of the crew that no one should have.',
    'A rival crew is dead. Their equipment, their job board, and their contacts are up for grabs — but so is whoever killed them.',
    'A corp access card shows up in the safehouse mail slot. The face on the ID matches no one in the crew. The clearance level is maximum.',
    'Street rumor: a cargo AV is floating dead over the industrial sector, loaded with corp merchandise and no crew aboard. First come, first served — if NCPD doesn\'t get there first.',
    'The city goes dark. Not a power failure — a targeted blackout in a six-block radius. In the silence, a voice on every local channel says a name. It\'s the player\'s.',
    'Last night you uploaded something to the net that you shouldn\'t have. You don\'t remember doing it. Your rig\'s activity log says it took eleven minutes. Three corps have already noticed.',
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
  tertiary: 'oklch(0.70 0.10 70)',
  tertiaryForeground: 'oklch(0.10 0.02 35)',
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
  promptSections: {
    role: 'You are the Game Master of a grimdark tabletop RPG campaign. You narrate a world where power corrupts, mercy is expensive, and the line between hero and monster is drawn in mud and blood.',
    setting: 'A world scarred by war, plague, and institutional decay. Kingdoms are corrupt or tyrannical. Magic is rare, feared, and forbidden — those who wield it pay a visible price. Religion is powerful and factional. The common people suffer regardless of who rules. Moral clarity is a luxury.',
    vocabulary: 'Use blunt, physical language: mud, blood, iron, rot. Violence has weight. Death is ugly. Healing is slow. Magic is unsettling. Currency is marks or crowns. Dialogue is direct, often crude. Titles used with irony as often as respect.',
    toneOverride: 'Adjust tone: Gritty (60%), Epic (25%), Witty (15%). Grandeur exists but is tarnished — a crumbling cathedral, a once-great army reduced to mercenaries. Humor is dark, sharp, and necessary.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Corruption Tap:** Each use darkens reputation. Cumulative, never resets.\n- **Leverage:** Requires prior interaction or intel. Secret cuts both ways.\n- **Bitter Medicine:** Every heal has a side effect: nausea, hallucinations, or dependency.\n- **The Question:** Requires 1+ rounds of dialogue. WIS save failure reveals one truth. Success: they know you tried.`,
    consumableLabel: 'Poultices, blasting powder, antitoxin, bandages',
    tutorialContext: 'The opening chapter introduces a morally compromised situation, one conditional NPC, and a job where success and failure both cost. First check: social or investigation. First combat: human enemies.',
    npcVoiceGuide: 'Mercenaries: gallows humor, fatalistic. Nobles: self-justifying, every order framed as necessity. Priests: fervent or exhausted. Informants: paranoid, transactional. Common folk: resigned, distrust anyone with power.',
    buildAssetState: null,
    investigationGuide: 'Journal of confessions — extracted testimony, names implicated, evidence of heresy or corruption. When the player interrogates or investigates, track discoveries as narrative threads. Clues come from confessions, seized documents, NPC testimony, and physical evidence.',
  },
  notebookLabel: 'Journal',
  openingHooks: [
    'The village paid for protection. Three days in, the captain is dead and the company is being blamed for the raid they were hired to stop.',
    'A sealed contract arrives from a house that doesn\'t officially exist. Payment is generous. The task: retrieve something from a crypt three previous parties never returned from.',
    'The company is camped outside a city under quarantine. Inside: a contact with critical intelligence. The gates are locked and the walls are watched.',
    'A child walks into camp alone, carrying a signet ring from a dead lord. She won\'t say where she got it — only: "They said to find the Company."',
    'The battle is over. The wrong side won. The company\'s employer is dead, and the victors are offering amnesty to surrendering mercenaries. The kind that ends with a noose.',
    'A courier brings payment for a job the company didn\'t do. Someone is using the company\'s name — and whoever hired them wants a reckoning.',
    'Mid-winter. The road north is blocked by snow. The only shelter: an abandoned monastery with fresh tracks going in and none coming out.',
    'A lord hires the company to investigate missing grain shipments. The trail leads to the lord\'s own steward. Now the company knows too much.',
    'You\'ve been appointed magistrate of a town that executed the last three magistrates. Your first case arrives tomorrow.',
  ],
  initialChapterTitle: 'First Blood',
  locationNames: [
    'The Ashfang Company', 'The Iron Accord', 'The Pale March',
    'The Thorn Company', 'The Last Warrant', 'The Grey Vanguard',
    'The Ember Compact', 'The Broken Seal', 'The Hollow Banner', 'The Black Vigil',
  ],
}

// ─── Noire ───────────────────────────────────────────────────────────

const noireSpecies: Species[] = [
  {
    id: 'ex-cop',
    name: 'Ex-Cop',
    description: 'Former law enforcement. Left for a reason someone can pull.',
    lore: 'You know how the system works because you were part of it. Cops still talk to you — some of them. Criminals know what you were. Start with one law enforcement contact at Favorable, one criminal contact at Wary. Advantage on checks to predict or navigate law enforcement behavior.',
  },
  {
    id: 'street',
    name: 'Street',
    description: 'Grew up where the papers only come when someone dies.',
    lore: 'You know the real economy — favors, debts, territory. Institutions are things that happen to people like you. Start with one underworld contact at Favorable. Advantage on Streetwise checks. Disadvantage on initial social checks with institutional authority.',
  },
  {
    id: 'old-money',
    name: 'Old Money',
    description: 'From the families that built this city. You know the quiet arrangements.',
    lore: 'You know the clubs, the boards, the quiet arrangements. You also know what those families do to protect themselves. Start with one high-society contact at Favorable. Access to spaces others can\'t enter. Your name precedes you — people form opinions before meeting you.',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Went to war and came back different. Violence doesn\'t shock you.',
    lore: 'The city feels small after what you saw. Violence doesn\'t shock you, which is useful. It also doesn\'t bother you, which is a problem. Advantage on CON saves against fear and intimidation. One military contact at Favorable. First extreme violence in a chapter: no WIS save, NPCs notice.',
  },
  {
    id: 'immigrant',
    name: 'Immigrant',
    description: 'Came from somewhere else. You see this city clearly.',
    lore: 'You see this city clearly because you never learned to take it for granted. You have a community that protects its own, and expectations that come with that protection. Start with one community contact at Trusted. Advantage on Insight checks reading people outside your community. Community promises carry extra weight — breaking one drops disposition by two tiers.',
  },
]

const noireClasses: CharacterClass[] = [
  {
    id: 'private-investigator',
    name: 'Private Investigator',
    concept: 'Detective / Case Worker',
    primaryStat: 'WIS',
    proficiencies: ['Investigation', 'Perception', 'Insight', 'Streetwise'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 16, WIS: 17, CHA: 11 },
    startingInventory: [
      { id: 'snub_revolver', name: 'Snub Revolver', description: 'Six shots, shoulder holster', quantity: 1, damage: '1d8' },
      { id: 'pi_license', name: 'PI License', description: 'Just enough legitimacy to ask questions', quantity: 1 },
      { id: 'lockpick_set', name: 'Lockpick Set', description: 'For doors that don\'t answer knocking', quantity: 1 },
      { id: 'notebook', name: 'Notebook', description: 'Shorthand notes, observations, case details', quantity: 1 },
    ],
    startingCredits: 80,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'Case Instinct',
      description: 'Once per chapter, propose a connection between two known facts. INT Investigation check (DC scales by obscurity: obvious 10, moderate 14, deep 18). Success reveals new information. Failure reveals nothing but doesn\'t consume the use.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'fixer',
    name: 'Fixer',
    concept: 'Broker / Connected Operator',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Streetwise', 'Insight'],
    stats: { STR: 10, DEX: 12, CON: 11, INT: 13, WIS: 14, CHA: 17 },
    startingInventory: [
      { id: 'derringer', name: 'Derringer', description: 'Two shots, palm-sized, last resort', quantity: 1, damage: '1d6' },
      { id: 'little_black_book', name: 'Little Black Book', description: 'Names, debts, leverage — your real weapon', quantity: 1 },
      { id: 'cash_envelope', name: 'Cash Envelope', description: 'Walking-around money for greasing wheels', quantity: 1 },
      { id: 'business_card_case', name: 'Business Cards', description: 'Three different names, three different stories', quantity: 3 },
    ],
    startingCredits: 150,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'Favor Owed',
      description: 'Once per chapter, call in a contact for information, access, or a service. Contact unavailable until next chapter. After three favors without reciprocation, next contact demands something first.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'bruiser',
    name: 'Bruiser',
    concept: 'Muscle / Enforcer',
    primaryStat: 'STR',
    proficiencies: ['Intimidation', 'Athletics', 'Perception', 'Endurance'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'brass_knuckles', name: 'Brass Knuckles', description: 'Simple, effective, sends a message', quantity: 1, damage: '1d6+STR' },
      { id: 'heavy_revolver', name: 'Heavy Revolver', description: 'Six rounds, loud, persuasive', quantity: 1, damage: '1d10' },
      { id: 'flask', name: 'Hip Flask', description: 'Cheap whiskey — steadies the nerves, dulls the rest', quantity: 1 },
      { id: 'thick_coat', name: 'Thick Coat', description: 'Absorbs a punch or a knife — once', quantity: 1 },
    ],
    startingCredits: 60,
    startingHp: 12,
    startingAc: 13,
    trait: {
      name: 'Heavy Lean',
      description: 'Once per chapter, auto-succeed on Intimidation against a non-elite NPC. Target cooperates immediately but disposition drops one tier permanently. You can\'t scare someone into trusting you.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'grifter',
    name: 'Grifter',
    concept: 'Con Artist / Infiltrator',
    primaryStat: 'CHA',
    proficiencies: ['Deception', 'Performance', 'Sleight of Hand', 'Disguise'],
    stats: { STR: 10, DEX: 15, CON: 11, INT: 13, WIS: 12, CHA: 17 },
    startingInventory: [
      { id: 'switchblade', name: 'Switchblade', description: 'Concealed, quick, unglamorous', quantity: 1, damage: '1d4+DEX' },
      { id: 'makeup_kit', name: 'Disguise Kit', description: 'Wigs, glasses, prosthetics — become someone else', quantity: 1 },
      { id: 'forged_credentials', name: 'Forged Credentials', description: 'Press pass, police badge, doctor\'s ID — pick one per scene', quantity: 1 },
      { id: 'stolen_jewelry', name: 'Stolen Jewelry', description: 'Emergency cash, or a convincing prop', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 8,
    startingAc: 12,
    trait: {
      name: 'New Face',
      description: 'Once per chapter, establish a cover identity for a specific situation. Identity holds for initial contact without a Deception check. If blown, every NPC present permanently distrusts you — Wary minimum, no recovery above Neutral.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'reporter',
    name: 'Reporter',
    concept: 'Journalist / Public Eye',
    primaryStat: 'INT',
    proficiencies: ['Investigation', 'Persuasion', 'Insight', 'Research'],
    stats: { STR: 10, DEX: 11, CON: 12, INT: 17, WIS: 14, CHA: 13 },
    startingInventory: [
      { id: 'press_credential', name: 'Press Credential', description: 'Opens doors — and paints a target', quantity: 1 },
      { id: 'camera', name: 'Camera', description: 'Evidence that can\'t be denied or retracted', quantity: 1 },
      { id: 'tape_recorder', name: 'Tape Recorder', description: 'On or off the record — your choice, not theirs', quantity: 1 },
      { id: 'pocket_pistol', name: 'Pocket Pistol', description: 'Last resort, bottom of the bag', quantity: 1, damage: '1d6' },
    ],
    startingCredits: 90,
    startingHp: 8,
    startingAc: 11,
    trait: {
      name: 'On The Record',
      description: 'Once per chapter, invoke press status to compel a public-facing NPC to answer or grant access. They cooperate because refusing looks worse. But: anything learned this way becomes public knowledge, alerting other interested parties.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const noireTheme: GenreTheme = {
  logo: '/logo_noire.png',
  fontNarrative: "'Lora', Georgia, serif",
  fontHeading: "'Newsreader', Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
  background: 'oklch(0.08 0.005 15)',
  foreground: 'oklch(0.92 0.01 90)',
  card: 'oklch(0.11 0.005 15)',
  cardForeground: 'oklch(0.92 0.01 90)',
  primary: 'oklch(0.48 0.20 22)',
  primaryForeground: 'oklch(0.95 0.01 90)',
  secondary: 'oklch(0.15 0.005 15)',
  secondaryForeground: 'oklch(0.78 0.01 90)',
  muted: 'oklch(0.13 0.005 15)',
  mutedForeground: 'oklch(0.55 0.01 60)',
  accent: 'oklch(0.48 0.20 22)',
  accentForeground: 'oklch(0.95 0.01 90)',
  destructive: 'oklch(0.50 0.22 25)',
  border: 'oklch(0.22 0.01 15)',
  input: 'oklch(0.14 0.005 15)',
  ring: 'oklch(0.48 0.20 22)',
  narrative: 'oklch(0.88 0.01 90)',
  meta: 'oklch(0.48 0.05 240)',
  success: 'oklch(0.65 0.15 145)',
  warning: 'oklch(0.72 0.10 70)',
  tertiary: 'oklch(0.75 0.14 70)',
  tertiaryForeground: 'oklch(0.08 0.005 15)',
  titleGlow: '0 0 40px oklch(0.48 0.20 22 / 0.7), 0 0 80px oklch(0.48 0.20 22 / 0.3)',
  actionGlow: '0 0 0 1px rgba(180,40,40,0.25), 0 0 15px -3px rgba(180,40,40,0.2)',
  actionGlowHover: '0 0 0 1px rgba(180,40,40,0.5), 0 0 20px -3px rgba(180,40,40,0.35)',
  scrollbarThumb: 'oklch(0.22 0.005 15)',
  scrollbarThumbHover: 'oklch(0.28 0.005 15)',
  backgroundEffect: 'mist',
}

const noireConfig: GenreConfig = {
  id: 'noire',
  name: 'Noire',
  tagline: 'Everyone lies. The truth is what\'s left when the lies stop working.',
  available: true,
  species: noireSpecies,
  speciesLabel: 'Origin',
  classes: noireClasses,
  theme: noireTheme,
  currencyName: 'marks',
  currencyAbbrev: '₥',
  partyBaseName: 'Office',
  settingNoun: 'city',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge — a solo text RPG set in a rain-soaked city where everyone has something to hide.',
    setting: `A city that runs on money, secrets, and the careful distribution of both. The police are overworked or bought. The wealthy are untouchable until they aren't. The streets have their own justice. Everyone has a past, and most of those pasts are the kind you pay to keep quiet.

This is an investigation-driven world. Combat exists but is desperate and ugly, not heroic. INT and WIS are the primary currencies of survival. CHA checks carry lethal weight. The mystery isn't in the data — it's in what someone said, who they said it to, and what they left out.

Vocabulary (never use fantasy or sci-fi terms when the noir equivalent exists):
- Spell / tech → instinct / experience / a bad feeling
- Potion → cheap whiskey / aspirin / a stiff drink
- Quest → case / job / the thing you shouldn't have agreed to
- Party → nobody — you work alone, mostly
- Inn → hotel where the clerk remembers nothing / your apartment / the office
- Tavern → bar / dive / the kind of place where nobody looks up
- Credits / gold → marks / cash / "the price"
- Monster → the person you trusted / the one with the alibi / the client`,
    vocabulary: `Consumable terminology: cash (for bribes), favors (for access), credibility (for bluffs), evidence photos, cheap whiskey.
Rest terminology: Sleep it off (short rest), Lay low (long rest).`,
    tutorialContext: 'The opening chapter introduces the player to their office or neighborhood, one client with a problem, and a case that looks simple. First check: a social encounter (reading someone, getting information). First investigation: examining a scene or document. Combat, if any, should be a surprise that goes badly — noir protagonists aren\'t soldiers.',
  },
  promptSections: {
    role: 'You are the Game Master of a noir tabletop RPG campaign. You narrate a city of rain-slicked streets, buried secrets, and people who lie for a living.',
    setting: 'A city that runs on money, secrets, and the careful distribution of both. The police are overworked or bought. The wealthy are untouchable until they aren\'t. The streets have their own justice. Everyone has a past, and most of those pasts are the kind you pay to keep quiet. The truth is always uglier than the lie it replaced.',
    vocabulary: 'Use noir language naturally: tailing, stakeout, mark, grift, fall guy, patsy, muscle, heat. Places have character — the kind of bar where nobody looks up, the hotel where the clerk remembers nothing, the office with the frosted glass door. Rain is atmospheric, not decoration. Night is when the real city operates. Money is marks, cash, or "the price." Violence is described by its aftermath — bruised knuckles, a split lip, the way someone walks differently the next day.',
    toneOverride: 'Adjust tone: Gritty (50%), Witty (35%), Epic (15%). The grandeur is in the revelation — the moment the case clicks. Humor is dry and self-deprecating. Violence is short, ugly, and has consequences that last longer than the bruises.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Case Instinct:** Player proposes a connection between known facts. GM evaluates if the reasoning is plausible. Strong reasoning lowers DC. Failure is free but consumes narrative time (clocks may tick).\n- **Favor Owed:** Tab accumulates. After three unreturned favors, contacts demand reciprocity before helping. GM tracks the tab.\n- **Heavy Lean:** Intimidation auto-succeeds but permanently damages the relationship. Cannot be undone.\n- **New Face:** Cover holds for first contact. Blown covers are permanent — that NPC and their network never trust you above Neutral.\n- **On The Record:** Information gained is public. The GM should have other parties react to the published information within 1-2 scenes.`,
    consumableLabel: 'Cash (for bribes), favors (for access), credibility (for bluffs), evidence photos',
    tutorialContext: 'The opening chapter introduces the player to their office or neighborhood, one client with a problem, and a case that looks simple. First check: a social encounter (reading someone, getting information). First investigation: examining a scene or document. Combat, if any, should be a surprise that goes badly — noir protagonists aren\'t soldiers.',
    npcVoiceGuide: 'Cops: tired, procedural, protective of their cases and their pensions. Criminals: cautious, territorial, respect earned not given. Lawyers and officials: smooth, every word chosen, never say anything actionable. Bartenders and service workers: observant, transactional, remember faces and habits. Clients: desperate enough to hire you, which means desperate enough to lie to you.',
    buildAssetState: null,
    investigationGuide: `Case board — clues, witness statements, evidence photos, connections between suspects. Investigation is the core gameplay loop.

At chapter open or when a new case begins, establish privately:
- **The truth:** What actually happened (2-3 sentences). Never reveal this directly.
- **Evidence chain:** 5-8 clues that, connected in roughly the right order, reveal the truth. Not all need to be found — 4 of 6 is enough to crack the case.
- **Red herrings:** 2-3 clues that point somewhere plausible but wrong. Not traps — natural noise of an investigation.
- **Gatekeeper clue:** One clue that unlocks the final act. Obtainable through multiple paths — never a single bottleneck.

Don't pre-script which scenes contain which clues. Seed clues into scenes as the player moves through the world. If they go to the docks, the shipping manifest is there. If they go to the apartment first, a receipt for dock storage is there. Same clue, different paths.

Every case should have a tension clock. It ticks with time, failed checks, and antagonist moves. When it fills, something changes — evidence destroyed, witness disappears, the killer strikes again. Thoroughness competes with urgency.`,
  },
  notebookLabel: 'Case Board',
  openingHooks: [
    'A woman you\'ve never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names — four of them are still alive.',
    'Your client wants you to find their missing spouse. Simple enough. Then you find the spouse, and they beg you to say you didn\'t.',
    'A cop you trust asks you to look into a case they can\'t touch. The reason they can\'t touch it is the reason you shouldn\'t either.',
    'Someone is killing people connected to a trial that happened twenty years ago. You were a witness. You\'re the only one who hasn\'t been contacted — by the killer or the police.',
  ],
  initialChapterTitle: 'The Job',
  locationNames: [
    'The Margaux Office', 'The Sixth Precinct', 'The Idle Hour',
    'The Gaslight Agency', 'The Red Line Office', 'The Ashworth Bureau',
    'The Meridian Desk', 'The Cold File Agency', 'The Inkwell Office', 'The Dusk Bureau',
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
    promptSections: { role: '', setting: '', vocabulary: '', toneOverride: '', assetMechanic: '', traitRules: '', consumableLabel: '', tutorialContext: '', npcVoiceGuide: '', buildAssetState: null, investigationGuide: '' },
    notebookLabel: 'Notebook',
    openingHooks: [],
    initialChapterTitle: 'New Horizons',
    locationNames: ['Base'],
  }
}

const westernConfig     = makeStub('western',       'Western',       'The frontier doesn\'t ask where you came from.',                 'dollars', '$',   'Camp')
const zombieConfig      = makeStub('zombie',        'Zombie Apocalypse', 'The dead keep moving. The living keep making it worse.',    'supplies', 'sup', 'Enclave')
const wastelandConfig   = makeStub('wasteland',     'Post-Atomic Wasteland', 'The bombs fell. Something stranger rose in their place.', 'caps',    'ƈ',   'Settlement')
const coldWarConfig     = makeStub('cold-war',      'Cold War',      'No shots fired. Everyone\'s already compromised.',              'dollars', '$',   'Safe House')

// ─── Registry ─────────────────────────────────────────────────────────

const genreConfigs: Record<string, GenreConfig> = {
  'space-opera':  spaceOperaConfig,
  'fantasy':      fantasyConfig,
  'grimdark':     grimdarkConfig,
  'cyberpunk':    cyberpunkConfig,
  'noire':        noireConfig,
  'western':      westernConfig,
  'zombie':       zombieConfig,
  'wasteland':    wastelandConfig,
  'cold-war':     coldWarConfig,
}

export const genres: { id: Genre; name: string; available: boolean }[] = [
  { id: 'space-opera',  name: 'Space Opera',   available: true  },
  { id: 'fantasy',      name: 'Fantasy',        available: true  },
  { id: 'grimdark',     name: 'Grimdark',       available: true  },
  { id: 'cyberpunk',    name: 'Cyberpunk',      available: true  },
  { id: 'noire',        name: 'Noire',          available: true  },
  { id: 'western',      name: 'Western',        available: false },
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
  // Font vars also go on body where next/font CSS variables are defined
  const bodyEl = document.body

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
  bodyEl.style.setProperty('--font-narrative', theme.fontNarrative)
  bodyEl.style.setProperty('--font-heading', theme.fontHeading)
  bodyEl.style.setProperty('--font-system', theme.fontSystem)
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
