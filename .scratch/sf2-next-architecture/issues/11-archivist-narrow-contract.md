# Archivist Narrow Contract: Hard-Fact Pinning and UI Extraction Only

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / archivist

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

PRD assumption A: the Archivist stays per-turn on Haiku but its contract narrows — it pins hard facts and feeds UI chips; it is explicitly not the Narrator's memory layer (handover documents are). Narrow the prototype-path Archivist to extract only:

- **Identity pins**: NPC name/gender/role/alive-dead on first establishment and on change. Pins are write-once-then-explicit-transition: a pin can only flip via an extraction that cites the contradicting prose span, otherwise the write is rejected (this is the gender-flip defense at the persistence boundary).
- **Mechanical facts**: clock creation/ticks asserted in prose, item gains/losses, location entry — each idempotent: re-extracting the same turn produces zero net writes (the compounding-drink defense).
- **UI surface data**: present cast, current location, active clocks for the side panels.

Drop from the prototype-path contract: thread/arc/pressure/beat extraction, pacing classification — prose memory owns texture now. Keep validation/partial-accept and the actor firewall write-set in sync with the narrowed contract (`lib/sf2/firewall/actor.ts`).

Input sizing: the route cap is 32,000 chars (`app/api/sf2/archivist/route.ts:31`); pin it against real prose-first output lengths so the old 8,000-char failure class cannot recur.

## Acceptance criteria

- [ ] Prototype-path Archivist extraction schema reduced to pins + mechanical facts + UI data; firewall write-set updated to match.
- [ ] Identity pins reject flips that do not cite contradicting prose; rejections logged.
- [ ] Replay fixture `assertion-pinning-extraction`: an uncited gender flip is rejected; a cited transition is accepted (complements issue 07's close-time fixture).
- [ ] Replay fixture `delta-idempotency`: re-running extraction over the same turn produces zero net writes; a resource cost applies exactly once (the compounding drink bug, named regression).
- [ ] Replay fixture `archivist-input-sizing`: extraction succeeds on a real ≥ 10,000-char prototype turn; the 32k cap is asserted in the fixture (named regression).
- [ ] Archivist remains Haiku; per-session archivist spend share visible in the session summary (background-spend budget).
- [ ] SF2 main-path Archivist behavior unchanged.

## Blocked by

Nothing.
