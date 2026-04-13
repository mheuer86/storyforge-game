# Storyforge System Reference Document

A solo text RPG powered by AI. You play; Claude runs the world. Every decision matters, every roll has consequences, and the story is yours.

---

## 1. Introduction

Storyforge is a single-player tabletop RPG played in your browser. Claude acts as Game Master: narrating the world, voicing NPCs, enforcing rules, and tracking all game state. The engine uses a d20 system (roll a 20-sided die plus modifiers against difficulty targets) with layered social, investigation, and exploration mechanics.

**The core loop:**
1. The GM narrates a scene and presents the situation.
2. You choose an action (from suggested options or your own input).
3. When the outcome is uncertain, you roll dice.
4. The GM narrates consequences and updates the world.

**Six genres, six worlds.** Each genre is a complete game with its own species, classes, tone, and mechanics:

| Genre | Tagline | Currency | Asset |
|-------|---------|----------|-------|
| **Space Opera** | A fractured galaxy. One ship. No good options. | Credits | Ship |
| **Fantasy** | The world is older than it remembers. Pay the price anyway. | Gold | Quarters |
| **Grimdark** | Kingdoms rot from the inside. Someone has to survive it. | Crowns | Company |
| **Cyberpunk** | The city owns everything. Steal some of it back. | Eddies | Tech Rig |
| **Noir** | Everyone lies. The truth is what's left. | Marks | Office |
| **Epic Sci-Fi** | Power has a price. Someone always pays. | Writs | Retinue |

---

## 2. Character Creation

You build your character by choosing three things: genre, origin, and class.

### Origin (Species / Folk / Bloodline)

Your origin determines your position in the world. It defines how NPCs react to you on first contact, which institutions cooperate or resist, and what social doors open and close. Each origin comes with:

- **Lore** that the GM uses to shape NPC interactions
- **Starting contacts** (1-2 NPCs with pre-set relationships)
- **A moral counter** that tracks your relationship to your origin's defining tension (see Section 11)

Origins are labeled differently per genre: Species (Space Opera), Folk (Fantasy), Bloodline (Grimdark), Origin (Cyberpunk, Noir, Epic Sci-Fi).

### Class

Your class is the skill chassis. It determines your stats, proficiencies, starting gear, HP, AC, and signature trait. Each genre has 5-6 classes covering different playstyles (combat, social, stealth, investigation, support).

**Stats:** The standard six abilities from d20 systems.

| Stat | Abbrev | Governs |
|------|--------|---------|
| Strength | STR | Melee attacks, athletics, feats of power |
| Dexterity | DEX | Ranged attacks, stealth, agility |
| Constitution | CON | Hit points, endurance, resilience |
| Intelligence | INT | Investigation, lore, technical knowledge |
| Wisdom | WIS | Perception, insight, survival instincts |
| Charisma | CHA | Persuasion, deception, leadership |

Each stat has a **modifier** = (stat - 10) / 2, rounded down. A stat of 14 gives +2; a stat of 8 gives -1.

**Proficiencies** are the skills your class is trained in. When you roll a proficient skill, you add your proficiency bonus on top of the stat modifier.

| Level | Proficiency Bonus |
|-------|:-:|
| 1-4 | +2 |
| 5-8 | +3 |
| 9-12 | +4 |
| 13+ | +5 |

**Traits** are your class's signature ability. Each class has exactly one trait with limited uses per chapter. Examples: a diplomat who can halt hostilities by invoking formal authority, a fighter who drops to 1 HP instead of 0, a hacker who can deep-dive into networks at the cost of chrome stress.

**Starting inventory** includes weapons (with damage dice), tools, consumables (with limited charges), and genre-appropriate equipment. **Starting HP** ranges from 8 (face/caster types) to 12 (tanks). **Starting AC** ranges from 11 to 16.

---

## 3. Core Mechanics

### The d20 System

When you attempt something uncertain with meaningful consequences, you roll a d20 and add your modifier. The GM sets a Difficulty Class (DC). Meet or beat it: success. Fall short: failure with consequences.

**Total = d20 + stat modifier + proficiency bonus (if proficient)**

