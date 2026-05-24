# 16 - Inject Code-Owned Close Advisory And Fact Lock
Status: ready Type: AFK Area: SF2 prose-first prototype / close-loop controller

## Parent

`14-v4d-controller-implementation-ticket-pack.md`

## What to build

Compute a small code-owned chapter-loop advisory for prose-first turns and inject it privately into the narrator context.

The advisory should not decide prose. It should state the current close pressure, any hard boundary, active "never close mid" blockers, and the facts code considers Done / In flight / Not done. The narrator can still make literary decisions, but it cannot count Not done facts as close signals without being repaired by the controller.

Start intentionally simple. The first implementation only needs enough structure to support the proven experiment behavior:

- no-close early in the chapter
- compress toward the chapter-defining decision
- close-candidate or one consolidation beat after decision
- active-revelation deferral
- strict hard boundary after chapter scope has been crossed

## Acceptance criteria

- [ ] Prose-first narrator context includes a private advisory block when the prototype path is enabled.
- [ ] Advisory text includes phase recommendation, required next delta, forbidden repeat, and any hard-boundary instruction.
- [ ] Advisory text includes Done / In flight / Not done facts for the current turn.
- [ ] The `p1` class of bug is covered: if the player is heading to accept/negotiate a job, the advisory marks broker deal, lien clearance, cargo loading, unclamping, and departure as Not done.
- [ ] The `p3` class of bug is covered: if an NPC is present and answering a direct question, the advisory marks close pressure as blocked by active revelation rather than close-now.
- [ ] The advisory is emitted to diagnostics so exports can explain controller decisions.
- [ ] The advisory is private and never appears in player-visible prose.

## Blocked by

- `15-prose-first-chapter-loop-metadata.md`
