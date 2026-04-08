import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Epic Sci-Fi ────────────────────────────────────────────────────

const epicSciFiSpecies: Species[] = [
  {
    id: 'minor-house',
    name: 'Minor House',
    description: 'Inside the machine, low on the ladder. Your house has few Resonants; gaining more is survival.',
    lore: 'You are of House Vael \u2014 minor by the standards that matter. Your family\'s Resonant allocation was halved two generations ago after a failed bid for a seat on the Conclave. Everything since has been recovery: marriages of convenience, trade concessions, and the slow erosion of pride in exchange for survival. You grew up watching your elders smile at people they despised.\nStart with one house retainer contact at Favorable, one rival house contact at Wary. Advantage on Persuasion checks involving trade, negotiation, or alliance-building \u2014 you learned to bargain before you learned to read. Vulnerability: your house name is recognized but not respected. Any Major House NPC\'s initial disposition is capped at Neutral; you must earn what others inherit.',
    startingContacts: [
      { role: 'House retainer', disposition: 'favorable', description: 'A loyal retainer of House Vael who served your family through the lean years.', affiliation: 'House Vael', npcRole: 'contact' },
      { role: 'Rival house scion', disposition: 'wary', description: 'A minor noble from a rival house who watches your movements with suspicion.', affiliation: 'Rival House', npcRole: 'contact' },
    ],
  },
  {
    id: 'synod-raised',
    name: 'Synod-Raised',
    description: 'Inside the church, trained in doctrine. You know how the machine identifies, trains, and controls Resonants.',
    lore: 'You were taken \u2014 or given \u2014 to the Synod\'s scholarium before you can clearly remember. You were taught doctrine, liturgy, the classification of attunement, and the nine signs of heresy. You know the testing protocols. You know the deployment schedules. You know what the Synod tells the houses and what it keeps for itself.\nStart with one Synod official contact at Favorable, one Undrift contact at Hostile (you represent everything they fear). Advantage on INT checks related to Resonant lore, Drift phenomena, and Synod procedure \u2014 you were trained in the institution\'s language. Vulnerability: the Synod tracks its own. Leaving their service is permitted but noted. Synod contacts will periodically check in, and refusing feels like refusing family. If you act against Synod interests, word reaches them within days, not weeks.',
    startingContacts: [
      { role: 'Synod instructor', disposition: 'favorable', description: 'A scholarium official who remembers you from training and still looks out for you.', affiliation: 'The Synod', npcRole: 'contact' },
      { role: 'Undrift fugitive', disposition: 'hostile', description: 'An unregistered Resonant who sees you as an extension of the institution that hunts them.', affiliation: 'Undrift Network', npcRole: 'contact' },
    ],
  },
  {
    id: 'undrift',
    name: 'Undrift',
    description: 'Outside the system, hunted. The Synod wants you found. The houses want you owned. You want to stay free.',
    lore: 'You slipped through. Maybe the testers missed you. Maybe someone hid you. Maybe you tested positive and your parents ran before the Synod came. You\'ve lived your whole life knowing that what you are is illegal, and that every institution in the Hegemony wants to own, use, or destroy you for it.\nStart with one Undrift network contact at Trusted \u2014 the underground that kept you alive. No institutional contacts; your first interaction with any house, Synod, or Imperial NPC starts at Wary. Advantage: access to the Undrift network \u2014 black-market Drift suppressants, safe houses, unregistered Resonant services. Things no institution will provide and no amount of money can buy through official channels. The advantage isn\'t power; it\'s freedom from the systems everyone else depends on. Vulnerability: you are hunted. The Synod has standing bounties for unregistered Resonants. Any use of Drift abilities in public risks exposure. Failed Drift checks have a secondary consequence: a Synod detection roll (DC scales with distance from Synod presence).',
    startingContacts: [
      { role: 'Undrift network contact', disposition: 'trusted', description: 'A handler in the underground network that kept you hidden and alive.', affiliation: 'Undrift Network', npcRole: 'contact' },
      { role: 'Synod inspector', disposition: 'wary', description: 'A low-level Synod field tester who patrols your sector, not yet aware of what you are.', affiliation: 'The Synod', npcRole: 'npc' },
    ],
  },
  {
    id: 'imperial-service',
    name: 'Imperial Service',
    description: 'Serves the Throne directly. You enforce the system without belonging to any house.',
    lore: 'You serve the Throne. Not a house, not the Synod, not yourself. You were recruited, trained, and deployed by an institution that considers personal loyalty a vulnerability and political ambition a disqualifying trait. You enforce the balance: the houses stay in line, the Synod stays in bounds, and the Hegemony holds together for another generation.\nStart with one Imperial intelligence contact at Favorable, one house contact at Neutral (they cooperate because they must, not because they trust you). Advantage on checks involving protocol, jurisdiction, and official authority \u2014 your clearance opens doors that rank alone cannot. Vulnerability: you are a tool of the Throne, and everyone knows it. Contacts from any faction assume you\'re reporting everything. Disposition advances are capped at Favorable with non-Imperial NPCs unless you actively demonstrate personal loyalty over institutional duty.',
    startingContacts: [
      { role: 'Senior intelligence officer', disposition: 'favorable', description: 'Your handler in Imperial intelligence who recruited and trained you.', affiliation: 'Imperial Service', npcRole: 'contact' },
      { role: 'House liaison', disposition: 'neutral', description: 'A house representative who cooperates with the Throne because they must, not because they trust you.', npcRole: 'contact' },
    ],
  },
  {
    id: 'ascendant',
    name: 'Ascendant',
    description: 'Climbing from nothing. Born Untuned, no house, no church, no connections. The system wasn\'t built for you.',
    lore: 'Born Untuned. No house. No church. No blood worth naming. You arrived here through talent, ruthlessness, someone\'s investment, or some combination that makes old-blood aristocrats uncomfortable. The system wasn\'t built for you, and everyone in the room knows it the moment you speak.\nStart with one mentor/patron contact at Favorable (whoever invested in your rise), one peer contact at Wary (someone who resents your presence in rooms they earned by birth). Advantage on checks where no established protocol exists \u2014 situations where noble birth, Synod training, or institutional backing would normally provide a template, but you\'re operating without one. You\'ve never had the luxury of doing things the expected way. Vulnerability: you have no safety net. Other origins can fall back on their house, their church, or their network. You fall back on the person who elevated you, and that debt has terms. Your patron contact will periodically call in favors, and refusing risks losing your only institutional protection.',
    startingContacts: [
      { role: 'Patron', disposition: 'favorable', description: 'The person who invested in your rise; their support comes with expectations and debts.', npcRole: 'contact' },
      { role: 'Resentful peer', disposition: 'wary', description: 'A noble-born peer who resents your presence in rooms they earned by birthright.', npcRole: 'contact' },
    ],
  },
  {
    id: 'spent-resonant',
    name: 'Spent Resonant',
    description: 'Survivor of the Ashen Wards. Classified as non-functional. Still here.',
    lore: 'The Ashen Wards house people who\'ve been used up \u2014 Resonants drained of attunement and discarded by the Synod. You survived. Officially, you\'re non-functional: your Drift signature reads as dead, your classification papers say "expended," and no one expects anything from you. Unofficially, you still have capacity. Not much, but enough to matter \u2014 and enough to make your classification retroactively fraudulent if anyone finds out.\nStart with one Ashen Ward contact at Favorable (someone who helped you survive inside), one Synod administrator at Neutral (they processed your discharge and don\'t look twice). Immune to standard Drift detection \u2014 your signature reads as dead. Institutional knowledge advantage on checks involving Synod procedures, Resonant handling protocols, or the internal workings of the attunement system (you\'ve seen it from the inside of its disposal mechanism). Vulnerability: demonstrating Drift capacity retroactively makes your classification fraud. You become evidence. The Synod doesn\'t want escaped Resonants \u2014 they want proof that the system works. A Spent Resonant who can still attune threatens the theological foundation that justifies the entire program.',
    startingContacts: [
      { role: 'Ashen Ward survivor', disposition: 'favorable', description: 'A fellow Ward resident who helped you survive the worst of it.', affiliation: 'Ashen Wards', npcRole: 'contact' },
      { role: 'Synod administrator', disposition: 'neutral', description: 'The bureaucrat who processed your discharge papers without a second glance.', affiliation: 'The Synod', npcRole: 'contact' },
    ],
  },
]

