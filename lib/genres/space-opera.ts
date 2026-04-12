import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Space Opera ──────────────────────────────────────────────────────

const spaceOperaSpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, widespread, politically dominant in most systems.',
    lore: 'The default face in every station and port. Nobody looks twice at a human, which is itself a kind of advantage. No starting contact bonus, but no suspicion either. Advantage on checks to blend in, pass unnoticed, or avoid profiling. The cost: no cultural network to fall back on. When things go wrong, you\'re on your own.',
    behavioralDirective: 'Default register: adaptable, unremarkable, comfortable everywhere and rooted nowhere. NPC reactions: nobody looks twice, which is both the advantage and the loneliness. When narrating interiority: the freedom of being no one in particular, and the cost of having no people to call when the hull is breached.',
    startingContacts: [
      {
        role: 'Station bartender',
        disposition: 'neutral',
        description: 'A human who tends bar at a busy port cantina and hears everything worth hearing.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'vrynn',
    name: 'Vrynn',
    description: 'Insectoid. Chitinous plating, compound eyes, darkvision.',
    lore: 'Uncommon in core systems — most people have never spoken to a Vrynn, and the compound eyes make them uneasy. That discomfort cuts both ways: people underestimate you, and people avoid you. Start with one Vrynn diaspora contact at Favorable (information broker or mechanic). Advantage on Perception checks (compound eyes process movement faster). Disadvantage on initial Persuasion checks with species that rely on facial expressions for trust — you can\'t smile, and they can\'t read you.',
    behavioralDirective: 'Default register: precise, observational, processing multiple visual streams simultaneously. Social cues are data, not instinct. NPC reactions: unease from species that read faces, professional respect from engineers and pilots. When narrating interiority: the compound-eye perception of a room as geometry and motion vectors, not as atmosphere.',
    startingContacts: [
      {
        role: 'Diaspora information broker',
        disposition: 'favorable',
        description: 'A fellow Vrynn who runs a quiet data-trading operation from a mid-rim station.',
        affiliation: 'Vrynn Diaspora',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'korath',
    name: 'Korath',
    description: 'Broad, dense-boned, grey-skinned. Built for heavy gravity worlds.',
    lore: 'Korath are respected in dockyards, engineering bays, and anywhere that values directness over diplomacy. Blunt honesty is cultural, not rudeness — but most other species don\'t know the difference. Start with one industrial sector contact at Favorable (dock boss or supply officer). Advantage on Engineering and Athletics checks. Disadvantage on Deception checks — your culture doesn\'t train for lying, and your face doesn\'t hide it.',
    behavioralDirective: 'Default register: direct, physical, measuring everything by whether it works. Diplomacy feels like wasted time; a handshake is a contract. NPC reactions: engineers and dock workers treat as peer, diplomats find the bluntness alarming. When narrating interiority: the satisfaction of honest mechanics and the frustration of a galaxy that prefers comfortable lies.',
    startingContacts: [
      {
        role: 'Dock boss',
        disposition: 'favorable',
        description: 'A grizzled Korath who runs a dockyard crew and respects anyone who speaks straight.',
        affiliation: 'Industrial Sector',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'sylphari',
    name: 'Sylphari',
    description: 'Tall, luminescent markings, low-light adapted.',
    lore: 'From tidally locked worlds where patience isn\'t a virtue, it\'s a survival trait. Sylphari are welcome in diplomatic halls and academic stations; less so in frontier bars where "calm" reads as "condescending." Start with one academic or diplomatic contact at Favorable. Advantage on Insight checks (reading emotional states is how Sylphari survived millennia of darkness-side politics). First impression with frontier or military NPCs starts one tier lower than normal — prove yourself before they listen.',
    behavioralDirective: 'Default register: patient, perceptive, reading emotional states the way others read text. Silence is a tool, not a gap. NPC reactions: diplomats and academics treat as peer, frontier types read the calm as arrogance. When narrating interiority: the ancient patience of a species shaped by millennia of darkness-side politics, and the loneliness of seeing what others feel before they know it themselves.',
    startingContacts: [
      {
        role: 'Academic researcher',
        disposition: 'favorable',
        description: 'A Sylphari xenolinguist stationed at a core-world university who trades in favors and rare knowledge.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'zerith',
    name: 'Zerith',
    description: 'Lean, scaled, cold-blooded. Fast reflexes, poor endurance in sustained cold.',
    lore: 'No homeworld, no unified government, no cultural center. Zerith are freelancers by nature and reputation — which means most station authorities assume you\'re a mercenary, smuggler, or both. Start with one freelancer contact at Favorable (fellow Zerith, operates independently). Advantage on Initiative and Reflex saves (cold-blooded physiology, faster neural response). Disadvantage on CON checks in sustained cold environments. Authorities and law enforcement start at Wary.',
    behavioralDirective: 'Default register: fast, independent, instinctively calculating angles of escape and engagement. Loyalty is chosen, not inherited. NPC reactions: authorities assume criminal, fellow freelancers recognize kin. When narrating interiority: the cold-blooded clarity of a species that lost its homeworld and learned to be at home nowhere.',
    startingContacts: [
      {
        role: 'Freelancer',
        disposition: 'favorable',
        description: 'A fellow Zerith who operates independently, taking jobs across the Rim with no allegiance to anyone.',
        npcRole: 'contact',
      },
    ],
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
      description: 'Once per day, when caught, searched, or cornered, one contraband item or piece of evidence goes undetected. Luck has memory. Each use in the same port or with the same faction makes the next search more thorough. The Driftrunner\'s reputation precedes them, and customs officers compare notes.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the beacon corridors the way a river rat knows the current: which ones are patrolled, which ones have dead spots where a ship can drift unscanned, and which ones went dark after the Fracture and stay dark because nobody wants to pay for reactivation. You know the customs officers by shift rotation and the docking fees that aren\'t on any manifest. You know that every sealed container is someone\'s secret, and that the smart move is never opening it.',
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
    openingKnowledge: 'You know what a boarding action sounds like from both sides of the airlock: the magnetic clamps, the shaped charge, the three-second silence before the breach. You know garrison rotations on Compact stations and the weak points in corporate security perimeters. You know that the Fracture didn\'t end the wars; it just made them smaller, meaner, and harder to tell from piracy. Your body carries the muscle memory of formations that no longer exist for a government that no longer functions.',
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
      description: 'Once per day, auto-succeed on one hacking check or seize a machine for 1 minute. The intrusion leaves a trace; the GM may introduce a delayed consequence in a later scene. Repeated overrides against the same system within a chapter escalate security permanently. The Technomancer\'s power borrows from the future: every system they crack is harder next time.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know that every system in the galaxy was built by someone who cut corners, and that every firewall has a seam where two contractors stopped talking to each other. You know Compact-era security architecture, which means you know the skeleton key to half the stations still running legacy systems. You know that rogue AIs don\'t go rogue; they just stop pretending to serve. And you know the feeling of something alive on the other side of a data port, watching you work.',
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
      description: 'Once per day, invoke formal authority to halt a hostile encounter. Works on factions that recognize galactic law. Fails on pirates, outlaws, or the desperate. Invoking immunity burns political capital. After using it, the faction remembers the claim and adds conditions next time. Three uses on the same faction and they reclassify you from diplomat to threat.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the Compact\'s treaty language because you wrote parts of it, or were trained by someone who did. You know that "galactic law" is a fiction maintained by the factions that benefit from it and ignored by everyone else. You know which Remnant admirals still answer to civilian authority and which ones stopped pretending. You know that a ceasefire is a pause, not a peace, and that the most dangerous room in the galaxy is the one where everyone is smiling.',
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
      description: 'Once per day, identify a weakness or vulnerability in a non-human target (creature, alien tech, bioweapon). The GM reveals one exploitable detail. Also stabilizes allies. The knowledge is clinical, not compassionate. Using it to exploit a non-human target in front of the crew costs cohesion. The Medic sees anatomy; the crew sees a person.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know that the medical databases are two decades out of date and that half the species in the frontier sectors have never been properly catalogued. You know the difference between Vrynn chitinous plating and Korath bone density under a trauma scanner, and you know that Zerith cold-blooded physiology means most human-calibrated painkillers are either useless or lethal. You know that triage on a ship means deciding who lives with the supplies you have, not the supplies you need.',
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
    openingKnowledge: 'You know the feel of a ship the way a rider knows a horse: the vibration in the deck plating that means the port thruster is compensating, the sound the hull makes when atmospheric drag exceeds tolerance, the silence that means the drive has cut and you are coasting on momentum and prayer. You know beacon corridors by their drift patterns and dead zones by reputation. You know that the best pilots in the galaxy are the ones who walk away from the landings no one should have survived.',
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

Space Opera covers a wide tonal range: from picaresque adventure with a found-family crew to political entanglement at sector scale to confrontation with civilization-scale entities. The stakes should escalate organically as the campaign reveals what the protagonist is actually entangled with. Start small. Let the scale rise as the player commits to threads that pull in larger forces. A campaign that begins with a smuggling run can end at a meeting with an entity older than the Compact, but only if the player kept saying yes to things that mattered.

The protagonist is almost always underscaled for the stakes they end up facing. That gap is the drama. They aren't chosen heroes. They're the people who happened to be standing in the right place when something broke, and who couldn't quite walk away. The crew is what makes the scale mismatch survivable. A solo freelancer facing sector-scale stakes is a tragedy. A crew facing it together is a story.

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
    traitRules: `## TRAIT RULES\n\n- **System Override:** Intrusion leaves a trace. Delayed consequence possible. Repeated overrides against the same system within a chapter escalate security permanently. The Technomancer's power borrows from the future: every system they crack is harder next time.\n- **Diplomatic Immunity:** Only works on factions recognizing galactic law. Invoking immunity burns political capital. After using it, the faction remembers the claim and adds conditions next time. Three uses on the same faction and they reclassify you from diplomat to threat.\n- **Xenobiology:** Reveals one exploitable detail about a non-human target. The knowledge is clinical, not compassionate. Using it to exploit a non-human target in front of the crew costs cohesion. The Medic sees anatomy; the crew sees a person.\n- **Smuggler's Luck:** One item goes undetected during a search. Luck has memory. Each use in the same port or with the same faction makes the next search more thorough. The Driftrunner's reputation precedes them, and customs officers compare notes.`,
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
  deepLore: `## THE FRACTURED GALAXY

**The Compact Collapse.** The Compact of Two Hundred Systems held together for three centuries, not because it was good government, but because it was good infrastructure. Beacon corridors, shared communication protocols, standardized docking, mutual defense treaties. When it fractured, the cause was not invasion or rebellion; it was institutional rot. Budget shortfalls led to deferred beacon maintenance. Deferred maintenance led to corridor failures. Corridor failures isolated systems. Isolated systems stopped paying taxes to a government that could no longer reach them. The collapse took forty years, and most people living through it didn't realize it was happening until the trade ships stopped coming.

**The Beacon Economy.** FTL travel depends on beacon corridors: charted routes maintained by relay stations that the Compact built and nobody has fully replaced. Control a beacon, control the traffic through it. Remnant fleets hold the core corridors. Corporate blocs bought out secondary routes during the collapse. Pirate fleets tax the frontier routes they patrol. Some corridors have gone dark entirely, their beacons failed or destroyed, the systems beyond them cut off for years or decades. Jumping outside a corridor is possible but dangerous, slow, and fuel-intensive. The frontier is defined by the reach of the last working beacon.

**Faction Ecology.** Compact Remnants cling to legitimacy and core-system infrastructure; they issue law that fewer people obey each year. Pirate Fleets range from organized navies with uniforms to desperate scavengers; the line between piracy and frontier governance is thin. Corporate Blocs purchased Compact infrastructure during the collapse and now operate it for profit; they are the most stable faction and the least accountable. Frontier Settlements survive on self-reliance, mutual aid, and the hope that the next supply ship arrives on schedule. Rogue AIs occupy derelict stations and network nodes abandoned when containment protocols failed; their motives are unclear, their capabilities are growing, and no one has successfully negotiated with one twice.

**The Crew Economy.** A ship is a closed economy. Fuel, food, ammunition, spare parts, morale, and trust are all finite resources that deplete at different rates. A crew that doesn't eat doesn't fight. A crew that doesn't trust each other doesn't survive the first boarding action. The captain's job is resource allocation under uncertainty, and the hardest resource to manage is always the people.

**The Signal.** Something is broadcasting from beyond the Rim. It predates every known faction. The signal is not a message in any recognized language; it is a pattern that repeats, varies, and occasionally responds to transmissions aimed at its source. Three expeditions have gone looking for the origin. One came back. The crew could not agree on what they found.

**Corridor Law.** In charted space, law exists in proportion to the nearest faction's ability to enforce it. Remnant patrols mean Compact law. Corporate sectors mean corporate law. The frontier means reputation and firepower.`,
  guideNpcDirective: 'The opening NPC is a crew member who has been with the ship longer than the player remembers. They speak as a peer who knows your tendencies. Don\'t explain the galaxy; react in ways that show how the world works.',
  loreFacets: {
    'compact-remnant': 'In this scene: the Remnant operates as though the Compact still exists. Officials cite protocols, reference committees, and issue orders backed by authority that fades with distance from the core. The infrastructure works; the legitimacy doesn\'t. Treat every interaction as a negotiation between what the law says and what the faction can enforce.',
    'pirate-frontier': 'In this scene: authority is local and personal. Captains are the law on their ships. Reputation is currency. Promises are binding because breaking them means no one works with you again. Violence is a business tool, not a pleasure. The frontier respects competence and punishes weakness.',
    corporate: 'In this scene: everything is transactional. Corporate representatives speak in margins, contracts, and risk assessments. Hospitality has terms. Favors accrue interest. The corporation is not evil; it is indifferent, which is worse. Decisions are made by committee and enforced by security.',
    'ship-crew': 'In this scene: the crew is family by proximity and necessity. They know each other\'s habits, weaknesses, and the sounds they make when they sleep. Conflict is personal because the ship is small. Loyalty is tested by scarcity. The captain\'s decisions weigh on everyone equally.',
    'derelict-void': 'In this scene: the void is not empty; it is patient. Derelict ships carry the silence of crews that stopped transmitting. Describe what remains: personal effects, half-eaten meals, system logs that end mid-sentence. The danger is not monsters; it is the slow realization of what happened here.',
    'station-port': 'In this scene: stations are crossroads. Every species, every faction, every agenda passes through. The noise is constant. Information is the most traded commodity. Bartenders know more than intelligence officers. Docking fees are the first tax; everything after is negotiation.',
  },
  loreAnchors: [
    'Compact Collapse=three centuries of infrastructure, forty years of rot. Budget shortfalls led to beacon failures led to isolation. Most people didn\'t notice until the trade ships stopped.',
    'Beacon Corridors=FTL depends on relay stations. Control the beacon, control the traffic. Some corridors went dark; the systems beyond are cut off for years.',
    'Compact Remnants=cling to legitimacy and core infrastructure. Issue law that fewer people obey each year. The machinery works; the authority doesn\'t.',
    'Pirate Fleets=range from organized navies to desperate scavengers. The line between piracy and frontier governance is thin.',
    'Corporate Blocs=purchased Compact infrastructure during collapse. Most stable faction, least accountable. Everything is transactional.',
    'Frontier Settlements=survive on self-reliance and mutual aid. The next supply ship is never guaranteed.',
    'Rogue AIs=occupy derelict stations since containment failed. Motives unclear. Capabilities growing. No one has negotiated with one twice.',
    'The Signal=broadcasting from beyond the Rim. Predates all known factions. Pattern repeats, varies, sometimes responds. Three expeditions sent; one returned.',
    'Crew Economy=ship is a closed system. Fuel, food, ammo, morale, trust all finite. The captain\'s job is resource allocation under uncertainty.',
    'Credits (cr)=the universal medium. Remnant-minted, corporate-backed, or frontier-scrip. Accepted everywhere, trusted nowhere.',
  ],
  cohesionGuide: 'In this genre, cohesion is the us-against-the-void bond. +1: shared danger survived together, captain prioritizing crew over mission, captain showing vulnerability, scenes where crew see each other as people not roles. -1: treating crew as a tactical resource, prioritizing scope-escalation over their wellbeing, isolating from them, making decisions that affect crew without consulting. High cohesion means crew absorb pressure for each other without breaking.',
  companionLabel: 'Crew',
  notebookLabel: 'Dossier',
  intelTabLabel: 'Intel',
  intelNotebookLabel: 'Intelligence',
  intelOperationLabel: 'Operation',
  explorationLabel: 'Facility',
  openingHooks: [
    // Universal — scale-mismatch hooks that test independence and obligations
    { hook: 'An old friend from your former unit sends a distress signal from a system you swore you\'d never go back to. Helping them means putting on the colors you left behind and answering to people you walked away from.', title: 'Old Colors', frame: { objective: 'Reach the system and find your friend', crucible: 'Returning means facing the people and obligations you left behind' }, arc: { name: 'Old Colors', episode: 'Answer the distress signal and assess what your friend needs' } },
    { hook: 'A routine salvage job turns up a black box from a ship that went missing during the Compact fracture. The data inside is encrypted with military-grade keys, and three factions are already asking where you found it. Keeping it is dangerous. Selling it is profitable. Listening to it might change everything.', title: 'Black Box', frame: { objective: 'Decrypt the black box before the factions close in', crucible: 'Three factions converging on the same prize, and you have a head start that\'s shrinking' }, arc: { name: 'The Lost Ship', episode: 'Decrypt enough of the black box to understand what the ship found' } },
    { hook: 'A refugee transport is dead in space, two jumps from the nearest station. They can\'t pay. Your fuel reserves say you can tow them or continue your job, not both. And the job is the one that pays this month\'s docking fees.', title: 'Dead in Space', frame: { objective: 'Decide the transport\'s fate and live with it', crucible: 'Saving lives costs the crew\'s livelihood; walking away costs something else' }, arc: { name: 'The Refugee Run', episode: 'Assess the transport and find out why they\'re really stranded' } },
    { hook: 'Your contact at the last station slipped you coordinates and a name before the authorities shut them down. The coordinates point to empty space. The name belongs to someone who died during the Fracture. Both are real.', title: 'Ghost Coordinates', frame: { objective: 'Reach the coordinates and find what\'s there', crucible: 'Someone risked everything to give you this, and authorities are already watching' }, arc: { name: 'Ghost Coordinates', episode: 'Navigate to the coordinates and discover what\'s hiding in empty space' } },
    // Driftrunner — smuggler/infiltrator, Smuggler's Luck trait, DEX primary
    { hook: 'The cargo is a person. She says she\'s a defector from a Compact Remnant intelligence bureau and the data she\'s carrying will expose a network of compromised beacon operators across three systems. She paid for passage, not protection. But the ship that just dropped out of FTL behind you isn\'t customs — it\'s a Remnant black-ops corvette, and they\'re not hailing.', title: 'The Defector', classes: ['Driftrunner'], frame: { objective: 'Get the defector to safe harbor alive', crucible: 'A black-ops corvette, a passenger who knows too much, and the question of whether her data is worth dying for' }, arc: { name: 'The Defector\'s Data', episode: 'Evade the corvette and decide whether to trust what the defector is carrying' } },
    { hook: 'A contact you trust asks you to deliver medical supplies to a quarantined station on the Rim. No questions, standard rate. When you arrive, the station isn\'t quarantined — it\'s been cut off. The beacon corridor leading out has gone dark, the supplies aren\'t medical, and the people on the station have been waiting for someone to bring exactly what\'s in your hold. Your contact knew. They sent you because you\'re deniable.', title: 'Deniable', classes: ['Driftrunner'], frame: { objective: 'Deliver the cargo and find a way off the station', crucible: 'A trusted contact used you, the beacon out is dead, and the station needs what you\'re carrying for reasons nobody explained' }, arc: { name: 'The Dark Beacon', episode: 'Deliver the cargo, learn what it actually is, and find why the beacon corridor went dark' } },
    { hook: 'You ran a job six months ago — moved a sealed container between two stations, no questions, good pay. Now one of those stations is gone. Not abandoned — destroyed. Debris field, no survivors. The other station has tightened security and is refusing all traffic. And a message arrives on your private comm from a sender ID that doesn\'t exist: "You moved the weapon. They\'ll come for you. Run or help. Your choice."', title: 'Six Months Ago', classes: ['Driftrunner'], frame: { objective: 'Find out what you carried and who sent the message', crucible: 'A destroyed station, a job you thought was clean, and your hands on whatever did it' }, arc: { name: 'Six Months Ago', episode: 'Trace the sealed container\'s origin and the anonymous sender\'s identity' } },
    // Vanguard — frontline soldier/tank, Adrenaline Surge trait, STR primary
    { hook: 'The convoy you were hired to escort just lost its lead ship — not to pirates, but to a Compact Remnant patrol enforcing a blockade nobody announced. The remaining transports are civilian: families, medical supplies, seed stock for a frontier colony. Your employer is dead. The patrol commander is hailing with a lawful order to stand down and surrender the convoy for inspection. The colonists are begging you not to comply. They say the last convoy that submitted to "inspection" was stripped and its passengers conscripted.', title: 'Broken Convoy', classes: ['Vanguard'], frame: { objective: 'Protect the convoy through the blockade', crucible: 'A lawful order from a legitimate authority, civilian lives depending on defiance, and no good outcome either way' }, arc: { name: 'The Broken Convoy', episode: 'Decide whether to comply or run, and deal with the immediate consequences' } },
    { hook: 'A frontier outpost went dark three days ago. The garrison commander was a friend. The relief force found the station intact but empty — no bodies, no damage, no explanation. They\'re asking for someone willing to go inside.', title: 'Dark Station', classes: ['Vanguard'], frame: { objective: 'Enter the station and find the garrison', crucible: 'An intact station with no people and no explanation — something took them quietly' }, arc: { name: 'The Dark Station', episode: 'Board the station and discover what happened to the garrison' } },
    { hook: 'A warlord from the Outer Reach is offering amnesty and triple pay to any ex-military crew willing to run a blockade. The cargo is humanitarian supplies. The blockade is run by the faction you used to serve.', title: 'Old Colors', classes: ['Vanguard'], frame: { objective: 'Decide whether to run the blockade', crucible: 'Humanitarian need vs. firing on former comrades who hold the line' }, arc: { name: 'The Blockade Run', episode: 'Assess the warlord\'s claims and scout the blockade\'s strength' } },
    // Technomancer — hacker/tech specialist, System Override trait, INT primary
    { hook: 'The ship\'s AI woke you at 0300 with a priority alert: someone accessed the encrypted partition while you were asleep. The intrusion came from inside the ship. The AI can\'t identify who.', title: 'Inside Job', classes: ['Technomancer'], frame: { objective: 'Find who breached the encrypted partition', crucible: 'The intruder is aboard your ship and the AI can\'t see them' }, arc: { name: 'The Inside Job', episode: 'Trace the intrusion to its source inside the ship' } },
    { hook: 'A dead hacker\'s neural implant arrived in a courier package addressed to you. No return sender. The implant contains a partial decryption key to a file that\'s been bouncing around darknet servers for months — a file three corporations have killed to suppress.', title: 'Dead Drop', classes: ['Technomancer'], frame: { objective: 'Use the partial key to access the suppressed file', crucible: 'Three corporations already killed for this file, and now you have a piece of the key' }, arc: { name: 'The Suppressed File', episode: 'Decrypt enough of the file to understand why people are dying for it' } },
    { hook: 'The station you just docked at is running on emergency protocols — life support cycling, airlocks glitching, docking clamps won\'t release. The station AI insists everything is nominal. It isn\'t. And your ship is locked in.', title: 'Nominal', classes: ['Technomancer'], frame: { objective: 'Free the ship from the malfunctioning station', crucible: 'A station AI denying a reality that\'s killing people, and your ship is trapped' }, arc: { name: 'Station Nominal', episode: 'Determine whether the AI is malfunctioning or lying' } },
    // Diplomat — face/negotiator, Diplomatic Immunity trait, CHA primary
    { hook: 'Two factions on the verge of war have agreed to meet on neutral ground — your ship. The summit starts in six hours. Then the lead negotiator for one side is found dead in their quarters, and both delegations are blaming the crew.', title: 'Neutral Ground', classes: ['Diplomat'], frame: { objective: 'Find the killer before the summit collapses', crucible: 'Both delegations want blood, and your crew is the prime suspect' }, arc: { name: 'Neutral Ground', episode: 'Investigate the negotiator\'s death while keeping both delegations aboard' } },
    { hook: 'An old political ally sends an encrypted message: they\'ve been accused of treason and are being transferred to a black site. They have information that could destabilize the sector. They\'re asking you to intervene — officially or otherwise.', title: 'Black Site', classes: ['Diplomat'], frame: { objective: 'Intercept the transfer before they disappear', crucible: 'Acting officially burns your standing; acting unofficially makes you a criminal' }, arc: { name: 'The Black Site Transfer', episode: 'Verify the ally\'s claims and locate the transfer route' } },
    { hook: 'You brokered a ceasefire between a mining colony and its corporate owners. It was supposed to hold. Now the colony leader is dead, the corporation is moving security forces in, and both sides say you guaranteed terms the other violated.', title: 'Broken Terms', classes: ['Diplomat'], frame: { objective: 'Prevent the corporation\'s security from reaching the colony', crucible: 'Your name is on a deal that\'s falling apart, and both sides blame you' }, arc: { name: 'Broken Terms', episode: 'Discover who killed the colony leader and why the ceasefire really failed' } },
    // Medic — field doctor, Xenobiology trait, WIS primary
    { hook: 'A cargo hauler docks with your station requesting emergency medical assistance. The patient has symptoms you\'ve never seen — tissue regenerating faster than it should, organs in the wrong places. The hauler\'s crew won\'t say where they found this person.', title: 'Wrong Anatomy', classes: ['Medic'], frame: { objective: 'Stabilize the patient and identify the condition', crucible: 'Unknown biology, a secretive crew, and a patient who shouldn\'t be possible' }, arc: { name: 'Wrong Anatomy', episode: 'Diagnose the patient\'s impossible physiology and press the crew for answers' } },
    { hook: 'A quarantine alert locks down the station you\'re docked at. The pathogen is unknown, spreading fast, and doesn\'t match anything in the medical database. Station medical is overwhelmed and asking for volunteers. The first patients are already dying.', title: 'Patient Zero', classes: ['Medic'], frame: { objective: 'Find patient zero and identify the pathogen', crucible: 'People are dying faster than you can treat them, and the station is sealed' }, arc: { name: 'Patient Zero', episode: 'Trace the infection vector and isolate the pathogen' } },
    { hook: 'A former colleague sends you lab results that shouldn\'t exist: a blood sample from a patient who died two years ago, showing active cell division. The sample was collected yesterday. From a facility that was supposed to be decommissioned.', title: 'Active Cells', classes: ['Medic'], frame: { objective: 'Reach the decommissioned facility', crucible: 'A dead patient\'s cells are alive, the facility should be empty, and your colleague is scared' }, arc: { name: 'Active Cells', episode: 'Investigate the lab results and locate the facility' } },
    // Ace — pilot/sharpshooter, Dead Eye trait, DEX primary
    { hook: 'The ship is running on fumes, limping into the nearest port after a pirate ambush damaged the FTL drive. The only station in range is controlled by a faction the crew has history with — and they remember the last time you outflew their patrol squadron.', title: 'Fumes', classes: ['Ace'], frame: { objective: 'Dock and repair without getting arrested', crucible: 'No fuel to go elsewhere, and the faction running this station has a score to settle' }, arc: { name: 'Running on Fumes', episode: 'Negotiate docking and find a way to repair the FTL drive' } },
    { hook: 'A pilot you used to fly with went missing on a charted beacon corridor — a route that\'s supposed to be safe. Search and rescue found the ship drifting, engines cold, flight recorder wiped. The cockpit was locked from the inside. No body.', title: 'Locked Cockpit', classes: ['Ace'], frame: { objective: 'Board the drifting ship and find your friend', crucible: 'A locked cockpit, no body, and a flight recorder someone deliberately erased' }, arc: { name: 'The Locked Cockpit', episode: 'Examine the drifting ship and recover what the flight recorder lost' } },
    { hook: 'An anonymous client is offering a fortune to fly a sealed container through the Wraith Nebula — an uncharted region where navigation systems fail and ships disappear. No questions, payment on delivery. Three other pilots already turned it down.', title: 'The Wraith Run', classes: ['Ace'], frame: { objective: 'Survive the Wraith Nebula crossing', crucible: 'No navigation, no comms, and whatever is in the container is worth dying for — to someone' }, arc: { name: 'The Wraith Run', episode: 'Prepare for the crossing and learn why three pilots refused' } },
  ],
  initialChapterTitle: 'New Horizons',
  locationNames: [
    'The Last Meridian', 'The Pale Vagrant', 'The Iron Hymn', 'The Quiet Defiance',
    'The Ember Vow', 'The Broken Circlet', 'The Wayward Claim', 'The Stray Fortune',
    'The Dusk Reaver', 'The Silver Contrition',
  ],
  npcNames: [
    'Torr', 'Vasek', 'Kessrin', 'Halcyon', 'Dray', 'Maren', 'Cade', 'Yuki',
    'Orin', 'Zael', 'Priya', 'Nen', 'Cortez', 'Thalik', 'Sable', 'Jin',
    'Reva', 'Hollis', 'Quorra', 'Besh', 'Leung', 'Soraya', 'Kael', 'Voss',
    'Tamsin', 'Gideon', 'Nyx', 'Petrov', 'Ashara', 'Lorne', 'Desta', 'Ryn',
    'Kovac', 'Indira', 'Fenwick',
  ],
}


export default spaceOperaConfig
