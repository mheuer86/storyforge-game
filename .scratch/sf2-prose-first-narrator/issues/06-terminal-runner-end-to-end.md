# Terminal Runner End-To-End Exercise

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / terminal runner / prototype validation

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

Exercise the full prose-first narrator flow through the SF2 terminal runner as the primary prototype validation harness.

The terminal runner (`.scratch/sf2-tui/`) should be able to:

1. Load a pre-authored brief for a selected genre+hook.
2. Start a narrator session with the brief as system prompt.
3. Present character creation questions and collect answers via terminal input.
4. Run gameplay turns with growing transcript context.
5. Auto-resolve d20 rolls (random or fixed seed for reproducibility).
6. Run the Archivist after each turn to extract UI-equivalent data.
7. Trigger chapter close and run the handover compiler.
8. Export a full artifact bundle: transcript, roll log, handover documents, mechanical state snapshots, and diagnostics.

The terminal runner does not need the browser UI. It is a fast iteration tool for testing whether the brief-driven narrator produces the target narrative quality. The primary output is a transcript artifact that can be compared side-by-side with the Pale Flame and Stryca reference transcripts.

This ticket connects the prose-first narrator work to `.scratch/sf2-tui/` rather than requiring every experiment to go through the browser. The terminal runner should exercise the same narrator route and message assembly as the browser path — it is not a separate implementation.

## Key files

- `.scratch/sf2-tui/` — terminal runner plan and issues
- `app/api/sf2/narrator/route.ts` — narrator streaming route (called by terminal runner)
- `lib/sf2/narrator/messages.ts` — message assembly (the growing transcript builder)

## Acceptance criteria

- [ ] The terminal runner can load a campaign brief by genre+hook key and start a prose-first narrator session.
- [ ] Character creation questions from the brief are presented in the terminal and player answers are collected via stdin.
- [ ] The terminal runner sends turns to the narrator route (or calls the narrator message builder + API client directly) using the growing transcript context builder.
- [ ] Rolls are auto-resolved: when the narrator emits `request_roll`, the terminal runner generates a d20 result (random or from a fixed seed) and sends `rollResolution` to continue the stream.
- [ ] The Archivist runs after each turn to extract structured data (character state, NPC updates, location changes).
- [ ] The terminal runner can trigger chapter close, either after a fixed number of turns, on a command, or when the narrator signals chapter end.
- [ ] The handover compiler runs at chapter close and produces Session Brief, GM Memory, and Quick Reference artifacts.
- [ ] After chapter close, the terminal runner can start Chapter 2 from the handover documents.
- [ ] The terminal runner exports an artifact bundle containing: full transcript, roll log (scene/check/roll/modifier/total/result), all handover documents, and mechanical state at chapter close.
- [ ] The artifact bundle is written to a timestamped directory under a configurable output path.
- [ ] The terminal runner can be invoked with a single command that specifies genre, hook, and optional turn count or seed.
- [ ] Terminal runner docs or command help describe the available options and the expected workflow.
- [ ] The terminal runner uses the same narrator route, message assembly, and Archivist as the browser path — it is not a separate narrator implementation.
- [ ] The terminal runner can run without changing browser `/play` behavior.
- [ ] At least one full chapter run (brief → character creation → 15-20 gameplay turns → chapter close → handover export) is completed and its artifact bundle is available for review.

## Blocked by

- 01-store-campaign-briefs-as-loadable-content.md
- 02-growing-transcript-narrator-context.md
- 03-brief-driven-campaign-start.md
- `.scratch/sf2-tui/issues/01-one-turn-sf2-terminal-runner.md` (base terminal runner must exist)
