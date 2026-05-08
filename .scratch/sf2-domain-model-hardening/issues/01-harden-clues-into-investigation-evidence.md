# Harden clues into investigation evidence

Status: verified-built
Labels: needs-triage
Category: architecture
**Type:** HITL -> AFK
**Source:** SF2 domain model conversation, clue spam examples

## Reconciliation

2026-05-08 status pass: verified built. Evidence: Archivist tool/prompt now define clues as investigation evidence with `evidence_question`, `evidence_kind`, and optional `resolution_mode: "investigation"` anchors; apply-patch rejects ambient scene/body-language/operational texture and requires an investigation thread or explicit evidence question. Fixtures `clue-spam-routine-presence-rejected.json` and `investigation-evidence-clue-created.json` passed in the full SF2 replay suite.

## What to build

Tighten the `Sf2Clue` contract so clues represent investigation evidence, not general compressed world facts or present-moment observations. Non-clue facts should be redirected to existing entities: thread progress events, temporal anchors, NPC/faction updates, documents, scene state, or no durable write.

The intended behavior is that examples like "Maret Coll is present at the fuel desk" are not automatically clues. They become NPC/location/scene state, unless an investigative thread makes the observation evidentiary.

## Acceptance criteria

- [ ] The clue contract distinguishes an evidentiary claim from ambient scene texture or operational pressure
- [ ] Archivist prompt/tool guidance blocks creating clues for body language, atmosphere, routine presence, and small operational state unless tied to an investigation
- [ ] If a thread-level investigation marker is introduced, clue creation requires that marker or a clear evidence anchor
- [ ] Existing clue retrieval still surfaces investigation material in the Narrator scene packet
- [ ] A replay fixture covers a turn that previously created clue spam and now produces no clue or a more appropriate write
- [ ] A replay fixture covers a real investigation clue and verifies it is still created/anchored

## Blocked by

None - can start immediately

## Comments

Open design decision: whether to add `Thread.resolutionMode = "investigation"` in this slice, or first enforce sharper Archivist prompt/tool rules without changing Thread.

## Agent Brief

**Category:** architecture
**Summary:** Stop using `clue` as a general memory bucket.

**Current behavior:** Clues accept broad `content` and optional anchors, so the Archivist can record tiny world facts as clues.

**Desired behavior:** Clues represent evidence toward an investigation question. Other observations land in existing state surfaces or are not persisted.

**Key interfaces:** `Sf2Clue`, `archivist/tools.ts`, `archivist/prompt.ts`, `apply-patch.ts`, `retrieval/working-set.ts`, `retrieval/packets/tensions.ts`.

**Out of scope:** Adding a broad `Fact` entity.
