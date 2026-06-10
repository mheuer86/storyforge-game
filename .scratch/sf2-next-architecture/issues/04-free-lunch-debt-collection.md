# Free-Lunch Debt Collection (Next-Turn Binding Directive)

Status: blocked-by-03
Labels: blocked
Type: AFK
Area: SF2 / warden / turn compiler

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

Enforcement for sentinel violations — without rewinding visible prose. Streaming means the player has already read the turn by the time the sentinel verdict lands, so the Warden collects **debts** instead of bouncing turns.

When issue 03 flags a violation AND the enforcement condition holds (the turn carried a `hard`/hardened gate that was ignored, OR the density window is below the band floor), record a debt in a typed `debts` ledger: `{ turnIndex, kind, evidence, status: 'due' }`.

The turn compiler injects due debts into the next turn's uncached delta as a binding directive, in gate-style private language: the gain just granted must be paid for this turn — a follow-up roll on the consequence, a concrete cost (resource, clock tick, position), or an antagonist move that exploits how the gain was obtained. The Narrator chooses *which* payment fits the fiction; code verifies one landed (a resolved roll, a typed-state cost, or sentinel-confirmed antagonist move) and marks the debt `paid`, else it stays `due` and re-injects once more with escalated language. After two unpaid turns, log `debt_defaulted` and drop it — never loop forever.

Guards against regressing to SF2 density: debts are only created under the enforcement condition above; at most one debt directive per turn; the density governor's ceiling (issue 02) still suppresses gates when the window is over-rolled, and a debt payment roll counts toward the window.

Ship behind a toggle, default off, until the sentinel's precision is reviewed from issue 03 logs.

## Acceptance criteria

- [ ] Typed debts ledger persisted with campaign state; written only by code.
- [ ] Debts created only when violation + enforcement condition hold; at most one directive injected per turn.
- [ ] Directive language is private, gate-style, and never names the harness ("debt", "sentinel", "free lunch" must not leak into fiction — extend display-sentinel checks).
- [ ] Payment verification marks debts paid; unpaid debts re-inject once, then default with a diagnostic.
- [ ] Debt payment rolls count toward the density window.
- [ ] Replay fixture `free-lunch-debt-paid`: flagged turn → directive injected → roll next turn → debt paid.
- [ ] Replay fixture `free-lunch-debt-defaulted`: two unpaid turns → defaulted, no third injection.
- [ ] Toggle, default off.

## Blocked by

Issue 03 (sentinel verdicts), issue 02 (density window).
