# Feed Handover To Narrator For Chapter 2+

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / narrator / chapter transition

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

Use the handover documents from the previous chapter as the narrator's opening context for Chapter 2+, replacing the Chapter Author synthesis pass.

When a chapter closes and valid handover documents exist (ticket 04), the next chapter begins by loading the Session Brief as the narrator's system prompt, the GM Memory as additional cached context, and the Quick Reference as a compact mechanical reference. The narrator's first response in the new chapter follows the Session Brief's Opening Conditions and Chapter Shape — it opens the next chapter directly, without waiting for a Chapter Author to invent a new setup.

The growing transcript resets at chapter boundaries. Chapter 2 starts with a fresh transcript containing only the narrator's opening and the player's first response. The handover documents carry all cross-chapter continuity.

The old Chapter Author path remains as fallback when handover documents are missing or the gate is disabled.

## Key files

- `components/sf2/play-app.tsx` — chapter transition orchestration, Author calls
- `lib/sf2/author/*` — Chapter Author (bypassed when handover exists)
- `lib/sf2/narrator/messages.ts` — narrator context assembly
- `lib/sf2/persistence/indexeddb.ts` — campaign state and artifact storage

## Acceptance criteria

- [ ] A gate controls whether Chapter 2+ can use handover-driven opening.
- [ ] When the gate is enabled and valid handover documents exist for the closing chapter, the next chapter skips Chapter Author entirely.
- [ ] The narrator's system prompt for Chapter 2+ is the Session Brief from the handover compiler.
- [ ] The GM Memory is included as additional context in the narrator's cached prefix.
- [ ] The Quick Reference is included as a compact mechanical reference block.
- [ ] The narrator's first response in the new chapter follows the Session Brief's Opening Conditions section.
- [ ] The growing transcript resets at chapter boundaries — Chapter 2 starts fresh with no carry-over turns.
- [ ] Cross-chapter continuity is carried entirely by the handover documents, not by transcript history.
- [ ] The GM Memory from Chapter 1 persists and is available to the Chapter 2 handover compiler (for appending, not replacing).
- [ ] Chapter 2+ narrator context includes the Session Brief's Chapter Shape beats as private GM guidance (not player-visible).
- [ ] The narrator does not quote handover documents as documents in player-facing prose — they are private GM prep.
- [ ] If handover documents are missing, invalid, or the gate is disabled, the current Chapter Author transition path runs without error.
- [ ] Chapter 2+ start latency on the handover path is under 5 seconds (time to first narrator token).
- [ ] Diagnostics record which path opened the chapter (handover-driven vs Author-driven) and the handover documents used.
- [ ] Save/restore correctly handles campaigns with mixed chapter types (some opened via handover, some via Author).

## Blocked by

- 04-chapter-close-handover-compiler.md
