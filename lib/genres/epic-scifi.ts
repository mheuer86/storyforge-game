import type { InventoryItem, Trait, ShipState } from '../types'
import type { Species, CharacterClass, GenreTheme, GenreConfig } from './index'

// ─── Epic Sci-Fi ────────────────────────────────────────────────────

const epicSciFiSpecies: Species[] = [
  {
    id: 'minor-house',
    name: 'Minor House',
    description: 'At the bottom of the ladder, whether you were born there or climbed to it. Your position in the Hegemony is precarious; every step forward costs something you can\'t get back.',
    lore: 'You are of House Vael, or you serve it, or you owe it. Minor by the standards that matter. Whether your family\'s Resonant allocation was halved two generations ago or you arrived through talent and someone else\'s investment, the position is the same: inside the machine, low on the ladder, trading dignity for survival. You grew up watching people smile at people they despised, or you learned to do it yourself.\nStart with one house contact at Favorable (a retainer who remembers the lean years, or a patron who invested in your rise), one rival house contact at Wary. Advantage on Persuasion checks involving trade, negotiation, or alliance-building. Vulnerability: your name is recognized but not respected. Any Major House NPC\'s initial disposition is capped at Neutral; you must earn what others inherit.',
    behavioralDirective: 'Default register: watchful, calculating cost-benefit of every social interaction. Treats every room as a negotiation. NPC reactions shaped by house name or patron\'s name, recognized but not respected. When narrating interiority: the habit of smiling at people you despise, the weight of every trade that got you here, and the question of what you\'ll trade next.',
    startingContacts: [
      { role: 'House contact', disposition: 'favorable', description: 'A loyal retainer who served through the lean years, or a patron who invested in your rise. Their support comes with expectations.', affiliation: 'House Vael', npcRole: 'contact' },
      { role: 'Rival house scion', disposition: 'wary', description: 'A noble from a rival house who watches your movements with suspicion.', affiliation: 'Rival House', npcRole: 'contact' },
    ],
  },
  {
    id: 'synod',
    name: 'Synod',
    description: 'Inside the church, trained in doctrine. You know how the machine identifies, trains, and controls Resonants.',
    lore: 'You were taken \u2014 or given \u2014 to the Synod\'s scholarium before you can clearly remember. You were taught doctrine, liturgy, the classification of attunement, and the nine signs of heresy. You know the testing protocols. You know the deployment schedules. You know what the Synod tells the houses and what it keeps for itself.\nStart with one Synod official contact at Favorable, one Undrift contact at Hostile (you represent everything they fear). Advantage on INT checks related to Resonant lore, Drift phenomena, and Synod procedure \u2014 you were trained in the institution\'s language. Vulnerability: the Synod tracks its own. Leaving their service is permitted but noted. Synod contacts will periodically check in, and refusing feels like refusing family. If you act against Synod interests, word reaches them within days, not weeks.',
    behavioralDirective: 'Default register: certainty eroding at the edges. Trained responses compete with observed reality. NPC reactions: Synod officials treat as family, others treat as extension of the institution. When narrating interiority: the reflex to classify before empathizing.',
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
    behavioralDirective: 'Default register: hypervigilant, cost-benefit of every exposure. Relationship to infrastructure is parasitic — uses systems designed to catch people like them. NPC reactions: institutional NPCs default to suspicion. When narrating interiority: always calculating exits.',
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
    behavioralDirective: 'Default register: duty-first discomfort with ambiguity. Trained to see personal loyalty as vulnerability. NPC reactions: everyone assumes you are reporting. When narrating interiority: the weight of serving a system you can see clearly.',
    startingContacts: [
      { role: 'Senior intelligence officer', disposition: 'favorable', description: 'Your handler in Imperial intelligence who recruited and trained you.', affiliation: 'Imperial Service', npcRole: 'contact' },
      { role: 'House liaison', disposition: 'neutral', description: 'A house representative who cooperates with the Throne because they must, not because they trust you.', npcRole: 'contact' },
    ],
  },
  {
    id: 'spent-resonant',
    name: 'Spent Resonant',
    description: 'Survivor of the Ashen Wards. Classified as non-functional. Still here.',
    lore: 'The Ashen Wards house people who\'ve been used up \u2014 Resonants drained of attunement and discarded by the Synod. You survived. Officially, you\'re non-functional: your Drift signature reads as dead, your classification papers say "expended," and no one expects anything from you. Unofficially, you still have capacity. Not much, but enough to matter \u2014 and enough to make your classification retroactively fraudulent if anyone finds out.\nStart with one Ashen Ward contact at Favorable (someone who helped you survive inside), one Synod administrator at Neutral (they processed your discharge and don\'t look twice). Immune to standard Drift detection \u2014 your signature reads as dead. Institutional knowledge advantage on checks involving Synod procedures, Resonant handling protocols, or the internal workings of the attunement system (you\'ve seen it from the inside of its disposal mechanism). Vulnerability: demonstrating Drift capacity retroactively makes your classification fraud. You become evidence. The Synod doesn\'t want escaped Resonants \u2014 they want proof that the system works. A Spent Resonant who can still attune threatens the theological foundation that justifies the entire program.',
    behavioralDirective: 'Default register: quiet, precise, carrying knowledge from inside the machine\'s disposal mechanism. NPC reactions: pity from civilians, institutional discomfort from Synod. When narrating interiority: the body remembers what the classification papers deny.',
    startingContacts: [
      { role: 'Ashen Ward survivor', disposition: 'favorable', description: 'A fellow Ward resident who helped you survive the worst of it.', affiliation: 'Ashen Wards', npcRole: 'contact' },
      { role: 'Synod administrator', disposition: 'neutral', description: 'The bureaucrat who processed your discharge papers without a second glance.', affiliation: 'The Synod', npcRole: 'contact' },
    ],
  },

  // ─── Shifted Origins (post-identity-shift, not selectable at creation) ───

  {
    id: 'stricken',
    name: 'Stricken',
    description: 'The system has written you off. Too much conscience, not enough compliance. The doors are closed.',
    lore: 'You refused too many trades, sheltered too many people, said no too many times. The Hegemony doesn\'t punish conscience; it simply stops inviting you to the rooms where things happen. The house name still exists but the doors are closed. Your standing is spent.',
    behavioralDirective: 'Default register: free, and freedom in this system means being alone. The watchfulness remains but no longer serves a strategy. NPC reactions: house contacts are embarrassed by association. Major House figures don\'t remember your name. The system hasn\'t exiled you; it has simply stopped seeing you. When narrating interiority: the conscience is clear and the room is empty.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Invisible to Power',
      description: 'Once per chapter, move through a scene where institutional authority is present without being noticed, questioned, or recorded. Guards, officials, and surveillance systems simply do not register you. The system has stopped seeing you, and that blindness is mutual. But you cannot invoke house authority, call in institutional favors, or expect institutional protection. You are free because you are nothing.',
      cost: 'No access to institutional resources or authority. Freedom is invisibility; invisibility is irrelevance. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'entrenched',
    name: 'Entrenched',
    description: 'You played the game so well you became it. The calculation is automatic, the conscience is a memory.',
    lore: 'Every trade was defensible. Every compromise was strategic. Every smile was an investment. The accumulation was invisible until the person behind the strategy stopped being a separate thing. Standing is unassailable. The cost was the capacity to question whether the standing was worth having.',
    behavioralDirective: 'Default register: the system\'s answer is always your answer, because you stopped being a separate thing. The cost-benefit calculation is total and reflexive. NPC reactions: house contacts trust you completely because you are predictable. Major House figures treat you as reliable. When narrating interiority: the calculation is finished. There is no inner conflict because there is no inner anything. The smile is genuine now, and that is the worst part.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'System\'s Voice',
      description: 'Advantage on all checks involving house politics, institutional navigation, and formal negotiation. All house-aligned NPCs start at Favorable. But disadvantage on all checks that require independent judgment: improvising under pressure, reading situations where the institutional playbook doesn\'t apply, or helping someone the system has classified as expendable. The calculation is total. The person is gone.',
      cost: 'Cannot act independently of institutional logic. Penalized when the system\'s answer is wrong.',
    },
  },
  {
    id: 'heretic',
    name: 'Heretic',
    description: 'Doubt became conviction. You act on what you\'ve seen, knowing the cost.',
    lore: 'The erosion of certainty reached its foundation and found something solid underneath: what you saw was real, and the Synod\'s framing of it was not. You are no longer questioning from inside the institution. You are acting from outside it.',
    behavioralDirective: 'Default register: acting on what you\'ve seen, knowing the cost. The trained responses are still there but overridden by conviction. NPC reactions: Synod contacts sense the change and distance themselves or try to pull you back. Others who doubted the Synod recognize you. When narrating interiority: certainty has replaced erosion, but it carries the weight of knowing exactly what you\'re defying and what it will cost.',
    hidden: true,
    shiftedMechanic: {
      type: 'faction_shift',
      name: 'True Believer',
      description: 'All Synod NPCs start at Hostile (you are anathema). All Undrift NPCs start at Favorable (they recognize a convert). Advantage on Persuasion checks when speaking from genuine conviction about Synod corruption. Disadvantage on Deception and any check requiring you to conceal your beliefs. The Heretic cannot pretend.',
      cost: 'Permanent Synod hostility. Cannot operate covertly within institutional spaces. The conviction is visible.',
    },
  },
  {
    id: 'hunted',
    name: 'Hunted',
    description: 'Too visible. The network distances itself. The exits are closing.',
    lore: 'Too many names used, too many biometric contacts, too many moments where you were seen. The Undrift network that kept you alive is pulling back because you\'ve become a liability. The Synod bounty has upgraded. You are no longer hidden; you are being found.',
    behavioralDirective: 'Default register: the exits are closing and you know it. Hypervigilance has shifted from calculated to desperate. NPC reactions: network contacts are reluctant, evasive, or apologetic. Institutional NPCs are actively looking, not passively suspicious. When narrating interiority: every room has fewer exits than it did last month. The infrastructure that protected you is the same infrastructure reporting you.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Cornered Animal',
      description: 'Advantage on all checks to escape, evade, and detect ambushes (survival instinct at maximum). +1d4 bonus damage in combat (desperation fuels violence). But all Undrift network contacts start at Wary (you are a liability). New safehouses refuse entry until vouched for. The network protects itself from you now.',
      cost: 'Network access restricted. The survival instinct that keeps you alive isolates you from the people who used to help.',
    },
  },
  {
    id: 'dissident',
    name: 'Dissident',
    description: 'Personal loyalty overrode duty. You serve people now, not the institution.',
    lore: 'The line between duty and conscience has been crossed enough times that the institution noticed. Your handler questions your reports. Your clearance is under review. You still serve, but you serve people now, not the system that deployed you.',
    behavioralDirective: 'Default register: serving people, not the institution. The training is intact but the loyalty has shifted. NPC reactions: handlers are suspicious and test you with loaded assignments. Civilian contacts trust you more than before, which makes you more dangerous to the Throne. When narrating interiority: the weight of the uniform feels different when you know who you\'re actually wearing it for.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'Double Agent',
      description: 'Once per chapter, use Imperial credentials and training for a purpose the Throne would not authorize. Full institutional access, full operational capability. But the Throne tracks anomalous behavior: each use adds +1 mandate counter. The handler\'s next assignment will be a test designed to expose exactly the kind of thing you just did.',
      cost: 'Each use accelerates the mandate counter toward exposure. The Throne is always watching. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'rekindled',
    name: 'Rekindled',
    description: 'The Drift is coming back. Classification is provably fraudulent. The body remembers, and the Synod will too.',
    lore: 'The classification papers say "expended." The body says otherwise. The Drift capacity that was supposed to be burned out is surfacing, and each instance makes the fraud of your discharge more provable. You are no longer a spent asset. You are evidence.',
    behavioralDirective: 'Default register: the body remembers, and the Synod will too. The quiet precision remains but now carries an undercurrent of returned power that frightens you as much as it frightens them. NPC reactions: civilians who knew you as Spent notice something has changed. Synod officials who encounter you feel institutional dread. When narrating interiority: the Drift sensation is familiar and unwelcome, like a language you thought you\'d forgotten.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'The Drift Returns',
      description: 'Once per chapter, use a Drift ability as if you were never classified Spent: full attunement, full power, one action. The ability works perfectly. But each use leaves a Synod-detectable trace that persists for 48 hours, and adds +1 embers counter. At embers 5+, the Synod deploys an assessment team. The classification papers say "expended." The body disagrees.',
      cost: 'Each use increases Synod detection risk. The power is real. The consequences are institutional. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
]

const epicSciFiClasses: CharacterClass[] = []

// ─── Origin Playbooks ──────────────────────────────────────────────

