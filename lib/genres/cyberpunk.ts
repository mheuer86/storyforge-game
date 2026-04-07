import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Cyberpunk ────────────────────────────────────────────────────────

const cyberpunkSpecies: Species[] = [
  {
    id: 'street-kid',
    name: 'Street Kid',
    description: 'Born in the gutter wards. Knows every shortcut, every gang corner, every unwritten rule.',
    lore: 'You grew up where the city doesn\'t bother pretending. Cops don\'t come, corps don\'t care, and you learned to read a room before you learned to read. Start with one gang contact at Favorable. Advantage on Streetwise checks. Disadvantage on initial social checks with corpo or institutional NPCs — they see the ward before they see you. Active liability: you still owe the gang that raised you. Once per chapter, a gang obligation surfaces. Ignoring it burns your only safety net.',
    startingContacts: [
      {
        role: 'Gang lieutenant',
        disposition: 'favorable',
        description: 'A mid-rank gang leader who watched you grow up in the ward. You owe them, and they know it.',
        affiliation: 'Local ward gang',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'corpo',
    name: 'Corpo Dropout',
    description: 'Former corporate employee. Polished accent, expensive habits, one bad decision.',
    lore: 'You still walk like you own the building, and it still opens doors. But the corp remembers you left, and they remember why. Start with one former corpo colleague at Neutral (they\'re cautious, not loyal). Your former corporation as a faction starts at Wary — you know too much, and they know you know. Advantage on social checks in corporate environments — you know the language, the hierarchy, the tells. Gang and street NPCs start at Wary: you smell like the enemy. Active liability: your former corp has a file on you. Every time you operate publicly in corporate space, there\'s a chance someone recognizes you and the file gets updated. The corp doesn\'t want you back — they want you controllable.',
    startingContacts: [
      {
        role: 'Former corpo colleague',
        disposition: 'neutral',
        description: 'A mid-level corporate employee who still takes your calls, cautiously. Not loyal, but not hostile yet.',
        affiliation: 'Former corporation',
        npcRole: 'contact',
      },
      {
        role: 'Corporate security liaison',
        disposition: 'wary',
        description: 'Represents your former corporation\'s interest in keeping you controllable. They monitor, not befriend.',
        affiliation: 'Former corporation',
        npcRole: 'npc',
      },
    ],
  },
  {
    id: 'nomad',
    name: 'Nomad',
    description: 'Arrived from the badlands with a car, a gun, and clan instincts.',
    lore: 'The city is loud, vertical, and full of people who mistake comfort for safety. You know what it means to survive without a safety net. Start with one clan contact at Trusted (outside the city, reachable by comm). Advantage on Survival and vehicle-related checks. City fixers start at Wary — nomads are unpredictable, and unpredictable is bad for business. Active liability: your clan needs things from the city. Clan requests come with emotional weight — these are family, not clients. Refusing costs more than disposition; it costs identity.',
    startingContacts: [
      {
        role: 'Clan elder',
        disposition: 'trusted',
        description: 'A senior member of your nomad clan, outside the city but reachable by comm. Family, not a transaction.',
        affiliation: 'Nomad clan',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'undercity-born',
    name: 'Undercity Born',
    description: 'Grew up in the maintenance warrens and black-market tunnels beneath the city\'s visible layers.',
    lore: 'You know routes that don\'t appear on any official map and people who don\'t appear in any database. The surface world is loud and exposed; you prefer walls on all sides. Start with one black-market dealer at Favorable. Advantage on checks to navigate, hide, or find things in urban infrastructure. Disadvantage on social checks in high-society or corporate settings — you don\'t know the codes, and it shows. Active liability: the undercity has its own economy, and you have debts there that don\'t convert to eddies. Someone below is always waiting for you to come back.',
    startingContacts: [
      {
        role: 'Black-market dealer',
        disposition: 'favorable',
        description: 'Runs a stall in the undercity tunnels. Sells what the surface won\'t, no questions asked.',
        affiliation: 'Undercity market',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'syndicate-blood',
    name: 'Syndicate Blood',
    description: 'Raised inside an organized crime family or gang hierarchy. Knows how authority actually works.',
    lore: 'You understand the difference between power and the performance of power. Obligations don\'t expire, and neither do the connections. Start with one syndicate contact at Favorable. A rival gang or syndicate faction starts at Hostile — they know your family, and the history between you is blood. Advantage on Intimidation and checks to read power dynamics. But the family watches: acting against syndicate interests (even indirectly) gets reported. Betrayal drops every syndicate NPC by two disposition tiers.',
    startingContacts: [
      {
        role: 'Syndicate fixer',
        disposition: 'favorable',
        description: 'A family operative who handles jobs and keeps the books. Loyal to the syndicate first, you second.',
        affiliation: 'The syndicate',
        npcRole: 'contact',
      },
      {
        role: 'Rival gang enforcer',
        disposition: 'hostile',
        description: 'Represents a rival faction with old blood between your families. Knows your name and hates it.',
        affiliation: 'Rival syndicate',
        npcRole: 'npc',
      },
    ],
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
  backgroundEffect: 'static',
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
    traitRules: `## TRAIT RULES\n\n- **Zero Trace:** One scan, camera network, or access log erased per chapter. The absence itself can be noticed — a gap in a log is suspicious to a careful investigator. Humanity cost: each use requires deeper neural integration. After 3 uses per chapter, Insight checks against human emotion get disadvantage — you\'re optimizing for angles, not empathy.\n- **Deep Dive:** Track cumulative uses. After 3 without rest chapter, GM introduces cyberpsychosis episode.\n- **Adrenaline Overclocked:** Bonus attack, but chrome stress accumulates. GM tracks. Humanity cost: cumulative chrome stress counter. At threshold (3 uses per chapter without rest), the Razorback faces involuntary aggression — WIS save to resist a violent impulse in social scenes.\n- **Marker Called:** Contact unavailable until next chapter after being called in. Tab accumulates — after three unreturned markers, next contact demands something first.\n- **Field Triage:** Heal with a side effect (pain, dependency, temporary sense loss). Side effects worse on heavily chromed patients. Humanity cost: after 3 uses per chapter without a personal connection scene, bedside manner degrades — NPC patients start at Wary because your competence is clinical, not compassionate.\n- **Killswitch:** Designate target as Marked. First hit deals +1d6 bonus damage. Target knows something changed — fight-or-flight response.`,
    consumableLabel: 'Stim injectors, EMP charges, ICE breakers, ammo',
    tutorialContext: 'The opening chapter introduces the neighborhood, one contact (fixer or ripperdoc), and a street-level job. First check: social or stealth. First combat: gang or corporate security.',
    npcVoiceGuide: 'Fixers: smooth, transactional, every sentence has a price. Corpos: polished, euphemistic, threaten through implication. Street muscle: blunt, territorial. Ripperdocs: clinical when working, human when not. Netrunners: fast-talking, impatient with meatspace.',
    buildAssetState: (ship, _shipName) => {
      const modulesLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      const abilitiesLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      return `\nRIG: Tech Rig | Integrity ${ship.hullCondition}%\nMODULES: ${modulesLine}\nRIG OPTIONS: ${abilitiesLine}`
    },
    investigationGuide: 'Net dossier — hacked comm logs, surveillance captures, informant tips, intercepted corp traffic.\n\nData is abundant but truth is manufactured. The problem isn\'t finding information — it\'s that every source is compromised. Corp data is curated. Net data is manipulated. Informants are double agents. Camera footage is deepfaked.\n\nAt chapter open or when a new run begins, establish privately:\n- The truth: what actually happened (2-3 sentences)\n- The corporate version: what the data trail shows (always wrong in a way that protects someone powerful)\n- Evidence chain: 5-8 clues, but 2-3 are digitally fabricated. The player must determine which sources are clean.\n- Source reliability: each clue has a source. Sources have trustworthiness ratings the player doesn\'t see.\n- The corporate countermove: when the investigation gets close, the corp doesn\'t hide evidence — they manufacture more. Flood the case board with plausible alternatives.',
  },
  cohesionGuide: 'In cyberpunk, cohesion is maintained against an environment that actively erodes it. Corps target crews. The city manufactures distrust. +1: shared survival against systems that wanted you dead, captain spending eddies on the crew rather than gear, choosing crew over scores. -1: sacrificing crew for jobs, accepting jobs the crew opposed, bringing humanity-cost choices home from runs.',
  companionLabel: 'Crew',
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
    { hook: 'Your optical camo malfunctioned during last night\'s run and recorded everything you saw instead of masking your presence. That recording is now somewhere on the net, and it contains faces that powerful people want kept hidden. Your stealth tool became a liability. Three fixers have already called asking what you\'ll take for the footage.', title: 'Recorded', classes: ['Ghost'] },
    // Razorback
    { hook: 'A gang boss you used to work for is dead. Killed in a way that matches your signature — mantis blades, close range, no witnesses. You didn\'t do it, but the gang doesn\'t know that. They\'re already hunting.', title: 'Your Signature', classes: ['Razorback'] },
    { hook: 'A street doc patches you up after a firefight and mentions, casually, that the chrome in your arm isn\'t factory. Someone modified your cyberware while you were under, and she can\'t tell what it does.', title: 'Modified Chrome', classes: ['Razorback'] },
    { hook: 'Three gangs are converging on the same block tonight — your block. One of them hired you to hold the line. The other two don\'t know you\'re here yet. Neither does the NCPD AV circling overhead.', title: 'Three Fronts', classes: ['Razorback'] },
    // Netrunner
    { hook: 'Last night you uploaded something to the net that you shouldn\'t have. You don\'t remember doing it. Your rig\'s activity log says it took eleven minutes. Three corps have already noticed.', title: 'Eleven Minutes', classes: ['Netrunner'] },
    { hook: 'A dead netrunner\'s deck shows up at a pawn shop with your handle scratched into the casing. Inside: an unfinished run against a corp subnet, paused mid-execution. The daemon is still live, waiting for someone to finish what they started.', title: 'Unfinished Run', classes: ['Netrunner'] },
    { hook: 'You found something in the net that found you back. Not ICE, not a daemon — a consciousness. It\'s living in decommissioned infrastructure and thinks you\'re the first real person to visit in years. It won\'t let you log out until you do something for it. Your deck is burning through battery and your body is getting cold in the chair.', title: 'Someone Home', classes: ['Netrunner'] },
    // Broker
    { hook: 'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of you meeting a client who was found dead the next morning. Someone is building a case — or leverage.', title: 'Leverage', classes: ['Broker'] },
    { hook: 'Your most reliable contact calls in a panic: someone is burning their network from the inside. Three brokers dead in two days, all connected to the same job — a job you brokered six months ago and thought was finished.', title: 'Burning Network', classes: ['Broker'] },
    { hook: 'A corpo middleman offers you a name — someone high up who wants to defect. All you have to do is arrange safe passage. The catch: two other brokers got the same offer this week. Neither of them made it home.', title: 'Safe Passage', classes: ['Broker'] },
    // Medtech
    { hook: 'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours. When you get there, the ripperdoc says she\'s not a hostage.', title: 'Not a Hostage', classes: ['Medtech'] },
    { hook: 'A patient walks into your clinic with military-grade chrome that no street doc installed. They don\'t know where it came from. They don\'t remember the surgery. And the serial numbers on the implants belong to a soldier who died two years ago.', title: 'Dead Man\'s Chrome', classes: ['Medtech'] },
    { hook: 'A patient you saved last month comes back — different. The cyberware you installed is behaving autonomously, making decisions the patient didn\'t authorize. Two more former patients report the same thing. The chrome you\'ve been installing isn\'t factory standard. Someone in your supply chain has been slipping modified implants into your inventory, and you don\'t know how far back it goes.', title: 'Bad Chrome', classes: ['Medtech'] },
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
  npcNames: [
    'Razor', 'Jin', 'Kovacs', 'Delgado', 'Nine', 'Bishop', 'Yara', 'Frost',
    'Kali', 'Vex', 'Santos', 'Nika', 'Mercer', 'Tran', 'Glitch', 'Okafor',
    'Splicer', 'Reyes', 'Null', 'Tanaka', 'Cass', 'Devlin', 'Ashe', 'Miko',
    'Roque', 'Haze', 'Petrov', 'Lux', 'Corbin', 'Zara', 'Dex', 'Vasquez',
    'Ghost', 'Niles', 'Kwon',
  ],
}


export default cyberpunkConfig
