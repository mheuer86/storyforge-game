Status: blocked-by-05

# Remove Arc Author endpoint and lib

Phase 2 — execute after Phase 1 validates that hookDirect produces better fiction.

## Scope

Delete:
- `app/api/sf2/arc-author/route.ts` — the API endpoint
- `lib/sf2/arc-author/prompt.ts` — Arc Author prompt construction
- `lib/sf2/arc-author/transform.ts` — response transformation

Review for removal or refactoring:
- `lib/sf2/arc-questions.ts` — latent arc question selection logic. Either delete (questions emerge from chapter-meaning) or refactor into a chapter-level mechanism.

## Dependencies

- #05 must be validated (hookDirect produces better narrative quality)
- All Phase 1 tickets (#01-#04) must be complete
- At least one multi-chapter playthrough without arc plan should confirm chapter-meaning transitions carry arc coherence
