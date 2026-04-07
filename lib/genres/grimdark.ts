import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Grimdark ─────────────────────────────────────────────────────────

const grimdarkSpecies: Species[] = [
  {
    id: 'house-veldran',
    name: 'House Veldran',
    description: 'Merchant nobility. Politically dominant, widely spread, no special bloodline traits.',
    lore: 'Wealth is the only bloodline that matters, and Veldran has more of it than anyone. The name opens ledgers, not hearts — merchants cooperate, commoners resent, and rival houses scheme. Start with one Veldran trade agent at Favorable. House Ashfang as a faction starts at Wary (old debts from the Wyrm war reparations). Advantage on checks involving commerce, bribes, or reading financial motives. The cost: everyone assumes you\'re buying loyalty, not earning it. Common folk start at Wary — wealth breeds resentment. Hard constraint: first transaction with any new NPC is at disadvantage until you\'ve established a non-financial relationship. Money works, but only after trust.',
    startingContacts: [
      { role: 'trade agent', disposition: 'favorable', description: 'A Veldran trade agent who manages commercial interests across the provinces', affiliation: 'House Veldran' },
      { role: 'rival faction representative', disposition: 'wary', description: 'House Ashfang remembers the Wyrm war reparations and the debts still owed', affiliation: 'House Ashfang' },
    ],
  },
  {
    id: 'house-sylvara',
    name: 'House Sylvara',
    description: 'Ancient woodland bloodline. Long-lived, keen-eyed, patient to a fault.',
    lore: 'Sylvara patience comes from outliving everyone who rushed. Courts respect the name; frontier camps don\'t. Your calm reads as arrogance to people who are hungry now. Start with one Sylvara elder at Favorable (distant, but responsive to the house name). House Veldran as a faction starts at Wary (Sylvara patience has cost Veldran money for generations). Advantage on Perception and Insight checks — you\'ve learned to watch before you act. Frontier and common-folk NPCs start at Wary. Earning trust takes twice as many positive interactions. Hard constraint: disposition advances require two positive interactions instead of one. But disposition drops also require two negative interactions — patience cuts both ways.',
    startingContacts: [
      { role: 'elder advisor', disposition: 'favorable', description: 'A distant Sylvara elder, responsive to the house name but rarely seen in person', affiliation: 'House Sylvara' },
      { role: 'rival faction representative', disposition: 'wary', description: 'House Veldran resents Sylvara patience, which has cost them money for generations', affiliation: 'House Veldran' },
    ],
  },
  {
    id: 'house-stonemark',
    name: 'House Stonemark',
    description: 'Mountain clan bloodline. Dense-boned, blunt-spoken, legendary craftsmen.',
    lore: 'A Stonemark word is a Stonemark bond — generations of debts honored, promises kept, enemies remembered. Trade guilds deal with you on reputation alone. But bluntness is a liability when subtlety matters: you say what you mean, and everyone knows it. Start with one guild or clan contact at Favorable. House Sylvara as a faction starts at Wary (centuries of mountain-court friction — Stonemark bluntness offends Sylvara sensibility). Advantage on CON saves and Engineering/Crafting checks. Disadvantage on Deception — your culture considers lying a form of cowardice, and your face agrees.',
    startingContacts: [
      { role: 'guild craftmaster', disposition: 'favorable', description: 'A trade guild contact who deals with Stonemark on reputation alone', affiliation: 'Stonemark Clan' },
      { role: 'rival faction representative', disposition: 'wary', description: 'House Sylvara finds Stonemark bluntness offensive, centuries of mountain-court friction', affiliation: 'House Sylvara' },
    ],
  },
  {
    id: 'oathless',
    name: 'The Oathless',
    description: 'Broken oath. Expelled, fled, or disgraced from a landed house.',
    lore: 'You had a name, a seat, obligations, and you lost them. Maybe you broke a sworn pact. Maybe you refused an order that would have kept your standing. Maybe you were framed. The reason matters to you; it doesn\'t matter to anyone else. The houses see a traitor. The streets see someone with useful skills and no protection. Start with one contact from your former house at Hostile (the people you wronged or who wronged you — they remember). One underworld contact at Favorable (the networks that absorb the disgraced). Advantage on checks involving survival outside institutional structures — you\'ve learned to operate without a safety net. Disadvantage on initial social checks with any landed house — the Oathless are marked, and house loyalty is the currency of this world. Your former house\'s name comes up in conversation more than you\'d like.',
    startingContacts: [
      { role: 'former house enforcer', disposition: 'hostile', description: 'Someone from your former house who remembers what you did, or what was done to you' },
      { role: 'underworld fixer', disposition: 'favorable', description: 'A contact in the networks that absorb the disgraced, useful and discreet' },
    ],
  },
  {
    id: 'house-ashfang',
    name: 'House Ashfang',
    description: 'Fallen bloodline. Scaled, fast, remnants of the Char Dominion.',
    lore: 'The Char Dominion burned three centuries ago, but the fear is fresh. Ashfang are fast, imposing, and carry a name that makes people reach for weapons. Some cooperate because they\'re afraid. Others refuse to cooperate for the same reason. Start with one Ashfang exile contact at Favorable (scattered but loyal). The Church as a faction starts at Hostile (the Char Dominion burned temples; the Church has a long memory). House Veldran as a faction starts at Wary (they profited from the fall and don\'t want the past revisited). Advantage on Intimidation and Initiative. Most NPCs start at Wary — you are feared before you are known. Breaking through to Trusted requires proof of character, not just words. Hard constraint: Persuasion that relies on good faith (not leverage or intimidation) is at disadvantage. People cooperate from fear, not trust.',
    startingContacts: [
      { role: 'exile kin', disposition: 'favorable', description: 'A scattered Ashfang exile, fiercely loyal to those who share the bloodline', affiliation: 'House Ashfang' },
      { role: 'church inquisitor', disposition: 'hostile', description: 'The Church of the Pale Flame burned temples three centuries ago and remembers who lit the fires', affiliation: 'The Church' },
      { role: 'rival faction merchant', disposition: 'wary', description: 'House Veldran profited from the Char Dominion\'s fall and prefers the past stay buried', affiliation: 'House Veldran' },
    ],
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
    assetMechanic: `## THE COMPANY\n\nThe company is your mercenary band. Five dimensions tracked at L1-L3:\n- Strength: fighters, equipment, combat capability. Upgrade through recruitment and victories.\n- Morale: will to fight, unit cohesion under pressure. Upgrade through paid contracts and victories. Degrades without pay or after defeats.\n- Reputation: who knows you, whether they hire or avoid. Upgrade through visible successes. Damaged by broken contracts.\n- Intelligence: scouts, informants, advance warning. Upgrade through recruiting specialists.\n- Provisions: supplies, medical stores, operational endurance. Consumed by operations. Replenished by contracts.\n\nThe company degrades between chapters without maintenance. Propose 2-3 ways to maintain or upgrade the company at chapter transitions.\n\nEach dimension should have a named NPC attached (the sergeant, the quartermaster, the scout, etc.). Upgrading a dimension means investing in the person who runs it.`,
    traitRules: `## TRAIT RULES\n\n- **Corruption Tap:** Each use darkens reputation. Cumulative, never resets. The Hexblade's power has a permanent social cost.\n- **Leverage:** Requires prior interaction or intel. Secret cuts both ways. The target remembers, and the relationship is permanently changed.\n- **Bitter Medicine:** Every heal has a side effect: nausea, hallucinations, or dependency. The GM chooses. Nothing is free.\n- **The Question:** Requires 1+ rounds of dialogue. WIS save failure reveals one truth. Success: they know you tried. Failed interrogations have social consequences.\n- **Marked:** Designate one target per day. First hit deals +1d6 bonus damage. The choice of who to mark is the moral weight.\n- **Last Standing:** Drop to 1 HP instead of 0, once per day. No strings. The Ironclad's reliability is the point.`,
    consumableLabel: 'Poultices, blasting powder, antitoxin, bandages',
    tutorialContext: 'The opening chapter introduces a morally compromised situation, one conditional NPC, and a job where success and failure both cost. First check: social or investigation. First combat: human enemies. Open in a burned village, a tavern with a wanted poster, or the aftermath of a skirmish. Introduce a morally complex NPC early — someone who needs the company but cannot be fully trusted.',
    npcVoiceGuide: 'Mercenaries: gallows humor, fatalistic. Nobles: self-justifying, every order framed as necessity. Priests: fervent or exhausted. Informants: paranoid, transactional. Common folk: resigned, distrust anyone with power.',
    buildAssetState: (ship, shipName) => {
      const systemsLine = ship.systems.map(s => `${s.name} L${s.level}: ${s.description}`).join('\n  ')
      const combatLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      return `\nCOMPANY: ${shipName}\n  ${systemsLine}\nCOMPANY TACTICS: ${combatLine}`
    },
    investigationGuide: `Journal of confessions — extracted testimony, names implicated, evidence of heresy or corruption.

Evidence is coerced, not discovered. Confessions come under pressure, testimony is traded for favors, documents are stolen rather than filed. Nobody volunteers the truth in this world — it has to be extracted, and extraction changes the relationship.

The faction clock is survival, not politics. The longer you investigate, the more dangerous it gets — witnesses die, evidence is burned, the target sends people after you. Every turn spent gathering evidence is a turn the target spends covering tracks.

Misdirection comes from NPCs lying for their own reasons, not from planted evidence. Everyone has a version of the truth that serves their interests. When testimonies contradict, the contradiction is itself a clue about who benefits from which version.

The gatekeeper clue is a person, not a document. Someone who knows the truth and will only share it for a price the player may not want to pay. The price is always moral, not financial.`,
  },
  cohesionGuide: 'In this genre, cohesion is conditional loyalty maintained by results. +1: successful contracts paid in full, captain taking risks the company needed, victories that vindicate hard choices. -1: broken contracts, mission failures the captain pushed for, mercy that costs the company resources or lives. Cohesion is brittle — it can be high but never feels secure, because the next failed contract could break it. The company degrades between chapters without maintenance.',
  companionLabel: 'Sworn',
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
    { hook: 'Three days ago, the company freed prisoners from a lord\'s dungeon. Good deed, clear conscience. This morning, two of them killed — one a rival, one an innocent witness. The lord\'s steward found you: "He wasn\'t keeping them in cages because he\'s cruel. He was keeping them in cages because he knew what they\'d do." Now the lord wants compensation, the dead witness\'s family wants justice, and two of the freed prisoners are asking for the company\'s protection.', title: 'The Mercy' },
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
  npcNames: [
    'Harven', 'Breck', 'Oswick', 'Dalla', 'Fenmark', 'Greth', 'Ulra', 'Morwen',
    'Tove', 'Aldwin', 'Sigra', 'Kord', 'Wulfric', 'Etta', 'Haldren', 'Maren',
    'Brant', 'Helga', 'Torsten', 'Gerta', 'Rickard', 'Edda', 'Osmund', 'Vitta',
    'Gorath', 'Brita', 'Leofric', 'Thyra', 'Caskwell', 'Anneke', 'Dunstan',
    'Ragna', 'Blaeric', 'Hildeth', 'Yoren',
  ],
}


export default grimdarkConfig
