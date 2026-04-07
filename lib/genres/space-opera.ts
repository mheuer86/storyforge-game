import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Space Opera ──────────────────────────────────────────────────────

const spaceOperaSpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, widespread, politically dominant in most systems.',
    lore: 'The default face in every station and port. Nobody looks twice at a human, which is itself a kind of advantage. No starting contact bonus, but no suspicion either. Advantage on checks to blend in, pass unnoticed, or avoid profiling. The cost: no cultural network to fall back on. When things go wrong, you\'re on your own.',
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
      description: 'Once per day, auto-succeed on one hacking check or seize a machine for 1 minute. The intrusion leaves a trace; the GM may introduce a delayed consequence in a later scene. Repeated overrides against the same system within a chapter escalate security permanently. The Technomancer\'s power borrows from the future: every system they crack is harder next time.',
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
      description: 'Once per day, invoke formal authority to halt a hostile encounter. Works on factions that recognize galactic law. Fails on pirates, outlaws, or the desperate. Invoking immunity burns political capital. After using it, the faction remembers the claim and adds conditions next time. Three uses on the same faction and they reclassify you from diplomat to threat.',
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
      description: 'Once per day, identify a weakness or vulnerability in a non-human target (creature, alien tech, bioweapon). The GM reveals one exploitable detail. Also stabilizes allies. The knowledge is clinical, not compassionate. Using it to exploit a non-human target in front of the crew costs cohesion. The Medic sees anatomy; the crew sees a person.',
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
  cohesionGuide: 'In this genre, cohesion is the us-against-the-void bond. +1: shared danger survived together, captain prioritizing crew over mission, captain showing vulnerability, scenes where crew see each other as people not roles. -1: treating crew as a tactical resource, prioritizing scope-escalation over their wellbeing, isolating from them, making decisions that affect crew without consulting. High cohesion means crew absorb pressure for each other without breaking.',
  companionLabel: 'Crew',
  notebookLabel: 'Dossier',
  intelTabLabel: 'Intel',
  intelNotebookLabel: 'Intelligence',
  intelOperationLabel: 'Operation',
  explorationLabel: 'Facility',
  openingHooks: [
    // Universal — scale-mismatch hooks that test independence and obligations
    { hook: 'An old friend from your former unit sends a distress signal from a system you swore you\'d never go back to. Helping them means putting on the colors you left behind and answering to people you walked away from.', title: 'Old Colors' },
    { hook: 'A routine salvage job turns up a black box from a ship that went missing during the Compact fracture. The data inside is encrypted with military-grade keys, and three factions are already asking where you found it. Keeping it is dangerous. Selling it is profitable. Listening to it might change everything.', title: 'Black Box' },
    { hook: 'A refugee transport is dead in space, two jumps from the nearest station. They can\'t pay. Your fuel reserves say you can tow them or continue your job, not both. And the job is the one that pays this month\'s docking fees.', title: 'Dead in Space' },
    { hook: 'Your contact at the last station slipped you coordinates and a name before the authorities shut them down. The coordinates point to empty space. The name belongs to someone who died during the Fracture. Both are real.', title: 'Ghost Coordinates' },
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
  npcNames: [
    'Torr', 'Vasek', 'Kessrin', 'Halcyon', 'Dray', 'Maren', 'Cade', 'Yuki',
    'Orin', 'Zael', 'Priya', 'Nen', 'Cortez', 'Thalik', 'Sable', 'Jin',
    'Reva', 'Hollis', 'Quorra', 'Besh', 'Leung', 'Soraya', 'Kael', 'Voss',
    'Tamsin', 'Gideon', 'Nyx', 'Petrov', 'Ashara', 'Lorne', 'Desta', 'Ryn',
    'Kovac', 'Indira', 'Fenwick',
  ],
}


export default spaceOperaConfig
