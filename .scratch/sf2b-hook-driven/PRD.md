# PRD: SF2B Hook-Driven Narrative Spike

Status: needs-triage

## Context

This backlog captures the next Storyforge 2 experiment after comparing the "Fourty Thousand" Chapter 1 playthroughs in V1 and V2.

The playthrough review found a sharp product split:

- **V1** delivered much stronger prose, pacing, hook uptake, and organic scene movement, despite weak state structure.
- **SF2/V2** kept more explicit state machinery, but the machinery became player-visible through procedural pacing, repeated gate waiting, mechanical prose, and context packets that made the Narrator feel like a renderer instead of a GM.

The working hypothesis is that SF2's durable state architecture is still directionally valuable, especially across chapters, but its current Narrator constraints harm chapter-level narrative quality. The next slice should test a stricter-state, looser-narrator architecture before rewriting current SF2.

## Product Bet

Create **SF2B** as a parallel, reversible experimental pipeline:

- keep current V1 and SF2 intact as baselines
- reuse shared UI, persistence, types, and hard-state primitives where practical
- isolate the Author/Narrator/Archivist context shape enough to evaluate the hook-driven architecture honestly
- test with a Space Opera / Human Driftrunner / Forty Thousand-style Chapter 1 and a Chapter 2 opener

SF2B should prove that structured durable state can improve cross-chapter coherence without making the in-chapter narration feel procedural.

## Goals

- Recover V1-level narrative quality: prose, pacing, voice, hook uptake, and player agency.
- Improve on V1's durable state failures: money/debt math, entity duplication, stale facts, promise/thread drift, and cross-chapter continuity.
- Keep structure mostly invisible during play.
- Replace rigid within-chapter gate machinery with hook-driven dramatic pressure and code-owned hard-state guardrails.
- Generate a Chapter 2 hook from a meaning digest of what happened, not from a raw transcript or bloated state graph.
- Create an A/B evaluation gate that can kill, iterate, or promote the shape with evidence.

## Non-Goals

- No rewrite of current SF2 in place before the spike proves itself.
- No broad UI redesign.
- No migration of existing saves into SF2B unless a later decision explicitly promotes the experiment.
- No expansion beyond Space Opera / Human Driftrunner for the first playable slice.
- No attempt to solve all SF2 reliability issues through prompt rules alone.

## Evaluation Gate

SF2B is worth continuing only if the evaluated playthrough answers "yes" to the important product questions:

1. Would a blind reader prefer SF2B Chapter 1 over the V1 Chapter 1 on prose, pacing, and hook uptake?
2. Did SF2B keep materially cleaner hard and durable state than V1?
3. Did SF2B's Chapter 2 opener feel like an organic consequence of Chapter 1?
4. Did the structure disappear during play, rather than feeling like a diagnostics panel?

If SF2B fails questions 1 or 4, the structure is still too visible. If it passes 1 and 4 but fails 2 or 3, the extraction and durable state layer is too weak.

## Tickets

1. [SF2B Experimental Mode Boots a Hook-Driven Chapter](issues/01-sf2b-experimental-mode-boots-a-hook-driven-chapter.md)
2. [Narrator Uses a Dramatic Kernel Instead of the Full SF2 Packet](issues/02-narrator-uses-a-dramatic-kernel-instead-of-the-full-sf2-packet.md)
3. [Roll Consequences Separate Observed Facts from Failed Interpretations](issues/03-roll-consequences-separate-observed-facts-from-failed-interpretations.md)
4. [Code Owns Hard State and Repeated-Beat Escalation](issues/04-code-owns-hard-state-and-repeated-beat-escalation.md)
5. [Archivist Extracts Durable Meaning Without Bloated Scene Packets](issues/05-archivist-extracts-durable-meaning-without-bloated-scene-packets.md)
6. [Chapter Close Produces a Meaning Digest and Chapter 2 Hook](issues/06-chapter-close-produces-a-meaning-digest-and-chapter-2-hook.md)
7. [Forty Thousand A/B Evaluation Harness](issues/07-forty-thousand-ab-evaluation-harness.md)
8. [Decide Promote, Iterate, or Kill SF2B](issues/08-decide-promote-iterate-or-kill-sf2b.md)

## Suggested Order

Start with the isolated SF2B mode, then build the Narrator kernel and roll-consequence contract. Bring hard-state guardrails in before the Archivist so extracted state is anchored against deterministic facts. Chapter 2 synthesis comes after durable meaning exists. The A/B harness and human decision gate close the spike.

## Notes

This backlog intentionally treats current SF2 as evidence and baseline, not as something to overwrite immediately. The implementation should be thin and reversible until the evaluation gate shows that the hook-driven architecture pays off.
