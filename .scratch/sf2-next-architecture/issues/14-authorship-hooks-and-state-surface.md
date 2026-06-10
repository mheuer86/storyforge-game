# Authorship Hooks (Idle-Only) and the Player-Visible State Surface

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / player surface / UI

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

Two player-surface commitments from the PRD (prompt questions 18–19), small enough to share a ticket:

**Authorship hooks replace suggested actions.** Suggestion chips turned the player from author into chooser and prose quality fell with input quality (Durable Lesson 18). On the prototype path: the Narrator's suggested-actions field becomes `hooks` — open questions and provocations ("What do you do about the unpaid debt to Coll?", "The hatch is still unlocked behind you"), never complete executable actions. Render them only after ~20 seconds of player idle or behind an explicit "give me a nudge" affordance — never immediately under the prose. Clicking a hook inserts it as a *prompt into the input field* for the player to edit, never submits it.

**Player-visible state surface.** The player can already see panels; make the typed spine readable and correctable mid-chapter: character sheet, HP/resources, inventory, clocks, present cast with identity pins. Each hard fact gets a "this is wrong" affordance → free-text correction → same pinned-amendment machinery as issue 07 (typed pin update when mappable, prose pin otherwise). Mid-chapter corrections render in the uncached delta immediately; they join cached prefixes only at chapter boundaries.

## Acceptance criteria

- [ ] Suggested actions on the prototype path are hooks: questions/provocations, schema-constrained against imperative complete-action phrasing (heuristic check + display-sentinel rule).
- [ ] Hooks render only on idle (~20s, configurable) or explicit request; hook click fills the input field and never auto-submits.
- [ ] State panels show the typed spine including identity pins and clocks.
- [ ] Every hard fact has a correction affordance feeding the issue 07 pinned-amendment path; mid-chapter corrections take effect in the next turn's delta.
- [ ] Cache discipline: mid-chapter corrections never touch cached prefixes.
- [ ] No new Narrator-visible entity kinds are introduced by the surface (ontology guard).

## Blocked by

Nothing hard; the correction flow reuses issue 07's amendment machinery — coordinate the shared types if 07 has not landed (define them here if first).
