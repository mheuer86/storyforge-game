# Tighten EmotionalBeat trigger and retention policy

Status: proposed
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, EmotionalBeat review

## What to build

Tighten `Sf2EmotionalBeat` so it remains sparse retrievable character memory, not a durable mood log. Emotional beats should capture moments the future Narrator needs to remember as character-shaping evidence: confessions, betrayals, breakthroughs, boundaries, accepted costs, and turning points.

The current implementation already has useful constraints: typed emotional tags, participant refs including `pc`, optional anchors, salience, dedupe/merge, one-beat-per-turn cap, validation drift, retrieval scoring, and fixtures for cap/drop behavior. This issue should optimize when beats are written, retained, and surfaced.

## Acceptance criteria

- [ ] Emotional beat capture criteria distinguish durable character-shift moments from routine dialogue, mood, action setup, atmosphere, and thread progress
- [ ] The contract says when a moment belongs as `NPC.tempLoadTag`, thread progress, decision, promise, clue, or no durable write instead of an emotional beat
- [ ] Beat tags remain a closed enum, with any new tags justified by downstream retrieval or cast-behavior use
- [ ] Salience bands have enforcement or calibration beyond prompt text, or the issue explicitly keeps them advisory
- [ ] Retrieval/working-set scoring has a clear retention policy for old beats: recent modulation vs long-lived memory
- [ ] Repeated confession / repeated vulnerability beats dedupe or suppress unless the later beat changes the relationship state
- [ ] Replay fixtures cover routine mood not becoming a beat, a true pivotal beat being retained, and a stale/repeated beat not resurfacing incorrectly

## Blocked by

- 07-consolidate-player-identity-build-and-pc-references.md recommended, because beat participants depend on the stable `pc` reference shape

## Comments

Current implementation already covers:

- `Sf2EmotionalBeatTag` is a closed vocabulary
- `Sf2BeatParticipant` supports canonical entity ids plus literal `pc`
- Archivist guidance says most turns emit zero beats and at most one beat
- `apply-patch.ts` enforces one emotional beat per turn, validates beat shape, and drift-flags dropped beats
- retrieval uses beat salience, participant hits, anchors, and age
- cast packet behavior can use recent beat tags to modulate NPC disclosure/pressure responses
- fixtures cover PC participant resolution, one-per-turn cap, validation drop drift, dedupe/merge, and some downstream cast modulation

Open design questions:

- Should old high-salience beats remain durable forever, or decay into chapter summaries / NPC identity anchors after enough turns?
- Should `salience < 0.5` be rejected in code instead of relying on prompt guidance?
- Should beats require at least one participant, or can an institution/faction-only beat be valid through anchors?
- Should the system create beats from code-owned state-event triggers instead of free Archivist judgment for some tags?

## Agent Brief

**Category:** architecture
**Summary:** Keep EmotionalBeat sparse and useful; avoid durable mood spam.

**Current behavior:** Emotional beats are typed and capped, but creation still relies heavily on Archivist judgment and may over-record routine mood or repeated emotional beats.

**Desired behavior:** Emotional beats are durable only when they change future character behavior, relationship memory, or chapter recall. Routine texture redirects to temp load, thread progress, or no write.

**Key interfaces:** `Sf2EmotionalBeat`, `Sf2EmotionalBeatTag`, `Sf2BeatParticipant`, Archivist prompt/tool schemas, `apply-patch.ts`, `retrieval/working-set.ts`, `retrieval/scene-packet.ts`, `retrieval/packets/cast.ts`, emotional-beat replay fixtures.

**Out of scope:** Replacing emotional beats with a broad event log.