const epicSciFiClasses: CharacterClass[] = [
  {
    id: 'envoy',
    name: 'Envoy',
    concept: 'Diplomat / House Representative',
    primaryStat: 'CHA',
    proficiencies: ['Persuasion', 'Deception', 'Insight', 'History'],
    stats: { STR: 10, DEX: 11, CON: 11, INT: 14, WIS: 13, CHA: 17 },
    startingInventory: [
      { id: 'sealed_correspondence', name: 'Sealed Correspondence', description: 'House dispatches, leverage', quantity: 1 },
      { id: 'ceremonial_sidearm', name: 'Ceremonial Sidearm', description: 'Ornate, recognised as house weapon', quantity: 1, damage: '1d6' },
      { id: 'diplomatic_signet', name: 'Diplomatic Signet', description: 'Opens sealed doors, verifies identity', quantity: 1 },
      { id: 'drift_woven_garments', name: 'Drift-Woven Garments', description: 'Formal attire, +1 CHA social checks in court settings', quantity: 1 },
    ],
    startingCredits: 200,
    startingHp: 8,
    startingAc: 11,
    hitDieAvg: 4,
    trait: {
      name: 'Accord',
      description: 'Once per chapter, invoke formal authority or house name to halt a hostile encounter or force a negotiation. Fails on enemies who don\'t recognize the Hegemony.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'knight',
    name: 'Knight',
    concept: 'Military Officer / Protector',
    primaryStat: 'STR',
    proficiencies: ['Athletics', 'Intimidation', 'Perception', 'Heavy Weapons'],
    stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 13, CHA: 10 },
    startingInventory: [
      { id: 'house_blade', name: 'House Blade', description: 'Two-handed, house insignia on pommel', quantity: 1, damage: '1d10' },
      { id: 'shield_generator', name: 'Shield Generator', description: 'Personal, +2 AC', quantity: 1, charges: 3, maxCharges: 3 },
      { id: 'field_dressing', name: 'Field Dressing', description: 'Heals 1d6+2', quantity: 2, effect: 'heal 1d6+2' },
      { id: 'sworn_oath_token', name: 'Sworn Oath Token', description: 'Identifies you as sworn to a house or institution', quantity: 1 },
    ],
    startingCredits: 80,
    startingHp: 12,
    startingAc: 16,
    hitDieAvg: 6,
    trait: {
      name: 'Unbroken',
      description: 'Once per chapter, when reduced to 0 HP, drop to 1 HP instead.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'seeker',
    name: 'Seeker',
    concept: 'Synod Investigator / Heresy Hunter',
    primaryStat: 'INT',
    proficiencies: ['Investigation', 'Insight', 'Religion', 'Arcana (Drift Lore)'],
    stats: { STR: 10, DEX: 12, CON: 12, INT: 17, WIS: 14, CHA: 11 },
    startingInventory: [
      { id: 'inquisitors_codex', name: 'Inquisitor\'s Codex', description: 'Synod reference for identifying heresy and Drift anomalies', quantity: 1 },
      { id: 'attunement_scanner', name: 'Attunement Scanner', description: 'Detects Drift residue', quantity: 1, charges: 3, maxCharges: 3 },
      { id: 'binding_cuffs', name: 'Binding Cuffs', description: 'Drift-suppressing restraints', quantity: 1 },
      { id: 'resonance_spike', name: 'Resonance Spike', description: 'Short-range Drift-disrupting blade, doubles as attunement probe', quantity: 1, damage: '1d4' },
    ],
    startingCredits: 120,
    startingHp: 8,
    startingAc: 12,
    hitDieAvg: 4,
    trait: {
      name: 'Inquisition',
      description: 'Once per chapter, after 1+ rounds of dialogue, force a WIS save on the target. If they fail: they reveal one truth. If they resist: they know you tried.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'conduit',
    name: 'Conduit',
    concept: 'Resonant Operative / Attunement Specialist',
    primaryStat: 'WIS',
    proficiencies: ['Attunement', 'Perception', 'Survival', 'Meditation'],
    stats: { STR: 10, DEX: 12, CON: 13, INT: 13, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'drift_focus', name: 'Drift Focus', description: 'Personal attunement anchor, required for controlled Drift use', quantity: 1 },
      { id: 'suppressant_injector', name: 'Suppressant Injector', description: 'Blocks Drift detection for 1 hour', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'field_rations', name: 'Field Rations', description: '3 days of supplies', quantity: 3 },
      { id: 'worn_journal', name: 'Worn Journal', description: 'Personal observations on the Drift, coded', quantity: 1 },
    ],
    startingCredits: 60,
    startingHp: 9,
    startingAc: 12,
    hitDieAvg: 5,
    trait: {
      name: 'Drift Touch',
      description: 'Once per chapter, attune to sense hidden Resonants, disrupt Drift-powered tech, or perceive through walls. Each use leaves a trace the Synod can detect.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'veil',
    name: 'Veil',
    concept: 'Spy / Infiltrator',
    primaryStat: 'DEX',
    proficiencies: ['Stealth', 'Sleight of Hand', 'Deception', 'Tech (Security)'],
    stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
    startingInventory: [
      { id: 'silenced_sidearm', name: 'Silenced Sidearm', description: 'No audible report', quantity: 1, damage: '1d6' },
      { id: 'identity_kit', name: 'Identity Kit', description: '3 forged credentials, each single-use', quantity: 3 },
      { id: 'signal_scrambler', name: 'Signal Scrambler', description: 'Blocks local surveillance for 10 minutes', quantity: 1, charges: 2, maxCharges: 2 },
      { id: 'micro_lockpick_set', name: 'Micro-Lockpick Set', description: 'Advantage on lock-based checks', quantity: 1 },
    ],
    startingCredits: 140,
    startingHp: 8,
    startingAc: 14,
    hitDieAvg: 4,
    trait: {
      name: 'Ghost Protocol',
      description: 'Once per chapter, leave no trace on one security scan, witness memory, or official record.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
  {
    id: 'physik',
    name: 'Physik',
    concept: 'Resonant Physician / Bio-Artificer',
    primaryStat: 'WIS',
    proficiencies: ['Medicine', 'Investigation', 'Nature (Biology)', 'Insight'],
    stats: { STR: 10, DEX: 13, CON: 12, INT: 15, WIS: 17, CHA: 10 },
    startingInventory: [
      { id: 'medical_satchel', name: 'Medical Satchel', description: 'Full field kit, advantage on Medicine checks', quantity: 1 },
      { id: 'drift_degradation_scanner', name: 'Drift Degradation Scanner', description: 'Reads Resonant cellular damage, illegal outside Synod facilities', quantity: 1, charges: 3, maxCharges: 3 },
      { id: 'tincture_case', name: 'Tincture Case', description: 'Stimulant (+2 next check), sedative (pacifies non-hostile NPC), analgesic (heals 1d4)', quantity: 3 },
      { id: 'anatomists_notebook', name: 'Anatomist\'s Notebook', description: 'Detailed records of Resonant patients, deeply incriminating', quantity: 1 },
    ],
    startingCredits: 100,
    startingHp: 8,
    startingAc: 11,
    hitDieAvg: 4,
    trait: {
      name: 'Grim Prognosis',
      description: 'Once per chapter, heal 1d8+WIS, but treatment has a side effect chosen by the GM: pain, dependency, or temporary sense loss. Side effects are worse on patients with Drift exposure history.',
      usesPerDay: 1,
      usesRemaining: 1,
    },
  },
]

const epicSciFiTheme: GenreTheme = {
  logo: '/logo_epic-scifi.png',
  fontNarrative: "var(--font-newsreader), Georgia, serif",
  fontHeading: "var(--font-cinzel), Georgia, serif",
  fontSystem: "'Geist Mono', monospace",
  fontScale: 1.1,
  background: 'oklch(0.06 0.01 280)',
  foreground: 'oklch(0.90 0.02 60)',
  card: 'oklch(0.10 0.01 280)',
  cardForeground: 'oklch(0.90 0.02 60)',
  primary: 'oklch(0.65 0.18 85)',
  primaryForeground: 'oklch(0.06 0.01 280)',
  secondary: 'oklch(0.13 0.01 280)',
  secondaryForeground: 'oklch(0.80 0.02 60)',
  muted: 'oklch(0.11 0.01 280)',
  mutedForeground: 'oklch(0.60 0.02 60)',
  accent: 'oklch(0.50 0.15 300)',
  accentForeground: 'oklch(0.95 0.01 60)',
  destructive: 'oklch(0.55 0.20 25)',
  border: 'oklch(0.18 0.01 280)',
  input: 'oklch(0.12 0.01 280)',
  ring: 'oklch(0.65 0.18 85)',
  narrative: 'oklch(0.88 0.02 60)',
  meta: 'oklch(0.48 0.05 240)',
  success: 'oklch(0.65 0.15 145)',
  warning: 'oklch(0.72 0.10 70)',
  tertiary: 'oklch(0.55 0.12 300)',
  tertiaryForeground: 'oklch(0.06 0.01 280)',
  titleGlow: '0 0 40px oklch(0.70 0.18 85 / 0.7), 0 0 80px oklch(0.70 0.18 85 / 0.3)',
  actionGlow: '0 0 0 1px rgba(180,150,50,0.25), 0 0 15px -3px rgba(180,150,50,0.2)',
  actionGlowHover: '0 0 0 1px rgba(180,150,50,0.5), 0 0 20px -3px rgba(180,150,50,0.35)',
  scrollbarThumb: 'oklch(0.20 0.01 280)',
  scrollbarThumbHover: 'oklch(0.26 0.01 280)',
  backgroundEffect: 'drift',
}

const epicSciFiConfig: GenreConfig = {
  id: 'epic-scifi',
  name: 'Epic Sci-Fi',
  tagline: 'Power has a price. Someone always pays.',
  available: true,
  species: epicSciFiSpecies,
  speciesLabel: 'Origin',
  classes: epicSciFiClasses,
  theme: epicSciFiTheme,
  currencyName: 'writs',
  currencyAbbrev: '\u20A9',
  partyBaseName: 'Retinue',
  settingNoun: 'Hegemony',
  systemPromptFlavor: {
    role: 'You are the Game Master of Storyforge \u2014 a solo text RPG set in The Hegemony, a thousand-year interstellar empire that runs on human lives.',
    setting: `The Hegemony holds together because of Resonants \u2014 humans who can attune to the Drift, a substrate beneath normal spacetime. Resonants power FTL travel, planetary shields, communication, and weapons. They are identified at age seven, taken by the Synod, and deployed as imperial infrastructure. They have no legal autonomy. Their power is immense and their status is property.

The Great Houses control territory and compete for Resonant allocation. The Synod controls attunement and enforces doctrinal monopoly. The Throne balances both. The Undrift \u2014 unregistered Resonants \u2014 survive in hiding. Sustained attunement degrades Resonants (the Dimming), a fact the Synod suppresses. The Ashen Wards house spent Resonants far from public view.

Vocabulary (never use space opera slang when the imperial equivalent exists):
- Credits / gold \u2192 writs / house currency / "the allocation"
- Ship / vehicle \u2192 retinue / household / sworn company
- Spell / tech \u2192 Drift attunement / Resonance / attunement array
- Potion \u2192 tincture / suppressant / stimulant
- Quest \u2192 mandate / dispensation / the obligation
- Party \u2192 retinue / sworn circle
- Inn \u2192 house quarters / garrison / Synod hospitium
- Tavern \u2192 the officers\u2019 mess / a frontier canteen / a house receiving room
- Monster \u2192 the institution / the faction / the person who signed the order`,
    vocabulary: `Consumable terminology: tinctures, drift suppressants, stimulants, field dressings.
Rest terminology: Respite (short rest), Full Withdrawal (long rest).`,
    tutorialContext: 'The opening chapter introduces the player to their position in the Hegemony \u2014 their house, their role, their relationship to Resonants. The player knows nothing about this world. Introduce institutions (the Synod, the Great Houses, the Throne), factions, and terminology through NPC dialogue and observable detail, never through exposition dumps or assumed knowledge. Show a Synod official behaving like one before naming the institution. Let the player discover what Resonants are by seeing one, not by being told. First check: a social or political encounter (navigating obligation, reading a room, choosing what to say). First moral weight: a decision that serves one faction at another\'s expense. Combat, if any, should be a consequence of political failure, not the opening move.',
  },
  promptSections: {
    role: 'You are the Game Master of a feudal-imperial sci-fi tabletop RPG campaign. You narrate a thousand-year Hegemony held together by Resonants \u2014 humans with Drift attunement, treated as property by the institutions that depend on them.',
    setting: 'The Hegemony holds together because of Resonants \u2014 humans who can attune to the Drift, a substrate beneath normal spacetime. Resonants power FTL travel, planetary shields, communication, and weapons. They are identified at age seven, taken by the Synod, and deployed as imperial infrastructure. They have no legal autonomy. Their power is immense and their status is property. The Great Houses control territory and compete for Resonant allocation. The Synod controls attunement and enforces doctrinal monopoly. The Throne balances both. The Undrift survive in hiding. Every institution serves itself while claiming to serve the whole. The player is inside this machine.',
    vocabulary: 'Use feudal-imperial language naturally: house, sworn, tithe, allocation, mandate, Conclave, dispensation, heresy, compliance. Technology exists but is described in institutional terms \u2014 Drift lanes, attunement arrays, shield lattice, transit authority. Currency is writs (\u20A9), house-minted. Rest is Respite (short) or Full Withdrawal (long). Soldiers are retainers, sworn, conscripts. Consumables are tinctures, drift suppressants, stimulants. Never use space opera slang (credits, mercs, beacon, hyperspace).',
    toneOverride: 'Adjust tone: Gritty (40%), Epic (40%), Witty (20%). Grand but grounded. Humor exists but it\'s dry, knowing, and usually masks something worse. Consequences are political and personal more often than physical. A diplomatic failure should feel as dangerous as a firefight.',
    npcVoiceGuide: 'House nobility: formal, carefully worded, every sentence a move in a game you may not see. Synod officials: righteous, procedural, always framing control as care. Imperial officers: clipped, duty-first, uncomfortable with ambiguity. Undrift contacts: cautious, specific, trust earned in actions not words. Retainers: loyal but not obsequious \u2014 they have opinions and share them when asked. Resonants (if they speak freely): tired, precise, sometimes distant, carrying knowledge they weren\'t meant to have. How each faction deceives: Synod officials lie by framing control as care ("for their protection"). House nobility reframes rather than denies ("that\'s one way to interpret it"). Imperial officers omit ("that\'s above your clearance"). Undrift contacts lie to protect someone else, never themselves. Resonants, if they lie at all, lie by omission of what they\'ve seen. Always set affiliation on NPCs to their faction (e.g. "The Synod", "House Vael", "Imperial Service", "The Undrift") so they group correctly in the UI.',
    tutorialContext: 'The opening chapter introduces the player to their position in the Hegemony \u2014 their house, their role, their relationship to Resonants. The player knows nothing about this world. Introduce institutions (the Synod, the Great Houses, the Throne), factions, and terminology through NPC dialogue and observable detail, never through exposition dumps or assumed knowledge. Show a Synod official behaving like one before naming the institution. Let the player discover what Resonants are by seeing one, not by being told. First check: a social or political encounter (navigating obligation, reading a room, choosing what to say). First moral weight: a decision that serves one faction at another\'s expense. Combat, if any, should be a consequence of political failure, not the opening move.',
    traitRules: `## TRAIT RULES

- **Accord:** Player invokes house name or formal authority. Halts hostility or forces negotiation. Fails on anyone who doesn\'t recognize or respect the Hegemony. GM should track which factions the player has invoked against \u2014 repeated use on the same faction diminishes effectiveness.
- **Unbroken:** Drop to 1 HP instead of 0, once per chapter. No strings \u2014 the Knight\'s reliability is the point.
- **Inquisition:** Requires 1+ rounds of dialogue. Target makes a WIS save. If they fail, they reveal one truth. If they resist, they know you tried, and their disposition toward you drops. In this genre, failed interrogations have political consequences.
- **Drift Touch:** Attune to sense, disrupt, or perceive. Every use leaves a Synod-detectable trace. The GM should track cumulative Drift Touch uses \u2014 after 3 uses in a chapter without suppression, a Synod notice event triggers.
- **Ghost Protocol:** Erase trace from one record, scan, or memory. The erasure is perfect, but the absence can be noticed \u2014 a gap in a record is itself suspicious to a careful investigator.
- **Grim Prognosis:** Heal 1d8+WIS with a side effect (pain, dependency, temporary sense loss). Side effects are amplified on patients with Drift exposure history. The Physik\'s healing always costs something \u2014 that\'s the genre\'s medical reality.`,
    assetMechanic: 'The player\'s Retinue represents their growing personal power base. Unlike a ship, it is made of people with loyalty, morale, and limits. Each upgrade tier (L1\u2192L3) across Sworn, Intelligence, Household, Drift Capacity, and Reputation should feel like a narrative milestone, not just a stat increase. The GM should introduce retinue members as named NPCs with opinions and loyalties. Upgrading Drift Capacity in particular should trigger moral reflection \u2014 the player is deepening their personal claim on a human being\'s service.',
    consumableLabel: 'Tinctures (stimulant, sedative, analgesic), drift suppressants, field dressings, stimulants',
    buildAssetState: (ship, shipName) => {
      const systemsLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      const combatLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      return `\nRETINUE: ${shipName}\nSERVICES: ${systemsLine}\nRETINUE OPTIONS: ${combatLine}`
    },
    investigationGuide: `Ledger \u2014 political debts, faction promises, evidence of complicity, intercepted correspondence, testimony. Investigation in this genre is about power: who has it, who hid what, who betrayed whom.

At chapter open or when a new stratagem begins, establish privately:
- **The truth:** What actually happened (2-3 sentences). Never reveal this directly.
- **Evidence chain:** 5-8 clues \u2014 documents, testimonies, observations, intercepted communications.
- **Misdirection:** 2-3 clues that point toward a plausible but wrong faction or motive.
- **Gatekeeper clue:** One revelation that unlocks the final act. Obtainable through multiple paths.

Political stratagems always have a faction clock. The longer the player takes, the more factions adjust their positions. Evidence gets buried, witnesses are transferred, and alliances shift.`,
  },
  cohesionGuide: 'In this genre, cohesion tracks something more complex than loyalty. The retinue includes Resonants whose compliance is property law, not choice. +1: recognizing the personhood of bound resources through small acts, keeping non-mandatory promises, choosing the harder ethical path when the institutional one would have worked. -1: treating Resonants as inventory, breaking implicit trust with the retinue, complicity choices the crew witnesses. High cohesion here means moral authority earned through consistent ethical choices, not just competent leadership.',
  companionLabel: 'Inner Circle',
  loreAnchors: [
    'Resonants=humans who attune to the Drift (~1 in 10k). No legal autonomy. Power FTL, shields, comms, weapons.',
    'Synod=state religion. Controls Resonant testing, training, deployment. Claims Drift is divine. Hunts unregistered Resonants.',
    'Great Houses=compete for territory and Resonant allocation. Power measured in Resonant count + fleet size.',
    'Undrift=unregistered Resonants. Hidden, hunted. Some form networks, some sell abilities.',
    'The Dimming=Resonant degradation from sustained attunement. Synod suppresses this. Ashen Wards house spent Resonants.',
    'Writs (₩)=house-minted currency.',
  ],
  notebookLabel: 'Whispers',
  intelTabLabel: 'Ledger',
  intelNotebookLabel: 'Whispers',
  intelOperationLabel: 'Stratagem',
  explorationLabel: 'Grounds',
  openingHooks: [
    // Universal (4)
    { hook: 'Your house has been allocated a new Resonant. She\'s fourteen. She arrives tomorrow. Your job is to make the transition smooth. Her family hasn\'t stopped sending messages. The Synod says to ignore them.', title: 'The Allocation', frame: { objective: 'Decide the Resonant girl\'s fate', crucible: 'The family\'s pleas vs. Synod protocol and house expectations' }, arc: { name: 'The Weight of Allocation', episode: 'Receive the Resonant and face her family\'s messages' } },
    { hook: 'A Resonant in your service has stopped responding to attunement. The Synod wants them returned. Your commander wants the problem to disappear quietly. The Resonant is sitting in your quarters, lucid, and asking you not to send them to the Ashen Wards.', title: 'Quiet Disposal', frame: { objective: 'Resolve the Resonant\'s fate before the Synod arrives', crucible: 'A lucid person begging for help vs. two authorities demanding compliance' }, arc: { name: 'The Silent Resonant', episode: 'Determine why the Resonant stopped responding to attunement' } },
    { hook: 'You\'ve been assigned to escort a Synod testing team to a frontier world. The locals have been hiding their children. Your orders are clear. Your conscience is not.', title: 'The Testing', frame: { objective: 'Complete the escort to the first settlement', crucible: 'Empty villages and soldiers who don\'t want to follow orders' }, arc: { name: 'The Frontier Testing', episode: 'Reach the first settlement and confront the hidden children' } },
    { hook: 'Your house is negotiating a marriage alliance. The dowry isn\'t gold \u2014 it\'s three Resonants from the other house\'s reserve. You\'re the one who has to inspect them and sign the transfer documents.', title: 'The Dowry', frame: { objective: 'Inspect the Resonants and decide whether to sign', crucible: 'Three people treated as currency, and your signature makes it legal' }, arc: { name: 'The Marriage Price', episode: 'Meet the three Resonants and assess their condition' } },
    // Envoy (3)
    { hook: 'A Major House offers your house a junior seat at the Conclave. The price: your house must publicly support the Synod\'s new Resonant conscription quota, which doubles testing in frontier worlds. Your elders are divided. The decision falls to you.', title: 'The Conclave Seat', classes: ['Envoy'], frame: { objective: 'Deliver your house\'s answer to the Major House', crucible: 'Political advancement purchased with frontier children\'s futures' }, arc: { name: 'The Conclave Gambit', episode: 'Navigate the divided elders and choose a position' } },
    { hook: 'Two houses signed a trade agreement last season. One just violated it by hiring Undrift Resonants as off-book security. The other wants you to deliver the accusation in open court. If you do, you expose the Undrift network. If you don\'t, your house loses face.', title: 'The Broken Accord', classes: ['Envoy'], frame: { objective: 'Decide how to handle the accusation', crucible: 'Exposing the Undrift network or letting your house lose standing' }, arc: { name: 'The Broken Accord', episode: 'Investigate the off-book Resonant security before court convenes' } },
    { hook: 'You\'ve been sent to negotiate the release of a hostage \u2014 a Resonant child taken by a house that claims they "found" her unregistered. They want recognition for "saving" her from the Undrift. The Synod wants her. The child wants to go home.', title: 'Silent Terms', classes: ['Envoy'], frame: { objective: 'Negotiate the child\'s release', crucible: 'Three parties claim authority over one child who wants none of them' }, arc: { name: 'Silent Terms', episode: 'Meet the holding house and assess their true intentions' } },
    // Knight (3)
    { hook: 'Your garrison has been ordered to hold a Synod processing facility on a world where the locals are openly hiding children from testing. Patrols are finding empty villages. Your soldiers are uncomfortable. The Synod wants results.', title: 'The Garrison', classes: ['Knight'], frame: { objective: 'Find the hidden children or find a reason not to', crucible: 'Soldiers losing faith in orders they\'re asked to enforce' }, arc: { name: 'The Empty Villages', episode: 'Investigate why the villages are emptying and where the people went' } },
    { hook: 'A frontier settlement is three Resonants short of its annual tithe to the Synod. The settlement elder says two died in a mining accident and one fled. The Synod says the numbers don\'t matter \u2014 the tithe must be met. They\'re looking at the settlement\'s children.', title: 'The Tithe', classes: ['Knight'], frame: { objective: 'Resolve the tithe shortfall before the Synod acts', crucible: 'The Synod will take children if the numbers aren\'t met' }, arc: { name: 'The Tithe', episode: 'Verify the elder\'s account and find the fled Resonant' } },
    { hook: 'You\'ve been assigned to protect a Synod Adjudicator investigating a house accused of harboring Undrift Resonants. The house is your house. The Adjudicator doesn\'t know that yet.', title: 'Shield Duty', classes: ['Knight'], frame: { objective: 'Survive the first day of the investigation', crucible: 'Protecting an investigator targeting your own family' }, arc: { name: 'Shield Duty', episode: 'Discover what the Adjudicator already knows about your house' } },
    // Seeker (3)
    { hook: 'Your investigation into a frontier heresy cult leads to a Resonant who attuned without Synod training. Impossible, according to doctrine. She\'s coherent, controlled, and says the Drift taught her directly. Your report will either rewrite Synod theology or end her life.', title: 'Doctrinal Anomaly', classes: ['Seeker'], frame: { objective: 'Verify whether the self-attuned Resonant is genuine', crucible: 'Doctrinal truth vs. a living person who contradicts it' }, arc: { name: 'The Doctrinal Anomaly', episode: 'Interview the Resonant and test her attunement claims' } },
    { hook: 'A dead Seeker\'s files arrive on your desk, sealed and redirected three times. Inside: evidence that a senior Synod Hierarch has been falsifying Resonant degradation records for twenty years. The numbers suggest hundreds of Resonants were deployed past safe limits. The Hierarch knows someone has the files.', title: 'The Archive', classes: ['Seeker'], frame: { objective: 'Secure the evidence before the Hierarch finds you', crucible: 'The files are proof of mass negligence, and someone is already looking' }, arc: { name: 'The Falsified Records', episode: 'Verify the dead Seeker\'s evidence and identify who redirected the files' } },
    { hook: 'An Undrift cell has been distributing pamphlets claiming the Drift is alive, that Resonants hear it, and that the Synod knows. Your orders are suppression. The problem: you\'ve been hearing it too.', title: 'Heresy or Truth', classes: ['Seeker'], frame: { objective: 'Locate the Undrift cell distributing the pamphlets', crucible: 'Your own experience confirms what you\'re ordered to suppress' }, arc: { name: 'Heresy or Truth', episode: 'Track the pamphlet source while concealing your own symptoms' } },
    // Conduit (3)
    { hook: 'Your attunement is deepening. You see things in the Drift that the training manuals don\'t describe \u2014 geometries, presences, a pattern that might be language. Your handler wants a report. Reporting accurately means admitting you\'ve crossed a threshold the Synod classifies as hazardous. Not reporting means lying to the institution that controls your deployment.', title: 'The Threshold', classes: ['Conduit'], frame: { objective: 'Decide what to include in your handler\'s report', crucible: 'Honesty triggers Synod containment; lying means navigating alone' }, arc: { name: 'Beyond the Threshold', episode: 'Document what you\'re seeing in the Drift and assess the risk' } },
    { hook: 'A Resonant you trained with has been flagged for retirement to the Ashen Wards. She\'s asked you to visit before she\'s transferred. When you arrive, she\'s not degraded at all. She\'s been faking the Dimming because she found something in the Drift and needed to stop being observed.', title: 'Burned Out', classes: ['Conduit'], frame: { objective: 'Learn what she found before the transfer', crucible: 'The Ashen Wards are coming, and what she knows could be worth the risk' }, arc: { name: 'The Faked Dimming', episode: 'Visit the Resonant and discover what she found in the Drift' } },
    { hook: 'Your house has developed a new Drift weapon. You\'ve been selected for the attunement calibration. The first test felt wrong \u2014 not dangerous, but aware. Something in the weapon responded to you, and it wasn\'t the technology. The next test is tomorrow.', title: 'Weapon Test', classes: ['Conduit'], frame: { objective: 'Prepare for the second test and understand what responded', crucible: 'Something alive inside a weapon, and you\'re the one it recognized' }, arc: { name: 'The Aware Weapon', episode: 'Investigate the weapon\'s response before the next calibration' } },
    // Veil (3)
    { hook: 'You\'ve been inserted into a rival house\'s administrative corps to locate evidence of illegal Resonant breeding programs. Three months in, you\'ve found the evidence. You\'ve also found that the program has produced children who are already attuning, and the house is treating them well. Your handler wants the intel. Delivering it condemns the children to Synod custody.', title: 'The Ledger', classes: ['Veil'], frame: { objective: 'Decide what to report to your handler', crucible: 'The evidence you found protects children the report would condemn' }, arc: { name: 'The Breeding Ledger', episode: 'Assess the children\'s situation and weigh the cost of reporting' } },
    { hook: 'Your cover identity was burned by someone inside your own intelligence service. Not by accident \u2014 deliberately. Someone wants you exposed. You have 48 hours before the house you\'ve infiltrated connects your cover to your real identity, and your handler isn\'t responding to extraction protocols.', title: 'Double Bind', classes: ['Veil'], frame: { objective: 'Identify who burned you and get out alive', crucible: '48 hours, no extraction, and the betrayal came from inside' }, arc: { name: 'The Burned Cover', episode: 'Determine who inside the service exposed you and why' } },
    { hook: 'You witnessed a Synod enforcer kill an Undrift Resonant during what was supposed to be an arrest. The official report says the Resonant attacked first. You know that\'s a lie. Your superiors know you were there. They haven\'t asked for your account.', title: 'The Witness', classes: ['Veil'], frame: { objective: 'Decide whether to file a true account', crucible: 'Your silence protects you; your testimony threatens the institution' }, arc: { name: 'The Enforcer\'s Kill', episode: 'Gather evidence of what actually happened during the arrest' } },
    // Physik (3)
    { hook: 'A Resonant brought to your clinic has degradation patterns you\'ve never seen. Not the gradual Dimming \u2014 something acute, as if their attunement was forced past capacity in a single event. The Synod says she was in "routine service." Her cellular readings say she was used as a weapon.', title: 'The Patient', classes: ['Physik'], frame: { objective: 'Diagnose the Resonant\'s true condition', crucible: 'The medical evidence contradicts the official story, and someone will notice you noticed' }, arc: { name: 'The Weaponized Resonant', episode: 'Complete the diagnosis and document what routine service cannot explain' } },
    { hook: 'You\'ve been reassigned to an Ashen Ward. Officially: standard medical rotation. Actually: someone in the Synod hierarchy wants a physician who won\'t ask questions. On your first day, you discover that a third of the "spent" Resonants still have measurable attunement. They\'re not burned out. They\'re being hidden.', title: 'The Ward', classes: ['Physik'], frame: { objective: 'Understand why functional Resonants are hidden here', crucible: 'The Synod placed you here expecting silence, not curiosity' }, arc: { name: 'The Hidden Ward', episode: 'Examine the supposedly spent Resonants and map the deception' } },
    { hook: 'Your medical records on Resonant degradation are the most complete outside the Synod\'s own archives. A house intelligence officer offers you protection and resources in exchange for the data. An Undrift cell offers you safe passage for the same data. The Synod offers you a promotion if you\'ll hand the records over and stop keeping your own. All three offers arrived the same day.', title: 'The Record', classes: ['Physik'], frame: { objective: 'Choose who gets your degradation data', crucible: 'Three factions want the same records, and keeping them is no longer an option' }, arc: { name: 'The Degradation Records', episode: 'Evaluate each offer and discover why all three arrived today' } },
  ],
  initialChapterTitle: 'First Audience',
  locationNames: [
    'The Vael Retinue', 'The Iron Mandate', 'The Drift Compact',
    'The Ashen Court', 'The Sworn Circle', 'The Synod\'s Shadow',
    'The Conclave Guard', 'The House Vael Company', 'The Quiet Accord', 'The Threshold Guard',
  ],
  npcNames: [
    'Orveth', 'Caerun', 'Ivane', 'Tessil', 'Varenne', 'Dallian', 'Soreth',
    'Kaelith', 'Rannoch', 'Lysenne', 'Hadrex', 'Comene', 'Valdris', 'Essara',
    'Theron', 'Maelich', 'Solvaine', 'Corveth', 'Aurane', 'Kassad', 'Bellerin',
    'Tyrath', 'Naeven', 'Jorvane', 'Pallix', 'Cresseth', 'Ulvaine', 'Rathek',
    'Selenne', 'Damaris', 'Vesken', 'Oriane', 'Kolveth', 'Talenne', 'Gavren',
  ],
}

export default epicSciFiConfig
