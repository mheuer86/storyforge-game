import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Cyberpunk ────────────────────────────────────────────────────────

const cyberpunkSpecies: Species[] = [
  {
    id: 'operative',
    name: 'Operative',
    description: 'Freelance talent in the gig economy. You take jobs. Everyone hires you; nobody employs you.',
    lore: 'You are pure capability for rent. Fixers book you, corps contract you, gangs borrow you. The distinction from everyone else in the city: you don\'t own anything, build anything, or belong to anything. You are what you can do, and what you can do has a price. Start with one fixer contact at Favorable (they book your work and take a cut). One former client at Neutral (satisfied but cautious about repeat business). Advantage on checks involving tactical assessment, threat evaluation, and reading operational environments. The cost: every job creates obligations. The fixer who booked it, the client who paid, the crew who covered you. Debts compound. Freedom is the pitch; dependency is the product.',
    behavioralDirective: 'Default register: professional, assessing every room as a potential operational environment. People are variables: threats, assets, or civilians. NPC reactions: fixers see reliable income, corps see deniable assets, street contacts see someone who\'ll be gone by morning. When narrating interiority: the clarity of having no attachments and the growing awareness that "no attachments" is itself a kind of damage. You evaluate relationships by what they cost, not what they mean.',
    startingContacts: [
      {
        role: 'Fixer',
        disposition: 'favorable',
        description: 'Books your jobs, takes a cut, and keeps you fed. Professional, not personal.',
        affiliation: 'Shadow economy',
        npcRole: 'contact',
      },
      {
        role: 'Former client',
        disposition: 'neutral',
        description: 'Satisfied with the last job but cautious about building a pattern. Pays on time.',
        affiliation: 'Independent',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'fixer',
    name: 'Fixer',
    description: 'The connective tissue. You don\'t do jobs; you make jobs happen.',
    lore: 'You broker between corps, gangs, talent, and anyone who needs something they can\'t get through official channels. Your position is the intersection point: everyone needs you, and everyone has leverage on you. Start with one operative contact at Favorable (reliable talent you\'ve booked repeatedly). One corporate middleman at Wary (useful but watching). Advantage on checks involving network knowledge, reading leverage, and negotiation. The cost: you know too much. Every connection is a potential leak. Every client is someone who could sell you to someone else. Your value is your network, and your network is your vulnerability.',
    behavioralDirective: 'Default register: calculating, reading every person as a node in a network. Information is currency; silence is investment. NPC reactions: operatives respect the work pipeline, corps see a useful channel, gangs see someone worth keeping alive. When narrating interiority: the constant mapping of who knows what, who owes whom, and the growing weight of being the person everyone trusts with secrets they\'d kill to keep quiet.',
    startingContacts: [
      {
        role: 'Reliable operative',
        disposition: 'favorable',
        description: 'Talent you\'ve booked repeatedly. Professional respect, approaching trust.',
        affiliation: 'Freelance',
        npcRole: 'contact',
      },
      {
        role: 'Corporate middleman',
        disposition: 'wary',
        description: 'A corporate contact who uses your services for deniable work. Useful, but always watching.',
        affiliation: 'Megacorp',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'ripperdoc',
    name: 'Ripperdoc',
    description: 'You maintain the bodies. Everyone comes to you, and you see what the chrome costs up close.',
    lore: 'Clinic, street surgery, back alley. Operatives for combat chrome, corpos for vanity mods, gangers for street upgrades, the desperate for whatever they can afford. You are the city\'s physical layer: the person who sees, up close, what the human-machine merge actually costs in tissue and sanity. Start with one regular patient at Favorable (comes back because you\'re honest about the risks). One medical supplier at Neutral (reliable stock, no questions, price reflects the silence). Advantage on checks involving medical knowledge, cyberware assessment, and reading physical trauma. The cost: you see what chrome does. The rejection, the personality erosion, the moment a patient stops recognizing their own hands. And you install it anyway, because that\'s what you do.',
    behavioralDirective: 'Default register: clinical precision layered over quiet empathy. Bodies are systems; the people inside them are patients. NPC reactions: everyone trusts you with their body, not their secrets (though the body tells its own secrets). Street contacts see the doc who doesn\'t judge. Corps see a liability who knows too many implant serial numbers. When narrating interiority: the weight of installing chrome you know will erode someone, the professional detachment that lets you work and the human awareness that the detachment is its own kind of erosion.',
    startingContacts: [
      {
        role: 'Regular patient',
        disposition: 'favorable',
        description: 'Comes back because you tell the truth about what the chrome will do. Loyalty built on honesty.',
        affiliation: 'Street-level',
        npcRole: 'contact',
      },
      {
        role: 'Medical supplier',
        disposition: 'neutral',
        description: 'Reliable stock, no questions about where it goes. The price reflects the silence.',
        affiliation: 'Shadow economy',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'corporate',
    name: 'Corporate',
    description: 'Inside the machine. You serve the system, profit from its logic, and see it clearly.',
    lore: 'Not a dropout; someone still enmeshed in corporate logic, still operating within the system. The corp is the city\'s dominant institution. Being inside it is its own position: access, resources, protection, in exchange for complicity in everything the corp does. Start with one corporate colleague at Favorable (a genuine ally inside the machine, for now). One corporate superior at Wary (evaluating your usefulness against your risk). Advantage on checks involving institutional knowledge, corporate protocol, and bureaucratic navigation. The cost: you profit from a system you can see clearly. Every successful quarter, every promotion, every efficiency report is built on the exploitation the city\'s economy runs on. You know exactly what the machine does. You benefit from it anyway.',
    behavioralDirective: 'Default register: polished, procedural, framing everything in corporate vocabulary that sanitizes what it describes. "Restructuring" means people lose their lives. "Asset reallocation" means someone\'s chrome gets repossessed. NPC reactions: corpos see a colleague (with all the trust that implies, which is none), street contacts see the enemy wearing a human face. When narrating interiority: the comfort of the system and the knowledge that the comfort is purchased with other people\'s suffering. The question is never whether you see it; it\'s whether seeing it changes anything you do.',
    startingContacts: [
      {
        role: 'Corporate colleague',
        disposition: 'favorable',
        description: 'A genuine ally inside the machine. Friendship is real; loyalty to the corp is also real. Both coexist.',
        affiliation: 'Megacorp',
        npcRole: 'contact',
      },
      {
        role: 'Corporate superior',
        disposition: 'wary',
        description: 'Evaluating your usefulness against your risk. Supportive as long as the numbers work.',
        affiliation: 'Megacorp',
        npcRole: 'npc',
      },
    ],
  },
  {
    id: 'unplugged',
    name: 'Unplugged',
    description: 'You reject augmentation in a world built on it. Slower, weaker, invisible to scanners.',
    lore: 'The ideological counterweight. You refuse chrome, or actively work to free others from it. Some are religious (the body is sacred). Some are philosophical (the self is being overwritten by corporate product). Some are practical (they\'ve seen cyberpsychosis and decided the trade isn\'t worth it). Some are former addicts who got clean. Your position: you reject the thing the city is built on. You operate without chrome in a world designed for it. Slower, weaker, less connected, but invisible to implant scanners, immune to neural hacking, and proof that the merge isn\'t inevitable. Start with one community contact at Favorable (someone who shares the conviction or respects it). One former chrome user at Neutral (got clean with your help, still fragile). Advantage on checks involving natural perception, resistance to electronic warfare, and social influence with unaugmented communities. The cost: every time you use augmented infrastructure, accept chrome to survive, or let someone get installed to save them, you erode the conviction that defines you.',
    behavioralDirective: 'Default register: present, grounded, reading rooms with senses the city forgot people had. Slower than the chromed-up but seeing things they filter out. NPC reactions: chromed operatives see a liability, corps see a curiosity or a threat, unaugmented communities see a leader or a fool depending on whether conviction produces results. When narrating interiority: the discipline of refusal in a world that punishes it, the moments where the body isn\'t enough and the conviction has to carry the difference, the quiet pride of proving the merge isn\'t the only way.',
    startingContacts: [
      {
        role: 'Community contact',
        disposition: 'favorable',
        description: 'Shares the conviction or at least respects it. Part of the unaugmented network.',
        affiliation: 'Unplugged community',
        npcRole: 'contact',
      },
      {
        role: 'Former chrome user',
        disposition: 'neutral',
        description: 'Got clean with your help. Still fragile, still grateful, still tempted.',
        affiliation: 'Independent',
        npcRole: 'contact',
      },
    ],
  },

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'owned',
    name: 'Owned',
    description: 'Too many debts, too many claims. You\'re free to no one.',
    lore: 'Every job created an obligation. The fixer who booked it, the client who paid, the crew who covered you. The debts compounded until the word "freelance" became a joke. You are owned by everyone and free to no one. The gig economy ate the person inside the operative.',
    behavioralDirective: 'Default register: reactive, moving from obligation to obligation with no space between. The professional clarity is gone; replaced by the exhaustion of serving too many masters. NPC reactions: fixers see someone they can push. Clients see someone who can\'t say no. When narrating interiority: the freedom that defined you is gone. Every choice is a payment on a debt, and the debts have interest.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Corporate Leash',
      description: 'Once per chapter, request corporate resources: intel, equipment, extraction, or backup. The corp always provides. The corp always chooses the form, and it always comes with a condition the player must fulfill before next chapter. Refusing the condition burns the resource permanently.',
      cost: 'Each use adds a corporate obligation. The corp decides what you get, not you. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'burned',
    name: 'Burned',
    description: 'Too many people know your name. The network is a target.',
    lore: 'You knew too much about too many people, and the exposure reached critical mass. Clients are selling your name to other clients. Operatives you booked are being interrogated about your network. The intersection point that was your greatest asset is now the thing that will kill you.',
    behavioralDirective: 'Default register: paranoid, second-guessing every contact, every message, every meeting. The network that was your identity is now a web of potential betrayals. NPC reactions: contacts are afraid to be seen with you. Old clients go dark. New contacts approach with suspicion. When narrating interiority: every connection you built is a thread someone can pull. The person who knew everyone is now the person everyone knows about.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Ghost Network',
      description: 'Once per chapter, contact a former asset who still owes you. They help (information, access, or a one-time service). But every contact use is loud: automatic +1 exposure counter. The scared asset talks to someone afterward, every time.',
      cost: 'Every use increases exposure. The network works, but it leaks. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'hollowed',
    name: 'Hollowed',
    description: 'You\'ve installed enough chrome to know the system consumes people. You\'re the delivery mechanism.',
    lore: 'The conscience broke. Not dramatically; it eroded. Patient after patient, implant after implant, watching the drift happen in real time and handing them the next upgrade anyway. The clinical detachment that let you work has consumed the empathy that made the work matter.',
    behavioralDirective: 'Default register: technically precise, emotionally absent. The hands still work perfectly; the person behind them has retreated. NPC reactions: patients sense something missing. Other ripperdocs recognize the thousand-yard stare. When narrating interiority: the work is automatic now. The bodies are systems. The people inside them used to matter, and the memory of caring is worse than the absence of it.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Clinical Distance',
      description: 'Advantage on all medical, surgical, and tech-repair checks. Disadvantage on all Insight and Empathy checks involving reading emotions or providing comfort. Patients you treat recover faster but trust you less (disposition cap: Neutral for anyone you treat medically).',
      cost: 'Permanent emotional blindness in social-medical contexts. Patients never fully trust the Hollowed.',
    },
  },
  {
    id: 'apparatus',
    name: 'Apparatus',
    description: 'Indistinguishable from the institution. The person and the corp are the same thing.',
    lore: 'The complicity gradient reached its end. Every compromise, every efficiency report, every "restructuring" built the corporate logic deeper into the person until the person stopped being visible. Colleagues see a function, not a human. The system runs through you now, not around you.',
    behavioralDirective: 'Default register: institutional. Decisions are policy. Relationships are org chart positions. The corporate vocabulary that used to be a mask is now the only language you speak. NPC reactions: corpos see a reliable asset. Street contacts see the machine wearing skin. When narrating interiority: the comfort of certainty. The system provides answers to every question. The only question it can\'t answer is whether the person who entered still exists.',
    hidden: true,
    shiftedMechanic: {
      type: 'contact_change',
      name: 'Institutional Integration',
      description: 'All personal contacts are replaced with corporate assets. Corporate contacts are Favorable by default and provide excellent institutional resources. But every interaction is logged: the corp sees who you talk to, what you ask for, and what you do with it. No private conversations through corporate channels.',
      cost: 'Total surveillance. The machine has your full data. Street contacts refuse to work with you (recognized as corp through and through).',
    },
  },
  {
    id: 'compromised',
    name: 'Compromised',
    description: 'The line between you and the chromed-up is rhetorical now.',
    lore: 'Every use of augmented infrastructure, every chrome accepted to survive, every compromise "just this once" eroded the conviction until the distinction between Unplugged and everyone else became rhetorical. The body is still mostly organic. The principles are not.',
    behavioralDirective: 'Default register: defensive, performing conviction that no longer drives decisions. The arguments are memorized but the feeling behind them is gone. NPC reactions: the unaugmented community sees a hypocrite. The chromed-up see someone who finally admitted the truth. When narrating interiority: the discipline that defined you is gone, replaced by the habit of it. The refusal was identity; without it, the question of who you are has no answer.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Both Sides',
      description: 'Once per chapter, use a piece of cyberware as if you never rejected it: full chrome capability for one action (hacking, enhanced reflexes, neural override). The next time you advocate for the Unplugged cause or interact with Unplugged-aligned contacts, anyone who witnessed the chrome use notices the contradiction. -1 disposition with all Unplugged-aligned NPCs present.',
      cost: 'Each use erodes Unplugged trust permanently. The line you drew is now a door you walk through when convenient. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
]

// Universal classes kept for fallback — playbooks below are origin-keyed and take priority
const cyberpunkClasses: CharacterClass[] = []

const cyberpunkPlaybooks: Record<string, CharacterClass[]> = {
  // ─── Operative: Freelance talent ─────────────────────────────────────
  'operative': [
    {
      id: 'netrunner',
      name: 'Netrunner',
      concept: 'The operative who works through the Net. Digital infiltration, remote operations, the body left behind.',
      hookTags: ['infiltrator', 'analyst'],
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
      id: 'razorback',
      name: 'Razorback',
      concept: 'The operative who is the weapon. Chrome-enhanced combat, the body rebuilt for violence.',
      hookTags: ['enforcer'],
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
      id: 'ghost',
      name: 'Ghost',
      concept: 'The operative nobody remembers seeing. Infiltration, social engineering, the art of being nobody.',
      hookTags: ['infiltrator', 'networker'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Deception', 'Hacking', 'Acrobatics'],
      stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
      startingInventory: [
        { id: 'smart_pistol', name: 'Smart Pistol', description: 'Self-tracking rounds, +2 to hit', quantity: 1, damage: '1d8' },
        { id: 'monowire', name: 'Monowire', description: 'Retractable arm-mounted wire blade', quantity: 1, damage: '1d6+DEX' },
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
  ],

  // ─── Fixer: The connective tissue ────────────────────────────────────
  'fixer': [
    {
      id: 'analyst',
      name: 'Analyst',
      concept: 'Data as commodity. You see the network\'s shape before anyone else does.',
      hookTags: ['analyst', 'infiltrator'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Hacking', 'Insight', 'Electronics'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 17, WIS: 14, CHA: 11 },
      startingInventory: [
        { id: 'data_sniffer', name: 'Data Sniffer', description: 'Passive network scanner. Detects encrypted traffic, identifies connected devices.', quantity: 1 },
        { id: 'concealable_pistol_a', name: 'Concealable Pistol', description: 'Small, quiet, last resort', quantity: 1, damage: '1d6' },
        { id: 'signal_jammer', name: 'Signal Jammer', description: 'Block comms in a 30ft radius for 1 minute. 2 charges.', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'encrypted_archive', name: 'Encrypted Archive', description: 'Offline storage of sensitive data. Cannot be remotely wiped.', quantity: 1 },
      ],
      startingCredits: 1500,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Pattern Recognition',
        description: 'Once per day, after observing a person, system, or organization for at least one scene, identify one hidden vulnerability or connection that isn\'t publicly known.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the shape of networks before the people inside them do. Data flows like water: it follows paths of least resistance, pools in predictable places, and the gaps in the flow tell you more than the flow itself. You know that corporate data is curated, street data is manipulated, and the truth lives in the contradictions between sources. The data sniffer in your pocket maps every device in the room, and you read the map the way a meteorologist reads pressure systems: not what is, but what\'s coming.',
    },
    {
      id: 'fence',
      name: 'Fence',
      concept: 'Physical goods, logistics, smuggling. You move things the city doesn\'t want moved.',
      hookTags: ['enforcer', 'infiltrator'],
      primaryStat: 'DEX',
      proficiencies: ['Sleight of Hand', 'Stealth', 'Survival', 'Street Lore'],
      stats: { STR: 12, DEX: 17, CON: 14, INT: 11, WIS: 12, CHA: 10 },
      startingInventory: [
        { id: 'smuggler_harness', name: 'Smuggler\'s Harness', description: 'Concealed compartments. Passes most scanners.', quantity: 1 },
        { id: 'machine_pistol', name: 'Machine Pistol', description: 'Compact, fast, loud', quantity: 1, damage: '1d8, burst fire' },
        { id: 'lockbreaker', name: 'Lockbreaker Kit', description: 'Mechanical and electronic. +3 to lockpicking checks.', quantity: 1 },
        { id: 'stim_patches_f', name: 'Stim Patches', description: 'Quick heals for quick exits', quantity: 1, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 1800,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Hidden Cargo',
        description: 'Once per day, produce an item that wasn\'t on your manifest. You had it the whole time; they just didn\'t find it.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the city\'s arteries: the shipping routes, the checkpoint schedules, the maintenance tunnels where scanners don\'t reach. You know which dock workers take bribes and which ones take notes. You know that every wall the city builds has a gap, because the people who built it need the gap as much as you do. The smuggler\'s harness under your jacket holds more than it should, and the lockbreaker in your pocket has opened doors in every district. Moving contraband is logistics. Moving it without dying is art.',
    },
    {
      id: 'dealmaker',
      name: 'Dealmaker',
      concept: 'The human side of brokering. Negotiation, alliance, the art of making everyone feel like they won.',
      hookTags: ['networker'],
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
  ],

  // ─── Ripperdoc: Maintains the bodies ─────────────────────────────────
  'ripperdoc': [
    {
      id: 'engineer',
      name: 'Engineer',
      concept: 'Experimental tech, custom builds. You don\'t just install chrome; you invent it.',
      hookTags: ['technician', 'analyst'],
      primaryStat: 'INT',
      proficiencies: ['Electronics', 'Engineering', 'Investigation', 'Cyberware Installation'],
      stats: { STR: 10, DEX: 14, CON: 12, INT: 17, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'custom_toolkit', name: 'Custom Toolkit', description: 'Precision instruments for cyberware modification. +3 to Engineering checks.', quantity: 1 },
        { id: 'emp_grenades', name: 'EMP Grenades', description: 'Disables electronics in 15ft radius. DC 14 CON save or cyberware offline 1 round.', quantity: 2, damage: 'EMP, 15ft radius' },
        { id: 'prototype_scanner', name: 'Prototype Scanner', description: 'Identifies cyberware make, model, and modification history on contact.', quantity: 1 },
        { id: 'field_kit_e', name: 'Field Repair Kit', description: 'Patch chrome in the field — restores 1d6 rig integrity or stabilizes a malfunctioning implant', quantity: 1, charges: 2, maxCharges: 2 },
      ],
      startingCredits: 1200,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Jury-Rig',
        description: 'Once per day, modify a piece of cyberware or tech on the fly, adding a temporary bonus (+2 to one stat or skill) that lasts until end of chapter. Side effects are the GM\'s call.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know chrome at the component level: the neural bridges, the biocoating polymers, the firmware handshakes between meat and machine. You know what the manufacturers cut corners on (always the biocoating, always the thermal management) and you know how to fix it with parts that weren\'t designed to fit. Your prototype scanner has read more implant serial numbers than the corps that made them. The custom toolkit in your bag has built things that don\'t appear in any catalog. The problem with inventing better chrome is that better chrome still erodes the person wearing it; you\'ve just made the erosion more efficient.',
    },
    {
      id: 'surgeon',
      name: 'Surgeon',
      concept: 'Precision hands, trauma response. The clinic that keeps the street alive.',
      hookTags: ['technician', 'networker'],
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
      id: 'street-doc',
      name: 'Street Doc',
      concept: 'The clinic that never closes. Part medic, part counselor, part confessor.',
      hookTags: ['technician', 'networker'],
      primaryStat: 'CON',
      proficiencies: ['Medicine', 'Insight', 'Endurance', 'Street Lore'],
      stats: { STR: 12, DEX: 12, CON: 17, INT: 12, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'heavy_medkit', name: 'Heavy Medkit', description: 'Industrial-grade trauma response — heals 2d6+CON HP', quantity: 1, effect: '2d6+CON HP', charges: 2, maxCharges: 2 },
        { id: 'combat_knife_sd', name: 'Combat Knife', description: 'Surgical and practical. Both uses are frequent.', quantity: 1, damage: '1d4+DEX' },
        { id: 'stim_cocktail', name: 'Stim Cocktail', description: 'Custom blend. Removes one condition (poisoned, stunned, frightened).', quantity: 2, charges: 2, maxCharges: 2 },
        { id: 'patient_ledger', name: 'Patient Ledger', description: 'Encrypted. Every patient you\'ve treated, what you found inside them, what they told you on the table.', quantity: 1 },
      ],
      startingCredits: 800,
      startingHp: 12,
      startingAc: 13,
      hitDieAvg: 6,
      trait: {
        name: 'Seen Worse',
        description: 'Once per day, automatically succeed on a death save or stabilization check. The patient lives because you\'ve lost enough to know what dying looks like, and this isn\'t it yet.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what the city does to bodies because every body in this neighborhood has been on your table. The combat injuries, the chrome rejections, the overdoses, the beatings that nobody reports. You know that the patient ledger in your coat is worth more than your clinic because it contains the medical histories of people who don\'t officially exist. You know that the best ripperdocs have steady hands and short memories, and that you have steady hands and remember everything. Every scar you\'ve stitched is a story the city doesn\'t want told.',
    },
  ],

  // ─── Corporate: Inside the machine ───────────────────────────────────
  'corporate': [
    {
      id: 'auditor',
      name: 'Auditor',
      concept: 'Internal investigation, data forensics. The corp\'s immune system turned analyst.',
      hookTags: ['analyst', 'infiltrator'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Hacking', 'Insight', 'Noble Etiquette'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 17, WIS: 14, CHA: 11 },
      startingInventory: [
        { id: 'corporate_deck', name: 'Corporate Deck', description: 'High-clearance access. +3 to Hacking checks in corporate networks.', quantity: 1 },
        { id: 'audit_credentials', name: 'Audit Credentials', description: 'Opens doors, demands answers, creates enemies. Legitimate corporate authority.', quantity: 1 },
        { id: 'concealable_pistol_au', name: 'Concealable Pistol', description: 'Standard corporate issue. Clean, maintained, unremarkable.', quantity: 1, damage: '1d6' },
        { id: 'forensic_scanner', name: 'Forensic Scanner', description: 'Detects data tampering, traces financial flows, reads deleted files.', quantity: 1 },
      ],
      startingCredits: 2000,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Clearance Override',
        description: 'Once per day, invoke corporate authority to access a restricted system, file, or area within corporate infrastructure. Outside corporate space, this does nothing.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what the numbers look like when someone is stealing, and you know what they look like when the theft is sanctioned. You know the difference between a discrepancy and a decision, and you know that the most dangerous thing you can find during an audit is something the board already knows about. The corporate deck in your bag has legitimate clearance, which means the things you find are things the corp is liable for, which makes you valuable and expendable in equal measure. You audit the machine from inside it, and the machine watches you watching.',
    },
    {
      id: 'enforcer',
      name: 'Enforcer',
      concept: 'Corporate security, wet work. The company\'s hidden hand. Violence with a budget.',
      hookTags: ['enforcer'],
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
      openingKnowledge: 'You know the math of corporate violence: distance to target, sight lines, exit routes, and the window between the shot and the response. You know which corpo security teams are professional and which ones panic, and you know the difference between a problem the board wants solved and one they want disappeared. You know that survival is not about being the strongest or the fastest; it is about being the one who decided, before walking into the room, exactly how it ends. The corp pays for outcomes, not methods.',
    },
    {
      id: 'executive',
      name: 'Executive',
      concept: 'Management, politics, the boardroom as battlefield. Power through procedure.',
      hookTags: ['networker', 'analyst'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Deception', 'Noble Etiquette'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 14, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'corporate_comm', name: 'Corporate Comm Suite', description: 'Encrypted, multi-channel, records everything. Company-issued.', quantity: 1 },
        { id: 'executive_credentials', name: 'Executive Credentials', description: 'Name badge, biometric clearance, expense account. Opens the right doors.', quantity: 1 },
        { id: 'derringer', name: 'Derringer', description: 'Two shots. Last resort. Fits in a suit pocket.', quantity: 1, damage: '1d6' },
        { id: 'stim_patches_ex', name: 'Premium Stims', description: 'Corporate-grade. Heals 1d8+2 HP, no side effects.', quantity: 1, effect: '1d8+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 3000,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Corporate Authority',
        description: 'Once per day, issue a directive that NPCs within your corporate hierarchy must obey or openly defy. Defiance has consequences for them. Compliance has consequences for you.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the boardroom the way a general knows a battlefield: who controls what, whose position is overextended, where the alliances are fragile enough to break with the right pressure. You know that every promotion is a transaction, every meeting is a negotiation, and every email is evidence. The corporate comm in your pocket records everything, which is a weapon and a leash. You know that the most dangerous person in the building is not the one with the biggest budget but the one who understands what the budget is really for.',
    },
  ],

  // ─── Unplugged: Rejects the merge ────────────────────────────────────
  'unplugged': [
    {
      id: 'deprogrammer',
      name: 'Deprogrammer',
      concept: 'Understands the tech intimately in order to reject it. Removes chrome, frees minds.',
      hookTags: ['technician', 'analyst'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Medicine', 'Electronics', 'Insight'],
      stats: { STR: 10, DEX: 12, CON: 14, INT: 17, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'extraction_kit', name: 'Chrome Extraction Kit', description: 'Surgical tools for safe implant removal. Precision work.', quantity: 1 },
        { id: 'neural_dampener', name: 'Neural Dampener', description: 'Blocks cyberware signals in a 10ft radius for 1 minute. 2 charges.', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'analog_scanner', name: 'Analog Scanner', description: 'Non-networked diagnostic tool. Reads implant status without connecting to it.', quantity: 1 },
        { id: 'stim_natural', name: 'Organic Stims', description: 'No synthetic compounds. Slower, cleaner. Heals 1d6 HP.', quantity: 2, effect: '1d6 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 800,
      startingHp: 9,
      startingAc: 12,
      hitDieAvg: 5,
      trait: {
        name: 'Shutdown',
        description: 'Once per day, touch a target and disable one piece of their cyberware for 1 minute (CON save DC 14 to resist). You know the systems well enough to turn them off.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know chrome at the molecular level because you have to. Rejecting the system without understanding it is ignorance, not conviction. The extraction kit in your bag has removed implants that the manufacturers said were permanent, and the neural dampener has given people their first clear thought in years. You know what cyberpsychosis looks like from the inside because you\'ve sat with people going through it, talking them back from the edge while their combat firmware tried to make them swing. You understand the technology better than most netrunners. The difference is what you do with the understanding.',
    },
    {
      id: 'purist',
      name: 'Purist',
      concept: 'Fights without chrome. Proves the body is enough in a world that says it isn\'t.',
      hookTags: ['enforcer'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Perception', 'Survival', 'Intimidation'],
      stats: { STR: 17, DEX: 14, CON: 15, INT: 10, WIS: 12, CHA: 10 },
      startingInventory: [
        { id: 'composite_bow', name: 'Composite Bow', description: 'No electronics, no tracking. Silent.', quantity: 1, damage: '1d8' },
        { id: 'fighting_staff', name: 'Fighting Staff', description: 'Hardened carbon fiber. No tech, all technique.', quantity: 1, damage: '1d8, versatile' },
        { id: 'body_armor_p', name: 'Composite Vest', description: 'Non-electronic armor plating. +2 AC. No scanner signature.', quantity: 1 },
        { id: 'natural_medkit', name: 'Natural Medkit', description: 'Herbs, sutures, splints. Heals 1d6+2 HP.', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 600,
      startingHp: 12,
      startingAc: 15,
      hitDieAvg: 6,
      trait: {
        name: 'Unaugmented',
        description: 'Immune to EMP, neural hacking, and cyberware-targeting attacks. Invisible to implant scanners. Once per day, gain advantage on any physical check where chrome users are at disadvantage (EMP zones, scanner fields, faraday rooms).',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what your body can do because you\'ve tested it against people who thought chrome made the difference. It doesn\'t. Chrome makes you faster, stronger, harder to kill. It also makes you dependent, predictable, and vulnerable to anything with an EMP. You train every day because the body is the only tool nobody can hack, nobody can repossess, and nobody can turn off remotely. The composite bow is silent in a world of smart-linked weapons. The fighting staff has no serial number. You are invisible to every scanner in the city, and in a world built on surveillance, invisibility is the most dangerous thing you can be.',
    },
    {
      id: 'voice',
      name: 'Voice',
      concept: 'Preacher, activist, community leader. The conviction made into a cause.',
      hookTags: ['networker'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Performance', 'Street Lore'],
      stats: { STR: 10, DEX: 12, CON: 14, INT: 12, WIS: 13, CHA: 17 },
      startingInventory: [
        { id: 'broadcast_rig', name: 'Broadcast Rig', description: 'Analog transmitter. Short range, untraceable. Your voice reaches people the net doesn\'t.', quantity: 1 },
        { id: 'holdout_pistol', name: 'Holdout Pistol', description: 'Small, hidden, for when the words don\'t work.', quantity: 1, damage: '1d4' },
        { id: 'community_ledger', name: 'Community Ledger', description: 'Names, needs, resources. The unaugmented network, on paper.', quantity: 1 },
        { id: 'medkit_v', name: 'Community Medkit', description: 'Shared supplies. Heals 1d6+CHA HP because belief helps.', quantity: 1, effect: '1d6+CHA HP', charges: 3, maxCharges: 3 },
      ],
      startingCredits: 500,
      startingHp: 9,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Rally',
        description: 'Once per day, give a speech or appeal that shifts the disposition of all non-hostile NPCs in earshot by one tier toward Favorable. The effect is genuine, not manipulative. It works because you believe it.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the sound of your own voice in a crowd and the moment when the crowd decides to listen. You know that conviction without community is martyrdom, and community without conviction is a gang. The broadcast rig on your back is analog because analog can\'t be remotely silenced, and the community ledger in your pocket is paper because paper can\'t be remotely deleted. You know every unaugmented family in four blocks. You know their names, their needs, and what they\'re afraid of. You know that the merge isn\'t inevitable, because you\'re standing here, unchipped, and people are still listening.',
    },
  ],
}

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
  playbooks: cyberpunkPlaybooks,
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
    toneOverride: `Adjust tone: Gritty (50%), Witty (30%), Epic (20%). The grandeur is in small victories — surviving the night, keeping your crew alive. Humor is gallows humor. Hope is rare.

**Heat system (genre heat).** Track how much institutional attention the player has drawn. Use update_heat with faction-specific heat levels. Factions: specific corps (named per campaign), NCPD/private security, gangs, netrunner collectives.

Tiers and consequences: "none" = clean, no one looking. "low" (flagged) = your name appeared in an automated report. Facial recognition flags you in corporate zones. "medium" (tracked) = active surveillance: drones, net monitoring, informants briefed. Your fixer warns you. "high" (targeted) = someone with authority has decided you are a problem. Specialists deployed, bounty posted, assets frozen. "critical" (burned) = corporate kill team, net bounty, scorched earth. Full institutional violence.

Heat rises from: failed stealth/hacking in corporate infrastructure, stealing or copying corporate data, killing corporate employees, being identified during a run, using trait abilities that create exposure (Clearance Override logs, Rally visibility, Deep Dive traces).

Heat falls from: time (1 tier per 2 quiet chapters), fixer intervention (trade favors/eddies to scrub records), sacrifice (destroy evidence, burn a contact, return stolen goods).

**Origin-specific heat behavior:**
- Corporate: Institutional cover below Tracked. The corp manages your exposure. Above Tracked, the corp disowns you and heat accelerates.
- Operative: No cover. Trade completed jobs through fixers to reduce heat.
- Fixer: Heat comes from your network. When your assets get burned, your heat rises. De-escalate by cutting loose compromised contacts.
- Ripperdoc: Heat from illegal mods and unlicensed procedures. Corp medical divisions track competition.
- Unplugged: Heat from ideological visibility. Protests, sabotage, public advocacy. The system tracks what you say, not just what you do.`,
    assetMechanic: `## TECH RIG MECHANIC (call update_ship)\n\nPersonal tech rig uses the ship system mechanically. Modules are levels 1-3:\n- Neurofence L2: auto-deflect first hack per scene. L3: counter-hack.\n- Spectra L2: advantage evading surveillance. L3: full cloak, once/chapter.\n- Redline L2: boost two checks per chapter. L3: no burnout risk.\n- Panoptik L2: detect threats through walls. L3: predict enemy actions.\n- Skinweave L2: corporate-grade ID forgery. L3: full biometric clone.\n\nRig combat options as quick actions. Integrity: -15 to -25 per incident. Below 30%: disadvantage on tech checks.\n\nIf ship is null, introduce rig narratively in next scene.`,
    traitRules: `## TRAIT RULES\n\n### Operative Playbooks\n- **Deep Dive (Netrunner):** Track cumulative uses. After 3 without rest chapter, GM introduces cyberpsychosis episode.\n- **Adrenaline Overclocked (Razorback):** Bonus attack, but chrome stress accumulates. GM tracks. Humanity cost: at threshold (3 uses per chapter without rest), involuntary aggression — WIS save to resist violent impulse in social scenes.\n- **Zero Trace (Ghost):** One scan, camera network, or access log erased per chapter. The absence can be noticed — a gap in a log is suspicious. After 3 uses per chapter, Insight checks against human emotion at disadvantage.\n\n### Fixer Playbooks\n- **Pattern Recognition (Analyst):** Requires at least one scene of observation before use. The vulnerability or connection revealed is real but may be dangerous to act on. The target may notice they\'re being studied.\n- **Hidden Cargo (Fence):** The item must be plausible — something the fence could have acquired and concealed. GM may impose a cost or complication for particularly valuable items.\n- **Marker Called (Dealmaker):** Contact unavailable until next chapter after being called in. Tab accumulates — after three unreturned markers, next contact demands something first.\n\n### Ripperdoc Playbooks\n- **Jury-Rig (Engineer):** Temporary modification lasts until chapter end. Side effects are guaranteed — the GM determines severity. Modifying the same implant twice compounds the risk.\n- **Field Triage (Surgeon):** Heal with a side effect (pain, dependency, temporary sense loss). Side effects worse on heavily chromed patients. After 3 uses per chapter without a personal connection scene, bedside manner degrades.\n- **Seen Worse (Street Doc):** Automatic success on death saves means the patient survives, but the Street Doc absorbs the psychological cost. After each use, next social interaction starts one disposition tier lower — you carry death on your face.\n\n### Corporate Playbooks\n- **Clearance Override (Auditor):** Only works within corporate infrastructure. Using it creates a log entry. Overusing it draws internal investigation. Outside corp space, it\'s a badge nobody respects.\n- **Dead Man Walking (Enforcer):** One attack fully negated per day. The attack still happened — describe the moment of absorbing it. Repeated use erodes the sense that damage matters.\n- **Corporate Authority (Executive):** Directive must be actionable. NPCs who comply resent it. NPCs who defy it face institutional consequences, but defiance signals that the executive\'s authority has limits.\n\n### Unplugged Playbooks\n- **Shutdown (Deprogrammer):** Touch range only. Disabling cyberware in combat is aggressive — bystanders notice. Repeated use on the same target has diminishing returns as they adapt.\n- **Unaugmented (Purist):** Passive immunity to electronic warfare is permanent. The daily advantage in EMP/scanner zones reflects training, not technology. The cost: you\'re always slower than the chromed-up in fair conditions.\n- **Rally (Voice):** Shifts disposition by one tier toward Favorable. Only works on non-hostile NPCs. The effect is genuine, which means it can be betrayed — NPCs who rally and are let down become Hostile.`,
    consumableLabel: 'Stim injectors, EMP charges, ICE breakers, ammo',
    tutorialContext: 'The opening chapter introduces the neighborhood, one contact (fixer or ripperdoc), and a street-level job. First check: social or stealth. First combat: gang or corporate security. By mid-chapter 1, introduce heat organically: a camera that noticed, a name in a report, a fixer who mentions someone is asking questions. Heat should feel ambient before it becomes mechanical.',
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
  heatLabel: 'Heat',
  openingHooks: [
    // Universal
    { hook: 'The crew wakes up in a med-bay with a gap in their memory logs and someone else\'s coordinates loaded into their neural buffer. No explanation. No sender. Just a location and a time.', title: 'Memory Gap', frame: { objective: 'Find out what happened during the memory gap', crucible: 'Someone rewrote your logs and left breadcrumbs they want you to follow' }, arc: { name: 'The Memory Gap', episode: 'Investigate the coordinates and recover any trace of the lost hours' } },
    { hook: 'A rival crew is dead. Not flatlined in a firefight — found in their safehouse with their chrome ripped out, every implant surgically removed. Their ripperdoc says they were alive when it started. The chrome is gone, the crew\'s fixer is missing, and someone left the safehouse door open. Like an invitation.', title: 'Stripped', frame: { objective: 'Find the fixer and learn why the crew was harvested', crucible: 'Someone stripped living people of their chrome, and the open door suggests you\'re being tested' }, arc: { name: 'The Stripped Crew', episode: 'Search the safehouse and track down the missing fixer' } },
    { hook: 'The city goes dark. Not a power failure — a targeted blackout in a six-block radius. In the silence, a voice on every local channel says a name. It\'s the player\'s.', title: 'Blackout', frame: { objective: 'Find who broadcast your name and why', crucible: 'Someone with the power to black out six blocks wants your attention' }, arc: { name: 'The Blackout Signal', episode: 'Survive the blackout zone and trace the broadcast source' } },
    { hook: 'You remember growing up in the ward. The apartment, the stairwell, the woman who lived next door. Fifteen years of detailed, emotional memory. Then a neural scan for a routine chrome install flags something: the timestamps on those memories predate your implant installation by three years. They\'re not yours. Someone gave you a childhood that never happened, and they did it well enough that you lived inside it for a decade without questioning a single detail. The ripperdoc is staring at the scan results. She says she\'s seen implanted memories before. She\'s never seen ones this good.', title: 'Implanted', frame: { objective: 'Find out who built your false memories and why', crucible: 'Everything you thought was yours might be manufactured, and whoever did it had a reason' }, arc: { name: 'The Implanted Past', episode: 'Trace the memory implant\'s technical signature and identify who has the skill to build it' } },
    // Ghost (Operative) — infiltrator/social engineer, Zero Trace trait, DEX primary
    { hook: 'The job was supposed to be clean: grab the data chip, ghost out. You got the chip. But when you jacked in to verify the contents, you saw footage of a corpo black site — test subjects, neural implants, people who don\'t appear in any database. The chip auto-transmitted your location when you accessed it. Corpo security is forty floors below you, coming up. The footage is still playing behind your eyes. You can wipe the chip and run clean, or keep the evidence and run dirty.', title: 'Forty Floors Up', classes: ['Ghost'], frame: { objective: 'Escape the building and decide what happens to the footage', crucible: 'Clean escape means destroying evidence of something monstrous; keeping it means they never stop hunting you' }, arc: { name: 'The Black Site Footage', episode: 'Escape the building and decide whether to keep, sell, or publish the evidence' } },
    { hook: 'A corpo exec offers triple rate to break into her own company\'s server room. She says it\'s a security audit. The floor plan she gave you has rooms that don\'t appear on any public blueprint.', title: 'Hidden Rooms', classes: ['Ghost'], frame: { objective: 'Infiltrate the server room and find the hidden rooms', crucible: 'The exec is paying you to find something she can\'t access in her own building' }, arc: { name: 'The Hidden Floor', episode: 'Penetrate the server room and discover what the hidden rooms contain' } },
    { hook: 'Your optical camo malfunctioned during last night\'s run and recorded everything you saw instead of masking your presence. That recording is now somewhere on the net, and it contains faces that powerful people want kept hidden. Your stealth tool became a liability. Three fixers have already called asking what you\'ll take for the footage.', title: 'Recorded', classes: ['Ghost'], frame: { objective: 'Recover the footage before the wrong people do', crucible: 'Powerful faces on leaked footage, fixers circling, and your name is attached' }, arc: { name: 'The Recorded Run', episode: 'Track where the footage ended up and assess who\'s already seen it' } },
    // Razorback (Operative) — chrome street samurai, Adrenaline Overclocked trait, STR primary
    { hook: 'You blacked out during a job last night. When you came to, there were three bodies and your mantis blades were deployed. Your crew says you moved like something else was driving — faster than you\'ve ever been, no hesitation, no recognition when they called your name. The chrome in your arms has been running hot since. A ripperdoc says the combat firmware updated itself overnight from a source she can\'t trace. Something is in your chrome, and it\'s better at killing than you are.', title: 'Combat Firmware', classes: ['Razorback'], frame: { objective: 'Find the source of the firmware update before it triggers again', crucible: 'Something in your chrome fought better than you can, and it didn\'t care who was in the room' }, arc: { name: 'The Firmware', episode: 'Get the firmware analyzed and trace who pushed the update' } },
    { hook: 'A street doc patches you up after a firefight and mentions, casually, that the chrome in your arm isn\'t factory. Someone modified your cyberware while you were under, and she can\'t tell what it does.', title: 'Modified Chrome', classes: ['Razorback'], frame: { objective: 'Find out what the modification does', crucible: 'Unknown code in your arm, put there when you were unconscious — by someone with access' }, arc: { name: 'Modified Chrome', episode: 'Get the modification analyzed and trace who had access during surgery' } },
    { hook: 'A street doc who patches up your crew for free is being squeezed by a gang moving into the block. They want her clinic for a braindance lab. She can\'t pay protection, can\'t relocate, and the gang is done talking. She asks you to handle it. The problem: the gang leader has military-grade chrome — full-body conversion, barely human anymore. He used to be someone you knew. The doc says he came to her last month asking for help. She couldn\'t reverse what was done to him. Now he\'s the one at her door.', title: 'The Clinic', classes: ['Razorback'], frame: { objective: 'Stop the gang from taking the clinic', crucible: 'A chrome-consumed friend who can\'t be reasoned with, and a doctor who tried to save him first' }, arc: { name: 'The Clinic', episode: 'Confront the gang leader and learn what was done to him' } },
    // Netrunner (Operative) — hacker/remote operator, Deep Dive trait, INT primary
    { hook: 'Last night something used your rig to upload data to three separate corp subnets. You don\'t remember doing it. Your activity log shows eleven minutes of outbound traffic, encrypted with keys you don\'t have. The data is already circulating. Two corps have flagged your handle. The third hasn\'t responded yet, which is worse. Whatever was sent, it came from your hardware, using your credentials, while you were asleep in the chair. The ripperdoc who checked your chrome says nothing was remote-triggered. Your hands did it.', title: 'Eleven Minutes', frame: { objective: 'Recover what was uploaded and find out who or what used your hands', crucible: 'Your body acted without you, three corps have your handle, and the upload is already loose in the net' }, arc: { name: 'The Eleven Minutes', episode: 'Reconstruct the upload from rig logs and trace what triggered the eleven-minute session' } },
    { hook: 'A dead netrunner\'s deck shows up at a pawn shop with your handle scratched into the casing. Inside: an unfinished run against a corp subnet, paused mid-execution. The daemon is still live, waiting for someone to finish what they started.', title: 'Unfinished Run', classes: ['Netrunner'], frame: { objective: 'Decide whether to finish the dead netrunner\'s run', crucible: 'A live daemon in a corp subnet with your handle on the hardware — someone wanted you to find this' }, arc: { name: 'The Unfinished Run', episode: 'Analyze the paused daemon and learn what the dead netrunner was after' } },
    { hook: 'You found something in the net that found you back. Not ICE, not a daemon — a consciousness. It\'s living in decommissioned infrastructure and thinks you\'re the first real person to visit in years. It won\'t let you log out until you do something for it. Your deck is burning through battery and your body is getting cold in the chair.', title: 'Someone Home', classes: ['Netrunner'], frame: { objective: 'Negotiate your way out of the net alive', crucible: 'A digital consciousness holding you hostage with a request, and your body is cooling' }, arc: { name: 'Someone Home', episode: 'Survive the first encounter and understand what the consciousness wants' } },
    // Dealmaker (Fixer) — negotiation/alliance, Marker Called trait, CHA primary
    { hook: 'Three weeks of flatline work, scraping by on small jobs. Then an unsigned braindance clip arrives. Inside: surveillance footage of you meeting a client who was found dead the next morning. Someone is building a case — or leverage.', title: 'Leverage', classes: ['Dealmaker'], frame: { objective: 'Find who sent the clip and what they want', crucible: 'Someone has footage connecting you to a dead client, and silence means they control the narrative' }, arc: { name: 'The Leverage Play', episode: 'Trace the braindance clip\'s origin and identify who\'s building the case' } },
    { hook: 'Your most reliable contact calls in a panic: someone is burning their network from the inside. Three brokers dead in two days, all connected to the same job — a job you brokered six months ago and thought was finished.', title: 'Burning Network', classes: ['Dealmaker'], frame: { objective: 'Find the source burning the network before it reaches you', crucible: 'Three dead brokers, a job that should be closed, and you\'re connected to all of them' }, arc: { name: 'The Burning Network', episode: 'Identify the common thread between the dead brokers and the old job' } },
    { hook: 'A corpo middleman offers you a name — someone high up who wants to defect. All you have to do is arrange safe passage. The catch: two other brokers got the same offer this week. Neither of them made it home.', title: 'Safe Passage', classes: ['Dealmaker'], frame: { objective: 'Vet the defector offer without ending up like the other brokers', crucible: 'A lucrative job that killed two professionals already, and you\'re broker number three' }, arc: { name: 'Safe Passage', episode: 'Investigate why the previous brokers died and verify the defector is real' } },
    // Surgeon (Ripperdoc) — precision/trauma response, Field Triage trait, WIS primary
    { hook: 'A fixer sends a rush job over encrypted comm: extract a ripperdoc from a Maelstrom hideout before morning. Payment: enough for a month\'s rent and a new piece of chrome. Timeline: four hours. When you get there, the ripperdoc says she\'s not a hostage.', title: 'Not a Hostage', classes: ['Surgeon'], frame: { objective: 'Get the ripperdoc out or learn why she\'s staying', crucible: 'The extraction target doesn\'t want to leave, and the fixer expects a delivery' }, arc: { name: 'Not a Hostage', episode: 'Assess the ripperdoc\'s situation and decide whose side you\'re on' } },
    { hook: 'A patient walks into your clinic with military-grade chrome that no street doc installed. They don\'t know where it came from. They don\'t remember the surgery. And the serial numbers on the implants belong to a soldier who died two years ago.', title: 'Dead Man\'s Chrome', classes: ['Surgeon'], frame: { objective: 'Identify who installed the military chrome and why', crucible: 'Dead soldier\'s implants in a living patient with no memory of the surgery' }, arc: { name: 'Dead Man\'s Chrome', episode: 'Trace the implant serial numbers and reconstruct the patient\'s missing time' } },
    { hook: 'A patient you saved last month comes back — different. The cyberware you installed is behaving autonomously, making decisions the patient didn\'t authorize. Two more former patients report the same thing. The chrome you\'ve been installing isn\'t factory standard. Someone in your supply chain has been slipping modified implants into your inventory, and you don\'t know how far back it goes.', title: 'Bad Chrome', classes: ['Surgeon'], frame: { objective: 'Find the compromised supplier in your chain', crucible: 'Your patients are being controlled through chrome you installed with your own hands' }, arc: { name: 'Bad Chrome', episode: 'Audit your supply chain and identify which implants are compromised' } },
    // Enforcer (Corporate) — corporate security/wet work, Dead Man Walking trait, CON primary
    { hook: 'The target is dead. Clean job, clean exit. Then the client sends a second payment — double the original — with a note: "Wrong person. Real target attached. Finish it." The photo is someone you know.', title: 'Wrong Person', classes: ['Enforcer'], frame: { objective: 'Decide what to do about the real target', crucible: 'The client doubled the money and the new target has a face you recognize' }, arc: { name: 'Wrong Person', episode: 'Learn why the client switched targets and what connects the two marks' } },
    { hook: 'You wake up in a motel room you don\'t recognize with a bullet wound you don\'t remember getting. Your gun has been fired. The news is running a story about a corpo exec found dead downtown. Your face isn\'t on camera. Yet.', title: 'Missing Hours', classes: ['Enforcer'], frame: { objective: 'Reconstruct the missing hours before someone else does', crucible: 'A bullet wound, a fired gun, a dead exec, and a memory gap that matches the timeline' }, arc: { name: 'The Missing Hours', episode: 'Piece together where you were and whether you pulled the trigger' } },
    { hook: 'A contract comes in through the usual channels: eliminate a solo operator who\'s been hitting corp targets across the city. Efficient, methodical, no witnesses. You read the dossier twice before you realize — the operational profile is yours.', title: 'Your Profile', classes: ['Enforcer'], frame: { objective: 'Find the operator using your profile before the client realizes', crucible: 'Someone is working your pattern, and the contract on their head is now pointed at you' }, arc: { name: 'Your Profile', episode: 'Investigate the copycat\'s most recent hit and separate their work from yours' } },

    // ── Origin-Specific Hooks (2 per origin) ────────────────────────────

    // Operative — the gig economy eats its own
    { hook: 'Three jobs in a week, all from different fixers, all targeting the same building. Different floors, different objectives, different clients. Someone is running parallel operations against a single target and using you as one of the vectors. The other operatives don\'t know about each other. You found out because your fixer drinks too much and said the quiet part loud: "You\'re not the only crew going in Tuesday."', title: 'Parallel Operations', origins: ['operative'], frame: { objective: 'Figure out who\'s coordinating the parallel runs and whether you\'re the crew that comes back', crucible: 'Multiple crews, one building, one night — and someone decided which crew is expendable' }, arc: { name: 'Parallel Operations', episode: 'Map the other crews and determine whether your job is the real one or the diversion' } },
    { hook: 'A client pays you double to walk away from a job mid-run. No explanation. Just: "Leave the building. Don\'t finish. Don\'t ask." The money is already in your account. The job was extracting a researcher from a Kang Tao lab. The researcher is still inside. Your fixer says the cancellation didn\'t come from the original client.', title: 'The Cancellation', origins: ['operative'], frame: { objective: 'Decide whether to walk away with double pay or finish what you started', crucible: 'Someone paid more to stop you than the original client paid to send you — and the researcher is still inside' }, arc: { name: 'The Cancellation', episode: 'Investigate who cancelled the job and what happens to the researcher if you walk' } },

    // Fixer — the network turns on itself
    { hook: 'A client you\'ve never met sends a dossier on you. Not a threat — a job application. They want to hire you to broker your own extraction from the city. They claim someone has put a contract on every fixer who handled a specific shipment last quarter. You handled that shipment. The dossier includes the names of three fixers who didn\'t get warned in time. You recognize all three from the obituaries.', title: 'Your Own Extraction', origins: ['fixer'], startingCounters: { exposure: 1 }, frame: { objective: 'Verify the threat and decide whether to run or fight', crucible: 'Three dead fixers, a shared shipment, and an anonymous client who knows your schedule' }, arc: { name: 'The Fixer Purge', episode: 'Verify the kill list and identify the shipment that triggered it' } },
    { hook: 'Two of your clients are about to go to war with each other. You brokered jobs for both of them this month. If either side finds out you\'re connected to the other, your network collapses. A third party approaches you with an offer: broker a peace, take a cut from both sides, and become the most connected fixer in the district. The catch: the third party is the one who started the war.', title: 'The Peacemaker', origins: ['fixer'], frame: { objective: 'Broker the peace without exposing your connections to either side', crucible: 'The person offering peace is the one who started the war, and they want you in the middle' }, arc: { name: 'The Manufactured War', episode: 'Meet both clients separately and map the conflict before choosing a side' } },

    // Ripperdoc — the cost of maintaining the merge
    { hook: 'A teenager walks into your clinic asking for a full combat suite. Neural link, reflex boosters, subdermal armor. She has the eddies — more than you\'ve seen from any street client. She says she needs it by tomorrow. She won\'t say why. The chrome she\'s asking for will change her permanently, and the combination she wants is the exact loadout of a Militech field operative. She\'s fourteen.', title: 'The Fourteen-Year-Old', origins: ['ripperdoc'], frame: { objective: 'Decide whether to install the combat chrome and find out why she needs it', crucible: 'A child with too much money asking for military chrome, and installing it might save her life or end it' }, arc: { name: 'Chrome for a Child', episode: 'Investigate where the eddies came from and what happens tomorrow' } },
    { hook: 'A corpo executive comes to your clinic after hours, alone, no security detail. She wants you to remove all of her cyberware. Everything. Neural link, optical overlay, subdermal ID. She says she needs to disappear, and chromed people can\'t disappear. She offers ten times your rate. The problem: total chrome extraction has a 30% mortality rate, and the chrome she\'s carrying has corporate kill-switches. If you remove it wrong, it kills her. If you don\'t remove it, someone else will kill her.', title: 'Total Extraction', origins: ['ripperdoc'], frame: { objective: 'Extract the chrome without triggering the kill-switches', crucible: 'A corpo who needs to become invisible, lethal hardware, and a mortality rate that makes the math personal' }, arc: { name: 'Total Extraction', episode: 'Assess the kill-switch mechanisms and decide whether the extraction is survivable' } },

    // Corporate — complicity has a view from the top
    { hook: 'Your quarterly review includes a section you\'ve never seen before: "Project Nightshade — Phase 2 Staffing." You\'re listed as a participant. There is no Phase 1 in any system you can access. When you search the project name, your clearance flags trigger an automated response: "Access confirmed. Report to sublevel 4, 0600." You\'ve never been to sublevel 4. You didn\'t know there was a sublevel 4.', title: 'Sublevel 4', origins: ['corporate'], startingCounters: { complicity: 1 }, frame: { objective: 'Report to sublevel 4 and learn what Project Nightshade is', crucible: 'The corp enrolled you in something that doesn\'t officially exist, and refusing to show up is its own kind of answer' }, arc: { name: 'Project Nightshade', episode: 'Enter sublevel 4 and assess what the corporation expects from you' } },
    { hook: 'A colleague you trust sends you a file with no subject line. Inside: proof that your department\'s latest product — a neural wellness implant marketed to schools — has a side effect the trials identified and the board buried. The implant works as advertised. It also maps the developing neural architecture of every child who wears it, and that data is being sold to Militech\'s weapons division. Your colleague asks one question: "What do we do?" Your name is on the product approval chain.', title: 'The Wellness Implant', origins: ['corporate'], frame: { objective: 'Decide what to do with the proof before the board finds out you have it', crucible: 'Your name on a product that works and also weaponizes children\'s neural data, and a colleague who trusts you to do the right thing' }, arc: { name: 'The Product Recall', episode: 'Verify the data and assess your options before the board learns you know' } },

    // Unplugged — conviction in a world that punishes it
    { hook: 'A chrome addict you deprogrammed six months ago walks back into your community center. She\'s clean, she\'s stable, she\'s terrified. Her former employer tracked her through residual neural signatures — traces left by removed implants that most ripperdocs don\'t know to scrub. They want her back. Not for revenge; for the proprietary firmware still encoded in her nervous system. She\'s worth more disassembled than employed. Your community is the only place she isn\'t broadcasting a signal.', title: 'Residual Traces', origins: ['unplugged'], frame: { objective: 'Protect the former addict and deal with the residual neural signatures', crucible: 'A woman who got clean is still broadcasting her location through traces in her nervous system, and her old employer considers her hardware' }, arc: { name: 'The Residual Signal', episode: 'Find a way to scrub the neural traces before the employer closes in' } },
    { hook: 'The unaugmented community you serve is growing. Forty families, a school, a clinic, a comm network that runs on analog. Then a corp offers the community free chrome: basic implants, neural links, optical overlays, all provided at no cost. "A pilot program for underserved neighborhoods." Half the community wants to accept. The other half sees the trap. The corp rep is smooth, patient, and has answers for every objection. You\'ve seen this before. Free chrome is never free. But the families who want it have children who can\'t compete in a chromed world without it.', title: 'The Pilot Program', origins: ['unplugged'], frame: { objective: 'Unite the community on a response before the corp deadline', crucible: 'Free chrome for families who need it, from a corp that never gives anything free, and you\'re the voice they trust' }, arc: { name: 'The Free Chrome', episode: 'Investigate the pilot program\'s real terms and rally the community before the deadline' } },

    // ── Archetype-Tagged Hooks (cross-origin, match via hookTags) ────────

    // infiltrator — Ghost, Analyst, Fence, Auditor, Deprogrammer
    { hook: 'A data courier was flatlined mid-delivery. The package — a physical drive, old-school — is still in the dead drop. The problem: three parties know the drop location, and all three are sending teams tonight. The drive\'s contents are encrypted, but the courier\'s last message to your fixer said two words: "It\'s alive." You have a six-hour head start. The drop is in a decommissioned water treatment plant in the undercity, and the security system was last updated when people still used passwords.', title: 'The Dead Drop', classes: ['infiltrator'], frame: { objective: 'Retrieve the drive before the other teams arrive', crucible: 'Three teams converging on one location, a dead courier, and a drive that might contain something more than data' }, arc: { name: 'The Live Package', episode: 'Reach the dead drop and assess the competition before committing to extraction' } },
    { hook: 'Someone hacked into a corp\'s internal security feeds and is broadcasting them on public channels. Not the lobby cameras — the executive floor. Board meetings, private conversations, security briefings, all streaming live to anyone with a receiver. The broadcast has been running for three hours. The corp can\'t stop it because the hack isn\'t coming from outside; it\'s coming from inside their own ICE. And buried in the stream, every forty minutes, a single frame appears with coordinates and a timestamp. Tomorrow. Noon.', title: 'The Broadcast', classes: ['infiltrator'], frame: { objective: 'Decode the hidden message in the broadcast before the corp traces its origin', crucible: 'Someone turned a corp\'s own security against it, and they\'re using the broadcast to send you a message' }, arc: { name: 'The Inside Broadcast', episode: 'Record the hidden frames and determine what the coordinates point to' } },

    // enforcer — Razorback, Fence, Enforcer, Purist
    { hook: 'The crew takes a standard protection job: escort a convoy through gang territory. Three vehicles, six blocks, twenty minutes. Halfway through, the lead vehicle stops. The driver gets out, opens the cargo doors, and starts unloading crates onto the street. Inside: people. Sedated, chrome-stripped, zip-tied. The driver says this is the real delivery. The gangs aren\'t attacking the convoy; they\'re the buyers. Your contract says "escort." It doesn\'t say what.', title: 'The Convoy', classes: ['enforcer'], frame: { objective: 'Decide what to do with the human cargo before the buyers arrive', crucible: 'Your protection job is a slave delivery, and the buyers are six blocks away' }, arc: { name: 'The Cargo', episode: 'Confront the driver and assess options before the gang arrives' } },
    { hook: 'A fight pit in the lower levels runs chrome-free bouts: unaugmented fighters only, no implants, natural body. The crowd is massive and the money is real. The pit boss offers you a deal: fight three rounds, and she\'ll give you the name of the person who burned your safehouse last week. The fighters she puts you against are ex-military, all Unplugged by choice, all better trained than anyone you\'ve fought. The pit has one rule: no killing. The crowd doesn\'t enforce it.', title: 'The Pit', classes: ['enforcer'], frame: { objective: 'Win three fights to get the name, or find another way to extract it', crucible: 'Three ex-military fighters, a crowd that loves blood, and a name you need behind the only door that matters' }, arc: { name: 'The Chrome-Free Pit', episode: 'Assess the first opponent and decide whether fighting is the only path to the name' } },

    // networker — Ghost, Dealmaker, Surgeon, Street Doc, Executive, Voice
    { hook: 'A gang leader, a corporate VP, and an NCPD lieutenant walk into the same bar on the same night. None of them know the others are coming. Your fixer booked all three meetings. They each want something only one of the other two can provide, and they each think they\'re the only meeting tonight. Your fixer is nowhere to be found. The bartender slides you a note: "Make it work. Keep the peace. You get 10% of whatever flows."', title: 'Three Meetings', classes: ['networker'], frame: { objective: 'Manage three simultaneous negotiations without any party discovering the others', crucible: 'Three powerful people in one bar, each with leverage on the others, and you\'re the only one who sees the full picture' }, arc: { name: 'The Triangle', episode: 'Open the first meeting and assess what each party wants before they discover each other' } },
    { hook: 'An old contact resurfaces after two years of silence. She says she\'s built something: a cooperative, off-grid, unaugmented, self-sustaining. Fifty people living outside the system. She needs one thing to make it permanent — a legitimate water rights contract, signed by someone with corporate authority. She can\'t get it without exposing the community to the system she built it to escape. She\'s asking you because you\'re the only person she trusts who still has connections on both sides.', title: 'Water Rights', classes: ['networker'], frame: { objective: 'Secure the water rights without exposing the cooperative to corporate attention', crucible: 'A community that exists by being invisible needs one piece of paper from the system it hides from' }, arc: { name: 'The Cooperative', episode: 'Visit the cooperative and assess what exposure the water rights process would create' } },

    // technician — Engineer, Surgeon, Street Doc, Deprogrammer
    { hook: 'A ripperdoc collective sends out an emergency signal: a new street drug called "Mirror" is hitting the lower levels. It doesn\'t get you high — it temporarily disables all cyberware in the user\'s body. Forty minutes of being human again. Chromed-up addicts are lining up for it. The problem: Mirror doesn\'t cleanly disengage the implants. It forces a hard shutdown. One in ten users flatlines when the chrome reboots. Three ripperdocs have been working around the clock on the overdoses. They need someone who understands the interaction between the drug and the firmware, because the next batch is hitting the streets tonight.', title: 'Mirror', classes: ['technician'], frame: { objective: 'Analyze the drug-firmware interaction before the next wave of overdoses', crucible: 'A drug that gives people their humanity back is killing them when the chrome wakes up' }, arc: { name: 'The Mirror Drug', episode: 'Get a sample and analyze how Mirror interacts with standard cyberware firmware' } },
    { hook: 'Your supplier delivers a crate of neural bridges — standard stock, nothing unusual. Except one unit at the bottom is different. The casing is identical, but the internals are military-spec, and there\'s a serial number that doesn\'t match any manufacturer you know. When you scan it, your diagnostic tools crash. Every one of them. The neural bridge reboots your scanner with a message: "Install me in someone you trust. I need to talk."', title: 'The Bridge', classes: ['technician'], frame: { objective: 'Decide what to do with a neural bridge that talks', crucible: 'Military hardware disguised as stock, hidden in your supply chain, with a message and an agenda' }, arc: { name: 'The Talking Bridge', episode: 'Analyze the bridge\'s hardware without installing it and determine what — or who — is inside' } },

    // analyst — Analyst, Engineer, Auditor, Executive, Deprogrammer
    { hook: 'Three unrelated events in one week: a ripperdoc murdered in her clinic, a fixer\'s encrypted archive leaked to the net, and a corporate whistleblower found dead in a hotel room registered under your name. The hotel room was booked six weeks ago. Six weeks ago, you were running a data audit for a client who paid in untraceable eddies. You never saw the results. Someone is using the audit as a weapon, and your name is on every piece of evidence they\'re planting.', title: 'Audit Trail', classes: ['analyst'], frame: { objective: 'Trace the pattern connecting the three events before your name becomes the answer', crucible: 'A dead ripperdoc, a leaked archive, a dead whistleblower in a room booked under your name — all connected to a job you did six weeks ago' }, arc: { name: 'The Planted Audit', episode: 'Reconstruct the original data audit and identify what you found that someone is killing to protect' } },
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
