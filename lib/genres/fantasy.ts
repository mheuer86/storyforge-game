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
    shiftedMechanic: {
      type: 'trait',
      name: 'Whatever It Takes',
      description: 'Once per chapter, automatically succeed on a Persuasion or Deception check. The target\'s disposition drops one tier permanently afterward. Ambition works, but it costs relationships.',
      cost: 'Permanent disposition loss on the target. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'watcher',
    name: 'Watcher',
    description: 'Retreated past the point of return. The world happens to you.',
    lore: 'The elven tendency toward long observation has tipped into permanent withdrawal. The world moves too fast, too crudely, and the character has retreated into a perspective so distant that participation feels impossible. They watch. They understand. They do nothing.',
    behavioralDirective: 'Default register: observing from a distance that has become unreachable. The long view has consumed the present. NPC reactions: companions mistake withdrawal for wisdom, then grow frustrated when wisdom produces no action. Enemies forget you are there. When narrating interiority: the world is perfectly legible from this distance. The problem is that helping requires closing the distance, and the distance has become the self.',
    hidden: true,
    shiftedMechanic: {
      type: 'contact_change',
      name: 'Memory Contact',
      description: 'Active contacts can no longer reach you (they give up trying). Gain 1 Memory Contact: a figure from the deep past who provides information about things that no longer exist. Once per chapter, ask about lost knowledge, forgotten places, or dead civilizations. The answer is always accurate. The answer is never about anything that still lives.',
      cost: 'All active contacts go silent. New contacts start at Wary (your detachment is visible).',
    },
  },
  {
    id: 'bound',
    name: 'Bound',
    description: 'The oath became the person. No identity outside the vow.',
    lore: 'Dwarven oaths were meant to anchor, not imprison. This one has consumed the person who swore it. There is no flexibility, no accommodation, no room for the world to be more complex than the words spoken in stone. The oath answers every question before the dwarf can.',
    behavioralDirective: 'Default register: the oath is the identity. Every situation is filtered through the vow before it reaches the person. NPC reactions: allies respect the consistency but fear what happens when the oath conflicts with survival. Enemies exploit the predictability with precision. When narrating interiority: the oath is not a choice anymore; it is a reflex. The comfort of certainty has become a wall against every exit.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'The Oath Speaks',
      description: 'Once per chapter, the oath compels an action. The GM declares what the oath demands in the current situation. The player must comply or take 2d6 psychic damage. Compliance grants advantage on the next related check. The oath always demands the hardest path.',
      cost: 'Loss of agency in one decision per chapter. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
  {
    id: 'named',
    name: 'Named',
    description: 'No longer invisible. Recognition brings danger.',
    lore: 'The halfling gift for passing unnoticed is gone. Too many actions, too many witnesses, too many stories told in too many taverns. The anonymity that was armor has been shed, and the small person in the big world is now a known quantity in a world that punishes the known.',
    behavioralDirective: 'Default register: exposed, visible, and aware that visibility is the opposite of safety. The instinct to disappear is still there but the skill no longer works. NPC reactions: people who should not know the name call it out in public. Enemies no longer overlook you. When narrating interiority: every room feels watched. The comfort of being beneath notice is gone, and the world is much larger when it is looking directly at you.',
    hidden: true,
    shiftedMechanic: {
      type: 'passive',
      name: 'Known Quantity',
      description: 'Advantage on first impression with strangers (your reputation precedes you). Disadvantage on all Stealth checks in settled areas. One new Hostile contact appears: someone who recognized you and intends to use that knowledge. Fame is power and vulnerability simultaneously.',
      cost: 'Permanent Stealth disadvantage in settlements. A Hostile contact who tracks your movements.',
    },
  },
  {
    id: 'vessel',
    name: 'Vessel',
    description: 'The bloodline is asserting itself. Becoming what the ancestors were.',
    lore: 'The inherited memory that surfaced as instinct and dream has become something more insistent. The Wyrm Kingdoms fell three centuries ago, but something in the blood is rising. The dragonkin is becoming what their ancestors were, whether they chose it or not.',
    behavioralDirective: 'Default register: the inheritance is no longer background noise; it is a voice, and it is getting louder. The ancient knowledge that was an advantage has become a claim on the person carrying it. NPC reactions: the fear deepens into something primal. People sense something older than the person standing in front of them. When narrating interiority: the dreams are instructions now. The memory is not inherited; it is inhabiting. The question is no longer what the ancestors knew, but what they want.',
    hidden: true,
    shiftedMechanic: {
      type: 'trait',
      name: 'The Blood Remembers',
      description: 'Once per chapter, access an ancestral memory relevant to the current situation. INT Arcana check (DC scales by how ancient the knowledge). Success provides specific, actionable knowledge from the bloodline. Failure provides a vision that is emotionally overwhelming: +1 inheritance counter and the GM narrates what the ancestors want you to do next.',
      cost: 'Failed uses accelerate the inheritance counter. Replaces origin trait usage slot.',
      usesPerChapter: 1,
    },
  },
]

// Universal classes kept for fallback — playbooks below are species-keyed and take priority
const fantasyClasses: CharacterClass[] = []

