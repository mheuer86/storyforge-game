Status: needs-triage
Type: AFK

# Restrict Clues To Investigation Evidence

## What to build

Tighten the Archivist clue contract so clues are emitted only for real investigation evidence. Pressure chapters, operational facts, body language, routine state changes, and continuity facts should not become clues unless they answer or materially advance an investigation question.

Validation should remain a backstop: if the Archivist proposes a non-investigation clue, code should reject or quarantine it instead of letting the clue table become a general-purpose fact bucket.

## Acceptance criteria

- [ ] Archivist prompt/tool guidance no longer asks for clues for generic operational facts, access/movement status, routine diagnostics, or pressure-only state.
- [ ] Clue proposals require an investigation thread/question or equivalent explicit evidence context.
- [ ] Validator rejects or quarantines clue proposals that are not investigation evidence, with diagnostics explaining the rejection.
- [ ] A focused replay fixture using the recent playthrough shape produces no clue flood for pressure-only threads.
- [ ] Existing valid investigation clue fixtures still pass.

## Blocked by

None - can start immediately.

