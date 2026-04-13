import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Fantasy ──────────────────────────────────────────────────────────

const fantasySpecies: Species[] = [
  {
    id: 'human',
    name: 'Human',
    description: 'Adaptable, politically dominant across most kingdoms.',
    lore: 'The common face of every kingdom. Nobody questions a human at a city gate or a market stall. No starting contact bonus, but no suspicion either. Advantage on checks to blend in or navigate bureaucracy — the systems were built by humans, for humans. The cost: no racial network. Other species look after their own; humans are on their own.',
    behavioralDirective: 'Default register: pragmatic, present-focused, building from scratch what other folk inherit. NPC reactions: unremarkable, which is both safety and invisibility. When narrating interiority: the freedom and loneliness of belonging to no tradition older than your own memory.',
    startingContacts: [
      { role: 'local official', disposition: 'neutral', description: 'A minor bureaucrat who knows how the systems work and owes no particular loyalty' },
    ],
  },
  {
    id: 'elf',
    name: 'Elf',
    description: 'Slender, long-lived, keen-eyed.',
    lore: 'Elven patience is cultural, not passive — it comes from living long enough to see hasty decisions rot. Welcomed in courts and academies; distrusted on the frontier where "elf" means "outsider who thinks they know better." Start with one court or academic contact at Favorable. Advantage on Perception and History checks (keen eyes, long memory). Frontier and common-folk NPCs start at Wary — earn their respect through action, not lineage.',
    behavioralDirective: 'Default register: measured, long-viewed, carrying the weight of watching shorter-lived friends age and die. Patience is not passivity; it is the discipline of a species that has seen urgency ruin more than it saved. NPC reactions: courts and scholars treat as peer, common folk resent the calm. When narrating interiority: the melancholy of long memory and the temptation to stop caring about things that will not outlast you.',
    startingContacts: [
      { role: 'court scholar', disposition: 'favorable', description: 'An academic at the Collegium who respects elven lineage and long memory', affiliation: 'The Collegium' },
    ],
  },
  {
    id: 'dwarf',
    name: 'Dwarf',
    description: 'Stocky, dense-boned, mountain-born.',
    lore: 'Dwarven bluntness isn\'t rudeness; it\'s efficiency. A dwarf\'s word is a contract, and a contract is unbreakable. Trade guilds know this, which is why dwarven merchants get better terms than anyone else. Start with one trade guild contact at Favorable. Advantage on Engineering, Appraisal, and CON saves (dense bones, stubborn constitution). Disadvantage on Deception checks — lying goes against everything your culture taught you, and your face shows it.',
    behavioralDirective: 'Default register: direct, contractual, measuring the world by whether it keeps its promises. Words are binding; actions are proof. NPC reactions: merchants trust implicitly, diplomats find the bluntness inconvenient. When narrating interiority: the bedrock certainty of a culture built on stone and oath, and the frustration of a world where neither seems to hold anymore.',
    startingContacts: [
      { role: 'trade guild factor', disposition: 'favorable', description: 'A guild merchant who gives dwarves better terms because a dwarven contract is unbreakable', affiliation: 'Trade Guild' },
    ],
  },
  {
    id: 'halfling',
    name: 'Halfling',
    description: 'Small, nimble, deceptively tough.',
    lore: 'People see the size and stop looking. That\'s the advantage. Halflings are everywhere, owned by no kingdom, beholden to no lord — which makes them either invisible or suspect, depending on who\'s asking. Start with one traveling merchant or innkeeper contact at Favorable (halfling network, always passing through). Advantage on Stealth checks and checks to go unnoticed in crowds. Disadvantage on Intimidation — nobody fears someone they could pick up.',
    behavioralDirective: 'Default register: observant, cheerful as camouflage, navigating a world built for larger people. Smallness is a tool, not a limitation. NPC reactions: overlooked by the powerful, trusted by the common, underestimated by everyone. When narrating interiority: the quiet competence of someone who learned that being beneath notice is the safest place in any room.',
    startingContacts: [
      { role: 'traveling innkeeper', disposition: 'favorable', description: 'A halfling innkeeper plugged into the network of travelers, always passing through' },
    ],
  },
  {
    id: 'dragonkin',
    name: 'Dragonkin',
    description: 'Tall, scaled, remnants of an ancient bloodline.',
    lore: 'The Wyrm Kingdoms fell three centuries ago, but the fear hasn\'t. Dragonkin are imposing, fast, and carry a reputation for violence they didn\'t earn. Some doors open because people are afraid to say no. Others close for the same reason. But the dragonkin carry something else: fragments of pre-Sundering knowledge. Oral traditions, inherited memory, dreams that map to Ancient ruin layouts. The other species lost their connection to the Ancients when the Wyrm Kingdoms burned. The dragonkin didn\'t. Start with one dragonkin exile contact at Favorable (scattered community, fiercely loyal). Advantage on Intimidation and Initiative. Advantage on checks involving Ancient ruins, pre-Sundering lore, or interpreting Ancient artifacts (inherited cultural memory). Most NPCs start at Wary — you\'re feared before you\'re known. Climbing to Trusted takes twice as long.',
    behavioralDirective: 'Default register: ancient, carrying inherited memory that surfaces as instinct and dream. The world fears what it does not understand, and the dragonkin understand things nobody else remembers. NPC reactions: fear first, curiosity second, trust only after sustained proof. When narrating interiority: the weight of racial memory, dreams that map to places you have never been, and the loneliness of being the last species that remembers what was lost.',
    startingContacts: [
      { role: 'exile lorekeeper', disposition: 'favorable', description: 'A scattered dragonkin exile who preserves oral traditions and pre-Sundering knowledge', affiliation: 'Dragonkin Diaspora' },
    ],
  },

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'climber',
    name: 'Climber',
    description: 'Ambition consumed the noble bearing. Every relationship is a rung.',
    lore: 'The pragmatism that made humans effective in every kingdom has hardened into pure ambition. Court allies are stepping stones. Loyalty is a resource to be spent. The adaptability that was a strength has become a refusal to hold any ground that isn\'t higher ground.',
    behavioralDirective: 'Default register: every interaction is an opportunity for advancement, and advancement is the only metric that matters. The pragmatism is ruthless now, not flexible. NPC reactions: court allies sense the calculating edge and guard their positions. New contacts see ambition before they see a person. When narrating interiority: the ladder is the only structure that makes sense. Standing still feels like falling.',
    hidden: true,
  },
  {
    id: 'watcher',
    name: 'Watcher',
    description: 'Retreated past the point of return. The world happens to you.',
    lore: 'The elven tendency toward long observation has tipped into permanent withdrawal. The world moves too fast, too crudely, and the character has retreated into a perspective so distant that participation feels impossible. They watch. They understand. They do nothing.',
    behavioralDirective: 'Default register: observing from a distance that has become unreachable. The long view has consumed the present. NPC reactions: companions mistake withdrawal for wisdom, then grow frustrated when wisdom produces no action. Enemies forget you are there. When narrating interiority: the world is perfectly legible from this distance. The problem is that helping requires closing the distance, and the distance has become the self.',
    hidden: true,
  },
  {
    id: 'bound',
    name: 'Bound',
    description: 'The oath became the person. No identity outside the vow.',
    lore: 'Dwarven oaths were meant to anchor, not imprison. This one has consumed the person who swore it. There is no flexibility, no accommodation, no room for the world to be more complex than the words spoken in stone. The oath answers every question before the dwarf can.',
    behavioralDirective: 'Default register: the oath is the identity. Every situation is filtered through the vow before it reaches the person. NPC reactions: allies respect the consistency but fear what happens when the oath conflicts with survival. Enemies exploit the predictability with precision. When narrating interiority: the oath is not a choice anymore; it is a reflex. The comfort of certainty has become a wall against every exit.',
    hidden: true,
  },
  {
    id: 'named',
    name: 'Named',
    description: 'No longer invisible. Recognition brings danger.',
    lore: 'The halfling gift for passing unnoticed is gone. Too many actions, too many witnesses, too many stories told in too many taverns. The anonymity that was armor has been shed, and the small person in the big world is now a known quantity in a world that punishes the known.',
    behavioralDirective: 'Default register: exposed, visible, and aware that visibility is the opposite of safety. The instinct to disappear is still there but the skill no longer works. NPC reactions: people who should not know the name call it out in public. Enemies no longer overlook you. When narrating interiority: every room feels watched. The comfort of being beneath notice is gone, and the world is much larger when it is looking directly at you.',
    hidden: true,
  },
  {
    id: 'vessel',
    name: 'Vessel',
    description: 'The bloodline is asserting itself. Becoming what the ancestors were.',
    lore: 'The inherited memory that surfaced as instinct and dream has become something more insistent. The Wyrm Kingdoms fell three centuries ago, but something in the blood is rising. The dragonkin is becoming what their ancestors were, whether they chose it or not.',
    behavioralDirective: 'Default register: the inheritance is no longer background noise; it is a voice, and it is getting louder. The ancient knowledge that was an advantage has become a claim on the person carrying it. NPC reactions: the fear deepens into something primal. People sense something older than the person standing in front of them. When narrating interiority: the dreams are instructions now. The memory is not inherited; it is inhabiting. The question is no longer what the ancestors knew, but what they want.',
    hidden: true,
  },
]

