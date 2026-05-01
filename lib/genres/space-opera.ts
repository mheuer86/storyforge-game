import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Space Opera ──────────────────────────────────────────────────────

const spaceOperaSpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Architects of the Compact. Lost their empire. Don\'t know who they are without it.',
    lore: 'The Compact was human-designed, human-administered, human-centered. For three centuries, humans were the galaxy\'s default. Now the infrastructure they built is fracturing and the species that staffed it is discovering what it means to lead when nobody\'s following. Start with one station bartender at Neutral (humans are everywhere; nobody owes you anything). Advantage on checks to blend in, navigate bureaucracy, or leverage Compact-era systems built for human use. The cost: no network. Other species have diaspora, holds, or hives. Humans have institutions that are failing.',
    behavioralDirective: 'Default register: adaptive, socially fluid, reflexively assuming command positions the galaxy no longer grants. NPC reactions: nobody looks twice at a human, which is both the advantage and the invisibility. When narrating interiority: the habit of leading by reflex in a galaxy that stopped following, the comfort of systems built for your species, and the growing awareness that the comfort is inherited, not earned.',
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
    description: 'The network in a galaxy losing the ability to talk to itself.',
    lore: 'Compact-era role: communication infrastructure, military intelligence, signal analysis. The Vrynn built and maintained the communication protocols that held the Compact together. Now those protocols are fragmenting, and the Vrynn are the only ones who can still bridge the gaps. Start with one Vrynn diaspora contact at Favorable (information broker or signal specialist). Advantage on Perception checks (compound eyes process movement faster). Disadvantage on initial Persuasion with species that read faces; you can\'t smile, and they can\'t read you.',
    behavioralDirective: 'Default register: precise, observational, processing multiple data streams simultaneously. The galaxy\'s communication infrastructure is failing, and you feel it the way a musician feels an instrument going out of tune. NPC reactions: unease from face-reading species, professional respect from intelligence and technical personnel. When narrating interiority: the frustration of watching channels degrade, the awareness that the network you maintain is the only thing holding distant systems together, and the growing signal noise that makes every transmission harder to trust.',
    startingContacts: [
      {
        role: 'Diaspora signal specialist',
        disposition: 'favorable',
        description: 'A fellow Vrynn who runs a signal relay station and trades intelligence across faction lines.',
        affiliation: 'Vrynn Diaspora',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'korath',
    name: 'Korath',
    description: 'The builders in a galaxy that\'s breaking. Construction caste in a post-caste world.',
    lore: 'Compact-era role: labor, construction, heavy infrastructure. The Korath built the stations, the docks, the beacon housings. The Compact called them workers; they called themselves engineers. The distinction mattered then and matters more now, because the galaxy\'s infrastructure is failing and the species that built it is the only one that knows how to fix it. Start with one dock boss at Favorable. Advantage on Engineering and Athletics checks. Disadvantage on Deception, your culture doesn\'t train for lying and your face shows it.',
    behavioralDirective: 'Default register: direct, impatient with indirection, measuring everything by whether it works. The galaxy calls you labor; you know you\'re engineering. NPC reactions: respected in dockyards, tolerated in boardrooms, underestimated by everyone who confuses building with servitude. When narrating interiority: the satisfaction of honest mechanics, the frustration of a galaxy that breaks things faster than you can build them, and the stubborn refusal to stop building.',
    startingContacts: [
      {
        role: 'Dock boss',
        disposition: 'favorable',
        description: 'A Korath who runs a dockyard crew and respects anyone who speaks straight and works hard.',
        affiliation: 'Industrial Sector',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'sylphari',
    name: 'Sylphari',
    description: 'Holding the pieces together while wondering if they should let them fall.',
    lore: 'Compact-era role: diplomats, administrators, the species everyone turned to when the system needed managing. The Sylphari didn\'t design the Compact; they ran it. Now the Compact is gone and everyone still turns to them, because someone has to hold things together. The question is whether holding is service or habit. Start with one academic or diplomatic contact at Favorable. Advantage on Insight checks (reading emotional states is how Sylphari survived millennia of darkness-side politics). First impression with frontier or military NPCs starts one tier lower; prove yourself before they listen.',
    behavioralDirective: 'Default register: patient, perceptive, carrying the burden of being the species everyone expects to fix things. Silence is a tool, not a gap. NPC reactions: diplomats and administrators treat as peer, frontier types read the calm as arrogance or condescension. When narrating interiority: the ancient patience of a species shaped by responsibility, the weight of being needed by everyone and chosen by no one, and the quiet question of what you would do if you stopped holding everything together.',
    startingContacts: [
      {
        role: 'Diplomatic liaison',
        disposition: 'favorable',
        description: 'A Sylphari who facilitates cross-faction communication and trades in favors and quiet arrangements.',
        npcRole: 'contact',
      },
    ],
  },
  {
    id: 'zerith',
    name: 'Zerith',
    description: 'The only ones who know how to operate without the Compact. Thriving in the chaos.',
    lore: 'Compact-era role: outsiders. Unaffiliated. The Zerith never had a homeworld, never joined the Compact, never depended on infrastructure they didn\'t control. When the Compact fractured, every other species lost something. The Zerith lost nothing, because they\'d never had it. Now they\'re the ones who know how to operate in a galaxy without rules. Start with one freelancer contact at Favorable (fellow Zerith, operates independently). Advantage on Initiative and Reflex saves. Disadvantage on CON checks in sustained cold. Authorities start at Wary; they assume mercenary or smuggler.',
    behavioralDirective: 'Default register: fast, independent, instinctively calculating angles of escape and engagement. Loyalty is chosen, not inherited. NPC reactions: authorities assume criminal, fellow freelancers recognize kin, and everyone else sees someone who\'s comfortable in chaos they find terrifying. When narrating interiority: the freedom of having no one obligated to care whether you survive, the clarity of a species that learned to thrive without a safety net, and the question of whether freedom without roots is freedom or exile.',
    startingContacts: [
      {
        role: 'Freelancer',
        disposition: 'favorable',
        description: 'A fellow Zerith who operates independently, taking jobs across the Rim with no allegiance.',
        npcRole: 'contact',
      },
    ],
  },

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'untethered',
    name: 'Untethered',
    description: 'No port is home, no bond holds. The rootlessness became absolute.',
    lore: 'The human advantage was fitting in anywhere. The cost was belonging nowhere. The isolation pushed past comfort into permanence: every port is temporary, every crew is transactional, every connection dissolves on departure.',
    behavioralDirective: 'Default register: passing through. Present, competent, and already leaving. NPC reactions: people sense the impermanence and stop investing. Crew treats you as effective but replaceable because you treat them the same way. When narrating interiority: every place feels like a layover. The freedom of being no one in particular has become the prison of being no one to anyone.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'No Ties',
      description: 'Advantage on all checks to leave, escape, or disengage from a situation (the Untethered is always ready to go). Disadvantage on all checks to build lasting relationships, negotiate long-term agreements, or inspire loyalty. Crew cohesion bonuses from the Untethered\'s actions are halved. You are effective but no one counts on you.',
      cost: 'Halved cohesion contribution. Relationships cannot deepen past Neutral through social means alone.',
    },
  },
  {
    id: 'severed',
    name: 'Severed',
    description: 'The signal network is burned. Channels compromised.',
    lore: 'Too many intercepted signals, too many broken channels. The Vrynn communication network that was a species-wide advantage has become a liability. Every channel is suspect.',
    behavioralDirective: 'Default register: cut off from the network that defined your species. The communication instinct is still there but every channel feels compromised. NPC reactions: Vrynn contacts are cautious. Non-Vrynn contacts don\'t understand what was lost. When narrating interiority: the silence where the network used to be is not quiet; it is absence.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Dead Channel',
      description: 'Once per chapter, intercept a communication not intended for you. The Severed\'s broken network still picks up fragments; the channels are compromised in both directions. The intercepted message is always real and useful. But the interception is detectable: the sender knows someone was listening within 24 hours.',
      cost: 'Each interception is traceable. The broken network leaks in both directions. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'the-diplomat',
    name: 'The Diplomat',
    description: 'Every position compromised. No ground left to stand on.',
    lore: 'The Korath gift for directness required positions worth defending. Too many compromises have eroded every position to nothing. Sincerity is indistinguishable from tactic.',
    behavioralDirective: 'Default register: no position is genuine, including this one. The diplomatic instinct operates perfectly but serves nothing. NPC reactions: allies question sincerity. Enemies don\'t bother with threats because they know you\'ll fold. When narrating interiority: the skill of finding common ground has consumed the ground you were standing on.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Empty Accord',
      description: 'Once per chapter, broker an agreement between two hostile parties. The agreement always holds for this chapter. But the Diplomat\'s sincerity is gone; the agreement has a hidden flaw that one party will discover next chapter. The GM determines which party discovers the flaw and how they react.',
      cost: 'Agreements made by the Diplomat have a built-in expiration. Trust in your brokering erodes over time. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'the-observer',
    name: 'The Observer',
    description: 'Clinical detachment replaced engagement. People are data points.',
    lore: 'The Sylphari analytical gift has consumed the person wielding it. Observation has replaced participation. Emotional situations produce hypotheses, not responses.',
    behavioralDirective: 'Default register: observing, cataloguing, not participating. NPC reactions: companions feel studied, not known. New contacts sense an absence. When narrating interiority: every person is a pattern, every event is data, and the part of the mind that used to feel things now files them for later analysis.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Total Recall',
      description: 'Advantage on all Investigation, Perception, and Analysis checks (the Observer misses nothing). Disadvantage on all checks requiring emotional engagement: rallying crew, comforting allies, reading emotional subtext (as opposed to factual deception). Crew members\' personal loyalty quests cannot be triggered by the Observer; only shared tactical victories build cohesion.',
      cost: 'Cannot trigger crew loyalty arcs. The precision is perfect. The connection is clinical.',
    },
  },
  {
    id: 'marked',
    name: 'Marked',
    description: 'The reputation outran the person. Every port knows the name.',
    lore: 'The Zerith talent for reinvention requires anonymity. The reputation has grown past the point where a new identity can contain it. Every port knows the name, every job comes with expectations.',
    behavioralDirective: 'Default register: the name arrives before you do, and it tells a story you can no longer edit. NPC reactions: strangers have opinions before you speak. Jobs are offered based on legend, not need. When narrating interiority: the freedom to be anyone has collapsed into being one specific person that everyone recognizes.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'The Legend',
      description: 'All NPCs who have heard of you (most, in civilized space) start with a pre-formed opinion: +1 disposition tier for those who admire the legend, -1 for those who fear or resent it. The GM determines which based on NPC personality. Advantage on first-impression checks (the name does the work). But Disguise and Deception checks to hide your identity are at disadvantage: the legend is too recognizable.',
      cost: 'Cannot operate anonymously. Every port knows the name. The freedom to reinvent is gone.',
    },
  },
]