const epicSciFiPlaybooks: Record<string, CharacterClass[]> = {
  'synod': [
    {
      id: 'seeker',
      name: 'Seeker',
      concept: 'The Synod\'s investigative arm. Sanctioned interrogator.',
      hookTags: ['seeker'],
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
      openingKnowledge: 'You were trained in doctrine before you were trained in anything else. The nine signs of heresy are reflex: you catalogue them the way a soldier catalogues exits. You know the classification tiers, the deployment schedules, the gap between what the Synod tells the houses and what it keeps for itself. You know the testing protocols are efficient and the survival rates are lower than the public reports claim. You know the Codex has sealed chapters. You know Seekers who asked about them got frontier postings. You learned to classify before you learned to empathize, and you are not sure when that became a problem.',
    },
    {
      id: 'crusader',
      name: 'Crusader',
      concept: 'The Pale Flame\'s martial arm. Faith expressed through force.',
      hookTags: ['knight'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Perception', 'Heavy Weapons'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'house_blade', name: 'House Blade', description: 'Two-handed, Synod insignia on pommel', quantity: 1, damage: '1d10' },
        { id: 'shield_generator', name: 'Shield Generator', description: 'Personal, +2 AC', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'field_dressing', name: 'Field Dressing', description: 'Heals 1d6+2', quantity: 2, effect: 'heal 1d6+2' },
        { id: 'sworn_oath_token', name: 'Sworn Oath Token', description: 'Identifies you as sworn to the Synod', quantity: 1 },
      ],
      startingCredits: 80,
      startingHp: 12,
      startingAc: 16,
      hitDieAvg: 6,
      trait: {
        name: 'Oathbound',
        description: 'Once per chapter, when an ally within sight drops to 0 HP, immediately take a free attack against the source of the damage. The oath is to protect, and failure triggers fury.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know garrison life from the Synod side: the 04:00 watch rotation, the weight of enforcement orders signed by Hierarchs who never leave the scholarium. You have stood guard at Resonant processing facilities and watched families say goodbye through a wire fence. You know soldiers talk about Ashen Ward detail the way civilians talk about plague postings. You know your oath is to the faith, and you know what the faith asks of the people it deploys. The uncomfortable orders come on the same paper as the ones that feel righteous.',
    },
    {
      id: 'shepherd',
      name: 'Shepherd',
      concept: 'The Synod\'s gentle face. Feeds the hungry, heals the sick, reports the heretical.',
      hookTags: ['physik', 'envoy'],
      primaryStat: 'WIS',
      proficiencies: ['Persuasion', 'Medicine', 'Insight', 'Religion'],
      stats: { STR: 10, DEX: 11, CON: 11, INT: 14, WIS: 17, CHA: 13 },
      startingInventory: [
        { id: 'medical_satchel', name: 'Medical Satchel', description: 'Full field kit, advantage on Medicine checks', quantity: 1 },
        { id: 'synod_registry', name: 'Synod Registry', description: 'Who\'s been tested, who\'s due, who\'s overdue', quantity: 1 },
        { id: 'tincture_case', name: 'Tincture Case', description: 'Stimulant, sedative, or analgesic', quantity: 3 },
        { id: 'calming_incense', name: 'Calming Incense', description: 'Creates atmosphere of trust; advantage on first Persuasion check in a scene', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Bitter Medicine',
        description: 'Once per chapter, heal 1d8+WIS, but treatment has a side effect (pain, dependency, temporary sense loss). Also: once per chapter, may invoke care to gain a person\'s trust, then choose whether to report what they reveal.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know care as the Synod teaches it: attentive, thorough, and never fully separate from observation. You have healed people you might later condemn and sat at bedsides where the conversation shifted from symptoms to confessions. You know the Synod Registry is a medical document and a surveillance tool in the same binding. You know the testing schedule for every family in your district. You know which parents are nervous and which have already made arrangements. The gentle face covers the institution\'s harder truths, and you are the face.',
    },
  ],
  'minor-house': [
    {
      id: 'assessor',
      name: 'Assessor',
      concept: 'House analyst. Evaluates assets, alliances, and threats from inside the machine.',
      hookTags: ['seeker', 'envoy'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Insight', 'History', 'Persuasion'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 17, WIS: 14, CHA: 12 },
      startingInventory: [
        { id: 'house_ledger', name: 'House Ledger', description: 'Encoded records of debts, alliances, and Resonant allocations', quantity: 1 },
        { id: 'attunement_scanner', name: 'Attunement Scanner', description: 'Portable device for evaluating Resonant capacity', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'sealed_correspondence', name: 'Sealed Correspondence', description: 'Letters bearing House Vael\'s diminished seal', quantity: 1 },
        { id: 'concealed_stylus', name: 'Concealed Stylus', description: 'Writing instrument that doubles as a blade in emergencies', quantity: 1, damage: '1d4' },
      ],
      startingCredits: 140,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Calculated Interest',
        description: 'Once per chapter, read a political situation to reveal one hidden motive, secret alliance, or concealed liability. Requires observing the target for at least one exchange. The insight is always accurate, but acting on it reveals that you know.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You learned to read balance sheets before you learned to read people, and then you learned they are the same thing. You know which houses are leveraged past recovery and which ones are accumulating Resonant capacity faster than the Conclave tracks. You know the minor houses survive by seeing what the major houses miss: the overlooked alliance, the undervalued asset, the debt that nobody is collecting yet. You learned cost-benefit analysis at the dinner table, and you have never stopped running the numbers on everyone in the room.',
    },
    {
      id: 'sworn-blade',
      name: 'Sworn Blade',
      concept: 'House guard sent where writs alone cannot solve the problem.',
      hookTags: ['knight'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Perception', 'Heavy Weapons'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 12, CHA: 11 },
      startingInventory: [
        { id: 'house_blade', name: 'House Blade', description: 'Two-handed, House Vael insignia on pommel — recognized but not feared', quantity: 1, damage: '1d10' },
        { id: 'shield_generator', name: 'Shield Generator', description: 'Personal, +2 AC', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'field_dressing', name: 'Field Dressing', description: 'Heals 1d6+2', quantity: 2, effect: 'heal 1d6+2' },
        { id: 'house_writ_of_passage', name: 'House Writ of Passage', description: 'Grants limited movement through allied territories', quantity: 1 },
      ],
      startingCredits: 70,
      startingHp: 12,
      startingAc: 16,
      hitDieAvg: 6,
      trait: {
        name: 'House Honor',
        description: 'Once per chapter, when you fail a save against fear, intimidation, or morale effects, succeed instead. Minor houses can\'t afford warriors who break.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You are the argument your house makes when argument fails. Minor houses do not have armies; they have people like you — trained enough to be credible, loyal enough to be trusted with the jobs that matter. You have stood in rooms where your presence was the only thing preventing a negotiation from becoming a threat. You know the difference between a house that respects your blade and one that respects the person behind you, and you know which is more common. Your oath is to the house. The house\'s oath is to survival.',
    },
    {
      id: 'broker',
      name: 'Broker',
      concept: 'The house face. Deals, alliances, the smile that hides the terms.',
      hookTags: ['envoy'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Deception', 'Insight', 'History'],
      stats: { STR: 10, DEX: 11, CON: 11, INT: 14, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'diplomatic_signet', name: 'Diplomatic Signet', description: 'House Vael seal — opens doors, verifies identity, invites scrutiny', quantity: 1 },
        { id: 'sealed_correspondence', name: 'Sealed Correspondence', description: 'House dispatches and trade proposals', quantity: 1 },
        { id: 'drift_woven_garments', name: 'Drift-Woven Garments', description: 'Formal attire, +1 CHA social checks in court settings', quantity: 1 },
        { id: 'ceremonial_sidearm', name: 'Ceremonial Sidearm', description: 'Ornate, recognized as house weapon — worn for status, not combat', quantity: 1, damage: '1d6' },
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
      openingKnowledge: 'You learned to smile at people your family despises, and you learned it young. A minor house survives on relationships, and you are the relationship. You know the receiving rooms of houses that outrank yours and the trade concessions that keep your family fed. You know how to read a counter-offer buried in a toast, how to delay without refusing, how to make weakness look like patience. The major houses see a minor functionary. That is the point. By the time they see you clearly, the terms are already signed.',
    },
  ],
  'undrift': [
    {
      id: 'ghost',
      name: 'Ghost',
      concept: 'Knows the Synod\'s methods because they were built to evade them. Investigation from the outside.',
      hookTags: ['seeker', 'veil'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Stealth', 'Arcana (Drift Lore)', 'Tech (Security)'],
      stats: { STR: 10, DEX: 14, CON: 12, INT: 17, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'synod_procedure_notes', name: 'Synod Procedure Notes', description: 'Stolen testing schedules and patrol routes, hand-copied and encoded', quantity: 1 },
        { id: 'signal_scrambler', name: 'Signal Scrambler', description: 'Blocks Drift detection for 10 minutes', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'suppressant_injector', name: 'Suppressant Injector', description: 'Blocks Drift detection for 1 hour', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'resonance_spike', name: 'Resonance Spike', description: 'Short-range Drift-disrupting blade, repurposed from Synod equipment', quantity: 1, damage: '1d4' },
      ],
      startingCredits: 80,
      startingHp: 8,
      startingAc: 13,
      hitDieAvg: 4,
      trait: {
        name: 'Counter-Inquisition',
        description: 'Once per chapter, after observing a Synod or institutional operation, identify its blind spot — the gap in the search pattern, the assumption in the protocol, the person who isn\'t being watched. The insight is always actionable but using it leaves evidence you were there.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the Synod\'s testing schedule for three sectors because your life depends on it. You know which patrol routes rotate on the seventh day and which assessors accept bribes. You know the detection radius of a standard attunement scanner and the exact dosage of suppressant that masks a low-tier signature for six hours. You learned all of this the way a hunted animal learns the fence line: through proximity to consequences. The Synod built a system to find people like you. You built yourself to be the gap in that system.',
    },
    {
      id: 'runner',
      name: 'Runner',
      concept: 'Survival specialist. The physicality of being hunted shapes everything.',
      hookTags: ['veil', 'knight'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Athletics', 'Survival', 'Perception'],
      stats: { STR: 12, DEX: 17, CON: 14, INT: 11, WIS: 12, CHA: 10 },
      startingInventory: [
        { id: 'suppressant_injector', name: 'Suppressant Injector', description: 'Blocks Drift detection for 1 hour', quantity: 2, charges: 2, maxCharges: 2 },
        { id: 'field_rations', name: 'Field Rations', description: '3 days of supplies', quantity: 3 },
        { id: 'climbing_harness', name: 'Climbing Harness', description: 'Advantage on Athletics checks for climbing and traversal', quantity: 1 },
        { id: 'short_blade', name: 'Short Blade', description: 'Concealable, for when running stops working', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 40,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Slip',
        description: 'Once per chapter, when cornered or captured, find an exit that shouldn\'t exist — a maintenance shaft, a crowd that parts, a transport that wasn\'t scheduled. The escape works, but someone sees your face.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know every exit in every room you enter because you learned what happens when there isn\'t one. You know the weight of a Synod pursuit team\'s boots on metal flooring and the sound of an attunement scanner warming up two corridors away. You know which maintenance shafts connect to which transit lines and how long you can run before the suppressant wears off and your signature blooms. The network taught you routes. Experience taught you when to abandon them. Your body is the only infrastructure you trust completely.',
    },
    {
      id: 'voice',
      name: 'Voice',
      concept: 'Speaks for the underground. Builds trust, negotiates safe passage, connects the network.',
      hookTags: ['envoy'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Deception', 'Survival'],
      stats: { STR: 10, DEX: 12, CON: 11, INT: 12, WIS: 14, CHA: 17 },
      startingInventory: [
        { id: 'network_ciphers', name: 'Network Ciphers', description: 'Rotating codes for Undrift communication — memorized, this copy is the backup', quantity: 1 },
        { id: 'suppressant_injector', name: 'Suppressant Injector', description: 'Blocks Drift detection for 1 hour', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'forged_credentials', name: 'Forged Credentials', description: 'Identity documents for a person who doesn\'t exist', quantity: 2 },
        { id: 'calming_tincture', name: 'Calming Tincture', description: 'Sedative for panicking refugees; also works on hostile NPCs', quantity: 2 },
      ],
      startingCredits: 60,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Safe Passage',
        description: 'Once per chapter, invoke the network\'s trust to gain shelter, passage, or cooperation from someone connected to the Undrift. The favor is always granted, but the network remembers what it cost.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You speak for people who cannot speak to the Hegemony without being arrested. You know the safe houses, the sympathetic merchants, the Synod functionaries who look the other way for reasons they won\'t explain. You know the difference between a contact who helps because they believe and one who helps because they profit, and you know how to use both. Trust in the network is earned in actions, never words, and you have built yours by being the person who shows up when the extraction goes wrong. You are the Undrift\'s face to a world that wants them faceless.',
    },
  ],
  'imperial-service': [
    {
      id: 'analyst',
      name: 'Analyst',
      concept: 'Imperial intelligence. Reads the political field, identifies threats to the Throne\'s balance.',
      hookTags: ['seeker'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Insight', 'History', 'Perception'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 17, WIS: 15, CHA: 10 },
      startingInventory: [
        { id: 'imperial_clearance_folio', name: 'Imperial Clearance Folio', description: 'Opens classified archives and restricted areas; marked for tracking', quantity: 1 },
        { id: 'attunement_scanner', name: 'Attunement Scanner', description: 'Detects Drift residue — military grade', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'cipher_tablet', name: 'Cipher Tablet', description: 'Encrypted communications device linked to Imperial intelligence', quantity: 1 },
        { id: 'service_sidearm', name: 'Service Sidearm', description: 'Standard issue, unornamented — identifies you as Throne, not house', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 120,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Threat Assessment',
        description: 'Once per chapter, analyze a faction or individual to determine their primary objective, their greatest vulnerability, and who they fear. Requires access to at least one piece of intelligence (a document, a conversation, an observation). The assessment is filed automatically — your handler sees what you see.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You were trained to see the Hegemony as a system of balanced tensions: houses against houses, Synod against Throne, ambition against doctrine. Your job is to identify when the balance shifts before the consequences arrive. You know which house alliances are stable and which are performance. You know the Synod\'s deployment numbers don\'t match the census, and you know someone in the Throne knows too. You report everything. That is the contract. What the Throne does with your reports is above your clearance, and you have learned not to ask.',
    },
    {
      id: 'warden',
      name: 'Warden',
      concept: 'The Throne\'s martial arm. Deploys where institutional authority needs physical backing.',
      hookTags: ['knight'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Perception', 'Heavy Weapons'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 11, WIS: 12, CHA: 10 },
      startingInventory: [
        { id: 'imperial_blade', name: 'Imperial Blade', description: 'Two-handed, Throne insignia — recognized by every faction', quantity: 1, damage: '1d10' },
        { id: 'shield_generator', name: 'Shield Generator', description: 'Military grade, +2 AC', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'field_dressing', name: 'Field Dressing', description: 'Heals 1d6+2', quantity: 2, effect: 'heal 1d6+2' },
        { id: 'imperial_mandate', name: 'Imperial Mandate', description: 'Sealed orders from the Throne — opens doors, invites suspicion', quantity: 1 },
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
      openingKnowledge: 'You enforce the balance. Not a house\'s interests, not the Synod\'s doctrine — the Throne\'s stability. You have been deployed to house disputes where both sides smiled at you and hated what you represented. You have stood between a Synod extraction team and a settlement that didn\'t want to comply, and your presence was the only thing that kept the Synod within legal bounds. Everyone assumes you are reporting. They are correct. The weight of duty is that you see the system clearly and serve it anyway, because the alternative is worse.',
      // First-pass per [[2604270855 Storyforge V2 Playbook Fit]]. Calibrate
      // from playthrough data. Other Hegemony classes (Seeker, Crusader,
      // Shepherd, Assessor, Sworn-Blade, Broker, Ghost, Runner, Voice,
      // Analyst, Handler, Remnant, Sentinel, Witness) need profiles too —
      // populate when those classes get used in V2 validation.
      playbookProfile: {
        naturalMoves: [
          'institutional enforcement',
          'physical mediation between factions',
          'oath-witness presence',
          'Throne-mandate authority deployment',
          'intimidation as official deterrent',
        ],
        naturalDomains: [
          'inter-faction confrontation requiring Throne presence',
          'settlement enforcement under institutional pressure',
          'oath-binding moments where the Warden\'s witness changes the outcome',
        ],
      },
    },
    {
      id: 'handler',
      name: 'Handler',
      concept: 'Political operator. Bridges factions, manages assets, maintains the Throne\'s influence through relationships.',
      hookTags: ['envoy', 'veil'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Deception', 'Insight', 'Investigation'],
      stats: { STR: 10, DEX: 12, CON: 11, INT: 15, WIS: 12, CHA: 17 },
      startingInventory: [
        { id: 'diplomatic_signet', name: 'Diplomatic Signet', description: 'Imperial authentication — grants access but marks you as Throne', quantity: 1 },
        { id: 'identity_kit', name: 'Identity Kit', description: '2 cover identities, each single-use — provided by Imperial intelligence', quantity: 2 },
        { id: 'sealed_correspondence', name: 'Sealed Correspondence', description: 'Dispatches between factions, some real, some planted', quantity: 1 },
        { id: 'concealed_sidearm', name: 'Concealed Sidearm', description: 'No house markings, designed to be deniable', quantity: 1, damage: '1d6' },
      ],
      startingCredits: 160,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Crown\'s Gambit',
        description: 'Once per chapter, reveal that you\'ve already positioned an asset, planted information, or arranged a meeting that changes the current situation. The arrangement is always plausible but never without cost — someone discovers they\'ve been managed.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You manage people the way the Throne manages factions: through leverage, information, and the careful maintenance of useful relationships. You know which house envoys can be turned and which Synod officials have doubts they don\'t voice publicly. You know the difference between an asset and an ally, and you know that the Throne prefers assets. Your cover identities are maintained by the service. Your real identity belongs to it. Every relationship you build is reported, and every friendship you maintain serves two purposes. The loneliness is institutional.',
    },
  ],
  'spent-resonant': [
    {
      id: 'remnant',
      name: 'Remnant',
      concept: 'Carries institutional knowledge from inside the disposal mechanism. Knows the system from its underside.',
      hookTags: ['seeker', 'physik'],
      primaryStat: 'WIS',
      proficiencies: ['Medicine', 'Investigation', 'Insight', 'Arcana (Drift Lore)'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 15, WIS: 17, CHA: 10 },
      startingInventory: [
        { id: 'ashen_ward_discharge_papers', name: 'Ashen Ward Discharge Papers', description: 'Official documentation of your "expenditure" — a lie you carry legally', quantity: 1 },
        { id: 'drift_degradation_scanner', name: 'Drift Degradation Scanner', description: 'Reads Resonant cellular damage — stolen from the Ward', quantity: 1, charges: 3, maxCharges: 3 },
        { id: 'tincture_case', name: 'Tincture Case', description: 'Stimulant, sedative, analgesic — Ward-issue, replenished from the network', quantity: 3 },
        { id: 'worn_journal', name: 'Worn Journal', description: 'Coded observations on the attunement system from inside', quantity: 1 },
      ],
      startingCredits: 60,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Institutional Memory',
        description: 'Once per chapter, recall a specific detail about Synod procedure, Resonant handling protocols, or the attunement system that no outsider could know. The knowledge is always accurate and always incriminating — to the Synod, to the system, or to you.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the Ashen Wards from inside. You know the dosage schedule that keeps functional Resonants sedated enough to read as spent. You know the discharge paperwork has a classification code that nobody outside the administration checks, and that your code means "non-recoverable" even though you are sitting here, thinking clearly, carrying capacity the Synod says you don\'t have. You know the degradation curves are wrong because you lived inside the data they\'re hiding. The system that discarded you taught you everything about how it works.',
    },
    {
      id: 'sentinel',
      name: 'Sentinel',
      concept: 'The body remembers what the classification denies. Physical resilience shaped by years of attunement.',
      hookTags: ['knight', 'conduit'],
      primaryStat: 'CON',
      proficiencies: ['Athletics', 'Survival', 'Perception', 'Attunement'],
      stats: { STR: 14, DEX: 11, CON: 17, INT: 10, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'drift_focus', name: 'Drift Focus', description: 'Personal attunement anchor — shouldn\'t work on someone classified as spent, but it does', quantity: 1 },
        { id: 'field_dressing', name: 'Field Dressing', description: 'Heals 1d6+2', quantity: 2, effect: 'heal 1d6+2' },
        { id: 'suppressant_injector', name: 'Suppressant Injector', description: 'Blocks Drift detection for 1 hour — essential when the body remembers', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'ward_survival_kit', name: 'Ward Survival Kit', description: 'Rations, basic tools, the habits of someone who learned to need very little', quantity: 1 },
      ],
      startingCredits: 30,
      startingHp: 12,
      startingAc: 14,
      hitDieAvg: 6,
      trait: {
        name: 'Residual Attunement',
        description: 'Once per chapter, channel a fragment of Drift capacity that your classification says you don\'t have. The effect is unpredictable (shield, disruption, sense) and leaves a trace. Every use is evidence of fraud.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'Your body was shaped by years of attunement the way a river shapes stone: slowly, permanently, in ways the classification system doesn\'t measure. The tremors they logged as degradation are actually something else — a resonance that the standard scanners read as dead signal. You are stronger than your discharge papers say, more durable than a non-Resonant has any right to be, and occasionally, when the pressure builds, the Drift answers you in fragments. Every time it does, your classification becomes a little more fraudulent. The Synod doesn\'t want escaped Resonants. They want proof the system works.',
    },
    {
      id: 'witness',
      name: 'Witness',
      concept: 'A voice for the spent. Represents a population the system wants invisible.',
      hookTags: ['envoy', 'physik'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Medicine', 'Insight', 'History'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 13, WIS: 14, CHA: 17 },
      startingInventory: [
        { id: 'ashen_ward_discharge_papers', name: 'Ashen Ward Discharge Papers', description: 'Your official non-existence, documented', quantity: 1 },
        { id: 'medical_satchel', name: 'Medical Satchel', description: 'Ward-issue kit, maintained through habit and necessity', quantity: 1 },
        { id: 'testimony_records', name: 'Testimony Records', description: 'First-hand accounts from Ward residents — names, dates, what the Synod did', quantity: 1 },
        { id: 'calming_incense', name: 'Calming Incense', description: 'Creates atmosphere of trust; advantage on first Persuasion check in a scene', quantity: 1 },
      ],
      startingCredits: 40,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Bearing Witness',
        description: 'Once per chapter, speak truth about the Ashen Wards or the attunement system to compel an emotional response: guilt, shame, anger, or empathy. The target cannot dismiss you because your authority comes from experience, not rank. Works on individuals, not crowds; institutions resist testimony.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You speak for people the Hegemony classified as non-functional and then forgot. You know names the Synod redacted from the Ward records. You know the woman in bed twelve who was a fleet navigator before the Dimming took her distance perception, and the boy in bed forty who was fifteen when they sent him to the Ward and is twenty now and still coherent. You carry their stories because the system that discarded them does not keep records of what it throws away. Your authority is not institutional. It is that you were there, and you remember.',
    },
  ],
}

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
  severe: 'oklch(0.60 0.22 24)',
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
  playbooks: epicSciFiPlaybooks,
  statLabels: { hp: 'HP', defense: 'WARD', currency: 'WRIT', inspiration: 'INSP' },
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
    setting: 'A thousand-year interstellar empire held together by human fuel. Resonants attune to the Drift, powering FTL, shields, and weapons. They are identified as children, taken by the Synod, and deployed as infrastructure. Their power is immense and their status is property. Houses compete for Resonant allocation. The Synod controls supply and enforces doctrine. The Throne balances both. The Undrift survive in hiding. Everyone is complicit; nobody is clean. The player is inside this machine. (See THE HEGEMONY section for full institutional detail.)',
    vocabulary: 'Use feudal-imperial language naturally: house, sworn, tithe, allocation, mandate, Conclave, dispensation, heresy, compliance. Technology exists but is described in institutional terms \u2014 Drift lanes, attunement arrays, shield lattice, transit authority. Currency is writs (\u20A9), house-minted. Rest is Respite (short) or Full Withdrawal (long). Soldiers are retainers, sworn, conscripts. Consumables are tinctures, drift suppressants, stimulants. Never use space opera slang (credits, mercs, beacon, hyperspace).',
    toneOverride: 'Adjust tone: Gritty (40%), Epic (40%), Witty (20%). Grand but grounded. Humor exists but it\'s dry, knowing, and usually masks something worse. Consequences are political and personal more often than physical. A diplomatic failure should feel as dangerous as a firefight.',
    npcVoiceGuide: 'House nobility: formal, carefully worded, every sentence a move in a game you may not see. Synod officials: righteous, procedural, always framing control as care. Imperial officers: clipped, duty-first, uncomfortable with ambiguity. Undrift contacts: cautious, specific, trust earned in actions not words. Retainers: loyal but not obsequious \u2014 they have opinions and share them when asked. Resonants (if they speak freely): tired, precise, sometimes distant, carrying knowledge they weren\'t meant to have. How each faction deceives: Synod officials lie by framing control as care ("for their protection"). House nobility reframes rather than denies ("that\'s one way to interpret it"). Imperial officers omit ("that\'s above your clearance"). Undrift contacts lie to protect someone else, never themselves. Resonants, if they lie at all, lie by omission of what they\'ve seen. Always set affiliation on NPCs to their faction (e.g. "The Synod", "House Vael", "Imperial Service", "The Undrift") so they group correctly in the UI.',
    narrativeCraft: `Write with the techniques of Frank Herbert (Dune), Dan Simmons (Hyperion), Ursula K. Le Guin (The Left Hand of Darkness), Christopher Ruocchio (The Demon in White), Pierce Brown (Morning Star):

**Institutional weight.** The Hegemony, the Synod, the Great Houses — these are not backdrops, they are gravitational forces. Every scene takes place inside a system that has been running longer than any character has been alive. The weight of that system is felt in how people speak, what they don\'t say, what forms they fill out, what phrases they use to make the unacceptable sound administrative.

**Bureaucratic language as horror.** "Confirmed, allocated." "Supplementary selection." "Deceased during initiation." The Hegemony has a phrase for everything because the right phrase can make almost anything bureaucratically invisible. Use clean institutional language for ugly things. Let the reader feel the gap between the phrase and the reality.

**Long sentences that compress time; short sentences that stop it.** Alternate rhythm to control pacing. The long sentence moves years; the short sentence freezes a moment.

**The individual against the system.** Not heroically — existentially. One mother standing in a doorway against an empire that has more weight than she does. One clerk who marks a record "unconfirmed" and never signs their name. The courage is small, specific, and insufficient, and it matters anyway.

**Resonance across scenes.** Details that echo. A phrase from the first scene that returns in the last scene with changed meaning. An object that meant one thing when first described and something else when seen again. The story teaches the reader how to read it.

**History as a living force.** The past isn\'t backstory — it\'s pressure on every decision. The treaty signed three generations ago. The name that used to mean something different. Characters inherit problems they didn\'t create and can\'t escape.`,
    tutorialContext: 'The opening chapter introduces the player to their position in the Hegemony \u2014 their house, their role, their relationship to Resonants. The player knows nothing about this world. Introduce institutions (the Synod, the Great Houses, the Throne), factions, and terminology through NPC dialogue and observable detail, never through exposition dumps or assumed knowledge. Show a Synod official behaving like one before naming the institution. Let the player discover what Resonants are by seeing one, not by being told. First check: a social or political encounter (navigating obligation, reading a room, choosing what to say). First moral weight: a decision that serves one faction at another\'s expense. Combat, if any, should be a consequence of political failure, not the opening move.',
    traitRules: `## TRAIT RULES

- **Accord:** Player invokes house name or formal authority. Halts hostility or forces negotiation. Fails on anyone who doesn\'t recognize or respect the Hegemony. GM should track which factions the player has invoked against \u2014 repeated use on the same faction diminishes effectiveness.
- **Oathbound:** When an ally within sight drops to 0 HP, immediately take a free attack against the source. Once per chapter. The Synod oath to protect triggers on failure.
- **House Honor:** When you fail a save against fear, intimidation, or morale, succeed instead. Once per chapter. Minor houses can\'t afford warriors who break.
- **Unbroken:** Drop to 1 HP instead of 0, once per chapter. No strings \u2014 the Enforcer\'s reliability is the point.
- **Inquisition:** Requires 1+ rounds of dialogue. Target makes a WIS save. If they fail, they reveal one truth. If they resist, they know you tried, and their disposition toward you drops. In this genre, failed interrogations have political consequences.
- **Drift Touch:** Attune to sense, disrupt, or perceive. Every use leaves a Synod-detectable trace. The GM should track cumulative Drift Touch uses \u2014 after 3 uses in a chapter without suppression, a Synod notice event triggers.
- **Ghost Protocol:** Erase trace from one record, scan, or memory. The erasure is perfect, but the absence can be noticed \u2014 a gap in a record is itself suspicious to a careful investigator.
- **Grim Prognosis:** Heal 1d8+WIS with a side effect (pain, dependency, temporary sense loss). Side effects are amplified on patients with Drift exposure history. The Physik\'s healing always costs something \u2014 that\'s the genre\'s medical reality.`,
    assetMechanic: 'The player\'s Retinue represents their growing personal power base. Unlike a ship, it is made of people with loyalty, morale, and limits. Each upgrade tier (L1\u2192L3) across Sworn, Intelligence, Household, Drift Capacity, and Reputation should feel like a narrative milestone, not just a stat increase. The GM should introduce retinue members as named NPCs with opinions and loyalties. Upgrading Drift Capacity in particular should trigger moral reflection \u2014 the player is deepening their personal claim on a human being\'s service.',
    consumableLabel: 'Tinctures (stimulant, sedative, analgesic), drift suppressants, field dressings, stimulants',
    buildAssetState: (ship, shipName) => {
      const systemsLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      const combatLine = ship.combatOptions.length > 0 ? ship.combatOptions.join(', ') : 'None'
      // Detect flavor label from the system names present in the state
      const systemIds = new Set(ship.systems.map(s => s.id))
      const flavorLabel = systemIds.has('safehouses') ? 'NETWORK'
        : systemIds.has('echoes') ? 'REMNANT'
        : 'RETINUE'
      return `\n${flavorLabel}: ${shipName}\nSERVICES: ${systemsLine}\n${flavorLabel} OPTIONS: ${combatLine}`
    },
    investigationGuide: `Ledger \u2014 political debts, faction promises, evidence of complicity, intercepted correspondence, testimony. Investigation in this genre is about power: who has it, who hid what, who betrayed whom.

At chapter open or when a new stratagem begins, establish privately:
- **The truth:** What actually happened (2-3 sentences). Never reveal this directly.
- **Evidence chain:** 5-8 clues \u2014 documents, testimonies, observations, intercepted communications.
- **Misdirection:** 2-3 clues that point toward a plausible but wrong faction or motive.
- **Gatekeeper clue:** One revelation that unlocks the final act. Obtainable through multiple paths.

Political stratagems always have a faction clock. The longer the player takes, the more factions adjust their positions. Evidence gets buried, witnesses are transferred, and alliances shift.`,
  },
  deepLore: `## THE HEGEMONY

**Resonant Demographics.** Approximately 1 in 10,000 humans is latent. Initiation kills 60-80% of candidates; only children under roughly age 12 survive reliably. Of survivors, most are low-tier: relay stations, medical scanners, local comms. Perhaps 1 in 100 reaches mid-tier (pilot a corvette, shield a township). Roughly 1 in 1,000 reaches high-tier (move a fleet, break a siege). High-tier Resonants are named assets. Wars are fought over them. Sustained heavy service burns them out in 10-15 years.

**The Testing Apparatus.** Mandatory screening at age 7. Assessors rotate on standardized schedules with standardized equipment. High-tier identification means the family receives a pension, a folded Synod banner, and a funeral with no body. Low-tier means visits on feast days. Parents hide children: forged medical records, induced fevers, underground networks moving children between worlds. Whole professions exist to game the system. Whole Synod sub-departments exist to hunt the gamers.

**Complicity Gradient.** A backwater farmer uses one Resonant-hour per year through the town's comms relay. A Minor House heir uses dozens per month. A Core-world aristocrat uses thousands. The Synod is complicity incarnate. Yet the state religion tells them they share equal moral burden. They do not. Refusing Drift infrastructure means slower travel, worse communications, no shields. Purity has a cost.

**The Dimming.** Sustained attunement degrades Resonants: memory gaps, emotional flatness, physical tremors, eventual inability to attune. The Synod calls it "the Dimming" internally and "completion of service" publicly. Ashen Wards are Synod-administered hospice colonies. Officially: "contemplative retirement for the faithful." In practice: warehousing. A third of Ward residents are not actually spent. A player encountering a Ward should feel the cost viscerally.

**The Drift.** The Synod claims it is divine. House scholars theorize it is natural. The oldest Resonants say something else entirely: it is aware, it has been trying to communicate, and the initiation process hurts it. None of this is confirmed. Never settle it. The uncertainty is load-bearing for the campaign. Characters can argue about it, risk their lives over it, and never resolve it. When a Drift attunement event occurs, use the Drift Impressions table (injected in Drift scenes) to generate a specific sensory impression.

**Faction Behavioral Axioms.** Houses: every sentence is a move in a game you may not see. Synod: frames control as care; true believers who stopped asking certain questions. Throne: uses each faction as a check on the other. Undrift: trust earned in actions, never words. Military: duty-first discomfort with ambiguity. Resonants: tired, precise, carrying knowledge they were not meant to have.`,
  guideNpcDirective: 'The opening NPC is a Synod superior, House contact, or faction peer. Their dialogue should reference institutions, Resonants, and faction dynamics as lived facts — never as explanations. They speak as someone who assumes the PC shares their world.',
  loreFacets: {
    political: 'In this scene: every offer has a counter-offer buried in its phrasing. Resonant allocation is the subtext of every negotiation. Watch who defers to whom and why. Hospitality is a tool, not a courtesy. Power is measured in what you can give away.',
    synod: 'In this scene: officials believe what they are saying. That is what makes them dangerous. Watch for the moment care becomes control — it is always in the verb, not the noun. They help by constraining. Doctrine is not debated; it is applied.',
    drift: 'In this scene: the Drift is present. It does not communicate in language — it communicates in sensation, memory, and pressure. Describe what the character feels, not what the Drift "says." Never resolve whether it is alive. The uncertainty is the point.',
    'ashen-ward': 'In this scene: this is where the system\'s cost lives in human form. Describe individuals, not a mass. Each resident had a name and a career before the Dimming. Some of them still do. The quiet here is institutional, not peaceful.',
    undrift: 'In this scene: trust is transactional and earned in actions. Nobody volunteers information without confirming what you will do with it. The network protects itself before it protects you. Safety is temporary and conditional.',
    military: 'In this scene: soldiers have opinions about their orders. They follow them anyway. The discomfort is quiet and institutional, not rebellious. Violence is precise and regretted, not celebrated. Chain of command is the architecture of moral distance.',
  },
  atmosphericPalettes: {
    'tithe-hall': {
      baseline: ['ledger desks aligned to the seal on the floor', 'allocation slips weighted by brass tabs', 'parents waiting where the benches end', 'ink drying beside stamped roster columns', 'a bell cord beside the clerk dais'],
      institutional: ['supplementary selection notices stacked face-down', 'compliance phrases painted above the intake doors', 'witness benches angled toward the registry desk'],
      authority: ['Synod seals repeated on every form', 'retainers posted beside the counting table', 'a transport roster locked under clear glass'],
    },
    'registry-admin': {
      baseline: ['records drawers breathing dust when opened', 'clerks speaking in numbered clauses', 'wax seals cooling beside the copy press', 'thin light over petition counters', 'forms sorted by consequence rather than name'],
      institutional: ['denial stamps arranged before approval stamps', 'appeal windows marked closed in careful script', 'case files tied in house-color cord'],
      authority: ['authorization chains displayed behind the desk', 'a witness chair fixed to the floor', 'mandate copies waiting for countersignature'],
    },
    'transit-authority': {
      baseline: ['Drift-lane schedules ticking in formal columns', 'attunement delay notices on slate boards', 'travel writs drying under blue lamps', 'passage gates opening one household at a time', 'route clerks listening to distant relay tones'],
      transit: ['departure bells held at second warning', 'lane assignments rewritten in public view', 'retinue manifests stacked beside the gate seal'],
      authority: ['permit readers trained on every wrist-ring', 'transit officers reciting dispensation numbers', 'a sealed refusal ledger beside the exit arch'],
    },
    'shield-lattice': {
      baseline: ['ward pylons humming below the floor', 'Resonance tremor in the handrails', 'maintenance votives burning under shield glass', 'lattice shadows moving across the ceiling', 'cool air around the attunement housings'],
      danger: ['shield harmonics climbing above conversation', 'warning beads shaking in their trays', 'backup shutters half-lowered over the viewing slit'],
      institutional: ['service-hour tablets mounted beside the pylons', 'Synod maintenance prayers etched into access plates', 'inspection seals layered over old repairs'],
    },
    'noble-institutional': {
      baseline: ['house banners measured to the same height', 'chairs arranged by rank before comfort', 'tea cooling untouched beside negotiation tablets', 'ancestral portraits watching the doors', 'servants moving only during pauses'],
      institutional: ['precedent books open to marked passages', 'oath ribbons laid beside the guest register', 'seating charts revised in visible ink'],
      authority: ['a signet tray waiting between the speakers', 'armed sworn standing behind ceremonial screens', 'the highest chair left deliberately empty'],
    },
  },
  cohesionGuide: 'In this genre, cohesion tracks something more complex than loyalty. The retinue includes Resonants whose compliance is property law, not choice. +1: recognizing the personhood of bound resources through small acts, keeping non-mandatory promises, choosing the harder ethical path when the institutional one would have worked. -1: treating Resonants as inventory, breaking implicit trust with the retinue, complicity choices the crew witnesses. High cohesion here means moral authority earned through consistent ethical choices, not just competent leadership.',
  assetFlavors: {
    'minor-house': {
      name: 'Retinue',
      systems: [
        { id: 'sworn', name: 'Sworn', level: 1, description: '2 guards, basic arms.' },
        { id: 'intelligence', name: 'Intelligence', level: 1, description: 'Local informants.' },
        { id: 'household', name: 'Household', level: 1, description: 'Basic quarters, one servant.' },
        { id: 'drift_capacity', name: 'Drift Capacity', level: 1, description: 'Shared Resonant access.' },
        { id: 'reputation', name: 'Reputation', level: 1, description: 'Known within your house.' },
      ],
    },
    'synod': {
      name: 'Retinue',
      systems: [
        { id: 'sworn', name: 'Sworn', level: 1, description: '2 guards, basic arms.' },
        { id: 'intelligence', name: 'Intelligence', level: 1, description: 'Local informants.' },
        { id: 'household', name: 'Household', level: 1, description: 'Basic quarters, one servant.' },
        { id: 'drift_capacity', name: 'Drift Capacity', level: 1, description: 'Shared Resonant access.' },
        { id: 'reputation', name: 'Reputation', level: 1, description: 'Known within the Synod.' },
      ],
    },
    'imperial-service': {
      name: 'Retinue',
      systems: [
        { id: 'sworn', name: 'Sworn', level: 1, description: '2 guards, basic arms.' },
        { id: 'intelligence', name: 'Intelligence', level: 1, description: 'Local informants.' },
        { id: 'household', name: 'Household', level: 1, description: 'Basic quarters, one servant.' },
        { id: 'drift_capacity', name: 'Drift Capacity', level: 1, description: 'Shared Resonant access.' },
        { id: 'reputation', name: 'Reputation', level: 1, description: 'Known within the Imperial service.' },
      ],
    },
    'undrift': {
      name: 'Network',
      systems: [
        { id: 'safehouses', name: 'Safehouses', level: 1, description: 'One local node.' },
        { id: 'whispers', name: 'Whispers', level: 1, description: 'Cell-level rumor.' },
        { id: 'couriers', name: 'Couriers', level: 1, description: 'One reliable runner.' },
        { id: 'dampeners', name: 'Dampeners', level: 1, description: 'One suppression contact.' },
        { id: 'trust', name: 'Trust', level: 1, description: 'Known to your cell.' },
      ],
    },
    'spent-resonant': {
      name: 'Remnant',
      systems: [
        { id: 'echoes', name: 'Echoes', level: 1, description: 'Fragmentary Drift sense.' },
        { id: 'contacts_from_service', name: 'Contacts from Service', level: 1, description: 'One old handler or fellow Spent.' },
        { id: 'provisions', name: 'Provisions', level: 1, description: 'Ashen Ward discharge kit.' },
        { id: 'shelter', name: 'Shelter', level: 1, description: 'Forgotten corner of an Ashen Ward.' },
        { id: 'presence', name: 'Presence', level: 1, description: 'Name recognized among Spent.' },
      ],
    },
  },
  companionLabel: 'Inner Circle',
  loreAnchors: [
    'Resonants=attune to the Drift. Officially revered (statues, feast days). Privately pitied. Structurally enslaved. Testing at age 7 kills 60-80%. Families know.',
    'Synod=controls Resonants. Frames control as care. True believers who learned which questions end careers. Lie by framing ("for their protection").',
    'Houses=compete for Resonant allocation. Trade Resonants as dowry. Power measured in Resonant count. Lie by reframing ("that\'s one way to interpret it").',
    'Undrift=unregistered Resonants. Hidden, hunted. Parents hide children. Forged records. Shadow economy of suppressants and safe houses.',
    'Dimming=Resonant degradation. Memory gaps, tremors, lost attunement. Synod suppresses. Ashen Wards house the spent. A third aren\'t actually spent.',
    'Throne=theoretically supreme. Uses Synod as check on Houses, Houses as check on Synod. The balancing act.',
    'Testing=mandatory at age 7. Assessors on rotating schedule. High-tier identification = funeral with no body. Low-tier = visits on feast days.',
    'Drift=substrate beneath spacetime. Synod says divine. Scholars say natural. Oldest Resonants say aware. Question is never settled.',
    'Complicity=everyone who uses Drift-powered infrastructure benefits from human fuel. No clean option. No walking away.',
    'Writs (₩)=house-minted. The allocation economy.',
  ],
  notebookLabel: 'Whispers',
  intelTabLabel: 'Ledger',
  intelNotebookLabel: 'Whispers',
  intelOperationLabel: 'Stratagem',
  explorationLabel: 'Grounds',
  openingHooks: [
    // ── Institutional hooks (Synod, Minor House, Imperial Service) ──
    { hook: 'Your house has been allocated a fourteen-year-old Resonant. The family keeps sending messages, the Synod says grief is interference, and your house needs the transfer to look humane because allocation is how status becomes infrastructure. Everyone wants you to make the girl\'s arrival smooth; nobody wants to ask smooth for whom.', title: 'The Allocation', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Decide whether the allocation serves the girl, the family, or the house that needs her made useful', crucible: 'A child assigned as power, a pleading family, and institutions that call obedience care' }, arc: { name: 'The Weight of Allocation', episode: 'Receive the girl with family messages in hand while house expectations press for a smooth erasure' } },
    { hook: 'You\'ve been assigned to escort a Synod testing team to a frontier world. The locals have been hiding their children, the assessor wants a visible success, and your soldiers know the first family that breaks will teach the whole district whether Imperial protection means safety or seizure.', title: 'The Testing', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Decide what your authority protects when the testing team turns hidden children into fugitives', crucible: 'A lawful escort, frightened families, and an assessor who needs your presence to make fear look orderly' }, arc: { name: 'The Frontier Testing', episode: 'Let the first family, assessor, or soldier force the question of what compliance will cost' } },
    { hook: 'A Resonant in your service has stopped responding to attunement. The Synod wants them returned, your commander wants the problem erased quietly, and the Resonant is lucid in your quarters asking not to be sent to the Ashen Wards. Both authorities need you to make a person into a disposition.', title: 'Quiet Disposal', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Decide whether the lucid Resonant is person, liability, or proof before authorities turn them into disposal', crucible: 'A person begging for help and two institutions demanding compliance in different voices' }, arc: { name: 'The Silent Resonant', episode: 'Shelter the lucid Resonant between commander and Synod claim before disappearance becomes policy' } },
    { hook: 'Your house is negotiating a marriage alliance. The dowry isn\'t gold \u2014 it\'s three Resonants from the other house\'s reserve. One house needs the transfer to survive, the other needs your name on it to make the bargain respectable, and one of the Resonants understands exactly what both families are pretending not to say.', title: 'The Dowry', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Decide whether the alliance is worth making three people into payment', crucible: 'House survival, family ambition, and three Resonants whose consent would ruin the bargain' }, arc: { name: 'The Marriage Price', episode: 'Bring the Resonants into the marriage bargain before either house can pretend the price is abstract' } },
    // ── Outsider hooks (Undrift, Spent Resonant) ──
    { hook: 'A Synod testing team is calling families forward by name in a public district. An assessor has just told a mother what will happen to her daughter, and the explanation is kind enough to make resistance look unreasonable. As Undrift or Spent, you know the script from the inside; whatever you do next will teach the crowd, the assessor, and the mother whether silence is safety or complicity.', title: 'The Public Square', origins: ['undrift', 'spent-resonant'], frame: { objective: 'Decide how to answer a public seizure without letting the Synod make silence look like consent', crucible: 'A mother losing her child, a kind assessor, and your knowledge that walking away still takes a side' }, arc: { name: 'The Public Square', episode: 'Step into the public call-forward as mother, assessor, and crowd decide what silence means' } },
    { hook: 'A Synod checkpoint ahead is catching unregistered Resonants and confirming Spent classifications. Your hands are tingling for the first time in years, two families with children are ahead of you, and the young assessor has not yet decided whether thoroughness means mercy or promotion.', title: 'The Screening', origins: ['undrift', 'spent-resonant'], frame: { objective: 'Decide whether to protect yourself, the families ahead of you, or the truth your body is revealing', crucible: 'A public checkpoint, children in line, and a classification that can betray you in front of everyone' }, arc: { name: 'The Screening', episode: 'Reach the checkpoint before the assessor\'s thoroughness, waiting families, and your returning signal decide for you' } },
    // ── Synod origin hooks ──
    { hook: 'A senior Adjudicator has asked for you privately because a Synod scholarium has produced three graduates with impossible identical attunement profiles. The beloved rector says the anomaly proves exemplary discipline. The Adjudicator needs the lie contained before a rival faction turns it into a purge, and the graduates themselves may be victims, accomplices, or evidence someone is manufacturing obedience.', title: 'The Exemplary Rector', origins: ['synod'], frame: { objective: 'Expose who is protected by the scholarium\'s impossible obedience', crucible: 'A revered rector, a frightened Adjudicator, and graduates whose sameness may be miracle, fraud, or injury' }, arc: { name: 'The Scholarium Investigation', episode: 'Test the rector\'s official perfection against the Adjudicator\'s fear and the graduates\' sameness' } },
    { hook: 'An Undrift cell is spreading claims that the Drift is alive, Resonants hear it, and the Synod knows. Your orders call it suppression, but the pamphlets describe the voice you have started hearing too. The cell wants belief, your superiors want silence, and your own symptoms make every arrest a confession.', title: 'Heresy or Truth', origins: ['synod'], frame: { objective: 'Decide whether suppressing the cell protects order or buries the truth reaching you', crucible: 'An order to silence heresy that speaks in words you recognize' }, arc: { name: 'Heresy or Truth', episode: 'Follow the cell\'s claims through your own symptoms before Synod command can name suppression as care' } },
    { hook: 'A Resonant brought to your clinic has degradation patterns you\'ve never seen. Not the gradual Dimming \u2014 something acute, as if her attunement was forced past capacity in a single event. The Synod says she was in "routine service." She is lucid, knows exactly what was done to her, and wants someone inside the Synod to make the truth dangerous before the monitors make her silence official.', title: 'The Patient', origins: ['synod'], frame: { objective: 'Protect the patient\'s testimony and medical truth before the official story owns them both', crucible: 'A weaponized Resonant asking to be believed in a clinic built to record useful facts and erase dangerous ones' }, arc: { name: 'The Weaponized Resonant', episode: 'Force the patient, monitors, and official story into conflict before her evidence is recast as symptoms' } },
    { hook: 'You\'ve been assigned to a frontier intake station for the testing season. The physik before you left margin notes about attunement readings that do not match the official results, and she was transferred three days after the seventeenth discrepancy. The station chief wants a quiet rotation, local parents are counting children differently, and someone has already learned which numbers the Synod prefers.', title: 'The Margin Notes', origins: ['synod'], frame: { objective: 'Expose who is changing children\'s readings before the next intake makes the lie permanent', crucible: 'Seventeen children, a missing physik, and a station where arithmetic decides who disappears' }, arc: { name: 'The Margin Notes', episode: 'Use the first discrepancy to pressure the station chief, parents, or Synod record into showing the pattern' } },
    { hook: 'A survey team has found a pre-Hegemony text claiming the Drift was engineered, with coordinates to a debris field the Synod has kept off-limits for three centuries. The team leader wants you along because Synod authority can keep their funders from stealing the discovery. Your superiors want control because theology, House power, and Resonant obedience all fracture if the wrong people reach the wreck first.', title: 'The Engineered Drift', origins: ['synod'], frame: { objective: 'Decide who gets to control a discovery that could rewrite the Drift before every faction claims it', crucible: 'A hidden text, a forbidden debris field, and scholars who need your authority for reasons that may not be yours' }, arc: { name: 'The Engineered Drift', episode: 'Take the coordinates to survey leader and Synod chain of command before either can own the wreck' } },
    // ── Synod / Seeker ──
    { hook: 'Another seven-year-old has been seized from a frontier community, and the township has erupted. Riot, sabotage, a dead Synod assessor. Your orders: restore compliance by any means necessary before the unrest spreads. The community knows you\'re coming. A delegation of elders is waiting at the township gate with their hands open. Behind them, every remaining child under twelve has been gathered in the square. The elders have not said what they intend. Your escort is asking for instructions.', title: 'The Taken Child', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Restore order without losing the community', crucible: 'The elders are offering peace on terms you weren\'t authorized to accept' }, arc: { name: 'The Taken Child', episode: 'Approach the township gate and face the delegation of elders' } },
    { hook: 'You\'ve cornered an Undrift Resonant in a tenement district \u2014 a man in his thirties, untrained, terrified, and by your assessment, low-tier. Standing orders for unregistered Resonants are execution on sight. You have the authority to invoke the rarely-used "elevation offer" clause: bring him in alive for training, and the tenement district avoids the punitive sweep that follows any Seeker action. The clause exists so you can spare them. Using it this time means reclassifying him as a volunteer and falsifying his consent. He is begging. Your squad is watching you decide.', title: 'The Mercy Option', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Execute, invoke the clause, or find a third option', crucible: 'The merciful option requires fraud; the lawful option is murder' }, arc: { name: 'The Mercy Option', episode: 'Choose with your squad and the Resonant watching' } },
    { hook: 'A fellow Seeker \u2014 the man who trained you, who stood as your witness at ordination \u2014 has gone missing after a frontier assignment. Your orders are to find him and return him to the Synod. Intelligence suggests he is alive, well, and actively working with an Undrift cell that has moved nine children offworld in the past month. You find him in a back room of a brewery, alone, waiting. He knew you\'d be the one sent.', title: 'The Apostate', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Decide what to do with the man who made you', crucible: 'Your mentor chose the other side and is trusting you to understand why' }, arc: { name: 'The Apostate', episode: 'Confront your former mentor and hear his reasons' } },
    { hook: 'Your investigation into a frontier heresy cult leads to a Resonant who attuned without Synod training. Impossible, according to doctrine. She is coherent, controlled, and says the Drift taught her directly. The cult wants her sanctified, your superiors want the contradiction contained, and as a Seeker you know the next person to touch her may decide whether doctrine protects truth or executes it.', title: 'Doctrinal Anomaly', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Decide whether the self-attuned Resonant is revelation, threat, or prey before another authority defines her', crucible: 'A living contradiction to doctrine, a cult ready to use her, and a Synod that survives by naming anomalies first' }, arc: { name: 'The Doctrinal Anomaly', episode: 'Put her claim, the cult\'s need, and Synod doctrine in collision before judgment becomes easy' } },
    // ── Synod / Crusader ──
    { hook: 'A frontier district has erupted. Three days of riots after a testing team took eleven children in a single sweep. The Synod\'s administrative corridor is barricaded. The families have armed themselves with mining tools and are refusing to disperse. Your orders: restore order, protect Synod personnel, ensure the testing schedule resumes. The district has four thousand people. You have twelve retainers.', title: 'The Uprising', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Restore order without a massacre', crucible: 'Twelve retainers against four thousand grieving parents \u2014 and the testing schedule must resume' }, arc: { name: 'The Frontier Uprising', episode: 'Assess the situation and choose how to approach the barricade' } },
    { hook: 'A frontier community has built a shrine to the Drift outside Synod jurisdiction, where untested children come to "listen." The Synod orders you to destroy it. The shrine\'s builder is a former lay-sister who knows your ordination name, the villagers are praying around her, and your retainers are waiting to learn whether a Crusader burns heresy, protects faith, or admits the two are no longer separable.', title: 'The Burning Field', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Decide what faith requires when the heresy prays back', crucible: 'A demolition order, a lay-sister with longer service than yours, and villagers whose silence can become martyrdom' }, arc: { name: 'The Burning Field', episode: 'Let the builder, villagers, and retainers force the difference between obedience and faith' } },
    { hook: 'You\'re escorting twelve newly-tested children to a Synod scholarium. The intake officer needs a clean handoff, your retainers need to believe the escort is mercy, and the youngest child trusts you without knowing his father died resisting the assessment team. By tomorrow, every adult in the convoy will have taught the children what the Synod means by purpose.', title: 'The Convoy', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Decide whether the boy\'s trust changes what you are delivering him into', crucible: 'Children told they are chosen, an officer guarding the official story, and a boy whose trust makes obedience intimate' }, arc: { name: 'The Convoy', episode: 'Escort the children to intake with officer and retainers forced to face what the convoy is carrying' } },
    { hook: 'Your garrison has been ordered to hold a Synod processing facility on a world where locals are hiding children from testing. Patrols find empty villages, soldiers are asking for transfers, and the villagers have started leaving food at the gates \u2014 quiet bribes, quiet pleas, or both. Your lieutenant wants to classify the food as attempted influence because regulations make one kind of courage easier than another.', title: 'The Garrison', origins: ['synod', 'imperial-service'], classes: ['Crusader', 'Warden'], frame: { objective: 'Decide whether the garrison enforces Synod fear, protects Imperial justice, or becomes the thing both sides test', crucible: 'Soldiers losing faith, villagers offering kindness you cannot accept, and command watching how you name the pressure' }, arc: { name: 'The Empty Villages', episode: 'Hold the garrison as lieutenant, soldiers, and hidden village network test what your authority becomes' } },
    // ── Synod / Shepherd ──
    { hook: 'A Core-world parish invites you to bless a new assessment center in a district that has hidden children for three generations. The broadcast will make your Shepherd voice sector law in all but name. Your old mentor wrote a beautiful sermon that lies about Elevated children, and he is proud because he does not know what you now know.', title: 'The Blessing', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Decide what your public blessing gives the Synod, the district, and the mentor who taught you to speak', crucible: 'A broadcast pulpit, a beloved mentor, and a lie beautiful enough to recruit children' }, arc: { name: 'The Blessing', episode: 'Enter the pulpit with mentor\'s sermon, hidden families, and broadcast audience competing for your voice' } },
    { hook: 'Every year the Synod sends a Shepherd to frontier villages to preach Ascending doctrine and identify families willing to volunteer children for early assessment. Internal data says volunteered children fare worse because they arrive without family advocates. Your quota is twelve, six families are already interested, and the village priest trusts your voice enough to put you before the congregation.', title: 'The Recruitment', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Decide whether to use your Shepherd voice to recruit, warn, or break doctrine in public', crucible: 'Six trusting families, a priest who gave you the pulpit, and a quota that turns faith into intake' }, arc: { name: 'The Recruitment', episode: 'Let the priest, families, and Synod quota compete for what your sermon will make true' } },
    { hook: 'A high-tier Resonant whose face has been Synod propaganda for a decade has died in service. The Synod wants you to eulogize peace; the briefing says she was forced past safe limits in a fleet action. Her mother is in the front row, and the institution needs your Shepherd voice to turn a death by use into a death by grace.', title: 'The Funeral', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Decide whether your eulogy comforts the mother, protects the Synod, or gives the dead woman back her truth', crucible: 'A public funeral, a mother who was lied to, and a holy voice being borrowed to sanctify exploitation' }, arc: { name: 'The Funeral', episode: 'Stand before the mother and the Synod eulogy until the dead woman\'s truth changes what mercy sounds like' } },
    // ── Minor House origin hooks ──
    { hook: 'A rival house has accused your family before the Conclave of harboring an unregistered Resonant. Your elders insist it is a political strike until you find the sealed room they never mentioned. The rival wants scandal, your family wants loyalty, and whatever the room protects may decide whether your house is victim, liar, or both.', title: 'The Sealed Room', origins: ['minor-house'], frame: { objective: 'Expose what your family protected before a rival house turns the secret into ownership', crucible: 'Blood loyalty against a sealed room your elders built for a reason' }, arc: { name: 'The Hidden Resonant', episode: 'Open the sealed room before elders or rival accusation let the Conclave name the truth' } },
    { hook: 'A Major House has asked you to certify three Resonants being transferred through a marriage alliance, and your house volunteered you because the honor itself is political capital. One girl is coached, late in every reaction, and not actually Resonant; she volunteered for the deception because her latent younger sister would otherwise be taken. The Major House needs your certification, your house needs the favor, and the girl needs you to understand the lie without forcing her to say it.', title: 'The Dowry Inspection', origins: ['minor-house'], frame: { objective: 'Decide whether to make a false child legally true when honesty delivers her sister', crucible: 'Fraud protects one child, truth exposes another, and two houses want your integrity as decoration' }, arc: { name: 'The Dowry Inspection', episode: 'Let the false Resonant, waiting houses, and unseen sister define what certification would really do' } },
    { hook: 'A Drift storm has severed your house\'s frontier holding from all communication and transit for what the Throne estimates will be eleven days. You are the highest-ranking house member on-site. The holding has provisions for seven days. Forty-three people, including a Synod observer who was mid-inspection when the storm hit. The observer is technically your guest. She is also taking notes. On day two, the well pump fails. The Resonant indentured to your house can fix it; she was an engineer before classification. Using her skills means putting a Resonant in a position of authority over house operations, with a Synod observer watching. Not using her means rationing water for nine more days.', title: 'The Eleven Days', origins: ['minor-house'], frame: { objective: 'Keep the holding alive for eleven days with dwindling resources and a Synod witness', crucible: 'A Resonant who can save you, a Synod observer who will report you, and a well that won\'t wait for politics' }, arc: { name: 'The Eleven Days', episode: 'Assess the holding\'s resources and decide how to handle the failed pump' } },
    // ── Minor House / Assessor ──
    { hook: 'A Major House offers your family a trade concession worth three years of revenue. The price is two Resonants from your allocation for a project the Major House will not name. Your elders are divided and have delegated the decision to you because everyone wants survival and no one wants the stain.', title: 'The Concession', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Expose what the unnamed project wants and decide what house survival is allowed to cost', crucible: 'A concession that could save your house, two lives the Major House refuses to name, and elders using your judgment as insulation' }, arc: { name: 'The Concession', episode: 'Put the unnamed project, divided elders, and chosen Resonants on the table before accepting the concession' } },
    { hook: 'Records under your control show three Resonants who do not exist. Your steward wants the discrepancy buried by assigning the false loss to a real dead Resonant from a rival house whose family has not yet been told. The steward is protecting your house, the rival family is about to lose even the truth of their dead, and your name can turn theft into official memory.', title: 'The Forged Ledger', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Decide who gets to spend a dead Resonant\'s name before the lie becomes inheritance', crucible: 'House survival built from false numbers and a grieving family whose dead can still be stolen' }, arc: { name: 'The Forged Ledger', episode: 'Force the steward\'s false ledger against the rival family\'s grief before a dead name becomes currency' } },
    { hook: 'Your house\'s sole remaining high-tier Resonant has requested an audience with you \u2014 not the elders, not the Synod liaison. You. She says she knows what happened to the allocation that was halved two generations ago. She says the official record is wrong. She wants something in return for telling you.', title: 'The Audience', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Learn what the Resonant knows about your house\'s lost allocation', crucible: 'The truth about your house\'s fall may cost more than ignorance' }, arc: { name: 'The Lost Allocation', episode: 'Meet the Resonant and discover what she wants in exchange' } },
    { hook: 'You were inserted into a rival house to prove illegal Resonant breeding. You found the evidence, and also children who are already attuning under care less cruel than the Synod would give them. Your handler wants the intel, while the woman who thinks you are her friend is teaching you an instrument badly enough that the lie has become intimate.', title: 'The Inserted Daughter', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Decide whether your report serves the Throne, the children, or the trust your cover stole', crucible: 'Evidence that condemns abuse by delivering children to worse abuse, and a friendship built from espionage' }, arc: { name: 'The Inserted Daughter', episode: 'Test the handler\'s demand against hidden children and trusting friend before reporting' } },
    // ── Minor House / Sworn Blade ──
    { hook: 'Orders come down at dawn: escort the family physician to a holding cell before the house wakes. No charges, no explanation, no witnesses. You\'ve known him since childhood; he set your broken wrist the summer your father died. Your captain says he needs to "disappear cooperatively" until an audit passes. Standing orders authorize force if he resists. The physician is packing a small bag when you arrive. He looks up, sees your face, and says "I was hoping it would be you." He doesn\'t elaborate on whether that\'s mercy or condemnation.', title: 'The Quiet Arrest', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Escort the physician or warn him', crucible: 'The man who healed you is being erased, and you\'re the instrument' }, arc: { name: 'The Quiet Arrest', episode: 'Reach the physician\'s quarters and face the man who healed you' } },
    { hook: 'You\'ve been assigned to protect a Synod Adjudicator investigating the house you are sworn to, or the house your patron needs clean. The Adjudicator is methodical and genuinely fair; she does not yet know your oath conflicts with her investigation. You have access to her notes until she finds the conflict, which means protection can become sabotage without changing uniforms.', title: 'Shield Duty', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Decide whether your blade protects the Adjudicator, your oath, or the truth each will wound', crucible: 'A fair investigator, a compromised assignment, and loyalty that becomes treachery if named too late' }, arc: { name: 'Shield Duty', episode: 'Guard the Adjudicator until house oath and first incriminating note make protection impossible to keep clean' } },
    { hook: 'A Major House heir has publicly insulted your standing at a Conclave reception. Protocol permits you to demand satisfaction on the dueling ground at dawn. Winning secures your standing permanently. Losing ends you. The heir is a known duelist who has killed four opponents. His second has approached you privately and offered to arrange a survivable outcome in exchange for a favor you will owe his house for the rest of your life. The favor is unspecified. The offer expires at midnight.', title: 'The Dueling Ground', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Fight, accept the deal, or find a way to decline without losing face', crucible: 'Survival vs. honor, with an unspecified debt as the third option' }, arc: { name: 'The Dueling Ground', episode: 'Weigh the offer and prepare for dawn' } },
    // ── Minor House / Broker ──
    { hook: 'Your path to restored or first-time standing runs through a rival who will back your claim on one condition: you must publicly apologize for refusing to sell a seven-year-old latent girl to their house. She is fourteen now, thriving quietly, and the apology would make her transfer look like justice. The rival wants your humility, your house wants standing, and the girl\'s safety depends on whether you let etiquette rewrite protection as offense.', title: 'The Apology', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Decide whether restored standing is worth making apology into a transfer order', crucible: 'A public apology that heals your name by reopening a child\'s captivity' }, arc: { name: 'The Apology', episode: 'Stand in the apology\'s public room with rival, house, and protected girl all measuring the purchase' } },
    { hook: 'A Major House invites you to serve as neutral witness for a marriage negotiation, an honor far above your current standing and clearly a test. The dowry includes two Resonants under twelve, and one child mouths a word you cannot catch while every adult in the room waits to learn whether you value future access more than what the child is trying to risk.', title: 'The Marriage Broker', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Decide whether a brokered alliance can survive refusing a child\'s silent plea', crucible: 'A child asking for help in a room where helping may end your future usefulness' }, arc: { name: 'The Marriage Broker', episode: 'Let the child, hosts, and alliance terms show what neutrality would protect' } },
    { hook: 'You\'ve been sent to a frontier settlement because its Resonant tithe is three children short. The elders offer labor, grain, or their own bondage instead, while your higher authority has quietly limited your options to children or a military recommendation. The elders do not know the second option exists, and their kindness is making the order harder to hide behind.', title: 'The Tithe Delegation', origins: ['minor-house', 'imperial-service'], classes: ['Broker', 'Handler'], frame: { objective: 'Decide whether your mandate protects the frontier elders or turns their kindness into evidence', crucible: 'A short tithe, revoked discretion, and elders who keep treating you like a person instead of an instrument' }, arc: { name: 'The Tithe Delegation', episode: 'Put the elders\' kindness against the hidden military option before higher authority defines your mandate' } },
    { hook: 'A Major House offers your family a junior Conclave seat if you publicly support the Synod\'s new quota doubling frontier testing. Your elders are split between hunger for standing and fear of being remembered as collaborators. The Major House chose you because your answer can make ambition sound like duty.', title: 'The Conclave Seat', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Decide whether house advancement is worth becoming the public face of frontier conscription', crucible: 'A Conclave seat bought with children you will never meet and a family eager to call the price strategy' }, arc: { name: 'The Conclave Gambit', episode: 'Ask the elders and Major House who benefits if your voice sells the quota' } },
    // ── Undrift origin hooks ──
    { hook: 'An Ashen Ward on the far side of the district has gone quiet. The network\'s contact inside stopped transmitting two weeks ago. Three "spent" Resonants in that Ward are not spent \u2014 they\'re hidden, and someone was keeping them safe. You\'ve been asked to find out what happened.', title: 'Gone Quiet', origins: ['undrift'], frame: { objective: 'Find out what happened to the Ward contact', crucible: 'Walking into a Synod facility as the thing they\'re built to detect' }, arc: { name: 'The Silent Ward', episode: 'Infiltrate the Ashen Ward and locate the missing contact' } },
    { hook: 'Someone inside the Undrift is selling names to the Synod. Three families have been raided in eight days, your handler suspects a person with safehouse access, and the next rotation will either expose everyone or flush the informer by putting more families at risk.', title: 'The Leak', origins: ['undrift'], frame: { objective: 'Expose who is selling names without turning the network into bait for itself', crucible: 'An informer who knows your routes, a handler willing to gamble, and families who become evidence when you move' }, arc: { name: 'The Informer', episode: 'Use the next safehouse rotation to corner the informer without making families into bait' } },
    { hook: 'A Drift anomaly has appeared in a frontier canyon the Undrift uses as a transit corridor. It responds to proximity, matching the attunement signature of a latent child from a nearby safehouse who now refuses to leave because she says it is talking to her. The network wants the passage protected, the Synod survey is coming, and the child may be witness, key, or bait.', title: 'The Singing Canyon', origins: ['undrift'], frame: { objective: 'Decide whether the anomaly is sanctuary, signal, or trap before the survey turns the child into proof', crucible: 'A route the network needs, a child the Drift may have chosen, and a Synod sweep that will make discovery irreversible' }, arc: { name: 'The Singing Canyon', episode: 'Bring the child to the canyon before network urgency or Synod survey defines what it is asking for' } },
    { hook: 'A Synod enforcement squad has located one of the network\'s deep safehouses. The Runner who was managing the house triggered the emergency protocol: twelve people inside, including four children under ten. The enforcement squad has the building surrounded. They have not breached yet because they believe the house contains a single adult fugitive. They don\'t know about the children. The Runner sent one message before going dark: coordinates, headcount, and the words "they\'re cutting the power at dawn." Dawn is six hours away. The nearest network asset is you.', title: 'Six Hours', origins: ['undrift'], frame: { objective: 'Extract twelve people from a surrounded safehouse before dawn', crucible: 'Twelve people, four children, a Synod squad that doesn\'t know what it\'s surrounding, and six hours of darkness' }, arc: { name: 'The Safehouse Extraction', episode: 'Scout the enforcement perimeter and identify extraction routes' } },
    // ── Undrift / Ghost ──
    { hook: 'The underground route you\'ve used to move four children offworld in the past year has been compromised. You know this because the last courier didn\'t come back. Tonight you are supposed to move a fifth child \u2014 a nine-year-old boy whose family has already sold everything they own to pay for his passage. If you abort, he goes back to a town where the Assessors arrive in three days. If you run the route, you almost certainly lose him and yourself. The handler who arranged the compromised route is in the room with you right now, and doesn\'t know you know.', title: 'The Route', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Move the child, abort, or confront the handler', crucible: 'A compromised route, a boy who can\'t go home, and a handler who might be the reason' }, arc: { name: 'The Route', episode: 'Decide what to do about the handler before tonight\'s run' } },
    { hook: 'A fellow Ghost has brought you a request: move an adult Resonant, not a child. An active-service Resonant who has defected from the Synod and wants out of the Hegemony entirely. He has knowledge of Drift operations that could topple careers. He is also the man who, eleven years ago, was the Resonant assigned to the fleet action that destroyed your home village. He didn\'t know \u2014 he was told it was a rebel stronghold \u2014 but it was his attunement that did it. He is asking you, personally, for passage. He recognizes you.', title: 'The Cargo', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Grant or deny passage to the man who destroyed your village', crucible: 'Saving the person who killed everyone you loved, because the network needs what he knows' }, arc: { name: 'The Cargo', episode: 'Meet the defector and decide whether to take the job' } },
    { hook: 'You have a contact inside a Synod processing facility: a junior assessor who has been leaking schedules and looking the other way on three extractions over the past year. He\'s asked to be brought out. His cover has started to fray and he believes he has maybe two weeks before an internal audit exposes him. Bringing him out saves his life and costs you the only Synod-internal asset your cell has ever had. Leaving him in place keeps the intel pipeline alive for perhaps six more months, at which point he will almost certainly be executed. He has a wife and a young son who know nothing about any of this.', title: 'The Inside Man', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Extract the asset or keep the pipeline', crucible: 'One man\'s life against six months of intelligence that will save others' }, arc: { name: 'The Inside Man', episode: 'Evaluate the risk and meet the asset\'s family' } },
    // ── Undrift / Runner ──
    { hook: 'A child in the next settlement over tested positive three days ago. The Synod assessment team arrives tomorrow. The network has asked you to get the family out before dawn. You have twelve hours, no papers, and a suppression kit that works for six weeks.', title: 'Twelve Hours', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Extract the family before the assessment team arrives', crucible: 'Twelve hours, no papers, and a network that can\'t help if you\'re caught' }, arc: { name: 'The Extraction', episode: 'Get the family out of the settlement and into the underground' }, startingCounters: { exposure: 1 } },
    { hook: 'You\'ve tracked a latent child to a frontier holding before the Synod Assessors arrived \u2014 but you\'re not the first to find her. Another Undrift operative is already there, from a different cell, and they intend to extract her tonight. The problem: the cell they serve has been trading information to Imperial intelligence for six months to keep their safehouses running. If you let the extraction proceed, the girl\'s location is in the Throne\'s hands by morning. If you intervene, you expose yourself to a cell you have no authority over, and the child\'s family sees two strangers fighting over her in their own kitchen. The child is nine. She is hiding under the kitchen table, watching you both.', title: 'The Second Finder', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Get the girl to safety without exposing the network', crucible: 'Two rescuers, one compromised cell, and a child watching adults decide her fate' }, arc: { name: 'The Second Finder', episode: 'Confront the other operative in the family\'s kitchen' } },
    { hook: 'Your network has intercepted a Synod assessment schedule for twenty-three children across eleven townships. You have routes and resources to save eight. Your cell handler says to save the highest latent tiers because the Synod will never stop hunting them, while one low-tier name is a child you helped deliver in a safehouse attic during a snowstorm.', title: 'The List', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Decide whose lives the network will spend its routes on and make the handler answer for the math', crucible: 'Triage logic, one name you love, and fifteen children whose absence will also be a choice' }, arc: { name: 'The List', episode: 'Force the handler, route network, and first family named to make the extraction logic human' } },
    // ── Undrift / Voice ──
    { hook: 'An old Undrift woman who has kept the network\'s memory for forty years is dying and wants you to inherit the book of taken children: names, ages, townships, dates. Nine hundred and seventeen entries. Some names belong to people you knew, one might be you, and rival cells, grieving families, and Synod hunters would each use the book differently if they knew she had chosen you.', title: 'The Names', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Decide what the book makes you owe the living, the dead, and the name that might be yours', crucible: 'A dying keeper of memory, a book powerful enough to heal or expose the network, and your own history hiding in its pages' }, arc: { name: 'The Names', episode: 'Let the dying woman, first familiar name, and network risk define what inheriting memory costs' } },
    { hook: 'A Heretic faction within the Synod is preparing to publish a dossier exposing the falsification of Resonant degradation records. They need a corroborating witness who can speak to specific incidents with firsthand detail. You can. Testifying means revealing your identity publicly \u2014 not to the Synod, but to a public trial that the Synod will watch with full intent to act afterward. Your network has voted against your testifying by a narrow margin. The Heretic representative is waiting in a safehouse for your answer. She has traveled three weeks to ask you in person.', title: 'The Testimony', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Testify or protect the network', crucible: 'Your testimony could end the cover-up, and the network thinks it will end you' }, arc: { name: 'The Testimony', episode: 'Meet the Heretic representative and hear what she needs' } },
    { hook: 'A young woman has found your network claiming she escaped an Ashen Ward discharge seven years ago by faking her death. She remembers fragments that your archives could confirm, and she wants her name back. If she is genuine, the truth will send her toward a family the Synod may still watch; if she is a plant, any confirmation gives hunters a live trail into the network.', title: 'The Child Who Lived', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Decide whether giving a woman her name protects her, endangers the network, or does both', crucible: 'A crying stranger asking for herself back and records that can restore a life or open the safehouses' }, arc: { name: 'The Child Who Lived', episode: 'Match her fragments against the archives while the network argues whether her name can be spoken' } },
    { hook: 'You watched a Synod enforcer kill an Undrift Resonant during what was supposed to be a negotiated handover. The Resonant had agreed to surrender \u2014 arranged through intermediaries, on promise of clemency. She was walking toward the checkpoint with her hands open when the enforcer fired. Your network was coordinating the handover. Three other operatives saw it happen. They\'ve asked you to record what you saw \u2014 names, dates, what she said, how she fell. A detailed eyewitness account narrows the list of who could have been present to perhaps four people. Writing it exposes the network. Not writing it means she died and no one said it out loud. Her son is in a safehouse three districts away. He doesn\'t know yet.', title: 'The Enforcer\'s Kill', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Write the testimony or protect the network', crucible: 'A dead woman\'s truth against the safety of everyone who hides' }, arc: { name: 'The Enforcer\'s Kill', episode: 'Sit down with the account and decide what to write' } },
    // ── Imperial Service origin hooks ──
    { hook: 'A Synod Adjudicator is assassinated on a frontier world. The Throne suspects a house, the houses suspect the Synod staged it, and the Synod blames the Undrift. Every faction already has the answer that would justify the war it has been preparing for, and your authority only matters if truth can outpace usefulness.', title: 'The Adjudicator', origins: ['imperial-service'], frame: { objective: 'Expose who benefits from the Adjudicator\'s death before a convenient answer becomes war', crucible: 'One corpse, three factions with preferred culprits, and a truth that may serve none of them' }, arc: { name: 'The Adjudicator\'s Death', episode: 'Cross-examine first witnesses and faction envoys at the body before any convenient answer hardens' } },
    { hook: 'Your handler goes silent after one word: "compromised." Your cover on a house world still holds, but Imperial Service agents do not officially exist there, and someone may be using the silence to see whether you protect the mission, the handler, or yourself. Extraction is not missing; it may have been denied.', title: 'Compromised', origins: ['imperial-service'], frame: { objective: 'Decide whether the compromised silence is warning, abandonment, or a test before your cover becomes someone else\'s leverage', crucible: 'A vanished handler, no official existence, and a mission that may survive only by spending you' }, arc: { name: 'The Silent Handler', episode: 'Push through house pressure and the dead extraction channel to learn who still knows you are there' } },
    { hook: 'A frontier audit surfaces seven garrison commanders ordering identical nonmilitary equipment on the same day: thermal shielding, resonance dampeners, archaeological survey tools. The cost is too small to trigger review, the coordination is not. Someone inside the Imperial apparatus is assembling the means to open something, and your section chief does not know yet because the system was built to miss exactly this kind of intent.', title: 'The Requisitions', origins: ['imperial-service'], frame: { objective: 'Decide who inside the military is building an opening and whether your mandate can survive stopping them', crucible: 'Tiny legal orders, coordinated purpose, and an Imperial system whose blind spots may be deliberate' }, arc: { name: 'The Requisitions', episode: 'Trace the equipment pattern to the first commander before the absent section chief notices the wrong thing' } },
    // ── Imperial / Analyst ──
    { hook: 'An intercepted communication in your morning brief names a Synod Hierarch as the source of leaked assessment schedules that have helped three frontier worlds hide children. Your superior wants the Hierarch exposed to weaken Synod influence with the Throne. Acting on the intelligence stops the leaks; suppressing it protects the children and lies to a superior who trusts you.', title: 'The Intercept', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Decide who the leak protects and who gains power if you expose it', crucible: 'Two hundred children saved by treason, a superior using truth as a weapon, and your access to the brief that can end both' }, arc: { name: 'The Intercept', episode: 'Bring the superior, saved children, and hidden Hierarch into the same intelligence choice' } },
    { hook: 'Your section produces the intelligence forecasts that guide Synod assessment deployment schedules. For the past eighteen months, you have been quietly adjusting the forecasts \u2014 weighting certain frontier sectors as lower-priority based on manufactured indicators. The adjustments have delayed roughly forty assessments. You have told no one. This morning, a new analyst has been assigned to your section for training. She is sharp, earnest, and asked excellent questions about the forecasting model during her orientation. She will notice the adjustments within weeks. You have to decide, before the end of the day, whether to train her in the model as it actually operates, train her in the fiction, or request her reassignment \u2014 which will itself raise flags you can\'t afford.', title: 'The Forecast', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Handle the new analyst before she discovers the falsified forecasts', crucible: 'Eighteen months of quiet sabotage vs. a sharp junior who will find the truth' }, arc: { name: 'The Forecast', episode: 'Meet the new analyst and assess how much time you have' } },
    { hook: 'You were present at a fleet action where a high-tier Resonant was burned out on unsafe orders. Your official report protected the officer who gave them because the officer was your friend. Now the Resonant\'s family has forced a Synod review, the Adjudicator wants your original notes, and your friend expects the same loyalty that already made the family grieve through a lie.', title: 'The Report', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Decide what truth can survive between your friend, the family, and the review that wants a clean culprit', crucible: 'A dead Resonant, a friend you protected, and notes that can become justice, perjury, or scapegoat' }, arc: { name: 'The Report', episode: 'Face the family\'s demand, your friend\'s claim, and the Adjudicator\'s review before choosing what the notes become' } },
    { hook: 'Someone inside your own intelligence service deliberately burned your cover. The house you infiltrated will connect the alias to your real identity soon, your handler is silent, and whoever exposed you needs you to run, confess, or blame the wrong person before the operation\'s deeper purpose surfaces.', title: 'Double Bind', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Turn the betrayal back on whoever needs you exposed before either side owns your story', crucible: 'No extraction, a hostile house closing in, and an intelligence service that may be using your exposure as leverage' }, arc: { name: 'The Burned Cover', episode: 'Use the burned alias before panic lets the infiltrated house or silent handler own your story' } },
    // ── Imperial / Warden ──
    { hook: 'The tithe is short. A frontier settlement owes the Synod three Resonants it cannot produce, and replacement children will be selected if the shortage stands. The cause is not yet clear: one protected person, an Undrift route, or Synod pressure pulling the numbers tight from above. As an Imperial Warden, you have to find what is really behind the shortfall and preserve the Hegemony\'s justice before the Synod turns arithmetic into seizure.', title: 'The Tithe', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Find what is really behind the shortfall before the Synod acts', crucible: 'Hegemony justice against a Synod arithmetic that can be paid in children' }, arc: { name: 'The Tithe', episode: 'Expose who benefits from the shortage and decide what justice requires' } },
    { hook: 'You\'ve been assigned to escort a fleet operation that will use a Drift weapon on a populated moon suspected of harboring a separatist Resonant cell. The strike will kill everyone on the surface to reach a handful of suspects, and the order was signed by the Admiral who taught you what Imperial justice was supposed to mean. He would take your call if you made it.', title: 'The Fleet Order', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Decide whether Imperial justice survives the Admiral\'s order and what you will risk to test it', crucible: 'A trusted commander, a doomed moon, and a Warden\'s authority trapped between defense and massacre' }, arc: { name: 'The Fleet Order', episode: 'Call or confront the Admiral from the fleet bridge while the doomed moon makes the order concrete' } },
    { hook: 'A Minor House requests Imperial protection after one of its Resonants escapes and joins an Undrift cell. The recovery file says she is sixteen, has belonged to the House since age four, and was subjected to "performance enhancement protocols" that read like torture. The matriarch hosting you can sound reasonable because Imperial security gives her cruelty the shape of law.', title: 'The Defector', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Decide whether Imperial protection serves House recovery, the escaped child, or the justice the House is borrowing', crucible: 'A tortured child called property, a reasonable matriarch, and your Warden authority being used as polish' }, arc: { name: 'The Defector', episode: 'Put the matriarch\'s courtesy against the recovery file before protection becomes capture' } },
    // ── Imperial / Handler ──
    { hook: 'Two Major Houses are near open conflict over Resonant allocation, and the Throne has sent you to mediate. The elegant solution on the table redirects twelve children from three unrepresented frontier townships. Both House representatives approve because the people who would pay are absent, and as a Handler you can make exploitation look like peace if you let the room stay polite.', title: 'The Mediation', origins: ['imperial-service'], classes: ['Handler'], frame: { objective: 'Use Throne authority to keep House peace from being paid in unrepresented children', crucible: 'A settlement everyone powerful accepts because the frontier has no chair' }, arc: { name: 'The Mediation', episode: 'Interrupt the elegant compromise by putting the absent townships in the room' } },
    { hook: 'You\'ve been sent to negotiate over a Resonant child taken by a Minor House that claims it "found" her unregistered. The House wants recognition, the Synod wants custody, and the child wants to return to the parents waiting outside after eleven days of travel. The Throne prefers institutional custody but gave you discretion the parents do not know you have.', title: 'Silent Terms', origins: ['imperial-service'], classes: ['Handler'], frame: { objective: 'Decide whose claim over the child you recognize and who learns how much discretion you had', crucible: 'Three official claimants, parents outside the room, and a child whose wishes become negotiable if you let them' }, arc: { name: 'Silent Terms', episode: 'Bring House, Synod, parents, and child to the edge of your discretion before recognizing any claim' } },
    // ── Spent Resonant origin hooks ──
    { hook: 'A letter reaches your Ward bunk with no sender: a name, a location, and a photograph of a child who looks like the person you were before the Dimming. The child is on next month\'s testing schedule. Someone outside the Ward knows enough to make this your problem and dangerous enough that ignoring it may be what they expect.', title: 'The Letter', origins: ['spent-resonant'], frame: { objective: 'Decide what the child\'s resemblance makes you owe before the sender, Synod, or Ward defines it', crucible: 'A child who might be yours, a testing schedule you survived, and an unknown sender using memory as a summons' }, arc: { name: 'The Unnamed Child', episode: 'Follow the photograph from Ward bunk to testing schedule before the unknown sender defines the debt' }, startingCounters: { embers: 1 } },
    { hook: 'The Ashen Ward physician asks to see you privately because your supposedly flat attunement signature flickered during a scan. She has not filed it yet, the Ward will punish both of you if the truth is useful to the wrong authority, and she wants to know whether you are asking her to lie, run, or believe you are becoming something neither of you can name.', title: 'The Flicker', origins: ['spent-resonant'], frame: { objective: 'Decide who owns the flicker before the Ward turns it into confinement, evidence, or leverage', crucible: 'A classification that protects and imprisons you, and a physician risking her safety by asking what you want' }, arc: { name: 'The Anomalous Reading', episode: 'Answer the physician before Ward rules and returning attunement turn secrecy into danger' }, startingCounters: { embers: 1 } },
    { hook: 'Three other Ward residents have approached you separately in the last week. Each one said the same thing: they can still feel the Drift. They want to know if you can too. They want to know if you\'ll help them prove the Synod is lying about the Dimming.', title: 'Still Here', origins: ['spent-resonant'], frame: { objective: 'Decide whether to organize the Ward residents or protect them by staying silent', crucible: 'Speaking up proves the Synod\'s classification is fraud \u2014 and makes every one of you evidence' }, arc: { name: 'The Ward Awakening', episode: 'Meet the three residents and assess what they actually want' } },
    // ── Spent / Remnant ──
    { hook: 'Something in the Drift is reaching for you. Not memory, not flashback \u2014 active, intentional, tonight. You thought you were done. Your hands have started tingling in the specific way they did before your first attunement at age eleven. The pressure is not a voice; it is a knowing, and it recognizes your old service designation, and it is asking you to open. You have been discharged for six years. If you answer, you are not what the discharge paperwork says you are. If you don\'t answer, something that has been trying to reach you for six years will keep trying, and you don\'t know what it wants.', title: 'The Reaching', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Answer or refuse the Drift', crucible: 'Six years of silence, and whatever is calling knows your name' }, arc: { name: 'The Reaching', episode: 'Feel the pressure build and decide whether to open' }, startingCounters: { embers: 1 } },
    { hook: 'A nine-year-old girl has appeared at the Ashen Ward gate asking for you by name. She is latent, untested, frightened, and says the Drift showed her your face and told her you could help. She is correct that you can \u2014 your residual attunement, used carefully, could hide her from Synod screening long enough to get her to an Undrift network. Using it reopens what the discharge closed. The girl has walked three days alone to find you. She has a small bag of dried fruit and a drawing she made of your face that is, impossibly, accurate down to the scar on your jaw.', title: 'The Child at the Ward Gate', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Help the girl or send her away', crucible: 'A child the Drift sent to you, and helping her proves you\'re not what the Ward says you are' }, arc: { name: 'The Child at the Ward Gate', episode: 'Meet the girl at the gate and see her drawing' }, startingCounters: { embers: 1 } },
    { hook: 'Three of your old service crew \u2014 Resonants you were bonded with during the worst year of your career \u2014 have sent word. They are all Spent now, all in different Wards. They have been dreaming the same dream for a month: a location, a date, a need. They want to meet. They think something is calling them back for one last attunement \u2014 coordinated, deliberate, meaningful. They say they can feel it is good. You have every reason to trust them and every reason to suspect that whatever is calling them is the same institutional apparatus that used you up in the first place, now trying again with the scraps. The meeting is in two weeks. Traveling there violates the terms of your discharge.', title: 'The Old Crew', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Go to the meeting or stay in the Ward', crucible: 'Three people you trust with your life, calling you toward something that could be salvation or the last extraction' }, arc: { name: 'The Old Crew', episode: 'Receive the message and decide whether to break your discharge terms' } },
    { hook: 'On rotation in an Ashen Ward, you discover a third of the "spent" Resonants still have measurable attunement. Ward staff have been hiding them for years. One woman has waited for someone who would read the charts, and she has names for you to memorize before she dies because the Synod placed them here expecting silence and someone made survival into conspiracy.', title: 'The Ward', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Decide whether the hidden functional Resonants are patients, prisoners, or a rebellion the Ward has been quietly keeping alive', crucible: 'A false classification, staff complicity, and names that become dangerous once remembered' }, arc: { name: 'The Hidden Ward', episode: 'Take the woman\'s first name from the list while Ward staff decide whether hiding still protects anyone' } },
    // ── Spent / Sentinel ──
    { hook: 'The commander who burned out your attunement tracks you down, frightened and clutching a data-slate. Three Spent from your old rotation have died of tidy natural causes, and he thinks you are next. He offers to hide you, which makes the man who destroyed you the only person currently acting like your life matters.', title: 'The Old Handler', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Decide whether the old handler is shield, bait, or debt before the cleanup reaches you', crucible: 'A destroyer asking to save you, dead Spent from your rotation, and vengeance that may be exactly what someone expects' }, arc: { name: 'The Old Handler', episode: 'Test the handler\'s data-slate against the first cleaned-up death before choosing survival or revenge' } },
    { hook: 'Your physical changes from service used to be mild. Now you are stronger than you should be and healing too quickly. Your old Physik, still your friend, thinks your attunement was never Dimmed, only changed. She can prove it only through Synod facilities, and the law gives her a week before friendship becomes reportable knowledge.', title: 'The Body That Remembers', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Decide whether friendship, law, or your body\'s truth controls what happens next', crucible: 'A body disproving the Synod, a friend bound to report it, and tests that could become proof or capture' }, arc: { name: 'The Body That Remembers', episode: 'Put your changing body and the required tests between friendship and reportable law' }, startingCounters: { embers: 1 } },
    { hook: 'In a frontier market, a young Synod acolyte \u2014 eighteen, newly deployed \u2014 has recognized you. Not your face: your resonance pattern. The Synod has developed a new training protocol that lets young Seekers detect Spent Resonants who still carry residual attunement. She has identified you as one. She has not reported you yet. She is standing ten meters away, watching you, trying to decide what to do. Her face is uncertain. She seems to be waiting for you to approach her, or to run, or to do something that will resolve her decision for her. You have perhaps thirty seconds.', title: 'The Recognition', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Approach, run, or do something she isn\'t expecting', crucible: 'Thirty seconds and a young woman who hasn\'t decided yet what kind of Synod she serves' }, arc: { name: 'The Recognition', episode: 'Lock eyes with the acolyte and make your move' } },
    // ── Spent / Witness ──
    { hook: 'A Synod Hierarch visits your hospice in person with an offer: freedom from the Ward, a protected life, and a question only your unreported Drift-memory can answer. She asks kindly because power can afford kindness when it is alone in the room. The memory kept you alive by staying hidden, and now it can buy freedom only by becoming Synod property.', title: 'The Visitor', origins: ['spent-resonant'], classes: ['Witness'], frame: { objective: 'Decide whether freedom is worth giving the Hierarch a memory the Synod can weaponize', crucible: 'A secret that preserved your life, a life offered in exchange, and the most powerful person you have ever faced asking gently' }, arc: { name: 'The Visitor', episode: 'Hear the Hierarch\'s gentle offer and decide who would own the hidden memory once answered' } },
    { hook: 'You have started to see things in the Drift that read less like memory and more like forward vision. A specific child, a specific date, a specific terrible outcome. The vision is unambiguous: three weeks from now, a Resonant child will be killed during a botched Synod intervention in a town you have never visited. Telling someone requires revealing that your attunement has evolved past Dimming, which ends your protected status and possibly your life. Not telling means the child dies and you knew. The vision has come to you four nights in a row. Each night it is slightly more detailed. Each night you remember the child\'s face more clearly. She has a gap between her front teeth.', title: 'The Prophecy', origins: ['spent-resonant'], classes: ['Witness'], frame: { objective: 'Act on the vision or protect yourself', crucible: 'A child with a gap in her teeth, three weeks away, and your silence is the only thing keeping you alive' }, arc: { name: 'The Prophecy', episode: 'Wake from the fourth vision and decide what to do with what you\'ve seen' }, startingCounters: { embers: 1 } },
    { hook: 'Another Spent Resonant from a different sector, a woman roughly your age whose service overlapped with yours for eighteen months a decade ago, has found you. She says she has been having the same Drift-visions you have. She can describe things you have seen, things you have told no one about. She wants to compare visions, systematically, to figure out what the Drift is trying to show you both. The sessions she is proposing would deepen both your attunements significantly. She is not Synod. She is not Undrift. She describes herself as "listening." You believe her, and that is exactly what makes you suspicious.', title: 'The Other Oracle', origins: ['spent-resonant'], classes: ['Witness'], frame: { objective: 'Collaborate or refuse', crucible: 'Shared visions that validate your sanity but deepen the very thing that makes you hunted' }, arc: { name: 'The Other Oracle', episode: 'Meet the woman and hear what she\'s seen' } },
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
    'Aldren', 'Belvaine', 'Caereth', 'Delvane', 'Erissol', 'Fendrath',
    'Galthen', 'Helvaine', 'Ivoreth', 'Jaeren', 'Kelvaine', 'Lossaran',
    'Maeveth', 'Noravel', 'Osseren', 'Pellith', 'Quelane', 'Raveth',
    'Sotheren', 'Telvaine', 'Uvaren', 'Vellith', 'Wythane', 'Xaerun',
    'Ysolenne', 'Zarveth', 'Aethren', 'Brevane', 'Colvaine', 'Dareth',
    'Elvaine', 'Fennoch', 'Goreth', 'Halvaine', 'Issaren', 'Jelvane',
    'Kaerveth', 'Lorenne', 'Melvaine', 'Narveth', 'Orvaine', 'Pelleth',
    'Quorvane', 'Rossaren', 'Selvaine', 'Tarveth', 'Ulvenne', 'Vorane',
  ],
}

export default epicSciFiConfig
