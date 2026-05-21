# Growing Transcript Narrator Context

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / narrator / prompt architecture

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

Replace the entity-block scene bundle narrator context with a growing conversation transcript that uses prompt caching.

The current narrator receives a rebuilt context each turn: cached system blocks → scene bundle (entity blocks from working set) → recent in-scene turns → per-turn delta. This produces bounded micro-scene behavior with no scope variance.

The new narrator context is:

1. **Cached system prefix** (stable within a chapter): the campaign brief or session handover, plus light craft notes and mechanical rules. This block changes only at chapter boundaries.
2. **Growing transcript**: every player input and narrator response appended as conversation turns. This grows throughout the chapter and is covered by prompt caching (cache reads on the stable prefix + already-seen turns, cache writes only on new content).
3. **Per-turn mechanical snapshot**: a compact code-owned block appended before each narrator call with current HP, active wounds, tension clock values, inventory changes, and any mechanical state the narrator needs to reference. This replaces entity-block state injection.

The narrator's message array should use Anthropic's prompt caching: mark the system prompt and the stable prefix of the conversation as cacheable. The growing transcript naturally benefits from caching because each new request extends the previous one by only the latest turn pair.

This ticket builds the new message assembly behind a gate. It does not change the current narrator route's default behavior — it provides an alternative context builder that can be activated for the prototype path.

## Key files

- `lib/sf2/narrator/messages.ts` — current message assembly (cache-sensitive system blocks, scene bundle injection, turn history)
- `app/api/sf2/narrator/route.ts` — narrator streaming route
- `lib/sf2/retrieval/working-set.ts` — current bounded memory selection (bypassed in the new path)
- `docs/prompt-composition.md` — documents current narrator context shape

## Acceptance criteria

- [ ] A new message builder function exists that assembles narrator context from: system prompt (brief/handover text) + growing transcript (all prior turns) + per-turn mechanical snapshot.
- [ ] The system prompt is marked as cacheable using Anthropic's prompt caching API.
- [ ] The growing transcript is structured so that previously-seen turns benefit from cache reads on subsequent requests.
- [ ] The per-turn mechanical snapshot includes at minimum: current HP, active wounds, tension clock display values, and recent inventory/equipment changes.
- [ ] The mechanical snapshot is injected as a system or developer message, not as player-visible conversation content.
- [ ] The new message builder does not use scene bundles, working-set retrieval, or entity-block context construction.
- [ ] The new message builder is behind a gate — the current scene-bundle path remains the default.
- [ ] The narrator route can switch between the current message builder and the new one based on the gate.
- [ ] Streaming NDJSON behavior is preserved: the narrator route's streaming protocol, sentinel handling, and response parsing are unchanged.
- [ ] Roll pause/resume behavior is preserved: `request_roll` still pauses the stream, `rollResolution` still resumes it.
- [ ] The message builder handles the first turn correctly (transcript is empty, only the system prompt and brief exist).
- [ ] The message builder handles the character creation conversation correctly (early turns are Q&A between narrator and player, not yet gameplay).
- [ ] The transcript is stored in a format compatible with IndexedDB persistence (so it can be saved/restored with the campaign).
- [ ] Existing replay fixtures continue to work on the current (scene-bundle) path — the gate does not break the default behavior.

## Blocked by

Nothing — this can be built independently of the brief storage format.