### Difficulty Classes

| Difficulty | DC |
|-----------|:--:|
| Easy | 8 |
| Moderate | 12 |
| Hard | 16 |
| Very Hard | 20 |
| Nearly Impossible | 25+ |

### Advantage and Disadvantage

When you have **advantage**, roll 2d20 and keep the higher result. When you have **disadvantage**, keep the lower. If you have both, they cancel out.

**Common advantage triggers:** favorable gear or items, creative tactics, Trusted NPC disposition, crew cohesion at 5, environmental exploitation.

**Common disadvantage triggers:** Hostile or Wary NPC disposition, crew cohesion at 2 or below, environmental hazards, a weak stat being targeted, asset (ship/rig) in critical condition.

### Critical Success (Natural 20)

Something unexpected and positive happens beyond normal success. On attack rolls, critical hits deal bonus effects.

### Fumble (Natural 1)

A complication occurs beyond normal failure. The situation worsens in an unexpected way.

### Contested Rolls

When a named NPC actively opposes your action, both sides roll. Higher total wins. The GM rolls for the NPC behind the scenes.

### Passive Perception

Your passive perception = 10 + WIS modifier. You automatically notice things at or below this threshold without actively searching. Anything above requires an active check.

---

## 4. Combat

Combat is narrative, not grid-based, but follows structured rules.

### Flow

