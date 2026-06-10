# Free-Lunch Sentinel (Haiku, Post-Turn, Log-Only)

Status: ready-for-agent
Labels: ready-for-agent
Type: AFK
Area: SF2 / warden / sentinels

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

No free-lunch detector exists in the codebase. Build the detection half first, fail-open, so its precision can be measured before any enforcement (issue 04) is wired to it.

After each committed narrator turn on the prototype path, run a Haiku-class sentinel call that inspects: the player input, the turn's prose, the gate state the turn was issued under (binding tier, whether a roll happened), and the mechanical snapshot deltas.

A **violation** is: decisive information, agreement, or position gained without a roll, a cost, or previously established setup. Operationalize as — the turn contains at least one of (a) an NPC revealing actionable intel the PC did not already have, (b) an NPC capitulating/agreeing under pressure, (c) an irreversible positional gain (access, escape, leverage), AND none of: a resolved roll this turn, a typed-state cost (HP, resource, clock tick, item), or established setup the sentinel can name from the visible context (earned disclosure/trust counts as setup, matching the gate-hardening exception in `lib/sf2/narrator/roll-gates.ts`).

Output a structured verdict: `{ violation: boolean, kind: 'reveal' | 'capitulation' | 'position', evidence: string, setupCited: string | null }`. Log it as a new `free_lunch_flagged` diagnostics kind; surface a per-session free-lunch rate in the session summary. No effect on the narrator, the stream, or the player.

Budget: this is background spend — keep the sentinel prompt small (no full transcript; the turn plus minimal context), within the PRD's background-spend share.

## Acceptance criteria

- [ ] Sentinel runs post-commit per prototype turn on a Haiku-class model; the hot path (TTFT, streaming) is untouched.
- [ ] Verdict schema as specified; logged as `free_lunch_flagged` diagnostics entries.
- [ ] Session summary reports free-lunch rate (violations per narrator turn).
- [ ] Sentinel input is bounded (current turn + gate state + snapshot delta + at most the prior turn), not the growing transcript.
- [ ] Fail-open: sentinel errors are logged and skipped; a turn is never blocked or delayed.
- [ ] Replay fixture `free-lunch-detection`: a decisive reveal with no roll, no cost, and no citable setup is flagged; the same reveal with an earned-disclosure setup is not.
- [ ] A toggle disables the sentinel entirely.

## Blocked by

Nothing (issue 01 sensors are complementary, not required).
