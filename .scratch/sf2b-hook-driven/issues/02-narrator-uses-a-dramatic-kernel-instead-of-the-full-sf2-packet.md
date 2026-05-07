# Narrator Uses a Dramatic Kernel Instead of the Full SF2 Packet

Status: needs-triage
Type: AFK
Area: SF2B / Narrator context

## Parent

`.scratch/sf2b-hook-driven/PRD.md`

## What to build

Replace SF2's current full scene packet emphasis with a compact dramatic kernel for SF2B Narrator calls.

The kernel should give the Narrator enough truth to stay coherent and enough freedom to feel like a GM. It should foreground the hook, immediate dramatic pressure, current scene, recent transcript, player-facing facts, hard-state facts, a few live entities, and a clear prose/tone directive. It should not dump long clue lists, gate machinery, dormant arc telemetry, or pressure-engine internals into the Narrator by default.

## Acceptance criteria

- [ ] SF2B has an explicit `AuthorHookBrief`-style input for the Narrator, or an equivalent compact contract.
- [ ] Narrator context includes immediate situation, dramatic pressure, current scene, recent transcript, PC facts, hard-state facts, live entities, durable constraints, chapter question, and likely close vectors.
- [ ] Narrator context excludes full graph dumps, long clue inventories, gate lists, repeated pressure telemetry, and dormant arc diagnostics unless explicitly needed for the turn.
- [ ] The Narrator contract includes a quality bar comparable to V1: strong genre voice, sensory specificity, organic pacing, and meaningful player agency.
- [ ] Roll requests and mechanical annotations still work without making the prose read like a state renderer.
- [ ] A focused fixture, log snapshot, or instrumentation check shows the SF2B Narrator packet is compact and dramatically framed.

## Blocked by

- [SF2B Experimental Mode Boots a Hook-Driven Chapter](01-sf2b-experimental-mode-boots-a-hook-driven-chapter.md)

## Out of scope

- Removing durable state from SF2B.
- Changing V1 prompt behavior.
- Solving Chapter 2 synthesis; that belongs to the chapter-close ticket.

## Comments

This ticket is the core narrative-quality bet: state remains authoritative, but the Narrator should not feel like it is servicing the state graph line by line.