1. The GM determines initiative based on the fiction (who acted first, who was ready).
2. On your turn: choose an action. Attacks, abilities, items, or creative maneuvers.
3. **Your attacks** use the dice widget: d20 + modifier vs enemy AC. On a hit, a damage roll auto-chains (you roll your weapon's damage die immediately).
4. **Enemy attacks** are resolved by the GM and shown as roll breakdowns (you see the math, but don't roll for enemies).
5. The GM narrates the round's outcome and presents your next options.

### Attack Resolution

- Roll d20 + stat modifier (STR for melee, DEX for ranged) + proficiency bonus (if proficient with the weapon)
- Meet or beat the enemy's AC: hit. Roll weapon damage.
- Miss: the enemy dodges, blocks, or your shot goes wide.

### Enemy Threat Tiers

| Tier | Type | HP Range | AC Range |
|:----:|------|:--------:|:--------:|
| T1 | Civilian / Minion | ~8 | ~10 |
| T2 | Trained / Soldier | ~15-20 | ~12-13 |
| T3 | Veteran / Elite | ~25-35 | ~14-15 |
| T4 | Boss / Commander | ~40-50 | ~16-17 |
| T5 | Apex / Legendary | 60+ | ~18+ |

### Hit Points and Death

When you reach 0 HP, you fall unconscious and begin **death saves**: roll a d20 each round.

- 10 or higher: one success
- 9 or lower: one failure
- Natural 20: regain 1 HP and wake up
- Natural 1: counts as two failures

Three successes: stabilized. Three failures: dead.

---

## 5. Social Systems

### NPC Disposition

Every NPC has a disposition tier that determines how they treat you and how hard social checks are.

| Tier | Social Effect | Mechanical Effect |
|------|--------------|-------------------|
| Hostile | Refuses cooperation, may attack | Disadvantage on all social rolls |
| Wary | Suspicious, demands proof | Disadvantage on Persuasion |
| Neutral | Standard interaction | Normal DCs |
| Favorable | Helpful, shares information | +2 to social rolls |
| Trusted | Volunteers aid, loyal | Advantage on social rolls |

Key principle: **climbing is slow, falling is fast.** Building trust takes repeated positive interactions. Breaking it takes one betrayal. Fear does not equal trust; compliance under threat never improves disposition.

### NPC Failure Escalation

If you fail the same social approach against an NPC three times (e.g., three failed Deception checks), that approach is permanently closed. You must try a different skill. The GM warns you at two failures.

### Crew Cohesion

Cohesion is a 1-5 score derived from the average disposition of all your crew/companion NPCs.

| Score | Label | Effect |
|:-----:|-------|--------|
| 5 | Full Trust | Advantage on crew-related rolls |
| 4 | High | One advantage per scene on crew rolls |
| 3 | Functional | Normal |
| 2 | Strained | Disadvantage on crew rolls |
| 1 | Fractured | Crew acts in self-interest |

Cohesion rises when you protect your crew, keep promises, share credit, and acknowledge their contributions. It falls when you treat them as tools, break promises, or dismiss their concerns.

### Crew Load

Companions carry psychological weight from the campaign. Events add load entries at three severity levels: **severe** (trauma, betrayal, broken promises hitting their vulnerability), **moderate** (operational stress, difficult orders), and **mild** (routine fatigue or positive pride).

If load accumulates too high, a companion reaches their **breaking point** and will manifest crisis behavior tied to their personal vulnerability. Recovery requires dedicated personal scenes: a real conversation, a kept promise, a quiet moment together.

### Promises

When you make a commitment to an NPC, it becomes a tracked promise.

- **Active**: recently made, NPC expects follow-through
- **Strained**: deferred twice, or two chapters with no progress
- **Broken**: deferred a third time or explicitly violated

Broken promises cause disposition drops and crew load. The GM will remind you of outstanding promises through NPC dialogue.

---

## 6. Investigation and Evidence

### The Notebook

When you discover information during play, clues are recorded in your notebook. Each clue has a source, tags, and a status.

### Evidence Tiers

Connecting clues together produces stronger evidence:

| Combination | Result |
|------------|--------|
| Clue + Clue | Lead |
| Lead + Clue | Enriched Lead |
| Lead + Lead | Breakthrough |

You can propose connections between clues using the `/connect` command. The GM sets a DC based on the connection's difficulty (DC 10 obvious, DC 14 moderate, DC 18 hidden). Expert NPCs can make connections without rolls.

**Red herrings** exist. Some clues come from tainted sources and lead to plausible but wrong conclusions. The GM never tells you which sources are tainted; you discover this through play.

---

## 7. Operations and Exploration

### Operations

Multi-phase plans for heists, raids, rescues, and infiltrations.

| Phase | Description |
|-------|-------------|
| **Planning** | Gather intel, assess risks, assign roles. Assertions about uncertain facts require assessment rolls. |
| **Pre-Insertion** | Final preparation, positioning. |
| **Active** | Executing the plan. Objectives tracked on the HUD. |
| **Extraction** | Getting out. Always a scene, never hand-waved. |

Operations track objectives (pass/fail), tactical facts, asset constraints, abort conditions, and signal triggers. The HUD displays active objectives during the active and extraction phases.

### Exploration

When you enter a facility or location with spatial significance, the game tracks explored areas, your current position, and unexplored zones. In hostile facilities, exploration follows infiltration rules: a tension clock tracks your exposure, and three failures trigger confrontation.

---

## 8. Pacing and Chapter Structure

### Chapter Structure

Each chapter follows a four-act structure:

| Act | Turns | What Happens |
|-----|:-----:|-------------|
| **Hook** | 1-3 | Scene-setting, inciting incident |
| **Development** | 4-8 | Investigation, social encounters, planning |
| **Crucible** | 9-14 | The chapter's central challenge (combat, infiltration, high-stakes negotiation) |
| **Resolution** | 15-18 | Aftermath, consequences, setup for next chapter |

**Target length:** 12-18 turns. Hard cap at 25.

At turn 16+, the scene freezes: no new locations, no new NPCs, no new plot threads. The GM drives toward resolution. At turn 20, the chapter must close.

### Scene Boundaries

A new scene begins when you change location, significant time passes, a mission phase transitions, or the activity fundamentally shifts. Each scene gets a summary that preserves what happened, what changed, and the emotional tone.

### Chapter Close

When the chapter's objective is met, the GM signals that a close is available. You'll see a "Close Chapter" button. Triggering it runs a three-phase close sequence:

1. **Audit and Archive**: state cleanup, chapter summary, level-up, next chapter setup
2. **Debrief**: tactical analysis, strategic assessment, costs paid, promises kept or broken
3. **Curation**: memorable moments and NPC quotes are preserved for future chapters

The debrief is direct and analytical. It tells you what went well, what went poorly, and what the dice did to your plans.

---

## 9. Story Arcs and Progression

### Story Arcs

Campaigns are structured as **arcs** containing **episodes**. An arc is a multi-chapter storyline ("The Syndicate War," "Finding the Lost Colony"). Each episode is a chapter-scoped milestone within that arc.

Each chapter's objective is derived from the active episode's milestone, keeping chapters focused on one narrative beat rather than trying to resolve an entire storyline.

### Outcome Spectrum

Chapter and arc outcomes fall on a four-tier spectrum:

| Outcome | Meaning |
|---------|---------|
| **Clean** | Objective achieved, costs minimal |
| **Costly** | Objective achieved, but something was lost |
| **Failure** | Objective missed, but the story continues |
| **Catastrophic** | Objective missed and the situation is now worse |

### Level Progression

You gain one level per chapter. On level-up:

- **HP increases** by your class's hit die average + CON modifier (minimum 1)
- **Proficiency bonus increases** at levels 5, 9, and 13
- **Ability Score Increases** at levels 4, 8, and 12 (the GM assigns based on how you played)
- **Skill points** (0-2 per chapter) for creative use of non-proficient skills, clean objective completion, or decisions with lasting payoff

### Asset Upgrades

Your ship, company, rig, or retinue has five subsystems, each upgradable from Level 1 to Level 3. Upgrade opportunities arise through narrative: refit stops, salvage, markets, victories, or downtime. The GM offers 2-3 options when the moment fits.

---

## 10. Hidden Systems

These systems run behind the scenes. You never see the numbers; you experience their effects through the narrative.

### Difficulty Adaptation

If you fail three or more checks in a row, DCs quietly ease by 1-2. If you succeed five or more times consecutively, DCs escalate. Two failures in the same scene cap the third attempt at DC 12.

### Tension Clocks

Invisible timers with 4 or 6 segments. They advance on failures, elapsed time, or exposure. When filled, the trigger fires: reinforcements arrive, the cover identity fails, the bomb detonates, the NPC loses patience.

Clocks advance at most once per scene and must advance at least once before they can resolve. You can defuse a clock through narrative action before it fills.

### Timers

Hard deadlines. The shuttle leaves at dawn. The auction closes in three days. The GM does not bend time to save you.

### Heat

Faction attention levels (none / low / medium / high / critical). High heat means tighter security, suspicious NPCs, and reduced freedom of movement in that faction's territory.

### Decisions

Non-operational choices with downstream consequences are automatically tracked. Moral, tactical, strategic, and relational decisions accumulate and shape how the world responds to you. The GM references past decisions when their consequences arrive.

### Fail Forward

Failure always advances the story, but through a worse door. A failed knowledge check means you don't get the knowledge (someone else might, at a cost). A failed Persuasion check means the NPC doesn't cooperate (they demand something, refuse, or misunderstand). A failed Perception check means you miss something that matters later. If a check was worth rolling, the failure changes what happens next.

---

## 11. Origin Counters and Identity

### Origin Pressure

Each origin carries a **moral counter** tied to its defining tension. The counter ticks up when you act in ways that express your origin's central conflict, and ticks down when you resist or comply.

*Example (Epic Sci-Fi):* A Minor House character has a `fealty` counter. It ticks up when they trade dignity for survival or use their house name to buy silence. It ticks down on acts of personal integrity that cost the house.

At counter value 3+, the pressure becomes visible: NPCs from your origin sense the change.

At counter value **5+**, an **identity shift** occurs. Your origin label permanently changes, reflecting how you've played. A Synod origin becomes a Heretic. An Undrift becomes Hunted. An Imperial Service officer becomes a Dissident. The shift changes NPC reactions, faction stances, and your behavioral identity. It cannot be reversed.

### Witness Marks

When your character directly witnesses the human cost of a system (a child taken from their family, a forged record, a faction lie spoken to their face), it's logged as a **witness mark**. These are narrative currency: you can spend them later to justify drastic action that would otherwise seem unmotivated.

### Genre Counters

Some genres have additional persistent counters tied to class traits:

| Genre | Counter | Trigger | What Happens |
|-------|---------|---------|-------------|
| Epic Sci-Fi | Drift Exposure | Using the Drift Touch trait | The Synod notices. At 3+: monitoring. At 6+: active search. At 10+: bounty. |
| Grimdark | Corruption | Using Corruption Tap | The Church reacts. At 3+: Church NPCs start hostile. At 5+: common folk capped at Wary. At 8+: Church hunts you. |
| Cyberpunk | Chrome Stress | Using Zero Trace or Adrenaline Overclocked | At 3+: NPCs notice machine-like behavior. At 6+: empathy degradation. At 10+: cyberpsychosis risk. |
| Noir | Favor Balance | Using Favor Owed | At 3+: contacts demand reciprocity before helping. |

These counters persist across the entire campaign and never reset.

---

## 12. Genre Reference

### Space Opera
Crew-driven adventure across a fractured galaxy. Tone: 60% epic, 30% gritty, 10% witty. Your ship is your home and your most important asset. Species include Humans, Vrynn, Korath, Sylphari, and Zerith.

### Fantasy
Classic adventuring in an ancient world where magic has a price. Tone: mythic weight with human stakes. Folk include Humans, Elves, Dwarves, Halflings, and Dragonkin. Your party operates from shared quarters.

### Grimdark
Survival in rotting kingdoms where the institutions are the real monsters. Tone: dark, consequential, no safety nets. Your Company (warband) degrades between chapters as morale and provisions erode. Bloodlines include noble houses, the oathless, and the outcast.

### Cyberpunk
Street-level crime and corporate espionage in a neon dystopia. Tone: fast, dirty, expendable. Your Tech Rig is your mobile base. Chrome stress from augmentation use accumulates toward cyberpsychosis. Deep Dive uses reset each chapter (3+ in one chapter risks a psychotic break).

### Noir
Investigation and moral compromise in a city that runs on lies. Tone: atmospheric, paranoid, every NPC has an angle. Your office is your anchor. The favor economy tracks debts owed to contacts. Origins include Ex-Cop, Street, Old Money, Veteran, and Immigrant.

### Epic Sci-Fi
Political intrigue in a feudal space empire that runs on human-derived energy (the Drift). Tone: moral weight, institutional complicity, personal identity under pressure. Origin is the primary identity axis; class is secondary. Origin-keyed assets (Retinue, Network, or Remnant) reflect your relationship to power. The deepest worldbuilding of any genre: Houses, the Synod, the Undrift, and the Drift form an interlocking system of exploitation.

---

## 13. Slash Commands

Type these in the input bar for specific actions:

| Command | Effect |
|---------|--------|
| `/challenge` | Force a mechanical moment; demand the GM create a check |
| `/inspect` | Actively search your surroundings (triggers Perception/Investigation) |
| `/roll` | Request a specific skill check |
| `/use` | Activate an inventory item or consumable |
| `/connect` | Propose a connection between two evidence clues |

You can also type any free-form action. The suggested action buttons below the input offer contextual options based on your current situation.

---

## 14. UI Reference

### Action Bar
The bottom of the screen. Shows 3-4 suggested quick actions (contextual to your situation), slash command access, and a free-text input for custom actions.

### Burger Menu
Access your full character sheet, world state (NPCs, threads, promises), chapter history, and game settings.

### Combat HUD
Appears above the action bar during combat. Shows the current round, each enemy's name, health bar (color-coded: green > 50%, yellow 25-50%, red < 25%), and HP fraction. Dead enemies show as strikethrough.

### Operation HUD
Appears during active operations and extractions. Shows the operation name, status indicator (green = active, yellow = extraction), and current objectives.

### Dice Widget
When a roll is required, a dice widget appears. You click to roll (or the system generates a random result). The widget shows the die, your modifier, advantage/disadvantage status, and the result. For advantage, you see both d20s with the kept result highlighted.

---

*Storyforge is built on Claude by Anthropic. The game engine runs client-side with all state stored in your browser's localStorage. No accounts, no servers, no data collection. Your story stays with you.*
