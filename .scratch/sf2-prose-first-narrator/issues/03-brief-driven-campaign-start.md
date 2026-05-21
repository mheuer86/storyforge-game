# Brief-Driven Campaign Start

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / campaign start / narrator integration

## Parent

`.scratch/sf2-prose-first-narrator/PRD.md`

## What to build

Build a separate `/play/prototype` route with a minimal selector UI and the prose-first narrator flow. This avoids modifying the existing `/play` play-app.tsx orchestration. If the prototype proves out, the architecture migrates to the main route; if not, the route is deleted cleanly.

The route has two views:

**Selector view**: shows the available campaign briefs as cards (title, one-line premise, tone reference). Player picks one. No setup wizard, no origin/playbook/species menus — the brief IS the full setup.

**Play view**: a lightweight play component that reuses the existing play shell for rendering (three-column UI, streaming prose, roll pauses) but owns its own orchestration:

1. Player selects a brief from the selector.
2. The brief loader (ticket 01) retrieves the full brief text.
3. Initialize the narrator with the brief as its system prompt using the growing transcript context builder (ticket 02).
4. The narrator's first response follows the brief's own instructions — it asks the character creation questions embedded in the brief (typically 5 questions).
5. The player answers each question as a normal conversation turn.
6. After the questions, the narrator assigns stats, transitions into the opening scene, and normal gameplay begins.

No Arc Author. No Chapter Author. No setup wizard. No gates or fallback logic — this route only knows the brief-driven flow.

The character creation conversation is not a separate system — it is the first turns of the growing transcript. The narrator reads the brief's character creation section and follows its instructions naturally. The brief already contains the questions, the stat array, and the instruction to assign stats based on answers.

The stat assignment and mechanical initialization (HP, starting equipment, clock values) that currently happen in code during setup need to be deferred until after the narrator has processed the character creation answers. This may require the narrator to emit a structured tool call or annotation with the character's mechanical state, or it may require a post-creation Archivist call to extract the mechanical setup from the conversation.

### Archivist integration

The Archivist runs after every narrator turn to extract structured data for the play shell's side panels (character stats, NPC list, location, inventory, etc.). It operates the same as in current SF2 — receiving the narrator's latest output and producing state patches — but it is not the narrator's memory layer. The narrator's memory is the growing transcript; the Archivist only feeds the UI.

Wire the Archivist call into the prototype's turn orchestration from the start so the three-column play shell has data to display.

### Diagnostics panel

The prototype includes a collapsible diagnostics panel (similar to the current SF2 diagnostics export) showing:

- The campaign brief that was loaded
- The full growing transcript as the narrator receives it
- Per-turn mechanical snapshots
- Archivist extraction output per turn
- Handover documents when produced (tickets 04-05)

This is critical for evaluating the prototype — without seeing what the narrator saw, quality issues cannot be diagnosed. Reuse the existing diagnostics export pattern where possible.

## Key files

- `app/play/prototype/page.tsx` — new route (to be created)
- `components/sf2/play-shell.tsx` — existing play shell to reuse for rendering
- `lib/sf2/narrator/messages.ts` — narrator context assembly (the new growing transcript builder from ticket 02)
- `app/api/sf2/narrator/route.ts` — narrator streaming route (reused, not modified)
- `lib/sf2/persistence/indexeddb.ts` — campaign persistence (reused for saving prototype campaigns)

## Acceptance criteria

- [ ] A `/play/prototype` route exists with a selector view showing all available campaign briefs.
- [ ] Each brief card displays the campaign title, one-line premise, and tone reference.
- [ ] Selecting a brief starts a new campaign with the narrator immediately — no intermediate screens.
- [ ] The narrator receives the full brief as its cached system prompt.
- [ ] The narrator's first response begins character creation by asking the brief's embedded questions.
- [ ] Player answers are appended to the growing transcript as normal conversation turns.
- [ ] After character creation, the narrator transitions into the opening scene as described in the brief.
- [ ] Mechanical initialization (stats, HP, starting equipment, clock values) is derived from the character creation conversation and persisted to campaign state.
- [ ] The method for extracting mechanical state from the character creation conversation is explicit: either narrator tool calls, a post-creation Archivist pass, or a structured annotation.
- [ ] Campaign state after character creation includes: character name, stat assignments, HP, starting equipment/items from the brief, and initial tension clock values from the brief.
- [ ] The character creation turns are part of the persistent transcript — they are not discarded after setup.
- [ ] The growing transcript includes both the character creation Q&A and subsequent gameplay turns as a continuous conversation.
- [ ] Streaming NDJSON behavior works correctly from the first narrator response (character creation question).
- [ ] Roll pause/resume works correctly during gameplay turns.
- [ ] The play view reuses the existing play shell rendering (three-column layout, prose panel, roll UI) but does not depend on play-app.tsx orchestration.
- [ ] Campaign start latency is under 5 seconds (time to first narrator token).
- [ ] Prototype campaigns are persisted to IndexedDB and can be resumed.
- [ ] The Archivist runs after every narrator turn to extract structured data for the play shell's side panels.
- [ ] The Archivist's output populates the play shell's character, NPC, location, and inventory panels.
- [ ] A collapsible diagnostics panel shows: loaded brief, full growing transcript, per-turn mechanical snapshots, and Archivist output.
- [ ] The diagnostics panel is accessible during play without disrupting the game surface.
- [ ] The existing `/play` route is completely unmodified — no gates, no fallbacks, no shared state.

## Blocked by

- 01-store-campaign-briefs-as-loadable-content.md
- 02-growing-transcript-narrator-context.md
