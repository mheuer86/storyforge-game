# Kill the Arc Author

Status: ready-for-agent plan
Source: narrative regression review, 2026-05-18

## Thesis

The Arc Author costs a full model call before play has generated any fiction, then commits the campaign to abstract durable forces, arc threads, stance axes, and chapter functions. In recent play it has repeatedly turned hooks into administrative pressure: holds, logs, filings, route permissions, compliance offices, warrants, and release gates.

SF2 still needs authored chapter shape. It does not need a separate live Arc Author call before Chapter 1.

Replace the Arc Author with:

- Chapter Author interpreting the selected hook directly for Chapter 1.
- Structural beat awareness inside the Chapter Author role.
- Chapter Meaning `transitionSeed` plus campaign state carrying coherence across chapters.
- Optional compatibility support for old saves that still contain `campaign.arcPlan`.

## Implementation Principle

Phase 1 makes Arc Author skippable and proves the no-arc path end to end. Keep the old Arc Author endpoint and old-save support until the no-arc path has replay and browser evidence.

Phase 2 deletes the endpoint and type surface after validation.

## Global Read Order

1. `CLAUDE.md`
2. `CONTEXT.md`
3. `docs/storyforge-2-design.md`
4. `docs/prompt-composition.md`
5. `lib/sf2/author/prompt.ts`
6. `lib/sf2/author/contract.ts`
7. `app/api/sf2/author/route.ts`
8. `components/sf2/play-app.tsx`
9. `lib/sf2/narrator/prompt/situation.ts`
10. `lib/sf2/retrieval/packets/chapter.ts`
11. `lib/sf2/structural-beats.ts`
12. Existing fixtures under `fixtures/sf2/replay/author-*` and narrator prompt surface fixtures.

## Tickets

| # | Title | Phase | Status | Blocked by | Purpose |
|---|---|---|---|---|---|
| 01 | Author hookDirect mode for Ch1 | 1 | ready-for-agent | None | Author can create Chapter 1 when `campaign.arcPlan` is absent. |
| 02 | Structural beats into Author role | 1 | ready-for-agent | None | Author gets chapter beat awareness without `chapterFunctionMap`. |
| 03 | Author continuation without arc plan | 1 | ready-for-agent | 01, 02 | Ch2+ Author uses chapter meaning, threads, NPCs, factions, and structural beat, not ArcPlan. |
| 04 | Narrator situation without arc context | 1 | ready-for-agent | 01 | Narrator packets remain strong when no arc context block exists. |
| 05 | play-app skip arc-author call | 1 | ready-for-agent | 01, 03, 04 | `/play` can start directly with Chapter Author and retain an opt-in Arc Author fallback. |
| 06 | Remove Arc Author endpoint and lib | 2 | blocked-by-05 | 05 + validation | Delete endpoint/lib only after the no-arc path is proven. |
| 07 | Clean up arc plan type references | 2 | blocked-by-06 | 06 | Remove/deprecate ArcPlan type references after endpoint deletion. |

## Shared Acceptance Bar

An AFK implementation is not done until it has:

- A focused replay/helper fixture for the exact contract changed.
- No regression to normal SF2 replay fixtures relevant to Author/Narrator startup.
- Old saves with `campaign.arcPlan` still loading or explicitly covered by migration/normalization.
- No accidental streaming behavior change in `components/sf2/play-app.tsx`.
- No deletion of Arc Author endpoint during Phase 1.
- Diagnostics that make it obvious whether a campaign used Arc Author or no-arc direct Author.

## Recommended Verification

Run focused fixtures first, then the broad suite when code changes touch Author/Narrator contracts:

```bash
npm run sf2:replay -- fixtures/sf2/replay/<new-focused-fixture>.json
npm run sf2:replay -- fixtures/sf2/replay
npm run build
```

If lint is attempted and blocked by repository ESLint config, record that explicitly in the implementation note.

## Product Risk

The risk is not that Chapter 1 becomes less planned. The risk is that Ch3-Ch5 lose arc pressure without a precommitted arc plan. The mitigation is structural beat awareness plus Chapter Meaning transition seeds plus campaign state. If those do not carry enough continuity in playthrough evidence, fix the transition/meaning layer rather than reintroducing a planning call that poisons Chapter 1.
