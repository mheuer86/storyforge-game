import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Cyberpunk ────────────────────────────────────────────────────────

const cyberpunkSpecies: Species[] = [
  {
    id: 'street-kid',
    name: 'Street Kid',
    description: 'Born in the gutter wards. Knows every shortcut, every gang corner, every unwritten rule.',
    lore: 'You grew up where the city doesn\'t bother pretending. Cops don\'t come, corps don\'t care, and you learned to read a room before you learned to read. Start with one gang contact at Favorable. Advantage on Streetwise checks. Disadvantage on initial social checks with corpo or institutional NPCs — they see the ward before they see you. Active liability: you still owe the gang that raised you. Once per chapter, a gang obligation surfaces. Ignoring it burns your only safety net.',
    behavioralDirective: 'Default register: wary, territorial, reading threat levels before names. The ward taught loyalty by necessity, not choice. NPC reactions: corpos see poverty, street NPCs see one of their own. When narrating interiority: the instinct to check corners, count exits, and measure whether a room respects you or is about to take something.',
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
    behavioralDirective: 'Default register: polished, reflexively corporate in posture and diction, aware of the gap between where you came from and where you are now. NPC reactions: corpos see a defector they can leverage, street NPCs see someone who chose to slum it. When narrating interiority: the muscle memory of corporate politeness fighting the knowledge of exactly what that machine does to people.',
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
    behavioralDirective: 'Default register: grounded, physical, distrustful of walls and ceilings. Measures distance in horizons, not floors. NPC reactions: city people treat as outsider or novelty, other nomads treat as family. When narrating interiority: the claustrophobia of vertical living and the pull of open road against the obligations that brought you inside.',
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
    behavioralDirective: 'Default register: quiet, watchful, uncomfortable in open spaces. Navigates by infrastructure, not streets. NPC reactions: surface dwellers don\'t know what to make of you, undercity people treat as native. When narrating interiority: the comfort of enclosed spaces and the persistent sense that the surface world is a performance you never learned the script for.',
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
    behavioralDirective: 'Default register: controlled, hierarchical, reading power dynamics the way others read weather. Loyalty is structural, not sentimental. NPC reactions: syndicate members treat as family (with all the weight that carries), outsiders treat as dangerous by association. When narrating interiority: the clarity of knowing exactly where you stand in a system built on blood and obligation, and the question of whether that system is a cage or a home.',
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

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'burned',
    name: 'Burned',
    description: 'The gang cut ties. Old favors are threats now.',
    lore: 'The old crew decided you were a liability. The favors that once kept you safe are now debts held by people who want you gone. Every contact from the old life is someone who knows enough to sell you out.',
    behavioralDirective: 'Default register: the street that raised you has disowned you. Old survival instincts are intact but the network backing them is hostile. NPC reactions: former allies cross the street. New contacts smell desperation. Gang territory that was home is now enemy ground. When narrating interiority: the city feels the same but every familiar corner has turned unfriendly. The people who knew you best are the most dangerous.',
    hidden: true,
  },
  {
    id: 'flagged',
    name: 'Flagged',
    description: 'Corporate systems have identified you. Every scan is a risk.',
    lore: 'The corp has your biometrics, your movement patterns, your known associates. Running is harder when the infrastructure itself is looking for you. Every security camera, payment terminal, and automated checkpoint is a potential trigger.',
    behavioralDirective: 'Default register: the system sees you now. The corporate training that taught you to navigate infrastructure now tells you exactly how exposed you are. NPC reactions: corpo contacts go dark. Street contacts charge more because association carries risk. When narrating interiority: the city\'s infrastructure is no longer neutral. Every automated system is a potential eye, and you know exactly how the response protocols work because you used to write them.',
    hidden: true,
  },
  {
    id: 'settled',
    name: 'Settled',
    description: 'The street seeped in. What was survival is now identity.',
    lore: 'The undercity was supposed to be temporary. The survival patterns were supposed to be tools, not personality. But the city has a way of becoming permanent, and the character has stopped looking for a way out. The rot is comfortable now.',
    behavioralDirective: 'Default register: the undercity is no longer something to escape; it is home, and that acceptance carries a cost. NPC reactions: surface contacts see someone who has given up. Undercity contacts see someone who finally belongs. When narrating interiority: the ceiling feels right. The air tastes normal. The ambition to leave has been replaced by the expertise of staying, and the difference between adaptation and surrender is invisible from the inside.',
    hidden: true,
  },
  {
    id: 'visible',
    name: 'Visible',
    description: 'Tied down. Roots grew where wheels used to be.',
    lore: 'The nomad\'s freedom was the ability to leave. Obligations and debts have anchored the character to one place. The vehicle is parked. The contacts are local. The horizon has narrowed to a neighborhood.',
    behavioralDirective: 'Default register: the freedom is gone and the body knows it. The instinct to leave is still there but the reasons to stay have accumulated into an anchor. NPC reactions: locals trust you more because you can\'t run. Old nomad contacts lose respect. When narrating interiority: the road is still there but the weight of staying is heavier than the pull of leaving. Every obligation is a root, and roots don\'t travel.',
    hidden: true,
  },
  {
    id: 'cut',
    name: 'Cut',
    description: 'The syndicate has disowned you, or you them. The blood tie is severed.',
    lore: 'Family and syndicate were the same thing. Now the blood tie is cut, whether by your choice or theirs. The name that opened every door in the family\'s territory now closes them. The skills remain; the protection does not.',
    behavioralDirective: 'Default register: severed from the only identity that was never in question. The syndicate instincts are intact but serve no family. NPC reactions: family members treat you as dead or dangerous. Outside contacts see someone unmoored, either free or adrift depending on their perspective. When narrating interiority: the blood tie was the one thing that never needed earning. Its absence is not freedom; it is amputation.',
    hidden: true,
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
    openingKnowledge: 'You know the city\'s surveillance architecture the way a rat knows the walls: every camera blind spot, every biometric scanner with a three-second lag, every maintenance corridor that bypasses the lobby. You know that corporate security is thorough but not omniscient, and that the most dangerous moment is not the breach but the ninety seconds after, when the system decides whether to flag or forget. You know that being invisible is a discipline, not a talent, and that the moment you stop paying attention is the moment someone remembers your face.',
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
    openingKnowledge: 'You know the weight of chrome in your arms and the half-second advantage it gives you over anyone running stock. You know the sound a mantis blade makes when it deploys, the way a room changes when people hear it, and the particular silence that follows. You know that every piece of cyberware is a transaction: more speed for less feeling, more strength for less of whatever makes you hesitate before the swing. You know the ripperdocs who do clean work and the ones who cut corners, and you know the difference matters more each year.',
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
    openingKnowledge: 'You know the Net the way a deep-sea diver knows the ocean: beautiful, lethal, and full of things that were never meant to be found. You know that corporate ICE is designed to fry the brain behind the deck, not just the deck itself. You know the wild Net beyond the corporate firewalls is not empty; it is inhabited by things that used to be programs and became something else. You know the feeling of your body cooling in the chair while your mind races through architecture that doesn\'t obey physics, and you know that coming back is never guaranteed.',
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
    openingKnowledge: 'You know that information is the only commodity in this city that appreciates with scarcity and depreciates with sharing. You know every fixer operates on a web of markers: favors owed, debts called, and the invisible ledger that tracks who is reliable and who is a liability. You know the corpo middlemen who broker defections, the gang lieutenants who buy silence, and the ripperdocs who trade patient data for protection. The city runs on connections, and your encrypted comm is the switchboard.',
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
    openingKnowledge: 'You know the human body as a system and the chrome inside it as a second system that doesn\'t always agree with the first. You know which implants reject after six months and which ones reject after six years, and that the difference is usually the quality of the biocoating, which is usually the part the manufacturer cuts corners on. You know the clinics that sterilize and the ones that don\'t, and you know that most of your patients can\'t afford the difference. Trauma Team charges per minute. You charge what people can pay.',
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
    openingKnowledge: 'You know the math of contract killing: distance to target, sight lines, exit routes, and the window between the shot and the response. You know which corpo security teams are professional and which ones panic, and you know the difference between a crew that will hunt you for a week and one that will hunt you forever. You know that survival is not about being the strongest or the fastest; it is about being the one who decided, before walking into the room, exactly how it ends.',
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
  partyBaseName: 'Tech Rig',
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
  deepLore: `## THE CITY

**Corporate Sovereignty.** Six megacorporations function as nation-states. They issue citizenship, maintain private militaries, operate their own judicial systems, and control the infrastructure that makes urban life possible. Corporate citizenship means healthcare, housing, education, and security. Losing it means losing all four simultaneously. The corps compete with each other through market manipulation, hostile acquisitions, deniable operations, and occasionally open conflict in contested sectors. Government exists as a regulatory fiction: the mayor is elected, the council convenes, the NCPD patrols, but every institution operates within parameters the corps define.

**The Vertical Stack.** The city is stratified by altitude. Upper levels: corporate arcologies, clean air, private security, residents who have never seen street level. Mid levels: the grinding middle, where most people live and work, where the neon is brightest because it has to compete with the dark. Lower levels and undercity: maintenance warrens, black-market tunnels, communities that exist below the tax line and below the law. Altitude is wealth. Descending is failing. The elevator is the most honest metaphor the city has.

**The Net.** The old Net was open, anarchic, and briefly beautiful. The Compact Wars ended that. Corporate ICE now segments the Net into controlled territories. Beyond the corporate firewalls, the wild Net persists: ungoverned, dangerous, and inhabited by rogue AIs, ghost programs, and data entities that no taxonomy adequately describes. Netrunners operate in both zones. The corporate Net pays better. The wild Net teaches more. Neither is safe.

**Cyberware and Humanity.** Chrome is ubiquitous. Everyone above the poverty line has at least basic implants: neural link, optical overlay, subdermal ID chip. The more chrome you carry, the more capable you become and the less human you feel. It is not a switch; it is a drift. Empathy narrows. Emotional range compresses. The ripperdocs call it "chrome drift," and the psychological literature calls it "cyberpsychosis," but both terms describe the same slow erosion. Most people never notice it happening to them. The people around them notice first.

**Fixers and the Shadow Economy.** Every job in the shadow economy passes through a fixer: brokers who match crews to contracts, negotiate terms, and take a cut. A good fixer is worth more than a good crew, because a good fixer keeps you alive between jobs. Burning a fixer means burning your livelihood. The shadow economy runs on reputation, encrypted comms, and the understanding that everyone is one bad job away from flatline or the street.

**Trauma Team and NCPD.** Trauma Team is privatized emergency response: armed medics on aerodynes, response time under four minutes, subscription required. No subscription means no response. NCPD is public law enforcement, underfunded, overworked, and outgunned by corporate security on good days. The gap between private and public infrastructure is the city\'s defining feature. If you can pay, you survive. If you cannot, you are on your own.`,
  guideNpcDirective: 'The opening NPC is a fixer. They speak in prices and probabilities. Don\'t explain the city; offer a job whose terms tell the player everything about how the world works.',
  loreFacets: {
    corporate: 'In this scene: everything runs on contracts, clearance levels, and plausible deniability. Corporate representatives never threaten directly; they describe consequences. Security is omnipresent but invisible until triggered. The building itself is surveillance. Hospitality is a form of containment.',
    'street-gang': 'In this scene: territory is the organizing principle. Colors, tags, and reputation define who belongs and who is trespassing. Violence is a dialect, not a disorder. Gang members are loyal to structure, not ideology. Respect is earned by consistency, and disrespect has a physical cost.',
    net: 'In this scene: the Net is not a place; it is a state of being. Describe it through sensation: the hum of data streams, the cold geometry of ICE architecture, the wrongness of rogue code that moves like something alive. The body is distant. Time is elastic. Coming back is a decision, not an assumption.',
    'ripperdoc-medical': 'In this scene: the clinic is where the city\'s damage becomes visible. Ripperdocs are surgeons, therapists, and confessors. They see what the chrome does to people. Describe the room: the autoclave, the surgical chair, the tray of implants waiting for bodies. Medicine here is transactional but not impersonal.',
    undercity: 'In this scene: the undercity operates on its own rules. Light is artificial and unreliable. Sound carries differently in tunnels. Communities here are tight, suspicious of surface dwellers, and fiercely protective of their own. The economy runs on barter, favors, and things that fell off a truck.',
    badlands: 'In this scene: the city ends, and the emptiness begins. Nomad territory, corporate dumping grounds, and the ruins of suburbs that couldn\'t compete. The horizon is visible for the first time. Vehicles matter more than chrome. Clan loyalty is the only law, and the road is the only freedom.',
  },
  loreAnchors: [
    'Megacorps=six corporations function as nation-states. Issue citizenship, maintain militaries, operate courts. Government is regulatory fiction.',
    'Vertical Stack=altitude is wealth. Upper: corporate arcologies, clean air. Mid: neon and hustle. Lower/undercity: below the tax line, below the law.',
    'The Net=post-Compact Wars, segmented by corporate ICE. Wild Net beyond the firewalls: rogue AIs, ghost programs, data entities. Neither zone is safe.',
    'Cyberware=chrome is ubiquitous. More capability, less humanity. Drift, not snap. Empathy narrows. The people around you notice before you do.',
    'Fixers=brokers matching crews to contracts. A good fixer keeps you alive between jobs. Burning one means burning your livelihood.',
    'Trauma Team=privatized emergency response. Subscription required. No subscription, no response. The gap between private and public is the city\'s soul.',
    'NCPD=public law enforcement. Underfunded, overworked, outgunned by corpo security. Maintains order in zones corps don\'t care about.',
    'Ripperdocs=street surgeons installing and maintaining chrome. Clean work costs more. Cheap work costs later. They see what the city does to people.',
    'Cyberpsychosis=cumulative chrome drift. Emotional range compresses. Empathy narrows. Most people don\'t notice it happening to themselves.',
    'Shadow Economy=reputation-based. Encrypted comms, fixer networks, deniable contracts. Everyone is one bad job from flatline or the street.',
    'Eddies (€$)=corporate-minted digital currency. Untraceable in theory, surveilled in practice. The only thing the corps and the street agree on.',
  ],
  cohesionGuide: 'In cyberpunk, cohesion is maintained against an environment that actively erodes it. Corps target crews. The city manufactures distrust. +1: shared survival against systems that wanted you dead, captain spending eddies on the crew rather than gear, choosing crew over scores. -1: sacrificing crew for jobs, accepting jobs the crew opposed, bringing humanity-cost choices home from runs.',
  companionLabel: 'Crew',
  notebookLabel: 'Data Cache',
  intelTabLabel: 'Recon',
  intelNotebookLabel: 'Data',
  intelOperationLabel: 'The Run',
  explorationLabel: 'Network',
  openingHooks: [
    // Universal
    { hook: 'The crew wakes up in a med-bay with a gap in their memory logs and someone else\'s coordinates loaded into their neural buffer. No explanation. No sender. Just a location and a time.', title: 'Memory Gap', frame: { objective: 'Find out what happened during the memory gap', crucible: 'Someone rewrote your logs and left breadcrumbs they want you to follow' }, arc: { name: 'The Memory Gap', episode: 'Investigate the coordinates and recover any trace of the lost hours' } },
    { hook: 'A rival crew is dead. Not flatlined in a firefight — found in their safehouse with their chrome ripped out, every implant surgically removed. Their ripperdoc says they were alive when it started. The chrome is gone, the crew\'s fixer is missing, and someone left the safehouse door open. Like an invitation.', title: 'Stripped', frame: { objective: 'Find the fixer and learn why the crew was harvested', crucible: 'Someone stripped living people of their chrome, and the open door suggests you\'re being tested' }, arc: { name: 'The Stripped Crew', episode: 'Search the safehouse and track down the missing fixer' } },
    { hook: 'The city goes dark. Not a power failure — a targeted blackout in a six-block radius. In the silence, a voice on every local channel says a name. It\'s the player\'s.', title: 'Blackout', frame: { objective: 'Find who broadcast your name and why', crucible: 'Someone with the power to black out six blocks wants your attention' }, arc: { name: 'The Blackout Signal', episode: 'Survive the blackout zone and trace the broadcast source' } },
    { hook: 'You remember growing up in the ward. The apartment, the stairwell, the woman who lived next door. Fifteen years of detailed, emotional memory. Then a neural scan for a routine chrome install flags something: the timestamps on those memories predate your implant installation by three years. They\'re not yours. Someone gave you a childhood that never happened, and they did it well enough that you lived inside it for a decade without questioning a single detail. The ripperdoc is staring at the scan results. She says she\'s seen implanted memories before. She\'s never seen ones this good.', title: 'Implanted', frame: { objective: 'Find out who built your false memories and why', crucible: 'Everything you thought was yours might be manufactured, and whoever did it had a reason' }, arc: { name: 'The Implanted Past', episode: 'Trace the memory implant\'s technical signature and identify who has the skill to build it' } },
    // Ghost — infiltrator/social engineer, Zero Trace trait, DEX primary
    { hook: 'The job was supposed to be clean: grab the data chip, ghost out. You got the chip. But when you jacked in to verify the contents, you saw footage of a corpo black site — test subjects, neural implants, people who don\'t appear in any database. The chip auto-transmitted your location when you accessed it. Corpo security is forty floors below you, coming up. The footage is still playing behind your eyes. You can wipe the chip and run clean, or keep the evidence and run dirty.', title: 'Forty Floors Up', classes: ['Ghost'], frame: { objective: 'Escape the building and decide what happens to the footage', crucible: 'Clean escape means destroying evidence of something monstrous; keeping it means they never stop hunting you' }, arc: { name: 'The Black Site Footage', episode: 'Escape the building and decide whether to keep, sell, or publish the evidence' } },
    { hook: 'A corpo exec offers triple rate to break into her own company\'s server room. She says it\'s a security audit. The floor plan she gave you has rooms that don\'t appear on any public blueprint.', title: 'Hidden Rooms', classes: ['Ghost'], frame: { objective: 'Infiltrate the server room and find the hidden rooms', crucible: 'The exec is paying you to find something she can\'t access in her own building' }, arc: { name: 'The Hidden Floor', episode: 'Penetrate the server room and discover what the hidden rooms contain' } },
    { hook: 'Your optical camo malfunctioned during last night\'s run and recorded everything you saw instead of masking your presence. That recording is now somewhere on the net, and it contains faces that powerful people want kept hidden. Your stealth tool became a liability. Three fixers have already called asking what you\'ll take for the footage.', title: 'Recorded', classes: ['Ghost'], frame: { objective: 'Recover the footage before the wrong people do', crucible: 'Powerful faces on leaked footage, fixers circling, and your name is attached' }, arc: { name: 'The Recorded Run', episode: 'Track where the footage ended up and assess who\'s already seen it' } },
    // Razorback — chrome street samurai/enforcer, Adrenaline Overclocked trait, STR primary
    { hook: 'You blacked out during a job last night. When you came to, there were three bodies and your mantis blades were deployed. Your crew says you moved like something else was driving — faster than you\'ve ever been, no hesitation, no recognition when they called your name. The chrome in your arms has been running hot since. A ripperdoc says the combat firmware updated itself overnight from a source she can\'t trace. Something is in your chrome, and it\'s better at killing than you are.', title: 'Combat Firmware', classes: ['Razorback'], frame: { objective: 'Find the source of the firmware update before it triggers again', crucible: 'Something in your chrome fought better than you can, and it didn\'t care who was in the room' }, arc: { name: 'The Firmware', episode: 'Get the firmware analyzed and trace who pushed the update' } },
    { hook: 'A street doc patches you up after a firefight and mentions, casually, that the chrome in your arm isn\'t factory. Someone modified your cyberware while you were under, and she can\'t tell what it does.', title: 'Modified Chrome', classes: ['Razorback'], frame: { objective: 'Find out what the modification does', crucible: 'Unknown code in your arm, put there when you were unconscious — by someone with access' }, arc: { name: 'Modified Chrome', episode: 'Get the modification analyzed and trace who had access during surgery' } },
    { hook: 'A street doc who patches up your crew for free is being squeezed by a gang moving into the block. They want her clinic for a braindance lab. She can\'t pay protection, can\'t relocate, and the gang is done talking. She asks you to handle it. The problem: the gang leader has military-grade chrome — full-body conversion, barely human anymore. He used to be someone you knew. The doc says he came to her last month asking for help. She couldn\'t reverse what was done to him. Now he\'s the one at her door.', title: 'The Clinic', classes: ['Razorback'], frame: { objective: 'Stop the gang from taking the clinic', crucible: 'A chrome-consumed friend who can\'t be reasoned with, and a doctor who tried to save him first' }, arc: { name: 'The Clinic', episode: 'Confront the gang leader and learn what was done to him' } },
    // Netrunner — hacker/remote operator, Deep Dive trait, INT primary
    { hook: 'Last night you uploaded something to the net that you shouldn\'t have. You don\'t remember doing it. Your rig\'s activity log says it took eleven minutes. Three corps have already noticed.', title: 'Eleven Minutes', classes: ['Netrunner'], frame: { objective: 'Recover what you uploaded and erase the trail', crucible: 'Your own rig betrayed you, three corps are hunting the upload, and you have no memory of doing it' }, arc: { name: 'The Eleven Minutes', episode: 'Reconstruct the upload from rig logs and find what triggered it' } },
    { hook: 'A dead netrunner\'s deck shows up at a pawn shop with your handle scratched into the casing. Inside: an unfinished run against a corp subnet, paused mid-execution. The daemon is still live, waiting for someone to finish what they started.', title: 'Unfinished Run', classes: ['Netrunner'], frame: { objective: 'Decide whether to finish the dead netrunner\'s run', crucible: 'A live daemon in a corp subnet with your handle on the hardware — someone wanted you to find this' }, arc: { name: 'The Unfinished Run', episode: 'Analyze the paused daemon and learn what the dead netrunner was after' } },
    { hook: 'You found something in the net that found you back. Not ICE, not a daemon — a consciousness. It\'s living in decommissioned infrastructure and thinks you\'re the first real person to visit in years. It won\'t let you log out until you do something for it. Your deck is burning through battery and your body is getting cold in the chair.', title: 'Someone Home', classes: ['Netrunner'], frame: { objective: 'Negotiate your way out of the net alive', crucible: 'A digital consciousness holding you hostage with a request, and your body is cooling' }, arc: { name: 'Someone Home', episode: 'Survive the first encounter and understand what the consciousness wants' } },
    // Broker — information broker/connected operator, Marker Called trait, CHA primary
    { hook: 'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of you meeting a client who was found dead the next morning. Someone is building a case — or leverage.', title: 'Leverage', classes: ['Broker'], frame: { objective: 'Find who sent the clip and what they want', crucible: 'Someone has footage connecting you to a dead client, and silence means they control the narrative' }, arc: { name: 'The Leverage Play', episode: 'Trace the braindance clip\'s origin and identify who\'s building the case' } },
    { hook: 'Your most reliable contact calls in a panic: someone is burning their network from the inside. Three brokers dead in two days, all connected to the same job — a job you brokered six months ago and thought was finished.', title: 'Burning Network', classes: ['Broker'], frame: { objective: 'Find the source burning the network before it reaches you', crucible: 'Three dead brokers, a job that should be closed, and you\'re connected to all of them' }, arc: { name: 'The Burning Network', episode: 'Identify the common thread between the dead brokers and the old job' } },
    { hook: 'A corpo middleman offers you a name — someone high up who wants to defect. All you have to do is arrange safe passage. The catch: two other brokers got the same offer this week. Neither of them made it home.', title: 'Safe Passage', classes: ['Broker'], frame: { objective: 'Vet the defector offer without ending up like the other brokers', crucible: 'A lucrative job that killed two professionals already, and you\'re broker number three' }, arc: { name: 'Safe Passage', episode: 'Investigate why the previous brokers died and verify the defector is real' } },
    // Medtech — combat medic/body modder, Field Triage trait, WIS primary
    { hook: 'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours. When you get there, the ripperdoc says she\'s not a hostage.', title: 'Not a Hostage', classes: ['Medtech'], frame: { objective: 'Get the ripperdoc out or learn why she\'s staying', crucible: 'The extraction target doesn\'t want to leave, and the fixer expects a delivery' }, arc: { name: 'Not a Hostage', episode: 'Assess the ripperdoc\'s situation and decide whose side you\'re on' } },
    { hook: 'A patient walks into your clinic with military-grade chrome that no street doc installed. They don\'t know where it came from. They don\'t remember the surgery. And the serial numbers on the implants belong to a soldier who died two years ago.', title: 'Dead Man\'s Chrome', classes: ['Medtech'], frame: { objective: 'Identify who installed the military chrome and why', crucible: 'Dead soldier\'s implants in a living patient with no memory of the surgery' }, arc: { name: 'Dead Man\'s Chrome', episode: 'Trace the implant serial numbers and reconstruct the patient\'s missing time' } },
    { hook: 'A patient you saved last month comes back — different. The cyberware you installed is behaving autonomously, making decisions the patient didn\'t authorize. Two more former patients report the same thing. The chrome you\'ve been installing isn\'t factory standard. Someone in your supply chain has been slipping modified implants into your inventory, and you don\'t know how far back it goes.', title: 'Bad Chrome', classes: ['Medtech'], frame: { objective: 'Find the compromised supplier in your chain', crucible: 'Your patients are being controlled through chrome you installed with your own hands' }, arc: { name: 'Bad Chrome', episode: 'Audit your supply chain and identify which implants are compromised' } },
    // Solo — contract killer/survivor, Dead Man Walking trait, CON primary
    { hook: 'The target is dead. Clean job, clean exit. Then the client sends a second payment — double the original — with a note: "Wrong person. Real target attached. Finish it." The photo is someone you know.', title: 'Wrong Person', classes: ['Solo'], frame: { objective: 'Decide what to do about the real target', crucible: 'The client doubled the money and the new target has a face you recognize' }, arc: { name: 'Wrong Person', episode: 'Learn why the client switched targets and what connects the two marks' } },
    { hook: 'You wake up in a motel room you don\'t recognize with a bullet wound you don\'t remember getting. Your gun has been fired. The news is running a story about a corpo exec found dead downtown. Your face isn\'t on camera. Yet.', title: 'Missing Hours', classes: ['Solo'], frame: { objective: 'Reconstruct the missing hours before someone else does', crucible: 'A bullet wound, a fired gun, a dead exec, and a memory gap that matches the timeline' }, arc: { name: 'The Missing Hours', episode: 'Piece together where you were and whether you pulled the trigger' } },
    { hook: 'A contract comes in through the usual channels: eliminate a solo operator who\'s been hitting corp targets across the city. Efficient, methodical, no witnesses. You read the dossier twice before you realize — the operational profile is yours.', title: 'Your Profile', classes: ['Solo'], frame: { objective: 'Find the operator using your profile before the client realizes', crucible: 'Someone is working your pattern, and the contract on their head is now pointed at you' }, arc: { name: 'Your Profile', episode: 'Investigate the copycat\'s most recent hit and separate their work from yours' } },
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
