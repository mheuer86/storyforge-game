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
    { hook: 'Your house has been allocated a new Resonant. She\'s fourteen. She arrives tomorrow. Your job is to make the transition smooth. Her family hasn\'t stopped sending messages. The Synod says to ignore them.', title: 'The Allocation', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Decide the Resonant girl\'s fate', crucible: 'The family\'s pleas vs. Synod protocol and house expectations' }, arc: { name: 'The Weight of Allocation', episode: 'Receive the Resonant and face her family\'s messages' } },
    { hook: 'You\'ve been assigned to escort a Synod testing team to a frontier world. The locals have been hiding their children. Your orders are clear. Your conscience is not.', title: 'The Testing', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Complete the escort to the first settlement', crucible: 'Empty villages and soldiers who don\'t want to follow orders' }, arc: { name: 'The Frontier Testing', episode: 'Reach the first settlement and confront the hidden children' } },
    { hook: 'A Resonant in your service has stopped responding to attunement. The Synod wants them returned. Your commander wants the problem to disappear quietly. The Resonant is sitting in your quarters, lucid, and asking you not to send them to the Ashen Wards.', title: 'Quiet Disposal', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Resolve the Resonant\'s fate before the Synod arrives', crucible: 'A lucid person begging for help vs. two authorities demanding compliance' }, arc: { name: 'The Silent Resonant', episode: 'Determine why the Resonant stopped responding to attunement' } },
    { hook: 'Your house is negotiating a marriage alliance. The dowry isn\'t gold \u2014 it\'s three Resonants from the other house\'s reserve. You\'re the one who has to inspect them and sign the transfer documents.', title: 'The Dowry', origins: ['synod', 'minor-house', 'imperial-service'], frame: { objective: 'Inspect the Resonants and decide whether to sign', crucible: 'Three people treated as currency, and your signature makes it legal' }, arc: { name: 'The Marriage Price', episode: 'Meet the three Resonants and assess their condition' } },
    // ── Outsider hooks (Undrift, Spent Resonant) ──
    { hook: 'A Synod testing team has arrived in the market district. They\'ve set up in the square and are calling families forward by name. A woman three stalls ahead of you has just been told her daughter tested positive. The girl is eight. The mother is perfectly still, holding her daughter\'s hand, listening to the assessor explain what happens next. The assessor is kind. The explanation is accurate. Neither of those things makes it bearable. You are close enough to hear every word. No one is looking at you.', title: 'The Public Square', origins: ['undrift', 'spent-resonant'], frame: { objective: 'Act, watch, or leave', crucible: 'Someone else\'s loss, close enough to touch, and your reaction is the only thing that could change it' }, arc: { name: 'The Public Square', episode: 'Decide what to do while the assessment unfolds in front of you' } },
    { hook: 'A routine Synod checkpoint has been set up on the road ahead. Standard biometric screening \u2014 the kind that catches unregistered Resonants and confirms Spent classifications. You have walked through these before. Today your hands are tingling. The queue is twelve people deep. Two families with children are ahead of you. The assessor is young, thorough, and hasn\'t looked up yet.', title: 'The Screening', origins: ['undrift', 'spent-resonant'], frame: { objective: 'Get through the checkpoint or find another way', crucible: 'Twelve people in line, and what happens to you happens in front of all of them' }, arc: { name: 'The Screening', episode: 'Navigate the checkpoint without revealing what you are' } },
    // ── Synod origin hooks ──
    { hook: 'A senior Adjudicator has requested your investigation privately. A Synod scholarium has produced three graduates in the last year whose attunement profiles are identical \u2014 statistically impossible unless the records were fabricated. The scholarium\'s rector is beloved, politically connected, and has been producing exemplary compliance reports for twenty years. Something in those reports is a lie.', title: 'The Exemplary Rector', origins: ['synod'], frame: { objective: 'Determine whether the scholarium\'s records are fabricated', crucible: 'The rector\'s reputation vs. the statistical impossibility \u2014 and the Adjudicator who asked you isn\'t telling you everything' }, arc: { name: 'The Scholarium Investigation', episode: 'Review the three graduates\' profiles and identify the discrepancy' } },
    { hook: 'An Undrift cell has been distributing pamphlets claiming the Drift is alive, that Resonants hear it, and that the Synod knows. Your orders are suppression. The problem: you\'ve been hearing it too.', title: 'Heresy or Truth', origins: ['synod'], frame: { objective: 'Locate the Undrift cell distributing the pamphlets', crucible: 'Your own experience confirms what you\'re ordered to suppress' }, arc: { name: 'Heresy or Truth', episode: 'Track the pamphlet source while concealing your own symptoms' } },
    { hook: 'A Resonant brought to your clinic has degradation patterns you\'ve never seen. Not the gradual Dimming \u2014 something acute, as if her attunement was forced past capacity in a single event. The Synod says she was in "routine service." Her cellular readings say she was used as a weapon. She is conscious, lucid, and knows exactly what was done to her. She wants to tell someone. Your clinic has Synod-mandated monitoring. Writing anything down creates a record. Telling her you believe her is itself a form of record.', title: 'The Patient', origins: ['synod'], frame: { objective: 'Diagnose the Resonant\'s true condition', crucible: 'The medical evidence contradicts the official story, and someone will notice you noticed' }, arc: { name: 'The Weaponized Resonant', episode: 'Complete the diagnosis and document what routine service cannot explain' } },
    { hook: 'You\'ve been assigned to a frontier intake station for the testing season. The physik who preceded you left notes in the margins of the medical log \u2014 observations about attunement readings that don\'t match the official results filed with the Synod. She noted seventeen discrepancies before she stopped writing. She was transferred three days later.', title: 'The Margin Notes', origins: ['synod'], frame: { objective: 'Conduct the intake rotation while investigating the discrepancies', crucible: 'Seventeen children whose readings don\'t match \u2014 and the last person who noticed was removed' }, arc: { name: 'The Margin Notes', episode: 'Arrive at the intake station and find the physik\'s medical log' } },
    { hook: 'A survey team working the outer scholarium archives has unearthed a pre-Hegemony text that describes the Drift not as a natural phenomenon but as an engineered one, created by a civilization that predates every faction in the Hegemony by millennia. The text includes coordinates. The coordinates match a debris field that the Synod has declared off-limits for three centuries, citing "navigation hazards." The survey team leader has requested a Synod escort to the debris field. The request is sitting on your desk. Approving it means the Synod accompanies the discovery. Denying it means the survey team goes without you, and whatever they find belongs to whoever funds the expedition.', title: 'The Engineered Drift', origins: ['synod'], frame: { objective: 'Decide whether to escort the expedition or suppress the discovery', crucible: 'A text that rewrites Drift theology, coordinates the Synod has hidden for centuries, and a team that will go with or without you' }, arc: { name: 'The Engineered Drift', episode: 'Read the pre-Hegemony text and assess the coordinates against known Synod restricted zones' } },
    // ── Synod / Seeker ──
    { hook: 'Another seven-year-old has been seized from a frontier community, and the township has erupted. Riot, sabotage, a dead Synod assessor. Your orders: restore compliance by any means necessary before the unrest spreads. The community knows you\'re coming. A delegation of elders is waiting at the township gate with their hands open. Behind them, every remaining child under twelve has been gathered in the square. The elders have not said what they intend. Your escort is asking for instructions.', title: 'The Taken Child', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Restore order without losing the community', crucible: 'The elders are offering peace on terms you weren\'t authorized to accept' }, arc: { name: 'The Taken Child', episode: 'Approach the township gate and face the delegation of elders' } },
    { hook: 'You\'ve cornered an Undrift Resonant in a tenement district \u2014 a man in his thirties, untrained, terrified, and by your assessment, low-tier. Standing orders for unregistered Resonants are execution on sight. You have the authority to invoke the rarely-used "elevation offer" clause: bring him in alive for training, and the tenement district avoids the punitive sweep that follows any Seeker action. The clause exists so you can spare them. Using it this time means reclassifying him as a volunteer and falsifying his consent. He is begging. Your squad is watching you decide.', title: 'The Mercy Option', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Execute, invoke the clause, or find a third option', crucible: 'The merciful option requires fraud; the lawful option is murder' }, arc: { name: 'The Mercy Option', episode: 'Make the call while your squad and the Resonant watch' } },
    { hook: 'A fellow Seeker \u2014 the man who trained you, who stood as your witness at ordination \u2014 has gone missing after a frontier assignment. Your orders are to find him and return him to the Synod. Intelligence suggests he is alive, well, and actively working with an Undrift cell that has moved nine children offworld in the past month. You find him in a back room of a brewery, alone, waiting. He knew you\'d be the one sent.', title: 'The Apostate', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Decide what to do with the man who made you', crucible: 'Your mentor chose the other side and is trusting you to understand why' }, arc: { name: 'The Apostate', episode: 'Confront your former mentor and hear his reasons' } },
    { hook: 'Your investigation into a frontier heresy cult leads to a Resonant who attuned without Synod training. Impossible, according to doctrine. She\'s coherent, controlled, and says the Drift taught her directly. Your report will either rewrite Synod theology or end her life.', title: 'Doctrinal Anomaly', origins: ['synod'], classes: ['Seeker'], frame: { objective: 'Verify whether the self-attuned Resonant is genuine', crucible: 'Doctrinal truth vs. a living person who contradicts it' }, arc: { name: 'The Doctrinal Anomaly', episode: 'Interview the Resonant and test her attunement claims' } },
    // ── Synod / Crusader ──
    { hook: 'A frontier district has erupted. Three days of riots after a testing team took eleven children in a single sweep. The Synod\'s administrative corridor is barricaded. The families have armed themselves with mining tools and are refusing to disperse. Your orders: restore order, protect Synod personnel, ensure the testing schedule resumes. The district has four thousand people. You have twelve retainers.', title: 'The Uprising', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Restore order without a massacre', crucible: 'Twelve retainers against four thousand grieving parents \u2014 and the testing schedule must resume' }, arc: { name: 'The Frontier Uprising', episode: 'Assess the situation and choose how to approach the barricade' } },
    { hook: 'A frontier community has built a shrine to the Drift outside Synod jurisdiction \u2014 an open-air structure where untested children come to "listen." The Synod has declared it heretical and ordered you to destroy it. When you arrive, the shrine is surrounded by two hundred villagers in silent prayer. They are not armed. They are not moving. The shrine\'s builder \u2014 an elderly woman who was once a Synod lay-sister for thirty years \u2014 is standing at its center, and she greets you by your ordination name. She asks if you would like to pray with them before you begin.', title: 'The Burning Field', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Execute the demolition order', crucible: 'Destroying a heresy built by someone who served the faith longer than you have' }, arc: { name: 'The Burning Field', episode: 'Approach the shrine and face the praying villagers' } },
    { hook: 'You\'re escorting a transport of twelve newly-tested children from a frontier intake station to the Synod scholarium. Three days in transit. The children are quiet, compliant, and have been told they are chosen for a great purpose. On the second night, the youngest \u2014 a boy of six who has not spoken since the intake \u2014 climbs into your lap while you\'re on watch and falls asleep holding your hand. In the morning, the intake officer tells you privately that the boy\'s father died resisting the assessment team. The boy does not know yet. The transport arrives tomorrow.', title: 'The Convoy', origins: ['synod'], classes: ['Crusader'], frame: { objective: 'Complete the escort and decide what the boy should know', crucible: 'You are delivering children to the system that killed this boy\'s father, and he trusts you' }, arc: { name: 'The Convoy', episode: 'Continue the transport while carrying the weight of what you know' } },
    { hook: 'Your garrison has been ordered to hold a Synod processing facility on a world where the locals are openly hiding children from testing. Patrols are finding empty villages. Your soldiers are uncomfortable; three have requested transfers this week. The Synod wants results and has the authority to demand them. The villagers have started leaving food at the garrison gates in the mornings \u2014 quiet bribes, or quiet pleas, or both. Your command structure has noticed. One of your lieutenants has asked whether the food should be reported as attempted influence of Imperial personnel. The regulations are clear on this. Your conscience is not.', title: 'The Garrison', origins: ['synod', 'imperial-service'], classes: ['Crusader', 'Warden'], frame: { objective: 'Find the hidden children or find a reason not to', crucible: 'Soldiers losing faith in orders they\'re asked to enforce, and villagers offering kindness you can\'t accept' }, arc: { name: 'The Empty Villages', episode: 'Investigate why the villages are emptying and decide about the food' } },
    // ── Synod / Shepherd ──
    { hook: 'A Core-world parish has invited you to bless a new assessment center, the first built with Synod funds in a district that has been hiding children for three generations. The ceremony will be broadcast across the sector. The parish priest \u2014 your old mentor, the man who first recognized your gift for sermon \u2014 has prepared a sermon for you. The text is beautiful. It is also a lie about what happens to Elevated children, and you know it now in a way you didn\'t when he taught you. He is watching from the front row, proud.', title: 'The Blessing', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Deliver or rewrite the sermon before the broadcast', crucible: 'Your mentor\'s pride vs. a truth that would destroy it on live broadcast' }, arc: { name: 'The Blessing', episode: 'Read the sermon text and decide what to say on camera' } },
    { hook: 'Every year the Synod sends a Shepherd to a handful of frontier villages to preach the Ascending doctrine and identify families willing to volunteer their children for early assessment. The Synod\'s official position is that volunteers have better outcomes. The internal data says the opposite: volunteered children are disproportionately assigned to high-intensity service because they arrive without family-led legal advocates. Your quota this season is twelve volunteers. You have found a village where six families are interested. Their priest has asked you to address the congregation on the sabbath. Part of you wants to try something different.', title: 'The Recruitment', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Deliver the sermon and fill the quota', crucible: 'You know the Ascending doctrine hurts the children it claims to honor, and six families trust you to tell the truth' }, arc: { name: 'The Recruitment', episode: 'Prepare the sermon and meet the six families' } },
    { hook: 'A high-tier Resonant whose face has been on Synod propaganda for a decade has died in service at thirty-one. The Synod has asked you to deliver the eulogy. You knew her slightly \u2014 you were at the scholarium together as children, and she once laughed at a joke you made about the procession of the feast. Her family will be in attendance. They have been told she died peacefully. You have been briefed on what actually happened: a forced cascade attunement during a fleet action, past the safe limits her physician had recommended. Her mother is in the front row.', title: 'The Funeral', origins: ['synod'], classes: ['Shepherd'], frame: { objective: 'Deliver the eulogy the Synod wrote or the truth the mother deserves', crucible: 'A mother who believes her daughter died in peace, and you know otherwise' }, arc: { name: 'The Funeral', episode: 'Read the Synod\'s eulogy and decide what the mother should hear' } },
    // ── Minor House origin hooks ──
    { hook: 'A rival house has filed a formal complaint with the Conclave: your house is harboring an unregistered Resonant. You know it\'s false \u2014 or you thought you did, until you found the sealed room in the east wing that your elders never mentioned.', title: 'The Sealed Room', origins: ['minor-house'], frame: { objective: 'Investigate the sealed room before the Conclave inspection arrives', crucible: 'Your family may have been hiding exactly what the rival house claims' }, arc: { name: 'The Hidden Resonant', episode: 'Open the sealed room and discover what your house has been protecting' } },
    { hook: 'A Major House has requested an inspector to certify three Resonants being transferred as part of a marriage alliance. Your house volunteered you \u2014 the honor of handling the certification is itself a political asset. During the inspection, you notice discrepancies in one of the three: her responses are coached, her reactions a half-second late. She is not actually a Resonant. She is sixteen. She meets your eyes once and you understand, without words, that she volunteered for the deception to save her younger sister, who is latent and would have been the alternative. The Major House is waiting for your certification. Certifying her is fraud. Failing her gets her rejected and the sister taken.', title: 'The Dowry Inspection', origins: ['minor-house'], frame: { objective: 'Decide whether to certify the false Resonant', crucible: 'Fraud protects a child; honesty delivers one' }, arc: { name: 'The Dowry Inspection', episode: 'Complete the inspection and face the girl\'s silent plea' } },
    { hook: 'A Drift storm has severed your house\'s frontier holding from all communication and transit for what the Throne estimates will be eleven days. You are the highest-ranking house member on-site. The holding has provisions for seven days. Forty-three people, including a Synod observer who was mid-inspection when the storm hit. The observer is technically your guest. She is also taking notes. On day two, the well pump fails. The Resonant indentured to your house can fix it; she was an engineer before classification. Using her skills means putting a Resonant in a position of authority over house operations, with a Synod observer watching. Not using her means rationing water for nine more days.', title: 'The Eleven Days', origins: ['minor-house'], frame: { objective: 'Keep the holding alive for eleven days with dwindling resources and a Synod witness', crucible: 'A Resonant who can save you, a Synod observer who will report you, and a well that won\'t wait for politics' }, arc: { name: 'The Eleven Days', episode: 'Assess the holding\'s resources and decide how to handle the failed pump' } },
    // ── Minor House / Assessor ──
    { hook: 'A Major House has offered your family a trade concession worth three years of revenue. The price: your house provides two Resonants from its allocation for a project the Major House won\'t name. Your elders are divided. The decision has been delegated to you because nobody wants their name on it.', title: 'The Concession', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Decide whether to accept the concession and deliver the Resonants', crucible: 'House survival purchased with two lives you\'ll never see again' }, arc: { name: 'The Concession', episode: 'Investigate what the Major House actually wants the Resonants for' } },
    { hook: 'Records under your control show three Resonants who don\'t exist. Your steward asks you to make the discrepancy stop existing \u2014 not by correcting it, but by planting evidence that a fourth Resonant "died in transit" to balance the ledger. The name on the death certificate has to be real. The steward has already picked one: a real Resonant from a rival house, recently deceased, whose family doesn\'t know yet. Your signature makes the fiction legally true.', title: 'The Forged Ledger', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Sign or refuse the forged certificate', crucible: 'Balancing the books requires stealing a dead person\'s name from their family' }, arc: { name: 'The Forged Ledger', episode: 'Review the records and decide whether to sign the certificate' } },
    { hook: 'Your house\'s sole remaining high-tier Resonant has requested an audience with you \u2014 not the elders, not the Synod liaison. You. She says she knows what happened to the allocation that was halved two generations ago. She says the official record is wrong. She wants something in return for telling you.', title: 'The Audience', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Learn what the Resonant knows about your house\'s lost allocation', crucible: 'The truth about your house\'s fall may cost more than ignorance' }, arc: { name: 'The Lost Allocation', episode: 'Meet the Resonant and discover what she wants in exchange' } },
    { hook: 'You\'ve been positioned in a rival house to gather intelligence on illegal Resonant breeding. Three months in, you\'ve found the evidence \u2014 and you\'ve also found that the program has produced children who are already attuning, and the house is treating them well. Not well enough to justify what was done to create them, but well enough that handing them to the Synod means handing them to a strictly worse fate. Your handler wants the intel. Delivering it condemns the children. Withholding it burns your cover and the three months you\'ve spent earning the trust of a woman who thinks you\'re her friend. She is teaching you to play an instrument neither of you are very good at. You meet for lessons tomorrow.', title: 'The Inserted Daughter', origins: ['minor-house'], classes: ['Assessor'], frame: { objective: 'Decide what to report to your handler', crucible: 'The evidence you found protects children the report would condemn' }, arc: { name: 'The Inserted Daughter', episode: 'Weigh the intelligence against the children and the friendship' } },
    // ── Minor House / Sworn Blade ──
    { hook: 'Orders come down at dawn: escort the family physician to a holding cell before the house wakes. No charges, no explanation, no witnesses. You\'ve known him since childhood; he set your broken wrist the summer your father died. Your captain says he needs to "disappear cooperatively" until an audit passes. Standing orders authorize force if he resists. The physician is packing a small bag when you arrive. He looks up, sees your face, and says "I was hoping it would be you." He doesn\'t elaborate on whether that\'s mercy or condemnation.', title: 'The Quiet Arrest', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Escort the physician or warn him', crucible: 'The man who healed you is being erased, and you\'re the instrument' }, arc: { name: 'The Quiet Arrest', episode: 'Reach the physician\'s quarters and face the man who healed you' } },
    { hook: 'You\'ve been assigned to protect a Synod Adjudicator investigating a house accused of harboring Undrift Resonants. The house being investigated is the one you\'re sworn to \u2014 or the one your patron\'s reputation depends on. The Adjudicator is methodical, polite, and genuinely trying to be fair. She doesn\'t know yet that your oath conflicts with your assignment; the paperwork is three layers deep. She will find the conflict in approximately two days. Between now and then, you have access to her notes.', title: 'Shield Duty', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Survive the investigation without betraying either loyalty', crucible: 'Protecting an investigator targeting your own house' }, arc: { name: 'Shield Duty', episode: 'Begin the protection detail and discover what the Adjudicator already knows' } },
    { hook: 'A Major House heir has publicly insulted your standing at a Conclave reception. Protocol permits you to demand satisfaction on the dueling ground at dawn. Winning secures your standing permanently. Losing ends you. The heir is a known duelist who has killed four opponents. His second has approached you privately and offered to arrange a survivable outcome in exchange for a favor you will owe his house for the rest of your life. The favor is unspecified. The offer expires at midnight.', title: 'The Dueling Ground', origins: ['minor-house'], classes: ['Sworn Blade'], frame: { objective: 'Fight, accept the deal, or find a way to decline without losing face', crucible: 'Survival vs. honor, with an unspecified debt as the third option' }, arc: { name: 'The Dueling Ground', episode: 'Weigh the offer and prepare for dawn' } },
    // ── Minor House / Broker ──
    { hook: 'Your path to restored or first-time standing runs through a rival who has offered to back your claim \u2014 on one condition. You must personally deliver a public apology at the next Conclave session for an offense committed in your name. The offense was the refusal to sell a seven-year-old latent girl to their house. The girl is still in the household she was refused to, now fourteen, thriving, training quietly. Saying the apology consigns her to transfer within the month.', title: 'The Apology', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Deliver or refuse the apology', crucible: 'Your standing purchased with a fourteen-year-old girl\'s freedom' }, arc: { name: 'The Apology', episode: 'Meet the rival and learn the terms of the deal' } },
    { hook: 'A Major House is hosting a marriage negotiation and has invited you to serve as neutral witness \u2014 an honor far above your current standing, clearly a test. The bride\'s dowry includes two Resonants from her family\'s reserve, both under twelve. During the pre-ceremony inspection, one of them looks at you and mouths a word you can\'t quite catch. The ceremony begins in twenty minutes. Intervening destroys the alliance, your invitation, and possibly your future. Not intervening means you watched and said nothing, and the child knows you did.', title: 'The Marriage Broker', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Complete the ceremony or intervene', crucible: 'A child is asking for help in a room where helping costs everything' }, arc: { name: 'The Marriage Broker', episode: 'Attend the inspection and face the child\'s silent plea' } },
    { hook: 'You\'ve been sent to a frontier settlement to collect an overdue Resonant tithe on behalf of a higher authority. The settlement is three children short. The elders offer every possible compromise except children: labor, grain, their own adult lives in bondage. Your authority to accept any of these was revoked before you left. Your orders are to return with three children or return with a military recommendation. The elders do not know the second option exists. One of them is pouring you tea and asking about your mother.', title: 'The Tithe Delegation', origins: ['minor-house', 'imperial-service'], classes: ['Broker', 'Handler'], frame: { objective: 'Return with children, trigger military action, or go off-script', crucible: 'The elder\'s kindness against orders that leave no room for it' }, arc: { name: 'The Tithe Delegation', episode: 'Sit with the elders and hear their offer' } },
    { hook: 'A Major House offers your house a junior seat at the Conclave. The price: your house must publicly support the Synod\'s new Resonant conscription quota, which doubles testing in frontier worlds. Your elders are divided. The decision falls to you.', title: 'The Conclave Seat', origins: ['minor-house'], classes: ['Broker'], frame: { objective: 'Deliver your house\'s answer to the Major House', crucible: 'Political advancement purchased with frontier children\'s futures' }, arc: { name: 'The Conclave Gambit', episode: 'Navigate the divided elders and choose a position' } },
    // ── Undrift origin hooks ──
    { hook: 'An Ashen Ward on the far side of the district has gone quiet. The network\'s contact inside stopped transmitting two weeks ago. Three "spent" Resonants in that Ward are not spent \u2014 they\'re hidden, and someone was keeping them safe. You\'ve been asked to find out what happened.', title: 'Gone Quiet', origins: ['undrift'], frame: { objective: 'Find out what happened to the Ward contact', crucible: 'Walking into a Synod facility as the thing they\'re built to detect' }, arc: { name: 'The Silent Ward', episode: 'Infiltrate the Ashen Ward and locate the missing contact' } },
    { hook: 'Someone is selling names to the Synod. Three families in the network have been raided in eight days. The handler thinks it\'s someone inside \u2014 someone who knows the safe house rotations. You\'ve been asked to find the leak before the next rotation exposes everyone.', title: 'The Leak', origins: ['undrift'], frame: { objective: 'Identify who is selling names to the Synod', crucible: 'The informer knows the same network you do \u2014 investigating means exposing yourself' }, arc: { name: 'The Informer', episode: 'Narrow down who had access to the compromised rotation schedule' } },
    { hook: 'A Drift anomaly has appeared in a frontier canyon that the network uses as a transit corridor. The anomaly is stable, localized, and unlike any recorded Drift phenomenon: it responds to proximity. When a latent child from a nearby safehouse wandered close, the anomaly shifted its output frequency to match her attunement signature. The network wants it mapped before the Synod detects it. You have three days before the next Synod survey sweep covers that sector. The child refuses to leave the canyon. She says the anomaly is talking to her.', title: 'The Singing Canyon', origins: ['undrift'], frame: { objective: 'Map the anomaly and extract the child before the Synod survey sweep', crucible: 'A Drift phenomenon that responds to people, a child who won\'t leave it, and a survey team three days out' }, arc: { name: 'The Singing Canyon', episode: 'Reach the canyon and observe the anomaly\'s behavior with and without the child present' } },
    { hook: 'A Synod enforcement squad has located one of the network\'s deep safehouses. The Runner who was managing the house triggered the emergency protocol: twelve people inside, including four children under ten. The enforcement squad has the building surrounded. They have not breached yet because they believe the house contains a single adult fugitive. They don\'t know about the children. The Runner sent one message before going dark: coordinates, headcount, and the words "they\'re cutting the power at dawn." Dawn is six hours away. The nearest network asset is you.', title: 'Six Hours', origins: ['undrift'], frame: { objective: 'Extract twelve people from a surrounded safehouse before dawn', crucible: 'Twelve people, four children, a Synod squad that doesn\'t know what it\'s surrounding, and six hours of darkness' }, arc: { name: 'The Safehouse Extraction', episode: 'Scout the enforcement perimeter and identify extraction routes' } },
    // ── Undrift / Ghost ──
    { hook: 'The underground route you\'ve used to move four children offworld in the past year has been compromised. You know this because the last courier didn\'t come back. Tonight you are supposed to move a fifth child \u2014 a nine-year-old boy whose family has already sold everything they own to pay for his passage. If you abort, he goes back to a town where the Assessors arrive in three days. If you run the route, you almost certainly lose him and yourself. The handler who arranged the compromised route is in the room with you right now, and doesn\'t know you know.', title: 'The Route', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Move the child, abort, or confront the handler', crucible: 'A compromised route, a boy who can\'t go home, and a handler who might be the reason' }, arc: { name: 'The Route', episode: 'Decide what to do about the handler before tonight\'s run' } },
    { hook: 'A fellow Ghost has brought you a request: move an adult Resonant, not a child. An active-service Resonant who has defected from the Synod and wants out of the Hegemony entirely. He has knowledge of Drift operations that could topple careers. He is also the man who, eleven years ago, was the Resonant assigned to the fleet action that destroyed your home village. He didn\'t know \u2014 he was told it was a rebel stronghold \u2014 but it was his attunement that did it. He is asking you, personally, for passage. He recognizes you.', title: 'The Cargo', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Grant or deny passage to the man who destroyed your village', crucible: 'Saving the person who killed everyone you loved, because the network needs what he knows' }, arc: { name: 'The Cargo', episode: 'Meet the defector and decide whether to take the job' } },
    { hook: 'You have a contact inside a Synod processing facility: a junior assessor who has been leaking schedules and looking the other way on three extractions over the past year. He\'s asked to be brought out. His cover has started to fray and he believes he has maybe two weeks before an internal audit exposes him. Bringing him out saves his life and costs you the only Synod-internal asset your cell has ever had. Leaving him in place keeps the intel pipeline alive for perhaps six more months, at which point he will almost certainly be executed. He has a wife and a young son who know nothing about any of this.', title: 'The Inside Man', origins: ['undrift'], classes: ['Ghost'], frame: { objective: 'Extract the asset or keep the pipeline', crucible: 'One man\'s life against six months of intelligence that will save others' }, arc: { name: 'The Inside Man', episode: 'Evaluate the risk and meet the asset\'s family' } },
    // ── Undrift / Runner ──
    { hook: 'A child in the next settlement over tested positive three days ago. The Synod assessment team arrives tomorrow. The network has asked you to get the family out before dawn. You have twelve hours, no papers, and a suppression kit that works for six weeks.', title: 'Twelve Hours', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Extract the family before the assessment team arrives', crucible: 'Twelve hours, no papers, and a network that can\'t help if you\'re caught' }, arc: { name: 'The Extraction', episode: 'Get the family out of the settlement and into the underground' }, startingCounters: { exposure: 1 } },
    { hook: 'You\'ve tracked a latent child to a frontier holding before the Synod Assessors arrived \u2014 but you\'re not the first to find her. Another Undrift operative is already there, from a different cell, and they intend to extract her tonight. The problem: the cell they serve has been trading information to Imperial intelligence for six months to keep their safehouses running. If you let the extraction proceed, the girl\'s location is in the Throne\'s hands by morning. If you intervene, you expose yourself to a cell you have no authority over, and the child\'s family sees two strangers fighting over her in their own kitchen. The child is nine. She is hiding under the kitchen table, watching you both.', title: 'The Second Finder', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Get the girl to safety without exposing the network', crucible: 'Two rescuers, one compromised cell, and a child watching adults decide her fate' }, arc: { name: 'The Second Finder', episode: 'Confront the other operative in the family\'s kitchen' } },
    { hook: 'Your network has intercepted a Synod assessment schedule for the next frontier sweep. Twenty-three children across eleven townships, ages six to eleven, flagged for priority testing. You have three weeks. You have resources and routes to save eight of them. Your cell handler is telling you to save the eight with the highest latent tier readings, because high-tier children are the ones the Synod will never stop hunting, and the low-tier ones might survive the system. The numbers make sense. Looking at the names makes them stop making sense. One of the low-tier names is a child you helped deliver, three years ago, in a safehouse attic during a snowstorm.', title: 'The List', origins: ['undrift'], classes: ['Runner'], frame: { objective: 'Choose which eight children to save', crucible: 'Triage logic vs. a name you recognize \u2014 fifteen children you could save but won\'t' }, arc: { name: 'The List', episode: 'Review the names and begin planning the extraction routes' } },
    // ── Undrift / Voice ──
    { hook: 'An old Undrift woman who has kept the network\'s memory for forty years is dying. She has asked you to take the book. The book is a list of every taken child she has recorded \u2014 names, ages, townships, dates. Nine hundred and seventeen entries. She wants you to read it aloud to her before she dies, so she can confirm what she remembers. The reading will take most of the night. Some of the names are people you knew. One of them, you think, might be you.', title: 'The Names', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Take the book and decide what to do with it', crucible: 'Nine hundred names, a dying woman\'s memory, and possibly your own history' }, arc: { name: 'The Names', episode: 'Sit with the dying woman and begin reading the list' } },
    { hook: 'A Heretic faction within the Synod is preparing to publish a dossier exposing the falsification of Resonant degradation records. They need a corroborating witness who can speak to specific incidents with firsthand detail. You can. Testifying means revealing your identity publicly \u2014 not to the Synod, but to a public trial that the Synod will watch with full intent to act afterward. Your network has voted against your testifying by a narrow margin. The Heretic representative is waiting in a safehouse for your answer. She has traveled three weeks to ask you in person.', title: 'The Testimony', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Testify or protect the network', crucible: 'Your testimony could end the cover-up, and the network thinks it will end you' }, arc: { name: 'The Testimony', episode: 'Meet the Heretic representative and hear what she needs' } },
    { hook: 'A young woman has found your network. She claims to be a Resonant child who escaped an Ashen Ward discharge seven years ago \u2014 she faked her own death, walked out, has been hiding in frontier townships ever since. She wants to know if you can confirm her story. She remembers fragments: a nurse, a corridor, a specific lullaby sung at lights-out. She wants you to tell her who she was before the Synod took her. You have network records that could answer this. Two possibilities: she is who she says, and confirming it gives her back a family name she will want to find; or she is a Synod plant, and confirming anything gives the Synod a live trail into your archives. The records are in the next room. She is crying quietly in the chair across from you.', title: 'The Child Who Lived', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Verify or refuse her', crucible: 'A woman asking for her own name, and the archives that could prove or condemn her' }, arc: { name: 'The Child Who Lived', episode: 'Listen to her fragments and decide whether to open the records' } },
    { hook: 'You watched a Synod enforcer kill an Undrift Resonant during what was supposed to be a negotiated handover. The Resonant had agreed to surrender \u2014 arranged through intermediaries, on promise of clemency. She was walking toward the checkpoint with her hands open when the enforcer fired. Your network was coordinating the handover. Three other operatives saw it happen. They\'ve asked you to record what you saw \u2014 names, dates, what she said, how she fell. A detailed eyewitness account narrows the list of who could have been present to perhaps four people. Writing it exposes the network. Not writing it means she died and no one said it out loud. Her son is in a safehouse three districts away. He doesn\'t know yet.', title: 'The Enforcer\'s Kill', origins: ['undrift'], classes: ['Voice'], frame: { objective: 'Write the testimony or protect the network', crucible: 'A dead woman\'s truth against the safety of everyone who hides' }, arc: { name: 'The Enforcer\'s Kill', episode: 'Sit down with the account and decide what to write' } },
    // ── Imperial Service origin hooks ──
    { hook: 'A Synod Adjudicator has been assassinated on a frontier world. The Throne suspects a house, the houses suspect the Synod did it themselves, and the Synod suspects the Undrift. You\'ve been sent to determine the truth before the factions use the death to justify the war they\'ve been preparing for.', title: 'The Adjudicator', origins: ['imperial-service'], frame: { objective: 'Determine who killed the Adjudicator before factions escalate', crucible: 'Every faction benefits from a different answer \u2014 the truth may benefit none of them' }, arc: { name: 'The Adjudicator\'s Death', episode: 'Examine the scene and interview the first witnesses' } },
    { hook: 'Your handler has gone silent. The last message was a single word: "compromised." Your cover identity on a house world is still intact, but without extraction protocols, you\'re operating alone in territory where Imperial Service agents don\'t officially exist.', title: 'Compromised', origins: ['imperial-service'], frame: { objective: 'Determine whether your handler is alive and whether your cover holds', crucible: 'Operating alone without extraction in territory that doesn\'t acknowledge your existence' }, arc: { name: 'The Silent Handler', episode: 'Assess your situation and find a secure communication channel' } },
    { hook: 'A routine audit of frontier garrison records has surfaced an anomaly that doesn\'t fit any known pattern: seven garrison commanders across three sectors filed identical supply requisitions on the same day, for materials that have no military application. Thermal shielding, resonance dampeners, and archaeological survey equipment. The requisitions were approved by an automated system and never reviewed. The combined cost is negligible. The coordination is not. Someone inside the Imperial military apparatus is quietly assembling the equipment to open something, and they\'ve been doing it in pieces small enough to avoid notice. Your section chief doesn\'t know yet. Running it up the chain means losing control of the investigation. Running it yourself means operating outside your mandate.', title: 'The Requisitions', origins: ['imperial-service'], frame: { objective: 'Trace the coordinated requisitions to their purpose', crucible: 'Seven garrisons, identical orders, archaeological equipment in a military pipeline, and no one watching but you' }, arc: { name: 'The Requisitions', episode: 'Cross-reference the seven requisitions and identify what the combined equipment could be used for' } },
    // ── Imperial / Analyst ──
    { hook: 'An intercepted communication in your morning brief names a Synod Hierarch as the source of leaked assessment schedules \u2014 the leaks that have let three frontier worlds hide children from recent sweeps. Your superior wants the Hierarch exposed and disgraced to weaken Synod influence with the Throne. Acting on the intelligence stops the leaks that have saved an estimated two hundred children over four years. Suppressing it protects the Hierarch but means forging your own briefing paperwork and lying to a superior who trusts you. The brief is due in six hours.', title: 'The Intercept', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'File or suppress the intelligence', crucible: 'Two hundred children saved by leaks you\'re about to expose' }, arc: { name: 'The Intercept', episode: 'Read the morning brief and decide what to include' } },
    { hook: 'Your section produces the intelligence forecasts that guide Synod assessment deployment schedules. For the past eighteen months, you have been quietly adjusting the forecasts \u2014 weighting certain frontier sectors as lower-priority based on manufactured indicators. The adjustments have delayed roughly forty assessments. You have told no one. This morning, a new analyst has been assigned to your section for training. She is sharp, earnest, and asked excellent questions about the forecasting model during her orientation. She will notice the adjustments within weeks. You have to decide, before the end of the day, whether to train her in the model as it actually operates, train her in the fiction, or request her reassignment \u2014 which will itself raise flags you can\'t afford.', title: 'The Forecast', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Handle the new analyst before she discovers the falsified forecasts', crucible: 'Eighteen months of quiet sabotage vs. a sharp junior who will find the truth' }, arc: { name: 'The Forecast', episode: 'Meet the new analyst and assess how much time you have' } },
    { hook: 'You were present at a fleet action six months ago where a high-tier Resonant was burned out on orders that exceeded her safety limits. Your report was the official record. You wrote it carefully, omitting the specific orders that authorized the excess, protecting the officer who gave them. The officer was your friend. A Synod review has now been opened \u2014 the Resonant\'s family has petitioned for review of the circumstances of her death. The reviewing Adjudicator has requested your original working notes. You still have them. Handing them over ends your friend\'s career and likely starts criminal proceedings. Submitting cleaned copies is perjury. You have forty-eight hours.', title: 'The Report', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Hand over the real notes, forge replacements, or find another way', crucible: 'Perjury vs. destroying a friend to give a family the truth' }, arc: { name: 'The Report', episode: 'Review your working notes and assess what they reveal' } },
    { hook: 'Your cover identity was burned by someone inside your own intelligence service. Not by accident \u2014 deliberately. Someone wants you exposed. You have 48 hours before the house you\'ve infiltrated connects your cover to your real identity, and your handler isn\'t responding to extraction protocols.', title: 'Double Bind', origins: ['imperial-service'], classes: ['Analyst'], frame: { objective: 'Identify who burned you and get out alive', crucible: '48 hours, no extraction, and the betrayal came from inside' }, arc: { name: 'The Burned Cover', episode: 'Determine who inside the service exposed you and why' } },
    // ── Imperial / Warden ──
    { hook: 'A frontier settlement is three Resonants short of its annual tithe to the Synod. The settlement elder says two died in a mining accident and one fled. The Synod says the numbers don\'t matter \u2014 the tithe must be met. They\'re looking at the settlement\'s children.', title: 'The Tithe', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Resolve the tithe shortfall before the Synod acts', crucible: 'The Synod will take children if the numbers aren\'t met' }, arc: { name: 'The Tithe', episode: 'Verify the elder\'s account and find the fled Resonant' } },
    { hook: 'You\'ve been assigned to escort a fleet operation that will use a Drift weapon on a populated moon suspected of harboring a separatist Resonant cell. The moon has a population of two hundred thousand. Intelligence estimates that somewhere between nine and forty of those are separatist sympathizers. The weapon will kill everyone on the surface. Your orders are to maintain defensive position during the attack. The order was signed by an Admiral you served under as a cadet \u2014 a man you admire, whose judgment you have trusted for a decade. He is on the bridge of the command ship, within comms range, and would take your call if you made it.', title: 'The Fleet Order', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Follow orders, break them, or find another way to stop the strike', crucible: 'Two hundred thousand people and an Admiral you trust enough to call' }, arc: { name: 'The Fleet Order', episode: 'Read the deployment orders and decide whether to make the call' } },
    { hook: 'A Minor House has requested Imperial protection after one of their Resonants escaped and joined an Undrift cell. Your orders are to provide security during the recovery operation. During your briefing, you see the file on the escaped Resonant: she is sixteen, she has been with the House since she was four, and the House\'s own records show she was repeatedly subjected to "performance enhancement protocols" that read, to your eye, exactly like torture. The House matriarch is hosting you for dinner tonight to discuss the recovery operation. She seems like a reasonable woman.', title: 'The Defector', origins: ['imperial-service'], classes: ['Warden'], frame: { objective: 'Provide security or act on what the file says', crucible: 'The recovery operation returns a tortured child to her torturers, and you\'re there to make sure it goes smoothly' }, arc: { name: 'The Defector', episode: 'Read the file and prepare for dinner with the matriarch' } },
    // ── Imperial / Handler ──
    { hook: 'Two Major Houses are on the brink of open conflict over Resonant allocation. The Throne has sent you to mediate. One elegant solution: redirect a tithe from a frontier world that is currently unprotected by either house\'s interests. The tithe is twelve children from three townships. Both Major House representatives are nodding at your proposal. The frontier world has no representative in the room. The solution works. Everyone at the table approves. The paperwork can be signed in the next hour.', title: 'The Mediation', origins: ['imperial-service'], classes: ['Handler'], frame: { objective: 'Sign the deal or find a solution that doesn\'t sacrifice a frontier world', crucible: 'Twelve children from three townships, and the people who should object aren\'t in the room' }, arc: { name: 'The Mediation', episode: 'Sit at the table and present the proposal' } },
    { hook: 'You\'ve been sent to negotiate the release of a hostage \u2014 a Resonant child taken by a Minor House that claims they "found" her unregistered. They want Throne recognition for "saving" her from the Undrift. The Synod wants her reassigned to institutional custody. The child wants to go home to her parents in the frontier township her family has been hiding in for six years. The parents are waiting outside the negotiation chamber, having traveled eleven days to plead in person. You have authority to deliver the child to any of the three parties. The Throne\'s preference is clear but not mandatory. The parents don\'t know yet that you have this much discretion.', title: 'Silent Terms', origins: ['imperial-service'], classes: ['Handler'], frame: { objective: 'Place the child', crucible: 'Three claimants, one child, and parents who don\'t know you could end this' }, arc: { name: 'Silent Terms', episode: 'Enter the negotiation chamber and meet the parties' } },
    // ── Spent Resonant origin hooks ──
    { hook: 'A letter arrives at your Ward bunk. No sender. Inside: a name, a location, and a photograph of a child who looks like the person you were before the Dimming. The child is on the testing schedule for next month. Someone thinks you should know.', title: 'The Letter', origins: ['spent-resonant'], frame: { objective: 'Find out who sent the letter and what they expect you to do', crucible: 'A child who might be yours, on a testing schedule you understand from the inside' }, arc: { name: 'The Unnamed Child', episode: 'Verify the photograph and determine the child\'s identity' }, startingCounters: { embers: 1 } },
    { hook: 'The Ashen Ward physician has asked to see you privately. She says your latest readings are anomalous \u2014 your attunement signature, which should be flat, flickered during the last routine scan. She hasn\'t filed it yet. She wants to know what you want her to do.', title: 'The Flicker', origins: ['spent-resonant'], frame: { objective: 'Decide what to do about the anomalous reading before it\'s filed', crucible: 'The classification that protects you is the same one that imprisoned you \u2014 and it may no longer be accurate' }, arc: { name: 'The Anomalous Reading', episode: 'Understand what the flicker means and whether it can be hidden' }, startingCounters: { embers: 1 } },
    { hook: 'Three other Ward residents have approached you separately in the last week. Each one said the same thing: they can still feel the Drift. They want to know if you can too. They want to know if you\'ll help them prove the Synod is lying about the Dimming.', title: 'Still Here', origins: ['spent-resonant'], frame: { objective: 'Decide whether to organize the Ward residents or protect them by staying silent', crucible: 'Speaking up proves the Synod\'s classification is fraud \u2014 and makes every one of you evidence' }, arc: { name: 'The Ward Awakening', episode: 'Meet the three residents and assess what they actually want' } },
    // ── Spent / Remnant ──
    { hook: 'Something in the Drift is reaching for you. Not memory, not flashback \u2014 active, intentional, tonight. You thought you were done. Your hands have started tingling in the specific way they did before your first attunement at age eleven. The pressure is not a voice; it is a knowing, and it recognizes your old service designation, and it is asking you to open. You have been discharged for six years. If you answer, you are not what the discharge paperwork says you are. If you don\'t answer, something that has been trying to reach you for six years will keep trying, and you don\'t know what it wants.', title: 'The Reaching', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Answer or refuse the Drift', crucible: 'Six years of silence, and whatever is calling knows your name' }, arc: { name: 'The Reaching', episode: 'Feel the pressure build and decide whether to open' }, startingCounters: { embers: 1 } },
    { hook: 'A nine-year-old girl has appeared at the Ashen Ward gate asking for you by name. She is latent, untested, frightened, and says the Drift showed her your face and told her you could help. She is correct that you can \u2014 your residual attunement, used carefully, could hide her from Synod screening long enough to get her to an Undrift network. Using it reopens what the discharge closed. The girl has walked three days alone to find you. She has a small bag of dried fruit and a drawing she made of your face that is, impossibly, accurate down to the scar on your jaw.', title: 'The Child at the Ward Gate', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Help the girl or send her away', crucible: 'A child the Drift sent to you, and helping her proves you\'re not what the Ward says you are' }, arc: { name: 'The Child at the Ward Gate', episode: 'Meet the girl at the gate and see her drawing' }, startingCounters: { embers: 1 } },
    { hook: 'Three of your old service crew \u2014 Resonants you were bonded with during the worst year of your career \u2014 have sent word. They are all Spent now, all in different Wards. They have been dreaming the same dream for a month: a location, a date, a need. They want to meet. They think something is calling them back for one last attunement \u2014 coordinated, deliberate, meaningful. They say they can feel it is good. You have every reason to trust them and every reason to suspect that whatever is calling them is the same institutional apparatus that used you up in the first place, now trying again with the scraps. The meeting is in two weeks. Traveling there violates the terms of your discharge.', title: 'The Old Crew', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Go to the meeting or stay in the Ward', crucible: 'Three people you trust with your life, calling you toward something that could be salvation or the last extraction' }, arc: { name: 'The Old Crew', episode: 'Receive the message and decide whether to break your discharge terms' } },
    { hook: 'You\'ve been assigned to a rotation in an Ashen Ward. On your first day, you discover that a third of the "spent" Resonants still have measurable attunement. They\'re not burned out. They\'re being hidden \u2014 by Ward staff before you, quietly, for years. One of them, a woman in her fifties, has asked to speak with you. She says she has been waiting for someone who would actually read the charts. She has a list of names she wants you to memorize, in case she dies before the next rotation arrives.', title: 'The Ward', origins: ['spent-resonant'], classes: ['Remnant'], frame: { objective: 'Understand why functional Resonants are hidden here', crucible: 'The Synod placed them here expecting silence \u2014 and someone has been keeping them alive' }, arc: { name: 'The Hidden Ward', episode: 'Examine the charts and meet the woman with the list' } },
    // ── Spent / Sentinel ──
    { hook: 'A man who used to command you during your service years has tracked you down. He\'s older, frightened, and carries a data-slate he will not let out of his hand. He says three other Spent from your old rotation have died in the last month \u2014 heart failure, stroke, "natural causes." He thinks they\'re being cleaned up. He thinks you\'re on the list. He is offering to hide you. He is also the man who signed the orders that burned your attunement out in a single mission ten years ago, and you have dreamed about killing him almost every night since.', title: 'The Old Handler', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Accept his help, refuse it, or settle the debt', crucible: 'The man who destroyed you is the only one trying to save you' }, arc: { name: 'The Old Handler', episode: 'Open the door and face the man who burned you out' } },
    { hook: 'Your physical changes from service have always been mild \u2014 a tremor, a sensitivity to certain sounds. Over the past month, something new has started: you are physically stronger than you should be. Lifting things you couldn\'t lift a year ago. Healing from a cut in hours. Your old Physik, who still sees you quarterly, has noticed and is worried \u2014 she says this is not a normal Dimming progression, and she thinks your attunement is not Dimmed at all, just changed. She wants to run tests. The tests require Synod facilities. She has not filed a report yet, but she is bound by law to do so within the week. She is your friend. She is asking what you want her to do.', title: 'The Body That Remembers', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Allow the tests, refuse them, or disappear before the filing deadline', crucible: 'Your body is proving the Synod\'s classification is a lie, and your friend has a week before the law makes her choose' }, arc: { name: 'The Body That Remembers', episode: 'Meet your Physik and hear what the tests would reveal' }, startingCounters: { embers: 1 } },
    { hook: 'In a frontier market, a young Synod acolyte \u2014 eighteen, newly deployed \u2014 has recognized you. Not your face: your resonance pattern. The Synod has developed a new training protocol that lets young Seekers detect Spent Resonants who still carry residual attunement. She has identified you as one. She has not reported you yet. She is standing ten meters away, watching you, trying to decide what to do. Her face is uncertain. She seems to be waiting for you to approach her, or to run, or to do something that will resolve her decision for her. You have perhaps thirty seconds.', title: 'The Recognition', origins: ['spent-resonant'], classes: ['Sentinel'], frame: { objective: 'Approach, run, or do something she isn\'t expecting', crucible: 'Thirty seconds and a young woman who hasn\'t decided yet what kind of Synod she serves' }, arc: { name: 'The Recognition', episode: 'Lock eyes with the acolyte and make your move' } },
    // ── Spent / Witness ──
    { hook: 'A Synod Hierarch has come to your hospice in person. Not an Adjudicator, not a physician \u2014 a Hierarch. She asks to speak with you privately. She has a question that she says no one else can answer, and she is willing to trade for the answer: freedom from the Ward, a small house, protected status, a life. The question is one you could answer. You know the answer because of a Drift-memory you received during your last mission, a memory you never reported because you knew reporting it would kill you. The Hierarch is asking kindly. She is also the most powerful person you have ever been in a room with, and she is alone, and her escort is outside.', title: 'The Visitor', origins: ['spent-resonant'], classes: ['Witness'], frame: { objective: 'Trade the memory or refuse the offer', crucible: 'Freedom purchased with a secret the Synod will weaponize' }, arc: { name: 'The Visitor', episode: 'Sit with the Hierarch and hear her question' } },
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
