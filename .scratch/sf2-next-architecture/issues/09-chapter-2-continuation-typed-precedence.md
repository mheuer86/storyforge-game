# Chapter 2+ Continuation: Handover as System Prefix with Typed-State Precedence

Status: blocked-by-06
Labels: blocked
Type: AFK
Area: SF2 / narrator / context assembly

## Parent

`.scratch/sf2-next-architecture/PRD.md`
Supersedes: `.scratch/sf2-prose-first-narrator/issues/05-feed-handover-to-narrator-continuation.md`

## What to build

The architecture's central bet — prose-shaped handover across a real chapter boundary — has never run. Build the chapter 2+ context path and the precedence rules that keep it honest:

- At chapter open (post-ceremony, issue 06), assemble the Narrator system prefix as: protocol blocks → Session Brief → GM Memory → Quick Reference → pinned amendments (issue 07) → compiled craft notes (issue 08). The original campaign brief drops out of the prefix once a Session Brief exists (it is redundant by construction; keep it loadable for cold-fact lookup).
- Transcript resets per chapter; prior chapters live only through the handover documents — the typed mechanical spine is the only other cross-chapter carrier.
- **Precedence (prompt questions 6–7)**: typed state wins all hard facts. The uncached delta's mechanical snapshot carries current HP/resources/inventory/clocks with explicit language: where these contradict the handover documents, the snapshot is true. Identity pins render in the snapshot, not the prefix, when they have changed since compile.
- **Conflict detection**: a code pass at chapter open diffs handover document hard facts (clock values, item possession, alive/dead, names — heuristic extraction) against typed state. Contradictions are logged as `handover_state_conflict` diagnostics and corrected in the prefix via an appended erratum block rather than editing the compiled documents (documents are immutable artifacts; errata are typed).
- Token budget: prefix within the PRD's ~8,800-token measured envelope; log actual prefix size per chapter open.

## Acceptance criteria

- [ ] Chapter 2+ system prefix assembled in the specified order; campaign brief excluded once a Session Brief exists.
- [ ] Transcript starts empty at chapter open; chapter 1 prose is not replayed into context.
- [ ] Snapshot precedence language present; changed identity pins surface in the delta, not the cached prefix.
- [ ] Chapter-open conflict diff produces `handover_state_conflict` diagnostics and a typed erratum block; compiled documents are never mutated.
- [ ] Prefix token size logged; over-budget prefixes flagged.
- [ ] Replay fixture `handover-continuation`: a compiled handover set produces a correct chapter 2 prefix with errata for an injected clock contradiction.
- [ ] A full two-chapter prototype session (manual or scripted runner) reaches chapter 2 with non-empty handover and plays a turn — recorded in Comments with the session export.

## Blocked by

Issues 06 (ceremony artifacts), 07 (amendments), 08 (craft notes).