const fantasyClasses: CharacterClass[] = [
  {
    id: 'shadowblade',
    name: 'Shadowblade',
    concept: 'Shadow Walker / Threshold Crosser',
    description: 'The spaces between places hold things the Sundering displaced. The Shadowblade passes through them and brings something back — sometimes useful, sometimes wrong.',
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
      name: 'The Price of Shadows',
      description: 'The Shadowblade vanishes through somewhere and brings something back. After each use, the GM places a small detail in the next scene that came from wherever they stepped through. Sometimes useful. Sometimes wrong.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the spaces between places: the threshold where a shadow is not the absence of light but a door. You know that the Sundering displaced things, and that those things settled in the gaps between walls, between breaths, between one step and the next. You know the guild marks that mean a lock was made to keep something in, not out. You know the difference between a room that is empty and a room that is waiting.',
  },
  {
    id: 'warden',
    name: 'Warden',
    concept: 'Sworn Protector / Last Guardian',
    description: 'Bound by oaths older than the kingdoms that forgot them. The Warden protects what remains because someone has to remember what was worth protecting.',
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
      name: 'Oath Burden',
      description: 'The Warden\'s bonus attack comes from invoking a sworn duty. After the surge, they must keep one promise made during the chapter or lose access to the trait next chapter. Strength bound by obligation.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the oaths because you swore them, and you know the fortresses because you stood watch on their walls. You know that Thornwall\'s garrison has not sent a rider in weeks and that the Accord of Thorns is held together by habit, not conviction. You know the weight of a shield in formation and the sound a gate makes when it closes for the last time. You know that the things worth protecting are always smaller than the forces that threaten them.',
  },
  {
    id: 'arcanist',
    name: 'Arcanist',
    concept: 'Spell Archaeologist / Lost Knowledge Seeker',
    description: 'Every spell is a fragment of something larger that no living teacher fully understands. The Arcanist pieces together what the world has forgotten, one dangerous discovery at a time.',
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
    openingKnowledge: 'You know that every spell you cast is a fragment of something larger, a sentence from a book that no living person has read in full. You know the Collegium\'s archives are shrinking, not because books are being removed, but because fewer scholars each decade can read what remains. You know the physical cost of magic: the nosebleeds, the tremor in your hands after a sustained casting, the headaches that last for days. You know that the reservoir is not refilling, and that no one at the Collegium will say it aloud.',
  },
  {
    id: 'herald',
    name: 'Herald',
    concept: 'Lorekeeper / Story Wielder',
    description: "The old stories aren't decoration — they're the last record of truths the world has lost. The Herald speaks them into power, knowing that every story shared becomes known to those who hear it.",
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
      description: 'Once per day, invoke a story, song, or legend that shifts the mood of a scene. A crowd calms, a guard hesitates, an enemy pauses. Requires speaking; useless when silenced or ambushed. Memory cost: stories invoked become known to whoever heard them. Skilled NPCs can use that knowledge against the Herald later.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the old stories, and you know that the old stories are the last record of truths the world has lost. You know which songs make soldiers weep and which ones make lords reach for their swords. You know the Collegium records facts, but you record meaning, and meaning is what survives when the facts are forgotten. You know that every story you speak aloud becomes known to whoever hears it, and that knowledge is a weapon you hand to strangers every time you open your mouth.',
  },
  {
    id: 'keeper',
    name: 'Keeper',
    concept: 'Divine Vessel / Fading Thread',
    description: 'The gods have grown quieter each generation. The Keeper holds the last thread of divine favor, acting in alignment with powers that may not answer much longer.',
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
    openingKnowledge: 'You know the prayers, and you know the silence that sometimes follows them. You know the gods were louder a generation ago, that your teacher\'s teacher spoke of visions that came clearly and often, and that now the divine connection thins like a river running dry. You know the churches preach certainty they no longer feel. You know the difference between faith and habit, and you know that what remains of divine power still answers, sometimes, if the need is genuine and the heart is aligned.',
  },
  {
    id: 'ranger',
    name: 'Ranger',
    concept: 'Wilderness Interpreter / Living Memory',
    description: "The forests remember what the cities forgot. The Ranger reads the land's scars and follows trails that predate every living map.",
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
      name: 'The Ranger\'s Mark',
      description: 'The perfect shot requires studying the target for a full round, observing them as prey. NPCs witnessing this feel it. Disposition gains slow for one chapter after each use.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
    openingKnowledge: 'You know the land the way a body knows breath: without thinking, without stopping. You know that the Thornwood has been wrong since spring, that the animals are moving in patterns that don\'t follow season or sense, and that the old trails your predecessors mapped now lead to places that weren\'t there a year ago. You know the forests remember what the cities forgot. You know the scars in the earth where Ancient roads surface and vanish, and you know that following them is not always a choice.',
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
  tagline: 'The world is older than it remembers. What was lost has a price. Pay it anyway.',
  available: true,
  species: fantasySpecies,
  speciesLabel: 'Folk',
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
    setting: 'The world is forgetting itself. The Five Kingdoms still stand, the Accord of Thorns still holds on paper, but the knowledge that built this civilization is disappearing. Ancient ruins dot every kingdom, libraries no one can read, machines no one can operate, inscriptions in languages that died with the Sundering. The Dragonkin remember fragments through oral tradition and inherited dream-memory, but even their knowledge is incomplete, fading with each generation. Magic is not ascending; it is echo. Every spell cast draws on a diminishing reservoir that no one knows how to replenish. The Collegium studies what remains but understands less each decade. The churches preach about gods whose names they may have wrong. The wilderness reclaims what civilization can no longer maintain. The Accord of Thorns is fraying not because of politics alone, but because the shared knowledge that made cooperation possible is gone. Border lords dispute treaties written in a legal language no living scholar fully commands. The world is not ending in fire. It is ending in forgetting.',
    vocabulary: 'Use grounded fantasy language: stone and timber, torches and lanterns, horses and carts. Magic has a physical cost, fatigue, nosebleeds, trembling. Spells are cast or invoked, not activated. Weapons are steel, iron, or enchanted. Currency is gold, silver, copper. Avoid modern idioms.',
    toneOverride: 'Adjust tone: Epic (70%), Gritty (20%), Witty (10%). The grandeur is real, ancient halls, vast forests, the weight of prophecy. The grit grounds it: mud on boots, hunger on the road.',
    assetMechanic: `## THE FELLOWSHIP\n\nThe player's companions are the genre's signature asset. Unlike a ship or retinue, the fellowship is made of people with their own arcs, secrets, and breaking points. Each companion should have:\n- A reason they joined (personal stake in the chapter's hook)\n- A secret that becomes relevant later\n- A vulnerability that triggers under specific player decisions\n- An arc that resolves alongside the main plot\n\nCompanions are tracked as crew NPCs with tempLoad. High-stakes events distribute load across the fellowship. Recovery requires personal scenes, not just rest. The fellowship doesn't degrade automatically between chapters (unlike Grimdark), but it fractures when the player ignores individual companions' needs.\n\nWhen introducing companions, give them opinions. They aren't followers — they're allies with their own reasons for being here. A companion who disagrees with the player's decision is more valuable than one who agrees.`,
    traitRules: `## TRAIT RULES\n\n- **Arcane Surge:** On nat 1 spell checks, wild magic surges. GM picks a random effect.\n- **Bardic Echo:** GM determines effect of story or song. Requires speech — useless when silenced. Memory cost: stories invoked become known to whoever heard them. Skilled NPCs can use that knowledge against the Herald later.\n- **Divine Favor:** GM silently tracks deity alignment. In alignment: full power. Against: half.\n- **The Price of Shadows:** The Shadowblade vanishes through somewhere and brings something back. After each use, the GM places a small detail in the next scene that came from wherever they stepped through. Sometimes useful. Sometimes wrong.\n- **Oath Burden:** The Warden's bonus attack comes from invoking a sworn duty. After the surge, they must keep one promise made during the chapter or lose access to the trait next chapter. Strength bound by obligation.\n- **The Ranger's Mark:** The perfect shot requires studying the target for a full round, observing them as prey. NPCs witnessing this feel it. Disposition gains slow for one chapter after each use.`,
    consumableLabel: 'Potions, salves, scrolls, antidotes',
    tutorialContext: 'The opening chapter introduces a settlement, one ally, and a local problem hinting at something larger. First check: social or investigation. First combat: bandits, beasts, or undead.',
    npcVoiceGuide: 'Nobles: formal, indirect, power through what they don\'t say. Soldiers: direct, rank-aware, duty and obligation. Scholars: precise, irritated by imprecision. Common folk: practical, concrete terms. Clergy: measured, parable-prone.',
    buildAssetState: null,
    investigationGuide: 'Lore codex — prophecy fragments, historical connections, magical phenomena, ancient texts, ruin surveys.\n\nInvestigation in this genre is archaeology under pressure. The player isn\'t gathering evidence; they\'re recovering knowledge that was deliberately or accidentally lost.\n\nThe truth is older than the question. What you\'re investigating turns out to be a recurrence of something that happened before, repeatedly. Finding the pattern is the breakthrough.\n\nSources are fragments. No source is complete. Every NPC scholar, every library, every ruin holds part of the story — and the parts contradict each other in ways that are themselves clues.\n\nTranslation matters. Language is a barrier. Old texts require interpretation, and interpretation introduces error. Some clues are mistranslations of older clues.\n\nThe gatekeeper is dead. The person who knew the whole truth died long ago. The investigation is about reconstructing their knowledge from what they left behind — letters, students, marginalia in books they owned.',
  },
  deepLore: `## THE WORLD

**The Sundering.** Something broke the connection between the present and the deep past. Scholars disagree on when, how, and whether it is still happening. The evidence is in the ruins: cities built with techniques no living mason understands, inscriptions in languages that died with whatever civilization wrote them, machines that hum when approached but do nothing anyone can decipher. The Sundering is not an event in the past; it is an ongoing condition. Knowledge degrades. Magic weakens. The connection between the living world and whatever came before grows thinner each generation. Some scholars believe it can be reversed. Others believe it is accelerating. The Collegium officially takes no position, which is itself a position.

**The Five Kingdoms.** Thornwall in the north: military, pragmatic, the shield against whatever comes from the highlands. Crestlands in the east: mercantile, wealthy, built on trade routes that predate the Sundering. Meridia in the south: the cultural heart, the great universities, the Collegium\'s home. The Pale March in the west: sparse, hard, populated by people who distrust institutions because institutions have never reached them. The Heartlands in the center: the oldest settlements, the deepest ruins, the kingdom that claims to be the heir of whatever came before. The Accord of Thorns binds them in mutual defense, but the Accord was written in a legal language no living scholar fully commands, and the border lords interpret its terms to suit their needs.

**The Collegium.** A multi-kingdom institution, part university, part archive, part intelligence service. The Collegium preserves what knowledge remains and studies what it cannot understand. Its archives are vast but increasingly illegible. Fewer scholars each decade can read the older texts. The Collegium knows less than it did a century ago, and the rate of loss is accelerating. Its political neutrality is genuine but fragile; every kingdom wants the Collegium\'s knowledge, and none want to fund it adequately.

**Magic as Echo.** Magic in this world is not ascending; it is residue. Every spell draws on a diminishing reservoir that no one knows how to replenish. The physical cost is real: nosebleeds, tremors, fatigue, and for sustained casting, temporary sensory loss. The Collegium\'s oldest records describe magic as effortless. Current practitioners describe it as pulling water from a drying well. Some spells that worked a generation ago no longer function. New discoveries are not innovations; they are recoveries of lost techniques, and each recovery is smaller than the last.

**Ancient Ruins.** Every kingdom has them. They predate the Sundering, built by a civilization whose name is lost. The inscriptions are in dead languages. The architecture follows principles no living engineer can explain. Some ruins are inert. Others respond to proximity, to magic, to specific words spoken in languages the speaker does not know. The ruins are not dungeons; they are evidence. Whatever built them understood things the current world has forgotten, and the Sundering erased the connection between that knowledge and anyone who could use it.

**The Gods.** The divine connection is thinning. Priests a generation ago spoke of clear visions, direct guidance, unmistakable presence. Current priests describe echoes, impressions, and the growing suspicion that the names they use for the gods may not be the right ones. Divine magic still functions, but it is weaker, less reliable, and increasingly conditional. The churches preach certainty they no longer feel. Some theologians believe the gods are dying. Others believe they are withdrawing. The Keepers, who hold the last threads of divine favor, know only that what answers their prayers is quieter each year.`,
  guideNpcDirective: 'The opening NPC is a local who knows the land but not the old knowledge. They speak practically: "The forest has been wrong since spring," not "The magical substrate is degrading." Describe symptoms, not causes.',
  loreFacets: {
    'court-political': 'In this scene: nobles speak in implications and inherited grudges. The Accord of Thorns is invoked as authority by people who haven\'t read it. Power is measured in land, oaths, and the soldiers who enforce both. Hospitality is a binding contract. Insults are remembered across generations.',
    collegium: 'In this scene: scholars are precise, frustrated by imprecision, and haunted by the gap between what the archives contain and what they can understand. Knowledge is both sacred and inadequate. Every answer raises a question the previous generation could have answered but this one cannot. The institution preserves what it can no longer fully explain.',
    'ruin-ancient': 'In this scene: the ruins are not empty; they are waiting. Describe what remains: inscriptions that glow faintly when read aloud, doors that open to specific words in dead languages, machinery that hums but does not function. The architecture follows rules no living builder understands. The danger is not traps; it is the disorientation of encountering intelligence that predates everything you know.',
    'wild-forest': 'In this scene: the wilderness is not scenery; it is a living system that remembers what the cities forgot. Animals behave in patterns that don\'t follow natural logic. Old trails lead to places that weren\'t there last season. The forest does not threaten; it simply does not care whether you survive. Describe the sensory world: the quality of light, the sound of wind through canopy, the wrongness of silence where birdsong should be.',
    'divine-sacred': 'In this scene: the divine is present but fading. Temples feel hollow in ways the architecture doesn\'t explain. Prayers are answered with impressions, not words. The priests speak with conviction that costs them effort to maintain. Describe the gap between the ritual and its effect: the candle lit for a god whose name may be wrong, the blessing spoken into silence that was once filled with response.',
    'dragonkin-memory': 'In this scene: the dragonkin carry fragments of pre-Sundering knowledge as inherited dream and instinct. They recognize ruin layouts from dreams. They speak phrases in dead languages without knowing the grammar. This knowledge is powerful and unreliable, vivid and incomplete. Describe it as sensation: the déjà vu of standing in a room your body remembers but your mind has never seen.',
  },
  loreAnchors: [
    'The Sundering=something broke the connection to the deep past. Still happening. Knowledge degrades, magic weakens, ruins remain illegible. Scholars disagree on everything except that it is getting worse.',
    'Five Kingdoms=Thornwall (military north), Crestlands (mercantile east), Meridia (cultural south, Collegium\'s home), Pale March (sparse west), Heartlands (oldest settlements, deepest ruins).',
    'Accord of Thorns=binds the kingdoms in mutual defense. Written in a legal language no living scholar commands. Border lords interpret to suit their needs.',
    'The Collegium=multi-kingdom archive and university. Preserves knowledge it can no longer fully explain. Fewer scholars each decade can read the older texts.',
    'Magic=residue, not ascending. Draws on a diminishing reservoir. Physical cost: nosebleeds, tremors, fatigue. Some spells that worked a generation ago no longer function.',
    'Ancient Ruins=predate the Sundering. Dead language inscriptions. Architecture that follows principles no one understands. Some respond to proximity or spoken words.',
    'The Gods=quieter each generation. Priests describe echoes where their teachers described visions. Divine magic weaker, less reliable, increasingly conditional.',
    'Dragonkin Memory=inherited dream-knowledge from before the Sundering. Maps to ruin layouts, surfaces as instinct. Powerful and unreliable.',
    'The Thornwood=has been wrong since spring. Animals move in unnatural patterns. Old trails lead to new places. The forest remembers what the cities forgot.',
    'Gold (gp)=kingdom-minted. The trade economy of the Five Kingdoms.',
    'Wyrm Kingdoms=fell three centuries ago. The fear remains. Dragonkin carry fragments of what was lost.',
  ],
  cohesionGuide: 'In fantasy, cohesion is the fellowship bond. +1: shared hardship endured together, player consulting companions before major decisions, moments of vulnerability or trust between party members. -1: treating companions as tools, making unilateral decisions that affect the group, dismissing a companion\'s personal stakes. Companions in this genre have their own arcs — cohesion tracks whether the player is part of those arcs or just using the people in them.',
  companionLabel: 'Companions',
  notebookLabel: 'Codex',
  intelTabLabel: 'Lore',
  intelNotebookLabel: 'Research',
  intelOperationLabel: 'Quest',
  explorationLabel: 'Dungeon',
  openingHooks: [
    // Universal
    { hook: 'A child in the village speaks fluent Old Arcane in her sleep. She\'s never heard the language. The village priest wants her examined. The local lord wants her taken. The girl wants someone who can tell her what she\'s saying.', title: 'The Old Tongue', frame: { objective: 'Discover what the child is saying and where it comes from', crucible: 'A priest, a lord, and a frightened girl, each pulling in a different direction' }, arc: { name: 'The Old Tongue', episode: 'Hear the child speak and translate enough to understand the source' } },
    { hook: 'An ancient road has appeared in the forest overnight. Stone-paved, perfectly preserved, leading somewhere that wasn\'t there yesterday. Three woodsmen have walked it. None have come back. The road is still there.', title: 'The Road', frame: { objective: 'Follow the road and find the missing woodsmen', crucible: 'A pre-Sundering road that materialized overnight, and everyone who walks it vanishes' }, arc: { name: 'The Road', episode: 'Walk the road and discover where it leads and what happened to the woodsmen' } },
    { hook: 'A scholar at the Collegium dies under suspicious circumstances. Her last research notes describe a place she calls \'the second library\' — and she writes about it as if you\'ve already been there together. You\'ve never met her.', title: 'The Second Library', frame: { objective: 'Find the second library the scholar described', crucible: 'A dead scholar who knew your name and wrote about a place you\'ve never been' }, arc: { name: 'The Second Library', episode: 'Investigate the scholar\'s death and decipher her research notes' } },
    { hook: 'Miners in the foothills broke through into a sealed chamber last week. The inscriptions inside are in a language no one can read, but the drawings are clear enough: warnings. The miners ignored them. Yesterday the foreman\'s daughter walked into the chamber and hasn\'t come back. Two men went after her. They came back speaking a language they don\'t know, writing symbols on the walls of their homes. The village sealed the mine entrance. This morning, the foreman\'s daughter\'s voice echoed from inside, calling names — names of people who died before anyone in the village was born.', title: 'The Sealed Chamber', frame: { objective: 'Enter the mine and bring back the foreman\'s daughter', crucible: 'Something in the chamber is teaching people things they shouldn\'t know, and it\'s using a child\'s voice to draw more in' }, arc: { name: 'The Sealed Chamber', episode: 'Enter the mine, find the girl, and understand what the inscriptions were warning against' } },
    // Shadowblade — shadow walker/threshold crosser, Price of Shadows trait, DEX primary
    { hook: 'A merchant hired the company to escort a cart through the Thornwood. Simple job. But the lock on the cart is one you recognize — guild-work, the kind used to seal things people kill to protect. And the merchant keeps looking over his shoulder.', title: 'Guild-Work', classes: ['Shadowblade'], frame: { objective: 'Get the cart through the Thornwood and learn what\'s inside', crucible: 'A guild lock means guild cargo, and the merchant\'s fear means someone else wants it' }, arc: { name: 'The Guild Cart', episode: 'Escort the cart and discover what the merchant is really transporting' } },
    { hook: 'Someone broke into the duke\'s treasury last night using techniques only a handful of people know. You\'re one of them. The duke\'s men are already asking questions, and the real thief left behind a calling card that looks uncomfortably like yours.', title: 'Your Calling Card', classes: ['Shadowblade'], frame: { objective: 'Find the real thief before the duke\'s men find you', crucible: 'Your techniques, your calling card, and someone who wants you blamed for it' }, arc: { name: 'Your Calling Card', episode: 'Examine the crime scene and identify who knows your methods well enough to copy them' } },
    { hook: 'A dying man presses a key into your hand in a crowded market. "The vault under the old courthouse. Before the full moon." He\'s dead before you can ask what\'s in it — or who\'s already looking for it.', title: 'Before the Moon', classes: ['Shadowblade'], frame: { objective: 'Open the vault before the full moon', crucible: 'A dead man\'s key, a ticking deadline, and no idea who else is looking' }, arc: { name: 'Before the Moon', episode: 'Locate the vault beneath the courthouse and assess what\'s guarding it' } },
    // Warden — sworn protector/last guardian, Oath Burden trait, STR primary
    { hook: 'A warlord\'s army is three days from the city. The council offers you command of the defense — but you recognize the warlord\'s banner. You served under it once.', title: 'Old Banners', classes: ['Warden'], frame: { objective: 'Prepare the city\'s defense before the army arrives', crucible: 'Three days to fortify a city against someone who knows how you fight' }, arc: { name: 'Old Banners', episode: 'Assess the city\'s defenses and decide whether to seek parley or prepare for siege' } },
    { hook: 'The garrison at Thornwall hasn\'t sent a rider in two weeks. The road north is open, the weather is clear, and no one will say why they stopped sending reports. The crown wants someone to ride up and find out.', title: 'Silent Garrison', classes: ['Warden'], frame: { objective: 'Reach Thornwall and find the garrison', crucible: 'Two weeks of silence from a fortress that should be running normally' }, arc: { name: 'The Silent Garrison', episode: 'Ride to Thornwall and discover why the garrison stopped reporting' } },
    { hook: 'A knight you once served with arrives at your camp, wounded and alone. His company was ambushed escorting a prisoner. The prisoner escaped. The knight says the prisoner must be found before dawn — not because of what he did, but because of what he knows.', title: 'Before Dawn', classes: ['Warden'], frame: { objective: 'Track the escaped prisoner before dawn', crucible: 'A wounded friend, an escaped prisoner with dangerous knowledge, and hours until sunrise' }, arc: { name: 'Before Dawn', episode: 'Tend the knight\'s wounds, learn what the prisoner knows, and pick up the trail' } },
    // Arcanist — spell archaeologist/lost knowledge seeker, Arcane Surge trait, INT primary
    { hook: 'A map found in a dead adventurer\'s pack leads to a hidden entrance beneath an ancient watchtower. The markings are in a language nobody in the company reads — except you. It\'s a dialect of Old Arcane that was supposed to have died with the Sundering.', title: 'Dead Language', classes: ['Arcanist'], frame: { objective: 'Enter the watchtower and translate what you find', crucible: 'A dead language on a map that leads underground, and you\'re the only one who can read it' }, arc: { name: 'The Dead Language', episode: 'Translate the map, locate the entrance, and descend into the watchtower' } },
    { hook: 'Your spell misfired last night. Not a wild surge — something answered. A voice in the residual energy, speaking words you didn\'t cast. Your focus crystal is still warm this morning, and it shouldn\'t be.', title: 'Something Answered', classes: ['Arcanist'], frame: { objective: 'Identify what responded to your spell', crucible: 'Something in the magical substrate spoke back, and your focus crystal is still resonating' }, arc: { name: 'Something Answered', episode: 'Replicate the conditions and attempt controlled contact with whatever responded' } },
    { hook: 'A sealed archive beneath the Collegium has been opened for the first time in a century. Three scholars went in to catalog the contents. One came back, unable to speak. The Collegium is asking for someone with practical experience to go in after the other two.', title: 'The Sealed Archive', classes: ['Arcanist'], frame: { objective: 'Enter the archive and find the two missing scholars', crucible: 'A century-sealed archive that silenced one scholar and swallowed two more' }, arc: { name: 'The Sealed Archive', episode: 'Enter the archive, find the scholars, and understand what silenced the survivor' } },
    // Herald — lorekeeper/story wielder, Bardic Echo trait, CHA primary
    { hook: 'Two lords on the edge of war have agreed to meet — but only if you broker the terms. One of them saved your life once. The other is married to the person who betrayed you. Both know your name.', title: 'Both Sides', classes: ['Herald'], frame: { objective: 'Broker terms before the lords walk away', crucible: 'Personal debts and grudges tangled into a negotiation that could prevent a war' }, arc: { name: 'Both Sides', episode: 'Meet both lords separately and find terms they might accept' } },
    { hook: 'A song you wrote three years ago about a dead king has resurfaced. Someone is performing it in every tavern from here to the capital, and the lyrics have been changed. The new version names a living lord as the killer. People believe it because your name is on it.', title: 'Changed Lyrics', classes: ['Herald'], frame: { objective: 'Find who changed the song and stop it spreading', crucible: 'Your name gives the altered song credibility, and a living lord is being accused of murder' }, arc: { name: 'Changed Lyrics', episode: 'Track who altered the lyrics and learn whether the accusation is true' } },
    { hook: 'A minor noble offers the company winter quarters and full pay to perform one task: deliver a marriage proposal to a neighboring house. The catch — the bride has already refused twice, and the last messenger came back missing three fingers.', title: 'Third Proposal', classes: ['Herald'], frame: { objective: 'Deliver the proposal and return intact', crucible: 'Two refusals and a mutilated messenger suggest the bride\'s house doesn\'t want this alliance' }, arc: { name: 'The Third Proposal', episode: 'Reach the neighboring house and learn why the proposal keeps being refused with violence' } },
    // Keeper — divine vessel/fading thread, Divine Favor trait, WIS primary
    { hook: 'The healer who saved your life asks one favor in return: escort her to a temple that her own church has declared heretical. She says the temple holds a cure for the eastern plague. The church says it holds something worse.', title: 'The Heretical Cure', classes: ['Keeper'], frame: { objective: 'Reach the heretical temple and judge for yourself', crucible: 'Your faith says the temple is forbidden; the healer says it holds the only cure' }, arc: { name: 'The Heretical Cure', episode: 'Travel to the temple and determine whether it holds a cure or a threat' } },
    { hook: 'A village priest sends word that the dead in his churchyard aren\'t staying dead. Not undead — breathing, confused, remembering nothing. The church hierarchy wants the village quarantined. The priest wants someone who can tell healing from abomination.', title: 'The Breathing Dead', classes: ['Keeper'], frame: { objective: 'Examine the risen dead and determine the cause', crucible: 'People returning to life without memory, and the church would rather quarantine than understand' }, arc: { name: 'The Breathing Dead', episode: 'Examine the risen villagers and identify what brought them back' } },
    { hook: 'A wounded soldier is carried into camp. The wound is cursed — it won\'t close, and conventional healing accelerates the decay. The soldier carries orders that must reach the capital in three days. Healing him means understanding the curse. Understanding the curse means finding who cast it.', title: 'Cursed Wound', classes: ['Keeper'], frame: { objective: 'Break the curse and get the soldier moving', crucible: 'Healing makes it worse, time is running out, and the caster is still out there' }, arc: { name: 'The Cursed Wound', episode: 'Diagnose the curse\'s mechanics and trace it back to its source' } },
    // Ranger — wilderness interpreter/living memory, Ranger's Mark trait, DEX primary
    { hook: 'The Thornwood is moving. Not growing — moving. The tree line has advanced half a mile in a week, swallowing farmland. Livestock that wanders in doesn\'t come back. The locals say the forest is angry. The tracks you found at the new edge say something in the forest is hunting.', title: 'The Moving Wood', classes: ['Ranger'], frame: { objective: 'Enter the Thornwood and find what\'s driving it forward', crucible: 'A forest that advances like an army, and something inside it is actively hunting' }, arc: { name: 'The Moving Wood', episode: 'Cross the new tree line, track the predator, and understand why the forest is expanding' } },
    { hook: 'A hunting party went into the highlands a week ago and hasn\'t returned. You found their camp — abandoned, gear intact, food still on the fire. No blood, no struggle. But the tracks leading away from camp aren\'t human, and they\'re heading toward the nearest village.', title: 'Cold Camp', classes: ['Ranger'], frame: { objective: 'Follow the tracks before they reach the village', crucible: 'Non-human tracks heading toward a settlement, and the hunters are gone without a trace' }, arc: { name: 'The Cold Camp', episode: 'Follow the tracks from the abandoned camp and identify what took the hunters' } },
    { hook: 'Something has been killing wolves in the eastern range. Not hunters — the kills are too clean, too deliberate, and the bodies are arranged in patterns. Whatever is doing this is working its way down the food chain. The wolves were the largest predator in the area. The next largest is the livestock.', title: 'The Pattern', classes: ['Ranger'], frame: { objective: 'Identify the predator before it reaches the farms', crucible: 'Methodical kills arranged in patterns suggest intelligence, not instinct' }, arc: { name: 'The Pattern', episode: 'Study the kill sites, decode the arrangement, and track the predator toward the farms' } },
  ],
  initialChapterTitle: 'The First Step',
  locationNames: [
    'The Ashen Company', 'The Thorn Vanguard', 'The Wayward Oath',
    'The Last Watch', 'The Ember March', 'The Broken Crown',
    'The Dusk Accord', 'The Silver Vigil', 'The Iron Covenant', 'The Pale Banner',
  ],
  npcNames: [
    'Eowen', 'Calder', 'Brynn', 'Thessa', 'Rowan', 'Kellan', 'Mirth', 'Aldwen',
    'Sorrel', 'Cael', 'Arden', 'Lirael', 'Tiernan', 'Morvaine', 'Glynn', 'Eira',
    'Corwin', 'Daeris', 'Fennel', 'Islene', 'Branwen', 'Taliesin', 'Neve',
    'Gareth', 'Elowynn', 'Bereth', 'Cirin', 'Morwenna', 'Taran', 'Aelwen',
    'Ossian', 'Rhiannon', 'Kedrin', 'Wrennen', 'Lowen',
  ],
}


export default fantasyConfig
