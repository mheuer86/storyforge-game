# Retrospective Correction Channel: Player Flags Wrong Facts Into Pinned Amendments

Status: blocked-by-06
Labels: blocked
Type: AFK
Area: SF2 / chapter close / player surface

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

GM memory works best when the player can read it (Durable Lesson 20) — and correct it. The chat prototype's retrospective would have caught a gender flip in seconds. Make the retrospective the correction channel:

- After the retrospective streams (issue 06), the UI offers a correction affordance: the player can flag a statement and write a free-text correction ("Rix is a woman", "we never met Vasek — that was a rumor").
- Corrections are persisted as **pinned amendments**: typed entries `{ chapterIndex, target: string, correction: string, pinnedAt }` attached to the chapter's handover artifacts.
- Where a correction names a hard fact that exists in typed state (NPC identity pins, inventory, clocks), update the typed pin too — typed state wins conflicts, so the correction must land there, not only in prose.
- The chapter-open path (issue 09) injects pinned amendments into the Narrator's system prefix directly under the handover documents, with explicit precedence language: amendments override anything contradicting them in the documents.
- Corrections are bounded: plain text, no model call required to record them; a small Haiku pass MAY map a correction onto a typed pin (e.g., resolve "Rix" to the NPC id) — fail open to prose-only pinning when mapping is uncertain.

This ticket does not build a general state editor (that is issue 14's player-visible surface); it builds the close-time correction moment, when the player is already reading the GM's memory.

## Acceptance criteria

- [ ] Retrospective UI supports flagging + free-text correction; multiple corrections per close.
- [ ] Corrections persist as typed pinned amendments on the chapter handover artifacts.
- [ ] Corrections that map to typed pins (identity, inventory, clocks) update typed state; ambiguous mappings fall back to prose-only pins with a diagnostic.
- [ ] Next-chapter system prefix includes amendments with override-precedence language.
- [ ] Amendments never enter mid-chapter cached prefixes (cache discipline — they join the prefix only at the chapter boundary).
- [ ] Replay fixture `assertion-pinning`: a gender correction at close produces a typed pin and the next-chapter context contains the override (this is the named gender-flip regression fixture).

## Blocked by

Issue 06 (the retrospective surface).
