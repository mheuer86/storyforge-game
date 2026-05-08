# Trim mechanism-vocabulary list

Status: complete
Category: bug
**Type:** AFK
**Source:** narrative-quality pass, sparring 2026-05-08

## Reconciliation

2026-05-08 status pass: partial. Behavioral enforcement exists through procedure ownership validation and stakes-first prompt guidance, but the literal prompt-copy cleanup may still be worth a narrow pass.

2026-05-08 completion pass: complete. `lib/sf2/author/prompt.ts` now keeps the continuation procedure rule but limits shared mechanism examples to four portable terms (`timer`, `queue`, `gate`, `readout`) and pairs them with four equal-prominence human-leverage examples. Genre-specific mechanism words were removed from the shared worked example; Narrator shared copy was reviewed without weakening procedure-gravity validation.

## What to build

`lib/sf2/author/prompt.ts:328` — continuation chapter rules — contains:

> *"Treat mechanisms as props, not plot: a timer, readout, queue, warrant window, manifest query, route milestone, access gate, or decryption bar may appear only if `procedure_budget` names who uses it and what leverage or irreversible choice it creates."*

Eight mechanism words in a single sentence. Even though the injunction is *negative* (only-if-leverage), the LLM internalizes the vocabulary and reaches for it. After reading this sentence, the Author has a mechanism-heavy palette primed: timer, readout, queue, warrant, manifest, route, gate, decryption.

Two complementary fixes:

**1. Trim the list.** Drop to 3-4 examples max. Keep the genre-portable ones (timer, queue, gate); drop the genre-specific ones — warrant window and manifest query are Hegemony/Compact-Remnant flavored, decryption bar is cyberpunk, route milestone is space-opera.

**2. Pair with a dramatic-equivalent list of equal length.** The same sentence (or the next one) should prime *human leverage* vocabulary at the same prominence:

> *"Mechanisms must serve dramatic leverage, not replace it. Examples of dramatic leverage that don't require a mechanism: a debt a third party will collect, a name spoken in the wrong room, a loyalty the next refusal will break, a witness who saw and is choosing whether to remember."*

Net effect: the mechanism palette shrinks, the dramatic palette is primed at parity. The Author has both vocabularies available; the prompt does not bias it toward mechanisms by sheer word count.

If #01 (genre injection refactor) ships, the mechanism examples should also be split per-genre (Hegemony "warrant" vs Cyberpunk "ICE" vs Noir "case file" vs Space Opera "route chit"). Until then, prefer genre-portable examples in the main rule.

## Acceptance criteria

- [x] Mechanism list at `author/prompt.ts:328` reduced to ≤4 examples.
- [x] A parallel dramatic-leverage list of ≥4 examples added, of equal length and prominence.
- [x] Genre-specific mechanism words (warrant, manifest, decryption bar, route milestone) removed from the main rule unless #01 has migrated them per-genre.
- [x] Replay fixtures updated if `procedure_budget` validation changes. No fixture updates were needed because validation behavior did not change.

## Evidence

- `npm run sf2:replay -- fixtures/sf2/replay/author-continuation-procedure-gravity-rejects-unowned-mechanism.json` — pass, 1/1.
- `npm run sf2:replay -- fixtures/sf2/replay/author-continuation-procedure-gravity-accepts-owned-leverage.json` — pass, 1/1.
- `npm run sf2:replay -- fixtures/sf2/replay` — pass, 164/164.
- `npm run build` — pass.

## Blocked by

None. Coordinates with #01 (per-genre mechanism examples) and #04 (Continuation Move 1 rewrite touches the same paragraph).

## Comments

> *Negative injunctions don't undo vocabulary priming. The LLM uses the words it sees most prominently, regardless of the rule attached to them.*

## Agent Brief

**Category:** bug
**Summary:** Stop mechanism-vocabulary list from saturating the Author's palette.
**Current behavior:** Eight mechanism words listed in a single sentence prime the Author toward mechanism-shaped continuation openings.
**Desired behavior:** ≤4 mechanism examples paired with ≥4 dramatic-leverage examples; net palette is balanced.
**Key interfaces:** `lib/sf2/author/prompt.ts` `continuation_dramatic_turn` rules.
**Acceptance criteria:** Issue checklist; verify continuation chapter fixtures still pass.
**Out of scope:** Removing the mechanism rule entirely (`procedure_budget` still load-bearing for genuine procedure-as-leverage cases).