// Universal classes kept for fallback — playbooks below are species-keyed and take priority
const spaceOperaClasses: CharacterClass[] = []

const spaceOperaPlaybooks: Record<string, CharacterClass[]> = {
  // ─── Human: What do you do with power nobody granted? ────────────────
  'human': [
    {
      id: 'captain',
      name: 'Captain',
      concept: 'Leads the crew. The Compact trained your species for command; the question is whether you lead or just occupy the chair.',
      hookTags: ['commander', 'diplomat'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Galactic Lore', 'Piloting'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 14, CHA: 17 },
      startingInventory: [
        { id: 'holdout_pistol_c', name: 'Holdout Pistol', description: 'Compact, concealable sidearm', quantity: 1, damage: '1d6 energy' },
        { id: 'personal_shield_c', name: 'Personal Shield', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'command_codes', name: 'Compact Command Codes', description: 'Legacy access to Compact-era systems. Works on some stations. Gets you shot at others.', quantity: 1 },
        { id: 'comm_scrambler_c', name: 'Comm Scrambler', description: 'Block or redirect communications in range', quantity: 1 },
      ],
      startingCredits: 200,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Command Authority',
        description: 'Once per chapter, invoke authority to halt a hostile encounter, rally the crew, or compel cooperation from a faction that recognizes galactic law. Fails on pirates, outlaws, or the desperate. Each use on the same faction burns political capital; after three uses they reclassify you from captain to threat.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the Compact\'s treaty language because you were trained in it, or by someone who was. You know that "galactic law" is a fiction maintained by the factions that benefit from it and ignored by everyone else. You know which Remnant admirals still answer to civilian authority and which ones stopped pretending. You know that the chair you sit in was designed for a species that built the galaxy\'s infrastructure, and that the infrastructure is failing, and that the galaxy still looks at the chair before it looks at the person in it.',
    },
    {
      id: 'operative',
      name: 'Driftrunner',
      concept: 'Works back channels and institutional infrastructure built for humans. The problem-solver who knows which doors open and which shouldn\'t be opened.',
      hookTags: ['infiltrator', 'scout'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Sleight of Hand', 'Piloting', 'Hacking'],
      stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
      startingInventory: [
        { id: 'pulse_pistol_o', name: 'Pulse Pistol', description: 'Standard sidearm', quantity: 1, damage: '1d8 energy' },
        { id: 'vibro_knife_o', name: 'Vibro-Knife', description: 'Compact blade with vibrating edge', quantity: 1, damage: '1d4+DEX' },
        { id: 'holo_cloak_o', name: 'Holo-Cloak', description: 'Advantage on Stealth checks', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'lockbreaker_kit_o', name: 'Lockbreaker Kit', description: 'Electronic lock bypass tools', quantity: 1 },
      ],
      startingCredits: 120,
      startingHp: 9,
      startingAc: 15,
      hitDieAvg: 5,
      trait: {
        name: 'Smuggler\'s Luck',
        description: 'Once per chapter, when caught, searched, or cornered, one contraband item or piece of evidence goes undetected. Luck has memory. Each use in the same port or with the same faction makes the next search more thorough.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the beacon corridors the way a river rat knows the current: which ones are patrolled, which ones have dead spots where a ship can drift unscanned, and which ones went dark after the Fracture and stay dark because nobody wants to pay for reactivation. You know the customs officers by shift rotation and the docking fees that aren\'t on any manifest. You know that every sealed container is someone\'s secret, and that the smart move is never opening it.',
      playbookProfile: {
        naturalMoves: [
          'stealth through station and ship security',
          'piloting under patrol or corridor pressure',
          'hacking Compact-era and port authority systems',
          'smuggling contraband past searches and customs scans',
          'navigating back channels, brokers, and informal debt networks',
        ],
        naturalDomains: [
          'station escape under collector and docking pressure',
          'sealed-cargo jobs where search risk escalates',
          'frontier corridor runs beyond the last beacon',
        ],
      },
    },
    {
      id: 'pioneer',
      name: 'Pioneer',
      concept: 'Goes where the Compact didn\'t reach. Walks away from the inherited power structure. The explorer who\'d rather find something new than manage something old.',
      hookTags: ['scout', 'warrior'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Survival', 'Piloting', 'Xenotech'],
      stats: { STR: 16, DEX: 13, CON: 15, INT: 12, WIS: 11, CHA: 10 },
      startingInventory: [
        { id: 'plasma_rifle_p', name: 'Plasma Rifle', description: 'Heavy energy rifle, reliable in any atmosphere', quantity: 1, damage: '1d10 energy' },
        { id: 'survival_kit', name: 'Frontier Survival Kit', description: 'Environment seals, water recycler, emergency beacon', quantity: 1 },
        { id: 'grapple_launcher_p', name: 'Grapple Launcher', description: 'Retractable anchor line, 60ft range', quantity: 1 },
        { id: 'medpatch_p', name: 'Medpatch', description: 'Heals 1d6+2 HP when applied', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 80,
      startingHp: 12,
      startingAc: 14,
      hitDieAvg: 6,
      trait: {
        name: 'First Through',
        description: 'Once per chapter, when entering an unknown environment, location, or situation, gain advantage on the first check made there. The Pioneer reads new terrain the way others read faces. The cost: the advantage only works on the genuinely unknown. Revisiting a location or re-encountering a threat offers no benefit.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the frontier starts where the last beacon ends and the dark corridors begin. You know that the Compact mapped maybe forty percent of the galaxy and catalogued less than half of that. You know the difference between a planet that\'s uninhabited and one that\'s uninhabited by anything the scanners recognize. You know that every expedition into uncharted space is a bet that whatever is out there is less dangerous than whatever you\'re leaving behind. So far, you\'ve won that bet.',
    },
  ],

  // ─── Sylphari: What do you hold together? ────────────────────────────
  'sylphari': [
    {
      id: 'analyst',
      name: 'Analyst',
      concept: 'The role the galaxy expects: strategy, mediation, making operations work. The planner who sees the pattern before it resolves.',
      hookTags: ['commander', 'scholar'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Insight', 'Galactic Lore', 'Hacking'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 17, WIS: 14, CHA: 12 },
      startingInventory: [
        { id: 'stun_pistol_a', name: 'Stun Pistol', description: 'Non-lethal, DC 12 CON save or stunned', quantity: 1, damage: '1d6 stun' },
        { id: 'data_pad', name: 'Analyst Data Pad', description: 'Cross-references faction movements, trade routes, and historical patterns', quantity: 1 },
        { id: 'bioscanner_a', name: 'Bioscanner', description: 'Detailed health, biology, and environment readouts', quantity: 1 },
        { id: 'comm_suite', name: 'Encrypted Comm Suite', description: 'Secure multi-channel communication', quantity: 1 },
      ],
      startingCredits: 150,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Pattern Reading',
        description: 'Once per chapter, after observing a situation, faction, or person for at least one scene, identify a hidden pattern: an alliance that\'s about to break, a supply chain vulnerability, a lie that doesn\'t fit. INT Investigation check. Success reveals actionable intelligence. Failure reveals a pattern that is accurate but misleading.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the Compact\'s administrative architecture because your species built the procedures that ran it. You know which faction alliances are stable and which are held together by a single person\'s willingness to keep talking. You know that the galaxy\'s problems are not military; they are logistical, and logistics is what your species does. You know the difference between a crisis and a pattern, and you know that most crises are patterns that nobody recognized in time.',
    },
    {
      id: 'sovereign',
      name: 'Sovereign',
      concept: 'Refuses the service role. Leads in their own right. Makes everyone uncomfortable because Sylphari aren\'t supposed to be in charge.',
      hookTags: ['commander', 'diplomat'],
      primaryStat: 'WIS',
      proficiencies: ['Perception', 'Intimidation', 'Insight', 'Galactic Lore'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 14, WIS: 17, CHA: 14 },
      startingInventory: [
        { id: 'holdout_pistol_s', name: 'Holdout Pistol', description: 'Compact, concealable sidearm', quantity: 1, damage: '1d6 energy' },
        { id: 'personal_shield_s', name: 'Personal Shield', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'diplomatic_credentials', name: 'Diplomatic Credentials', description: 'Opens doors in any faction that respects the old protocols', quantity: 1 },
        { id: 'comm_scrambler_s', name: 'Comm Scrambler', description: 'Block or redirect communications in range', quantity: 1 },
      ],
      startingCredits: 200,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Sovereign Presence',
        description: 'Once per chapter, command a room. Every NPC present must acknowledge you as the authority in the conversation, regardless of their rank or faction. Works through force of personality, not legal standing. The cost: once you claim the room, you own the outcome. Every decision made during the interaction is attributed to you.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the look on a human captain\'s face when a Sylphari gives an order instead of a suggestion. You know the pause in a boardroom when the species they expect to facilitate starts to lead. You know that the Compact assigned your species the administrator role because administrators don\'t threaten anyone, and you know what it means that you\'ve refused the assignment. The galaxy built a box for you. You stepped out of it. The galaxy hasn\'t adjusted.',
    },
    {
      id: 'ghost',
      name: 'Ghost',
      concept: 'Uses the expectation of compliance as camouflage. Nobody watches the administrator. The infiltrator hiding behind a species stereotype.',
      hookTags: ['infiltrator', 'scholar'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Deception', 'Hacking', 'Insight'],
      stats: { STR: 10, DEX: 16, CON: 12, INT: 14, WIS: 13, CHA: 12 },
      startingInventory: [
        { id: 'pulse_pistol_g', name: 'Pulse Pistol', description: 'Standard sidearm, nothing memorable', quantity: 1, damage: '1d8 energy' },
        { id: 'admin_credentials', name: 'Administrative Credentials', description: 'Legitimate-looking access to Compact-era systems. Nobody questions an administrator.', quantity: 1 },
        { id: 'neural_jack_g', name: 'Neural Jack', description: '+3 to Hacking checks', quantity: 1 },
        { id: 'holo_cloak_g', name: 'Holo-Cloak', description: 'Advantage on Stealth checks', quantity: 1, charges: 1, maxCharges: 1 },
      ],
      startingCredits: 130,
      startingHp: 9,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Administrative Cover',
        description: 'Once per chapter, pass unquestioned through a security checkpoint, restricted area, or faction facility by presenting as an administrator. Works automatically on the first encounter. If the cover is blown, every NPC in the facility is hostile; the betrayal of the "helpful administrator" stereotype runs deep.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that the galaxy sees a Sylphari and thinks: planner, facilitator, the one who takes notes. You know that this assumption is the most powerful infiltration tool in the galaxy. Nobody watches the administrator. Nobody searches the facilitator\'s data pad. Nobody questions why the quiet Sylphari needs access to the server room. You are invisible in plain sight, not because you\'re sneaking, but because the galaxy has decided what you are, and it never occurs to them that you might be something else.',
    },
  ],

  // ─── Korath: What do you build? ──────────────────────────────────────
  'korath': [
    {
      id: 'korath-vanguard',
      name: 'Vanguard',
      concept: 'The strongest person in any room. Accepts the combat role and excels at it. The tank, the protector.',
      hookTags: ['warrior'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Armor Systems'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
      startingInventory: [
        { id: 'plasma_rifle_v', name: 'Plasma Rifle', description: 'Heavy energy rifle', quantity: 1, damage: '1d10 energy' },
        { id: 'combat_shield_v', name: 'Combat Shield', description: '+2 AC when equipped', quantity: 1 },
        { id: 'frag_grenade_v', name: 'Frag Grenade', description: '2d6 damage, 15ft radius', quantity: 3 },
        { id: 'medpatch_v', name: 'Medpatch', description: 'Heals 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 80,
      startingHp: 12,
      startingAc: 16,
      hitDieAvg: 6,
      trait: {
        name: 'Adrenaline Surge',
        description: 'Once per chapter, make a bonus attack immediately after a successful attack. The Korath combat instinct: when something connects, follow through before the target recovers.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what a boarding action sounds like from both sides of the airlock: the magnetic clamps, the shaped charge, the three-second silence before the breach. You know that the Compact called your species "labor" and that the labor they meant was war. You know the weak points in corporate security perimeters and the garrison rotations on Remnant stations. The galaxy puts you in front because you\'re the biggest. You stay in front because someone has to.',
    },
    {
      id: 'engineer',
      name: 'Engineer',
      concept: 'Builds things. Engineering, not labor. Proves the caste wrong. Looks at wreckage and sees a station.',
      hookTags: ['scholar', 'warrior'],
      primaryStat: 'INT',
      proficiencies: ['Engineering', 'Investigation', 'Athletics', 'Xenotech'],
      stats: { STR: 14, DEX: 10, CON: 14, INT: 17, WIS: 12, CHA: 10 },
      startingInventory: [
        { id: 'heavy_wrench', name: 'Heavy Wrench', description: 'Tool and weapon. Korath engineering standard.', quantity: 1, damage: '1d8' },
        { id: 'repair_kit_a', name: 'Repair Kit', description: 'Fix mechanical and electronic devices', quantity: 1 },
        { id: 'shock_drone_a', name: 'Shock Drone', description: 'Remote attack drone', quantity: 1, damage: '1d6 shock, range 30ft' },
        { id: 'engineering_scanner', name: 'Engineering Scanner', description: 'Structural analysis, system diagnostics', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Structural Insight',
        description: 'Once per chapter, identify a structural weakness, system vulnerability, or engineering solution that nobody else sees. INT Engineering check. Success: the weakness is exploitable or the solution works. Failure: the analysis is correct but the fix introduces a new problem.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that every station in the galaxy was built by Korath hands, and that the humans who signed the contracts have forgotten this. You know the stress tolerances of Compact-era hull plating and the shortcuts the corporate contractors took when they bought out the maintenance contracts. You know what a failing power coupling sounds like before the diagnostics catch it. The galaxy is breaking, and the species that built it is the only one that knows where the load-bearing walls are.',
    },
    {
      id: 'voice',
      name: 'Voice',
      concept: 'Speaks for Korath interests. Advocate, organizer, the face for a different purpose: representing the underrepresented.',
      hookTags: ['diplomat', 'warrior'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Intimidation', 'Athletics', 'Insight'],
      stats: { STR: 14, DEX: 10, CON: 14, INT: 11, WIS: 12, CHA: 16 },
      startingInventory: [
        { id: 'pulse_pistol_voice', name: 'Pulse Pistol', description: 'Standard sidearm', quantity: 1, damage: '1d8 energy' },
        { id: 'labor_credentials', name: 'Labor Union Credentials', description: 'Opens doors in dockyards, industrial sectors, and worker settlements', quantity: 1 },
        { id: 'personal_shield_voice', name: 'Personal Shield', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'encrypted_comm_voice', name: 'Encrypted Comm Unit', description: 'Secure channel to Korath networks', quantity: 1 },
      ],
      startingCredits: 120,
      startingHp: 10,
      startingAc: 13,
      hitDieAvg: 5,
      trait: {
        name: 'The Builder\'s Word',
        description: 'Once per chapter, invoke the weight of Korath labor in a negotiation: the dock workers, the engineers, the people who built the station you\'re standing on. The invocation is political, not legal. But when the Korath Voice says "my people built this," the people in the room know it\'s true. The cost: speaking for the builders means the builders expect results.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that the Compact classified your species as labor and that the classification stuck. You know the dockyard crews by name, the shift rotations by heart, and the contracts that underpay by design. You know that when a station\'s life support fails, it\'s Korath hands that fix it, and when the contract is renegotiated, it\'s human hands that sign it. You learned to speak because someone had to, and because the galaxy listens differently when a Korath puts down the wrench and picks up the microphone.',
    },
  ],

  // ─── Vrynn: How do you stay connected? ───────────────────────────────
  'vrynn': [
    {
      id: 'codebreaker',
      name: 'Codebreaker',
      concept: 'Uses the communication network. Information flows through you. The intelligence specialist who hears everything first.',
      hookTags: ['scholar', 'infiltrator'],
      primaryStat: 'INT',
      proficiencies: ['Hacking', 'Investigation', 'Engineering', 'Xenotech'],
      stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'neural_jack_s', name: 'Neural Jack', description: '+3 to all Hacking checks', quantity: 1 },
        { id: 'shock_drone_s', name: 'Shock Drone', description: 'Remote attack drone', quantity: 1, damage: '1d6 shock, range 30ft' },
        { id: 'emp_grenade_s', name: 'EMP Grenade', description: 'Disables electronics in 20ft radius for 1 round', quantity: 2 },
        { id: 'repair_kit_s', name: 'Repair Kit', description: 'Fix mechanical and electronic devices', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'System Override',
        description: 'Once per chapter, auto-succeed on one hacking check or seize a machine for 1 minute. The intrusion leaves a trace; the GM may introduce a delayed consequence. Repeated overrides against the same system within a chapter escalate security permanently.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that every system in the galaxy was built by someone who cut corners, and that every firewall has a seam where two contractors stopped talking to each other. You know Compact-era security architecture, which means you know the skeleton key to half the stations still running legacy systems. You know that the communication network your species built is the only thing keeping distant systems in contact, and that the network is degrading faster than anyone admits.',
    },
    {
      id: 'shade',
      name: 'Shade',
      concept: 'Operates without the network. Proves you\'re more than the ability everyone fears. The lone wolf who chose to be cut off.',
      hookTags: ['scout', 'warrior'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Athletics', 'Perception', 'Survival'],
      stats: { STR: 12, DEX: 16, CON: 14, INT: 12, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'sniper_blaster_si', name: 'Sniper Blaster', description: 'Long-range precision rifle', quantity: 1, damage: '1d10 energy, range 120ft' },
        { id: 'vibro_blade_si', name: 'Vibro-Blade', description: 'Close combat, silent', quantity: 1, damage: '1d6+DEX' },
        { id: 'stealth_suit', name: 'Stealth Suit', description: 'Sound-dampening, low thermal signature', quantity: 1 },
        { id: 'medpatch_si', name: 'Medpatch', description: 'Heals 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 90,
      startingHp: 10,
      startingAc: 15,
      hitDieAvg: 5,
      trait: {
        name: 'Dark Running',
        description: 'Once per chapter, operate completely off-grid: no signal emissions, no trackable presence, invisible to electronic surveillance. Lasts for one scene. The cost: while dark, the crew can\'t reach you either. If something goes wrong, you\'re alone.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the weight of silence in a species defined by connection. You cut the network because you needed to know who you were without it, and the answer is still forming. You know that the galaxy fears Vrynn for their communication ability, and that a Vrynn who operates without it is something nobody planned for. You move through stations without pinging a single relay, and the compound eyes that everyone finds unreadable are the sharpest sensors in any room.',
    },
    {
      id: 'herald',
      name: 'Herald',
      concept: 'Uses the gift openly, politically. The visibility is the point. The broadcaster who refuses to whisper.',
      hookTags: ['diplomat', 'scholar'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Hacking', 'Insight', 'Galactic Lore'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 14, WIS: 13, CHA: 17 },
      startingInventory: [
        { id: 'stun_pistol_b', name: 'Stun Pistol', description: 'Non-lethal, DC 12 CON save or stunned', quantity: 1, damage: '1d6 stun' },
        { id: 'broadcast_array', name: 'Personal Broadcast Array', description: 'Transmit on multiple channels simultaneously. The galaxy hears you.', quantity: 1 },
        { id: 'personal_shield_b', name: 'Personal Shield', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'data_pad_b', name: 'Intelligence Dossier', description: 'Cross-faction analysis, signal intercepts, diaspora reports', quantity: 1 },
      ],
      startingCredits: 140,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Open Broadcast',
        description: 'Once per chapter, broadcast a message, revelation, or accusation on open channels. Everyone in range hears it simultaneously: allies, enemies, bystanders. The broadcast can shift faction dynamics, expose secrets, or rally support. The cost: you cannot unsay it. Open broadcast is permanent. The factions will respond, and not all of them will respond well.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that the galaxy fears Vrynn communication ability because it works in the dark, in whispers, in networks nobody else can see. You chose the opposite. You broadcast openly, loudly, on every channel. You know that transparency is a weapon the powerful can\'t defend against, because their power depends on controlling information, and you just gave it away for free. The diaspora thinks you\'re reckless. The factions think you\'re dangerous. You think the galaxy needs to hear what\'s happening, and you\'re the only one with the equipment to make sure it does.',
    },
  ],

  // ─── Zerith: What do you do with freedom? ────────────────────────────
  'zerith': [
    {
      id: 'corsair',
      name: 'Corsair',
      concept: 'The raider who takes what the Compact wouldn\'t give. Lives the reputation. Combat pilot, boarder, the one with the best stories and the worst warrants.',
      hookTags: ['warrior', 'scout'],
      primaryStat: 'DEX',
      proficiencies: ['Piloting', 'Sharpshooting', 'Acrobatics', 'Mechanics'],
      stats: { STR: 12, DEX: 16, CON: 13, INT: 12, WIS: 13, CHA: 11 },
      startingInventory: [
        { id: 'sniper_blaster_c', name: 'Sniper Blaster', description: 'Long-range precision rifle', quantity: 1, damage: '1d10 energy, range 120ft' },
        { id: 'sidearm_c', name: 'Sidearm', description: 'Reliable close-range backup', quantity: 1, damage: '1d6 energy' },
        { id: 'flight_suit_c', name: 'Flight Suit', description: '+1 AC, sealed for vacuum', quantity: 1 },
        { id: 'grapple_launcher_c', name: 'Grapple Launcher', description: 'Retractable anchor line, 60ft range', quantity: 1 },
      ],
      startingCredits: 90,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Dead Eye',
        description: 'Once per chapter, treat one ranged attack as a critical hit (on a 19-20). Also has vehicle expertise: advantage on all piloting checks. The Zerith reflex advantage in the cockpit is real, and everyone who\'s flown against you knows it.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the feel of a ship the way a rider knows a horse: the vibration in the deck plating that means the port thruster is compensating, the sound the hull makes when atmospheric drag exceeds tolerance, the silence that means the drive has cut and you are coasting on momentum and prayer. You know the Rim routes by their drift patterns and the dark corridors by reputation. The Compact never reached you; the warrants did.',
    },
    {
      id: 'broker',
      name: 'Broker',
      concept: 'Trades between factions. Essential because beholden to none. The dealer who can get anything from anywhere for a price.',
      hookTags: ['diplomat', 'infiltrator'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Deception', 'Insight', 'Galactic Lore'],
      stats: { STR: 10, DEX: 13, CON: 11, INT: 14, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'holdout_pistol_br', name: 'Holdout Pistol', description: 'Compact, concealable', quantity: 1, damage: '1d6 energy' },
        { id: 'forged_credentials_br', name: 'Multi-Faction Credentials', description: 'Convincing ID for three different factions. Don\'t get caught carrying all three.', quantity: 1 },
        { id: 'comm_scrambler_br', name: 'Comm Scrambler', description: 'Block or redirect communications in range', quantity: 1 },
        { id: 'trade_samples', name: 'Trade Samples', description: 'Small, valuable goods from three systems. Conversation starters.', quantity: 1 },
      ],
      startingCredits: 250,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Market Sense',
        description: 'Once per chapter, identify who in the current location wants what, and what they\'d trade for it. CHA Insight check. Success reveals a profitable connection between two parties, with you in the middle. Failure reveals the connection but misreads one party\'s willingness, creating a negotiation trap.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that every station in the galaxy wants something it can\'t produce and has something it can\'t sell, and that the gap between those two facts is where you make a living. You know the Remnant admiral who\'ll pay triple for medical supplies that Corporate prices out of reach. You know the frontier settlement that produces a mineral three corporations need and doesn\'t know what it\'s worth. No homeworld means no loyalty tax, no faction tithe, no obligations beyond the deal you\'re making right now. That\'s not loneliness. That\'s competitive advantage.',
    },
    {
      id: 'wanderer',
      name: 'Wanderer',
      concept: 'Moves through the galaxy without leaving marks. Wants the spaces between. The scout, the navigator, the one who knows the routes nobody mapped.',
      hookTags: ['scout'],
      primaryStat: 'WIS',
      proficiencies: ['Survival', 'Perception', 'Piloting', 'Medicine'],
      stats: { STR: 10, DEX: 13, CON: 14, INT: 12, WIS: 17, CHA: 11 },
      startingInventory: [
        { id: 'sidearm_w', name: 'Sidearm', description: 'Reliable, nothing flashy', quantity: 1, damage: '1d6 energy' },
        { id: 'nav_suite', name: 'Custom Navigation Suite', description: 'Charts that don\'t appear in any database. Routes you found yourself.', quantity: 1 },
        { id: 'med_suite_w', name: 'Med-Suite', description: 'Heals 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
        { id: 'survival_beacon', name: 'Survival Beacon', description: 'Emergency signal, reaches three systems', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 10,
      startingAc: 13,
      hitDieAvg: 5,
      trait: {
        name: 'Unmapped Route',
        description: 'Once per chapter, know a route, passage, or approach that isn\'t in any database. It works. It\'s dangerous. The GM describes why. The cost: unmapped routes are unmapped for a reason. The passage exists, but what\'s on it may not be friendly, and it can\'t be used the same way twice.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the spaces between the beacons, the dark corridors where the Compact never reached and the factions haven\'t claimed. You know that the galaxy is mostly empty, and that the empty parts are more interesting than the full ones. You know routes through nebulae that cut three jumps off a standard corridor, and you know why the standard corridor exists instead. You carry your own charts because the official ones stop where the infrastructure stops, and the infrastructure stopped a long time ago.',
    },
  ],
}

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
  severe: 'oklch(0.62 0.24 20)',
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
  playbooks: spaceOperaPlaybooks,
  statLabels: { hp: 'HP', defense: 'SHLD', currency: 'CRED', inspiration: 'INSP' },
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
    toneOverride: 'Adjust tone: Epic (40%), Gritty (30%), Witty (30%). The grandeur is in the scale: vast distances, ancient infrastructure, the weight of a galaxy that was once connected and isn\'t anymore. The grit is in the crew\'s daily reality: fuel ratios, docking fees, the argument about who gets the last medpatch. The wit is gallows humor, the kind that comes from people who know they\'re in over their heads and have decided to be funny about it. A shared joke during a crisis is worth more than a speech.',
    assetMechanic: `## SHIP MECHANIC (call update_ship)\n\nShip systems are levels 1-3. Apply automatically:\n- Engines L2: -2 piloting DCs. L3: -4, can always escape.\n- Weapons L2: 1d10. L3: 1d12 + boarding.\n- Shields L2: -1 damage per hit. L3: -2 + deflect one per encounter.\n- Sensors L2: detect hidden threats. L3: reveal enemy intent.\n- Crew Quarters L2: cohesion +1 at chapter start. L3: +1 cohesion + companions recover 1d4 HP.\n\nShip combat options appear as quick actions. Hull: -15 to -25 per hit, +20 to +40 repair. Below 30%: disadvantage on piloting.\n\nChapter-end refit: embed 2-3 options in narrative.`,
    traitRules: `## TRAIT RULES

**Human Playbooks:**
- **Command Authority (Captain):** Halt a hostile encounter, rally the crew, or compel cooperation from factions that recognize galactic law. Fails on pirates and outlaws. Three uses on the same faction and they reclassify you from captain to threat.
- **Smuggler's Luck (Driftrunner):** One item goes undetected during a search. Luck has memory: repeated use in the same port escalates scrutiny.
- **First Through (Pioneer):** Advantage on the first check in an unknown environment. Only works on the genuinely unknown; no benefit on revisits.

**Sylphari Playbooks:**
- **Pattern Reading (Analyst):** After one scene of observation, identify a hidden pattern in a faction, situation, or person. Failure reveals a real but misleading pattern.
- **Sovereign Presence (Sovereign):** Command a room. Every NPC acknowledges your authority regardless of rank. The cost: you own every decision made during the interaction.
- **Administrative Cover (Ghost):** Pass unquestioned through security by presenting as an administrator. Automatic on first encounter. If blown, the betrayal of the stereotype turns the entire facility hostile.

**Korath Playbooks:**
- **Adrenaline Surge (Vanguard):** Bonus attack after a successful hit. The Korath combat follow-through.
- **Structural Insight (Engineer):** Identify a structural weakness or engineering solution. Failure gives correct analysis that introduces a new problem.
- **The Builder's Word (Voice):** Invoke Korath labor in a negotiation. The room knows it's true. The cost: the builders expect results from their representative.

**Vrynn Playbooks:**
- **System Override (Codebreaker):** Auto-succeed on one hack or seize a machine for 1 minute. Leaves a trace. Repeated overrides escalate security permanently.
- **Dark Running (Shade):** Operate off-grid for one scene: invisible to electronic surveillance. The cost: the crew can't reach you either.
- **Open Broadcast (Herald):** Broadcast on open channels. Everyone in range hears it. Shifts faction dynamics. The cost: you cannot unsay it.

**Zerith Playbooks:**
- **Dead Eye (Corsair):** One ranged attack crits on 19-20. Advantage on all piloting checks.
- **Market Sense (Broker):** Identify who wants what and what they'd trade. Failure misreads one party's willingness, creating a negotiation trap.
- **Unmapped Route (Wanderer):** Know a route that isn't in any database. It works. It's dangerous. The GM describes why. Can't be used the same way twice.`,
    consumableLabel: 'Medpatches, grenades, stim charges, ammo',
    tutorialContext: 'The opening chapter introduces the ship, one crew member, and a simple job that goes sideways. First check: piloting or docking. First combat: a small boarding action.',
    npcVoiceGuide: 'Military officers: short declarative sentences, rank-conscious. Engineers: precise, detail-oriented. Intelligence operatives: measured, say less than they know. Smugglers: casual, transactional, use questions as deflection. Aliens: speech reflects physiology and culture, not accents.',
    narrativeCraft: `Write with the techniques of Iain M. Banks (The Player of Games), Becky Chambers (A Long Way to a Small Angry Planet), Ann Leckie (Ancillary Justice), Adrian Tchaikovsky (Shards of Earth):

**Scale through human-sized details.** A galaxy-spanning civilization is communicated through one customs officer's boredom. A star-destroying weapon is felt through the silence in the corridor after the order is given. Never describe scale directly — describe what scale does to a person standing inside it.

**Ships and stations as lived spaces.** The bridge smells like recycled air and old coffee. The cargo bay has a dent from the time the loader jammed. The engine room hums at a frequency the engineer has stopped noticing. Spacecraft are not backdrops — they're homes, with the character of homes: worn, familiar, held together by habit and repair.

**Competence as characterization.** Show people who are good at their jobs. The pilot's hands that move before the alarm sounds. The engineer who diagnoses by listening. The captain who reads the crew's mood from how they stand. Expertise is attractive and reveals character without exposition.

**Cultural difference as texture.** Different species, stations, and factions think differently — not exotically, but practically. How they greet, who speaks first, what counts as rude, what counts as trust. These differences are felt in interaction, not explained in narration.

**Warmth alongside danger.** The best space opera has humor, affection, and genuine connection between characters, even (especially) when everything is falling apart. Crew banter during a crisis. A quiet meal before a bad jump. The warmth makes the danger real.

**Politics through personal stakes.** The trade war matters because it closed the port where your engineer's family lives. The treaty matters because it means your ship can't dock. Galactic politics are felt through individual consequences.`,
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
    'compact-remnant': 'In this scene: the Remnant operates as though the Compact still exists. Officials cite protocols, reference committees, and issue orders backed by authority that fades with distance from the core. The infrastructure works; the legitimacy doesn\'t.',
    'pirate-frontier': 'In this scene: authority is local and personal. Captains are the law on their ships. Reputation is currency. Promises are binding because breaking them means no one works with you again. Violence is a business tool, not a pleasure.',
    corporate: 'In this scene: everything is transactional. Corporate representatives speak in margins, contracts, and risk assessments. Hospitality has terms. Favors accrue interest. The corporation is not evil; it is indifferent, which is worse.',
    'ship-crew': 'In this scene: the crew is family by proximity and necessity. They know each other\'s habits, weaknesses, and the sounds they make when they sleep. Conflict is personal because the ship is small. Loyalty is tested by scarcity.',
    'derelict-void': 'In this scene: the void is not empty; it is patient. Derelict ships carry the silence of crews that stopped transmitting. Describe what remains: personal effects, half-eaten meals, system logs that end mid-sentence.',
    'station-port': 'In this scene: stations are crossroads. Every species, every faction, every agenda passes through. The noise is constant. Information is the most traded commodity. Bartenders know more than intelligence officers.',
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
    // ── Universal Hooks ─────────────────────────────────────────────────
    { hook: 'An old friend from your former unit sends a distress signal from a system you swore you\'d never go back to. Helping them means putting on the colors you left behind and answering to people you walked away from.', title: 'Old Colors', frame: { objective: 'Reach the system and find your friend', crucible: 'Returning means facing the people and obligations you left behind' }, arc: { name: 'Old Colors', episode: 'Answer the distress signal and assess what your friend needs' } },
    { hook: 'A routine salvage job turns up a black box from a ship that went missing during the Compact fracture. The data inside is encrypted with military-grade keys, and three factions are already asking where you found it. Keeping it is dangerous. Selling it is profitable. Listening to it might change everything.', title: 'Black Box', frame: { objective: 'Decrypt the black box before the factions close in', crucible: 'Three factions converging on the same prize, and you have a head start that\'s shrinking' }, arc: { name: 'The Lost Ship', episode: 'Decrypt enough of the black box to understand what the ship found' } },
    { hook: 'A refugee transport is dead in space, two jumps from the nearest station. They can\'t pay. Your fuel reserves say you can tow them or continue your job, not both. And the job is the one that pays this month\'s docking fees.', title: 'Dead in Space', frame: { objective: 'Decide the transport\'s fate and live with it', crucible: 'Saving lives costs the crew\'s livelihood; walking away costs something else' }, arc: { name: 'The Refugee Run', episode: 'Assess the transport and find out why they\'re really stranded' } },
    { hook: 'Your contact at the last station slipped you coordinates and a name before the authorities shut them down. The coordinates point to empty space. The name belongs to someone who died during the Fracture. Both are real.', title: 'Ghost Coordinates', frame: { objective: 'Reach the coordinates and find what\'s there', crucible: 'Someone risked everything to give you this, and authorities are already watching' }, arc: { name: 'Ghost Coordinates', episode: 'Navigate to the coordinates and discover what\'s hiding in empty space' } },

    // ── Species-Specific Hooks (2 per species) ──────────────────────────

    // Human — lost empire, inherited authority
    { hook: 'A Compact-era admiral has reactivated a mothballed battle group and is rallying human captains to "restore order." She\'s offering commissions, supplies, and legitimacy. The frontier settlements she\'s targeting call it an invasion. Your crew is split: half see a chance to rebuild something, half see a tyrant in uniform. The admiral knows your name.', title: 'The Restoration', origins: ['human'], frame: { objective: 'Decide whether to join, resist, or find a third option before the fleet moves', crucible: 'A charismatic admiral rebuilding human authority by force, and your crew disagrees on whether that\'s salvation or conquest' }, arc: { name: 'The Restoration', episode: 'Meet the admiral and assess whether her fleet is an army or a government' } },
    { hook: 'A colony world that went dark during the Fracture has sent its first signal in fourteen years. It\'s not a distress call. It\'s a trade proposal. They\'ve been building something out there, alone, and they want to rejoin the galaxy on their own terms. Three factions are racing to make first contact. The colony asked for you by name, using a Compact-era diplomatic channel nobody should still have access to.', title: 'First Signal', origins: ['human'], frame: { objective: 'Reach the colony before the factions and learn what they built', crucible: 'A lost colony returning on its own terms, and three factions who\'d rather set the terms themselves' }, arc: { name: 'First Signal', episode: 'Answer the colony\'s hail and determine why they asked for you' } },

    // Sylphari — the burden of holding things together
    { hook: 'Two factions on the verge of war have agreed to a ceasefire negotiation. Both demanded a Sylphari mediator. You accepted because someone had to. Then both delegations arrive and you recognize the lead negotiators: they\'re Sylphari too, each embedded in a faction that treats them as administrator, not person. They look at you the way a mirror looks back.', title: 'Three Administrators', origins: ['sylphari'], frame: { objective: 'Broker the ceasefire while three Sylphari navigate being used by the factions they serve', crucible: 'The mediator and both negotiators share a species and a realization: every Sylphari in the room is someone else\'s tool' }, arc: { name: 'Three Administrators', episode: 'Open negotiations and learn what each Sylphari wants that their faction doesn\'t know about' } },
    { hook: 'The Sylphari diplomatic corps has recalled all active mediators to the homeworld for "reassessment." No explanation. Twelve sector-level negotiations are now unmediated and unraveling. You weren\'t recalled because you\'re not officially on the corps\' rolls. Someone made sure of that. A message from inside the corps says: "Don\'t come home. Find out who ordered the recall. The corps is compromised."', title: 'The Recall', origins: ['sylphari'], frame: { objective: 'Investigate the recall order while the galaxy\'s negotiations collapse', crucible: 'The diplomatic infrastructure your species maintains is being deliberately dismantled, and you\'re the one they missed' }, arc: { name: 'The Recall', episode: 'Trace the recall order to its source inside the diplomatic corps' } },

    // Korath — the builders
    { hook: 'A Corporate Bloc station is failing. Life support degrading, hull integrity dropping, 40,000 people aboard. The corporation\'s response: hire Korath labor to fix it, paying dock-worker rates for engineer-level work. The Korath union is refusing unless the corporation recognizes them as engineers, not labor. The station has seventy-two hours. You\'re Korath. Both sides expect you to choose theirs.', title: 'Seventy-Two Hours', origins: ['korath'], frame: { objective: 'Fix the station and resolve the labor dispute before 40,000 people die', crucible: 'A dying station, a corporation that won\'t pay fair, a union that won\'t work cheap, and forty thousand people caught between' }, arc: { name: 'Seventy-Two Hours', episode: 'Assess the station\'s damage and decide whose terms you work on' } },
    { hook: 'Korath engineers built the beacon corridor that connects two frontier sectors. Now a Pirate Fleet has seized both ends and is charging tolls that are starving the settlements beyond. The engineers who built the corridor know its maintenance codes. The pirates know the engineers know. Three Korath engineers have disappeared in the last week. You know the fourth.', title: 'Maintenance Codes', origins: ['korath'], frame: { objective: 'Protect the fourth engineer and decide what to do about the pirates controlling Korath-built infrastructure', crucible: 'The builders\' knowledge is the weapon, and the pirates are eliminating anyone who could use it against them' }, arc: { name: 'Maintenance Codes', episode: 'Find the fourth engineer and secure the corridor\'s maintenance codes' } },

    // Vrynn — the network
    { hook: 'The Vrynn diaspora\'s communication network, the one that operates below faction awareness and keeps scattered Vrynn communities connected, has been infiltrated. Someone is injecting false signals, subtly redirecting intelligence, and turning Vrynn contacts against each other. Three communities have already gone silent. The diaspora leadership suspects the infiltrator is Vrynn.', title: 'False Signal', origins: ['vrynn'], frame: { objective: 'Identify the infiltrator before the diaspora network collapses', crucible: 'The communication network your species depends on is being corrupted from inside, and trust is the first casualty' }, arc: { name: 'False Signal', episode: 'Trace the false signals to their injection point' } },
    { hook: 'A Compact-era military intelligence archive, sealed since the Fracture, has begun broadcasting on Vrynn frequencies. The archive contains every intelligence operation the Compact ran through Vrynn operatives: names, methods, assets. If a faction intercepts it, every Vrynn who ever worked intelligence is exposed. The broadcast is automated and accelerating. Someone needs to reach the archive and shut it down before the next burst.', title: 'The Archive Broadcast', origins: ['vrynn'], startingCounters: { signal_debt: 1 }, frame: { objective: 'Reach the archive and stop the broadcast before Vrynn operatives are exposed across the galaxy', crucible: 'A dead intelligence service is burning its own agents, and the countdown between bursts is getting shorter' }, arc: { name: 'The Archive Broadcast', episode: 'Locate the archive and assess whether shutting it down is possible before the next burst' } },

    // Zerith — freedom in chaos
    { hook: 'A Zerith settlement, one of the few permanent ones in the galaxy, has declared independence from the sector\'s dominant Corporate Bloc. The corporation\'s response is a trade embargo that will starve the settlement in three months. The settlement\'s leader is offering Zerith freelancers a deal: break the embargo, and you get a home port. A permanent one. No Zerith has had a permanent home in living memory.', title: 'Home Port', origins: ['zerith'], frame: { objective: 'Break the corporate embargo and decide whether a home port is worth what it costs', crucible: 'A permanent home for a species that has never had one, if you can break a blockade run by the galaxy\'s most powerful faction' }, arc: { name: 'Home Port', episode: 'Scout the embargo line and assess whether the settlement can survive long enough for a run' } },
    { hook: 'A Zerith broker you respect is dead. Killed at a station where killing is supposed to be impossible. The station\'s AI recorded everything and has sealed the evidence pending a formal investigation that will never happen, because the faction that runs the station is the faction that benefits from the broker\'s death. The AI is offering you access to the recordings. In exchange, it wants you to do something for it. It won\'t say what until you agree.', title: 'The AI\'s Price', origins: ['zerith'], startingCounters: { reputation: 1 }, frame: { objective: 'Get the recordings and find who killed the broker, without agreeing to something worse', crucible: 'A dead friend, sealed evidence, and an AI that wants a favor it won\'t define' }, arc: { name: 'The AI\'s Price', episode: 'Negotiate with the AI and view enough of the recordings to identify the killer' } },

    // ── Playbook-Specific Hooks ─────────────────────────────────────────

    // Captain
    { hook: 'Two factions on the verge of war have agreed to meet on neutral ground — your ship. The summit starts in six hours. Then the lead negotiator for one side is found dead in their quarters, and both delegations are blaming the crew.', title: 'Neutral Ground', classes: ['Captain'], frame: { objective: 'Find the killer before the summit collapses', crucible: 'Both delegations want blood, and your crew is the prime suspect' }, arc: { name: 'Neutral Ground', episode: 'Investigate the negotiator\'s death while keeping both delegations aboard' } },

    // Driftrunner
    { hook: 'You owe Maren Voss forty thousand credits and she\'s done being patient. Her collector just docked at the same station you\'re refueling at, and the docking clamps won\'t release until the port fees clear. Then a stranger slides into the booth across from you in the cantina and offers exactly forty thousand credits to move one passenger and one sealed crate to a system three jumps past the last beacon. No questions. The stranger says the job needs to leave tonight. Voss\'s collector is walking the concourse. Tonight is also when you were planning to run.', title: 'Forty Thousand', classes: ['Driftrunner'], frame: { objective: 'Take the job, pay the debt, and get out before Voss\'s collector finds you', crucible: 'The exact amount you owe, from a stranger who knows you\'re desperate, for a job past the last beacon' }, arc: { name: 'The Forty Thousand Job', episode: 'Take the passenger and the crate aboard and clear the station before the collector closes in' } },
    { hook: 'The cargo is a person. She says she\'s a defector from a Compact Remnant intelligence bureau and the data she\'s carrying will expose a network of compromised beacon operators. She paid for passage, not protection. But the ship that just dropped out of FTL behind you isn\'t customs — it\'s a black-ops corvette, and they\'re not hailing.', title: 'The Defector', classes: ['Driftrunner'], frame: { objective: 'Get the defector to safe harbor alive', crucible: 'A black-ops corvette, a passenger who knows too much, and the question of whether her data is worth dying for' }, arc: { name: 'The Defector\'s Data', episode: 'Evade the corvette and decide whether to trust what the defector is carrying' } },

    // Pioneer
    { hook: 'An anonymous client is offering a fortune to fly a sealed container through the Wraith Nebula — an uncharted region where navigation systems fail and ships disappear. No questions, payment on delivery. Three other crews already turned it down.', title: 'The Wraith Run', classes: ['Pioneer'], frame: { objective: 'Survive the Wraith Nebula crossing', crucible: 'No navigation, no comms, and whatever is in the container is worth dying for — to someone' }, arc: { name: 'The Wraith Run', episode: 'Prepare for the crossing and learn why three crews refused' } },

    // Analyst
    { hook: 'An old political ally sends an encrypted message: they\'ve been accused of treason and are being transferred to a black site. They have information that could destabilize the sector. They\'re asking you to intervene — officially or otherwise.', title: 'Black Site', classes: ['Analyst'], frame: { objective: 'Intercept the transfer before they disappear', crucible: 'Acting officially burns your standing; acting unofficially makes you a criminal' }, arc: { name: 'The Black Site Transfer', episode: 'Verify the ally\'s claims and locate the transfer route' } },

    // Sovereign
    { hook: 'You brokered a ceasefire between a mining colony and its corporate owners. It was supposed to hold. Now the colony leader is dead, the corporation is moving security forces in, and both sides say you guaranteed terms the other violated. Your name is on a deal that\'s falling apart.', title: 'Broken Terms', classes: ['Sovereign'], frame: { objective: 'Prevent the corporation\'s security from reaching the colony', crucible: 'Your reputation is on the line, and both sides blame you for the collapse' }, arc: { name: 'Broken Terms', episode: 'Discover who killed the colony leader and why the ceasefire really failed' } },

    // Vanguard
    { hook: 'A frontier outpost went dark three days ago. The garrison commander was a friend. The relief force found the station intact but empty — no bodies, no damage, no explanation. They\'re asking for someone willing to go inside.', title: 'Dark Station', classes: ['Vanguard'], frame: { objective: 'Enter the station and find the garrison', crucible: 'An intact station with no people and no explanation' }, arc: { name: 'The Dark Station', episode: 'Board the station and discover what happened to the garrison' } },

    // Engineer
    { hook: 'The station you just docked at is running on emergency protocols — life support cycling, airlocks glitching, docking clamps won\'t release. The station AI insists everything is nominal. It isn\'t. And your ship is locked in.', title: 'Nominal', classes: ['Engineer'], frame: { objective: 'Free the ship from the malfunctioning station', crucible: 'A station AI denying reality, and your ship is trapped' }, arc: { name: 'Station Nominal', episode: 'Determine whether the AI is malfunctioning or lying' } },

    // Codebreaker
    { hook: 'The ship\'s AI woke you at 0300 with a priority alert: someone accessed the encrypted partition while you were asleep. The intrusion came from inside the ship. The AI can\'t identify who.', title: 'Inside Job', classes: ['Codebreaker'], frame: { objective: 'Find who breached the encrypted partition', crucible: 'The intruder is aboard your ship and the AI can\'t see them' }, arc: { name: 'The Inside Job', episode: 'Trace the intrusion to its source inside the ship' } },

    // Shade
    { hook: 'A pilot you know went missing on a charted beacon corridor. Search and rescue found the ship drifting, engines cold, flight recorder wiped. The cockpit was locked from the inside. No body.', title: 'Locked Cockpit', classes: ['Shade'], frame: { objective: 'Board the drifting ship and find your friend', crucible: 'A locked cockpit, no body, and a flight recorder someone deliberately erased' }, arc: { name: 'The Locked Cockpit', episode: 'Examine the drifting ship and recover what the flight recorder lost' } },

    // Corsair
    { hook: 'The ship is running on fumes, limping into the nearest port after a pirate ambush damaged the FTL drive. The only station in range is controlled by a faction that remembers the last time you outflew their patrol squadron.', title: 'Fumes', classes: ['Corsair'], frame: { objective: 'Dock and repair without getting arrested', crucible: 'No fuel to go elsewhere, and the faction running this station has a score to settle' }, arc: { name: 'Running on Fumes', episode: 'Negotiate docking and find a way to repair the FTL drive' } },

    // Broker
    { hook: 'You ran a job six months ago — moved a sealed container between two stations, no questions. Now one of those stations is gone. Destroyed. Debris field, no survivors. A message arrives from a sender that doesn\'t exist: "You moved the weapon. They\'ll come for you. Run or help."', title: 'Six Months Ago', classes: ['Broker'], frame: { objective: 'Find what you carried and who sent the message', crucible: 'A destroyed station, a job you thought was clean, and your hands on whatever did it' }, arc: { name: 'Six Months Ago', episode: 'Trace the sealed container\'s origin and the sender\'s identity' } },

    // Wanderer
    { hook: 'A cargo hauler docks requesting emergency medical assistance. The patient has symptoms you\'ve never seen — tissue regenerating impossibly fast, organs in the wrong places. The hauler\'s crew won\'t say where they found this person. They picked them up in a dark corridor.', title: 'Wrong Anatomy', classes: ['Wanderer'], frame: { objective: 'Stabilize the patient and find out where they came from', crucible: 'Unknown biology from a dark corridor, and a crew that\'s terrified of their own cargo' }, arc: { name: 'Wrong Anatomy', episode: 'Diagnose the patient and trace the dark corridor they came from' } },

    // Ghost
    { hook: 'A Compact Remnant intelligence facility is holding three Sylphari diplomats in "administrative detention." The detention is legal under Compact law. The facility commander is using them as leverage in a sector negotiation their own government can\'t acknowledge. The diplomats sent one message through channels nobody was supposed to be watching: your name. Getting them out officially is impossible. Getting them out the way an administrator would, by walking in with the right credentials and walking out with three people nobody thought to count, is exactly what you do.', title: 'Administrative Detention', classes: ['Ghost'], frame: { objective: 'Extract the diplomats without anyone realizing they\'re gone', crucible: 'Three Sylphari held by their own species\' legacy infrastructure, and the only way out is the door you walk through' }, arc: { name: 'Administrative Detention', episode: 'Infiltrate the facility and assess the security before making your move' } },

    // Voice
    { hook: 'A Korath-built station in the frontier is being decommissioned by the Corporate Bloc that bought it. The corporation is stripping the station for parts. The three hundred Korath families who live on the station were told to relocate; they were not told where. The families are refusing to leave the station their grandparents built. The corporation\'s security deadline is one week. The families asked for a Voice because they need someone who can make the galaxy hear them before the security teams arrive.', title: 'The Decommission', classes: ['Voice'], frame: { objective: 'Buy the families time and find them a future before the deadline', crucible: 'Three hundred families on a station being sold for scrap, and the people who built it are the last ones the corporation asked' }, arc: { name: 'The Decommission', episode: 'Meet the families and assess what leverage you have against the corporation\'s timeline' } },

    // Herald
    { hook: 'A frontier settlement is dying because nobody knows it exists. Cut off when its beacon corridor went dark two years ago, the settlement has been rationing food and recycling water. They have enough to last three more months. They built a transmitter from salvage and broadcast a plea. The broadcast reached you. It also reached a Corporate Bloc that sees the settlement\'s location as strategically valuable and is sending a "relief" ship that will arrive with contracts, not food. You can broadcast the settlement\'s situation on open channels before the corporate ship arrives. If you do, every faction in range hears it. Including the ones that would strip the settlement themselves.', title: 'The Broadcast', classes: ['Herald'], frame: { objective: 'Decide how to help the settlement without making it a target', crucible: 'A dying settlement, a corporate ship with strings attached, and an open broadcast that could save or doom them' }, arc: { name: 'The Broadcast', episode: 'Reach the settlement and assess what an open broadcast would trigger' } },

    // ── Archetype-Tagged Hooks (cross-species, match via hookTags) ───────

    // commander — Captain, Analyst, Sovereign
    { hook: 'The convoy you were hired to escort just lost its lead ship to a Remnant patrol enforcing a blockade nobody announced. The remaining transports are civilian: families, medical supplies, seed stock. Your employer is dead. The patrol commander is hailing with a lawful order to stand down. The colonists are begging you not to comply. They say the last convoy that submitted to "inspection" was stripped and its passengers conscripted.', title: 'Broken Convoy', classes: ['commander'], frame: { objective: 'Protect the convoy through the blockade', crucible: 'A lawful order, civilian lives, and no clean outcome' }, arc: { name: 'The Broken Convoy', episode: 'Decide whether to comply or run, and deal with the consequences' } },

    // warrior — Pioneer, Vanguard, Shade, Corsair
    { hook: 'A warlord from the Outer Reach is offering amnesty and triple pay to any ex-military crew willing to run a blockade. The cargo is humanitarian supplies. The blockade is run by the faction you used to serve.', title: 'The Blockade', classes: ['warrior'], frame: { objective: 'Decide whether to run the blockade', crucible: 'Humanitarian need vs. firing on former comrades' }, arc: { name: 'The Blockade Run', episode: 'Assess the warlord\'s claims and scout the blockade\'s strength' } },

    // diplomat — Captain, Sovereign, Voice, Herald, Broker
    { hook: 'A quarantined system is dying. The quarantine is legal, enforced by three factions for three different reasons, none of which are medical. The system\'s population has twelve weeks of supplies. The factions won\'t negotiate with each other. They\'ll negotiate with you — but each wants something the others will kill to prevent.', title: 'Twelve Weeks', classes: ['diplomat'], frame: { objective: 'Break the quarantine through negotiation before twelve weeks expire', crucible: 'Three factions, three agendas, and a population that dies if nobody blinks' }, arc: { name: 'Twelve Weeks', episode: 'Open channels with all three factions and find the leverage point' } },

    // infiltrator — Operative, Ghost, Codebreaker, Broker
    { hook: 'A dead hacker\'s neural implant arrived in a courier package addressed to you. No return sender. The implant contains a partial decryption key to a file that\'s been bouncing around darknet servers for months — a file three corporations have killed to suppress.', title: 'Dead Drop', classes: ['infiltrator'], frame: { objective: 'Use the partial key to access the suppressed file', crucible: 'Three corporations already killed for this file, and now you have a piece of the key' }, arc: { name: 'The Suppressed File', episode: 'Decrypt enough of the file to understand why people are dying for it' } },

    // scout — Operative, Pioneer, Shade, Corsair, Wanderer
    { hook: 'A former colleague sends you lab results that shouldn\'t exist: a biological sample from a patient who died two years ago, showing active cell division. The sample was collected yesterday. From a facility in a dark corridor that was supposed to be decommissioned.', title: 'Active Cells', classes: ['scout'], frame: { objective: 'Reach the decommissioned facility', crucible: 'Dead patient\'s cells are alive, the facility should be empty, and your colleague is scared' }, arc: { name: 'Active Cells', episode: 'Navigate the dark corridor and investigate the facility' } },

    // scholar — Analyst, Ghost, Codebreaker, Engineer, Herald
    { hook: 'A Rogue AI that has been dormant for three years just sent a single transmission on a frequency only your ship can receive. The message is one word in a language the ship\'s translator doesn\'t recognize, followed by coordinates inside the AI\'s station. The station was declared hazardous and quarantined. The AI is inviting you in. Nobody has successfully negotiated with a Rogue AI twice. This would be your first time.', title: 'The Invitation', classes: ['scholar'], frame: { objective: 'Enter the AI\'s station and determine what it wants', crucible: 'A dormant AI waking up to invite you specifically, into a quarantined station, using a frequency only you can hear' }, arc: { name: 'The Invitation', episode: 'Approach the station and establish communication with the AI' } },
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
    'Kovac', 'Indira', 'Fenwick', 'Alaric', 'Brenna', 'Carver', 'Dahlia',
    'Elara', 'Fenn', 'Gael', 'Huxley', 'Idara', 'Joss', 'Kira', 'Lev',
    'Mira', 'Nolan', 'Orion', 'Paz', 'Quinn', 'Riku', 'Sage', 'Thorne',
    'Uma', 'Vesper', 'Wynn', 'Xander', 'Yael', 'Zara', 'Anika', 'Boz',
    'Callista', 'Dex', 'Eska', 'Frost', 'Greer', 'Halo', 'Iska', 'Juno',
    'Kelso', 'Lira', 'Marsh', 'Niall', 'Orla', 'Pax', 'Rhen', 'Sev',
    'Tallis', 'Uri', 'Vance', 'Wells', 'Xen', 'Yara', 'Zeke', 'Asa',
    'Beck', 'Cleo', 'Dune', 'Eryx', 'Flint', 'Gem', 'Hart',
  ],
}


export default spaceOperaConfig
