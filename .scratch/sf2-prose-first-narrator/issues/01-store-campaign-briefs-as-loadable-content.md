# Store Campaign Briefs As Loadable Content

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / content / campaign briefs

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

Store pre-authored campaign briefs as loadable content that the narrator can receive as its system prompt at campaign start.

Six reference briefs exist as external documents (Pale Flame/grimdark, Seeker/epic-scifi, Chrome/cyberpunk, Sable/noir, Covenant/fantasy, Cardinal/cold-war). These need to be adapted into a storage format the app can load by genre and hook selection. Each brief is ~3,500 words and follows a convergent document architecture: GM Style → World → Game System → Character Creation Questions → Opening Scene → GM Secrets → Cast → Session Shape.

The briefs are complete campaign documents. They include character creation questions that the narrator will ask as the opening turns of play, replacing the current setup wizard for the prototype path. They also include GM-private sections (What The GM Knows, NPC private agendas) that must not leak into player-visible UI.

For the prototype, store briefs as markdown or plain text files loadable by a genre+hook key. The storage format should be simple enough that new briefs can be added by dropping a file and registering it. Do not build a CMS or editor — briefs are authored externally (via the campaign-setup skill or manually) and imported.

## Reference materials

The six reference briefs are at:
- Pale Flame (grimdark): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605200817 pale flame chapter 1.md`
- Seeker (epic-scifi): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605212006 seeker.md`
- Chrome (cyberpunk): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605212025 Cyberpunk.md`
- Sable (noir): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605212045 Noire.md`
- Covenant (fantasy): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605212045 Fantasy.md`
- Cardinal (cold-war): `/Users/martin/Documents/Brainforest/zettel/2026-W21/2605212049 Cold War.md`

The campaign-setup skill that documents the brief generation workflow is at: `/Users/martin/Downloads/campaign_SKILL.md`

Note: the Sable brief's city name needs changing (user feedback — the name "Sable" conflicts). The Cardinal brief introduces a genre (cold-war) not currently in SF2's active genre list.

## Acceptance criteria

- [ ] At least one brief per active SF2 genre (space-opera, fantasy, grimdark, cyberpunk, noire, epic-scifi) is stored in the repo as loadable content.
- [ ] Briefs are stored as plain text or markdown files under a predictable path, loadable by a genre + hook key.
- [ ] A brief loader function exists that takes a genre and hook identifier and returns the full brief text.
- [ ] The loader returns null/undefined for missing briefs (fail-open — the caller decides fallback behavior).
- [ ] Each stored brief preserves the full document structure: GM Style, World, Game System, Character Creation Questions, Opening Scene, GM Secrets, Cast, Session Shape.
- [ ] Brief content is not processed or restructured by code — it is loaded as-is for injection into narrator context.
- [ ] The storage format supports adding new briefs by dropping a file and registering its genre/hook key.
- [ ] A TypeScript type or interface describes the brief registry entry (genre, hook key, file path or content accessor, title, premise).
- [ ] Existing SF2 hook definitions in `lib/genres/*.ts` are not modified — briefs are a parallel content layer, not a replacement for hook metadata.
- [ ] The brief content does not appear in any player-visible UI surface — it is narrator-private context.
- [ ] The adapted briefs match the reference material content faithfully; only formatting changes (not content changes) are made during import.

## Blocked by

Nothing — this is a content preparation ticket with no code dependencies.
