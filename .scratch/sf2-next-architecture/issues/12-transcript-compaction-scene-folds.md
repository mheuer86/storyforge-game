# Transcript Compaction via Scene Folds + Cache Pause Story

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / narrator / context assembly / caching

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

The growing transcript is the prototype's memory between handovers, and it grows without bound (~600–800 tokens/turn, ~20k by turn 30 — measured envelope in the PRD). Two pieces:

**Scene folds.** When the in-chapter transcript exceeds a budget (start at 24k tokens, configurable), fold the oldest *closed* scenes: a Narrator-authored scene summary (one bounded call at scene close, or batched at fold time) replaces that scene's turn pairs in the assembled context. Folds are prose, written in the Narrator's own voice, stored alongside the transcript — the raw turns remain persisted for replay/rendering; only the model context compacts. Never fold the current scene or the most recent prior scene. Fold boundaries must respect the cache layout in `lib/sf2/narrator/messages.ts` (folds change the cached transcript prefix — a fold invalidates that prefix once, then re-caches; never fold mid-turn-pair).

**Pause story.** Adopt the PRD position: accept 5-minute ephemeral TTL misses; no keepalive pings. Make the cost observable instead of hidden: log cache-read vs fresh-input per narrator call (exists in latency instrumentation) and add a session-summary line estimating cost attributable to TTL misses, so the accept-misses position stays evidence-backed.

## Acceptance criteria

- [ ] Token-budget trigger folds oldest closed scenes into Narrator-voice summaries; current and most recent scenes never fold.
- [ ] Raw turns remain persisted and renderable; only assembled model context compacts.
- [ ] Fold-induced cache invalidation happens at most once per fold; layout breakpoints remain valid (no mid-pair splits).
- [ ] Replay fixture `transcript-fold`: an over-budget transcript assembles with folds, correct ordering, and intact current-scene turn pairs.
- [ ] Replay fixture `fold-cache-layout`: post-fold message assembly preserves the four-breakpoint layout.
- [ ] Session summary reports estimated TTL-miss cost share; no keepalive mechanism is added.
- [ ] Fold summaries are excluded from texture-survival sampling inputs only if marked — folds must carry forward at least sensory/relationship texture lines, per fold-prompt instruction (texture survives compaction, not just facts).

## Blocked by

Nothing (composes with issue 09 but chapter 1 sessions already need it).
