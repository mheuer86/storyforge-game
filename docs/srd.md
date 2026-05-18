# Storyforge SF2 System Reference

Player-facing system reference for the current `/play` experience.

This is not a full tabletop ruleset. Storyforge is a solo text RPG where Claude narrates, but the browser and SF2 runtime enforce the important mechanics.

---

## Core Loop

1. You describe what your character does.
2. The Narrator writes the scene.
3. If the outcome is uncertain and failure matters, the game asks for a roll.
4. The browser resolves the d20.
5. The Narrator describes the consequence.
6. The Archivist records what changed in the world.
7. The game updates state, pressure, memory, and suggested actions.

The GM can surprise you, but it does not get to choose your die roll.

## Character Sheet

Characters have:

- origin/species or background
- playbook/class
- six stats: STR, DEX, CON, INT, WIS, CHA
- proficiencies
- HP and defense
- inventory
- credits or genre currency
- a playbook trait
- inspiration

Each genre can rename how some of this feels in the UI. The underlying stat structure remains D&D-inspired.

## Checks

Most uncertain actions use:

```text
d20 + relevant modifier vs DC
```

The game asks for checks when:

- you attack
- you search or investigate under uncertainty
- you pressure, deceive, persuade, or read someone
- you move through risk
- you try a technical or specialized action
- a suggested action has a bracketed skill hint, such as `[Insight]`

The Narrator explains what is at stake before the roll. Failure should move the story forward with cost, pressure, exposure, injury, lost time, or changed leverage.

## Roll Outcomes

Rolls follow a yes/no ladder:

| Result | Meaning |
|---|---|
| Strong success | yes, and |
| Clean success | yes |
| Narrow success | yes, but |
| Partial success | partly yes, partly no |
| Narrow failure | no, but |
| Failure | no, and |
| Hard failure | no, and now the board changes |

Narrow success is still success. If you meet or beat the DC, the main intent happens; the cost lands around it through pressure, time, gear, position, trust, wound risk, or another visible bite.

Failure changes the route rather than stopping the chapter. You may lose health, time, trust, gear, position, stealth, custody, or extraction quality, but the game should almost always leave you in a new playable situation.

## Advantage, Disadvantage, Challenge

Rolls can have modifiers:

| Modifier | Meaning |
|---|---|
| Advantage | Roll two d20s and keep the better result |
| Disadvantage | Roll two d20s and keep the worse result |
| Challenge | The action is unusually hard in this context |

The Narrator can request a modifier, but code can also derive one from state: origin, disposition, relationship pressure, faction situation, or scene conditions.

## Inspiration

Inspiration is a player-side reroll resource. When a roll fails and you have inspiration available, the UI can offer a reroll. The Narrator does not spend it for you.

## Health And Inventory

HP changes, credit changes, inventory use, and location changes are applied through Narrator mechanical effects and code. The UI shows important state diffs as chips after a turn.

The Narrator should not silently deduct resources in prose. Mechanical changes need to go through the turn commit.

## Suggested Actions

After each turn, the game offers 3-4 suggested actions. These are not commands. They are grounded options from the current scene.

Some suggestions include a skill hint in brackets:

```text
Watch who avoids the magistrate's seal. [Insight]
```

If you pick or paraphrase that action, the game treats the hint as a strong roll binding.

## Chapters

Storyforge campaigns are built from short, pressure-shaped chapters. A chapter has:

- a premise
- an objective
- a central tension
- a crucible
- possible outcomes
- pressure that rises through people, factions, deadlines, costs, or revelation

Chapter close is handled by code-derived readiness, not just by the GM feeling done. The chapter can close cleanly, close with cost, fail, become catastrophic, or reframe into the next pressure.

## Threads

Threads are unresolved tensions in the world. Examples:

- someone needs protection
- a faction is tightening control
- evidence points at a hidden cause
- a promise is becoming expensive
- a decision has created a cost

Threads have owners, stakeholders, tension, resolution criteria, and sometimes resolution gates. The game uses threads to decide what matters in the next scene.

## Clues And Intel

Clues are evidence, not just interesting details. A clue should answer or sharpen an investigation question. Some clues start floating because your character has seen the fact but not connected it to the right thread yet.

Documents are separate from clues when the terms, author, signatory, or legal/institutional status matter later.

## Procedures

Procedures track multi-turn activities:

- operations
- access attempts
- exploration
- investigations
- combat
- montage tasks

They hold facts, constraints, complications, signals, assessments, and abort conditions. The objective panel surfaces the active procedure when it matters.

## Pressure

Pressure is how the world pushes back.

It can come from:

- failed rolls
- faction moves
- NPC agendas
- deadlines
- broken or strained promises
- decisions coming due
- ladder escalations
- clues becoming visible

Pressure should show up as a human or institutional consequence: someone pays, someone gains leverage, something gets harder, or a visible risk moves closer.

## Memory

The game remembers through structured state:

- NPCs and factions
- threads and arcs
- decisions and promises
- clues and documents
- scene summaries
- emotional beats
- temporal anchors
- pressure events

The model sees a bounded packet of relevant state each turn. It does not rely on an endless chat transcript.

## Saves

SF2 campaigns save locally in the browser's IndexedDB. V1 saves are separate and remain available through `/play/v1`.

The diagnostics panel can copy session JSON and replay JSON. Those exports are mostly for development and bug reports, but they are the raw material for SF2 replay fixtures.
