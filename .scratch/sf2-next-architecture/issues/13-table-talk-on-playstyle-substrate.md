# Table Talk: Meta-Channel Persisted as Rulebook Amendments on the Playstyle Substrate

Status: blocked-by-10
Labels: blocked
Type: AFK
Area: SF2 / player surface / playstyle

## Parent

`.scratch/sf2-next-architecture/PRD.md`

## What to build

The chat prototype's biggest engagement mechanism — negotiating campaign-specific rules with the GM — has never been productized (prompt question 20). PRD assumption H: build it on the existing Playstyle substrate (`app/api/sf2/playstyle/route.ts` already synthesizes a campaign rulebook fed to the Narrator) rather than a second rulebook mechanism.

- **Channel**: an explicit table-talk input mode (UI toggle or `/table` prefix). Table-talk turns route to the Narrator with a private directive: respond above-table as the GM — negotiate, propose, push back — no in-fiction prose, no rolls, no clock movement. The existing beat-mode OOC detection (`lib/sf2/beat-mode.ts`) may *suggest* the mode, never silently switch it.
- **Amendments**: when negotiation lands on an agreed rule (a tracker, a progression system, a house rule), the Narrator emits a `table_amendment` proposal in `narrate_turn` (contract v2 field, hence blocked-by-10): `{ title, ruleText, kind: 'tracker' | 'progression' | 'house_rule' }`. Code validates (firewall: narrator proposes, code commits) and appends it to a player-visible campaign rulebook stored with the campaign.
- **Cache discipline**: committed amendments render in the uncached delta for the rest of the current chapter and join the cached system prefix at the next chapter boundary (same rule as issue 07 pins).
- **Scarcity guard**: amendments cannot create model-owned scarcity — a proposed tracker that mints resources or skips rolls gets a typed representation (a real clock/counter in typed state) or is rejected with an above-table explanation. The Warden's gates and the density governor apply to post-amendment play unchanged.
- Table-talk turns are excluded from roll-density windows, close-loop dwell counters, and free-lunch inspection.

## Acceptance criteria

- [ ] Table-talk mode exists and is player-initiated; OOC detection only suggests it.
- [ ] Above-table turns produce no fiction prose, rolls, clock ticks, or transcript-as-fiction entries (stored as a distinct entry kind).
- [ ] `table_amendment` proposals validate through the firewall; code commits to a player-visible rulebook.
- [ ] Tracker-kind amendments materialize as typed clocks/counters; scarcity-violating proposals are rejected above-table.
- [ ] Amendments enter the cached prefix only at chapter boundaries.
- [ ] Table-talk turns excluded from density window, close dwell, and free-lunch sentinel.
- [ ] Replay fixture `table-amendment-commit`: a negotiated tracker becomes a typed counter and appears in the next chapter's prefix.

## Blocked by

Issue 10 (the `table_amendment` field belongs to contract v2).