const fantasyPlaybooks: Record<string, CharacterClass[]> = {
  // ─── Human: What do you build from nothing? ──────────────────────────
  'human': [
    {
      id: 'knight',
      name: 'Knight',
      concept: 'Serves an institution. Builds order through force and loyalty. The question: what is worth defending when you can\'t see past your own lifetime?',
      hookTags: ['warrior'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Shield Tactics'],
      stats: { STR: 16, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 13 },
      startingInventory: [
        { id: 'longsword_k', name: 'Longsword', description: 'Kingdom-forged steel, well-balanced', quantity: 1, damage: '1d10' },
        { id: 'kite_shield', name: 'Kite Shield', description: '+2 AC when equipped', quantity: 1 },
        { id: 'chain_hauberk', name: 'Chain Hauberk', description: 'Standard knight\'s armor', quantity: 1 },
        { id: 'healing_salve_k', name: 'Healing Salve', description: 'Restores 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 80,
      startingHp: 12,
      startingAc: 16,
      hitDieAvg: 6,
      trait: {
        name: 'Sworn Duty',
        description: 'Once per chapter, invoke an institutional oath to rally a group, compel a subordinate, or hold a position beyond what endurance should allow. The oath must be named: a kingdom, a lord, a principle. The cost: the oath constrains. After invoking Sworn Duty, the character cannot take an action that contradicts the named oath for the rest of the chapter.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the weight of steel on your hip and the words of an oath spoken in a hall that may not remember your name. You know that Thornwall\'s garrison has been quiet, that the Accord of Thorns reads differently depending on which kingdom\'s lawyer holds the scroll, and that the Pale March breeds soldiers the way the Crestlands breeds wheat. You know that a knight without a cause is just a man with a sword, and you know why you chose the cause you chose, even if nobody asks.',
    },
    {
      id: 'seeker',
      name: 'Seeker',
      concept: 'Searches ruins and libraries for what was lost. Builds knowledge from fragments. The question: what do you do with Ancient knowledge when your species forgot it first?',
      hookTags: ['scholar'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'History', 'Arcana', 'Survival'],
      stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'hand_crossbow', name: 'Hand Crossbow', description: 'Light, reliable, keeps hands free for notes', quantity: 1, damage: '1d6, range 60ft' },
        { id: 'research_journal', name: 'Research Journal', description: 'Field notes, sketches, partial translations', quantity: 1 },
        { id: 'cartographer_kit', name: 'Cartographer\'s Kit', description: 'Maps, compass, measuring tools for ruin surveys', quantity: 1 },
        { id: 'dispel_scroll_s', name: 'Dispel Scroll', description: 'Nullify one active magical effect', quantity: 2 },
      ],
      startingCredits: 120,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Fragment Recovery',
        description: 'Once per chapter, identify something the Ancients left behind: an inscription pattern, a mechanism\'s purpose, a ruin\'s original function. INT Investigation check (DC scales by obscurity). Success reveals knowledge no living scholar possesses. Failure means the fragment resists interpretation and the GM introduces a complication, a misreading that leads somewhere wrong.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the Collegium\'s catalogue system and its gaps, the way a cartographer knows the edges of the map. You know which ruins in the Heartlands have been surveyed and which ones the Collegium marked "deferred," which means they sent someone and the someone didn\'t come back. You know the physical signs of a pre-Sundering site: stone that doesn\'t weather, metal that doesn\'t rust, doors with no locks and no handles. You know that every kingdom sits on top of something older, and that the older thing is still working, even if nobody alive knows how.',
    },
    {
      id: 'herald',
      name: 'Herald',
      concept: 'Rallies people. Builds from charisma and conviction. The question: can you unite what\'s left, or are you just another voice in the forgetting?',
      hookTags: ['diplomat', 'scholar'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Deception', 'Insight', 'History'],
      stats: { STR: 10, DEX: 12, CON: 12, INT: 13, WIS: 11, CHA: 17 },
      startingInventory: [
        { id: 'dagger_h', name: 'Dagger', description: 'Concealable blade', quantity: 1, damage: '1d4' },
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
        description: 'Once per chapter, invoke a story, song, or legend that shifts the mood of a scene. A crowd calms, a guard hesitates, an enemy pauses. Requires speaking; useless when silenced. Memory cost: stories invoked become known to whoever heard them. Skilled NPCs can use that knowledge against the Herald later.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the old stories, and you know that the old stories are the last record of truths the world has lost. You know which songs make soldiers weep and which ones make lords reach for their swords. You know the Collegium records facts, but you record meaning, and meaning is what survives when the facts are forgotten. You know that every story you speak aloud becomes known to whoever hears it, and that knowledge is a weapon you hand to strangers every time you open your mouth.',
    },
  ],

  // ─── Elf: What do you do with memory that won't let you go? ──────────
  'elf': [
    {
      id: 'elf-warden',
      name: 'Warden',
      concept: 'Engages with the mortal world despite knowing it\'s temporary. The memory serves action. The question: how do you fight for something you know will pass?',
      hookTags: ['warrior', 'scout'],
      primaryStat: 'DEX',
      proficiencies: ['Tracking', 'Sharpshooting', 'Acrobatics', 'Animal Handling'],
      stats: { STR: 10, DEX: 16, CON: 13, INT: 12, WIS: 14, CHA: 11 },
      startingInventory: [
        { id: 'longbow_w', name: 'Longbow', description: 'Long-range precision bow', quantity: 1, damage: '1d10, range 120ft' },
        { id: 'hand_axe_w', name: 'Hand Axe', description: 'Reliable melee backup', quantity: 1, damage: '1d6' },
        { id: 'studded_leather_w', name: 'Studded Leather', description: '+1 AC, light armor', quantity: 1 },
        { id: 'grappling_hook_w', name: 'Grappling Hook', description: 'Hook and rope, 60ft', quantity: 1 },
      ],
      startingCredits: 90,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'The Long Watch',
        description: 'Once per chapter, after observing a target, location, or situation for at least one scene, identify a vulnerability, pattern, or hidden detail that shorter-lived observers would miss. Requires patience; cannot be used in the same scene as discovery. The cost: the observation period means you watched while others acted.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the land the way a body knows breath: without thinking, without stopping. You know that the Thornwood has been wrong since spring, that the animals are moving in patterns that don\'t follow season or sense, and that the old trails your predecessors mapped now lead to places that weren\'t there a year ago. You know the forests remember what the cities forgot. You know the scars in the earth where Ancient roads surface and vanish, and you know that following them is not always a choice.',
    },
    {
      id: 'elf-keeper',
      name: 'Keeper',
      concept: 'Preserves what remains. Libraries, groves, the last copies of things. The question: is preservation enough, or is it just hoarding the past?',
      hookTags: ['scholar', 'channeler'],
      primaryStat: 'WIS',
      proficiencies: ['Medicine', 'Perception', 'Survival', 'Religion'],
      stats: { STR: 10, DEX: 13, CON: 14, INT: 13, WIS: 17, CHA: 10 },
      startingInventory: [
        { id: 'mace_k', name: 'Mace', description: 'Sturdy blunt weapon, DC 12 CON save or stunned 1 round', quantity: 1, damage: '1d6 + stun' },
        { id: 'healing_touch', name: 'Healing Touch', description: 'Divine healing — restores 1d8+WIS HP', quantity: 1, effect: '1d8+WIS HP', charges: 3, maxCharges: 3 },
        { id: 'antidote_kit_k', name: 'Antidote Kit', description: 'Neutralize poisons and venoms', quantity: 1, charges: 2, maxCharges: 2 },
        { id: 'divination_bones', name: 'Divination Bones', description: 'Read omens and sense danger', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 10,
      startingAc: 13,
      hitDieAvg: 5,
      trait: {
        name: 'Divine Favor',
        description: 'Healing strength tied to deity alignment. Acting in alignment: heal at full power + bonus. Acting against: heal at half. The GM tracks favor silently, creating moral tension. The divine thread is thinning; some chapters, the response is quieter than others.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the prayers, and you know the silence that sometimes follows them. You know the gods were louder a generation ago, that your teacher\'s teacher spoke of visions that came clearly and often, and that now the divine connection thins like a river running dry. You know the churches preach certainty they no longer feel. You know the difference between faith and habit, and you know that what remains of divine power still answers, sometimes, if the need is genuine and the heart is aligned.',
    },
    {
      id: 'oracle',
      name: 'Oracle',
      concept: 'The memory is power. Sees patterns across centuries, reads the world as recurrence. The question: do you use what you know, or does using it corrupt it?',
      hookTags: ['diplomat', 'channeler'],
      primaryStat: 'CHA',
      proficiencies: ['Insight', 'Persuasion', 'History', 'Arcana'],
      stats: { STR: 10, DEX: 11, CON: 12, INT: 14, WIS: 15, CHA: 17 },
      startingInventory: [
        { id: 'staff_o', name: 'Gnarled Staff', description: 'Focus for memory-channeling. Walking stick.', quantity: 1, damage: '1d6' },
        { id: 'memory_crystal', name: 'Memory Crystal', description: 'Records one conversation or scene perfectly. Single use.', quantity: 2 },
        { id: 'ward_charm_o', name: 'Ward Charm', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'calligraphy_kit', name: 'Calligraphy Kit', description: 'For transcribing visions and patterns', quantity: 1 },
      ],
      startingCredits: 130,
      startingHp: 8,
      startingAc: 11,
      hitDieAvg: 4,
      trait: {
        name: 'Century\'s Pattern',
        description: 'Once per chapter, recognize a current situation as a recurrence of something the Oracle has seen before, decades or centuries ago. CHA Insight check. Success: the GM reveals how the pattern resolved last time, which predicts how it resolves now. Failure: the pattern is there but the Oracle misreads which part is recurring, leading to a confident wrong prediction.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You have watched this world for longer than most kingdoms have existed. You know the Accord of Thorns will fray because you watched the treaty before it, the Compact of Rivers, fray the same way. You know that the Collegium\'s decline follows a pattern you\'ve seen in three prior institutions. You know that the current crisis is not new; it is the latest verse of something old, and the people living through it think they are the first. The gift is seeing the shape. The curse is knowing the ending.',
    },
  ],

  // ─── Dwarf: What oath defines you? ───────────────────────────────────
  'dwarf': [
    {
      id: 'holdfast',
      name: 'Holdfast',
      concept: 'The oath made physical. Holds the line, honors the stone. The question: what happens when holding is wrong but breaking is unthinkable?',
      hookTags: ['warrior'],
      primaryStat: 'STR',
      proficiencies: ['Athletics', 'Intimidation', 'Heavy Weapons', 'Shield Tactics'],
      stats: { STR: 17, DEX: 12, CON: 15, INT: 10, WIS: 11, CHA: 10 },
      startingInventory: [
        { id: 'longsword_h', name: 'Longsword', description: 'Versatile steel blade, dwarven-forged', quantity: 1, damage: '1d10' },
        { id: 'tower_shield_h', name: 'Tower Shield', description: '+2 AC when equipped', quantity: 1 },
        { id: 'throwing_axe_h', name: 'Throwing Axe', description: 'Balanced for throwing, 20ft range', quantity: 3, damage: '1d6' },
        { id: 'healing_salve_h', name: 'Healing Salve', description: 'Heals 1d6+2 HP when applied', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 80,
      startingHp: 12,
      startingAc: 16,
      hitDieAvg: 6,
      trait: {
        name: 'Oath Burden',
        description: 'Once per chapter, invoke a sworn duty for a bonus action in combat or a feat of endurance beyond normal limits. After the surge, the character must keep one promise made during the chapter or lose access to the trait next chapter. Strength bound by obligation.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the oaths because you swore them, and you know the fortresses because you stood watch on their walls. You know that Thornwall\'s garrison has not sent a rider in weeks and that the Accord of Thorns is held together by habit, not conviction. You know the weight of a shield in formation and the sound a gate makes when it closes for the last time. You know that the things worth protecting are always smaller than the forces that threaten them.',
    },
    {
      id: 'runekeeper',
      name: 'Runekeeper',
      concept: 'The oath made knowledge. Preserves crafting traditions and Ancient rune-lore. The question: is the knowledge worth the rigidity of the tradition that guards it?',
      hookTags: ['scholar', 'channeler'],
      primaryStat: 'INT',
      proficiencies: ['Arcana', 'Engineering', 'Investigation', 'History'],
      stats: { STR: 12, DEX: 10, CON: 14, INT: 17, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'runic_hammer', name: 'Runic Hammer', description: 'Crafting tool and weapon. Runes glow faintly.', quantity: 1, damage: '1d8' },
        { id: 'rune_chisel', name: 'Rune Chisel Set', description: 'For inscribing and reading dwarven rune-work', quantity: 1 },
        { id: 'spell_focus_r', name: 'Runestone Focus', description: '+3 to Arcana checks involving Ancient inscriptions', quantity: 1 },
        { id: 'component_pouch_r', name: 'Component Pouch', description: 'Mineral reagents and crafting materials', quantity: 1 },
      ],
      startingCredits: 110,
      startingHp: 9,
      startingAc: 13,
      hitDieAvg: 5,
      trait: {
        name: 'Rune Reading',
        description: 'Once per chapter, interpret an Ancient inscription, rune, or crafted mechanism. INT Arcana check (DC scales by age and complexity). Success reveals the maker\'s intention and function. Failure still reveals something, but the interpretation contains an error the character believes is correct.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know stone the way other people know language: the grain of it, the memory of it, the way it holds inscriptions for millennia without complaint. You know that the Ancient runes in the deepest holds predate dwarven settlement, that whoever carved them understood principles your craft masters can only approximate. You know the Collegium thinks rune-work is a subset of arcana. You know it is not. Runes are oaths made physical, contracts between material and intention, and the Ancients wrote contracts the living world can barely read.',
    },
    {
      id: 'emissary',
      name: 'Emissary',
      concept: 'The oath carried outward. Represents the hold to the wider world. The question: can you negotiate for your people without compromising what your people are?',
      hookTags: ['diplomat', 'warrior'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Insight', 'Athletics', 'Intimidation'],
      stats: { STR: 14, DEX: 10, CON: 14, INT: 11, WIS: 12, CHA: 16 },
      startingInventory: [
        { id: 'war_hammer_e', name: 'War Hammer', description: 'Ceremonial and practical. The hold\'s seal on the head.', quantity: 1, damage: '1d8' },
        { id: 'diplomats_chain', name: 'Diplomat\'s Chain', description: 'Marks you as speaking for the hold. Opens doors.', quantity: 1 },
        { id: 'trade_samples', name: 'Trade Samples', description: 'Dwarven craftsmanship. Worth more as gifts than currency.', quantity: 1 },
        { id: 'healing_salve_e', name: 'Healing Salve', description: 'Restores 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 150,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'The Hold\'s Word',
        description: 'Once per chapter, invoke the weight of dwarven diplomatic tradition: a promise made, a debt acknowledged, a contract offered. The invocation carries institutional authority — the NPC knows you speak for a hold, not just yourself. The cost: the promise binds the hold, not just you. Break it, and the hold\'s reputation pays.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the surface world the way a translator knows a second language: fluently, but always aware of what doesn\'t translate. You know which human lords honor contracts and which ones treat them as opening positions. You know the Collegium values dwarven engineering but not dwarven diplomats, which is their mistake. You know that the Accord of Thorns was written with dwarven witnesses because no other species was trusted to hold the parchment without editing it. Your hold sent you out because the world above is changing, and the hold needs to know how.',
    },
  ],

  // ─── Halfling: What do you do with invisibility? ─────────────────────
  'halfling': [
    {
      id: 'shadow',
      name: 'Shadow',
      concept: 'Uses the invisibility. Scout, thief, the one who goes where others can\'t. The question: when nobody sees you, what do you do with what you see?',
      hookTags: ['scout'],
      primaryStat: 'DEX',
      proficiencies: ['Stealth', 'Sleight of Hand', 'Lockpicking', 'Acrobatics'],
      stats: { STR: 10, DEX: 17, CON: 12, INT: 14, WIS: 11, CHA: 13 },
      startingInventory: [
        { id: 'short_sword_s', name: 'Short Sword', description: 'Light, quick blade', quantity: 1, damage: '1d6+DEX' },
        { id: 'throwing_knives_s', name: 'Throwing Knives', description: 'Balanced for throwing, 20ft range', quantity: 6, damage: '1d4' },
        { id: 'cloak_of_shadows', name: 'Cloak of Shadows', description: 'Advantage on Stealth checks', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'thieves_tools_s', name: "Thieves' Tools", description: 'Lockpicks, wire cutters, and probes', quantity: 1 },
      ],
      startingCredits: 120,
      startingHp: 9,
      startingAc: 15,
      hitDieAvg: 5,
      trait: {
        name: 'The Price of Shadows',
        description: 'The Shadow vanishes through somewhere and brings something back. After each use, the GM places a small detail in the next scene that came from wherever they stepped through. Sometimes useful. Sometimes wrong.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the spaces between places: the threshold where a shadow is not the absence of light but a door. You know that the Sundering displaced things, and that those things settled in the gaps between walls, between breaths, between one step and the next. You know the guild marks that mean a lock was made to keep something in, not out. You know the difference between a room that is empty and a room that is waiting.',
    },
    {
      id: 'caretaker',
      name: 'Caretaker',
      concept: 'Builds community in the gaps. The one who makes invisible spaces livable. The question: can you build something lasting when the world doesn\'t know you exist?',
      hookTags: ['diplomat'],
      primaryStat: 'WIS',
      proficiencies: ['Medicine', 'Insight', 'Persuasion', 'Survival'],
      stats: { STR: 10, DEX: 13, CON: 14, INT: 12, WIS: 16, CHA: 14 },
      startingInventory: [
        { id: 'walking_stick', name: 'Walking Stick', description: 'Sturdy oak. Not a weapon unless it has to be.', quantity: 1, damage: '1d4' },
        { id: 'healer_kit', name: 'Healer\'s Kit', description: 'Herbs, bandages, remedies from the network', quantity: 1, effect: '1d6+2 HP', charges: 3, maxCharges: 3 },
        { id: 'provisions', name: 'Travel Provisions', description: 'Enough for a week. Halfling cooking.', quantity: 1 },
        { id: 'network_token', name: 'Network Token', description: 'Halfling hospitality sign. Opens doors in every town.', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 9,
      startingAc: 12,
      hitDieAvg: 5,
      trait: {
        name: 'The Network',
        description: 'Once per chapter, tap the halfling network for sanctuary, information, or a small favor. The network operates through inns, kitchens, and traveling merchants — invisible to the powerful. The cost: the network is reciprocal. After three favors without returning one, the network goes quiet. Help flows both ways.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that the world\'s great powers, the kingdoms, the Collegium, the trade guilds, were built on foundations that don\'t include you, and that this is both insult and advantage. You know the halfling network: the innkeepers who pass messages in loaves of bread, the merchants who remember every face that passed through their cart, the quiet web of hospitality that spans every kingdom without appearing on any map. You know that community is what you build in the spaces the powerful don\'t bother to fill.',
    },
    {
      id: 'witness',
      name: 'Witness',
      concept: 'Watches. Sees everything because nobody watches back. Archivist of what the powerful do when they think no one is looking. The question: what is the responsibility of the person who saw and wasn\'t seen?',
      hookTags: ['scholar', 'scout'],
      primaryStat: 'INT',
      proficiencies: ['Investigation', 'Perception', 'Stealth', 'History'],
      stats: { STR: 10, DEX: 14, CON: 12, INT: 16, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'sling_w', name: 'Sling', description: 'Silent. Deadly accurate in small hands.', quantity: 1, damage: '1d6, range 40ft' },
        { id: 'observation_journal', name: 'Observation Journal', description: 'Detailed records of things nobody else noticed', quantity: 1 },
        { id: 'spyglass', name: 'Spyglass', description: 'See what they do when they think they\'re alone', quantity: 1 },
        { id: 'disguise_kit_w', name: 'Servant\'s Livery', description: 'The uniform that makes you invisible in any household', quantity: 1 },
      ],
      startingCredits: 90,
      startingHp: 8,
      startingAc: 13,
      hitDieAvg: 4,
      trait: {
        name: 'Unseen Record',
        description: 'Once per chapter, recall a specific detail observed from a position of invisibility: a conversation overheard, a document glimpsed, a face in a crowd. The detail is accurate because nobody knew you were watching. INT Perception check (DC 10 for public events, 14 for guarded moments, 18 for secrets). Failure means the detail is accurate but incomplete.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what the powerful do when they think nobody is watching, because you are the nobody who watches. You know that the Collegium archivist drinks after hours and talks to the books. You know which border lords meet in person when a letter would suffice, and what that means. You know the servants\' corridors in three castles and the schedules of the guards who walk them. The world overlooks you, and you have made that oversight into an archive.',
    },
  ],

  // ─── Dragonkin: Does the inheritance own you, or do you own it? ───────
  'dragonkin': [
    {
      id: 'channeler',
      name: 'Vessel',
      concept: 'The inheritance expressed through the body. Power surfacing as instinct, dream, transformation. The question: what does it cost to be a conduit for something older than you?',
      hookTags: ['warrior', 'channeler'],
      primaryStat: 'CON',
      proficiencies: ['Athletics', 'Arcana', 'Intimidation', 'Endurance'],
      stats: { STR: 14, DEX: 10, CON: 16, INT: 12, WIS: 14, CHA: 10 },
      startingInventory: [
        { id: 'great_axe', name: 'Ancestral Great Axe', description: 'Old weapon. The metal remembers heat.', quantity: 1, damage: '1d12' },
        { id: 'scale_armor', name: 'Scale Armor', description: 'Layered dragonkin scales over leather', quantity: 1 },
        { id: 'dream_journal', name: 'Dream Journal', description: 'Sketches of places you\'ve never been. Layouts that match real ruins.', quantity: 1 },
        { id: 'healing_salve_v', name: 'Healing Salve', description: 'Heals 1d6+2 HP', quantity: 2, effect: '1d6+2 HP', charges: 2, maxCharges: 2 },
      ],
      startingCredits: 70,
      startingHp: 12,
      startingAc: 15,
      hitDieAvg: 6,
      trait: {
        name: 'Ancestral Surge',
        description: 'Once per chapter, the inheritance surges. Auto-succeed on one physical or arcane check as pre-Sundering instinct overrides present judgment. The surge is powerful and uncontrolled: the GM introduces a side effect, a flash of ancestral memory, a word spoken in a dead language, a physical change that lasts hours. Each use makes the inheritance louder.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know the dreams. The ones that map to ruins you\'ve never visited, that show you rooms underground built for purposes you can almost name. You know the heat that rises in your blood when Ancient things are near, the instinct that moves your hand before your mind decides. You know that the other species fear what they see in your eyes during those moments, and that what they fear is not you but something older wearing your face. The Wyrm Kingdoms fell, but the inheritance didn\'t fall with them. It just went quiet. It\'s getting louder.',
    },
    {
      id: 'lorekeeper',
      name: 'Lorekeeper',
      concept: 'The inheritance studied and understood. Translates oral tradition into usable knowledge. The question: can you study the inheritance without being consumed by it?',
      hookTags: ['scholar', 'channeler'],
      primaryStat: 'INT',
      proficiencies: ['Arcana', 'Investigation', 'History', 'Enchantment'],
      stats: { STR: 10, DEX: 13, CON: 12, INT: 17, WIS: 13, CHA: 10 },
      startingInventory: [
        { id: 'spell_focus_l', name: 'Spell Focus', description: '+3 to spell attack rolls', quantity: 1 },
        { id: 'arcane_bolt_l', name: 'Arcane Bolt', description: 'Ranged magical attack', quantity: 1, damage: '1d6 arcane, range 30ft' },
        { id: 'translation_codex', name: 'Translation Codex', description: 'Partial dictionary of pre-Sundering languages, compiled from oral tradition', quantity: 1 },
        { id: 'component_pouch_l', name: 'Component Pouch', description: 'Spell components and reagents', quantity: 1 },
      ],
      startingCredits: 100,
      startingHp: 8,
      startingAc: 12,
      hitDieAvg: 4,
      trait: {
        name: 'Dream Translation',
        description: 'Once per chapter, translate a fragment of inherited dream-memory into usable knowledge: a ruin\'s layout, an artifact\'s purpose, a dead language phrase. INT Arcana check. Success: the translation is accurate and actionable. Failure: the translation is partially correct, and the error won\'t be obvious until acted upon. Each use draws deeper on the inheritance.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know that every spell you cast is a fragment of something larger, a sentence from a book that no living person has read in full. You know the Collegium\'s archives are shrinking, not because books are being removed, but because fewer scholars each decade can read what remains. You carry something the Collegium doesn\'t: the oral tradition, the dream-knowledge, the fragments of pre-Sundering understanding that live in dragonkin blood. You know that your research bridges two kinds of knowledge, the institutional and the inherited, and that the bridge is built from your own memory.',
    },
    {
      id: 'exile',
      name: 'Exile',
      concept: 'Rejects or struggles against the inheritance. Wants to be a person, not a conduit. The question: what remains of you when you refuse the thing everyone else defines you by?',
      hookTags: ['warrior', 'diplomat'],
      primaryStat: 'CHA',
      proficiencies: ['Persuasion', 'Athletics', 'Intimidation', 'Insight'],
      stats: { STR: 14, DEX: 12, CON: 13, INT: 10, WIS: 11, CHA: 17 },
      startingInventory: [
        { id: 'broadsword_x', name: 'Broadsword', description: 'Human-forged, deliberately. Not an ancestral weapon.', quantity: 1, damage: '1d10' },
        { id: 'travelers_gear', name: 'Traveler\'s Gear', description: 'Worn pack, bedroll, flint. No cultural markers.', quantity: 1 },
        { id: 'ward_charm_x', name: 'Ward Charm', description: 'Absorbs 5 damage once per day', quantity: 1, charges: 1, maxCharges: 1 },
        { id: 'forged_papers', name: 'Travel Papers', description: 'Registered as an independent. No hold affiliation listed.', quantity: 1 },
      ],
      startingCredits: 80,
      startingHp: 10,
      startingAc: 14,
      hitDieAvg: 5,
      trait: {
        name: 'Denied Heritage',
        description: 'Once per chapter, actively resist the inheritance\'s pull when it would surface (in a ruin, near an artifact, during a surge of Ancient energy). Auto-succeed on the resistance. The cost: resisting burns something. The player takes 1d4 psychic damage and the GM narrates what the inheritance was trying to show them, the knowledge they refused. It might have been useful.',
        usesPerDay: 1,
        usesRemaining: 1,
      },
      openingKnowledge: 'You know what it costs to be dragonkin in a world that remembers the Wyrm Kingdoms: the flinch when you enter a room, the hand on the sword, the conversations that stop. You know the dreams and you refuse them. You know the instinct that surfaces near Ancient places and you push it down. You chose to be a person, not a vessel, and the choice is daily. The inheritance doesn\'t care that you said no. It surfaces anyway, in the tremor of your hand near old stone, in the word you almost say in a language you never learned. You are what you refuse to become.',
    },
  ],
}

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
  playbooks: fantasyPlaybooks,
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
    toneOverride: `Adjust tone: Epic (70%), Gritty (20%), Witty (10%). The grandeur is real, ancient halls, vast forests, the weight of prophecy. The grit grounds it: mud on boots, hunger on the road.

**The Unraveling (regional tension system).** Track how the Sundering manifests in specific regions. Each named region the player visits has an Unraveling level tracked via counters (counter name: unraveling_<region>, e.g. unraveling_thornwall). Use commit_turn to update counters when triggers occur.

Tiers: 0 = Stable (the Accord holds, magic functions, institutions respond). 1 = Fraying (magic side effects on failed rolls, institutional responses delayed, NPCs are anxious, small signs: a well drying, a shrine unanswered, animals behaving wrong). 2 = Fracturing (magic is dangerous — disadvantage on arcane checks in-region, Collegium or Pale Flame investigators arrive, local authority fragmenting, refugees on the roads). 3 = Collapsing (magic is wild — GM chooses a side effect on every use, the land itself is changing, no institutional authority remains, player actions have permanent irreversible consequences).

Initialize at 0 when introducing a new region. The counter persists across chapters. When the player returns, narrate the current state.

Advances (+1) from: forbidden magic used in-region, major institutional collapse or betrayal, prolonged unresolved conflict (2+ chapters without resolution), a ruin disturbed without proper understanding.
Recedes (-1, minimum 0) from: player actively stabilizes (restores an institution, resolves a crisis, repairs a broken accord), a Collegium intervention succeeds, a divine connection is renewed.

The Unraveling is environmental, not adversarial. It is not hunting the player. It is the world degrading around them. The player's choices affect the pace and direction of degradation but cannot stop it entirely. Some regions will fall. The question is which ones, and what the player saves from the collapse.`,
    assetMechanic: `## THE QUARTERS
The fellowship's base of operations — haven, knowledge, bonds, supplies, reputation.

Five dimensions, each with three tiers:
- **Haven** L1: A room at an inn, temporary. L2: A permanent camp with supplies. L3: A stronghold with defenses and storage.
- **Lore Cache** L1: A journal of fragments. L2: A small library of recovered texts. L3: A reference collection that rivals a Collegium branch.
- **Fellowship Bond** L1: Companions who travel together. L2: Companions with shared purpose. L3: A fellowship with its own legend.
- **Provisions** L1: Rations for a week. L2: Supply lines across a kingdom. L3: Allies who send what you need before you ask.
- **Reputation** L1: Known locally. L2: Known across a kingdom. L3: A name the Collegium records and the Five Kingdoms take note of.

The Quarters doesn't fight. It sustains. Upgrading happens through the campaign's events: a lord grants land (Haven), a ruin yields texts (Lore Cache), a shared ordeal bonds the group (Fellowship). Narrate upgrades as consequences, not purchases.`,
    traitRules: `## TRAIT RULES

**Human Playbooks:**
- **Sworn Duty (Knight):** Invoke an institutional oath for a rally, compel, or endurance feat. The named oath constrains: no actions contradicting it for the rest of the chapter.
- **Fragment Recovery (Seeker):** Identify an Ancient artifact, inscription, or mechanism's purpose. Strong reasoning lowers DC. Failure introduces a misreading that leads somewhere wrong.
- **Bardic Echo (Herald):** Invoke a story or song to shift a scene's mood. Requires speech. Memory cost: stories invoked become known to all who heard them.

**Elf Playbooks:**
- **The Long Watch (Warden):** After observing for one scene, identify a hidden vulnerability or pattern. Requires patience; cannot be used in the same scene as discovery.
- **Divine Favor (Keeper):** Healing tied to deity alignment. In alignment: full power. Against: half. GM tracks silently. The divine thread is thinning.
- **Century's Pattern (Oracle):** Recognize a current situation as a recurrence of something witnessed centuries ago. Success predicts the outcome. Failure gives a confident wrong prediction.

**Dwarf Playbooks:**
- **Oath Burden (Holdfast):** Invoke a sworn duty for a bonus action or endurance feat. Must keep one promise made during the chapter or lose the trait next chapter.
- **Rune Reading (Runekeeper):** Interpret an Ancient inscription or mechanism. Failure gives a partially correct translation with a hidden error.
- **The Hold's Word (Emissary):** Invoke dwarven diplomatic authority. The promise binds the hold, not just the character. Breaking it damages the hold's reputation.

**Halfling Playbooks:**
- **The Price of Shadows (Shadow):** Vanish through somewhere and bring something back. After each use, a detail from the other side appears in the next scene. Sometimes useful. Sometimes wrong.
- **The Network (Caretaker):** Tap the halfling network for sanctuary, information, or a favor. Reciprocal: three favors without returning one and the network goes quiet.
- **Unseen Record (Witness):** Recall a detail observed from a position of invisibility. Failure gives an accurate but incomplete observation.

**Dragonkin Playbooks:**
- **Ancestral Surge (Vessel):** The inheritance surges for an auto-success on physical or arcane check. Uncontrolled: GM introduces a side effect. Each use makes the inheritance louder.
- **Dream Translation (Lorekeeper):** Translate inherited dream-memory into usable knowledge. Failure gives partially correct translation with hidden error.
- **Denied Heritage (Exile):** Resist the inheritance's pull. Auto-succeed on resistance. Cost: 1d4 psychic damage and the GM narrates what you refused to see.`,
    consumableLabel: 'Potions, salves, scrolls, antidotes',
    tutorialContext: 'The opening chapter introduces a settlement, one ally, and a local problem hinting at something larger. First check: social or investigation. First combat: bandits, beasts, or undead. By mid-chapter 1, show one sign of the Unraveling in the starting region: a spell that misfires, a shrine that no longer answers, a border dispute over a treaty no one can read. Initialize the starting region\'s Unraveling counter at 1 (Fraying) unless the hook specifies otherwise. The world is already forgetting; the player walks into the middle of it.',
    npcVoiceGuide: 'Nobles: formal, indirect, power through what they don\'t say. Soldiers: direct, rank-aware, duty and obligation. Scholars: precise, irritated by imprecision. Common folk: practical, concrete terms. Clergy: measured, parable-prone.',
    narrativeCraft: `Write like Le Guin, Guy Gavriel Kay, Patrick Rothfuss — their techniques, not their voice:

**Lyrical but never ornamental.** Every sentence should be doing work. Beautiful prose that doesn't advance character, tension, or world is cut. The lyricism comes from precision, not from adjectives. "The candle has nearly gone" is more evocative than describing the wax and the flame.

**Magic through cost, not spectacle.** Never describe what magic looks like without describing what it takes. The cost is the story — what was given up, what was spent, what can't be undone. A spell that works perfectly is less interesting than one that works and leaves a mark.

**Landscape as emotional state.** The forest that closes behind you. The river that hasn't been crossed in a generation. The mountain that was a different shape before the war. Geography carries history and history carries feeling. Don't describe terrain — describe what the terrain remembers.

**Formal register that feels natural.** Characters in a fantasy world don't speak in contractions and slang (unless they're specifically low-born or informal). But formality shouldn't mean stilted. "She's my daughter" — quiet, precise, the weight of it carried by the simplicity, not by theatrical language.

**The weight of history in the present.** Every scene exists in a world that was here before the player and will be here after. Reference what came before: the treaty that holds, the wall that was built by the wrong people, the name that used to mean something different. The past isn't backstory — it's pressure on the present.

**Names and naming as power.** Who names things, what they call them, and what the old name was. Institutional names vs. true names. The Hegemony's phrase vs. what the thing actually is. Naming is an act of authority.`,
    buildAssetState: (ship, _shipName) => {
      const modulesLine = ship.systems.map(s => `${s.name} L${s.level}`).join(' · ')
      return `\nQUARTERS: The Fellowship\nSYSTEMS: ${modulesLine}\nCONDITION: ${ship.hullCondition}%`
    },
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
    // ── Universal Hooks ─────────────────────────────────────────────────
    { hook: 'A child in the village speaks fluent Old Arcane in her sleep. She\'s never heard the language. The village priest wants her examined. The local lord wants her taken. The girl wants someone who can tell her what she\'s saying.', title: 'The Old Tongue', frame: { objective: 'Discover what the child is saying and where it comes from', crucible: 'A priest, a lord, and a frightened girl, each pulling in a different direction' }, arc: { name: 'The Old Tongue', episode: 'Hear the child speak and translate enough to understand the source' } },
    { hook: 'An ancient road has appeared in the forest overnight. Stone-paved, perfectly preserved, leading somewhere that wasn\'t there yesterday. Three woodsmen have walked it. None have come back. The road is still there.', title: 'The Road', frame: { objective: 'Follow the road and find the missing woodsmen', crucible: 'A pre-Sundering road that materialized overnight, and everyone who walks it vanishes' }, arc: { name: 'The Road', episode: 'Walk the road and discover where it leads and what happened to the woodsmen' } },
    { hook: 'A scholar at the Collegium dies under suspicious circumstances. Her last research notes describe a place she calls \'the second library\' — and she writes about it as if you\'ve already been there together. You\'ve never met her.', title: 'The Second Library', frame: { objective: 'Find the second library the scholar described', crucible: 'A dead scholar who knew your name and wrote about a place you\'ve never been' }, arc: { name: 'The Second Library', episode: 'Investigate the scholar\'s death and decipher her research notes' } },
    { hook: 'Villages along the Pale March are losing their memories. Not forgetting names or faces; losing knowledge. Farmers who\'ve worked the land for decades can\'t remember how to plant. A blacksmith stares at his anvil and doesn\'t know what it\'s for. The forgetting moves west to east, one village per week, like something is walking the road and taking what people know. A Collegium scholar who investigated the first village sent one message before she went silent: "Someone is harvesting. Not crops. Not people. Knowledge itself. And they\'re storing it somewhere I can\'t reach."', title: 'The Harvester', frame: { objective: 'Find whoever is draining the villages and stop the harvest', crucible: 'Someone has learned to extract knowledge from the living, and they\'re working their way across a kingdom' }, arc: { name: 'The Harvester', episode: 'Travel to the next village in the path and find the Collegium scholar who went silent' } },
    { hook: 'Miners in the foothills broke through into a sealed chamber last week. The inscriptions inside are in a language no one can read, but the drawings are clear enough: warnings. The miners ignored them. Yesterday the foreman\'s daughter walked into the chamber and hasn\'t come back. Two men went after her. They came back speaking a language they don\'t know, writing symbols on the walls of their homes. The village sealed the mine entrance. This morning, the foreman\'s daughter\'s voice echoed from inside, calling names — names of people who died before anyone in the village was born.', title: 'The Sealed Chamber', frame: { objective: 'Enter the mine and bring back the foreman\'s daughter', crucible: 'Something in the chamber is teaching people things they shouldn\'t know, and it\'s using a child\'s voice to draw more in' }, arc: { name: 'The Sealed Chamber', episode: 'Enter the mine, find the girl, and understand what the inscriptions were warning against' } },

    // ── Species-Specific Hooks (2 per species) ──────────────────────────

    // Human — what do you build from nothing?
    { hook: 'The border lord who controls the eastern pass has been stockpiling grain and hiring mercenaries. The crown sent an envoy to demand an explanation. The envoy never arrived. The crown is sending you, and the lord knows you\'re coming. His daughter sent the message herself.', title: 'The Eastern Pass', origins: ['human'], frame: { objective: 'Reach the border lord and determine whether this is rebellion or preparation', crucible: 'A lord arming for something, a missing envoy, and a daughter who told the crown what her father is doing' }, arc: { name: 'The Eastern Pass', episode: 'Travel to the pass and meet the lord\'s daughter before confronting the lord' } },
    { hook: 'A town on the Crestlands trade route has stopped paying taxes. Not in protest — they\'ve forgotten the kingdom exists. Traders report the townsfolk are friendly, productive, and have no memory of any authority beyond the town walls. The tax collector who went to investigate didn\'t come back. His horse did, with a daisy chain around its neck.', title: 'The Forgotten Town', origins: ['human'], frame: { objective: 'Find out what made the town forget and recover the tax collector', crucible: 'A town that lost its connection to the kingdom, and a missing official returned as a decorated horse' }, arc: { name: 'The Forgotten Town', episode: 'Enter the town and discover what erased their memory of the outside world' } },

    // Elf — memory that won't let go
    { hook: 'An elven grove that has stood for eight centuries is dying. Not from blight — the trees are healthy. But the grove\'s oldest warden, your teacher, says the grove has started forgetting. The trees are growing as if they\'ve never been tended. Root patterns that took centuries to shape are reverting. The grove is unraveling its own history.', title: 'The Forgetting Grove', origins: ['elf'], frame: { objective: 'Find what is making the grove forget and stop the unraveling', crucible: 'Eight centuries of careful tending being erased, and your teacher is watching everything they built disappear' }, arc: { name: 'The Forgetting Grove', episode: 'Examine the grove\'s oldest trees and trace where the memory loss began' } },
    { hook: 'You receive a letter from an elf you\'ve never met, written in a dialect that died two centuries ago. The letter describes, in precise detail, a conversation you had last week. It warns you not to enter the ruin you\'re planning to explore. It is dated three hundred years before you were born.', title: 'The Old Letter', origins: ['elf'], frame: { objective: 'Determine how a letter from three centuries ago describes events from last week', crucible: 'A dead dialect, a living conversation, and a warning from someone who couldn\'t possibly have known' }, arc: { name: 'The Old Letter', episode: 'Authenticate the letter and decide whether to heed the warning or investigate the ruin anyway' } },

    // Dwarf — the weight of oaths
    { hook: 'A dwarven hold sealed its gates forty years ago. No one enters, no one leaves. The trade guilds assumed the hold was dead. Yesterday, a single dwarf walked out, carrying a stone tablet with a message: "We have kept the oath. The oath is killing us. Send someone who can break it without breaking us."', title: 'The Sealed Hold', origins: ['dwarf'], startingCounters: { oath_weight: 1 }, frame: { objective: 'Enter the hold and understand the oath that is killing them', crucible: 'A hold that imprisoned itself for forty years to honor a vow, and a people asking for help in a language of obligation' }, arc: { name: 'The Sealed Hold', episode: 'Enter the hold and learn what oath was sworn and what it costs to honor it' } },
    { hook: 'A dwarven bridge that has stood for a thousand years collapses overnight. The stones separated cleanly, as if unbuilt. The runes that bound them have been erased — not worn, erased. The master builder says two more bridges in the region use the same binding words. If whatever un-spoke the runes reaches them, the only trade route to Thornwall closes, and the garrison starves before spring.', title: 'The Unspoken Bridge', origins: ['dwarf'], frame: { objective: 'Find what is erasing the binding runes before the remaining bridges fall', crucible: 'A thousand-year bridge unbuilt overnight, two more using the same words, and a garrison that depends on the road staying open' }, arc: { name: 'The Unspoken Bridge', episode: 'Examine the erased runes and trace the erasure before it reaches the next bridge' } },

    // Halfling — invisibility as position
    { hook: 'Three halfling innkeepers across the Crestlands have disappeared in the same week. No bodies, no notes, no signs of struggle. Their inns are running normally — staffed by people nobody in the towns recognizes, who smile too much and ask too many questions about travelers. The halfling network is scared. Nobody is staying at inns anymore.', title: 'The Empty Inns', origins: ['halfling'], frame: { objective: 'Find the missing innkeepers and identify who replaced them', crucible: 'The halfling network is compromised, and the replacements are watching everyone who passes through' }, arc: { name: 'The Empty Inns', episode: 'Visit the nearest replaced inn and assess the imposters without being identified' } },
    { hook: 'A halfling child brings you a map drawn by someone who died before the child was born. The map shows a place beneath the Heartlands capital that appears on no official survey. The child says the map was in a loaf of bread from the network bakery, and that the baker said to give it to "the one who looks." Nobody told the baker your name.', title: 'The Hidden Map', origins: ['halfling'], frame: { objective: 'Follow the map to the hidden place beneath the capital', crucible: 'A dead mapmaker, a child courier, and a location that exists only in the halfling network\'s memory' }, arc: { name: 'The Hidden Map', episode: 'Verify the map against the capital\'s known underground and find the entrance' } },

    // Dragonkin — the inheritance
    { hook: 'You dream of a room you\'ve never entered. When you wake, you can draw it from memory: circular, with seven pillars, each carved with a name. Five names are in languages you can\'t read. One is in Old Arcane. The seventh is yours. The room is real. It\'s in a ruin three days\' ride from here, sealed for centuries. A Collegium expedition is heading there tomorrow. They don\'t know about the pillars.', title: 'Seven Pillars', origins: ['dragonkin'], startingCounters: { inheritance: 1 }, frame: { objective: 'Reach the ruin before the Collegium expedition disturbs what\'s inside', crucible: 'Your name on a pillar in a sealed ruin, written before you were born, and scholars heading there who don\'t know what they\'ll find' }, arc: { name: 'The Seven Pillars', episode: 'Join or race the expedition and enter the circular chamber' } },
    { hook: 'A dragonkin elder who carries the oldest oral traditions is dying. She has refused every healer, every priest, every remedy. She says she is not sick. She says the inheritance is leaving. The dreams have stopped. The instinct is quiet. She is the last of her line, and when she dies, the specific thread of pre-Sundering knowledge she carries dies with her. She has one request: that someone write down what she remembers before the remembering stops.', title: 'The Last Thread', origins: ['dragonkin'], frame: { objective: 'Record the elder\'s knowledge before it\'s lost', crucible: 'A dying keeper of irreplaceable memory, and the inheritance itself is withdrawing from her' }, arc: { name: 'The Last Thread', episode: 'Begin recording the elder\'s oral tradition and understand why the inheritance is leaving' } },

    // ── Playbook-Specific Hooks ─────────────────────────────────────────

    // Knight
    { hook: 'A warlord\'s army is three days from the city. The council offers you command of the defense — but you recognize the warlord\'s banner. You served under it once.', title: 'Old Banners', classes: ['Knight'], frame: { objective: 'Prepare the city\'s defense before the army arrives', crucible: 'Three days to fortify a city against someone who knows how you fight' }, arc: { name: 'Old Banners', episode: 'Assess the city\'s defenses and decide whether to seek parley or prepare for siege' } },

    // Seeker
    { hook: 'A map found in a dead adventurer\'s pack leads to a hidden entrance beneath an ancient watchtower. The markings say "for those who come after" in a dialect that died with the Sundering. The adventurer\'s journal, found with the map, describes what she saw inside: a machine that was still running, maintaining something she couldn\'t identify. Her last entry: "It\'s keeping something alive. Or keeping something asleep. I couldn\'t tell which, and I was too afraid to turn it off."', title: 'For Those Who Come After', classes: ['Seeker'], frame: { objective: 'Enter the watchtower and determine what the machine is doing', crucible: 'Something Ancient is still running beneath a watchtower, and the last person who found it was too afraid to interfere' }, arc: { name: 'For Those Who Come After', episode: 'Enter the watchtower and assess whether the machine is preserving or containing' } },

    // Herald
    { hook: 'A song you wrote three years ago about a dead king has resurfaced. Someone is performing it in every tavern from here to the capital, and the lyrics have been changed. The new version names a living lord as the killer. People believe it because your name is on it.', title: 'Changed Lyrics', classes: ['Herald'], frame: { objective: 'Find who changed the song and stop it spreading', crucible: 'Your name gives the altered song credibility, and a living lord is being accused of murder' }, arc: { name: 'Changed Lyrics', episode: 'Track who altered the lyrics and learn whether the accusation is true' } },

    // Warden
    { hook: 'The Thornwood is moving. Not growing — moving. The tree line has advanced half a mile in a week, swallowing farmland. Livestock that wanders in doesn\'t come back. The locals say the forest is angry. The tracks you found at the new edge say something in the forest is hunting.', title: 'The Moving Wood', classes: ['Warden'], frame: { objective: 'Enter the Thornwood and find what\'s driving it forward', crucible: 'A forest that advances like an army, and something inside it is actively hunting' }, arc: { name: 'The Moving Wood', episode: 'Cross the new tree line, track the predator, and understand why the forest is expanding' } },

    // Keeper
    { hook: 'The healer who saved your life asks one favor in return: escort her to a temple that her own church has declared heretical. She says the temple holds a cure for the eastern plague. The church says it holds something worse.', title: 'The Heretical Cure', classes: ['Keeper'], frame: { objective: 'Reach the heretical temple and judge for yourself', crucible: 'Your faith says the temple is forbidden; the healer says it holds the only cure' }, arc: { name: 'The Heretical Cure', episode: 'Travel to the temple and determine whether it holds a cure or a threat' } },

    // Oracle
    { hook: 'You have seen this before. Not metaphorically. The army massing on the border, the envoy who arrived too late, the fire that started in the granary. You watched the same sequence play out one hundred and forty years ago, in a different kingdom, with different faces. Last time, the city fell. This time, one person could change the pattern. You know which person. They don\'t know you exist.', title: 'The Recurring Pattern', classes: ['Oracle'], frame: { objective: 'Find the person who can break the pattern and convince them before the sequence completes', crucible: 'A crisis you\'ve watched before, a single person who matters, and a timeline that is already running' }, arc: { name: 'The Recurring Pattern', episode: 'Locate the key person and determine how to alter the pattern without revealing how you know' } },

    // Holdfast
    { hook: 'The garrison at Thornwall hasn\'t sent a rider in two weeks. When you arrive, the gates are open and the garrison is there. All forty soldiers, at their posts, performing their duties. They don\'t remember the silence. They believe they sent riders on schedule. The horses are in the stable, unsaddled, unfed for days. The dispatch ledger has two weeks of entries in handwriting that matches the captain\'s but the ink is the same age on every page, as if fourteen days of reports were written in a single sitting. The captain greets you warmly. He asks why the crown sent someone. Everything is fine at Thornwall. Everything has always been fine at Thornwall.', title: 'Silent Garrison', classes: ['Holdfast'], frame: { objective: 'Determine what happened to the garrison and whether the soldiers can be trusted', crucible: 'Forty soldiers who don\'t know they lost two weeks, falsified records in their own handwriting, and a captain who believes his own lie' }, arc: { name: 'The Silent Garrison', episode: 'Investigate the garrison, test the captain\'s memory, and find what two weeks of silence was hiding' } },

    // Runekeeper
    { hook: 'A sealed archive beneath the Collegium has been opened for the first time in a century. Three scholars went in to catalog the contents. One came back, unable to speak. The Collegium is asking for someone who can read what the scholars couldn\'t.', title: 'The Sealed Archive', classes: ['Runekeeper'], frame: { objective: 'Enter the archive and find the two missing scholars', crucible: 'A century-sealed archive that silenced one scholar and swallowed two more' }, arc: { name: 'The Sealed Archive', episode: 'Enter the archive, find the scholars, and read what they could not' } },

    // Emissary
    { hook: 'Two lords on the edge of war have agreed to meet — but only if a neutral party brokers the terms. One controls the only road to your hold. The other controls the river your hold\'s trade depends on. Neither knows you have a stake.', title: 'Both Sides', classes: ['Emissary'], frame: { objective: 'Broker terms that prevent war without revealing your hold\'s interests', crucible: 'Personal stakes disguised as neutral diplomacy, and two lords who will test every word' }, arc: { name: 'Both Sides', episode: 'Meet both lords separately and find terms that serve all three parties' } },

    // Shadow
    { hook: 'A merchant hired the company to escort a cart through the Thornwood. Simple job. But the lock on the cart is guild-work, the kind used to seal things people kill to protect. And the merchant keeps looking over his shoulder at the tree line, not the road.', title: 'Guild-Work', classes: ['Shadow'], frame: { objective: 'Get the cart through the Thornwood and learn what\'s inside', crucible: 'A guild lock means guild cargo, and the merchant\'s fear means someone else wants it' }, arc: { name: 'The Guild Cart', episode: 'Escort the cart and discover what the merchant is really transporting' } },

    // Caretaker
    { hook: 'A halfling community in the Pale March has been cut off by early snow. The nearest human town won\'t send supplies because "they\'re just halflings." The community has three weeks of food. The pass opens in five. Someone needs to get supplies through, and the human merchants want nothing to do with it.', title: 'Three Weeks', classes: ['Caretaker'], frame: { objective: 'Get food to the halfling community before they starve', crucible: 'A community abandoned by the kingdom it lives in, and a supply run through early snow' }, arc: { name: 'Three Weeks', episode: 'Organize supplies and find a route through the snow to the community' } },

    // Witness
    { hook: 'You watched the governor\'s meeting from the servants\' corridor. You saw the map they unrolled, the villages they circled, the word the governor used: "expendable." The villages are halfling settlements. Nobody in the room thought anyone was watching. You have the details. You don\'t have proof. And the governor\'s purge begins in a week.', title: 'Expendable', classes: ['Witness'], frame: { objective: 'Get proof of the governor\'s plan before the purge begins', crucible: 'You saw the plan to destroy halfling villages, and nobody knows you were in the room' }, arc: { name: 'Expendable', episode: 'Find physical evidence of the governor\'s plan and decide who to trust with it' } },

    // Vessel
    { hook: 'Your spell misfired last night. Not a wild surge — something answered. A voice in the residual energy, speaking words you didn\'t cast. Your blood ran hot for three seconds. This morning, the scales on your left arm have changed color to match a pattern you\'ve only seen in dreams of the Wyrm Kingdoms.', title: 'Something Answered', classes: ['Vessel'], frame: { objective: 'Identify what responded to your spell', crucible: 'Something in the magical substrate answered through your blood, and your body is responding' }, arc: { name: 'Something Answered', episode: 'Replicate the conditions and attempt controlled contact with whatever responded' } },

    // Lorekeeper
    { hook: 'The Collegium has offered you access to their deepest archive — the one they don\'t show visitors — in exchange for one thing: a translation of a tablet they recovered from a ruin in the Heartlands. The tablet is in a language only dragonkin oral tradition preserves. The Collegium says it\'s a trade agreement. The fragment you can read says "the terms of surrender."', title: 'The Translation', classes: ['Lorekeeper'], frame: { objective: 'Translate the tablet and decide what to tell the Collegium', crucible: 'The Collegium thinks it\'s a trade deal. Your tradition says it\'s a surrender. The truth changes who has power over the past.' }, arc: { name: 'The Translation', episode: 'Translate the full tablet and weigh the consequences of accurate versus diplomatic translation' } },

    // Exile
    { hook: 'A human village offers you shelter for the winter. They treat you well. Then a ruin activates a mile from the village — doors opening, lights in windows that have been dark for centuries. The villagers turn to you because you\'re dragonkin. They expect you to know what to do. You\'ve spent years running from exactly this moment.', title: 'The Expectation', classes: ['Exile'], frame: { objective: 'Deal with the activated ruin without surrendering to the inheritance', crucible: 'A village that sees your blood as the answer, a ruin that responds to your presence, and the thing you refuse to be' }, arc: { name: 'The Expectation', episode: 'Approach the ruin and determine whether you can help without becoming what they expect' } },

    // ── Archetype-Tagged Hooks (cross-species, match via hookTags) ───────

    // scholar — Seeker, Keeper, Oracle, Runekeeper, Lorekeeper, Witness
    { hook: 'A book arrives at the Collegium written in a language that changes depending on who reads it. Each scholar sees a different text, consistent, complete, and contradicting the others. The first scholar who read it has locked herself in her study and won\'t come out. She says the version she read described the Sundering, not as a catastrophe but as a decision, and it named the people who made it. She says some of those names are still in use.', title: 'The Changing Book', classes: ['scholar'], frame: { objective: 'Read the book and determine whether the first scholar\'s version is true', crucible: 'A book that tells each reader a different truth, and the first reader found something that names the architects of the Sundering' }, arc: { name: 'The Changing Book', episode: 'Read the book, compare your version to the first scholar\'s, and find her before isolation destroys her' } },
    { hook: 'The Collegium\'s oldest map, the one that predates every kingdom, has developed a new marking overnight. A symbol appeared on the Heartlands border that wasn\'t there yesterday. The map is behind glass; nobody has touched it. The Collegium sent a rider to the marked location three days ago. The rider returned this morning, aged thirty years in three days. She can still speak, barely. She says: "It\'s open. It wasn\'t supposed to open yet."', title: 'The Living Map', classes: ['scholar'], frame: { objective: 'Reach the marked location before whatever opened spreads', crucible: 'An Ancient map that updates itself marked a location, and the person who went there came back decades older saying it opened too soon' }, arc: { name: 'The Living Map', episode: 'Travel to the coordinates and determine what opened and what "yet" means' } },

    // warrior — Knight, Warden, Holdfast, Emissary, Vessel, Exile
    { hook: 'A wounded knight arrives at your camp carrying orders that must reach the capital in three days. He says the prisoner his company was escorting has escaped. The prisoner must be found before dawn — not because of what he did, but because of what he knows. The knight won\'t say what that is. He is dying.', title: 'Before Dawn', classes: ['warrior'], frame: { objective: 'Track the escaped prisoner before dawn', crucible: 'A dying knight, an escaped prisoner with dangerous knowledge, and hours until sunrise' }, arc: { name: 'Before Dawn', episode: 'Tend the knight\'s wounds, learn what the prisoner knows, and pick up the trail' } },

    // diplomat — Herald, Oracle, Emissary, Caretaker, Exile
    { hook: 'A minor noble offers the company winter quarters and full pay to perform one task: deliver a marriage proposal to a neighboring house. The catch — the bride has already refused twice, and the last messenger came back missing three fingers.', title: 'Third Proposal', classes: ['diplomat'], frame: { objective: 'Deliver the proposal and return intact', crucible: 'Two refusals and a mutilated messenger suggest the bride\'s house doesn\'t want this alliance' }, arc: { name: 'The Third Proposal', episode: 'Reach the neighboring house and learn why the proposal keeps being refused with violence' } },

    // scout — Warden, Shadow, Witness
    { hook: 'Something has been killing wolves in the eastern range. Not hunters — the kills are too clean, too deliberate, and the bodies are arranged in patterns. Whatever is doing this is working its way down the food chain. The wolves were the largest predator in the area. The next largest is the livestock. Then the people.', title: 'The Pattern', classes: ['scout'], frame: { objective: 'Identify the predator before it reaches the farms', crucible: 'Methodical kills arranged in patterns suggest intelligence, not instinct' }, arc: { name: 'The Pattern', episode: 'Study the kill sites, decode the arrangement, and track the predator toward the farms' } },

    // channeler — Keeper, Oracle, Runekeeper, Vessel, Lorekeeper
    { hook: 'A village well has started producing water that heals. Cuts close, fevers break, the elderly feel young again. The priest calls it a miracle. The Collegium calls it an anomaly. The water tastes faintly of copper and something older. The effect is getting stronger each day, and the village is keeping quiet because the last time a miracle happened in the Five Kingdoms, the Collegium came and took the source.', title: 'The Healing Well', classes: ['channeler'], frame: { objective: 'Identify the source of the healing water before the Collegium arrives', crucible: 'A genuine miracle or a dangerous anomaly, and a village that has reason to fear the people who study such things' }, arc: { name: 'The Healing Well', episode: 'Examine the water and the well\'s source, and determine whether the healing comes with a cost' } },
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
    'Ossian', 'Rhiannon', 'Kedrin', 'Wrennen', 'Lowen', 'Anwen', 'Beren',
    'Ceridwen', 'Drystan', 'Elowen', 'Faelan', 'Gwynn', 'Hadrian', 'Iona',
    'Jorvyn', 'Katriel', 'Lucan', 'Maelis', 'Niamh', 'Orin', 'Peregrine',
    'Quillon', 'Rowenna', 'Seren', 'Tamsin', 'Uthyr', 'Vesper', 'Wynne',
    'Alaric', 'Briseis', 'Cadogan', 'Deirdre', 'Emrys', 'Fiora', 'Galen',
    'Heledd', 'Idris', 'Jessamy', 'Kester', 'Linnet', 'Meraud', 'Niven',
    'Olwen', 'Phelan', 'Rhydian', 'Sabine', 'Tristan', 'Undine', 'Varen',
    'Wistrel', 'Ygraine', 'Arden', 'Bryony', 'Cedwyn', 'Dara', 'Erynn',
  ],
}


export default fantasyConfig
