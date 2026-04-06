import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

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
  companionLabel: 'Companions',
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


export default fantasyConfig
