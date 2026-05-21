# Chapter-Close Handover Compiler

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / chapter close / handover generation

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

At chapter close, run a single model call that compresses the full chapter transcript plus mechanical state into three handover documents: Session Brief, GM Memory, and Quick Reference.

This replaces the current Chapter Meaning synthesis as the primary chapter-close artifact generator. Chapter Meaning produces a short transition seed (~5 structured fields). The handover compiler produces three full documents (~5,000 words total) that carry judgment, craft intelligence, and playable session prep — matching the quality of the Pale Flame reference handovers.

The handover compiler is a separate API route or model call, not part of the narrator. It runs after the narrator's final chapter-close turn and after any existing chapter-close processing (Chapter Meaning can continue to run as a parallel/fallback artifact).

The system prompt for the handover compiler should incorporate the campaign-handover skill's instructions, adapted for the app context. The key sections from the skill:

**Session Brief** (~2,400 words): GM Style (calibrated to this player), Setting (current state), Game System (mechanics reference), Character Sheet (current stats/items/wounds), NPC Roster (with status/agenda/stats), Active Threads, Tension Clocks (with current fill and thresholds), Opening Conditions (for next chapter), Chapter Shape (3-5 structural beats for next chapter).

**GM Memory** (~2,100+ words, growing): Player style (how they think and play), Character interpretation (who they are under the stats), What Worked (craft principles with evidence), What Didn't Work (error log with rules derived), Pacing Notes, Tone Notes, Things To Watch For, Wishes For Future Chapters, Roll Log, Chapter Debrief.

**Quick Reference** (~400 words): Core stats block, Rolls To Reach For, Three Tensions, Active Clocks, What They Carry, What Drives Them, Companion block if applicable.

For Chapter 2+ handovers, the compiler receives the previous GM Memory and appends to it rather than replacing it. The Session Brief and Quick Reference are replaced each chapter.

## Reference materials

The campaign-handover skill is at: `/Users/martin/Downloads/handover_SKILL.md`

Example outputs:
- GM Memory: `/Users/martin/Library/Mobile Documents/com~apple~CloudDocs/pale flame gm memory.md`
- Session Brief: `/Users/martin/Library/Mobile Documents/com~apple~CloudDocs/pale flame ch2 session brief.md`
- Quick Reference: `/Users/martin/Library/Mobile Documents/com~apple~CloudDocs/pale flame luther reference.md`

## Key files

- `lib/sf2/chapter-meaning/*` — current chapter-close synthesis (not replaced, but the handover compiler is the new primary artifact)
- `app/api/sf2/chapter-meaning/route.ts` — current chapter-meaning route
- `components/sf2/play-app.tsx` — chapter transition orchestration

## Acceptance criteria

- [ ] A new API route or model call function exists for the handover compiler.
- [ ] The handover compiler receives: the full chapter transcript (or compacted transcript + mini debriefs if available), current mechanical state, the campaign brief or previous Session Brief, and the previous GM Memory (if Chapter 2+).
- [ ] The compiler's system prompt includes adapted instructions from the campaign-handover skill specifying the three-document structure and section contracts.
- [ ] The compiler produces three distinct documents: Session Brief, GM Memory, and Quick Reference.
- [ ] The Session Brief includes all required sections: GM Style, Setting, Game System, Character Sheet, NPC Roster, Active Threads, Tension Clocks, Opening Conditions, and Chapter Shape.
- [ ] The GM Memory includes all required sections: Player style, Character interpretation, What Worked, What Didn't Work, Pacing Notes, Tone Notes, Things To Watch For, Roll Log, Chapter Debrief.
- [ ] The Quick Reference includes: Core stats, Rolls To Reach For, Three Tensions, Active Clocks, What They Carry, What Drives Them.
- [ ] For Chapter 2+, the GM Memory from the previous chapter is included in context and the compiler appends new observations rather than replacing.
- [ ] The three documents are stored as persistent campaign artifacts in IndexedDB, keyed by chapter number.
- [ ] The documents are accessible via diagnostics/export.
- [ ] The handover compiler fails open: if the model call fails, chapter transition continues without handover documents and falls back to current Chapter Meaning behavior.
- [ ] The compiler does not create canonical state entities — handover documents are prose artifacts, not state patches. Any state referenced in the documents must match the authoritative mechanical state.
- [ ] If handover prose contradicts mechanical state, the divergence is logged as a diagnostic. Mechanical state remains authoritative.
- [ ] The handover compiler runs after the narrator's final chapter-close turn, not during gameplay.
- [ ] Chapter transition latency from the handover compiler is documented. Target: under 30 seconds for the full three-document generation.
- [ ] Mini debrief notes (if available from ticket 02 or future work) are included in the compiler's context to provide pre-digested material.

## Blocked by

- 02-growing-transcript-narrator-context.md (the compiler needs the transcript format)
