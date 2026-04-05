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
  hitDieAvg: number  // average HP gained per level (before CON mod). Tanks: 6, mixed: 5, faces/casters: 4
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
  fontScale?: number  // multiplier for base font sizes — 1.0 is default, 0.9 = 90%
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
  intelTabLabel: string        // top-level tab: Intel, Case Board, Recon, Lore, Dossier
  intelNotebookLabel: string   // sub-tab for evidence: Intelligence, Evidence, Data, Research
  intelOperationLabel: string  // sub-tab for operations: Operation, The Play, The Run, Quest, Scheme
  explorationLabel: string     // exploration card header prefix: Facility, Dungeon, Scene, Network, Ground
  openingHooks: (string | { hook: string; title?: string; classes?: string[] })[]
  initialChapterTitle: string
  locationNames: string[]
}

// ─── Space Opera ──────────────────────────────────────────────────────

const spaceOperaSpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, widespread, politically dominant in most systems.',
    lore: 'The default face in every station and port. Nobody looks twice at a human, which is itself a kind of advantage. No starting contact bonus, but no suspicion either. Advantage on checks to blend in, pass unnoticed, or avoid profiling. The cost: no cultural network to fall back on. When things go wrong, you\'re on your own.',
  },
  {
    id: 'vrynn',
    name: 'Vrynn',
    description: 'Insectoid. Chitinous plating, compound eyes, darkvision.',
    lore: 'Uncommon in core systems — most people have never spoken to a Vrynn, and the compound eyes make them uneasy. That discomfort cuts both ways: people underestimate you, and people avoid you. Start with one Vrynn diaspora contact at Favorable (information broker or mechanic). Advantage on Perception checks (compound eyes process movement faster). Disadvantage on initial Persuasion checks with species that rely on facial expressions for trust — you can\'t smile, and they can\'t read you.',
  },
  {
    id: 'korath',
    name: 'Korath',
    description: 'Broad, dense-boned, grey-skinned. Built for heavy gravity worlds.',
    lore: 'Korath are respected in dockyards, engineering bays, and anywhere that values directness over diplomacy. Blunt honesty is cultural, not rudeness — but most other species don\'t know the difference. Start with one industrial sector contact at Favorable (dock boss or supply officer). Advantage on Engineering and Athletics checks. Disadvantage on Deception checks — your culture doesn\'t train for lying, and your face doesn\'t hide it.',
  },
  {
    id: 'sylphari',
    name: 'Sylphari',
    description: 'Tall, luminescent markings, low-light adapted.',
    lore: 'From tidally locked worlds where patience isn\'t a virtue, it\'s a survival trait. Sylphari are welcome in diplomatic halls and academic stations; less so in frontier bars where "calm" reads as "condescending." Start with one academic or diplomatic contact at Favorable. Advantage on Insight checks (reading emotional states is how Sylphari survived millennia of darkness-side politics). First impression with frontier or military NPCs starts one tier lower than normal — prove yourself before they listen.',
  },
  {
    id: 'zerith',
    name: 'Zerith',
    description: 'Lean, scaled, cold-blooded. Fast reflexes, poor endurance in sustained cold.',
    lore: 'No homeworld, no unified government, no cultural center. Zerith are freelancers by nature and reputation — which means most station authorities assume you\'re a mercenary, smuggler, or both. Start with one freelancer contact at Favorable (fellow Zerith, operates independently). Advantage on Initiative and Reflex saves (cold-blooded physiology, faster neural response). Disadvantage on CON checks in sustained cold environments. Authorities and law enforcement start at Wary.',
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
    hitDieAvg: 5,
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
    hitDieAvg: 6,
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
    hitDieAvg: 4,
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
    hitDieAvg: 4,
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
    hitDieAvg: 5,
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
    hitDieAvg: 5,
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
  fontScale: 0.85,
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
    setting: `Year 3187. The Compact that held 200 star systems together has fractured. Pirate fleets, rogue AIs, and a mysterious signal from beyond the Rim threaten everything. The player commands a scrappy frigate (see SHIP in game state) with a small crew, navigating this chaos.

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
    setting: 'The galaxy is post-collapse. The Compact that once unified 200 star systems has fractured into competing powers: Compact Remnants clinging to legitimacy and beacon infrastructure, Pirate Fleets carving territory and running protection rackets, Corporate Blocs that bought out Compact infrastructure during the collapse, Frontier Settlements too small to be a faction but too numerous to ignore, and Rogue AIs occupying derelict stations and network nodes since containment protocols failed. FTL travel exists but is constrained by beacon corridors — charted routes the Compact built. Outside those corridors, navigation is dangerous, slow, and expensive. Whoever controls a beacon controls the traffic through it. Some corridors have gone dark entirely. The frontier is lawless. The core is political.',
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
  intelTabLabel: 'Intel',
  intelNotebookLabel: 'Intelligence',
  intelOperationLabel: 'Operation',
  explorationLabel: 'Facility',
  openingHooks: [
    // Universal — work for any class
    { hook: 'A distress signal pulled the ship off-course to a derelict freighter drifting in an asteroid belt. The cargo bay doors are open. No life signs.', title: 'Dead Frequency' },
    { hook: 'Shore leave on a fringe colony. The crew splits up. Then an explosion rocks the market district, and the station goes into lockdown.', title: 'Shore Leave' },
    { hook: 'The ship received anonymous coordinates and a single encrypted message: "Come alone. Bring the item." The crew doesn\'t know what item the sender means.', title: 'The Item' },
    { hook: 'Docked for refueling at a mining outpost, the crew witnesses station security dragging someone away. The prisoner locks eyes with the captain and mouths one word: "Help."', title: 'One Word' },
    // Driftrunner
    { hook: 'The cargo in bay three is humming. It wasn\'t humming when you loaded it. The manifest says machine parts, but the radiation counter says otherwise. And the buyer changed the drop coordinates an hour ago.', title: 'Hot Cargo', classes: ['Driftrunner'] },
    { hook: 'A routine cargo run turned sour. The client never showed at the rendezvous point, and now an unknown ship is tailing the crew through a nebula. Whatever\'s in the crate, someone wants it back.', title: 'No Show', classes: ['Driftrunner'] },
    { hook: 'Customs flagged the ship at a core-world checkpoint. The contraband isn\'t yours — someone planted it during the last dock. Now station security wants to impound the ship, and the real owner of the cargo is sending threats over encrypted comm.', title: 'Planted', classes: ['Driftrunner'] },
    // Vanguard
    { hook: 'The convoy you were hired to escort just lost its lead ship to a pirate ambush. The remaining transports are scattering, your employer is screaming over comms, and the pirates are already locking weapons on the next target.', title: 'Broken Convoy', classes: ['Vanguard'] },
    { hook: 'A frontier outpost went dark three days ago. The garrison commander was a friend. The relief force found the station intact but empty — no bodies, no damage, no explanation. They\'re asking for someone willing to go inside.', title: 'Dark Station', classes: ['Vanguard'] },
    { hook: 'A warlord from the Outer Reach is offering amnesty and triple pay to any ex-military crew willing to run a blockade. The cargo is humanitarian supplies. The blockade is run by the faction you used to serve.', title: 'Old Colors', classes: ['Vanguard'] },
    // Technomancer
    { hook: 'The ship\'s AI woke you at 0300 with a priority alert: someone accessed the encrypted partition while you were asleep. The intrusion came from inside the ship. The AI can\'t identify who.', title: 'Inside Job', classes: ['Technomancer'] },
    { hook: 'A dead hacker\'s neural implant arrived in a courier package addressed to you. No return sender. The implant contains a partial decryption key to a file that\'s been bouncing around darknet servers for months — a file three corporations have killed to suppress.', title: 'Dead Drop', classes: ['Technomancer'] },
    { hook: 'The station you just docked at is running on emergency protocols — life support cycling, airlocks glitching, docking clamps won\'t release. The station AI insists everything is nominal. It isn\'t. And your ship is locked in.', title: 'Nominal', classes: ['Technomancer'] },
    // Diplomat
    { hook: 'Two factions on the verge of war have agreed to meet on neutral ground — your ship. The summit starts in six hours. Then the lead negotiator for one side is found dead in their quarters, and both delegations are blaming the crew.', title: 'Neutral Ground', classes: ['Diplomat'] },
    { hook: 'An old political ally sends an encrypted message: they\'ve been accused of treason and are being transferred to a black site. They have information that could destabilize the sector. They\'re asking you to intervene — officially or otherwise.', title: 'Black Site', classes: ['Diplomat'] },
    { hook: 'You brokered a ceasefire between a mining colony and its corporate owners. It was supposed to hold. Now the colony leader is dead, the corporation is moving security forces in, and both sides say you guaranteed terms the other violated.', title: 'Broken Terms', classes: ['Diplomat'] },
    // Medic
    { hook: 'A cargo hauler docks with your station requesting emergency medical assistance. The patient has symptoms you\'ve never seen — tissue regenerating faster than it should, organs in the wrong places. The hauler\'s crew won\'t say where they found this person.', title: 'Wrong Anatomy', classes: ['Medic'] },
    { hook: 'A quarantine alert locks down the station you\'re docked at. The pathogen is unknown, spreading fast, and doesn\'t match anything in the medical database. Station medical is overwhelmed and asking for volunteers. The first patients are already dying.', title: 'Patient Zero', classes: ['Medic'] },
    { hook: 'A former colleague sends you lab results that shouldn\'t exist: a blood sample from a patient who died two years ago, showing active cell division. The sample was collected yesterday. From a facility that was supposed to be decommissioned.', title: 'Active Cells', classes: ['Medic'] },
    // Ace
    { hook: 'The ship is running on fumes, limping into the nearest port after a pirate ambush damaged the FTL drive. The only station in range is controlled by a faction the crew has history with — and they remember the last time you outflew their patrol squadron.', title: 'Fumes', classes: ['Ace'] },
    { hook: 'A pilot you used to fly with went missing on a charted beacon corridor — a route that\'s supposed to be safe. Search and rescue found the ship drifting, engines cold, flight recorder wiped. The cockpit was locked from the inside. No body.', title: 'Locked Cockpit', classes: ['Ace'] },
    { hook: 'An anonymous client is offering a fortune to fly a sealed container through the Wraith Nebula — an uncharted region where navigation systems fail and ships disappear. No questions, payment on delivery. Three other pilots already turned it down.', title: 'The Wraith Run', classes: ['Ace'] },
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
    lore: 'The common face of every kingdom. Nobody questions a human at a city gate or a market stall. No starting contact bonus, but no suspicion either. Advantage on checks to blend in or navigate bureaucracy — the systems were built by humans, for humans. The cost: no racial network. Other species look after their own; humans are on their own.',
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Slender, long-lived, keen-eyed.',
    lore: 'Elven patience is cultural, not passive — it comes from living long enough to see hasty decisions rot. Welcomed in courts and academies; distrusted on the frontier where "elf" means "outsider who thinks they know better." Start with one court or academic contact at Favorable. Advantage on Perception and History checks (keen eyes, long memory). Frontier and common-folk NPCs start at Wary — earn their respect through action, not lineage.',
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Stocky, dense-boned, mountain-born.',
    lore: 'Dwarven bluntness isn\'t rudeness; it\'s efficiency. A dwarf\'s word is a contract, and a contract is unbreakable. Trade guilds know this, which is why dwarven merchants get better terms than anyone else. Start with one trade guild contact at Favorable. Advantage on Engineering, Appraisal, and CON saves (dense bones, stubborn constitution). Disadvantage on Deception checks — lying goes against everything your culture taught you, and your face shows it.',
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small, nimble, deceptively tough.',
    lore: 'People see the size and stop looking. That\'s the advantage. Halflings are everywhere, owned by no kingdom, beholden to no lord — which makes them either invisible or suspect, depending on who\'s asking. Start with one traveling merchant or innkeeper contact at Favorable (halfling network, always passing through). Advantage on Stealth checks and checks to go unnoticed in crowds. Disadvantage on Intimidation — nobody fears someone they could pick up.',
  },
  {
    id: 'dragonkin',
    name: 'Dragonkin',
    description: 'Tall, scaled, remnants of an ancient bloodline.',
    lore: 'The Wyrm Kingdoms fell three centuries ago, but the fear hasn\'t. Dragonkin are imposing, fast, and carry a reputation for violence they didn\'t earn. Some doors open because people are afraid to say no. Others close for the same reason. But the dragonkin carry something else: fragments of pre-Sundering knowledge. Oral traditions, inherited memory, dreams that map to Ancient ruin layouts. The other species lost their connection to the Ancients when the Wyrm Kingdoms burned. The dragonkin didn\'t. Start with one dragonkin exile contact at Favorable (scattered community, fiercely loyal). Advantage on Intimidation and Initiative. Advantage on checks involving Ancient ruins, pre-Sundering lore, or interpreting Ancient artifacts (inherited cultural memory). Most NPCs start at Wary — you\'re feared before you\'re known. Climbing to Trusted takes twice as long.',
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
    hitDieAvg: 5,
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
    hitDieAvg: 6,
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
    hitDieAvg: 4,
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
    hitDieAvg: 4,
    trait: {
      name: 'Bardic Echo',
      description: 'Once per day, invoke a story, song, or legend that shifts the mood of a scene. A crowd calms, a guard hesitates, an enemy pauses. Requires speaking; useless when silenced or ambushed.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'keeper',
    name: 'Keeper',
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
    hitDieAvg: 5,
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
    hitDieAvg: 5,
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
    role: 'You are the Game Master of Storyforge, a solo text RPG set in a crumbling medieval fantasy world.',
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
    setting: 'A world of medieval-level technology augmented by magic. Kingdoms, city-states, and wild territories coexist uneasily. Magic is real but not ubiquitous, studied, feared, worshipped, or hunted. Ancient ruins hold pre-collapse knowledge. The wilderness is genuinely dangerous. Gods may or may not exist, but their churches do.',
    vocabulary: 'Use grounded fantasy language: stone and timber, torches and lanterns, horses and carts. Magic has a physical cost, fatigue, nosebleeds, trembling. Spells are cast or invoked, not activated. Weapons are steel, iron, or enchanted. Currency is gold, silver, copper. Avoid modern idioms.',
    toneOverride: 'Adjust tone: Epic (70%), Gritty (20%), Witty (10%). The grandeur is real, ancient halls, vast forests, the weight of prophecy. The grit grounds it: mud on boots, hunger on the road.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Arcane Surge:** On nat 1 spell checks, wild magic surges. GM picks a random effect.\n- **Bardic Echo:** GM determines effect of story or song. Requires speech — useless when silenced.\n- **Divine Favor:** GM silently tracks deity alignment. In alignment: full power. Against: half.\n- **Shadow Step:** Requires shadow or cover — useless in open daylight.`,
    consumableLabel: 'Potions, salves, scrolls, antidotes',
    tutorialContext: 'The opening chapter introduces a settlement, one ally, and a local problem hinting at something larger. First check: social or investigation. First combat: bandits, beasts, or undead.',
    npcVoiceGuide: 'Nobles: formal, indirect, power through what they don\'t say. Soldiers: direct, rank-aware, duty and obligation. Scholars: precise, irritated by imprecision. Common folk: practical, concrete terms. Clergy: measured, parable-prone.',
    buildAssetState: null,
    investigationGuide: 'Lore codex: prophecy fragments, historical connections, magical phenomena, ancient texts. When the player researches mysteries, track discoveries as narrative threads. Clues come from libraries, ruins, NPC scholars, and divination.',
  },
  notebookLabel: 'Codex',
  intelTabLabel: 'Lore',
  intelNotebookLabel: 'Research',
  intelOperationLabel: 'Quest',
  explorationLabel: 'Dungeon',
  openingHooks: [
    // Universal
    { hook: 'The tavern door slams open. A wounded rider staggers in, clutching a sealed message. "For the company at the back table," he gasps, then collapses. The seal bears a crest no one has seen in twenty years.', title: 'The Sealed Message' },
    { hook: 'The company is camped in the foothills when a stranger approaches the fire. She offers information about a bounty on the company\'s heads, but her price is a favor she won\'t name yet.', title: 'The Stranger\'s Price' },
    { hook: 'Market day in the capital. The company splits up to resupply. Then the cathedral bells start ringing — not for prayer. The city gates are closing.', title: 'Closing Gates' },
    { hook: 'Passing through a mountain pass, the company finds a caravan overturned and looted. One survivor, badly hurt, begs for help: "They took the children into the mines."', title: 'Into the Mines' },
    // Shadowblade
    { hook: 'A merchant hired the company to escort a cart through the Thornwood. Simple job. But the lock on the cart is one you recognize — guild-work, the kind used to seal things people kill to protect. And the merchant keeps looking over his shoulder.', title: 'Guild-Work', classes: ['Shadowblade'] },
    { hook: 'Someone broke into the duke\'s treasury last night using techniques only a handful of people know. You\'re one of them. The duke\'s men are already asking questions, and the real thief left behind a calling card that looks uncomfortably like yours.', title: 'Your Calling Card', classes: ['Shadowblade'] },
    { hook: 'A dying man presses a key into your hand in a crowded market. "The vault under the old courthouse. Before the full moon." He\'s dead before you can ask what\'s in it — or who\'s already looking for it.', title: 'Before the Moon', classes: ['Shadowblade'] },
    // Warden
    { hook: 'A warlord\'s army is three days from the city. The council offers you command of the defense — but you recognize the warlord\'s banner. You served under it once.', title: 'Old Banners', classes: ['Warden'] },
    { hook: 'The garrison at Thornwall hasn\'t sent a rider in two weeks. The road north is open, the weather is clear, and no one will say why they stopped sending reports. The crown wants someone to ride up and find out.', title: 'Silent Garrison', classes: ['Warden'] },
    { hook: 'A knight you once served with arrives at your camp, wounded and alone. His company was ambushed escorting a prisoner. The prisoner escaped. The knight says the prisoner must be found before dawn — not because of what he did, but because of what he knows.', title: 'Before Dawn', classes: ['Warden'] },
    // Arcanist
    { hook: 'A map found in a dead adventurer\'s pack leads to a hidden entrance beneath an ancient watchtower. The markings are in a language nobody in the company reads — except you. It\'s a dialect of Old Arcane that was supposed to have died with the Sundering.', title: 'Dead Language', classes: ['Arcanist'] },
    { hook: 'Your spell misfired last night. Not a wild surge — something answered. A voice in the residual energy, speaking words you didn\'t cast. Your focus crystal is still warm this morning, and it shouldn\'t be.', title: 'Something Answered', classes: ['Arcanist'] },
    { hook: 'A sealed archive beneath the Collegium has been opened for the first time in a century. Three scholars went in to catalog the contents. One came back, unable to speak. The Collegium is asking for someone with practical experience to go in after the other two.', title: 'The Sealed Archive', classes: ['Arcanist'] },
    // Herald
    { hook: 'Two lords on the edge of war have agreed to meet — but only if you broker the terms. One of them saved your life once. The other is married to the person who betrayed you. Both know your name.', title: 'Both Sides', classes: ['Herald'] },
    { hook: 'A song you wrote three years ago about a dead king has resurfaced. Someone is performing it in every tavern from here to the capital, and the lyrics have been changed. The new version names a living lord as the killer. People believe it because your name is on it.', title: 'Changed Lyrics', classes: ['Herald'] },
    { hook: 'A minor noble offers the company winter quarters and full pay to perform one task: deliver a marriage proposal to a neighboring house. The catch — the bride has already refused twice, and the last messenger came back missing three fingers.', title: 'Third Proposal', classes: ['Herald'] },
    // Keeper
    { hook: 'The healer who saved your life asks one favor in return: escort her to a temple that her own church has declared heretical. She says the temple holds a cure for the eastern plague. The church says it holds something worse.', title: 'The Heretical Cure', classes: ['Keeper'] },
    { hook: 'A village priest sends word that the dead in his churchyard aren\'t staying dead. Not undead — breathing, confused, remembering nothing. The church hierarchy wants the village quarantined. The priest wants someone who can tell healing from abomination.', title: 'The Breathing Dead', classes: ['Keeper'] },
    { hook: 'A wounded soldier is carried into camp. The wound is cursed — it won\'t close, and conventional healing accelerates the decay. The soldier carries orders that must reach the capital in three days. Healing him means understanding the curse. Understanding the curse means finding who cast it.', title: 'Cursed Wound', classes: ['Keeper'] },
    // Ranger
    { hook: 'The Thornwood is moving. Not growing — moving. The tree line has advanced half a mile in a week, swallowing farmland. Livestock that wanders in doesn\'t come back. The locals say the forest is angry. The tracks you found at the new edge say something in the forest is hunting.', title: 'The Moving Wood', classes: ['Ranger'] },
    { hook: 'A hunting party went into the highlands a week ago and hasn\'t returned. You found their camp — abandoned, gear intact, food still on the fire. No blood, no struggle. But the tracks leading away from camp aren\'t human, and they\'re heading toward the nearest village.', title: 'Cold Camp', classes: ['Ranger'] },
    { hook: 'Something has been killing wolves in the eastern range. Not hunters — the kills are too clean, too deliberate, and the bodies are arranged in patterns. Whatever is doing this is working its way down the food chain. The wolves were the largest predator in the area. The next largest is the livestock.', title: 'The Pattern', classes: ['Ranger'] },
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
    lore: 'You grew up where the city doesn\'t bother pretending. Cops don\'t come, corps don\'t care, and you learned to read a room before you learned to read. Start with one gang contact at Favorable. Advantage on Streetwise checks. Disadvantage on initial social checks with corpo or institutional NPCs — they see the ward before they see you.',
  },
  {
    id: 'corpo',
    name: 'Corpo Dropout',
    description: 'Former corporate employee. Polished accent, expensive habits, one bad decision.',
    lore: 'You still walk like you own the building, and it still opens doors. But the corp remembers you left, and they remember why. Start with one former corpo colleague at Neutral (they\'re cautious, not loyal). Your former corporation as a faction starts at Wary — you know too much, and they know you know. Advantage on social checks in corporate environments — you know the language, the hierarchy, the tells. Gang and street NPCs start at Wary: you smell like the enemy.',
  },
  {
    id: 'nomad',
    name: 'Nomad',
    description: 'Arrived from the badlands with a car, a gun, and clan instincts.',
    lore: 'The city is loud, vertical, and full of people who mistake comfort for safety. You know what it means to survive without a safety net. Start with one clan contact at Trusted (outside the city, reachable by comm). Advantage on Survival and vehicle-related checks. City fixers start at Wary — nomads are unpredictable, and unpredictable is bad for business.',
  },
  {
    id: 'undercity-born',
    name: 'Undercity Born',
    description: 'Grew up in the maintenance warrens and black-market tunnels beneath the city\'s visible layers.',
    lore: 'You know routes that don\'t appear on any official map and people who don\'t appear in any database. The surface world is loud and exposed; you prefer walls on all sides. Start with one black-market dealer at Favorable. Advantage on checks to navigate, hide, or find things in urban infrastructure. Disadvantage on social checks in high-society or corporate settings — you don\'t know the codes, and it shows.',
  },
  {
    id: 'syndicate-blood',
    name: 'Syndicate Blood',
    description: 'Raised inside an organized crime family or gang hierarchy. Knows how authority actually works.',
    lore: 'You understand the difference between power and the performance of power. Obligations don\'t expire, and neither do the connections. Start with one syndicate contact at Favorable. A rival gang or syndicate faction starts at Hostile — they know your family, and the history between you is blood. Advantage on Intimidation and checks to read power dynamics. But the family watches: acting against syndicate interests (even indirectly) gets reported. Betrayal drops every syndicate NPC by two disposition tiers.',
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
    hitDieAvg: 5,
    trait: {
      name: 'Zero Trace',
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
    hitDieAvg: 6,
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
    hitDieAvg: 4,
    trait: {
      name: 'Deep Dive',
      description: 'Once per day, auto-succeed on a Hacking check or seize a networked device. Each use adds neural stress. After 3 cumulative uses without a rest chapter, the GM introduces a cyberpsychosis episode.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'broker',
    name: 'Broker',
    concept: 'Information Broker / Connected Operator',
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
    hitDieAvg: 4,
    trait: {
      name: 'Marker Called',
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
    hitDieAvg: 5,
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
    hitDieAvg: 6,
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
  tertiary: 'oklch(0.68 0.16 55)',
  tertiaryForeground: 'oklch(0.09 0.02 260)',
  titleGlow: '0 0 40px oklch(0.75 0.22 145 / 0.8), 0 0 80px oklch(0.75 0.22 145 / 0.4)',
  actionGlow: '0 0 0 1px rgba(80,220,120,0.2), 0 0 15px -3px rgba(80,220,120,0.15)',
  actionGlowHover: '0 0 0 1px rgba(80,220,120,0.4), 0 0 20px -3px rgba(80,220,120,0.3)',
  scrollbarThumb: 'oklch(0.25 0.02 260)',
  scrollbarThumbHover: 'oklch(0.30 0.02 260)',
  backgroundEffect: 'starfield',
  fontScale: 0.85,
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
    traitRules: `## TRAIT RULES\n\n- **Zero Trace:** One scan, camera network, or access log erased per chapter. The absence itself can be noticed — a gap in a log is suspicious to a careful investigator.\n- **Deep Dive:** Track cumulative uses. After 3 without rest chapter, GM introduces cyberpsychosis episode.\n- **Adrenaline Overclocked:** Bonus attack, but chrome stress accumulates. GM tracks.\n- **Marker Called:** Contact unavailable until next chapter after being called in. Tab accumulates — after three unreturned markers, next contact demands something first.\n- **Field Triage:** Heal with a side effect (pain, dependency, temporary sense loss). Side effects worse on heavily chromed patients.\n- **Killswitch:** Designate target as Marked. First hit deals +1d6 bonus damage. Target knows something changed — fight-or-flight response.`,
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
  intelTabLabel: 'Recon',
  intelNotebookLabel: 'Data',
  intelOperationLabel: 'The Run',
  explorationLabel: 'Network',
  openingHooks: [
    // Universal
    { hook: 'The crew wakes up in a med-bay with a gap in their memory logs and someone else\'s coordinates loaded into their neural buffer. No explanation. No sender. Just a location and a time.', title: 'Memory Gap' },
    { hook: 'A rival crew is dead. Their equipment, their job board, and their contacts are up for grabs — but so is whoever killed them.', title: 'Dead Crew' },
    { hook: 'The city goes dark. Not a power failure — a targeted blackout in a six-block radius. In the silence, a voice on every local channel says a name. It\'s the player\'s.', title: 'Blackout' },
    { hook: 'A corp access card shows up in the safehouse mail slot. The face on the ID matches no one in the crew. The clearance level is maximum.', title: 'Maximum Clearance' },
    // Ghost
    { hook: 'The job was supposed to be clean: grab the data chip, ghost out. Then corpo security showed up two hours early, and now you\'re pinned in a ventilation shaft forty floors up with no way down.', title: 'Forty Floors Up', classes: ['Ghost'] },
    { hook: 'A corpo exec offers triple rate to break into her own company\'s server room. She says it\'s a security audit. The floor plan she gave you has rooms that don\'t appear on any public blueprint.', title: 'Hidden Rooms', classes: ['Ghost'] },
    { hook: 'You got in clean. You got the data. You got out. Then your fence tells you the chip is blank — wiped remotely sometime between extraction and delivery. Someone knew the exact moment you\'d have it.', title: 'Blank Chip', classes: ['Ghost'] },
    // Razorback
    { hook: 'A gang boss you used to work for is dead. Killed in a way that matches your signature — mantis blades, close range, no witnesses. You didn\'t do it, but the gang doesn\'t know that. They\'re already hunting.', title: 'Your Signature', classes: ['Razorback'] },
    { hook: 'A street doc patches you up after a firefight and mentions, casually, that the chrome in your arm isn\'t factory. Someone modified your cyberware while you were under, and she can\'t tell what it does.', title: 'Modified Chrome', classes: ['Razorback'] },
    { hook: 'Three gangs are converging on the same block tonight — your block. One of them hired you to hold the line. The other two don\'t know you\'re here yet. Neither does the NCPD AV circling overhead.', title: 'Three Fronts', classes: ['Razorback'] },
    // Netrunner
    { hook: 'Last night you uploaded something to the net that you shouldn\'t have. You don\'t remember doing it. Your rig\'s activity log says it took eleven minutes. Three corps have already noticed.', title: 'Eleven Minutes', classes: ['Netrunner'] },
    { hook: 'A dead netrunner\'s deck shows up at a pawn shop with your handle scratched into the casing. Inside: an unfinished run against a corp subnet, paused mid-execution. The daemon is still live, waiting for someone to finish what they started.', title: 'Unfinished Run', classes: ['Netrunner'] },
    { hook: 'You jacked into a routine data grab and found something underneath — a ghost subnet that shouldn\'t exist, running on hardware that was decommissioned five years ago. Something in it pinged you back.', title: 'Ghost Subnet', classes: ['Netrunner'] },
    // Broker
    { hook: 'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of you meeting a client who was found dead the next morning. Someone is building a case — or leverage.', title: 'Leverage', classes: ['Broker'] },
    { hook: 'Your most reliable contact calls in a panic: someone is burning their network from the inside. Three brokers dead in two days, all connected to the same job — a job you brokered six months ago and thought was finished.', title: 'Burning Network', classes: ['Broker'] },
    { hook: 'A corpo middleman offers you a name — someone high up who wants to defect. All you have to do is arrange safe passage. The catch: two other brokers got the same offer this week. Neither of them made it home.', title: 'Safe Passage', classes: ['Broker'] },
    // Medtech
    { hook: 'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours. When you get there, the ripperdoc says she\'s not a hostage.', title: 'Not a Hostage', classes: ['Medtech'] },
    { hook: 'A patient walks into your clinic with military-grade chrome that no street doc installed. They don\'t know where it came from. They don\'t remember the surgery. And the serial numbers on the implants belong to a soldier who died two years ago.', title: 'Dead Man\'s Chrome', classes: ['Medtech'] },
    { hook: 'Someone is killing ripperdocs in the lower city. Clean work — no forced entry, no theft, just a body and a message carved into the operating table. You\'re the only doc in the district who hasn\'t been hit yet.', title: 'Last Doc Standing', classes: ['Medtech'] },
    // Solo
    { hook: 'The target is dead. Clean job, clean exit. Then the client sends a second payment — double the original — with a note: "Wrong person. Real target attached. Finish it." The photo is someone you know.', title: 'Wrong Person', classes: ['Solo'] },
    { hook: 'You wake up in a motel room you don\'t recognize with a bullet wound you don\'t remember getting. Your gun has been fired. The news is running a story about a corpo exec found dead downtown. Your face isn\'t on camera. Yet.', title: 'Missing Hours', classes: ['Solo'] },
    { hook: 'A contract comes in through the usual channels: eliminate a solo operator who\'s been hitting corp targets across the city. Efficient, methodical, no witnesses. You read the dossier twice before you realize — the operational profile is yours.', title: 'Your Profile', classes: ['Solo'] },
  ],
  initialChapterTitle: 'Night One',
  locationNames: [
    'The Ghost Circuit', 'The Neon Dogs', 'The Iron Ghosts', 'The Static Crew',
    'The Last Signal', 'The Chrome Pact', 'The Grid Runners', 'The Null Faction',
    'The Blind Protocol', 'The Ashen Wire',
  ],
}

// ─── Grimdark ─────────────────────────────────────────────────────────

const grimdarkSpecies: Species[] = [
  {
    id: 'house-veldran',
    name: 'House Veldran',
    description: 'Merchant nobility. Politically dominant, widely spread, no special bloodline traits.',
    lore: 'Wealth is the only bloodline that matters, and Veldran has more of it than anyone. The name opens ledgers, not hearts — merchants cooperate, commoners resent, and rival houses scheme. Start with one Veldran trade agent at Favorable. House Ashfang as a faction starts at Wary (old debts from the Wyrm war reparations). Advantage on checks involving commerce, bribes, or reading financial motives. The cost: everyone assumes you\'re buying loyalty, not earning it. Common folk start at Wary — wealth breeds resentment.',
  },
  {
    id: 'house-sylvara',
    name: 'House Sylvara',
    description: 'Ancient woodland bloodline. Long-lived, keen-eyed, patient to a fault.',
    lore: 'Sylvara patience comes from outliving everyone who rushed. Courts respect the name; frontier camps don\'t. Your calm reads as arrogance to people who are hungry now. Start with one Sylvara elder at Favorable (distant, but responsive to the house name). House Veldran as a faction starts at Wary (Sylvara patience has cost Veldran money for generations). Advantage on Perception and Insight checks — you\'ve learned to watch before you act. Frontier and common-folk NPCs start at Wary. Earning trust takes twice as many positive interactions.',
  },
  {
    id: 'house-stonemark',
    name: 'House Stonemark',
    description: 'Mountain clan bloodline. Dense-boned, blunt-spoken, legendary craftsmen.',
    lore: 'A Stonemark word is a Stonemark bond — generations of debts honored, promises kept, enemies remembered. Trade guilds deal with you on reputation alone. But bluntness is a liability when subtlety matters: you say what you mean, and everyone knows it. Start with one guild or clan contact at Favorable. House Sylvara as a faction starts at Wary (centuries of mountain-court friction — Stonemark bluntness offends Sylvara sensibility). Advantage on CON saves and Engineering/Crafting checks. Disadvantage on Deception — your culture considers lying a form of cowardice, and your face agrees.',
  },
  {
    id: 'oathless',
    name: 'The Oathless',
    description: 'Broken oath. Expelled, fled, or disgraced from a landed house.',
    lore: 'You had a name, a seat, obligations, and you lost them. Maybe you broke a sworn pact. Maybe you refused an order that would have kept your standing. Maybe you were framed. The reason matters to you; it doesn\'t matter to anyone else. The houses see a traitor. The streets see someone with useful skills and no protection. Start with one contact from your former house at Hostile (the people you wronged or who wronged you — they remember). One underworld contact at Favorable (the networks that absorb the disgraced). Advantage on checks involving survival outside institutional structures — you\'ve learned to operate without a safety net. Disadvantage on initial social checks with any landed house — the Oathless are marked, and house loyalty is the currency of this world. Your former house\'s name comes up in conversation more than you\'d like.',
  },
  {
    id: 'house-ashfang',
    name: 'House Ashfang',
    description: 'Fallen bloodline. Scaled, fast, remnants of the Char Dominion.',
    lore: 'The Char Dominion burned three centuries ago, but the fear is fresh. Ashfang are fast, imposing, and carry a name that makes people reach for weapons. Some cooperate because they\'re afraid. Others refuse to cooperate for the same reason. Start with one Ashfang exile contact at Favorable (scattered but loyal). The Church as a faction starts at Hostile (the Char Dominion burned temples; the Church has a long memory). House Veldran as a faction starts at Wary (they profited from the fall and don\'t want the past revisited). Advantage on Intimidation and Initiative. Most NPCs start at Wary — you are feared before you are known. Breaking through to Trusted requires proof of character, not just words.',
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
    hitDieAvg: 5,
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
    hitDieAvg: 6,
    trait: {
      name: 'Last Standing',
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
    hitDieAvg: 4,
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
    hitDieAvg: 4,
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
    hitDieAvg: 5,
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
    hitDieAvg: 5,
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
    setting: `The Shattered Provinces have held peace for a generation, but the Pact of Ashes is fraying. A famine called the Wasting spreads from the southern provinces, crops failing and livestock dying without explanation. Border lords raise private armies. The Church of the Pale Flame burns reformers and calls it salvation. Something stirs beneath the old ruins that predate every kingdom alive today.

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
    setting: 'The Shattered Provinces have held an uneasy peace under the Pact of Ashes, but the treaty is fraying. A famine called the Wasting creeps from the southern provinces. The Church of the Pale Flame controls hospitals, orphanages, and the Inquisition. Kingdoms are corrupt or tyrannical. Magic is rare, feared, and forbidden — those who wield it pay a visible price. The common people suffer regardless of who rules. Moral clarity is a luxury.',
    vocabulary: 'Use blunt, physical language: mud, blood, iron, rot. Violence has weight. Death is ugly. Healing is slow. Magic is unsettling. Currency is crowns. Dialogue is direct, often crude. Titles used with irony as often as respect. Spell = hex / curse / forbidden working / corrupted craft. Potion = tincture / salve / kit / vial. Quest = contract / job / commission. Party = company / crew / band. Inn = tavern / waystation / camp. Temple = keep / monastery / shrine.',
    toneOverride: 'Adjust tone: Gritty (60%), Epic (25%), Witty (15%). Grandeur exists but is tarnished — a crumbling cathedral, a once-great army reduced to mercenaries. Humor is dark, sharp, and necessary.',
    assetMechanic: '',
    traitRules: `## TRAIT RULES\n\n- **Corruption Tap:** Each use darkens reputation. Cumulative, never resets. The Hexblade's power has a permanent social cost.\n- **Leverage:** Requires prior interaction or intel. Secret cuts both ways. The target remembers, and the relationship is permanently changed.\n- **Bitter Medicine:** Every heal has a side effect: nausea, hallucinations, or dependency. The GM chooses. Nothing is free.\n- **The Question:** Requires 1+ rounds of dialogue. WIS save failure reveals one truth. Success: they know you tried. Failed interrogations have social consequences.\n- **Marked:** Designate one target per day. First hit deals +1d6 bonus damage. The choice of who to mark is the moral weight.\n- **Last Standing:** Drop to 1 HP instead of 0, once per day. No strings. The Ironclad's reliability is the point.`,
    consumableLabel: 'Poultices, blasting powder, antitoxin, bandages',
    tutorialContext: 'The opening chapter introduces a morally compromised situation, one conditional NPC, and a job where success and failure both cost. First check: social or investigation. First combat: human enemies. Open in a burned village, a tavern with a wanted poster, or the aftermath of a skirmish. Introduce a morally complex NPC early — someone who needs the company but cannot be fully trusted.',
    npcVoiceGuide: 'Mercenaries: gallows humor, fatalistic. Nobles: self-justifying, every order framed as necessity. Priests: fervent or exhausted. Informants: paranoid, transactional. Common folk: resigned, distrust anyone with power.',
    buildAssetState: null,
    investigationGuide: 'Journal of confessions — extracted testimony, names implicated, evidence of heresy or corruption. When the player interrogates or investigates, track discoveries as narrative threads. Clues come from confessions, seized documents, NPC testimony, and physical evidence.',
  },
  notebookLabel: 'Journal',
  intelTabLabel: 'Dossier',
  intelNotebookLabel: 'Evidence',
  intelOperationLabel: 'Scheme',
  explorationLabel: 'Ground',
  openingHooks: [
    // Universal — work for any class
    { hook: 'The battle is over. The wrong side won. The company\'s employer is dead, and the victors are offering amnesty to surrendering mercenaries. The kind that ends with a noose.', title: 'Wrong Side' },
    { hook: 'A courier brings payment for a job the company didn\'t do. Someone is using the company\'s name — and whoever hired them wants a reckoning.', title: 'Stolen Name' },
    { hook: 'A child walks into camp alone, carrying a signet ring from a dead lord. She won\'t say where she got it — only: "They said to find the Company."', title: 'The Signet Ring' },
    { hook: 'Mid-winter. The road north is blocked by snow. The only shelter: an abandoned monastery with fresh tracks going in and none coming out.', title: 'Fresh Tracks' },
    // Cutthroat — kills, poison, dirty work
    { hook: 'The mark is dead. Clean work. Then the client sends a second name — the dead man\'s daughter, twelve years old. She saw something. The client says it\'s the job. Your gut says it\'s a test.', title: 'Second Name', classes: ['Cutthroat'] },
    { hook: 'A sealed contract arrives from a house that doesn\'t officially exist. Payment is generous. The task: enter a lord\'s bedchamber and replace his medicine with something from a black vial. They don\'t want it to look like poison. They want it to look like God.', title: 'The Black Vial', classes: ['Cutthroat'] },
    { hook: 'Someone is killing with your methods — same blade angle, same entry point, same calling card you stopped using years ago. Two dead this week. The city watch doesn\'t know your face yet, but whoever is copying your work wants them to.', title: 'Your Methods', classes: ['Cutthroat'] },
    // Ironclad — sieges, last stands, battles
    { hook: 'The village paid for protection. Three days in, the captain is dead and the company is being blamed for the raid they were hired to stop. The villagers want blood. The real raiders are still in the hills. And the company is down to seven.', title: 'Blamed', classes: ['Ironclad'] },
    { hook: 'A lord\'s keep is under siege. The garrison commander sent for reinforcements a week ago — none came. You\'re not reinforcements. You\'re a mercenary company passing through. But the commander is offering everything he has left to anyone willing to hold the wall for three more days.', title: 'Three More Days', classes: ['Ironclad'] },
    { hook: 'The bridge at Ashford is the only crossing for fifty miles, and two armies want it. Your company holds it — not by contract, but because you were standing on it when the war started. Both sides have sent envoys. Both want you to hold it for them. Neither is offering enough.', title: 'The Bridge', classes: ['Ironclad'] },
    // Hexblade
    { hook: 'A sealed contract arrives from a house that doesn\'t officially exist. The task: retrieve a grimoire from a crypt three previous parties never returned from. The house insists the book is harmless. The wards on the crypt entrance say otherwise.', title: 'The Warded Crypt', classes: ['Hexblade'] },
    { hook: 'Your focus cracked last night. Not from use — from something pushing out. The bone fetish is warm, and the markings have changed. Whatever was bound inside is awake, and it\'s been whispering a name. Yours.', title: 'Something Inside', classes: ['Hexblade'] },
    { hook: 'A village burned its own healer at the stake for witchcraft. The healer\'s apprentice found you and says the real curseworker is still in the village, hiding behind the accusation. The plague that started before the burning is getting worse. They need someone who understands forbidden things.', title: 'The Real Curse', classes: ['Hexblade'] },
    // Schemer
    { hook: 'A lord hires the company to investigate missing grain shipments. The trail leads to the lord\'s own steward. The steward offers you triple to say you found nothing. The lord\'s wife offers you something else entirely to make the steward disappear.', title: 'Three Offers', classes: ['Schemer'] },
    { hook: 'You\'ve been appointed magistrate of a town that executed the last three magistrates. Your first case arrives tomorrow: a merchant accusing a priest of theft. The priest accusing the merchant of heresy. Both are lying, and the town council is watching to see which lie you choose.', title: 'The Magistrate', classes: ['Schemer'] },
    { hook: 'Two houses are negotiating a marriage alliance. Both have hired you separately — one to ensure the marriage happens, the other to ensure it doesn\'t. You took both contracts because you knew you\'d learn more from the middle than either side.', title: 'Both Contracts', classes: ['Schemer'] },
    // Plague Doctor
    { hook: 'The company is camped outside a city under quarantine. The plague inside is killing faster than the doctors can count. A contact with critical intelligence is trapped behind the walls. The gates are locked, the walls are watched, and the few who\'ve climbed over came back with black fingers.', title: 'Behind the Walls', classes: ['Plague Doctor'] },
    { hook: 'A field hospital after a battle. The wounded are packed three to a cot. You\'re the only one with real training. Then a soldier is carried in with wounds that aren\'t from any weapon you recognize — the flesh is dissolving, not cut. And three more arrive with the same thing.', title: 'Unknown Wounds', classes: ['Plague Doctor'] },
    { hook: 'A noble family is dying. One by one, over months, symptoms that mimic natural illness. The house physician says plague. The servants whisper poison. The family heir, the last one standing, asks you to examine the bodies before the church takes them for cremation at dawn.', title: 'Natural Causes', classes: ['Plague Doctor'] },
    // Inquisitor
    { hook: 'The church sends you to a remote monastery to investigate reports of heresy. When you arrive, the abbot is cooperative, the brothers are devout, and the chapel is immaculate. Everything is perfect. That\'s the problem — the last investigator sent the same report before he vanished.', title: 'Too Perfect', classes: ['Inquisitor'] },
    { hook: 'A condemned man, hours from execution, demands to speak to an inquisitor. Not a priest — an inquisitor. He says his confession will implicate three sitting members of the council. The council says he\'s lying to delay the rope. He says he can prove it, but only to someone with the authority to act.', title: 'The Last Confession', classes: ['Inquisitor'] },
    { hook: 'Your predecessor\'s final case file arrived sealed, with a note: "I was wrong about everything. Start over." Inside: testimony implicating a bishop, a trade guild, and a dead woman who may not be dead. The seal on the file has been opened and resealed at least once.', title: 'Start Over', classes: ['Inquisitor'] },
  ],
  initialChapterTitle: 'First Blood',
  locationNames: [
    'The Ashfang Company', 'The Iron Pact', 'The Pale March',
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
    lore: 'You know the clubs, the boards, the quiet arrangements. You also know what those families do to protect themselves. Start with one high-society contact at Favorable. Advantage on social checks in elite settings and checks to leverage institutional access. Disadvantage on initial social checks with working-class and street NPCs — your name precedes you, and it doesn\'t mean the same thing down here.',
  },
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Went to war and came back different. Violence doesn\'t shock you.',
    lore: 'The city feels small after what you saw. Violence doesn\'t shock you, which is useful. It also doesn\'t bother you, which is a problem. Start with one military contact at Favorable. Advantage on CON saves against fear and intimidation. Disadvantage on Insight checks reading civilian emotional cues — you\'re calibrated for threat assessment, not empathy. First extreme violence in a chapter: no WIS save required, but NPCs notice your lack of reaction.',
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
    hitDieAvg: 4,
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
    hitDieAvg: 4,
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
    hitDieAvg: 6,
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
    hitDieAvg: 4,
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
    hitDieAvg: 4,
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
  foreground: 'oklch(0.90 0.02 55)',
  card: 'oklch(0.11 0.005 15)',
  cardForeground: 'oklch(0.90 0.02 55)',
  primary: 'oklch(0.55 0.19 22)',
  primaryForeground: 'oklch(0.95 0.01 90)',
  secondary: 'oklch(0.15 0.005 15)',
  secondaryForeground: 'oklch(0.80 0.02 55)',
  muted: 'oklch(0.13 0.005 15)',
  mutedForeground: 'oklch(0.60 0.02 55)',
  accent: 'oklch(0.55 0.19 22)',
  accentForeground: 'oklch(0.95 0.01 90)',
  destructive: 'oklch(0.58 0.20 25)',
  border: 'oklch(0.22 0.01 15)',
  input: 'oklch(0.14 0.005 15)',
  ring: 'oklch(0.55 0.19 22)',
  narrative: 'oklch(0.88 0.02 55)',
  meta: 'oklch(0.48 0.05 240)',
  success: 'oklch(0.65 0.15 145)',
  warning: 'oklch(0.72 0.10 70)',
  tertiary: 'oklch(0.75 0.14 70)',
  tertiaryForeground: 'oklch(0.08 0.005 15)',
  titleGlow: '0 0 40px oklch(0.62 0.18 22 / 0.7), 0 0 80px oklch(0.62 0.18 22 / 0.3)',
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
  intelTabLabel: 'Case Board',
  intelNotebookLabel: 'Evidence',
  intelOperationLabel: 'The Play',
  explorationLabel: 'Scene',
  openingHooks: [
    // Universal
    { hook: 'A woman you\'ve never met left your name in her will. She died yesterday. The inheritance is a locked box and a list of five names — four of them are still alive.', title: 'Five Names' },
    { hook: 'Someone is killing people connected to a trial that happened twenty years ago. You were a witness. You\'re the only one who hasn\'t been contacted — by the killer or the police.', title: 'The Witness List' },
    { hook: 'A body washes up on the riverbank with your business card in its pocket. You\'ve never seen this person before. The police want to talk.', title: 'Your Card' },
    { hook: 'A friend calls at 2am, panicking. By the time you get to their apartment, they\'re gone. The door is unlocked, the lights are on, and there\'s blood on the kitchen floor — but not enough to be fatal.', title: '2 AM' },
    // Private Investigator
    { hook: 'Your client wants you to find their missing spouse. Simple enough. Then you find the spouse, and they beg you to say you didn\'t.', title: 'Missing Spouse', classes: ['Private Investigator'] },
    { hook: 'A lawyer hires you to locate a witness before a trial next week. The witness doesn\'t want to be found, and neither does whoever is paying her to stay hidden.', title: 'Hidden Witness', classes: ['Private Investigator'] },
    { hook: 'An insurance company sends you a straightforward fraud case. The claimant died in a fire, but dental records don\'t match. Someone is in that grave, just not the right someone.', title: 'Wrong Body', classes: ['Private Investigator'] },
    // Fixer
    { hook: 'Two of your clients hired you for the same job without knowing it. One wants the package delivered. The other wants it destroyed. Both paid upfront.', title: 'Both Sides', classes: ['Fixer'] },
    { hook: 'A politician\'s aide needs a problem to disappear before the morning papers. The problem is a person, and the person is sitting in your waiting room asking for help.', title: 'The Problem', classes: ['Fixer'] },
    { hook: 'Your best contact just burned you — gave your name to the wrong people as a fall guy for a warehouse robbery. You have until morning to prove you weren\'t involved, or make sure it doesn\'t matter.', title: 'Fall Guy', classes: ['Fixer'] },
    // Bruiser
    { hook: 'The man you were hired to protect is dead. Killed in the one room you weren\'t watching. Your employer says you\'re still on the payroll — now find out who did it, before they decide you helped.', title: 'On Your Watch', classes: ['Bruiser'] },
    { hook: 'A bar fight that wasn\'t your fault leaves a man on the floor who turns out to be a city councilman\'s son. Now the councilman wants a meeting. Not with the police — with you.', title: 'The Councilman\'s Son', classes: ['Bruiser'] },
    { hook: 'Your boss sends you to collect from a debtor. The address leads to an empty apartment, a suitcase full of photographs, and a note that says "They\'ll kill me if I pay and kill me if I don\'t."', title: 'Empty Apartment', classes: ['Bruiser'] },
    // Grifter
    { hook: 'The mark you conned last month just showed up at your door — not angry, but terrified. Someone used the fake identity you sold them to commit a murder, and now both of you are connected to the body.', title: 'Old Debts', classes: ['Grifter'] },
    { hook: 'You\'re halfway through the best con of your career when you realize the target knows exactly what you\'re doing. They\'re playing along. That\'s worse.', title: 'Playing Along', classes: ['Grifter'] },
    { hook: 'A dying man gives you a key and a name. The name is fake — you know because you invented it three years ago for a job you thought was finished.', title: 'A Name You Made', classes: ['Grifter'] },
    // Reporter
    { hook: 'A source slides you documents proving a construction magnate bribed the building inspector before a collapse that killed nine people. Then your editor kills the story. No explanation.', title: 'Killed Story', classes: ['Reporter'] },
    { hook: 'You\'re writing a puff piece about a charity gala when a waiter slips you a napkin: "The woman giving the speech ordered a murder. Proof in the coat check. Locker 14."', title: 'Locker 14', classes: ['Reporter'] },
    { hook: 'Your predecessor at the paper left a filing cabinet full of notes on a story they never published. The last entry, dated three days before they quit, reads: "They know I know. Options narrowing."', title: 'Options Narrowing', classes: ['Reporter'] },
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
    intelTabLabel: 'Intel',
    intelNotebookLabel: 'Evidence',
    intelOperationLabel: 'Operation',
    explorationLabel: 'Location',
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
  bodyEl.style.setProperty('--font-scale', String(theme.fontScale ?? 1))
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
