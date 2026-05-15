# Prompt Surface Inventory And Parity Audit

Issue: `06-prompt-surface-inventory-and-parity-audit`
Date: 2026-05-15
Scope: audit only. No source prompt, tool, schema, or runtime behavior changes.

## Executive Summary

SF2 has not merely copied V1 prompt rules into larger prompts. It has split V1's single-GM contract across role prompts, dynamic scene packets, tool schemas, validators, replayable deterministic helpers, and post-turn extraction. The largest SF2 prompt text is often load-bearing because it encodes role ownership and known failure containment, not decorative prose.

The main safe implementation move for ticket 08 is structural extraction of the Narrator prompt into modules with byte-for-byte content preservation and the same cache placement:

- keep `SF2_CORE`, genre bible, role, and situation cache boundaries intact;
- keep all per-turn and recovery/coherence/roll-gate/intent blocks out of cached constants;
- extract Narrator role subsections into named constants/functions without shortening or reordering until human decisions below are resolved.

High-value human decisions before prompt edits:

- whether SF2 should restore V1 origin/social modifier language beyond current playbook/proficiency preference;
- whether V1's roll drought / momentum trap should become an SF2 diagnostic rather than prompt prose;
- whether duplicated fail-forward and hidden-cognition bans should stay duplicated as defense-in-depth;
- whether genre examples should move into a Genre Narrative Profile Module.

## Prompt Surface Map

| Surface | Role | Placement | Caller / flow | Output authority | Main categories | Notes |
|---|---|---:|---|---|---|---|
| `lib/sf2/narrator/prompt.ts` | Narrator | cached system BP2 (`CORE` + bible + role), cached chapter system BP3 (`SITUATION`) | `buildNarratorTurnContext` | prose, `request_roll`, `narrate_turn` mechanical effects + annotation only | `contract_rule`, `behavior_rule`, `craft_rule`, `bug_scar`, `example`, `duplicate`, `genre_profile_candidate` | Highest-risk prompt surface. Includes role firewalls, PC POV, fail-forward, establishment/continuation, chapter close, suggested actions, genre bibles. |
| `lib/sf2/narrator/messages.ts` | Narrator | cached scene bundle message, dynamic current-turn user message, BP4 cache marker | `buildMessagesForNarrator` | message assembly only | `contract_rule`, `behavior_rule`, `bug_scar`, `duplicate`, `code_owned_candidate` | Owns scene-bounded conversation, role alias lookup, playbook preference, location continuity guard, recovery/coherence notes. Cache-marker strategy is load-bearing. |
| `lib/sf2/narrator/turn-context.ts` | Narrator | system block assembly, cached tool array, roll-resume tool result | API route / narrator call | call context and diagnostics | `contract_rule`, `behavior_rule`, `duplicate`, `code_owned_candidate` | Builds roll-resume text, failed-roll pressure manifestation, sentinel context. |
| `lib/sf2/narrator/roll-gates.ts` | Narrator | dynamic per-turn private block | `messages.ts` / intent queue | required roll advisories | `contract_rule`, `behavior_rule`, `code_owned_candidate`, `duplicate` | Replaces much of V1 ROLL GATE dynamic warning with deterministic heuristics plus mandatory per-turn block. |
| `lib/sf2/narrator/intent-queue.ts` | Narrator | dynamic per-turn / roll-resume private block | `turn-context.ts` | ordered action resolution contract | `contract_rule`, `behavior_rule`, `code_owned_candidate` | Preserves sequential actions and stop-at-first-roll behavior. |
| `lib/sf2/narrator/tools.ts` | Narrator | cached tool/schema contract, last tool cache marker | `buildCachedNarratorTools` | only roll request and compact turn annotation | `contract_rule`, `duplicate` | Critical role firewall: no durable narrative-state writes. Suggested-action grounding duplicated with role prompt. |
| `lib/sf2/author/prompt.ts` | Author | cached system core/role, dynamic/chapter setup situation | Author chapter setup API path | `author_chapter_setup` only | `contract_rule`, `behavior_rule`, `bug_scar`, `example`, `code_owned_candidate`, `duplicate` | Strongest source for chapter pressure, ladder discipline, continuation law, human stakes. Many bug scars are now validator-backed. |
| `lib/sf2/author/retry.ts` | Author repair | retry/repair prompt | validation retry path | repair only | `contract_rule`, `bug_scar`, `duplicate`, `code_owned_candidate` | Narrow corrective retry for scene-coupled triggers, outcome human anchors, continuation, procedure leverage. |
| `lib/sf2/author/tools.ts` | Author | cached tool/schema contract | Author call | chapter setup schema | `contract_rule`, `duplicate`, `code_owned_candidate` | Huge schema encodes many role rules as field contracts and descriptions. |
| `lib/sf2/archivist/prompt.ts` | Archivist | cached BP2 core/role, cached BP3 chapter situation, dynamic BP4 turn message | Archivist extraction call | `extract_turn` narrative-state writes | `contract_rule`, `bug_scar`, `duplicate`, `code_owned_candidate` | Owns memory graph, confidence, coherence findings, anchors, ladder fires, documents, temporal anchors. |
| `lib/sf2/archivist/tools.ts` | Archivist | cached tool/schema contract | Archivist call | extraction schema | `contract_rule`, `duplicate`, `code_owned_candidate` | Tool descriptions are a second contract for anchor, clue, document, procedure, pressure-event shape. |
| `lib/sf2/arc-author/prompt.ts` | Arc Author | cached core/role, dynamic seed situation | Arc setup call | `author_arc_setup` | `contract_rule`, `craft_rule`, `example`, `genre_profile_candidate` | Converts V1 hook into replayable arc pressure; human-pressure pass replaces many V1 broad arc/thread prompt rules. |
| `lib/sf2/chapter-meaning/prompt.ts` | Retrospective Author | role prompt + dynamic chapter digest | chapter close / transition synthesis | `synthesize_chapter_meaning` | `contract_rule`, `craft_rule`, `code_owned_candidate` | Retrospective counterpart to Author. Preserves chapter meaning and transition seed, not plot recap. |
| `lib/sf2/prompt/compose.ts` | All SF2 roles | cache composer | role prompt builders | cache discipline | `contract_rule`, `code_owned_candidate` | Load-bearing Anthropic cache discipline and dynamic leak assertions. Do not alter in ticket 08. |
| `lib/sf2/retrieval/scene-packet.ts` | Narrator packet | cached scene bundle + uncached per-turn delta | `messages.ts` | dynamic state/advisory text | `contract_rule`, `behavior_rule`, `duplicate`, `code_owned_candidate` | Replaces V1 compressed state with bounded scene packet plus current mutable state. Includes present NPC authority, withheld facts, revelation progress, procedure packets. |
| `lib/sf2/genre-examples.ts` | Author/Narrator examples | interpolated into cached role/retry prompts | Author and Narrator prompt builders | examples only | `example`, `genre_profile_candidate`, `bug_scar` | Good candidate for Genre Narrative Profile Module, but currently also supplies validator repair examples. |
| `lib/system-prompt.ts` | V1 GM, audit, close, setup, extraction | cached core/situation, dynamic state message, special prompts | V1 route | V1 prose + `commit_turn`; audit/close/setup tools | `contract_rule`, `behavior_rule`, `craft_rule`, `bug_scar`, `lost_v1_load_bearing_rule` source | Comparison source. V1 combines Narrator, Referee, World Custodian in one surface. |
| `docs/prompt-composition.md` | V1 documentation | docs only | agents/humans | none | `contract_rule`, `example` | Authoritative explanation of V1 cache/state split and special prompts; some doc details predate source changes. |
| `lib/tools.ts` | V1 tool schemas | cached tools | V1 route | `commit_turn` and special tools | `contract_rule`, `duplicate` | V1 tool descriptions enforce suggested actions, pending checks, narrative state writes, chapter close, origin events. |
| `lib/tool-processor.ts` | V1 state application | code, not prompt | V1 route after tools | authoritative state mutations | `code_owned_candidate`, `intentionally_replaced_v1_rule` | Important for parity because some V1 prompt duties were already code-owned. |
| `lib/genre-config.ts` | V1 genre barrel | source data | imports | none | `contract_rule` (indirect) | Re-export only; real content is in `lib/genres/*`. |
| `lib/genres/*` | V1/shared genre data | injected into prompts and setup | V1 and shared setup | genre content, hooks, lore, classes | `craft_rule`, `example`, `genre_profile_candidate` | Shared genre identity. Do not normalize into SF2 generic voice. |
| `lib/sf2b/narrator-role.ts`, `lib/sf2b/narrator-kernel.ts` | Optional | absent | n/a | n/a | n/a | Not present in this checkout. |

## Cost Baseline

Token estimates use the rough project convention of 0.25 tokens per character for prompt text. This is a first-signal baseline, not billing truth. Runtime dynamic packet sizes vary by campaign state.

| Surface | Lines | Chars | Est tokens | Likely cache/dynamic class | Per-turn cost note |
|---|---:|---:|---:|---|---|
| `lib/sf2/narrator/prompt.ts` | 716 | 63,065 | ~15,766 | cached BP2/BP3 | Large, but mostly cached. Situation changes by chapter. |
| `lib/sf2/narrator/messages.ts` | 234 | 10,813 | ~2,703 | mixed, mostly dynamic assembly | Per-turn text generated here includes scene bundle/delta/private notes. |
| `lib/sf2/narrator/turn-context.ts` | 367 | 13,730 | ~3,433 | assembly + roll-resume dynamic | Roll-result text only on roll resume. |
| `lib/sf2/narrator/roll-gates.ts` | 277 | 13,131 | ~3,283 | code + small dynamic block | Dynamic only when a gate is detected. |
| `lib/sf2/narrator/intent-queue.ts` | 114 | 5,415 | ~1,354 | code + small dynamic block | Dynamic only for multi-intent inputs. |
| `lib/sf2/narrator/tools.ts` | 150 | 8,367 | ~2,092 | cached tools | Stable per Narrator call. |
| `lib/sf2/author/prompt.ts` | 492 | 45,462 | ~11,366 | cached role + dynamic setup context | Author not every turn. |
| `lib/sf2/author/retry.ts` | 67 | 5,908 | ~1,477 | retry only | Only after validator failure. |
| `lib/sf2/author/tools.ts` | 791 | 28,678 | ~7,170 | cached tools | Large schema, not player turn. |
| `lib/sf2/archivist/prompt.ts` | 756 | 55,250 | ~13,813 | cached role/situation + dynamic turn message | Runs post-turn; dynamic registry can be sizable. |
| `lib/sf2/archivist/tools.ts` | 444 | 27,548 | ~6,887 | cached tools | Large schema, post-turn. |
| `lib/sf2/arc-author/prompt.ts` | 114 | 9,188 | ~2,297 | setup only | Not per turn. |
| `lib/sf2/chapter-meaning/prompt.ts` | 154 | 8,427 | ~2,107 | close/transition only | Not per turn. |
| `lib/sf2/prompt/compose.ts` | 92 | 3,603 | ~901 | code | No model prompt except composed strings. |
| `lib/sf2/retrieval/scene-packet.ts` | 908 | 41,631 | ~10,408 | dynamic rendered state | Scene bundle cached within scene; per-turn delta uncached. |
| `lib/sf2/genre-examples.ts` | 203 | 9,491 | ~2,373 | interpolated examples | Cached when embedded in role/retry prompts. |
| `lib/system-prompt.ts` | 2,347 | 148,501 | ~37,125 | V1 mixed | Core/situation cached, compressed state dynamic, special prompts separate. |
| `docs/prompt-composition.md` | 274 | 19,856 | ~4,964 | docs | No runtime cost. |
| `lib/tools.ts` | 1,179 | 55,388 | ~13,847 | V1 cached tools | Stable per V1 call type. |
| `lib/tool-processor.ts` | 313 | 16,848 | ~4,212 | code | No prompt cost. |
| `lib/genres/*` total | 5,777 | 567,518 | ~141,880 | data injected selectively | Full files are not injected wholesale; promptSections/hooks/lore slices matter. |

Practical cost split:

- Narrator cached stable surface: `SF2_CORE` + one genre bible + `SF2_NARRATOR_ROLE` + chapter situation + tools. Large but cache-friendly.
- Narrator per-turn dynamic surface: current mutable state from `renderPerTurnDelta`, current player input, optional roll gate, optional intent queue, optional role alias, optional playbook preference, optional location guard, optional recovery/coherence notes.
- Scene-scoped amortized surface: `renderSceneBundle` output cached for the current scene, then reused unless scene id/cache changes.
- Archivist per-turn dynamic surface: full canonical registry slices + narrator prose + annotation. This is likely the biggest recurring non-Narrator cost.

## V1 -> SF2 Parity Table

| Concept | V1 surface | SF2 status | SF2 surface(s) | Audit classification | Notes / decision |
|---|---|---|---|---|---|
| Genre injection | `lib/system-prompt.ts` core uses genre promptSections; `lib/genres/*` | preserved, but different shape | Narrator bibles in `prompt.ts`; `genre-examples.ts`; Author/Arc examples; shared genre files | preserved in SF2 prompt | SF2 has built-in bibles for hegemony plus legacy genres. Needs Genre Narrative Profile decision before moving examples. |
| Roll discipline | V1 pending_check before outcome, roll gate dynamic warnings, uncertainty + consequence | preserved and partly code-derived | `narrator/prompt.ts`, `roll-gates.ts`, `intent-queue.ts`, `tools.ts`, roll resume text | replaced by SF2 code/schema/validator + prompt | SF2 stronger on deterministic gates and roll resume. V1 advantage/disadvantage origin/disposition nuance is less explicit. |
| Fail forward | V1 fail-forward section and failed-read rules | preserved | `narrator/prompt.ts`, `turn-context.ts` roll result message, `request_roll.consequence_on_fail` | preserved in SF2 prompt | Duplicated intentionally across baseline and roll resume. |
| Failed-investigation POV | V1 "miss reveal" and wrong belief rules | preserved | `narrator/prompt.ts` fail-forward, hidden cognition, click-of-realization ban; roll result message | preserved in SF2 prompt | Very strong in SF2; likely bug-scar duplication should stay until sentinel coverage proves safe. |
| NPC information gating | V1 risky questions / NPC info gated, disposition-driven | preserved and code-aided | `roll-gates.ts` `detectNpcInformationGate`, Narrator role, scene packet NPC contracts | replaced by SF2 code/schema/validator + dynamic packet | Trusted-with-earned-disclosure exception exists in code; less rich than V1's disposition ladder prose. |
| Origin/social modifiers | V1 origin lore, starting contacts, persistent social modifier, origin counters | partially preserved | Author seed/playbook lens, Narrator player origin line, genre setup, dynamic player block | accidentally missing / needs decision | SF2 has origin name and PC capabilities, but not a clear origin-as-persistent-social-modifier rule equivalent. Decide whether to restore as prompt, state packet, or Author/NPC disposition contract. |
| Promises | V1 prompt hidden system + commit/audit tools | preserved structurally | Archivist anchors/promises, scene packet anchored promises, chapter meaning digest | replaced by SF2 code/schema/validator + dynamic packet | SF2 promise handling is more graph-owned; no need to reintroduce V1 lifecycle prose except if UX needs two-chapter strain semantics. |
| Decisions | V1 decision tracking, witness marks | preserved structurally, witness marks unclear | Archivist decisions, scene packet anchored decisions, chapter meaning digest | preserved in SF2 dynamic packet | Basic decision parity present. V1 witness-mark advantage mechanic appears not directly represented in inspected SF2 prompt surfaces; needs decision if desired. |
| Clocks/timers/heat | V1 hidden systems + audit checks + dynamic state | replaced by pressure ladders, temporal anchors, faction heat, procedures | Author pressure ladder/human stakes, Archivist ladder fires/temporal anchors/heat, scene packet | replaced by SF2 code/schema/validator | SF2 should not restore generic V1 clock prose wholesale; pressure engines are the new pattern. |
| Post-action checklist | V1 checklist before `commit_turn` | intentionally replaced | Narrator tool split + Archivist extraction + apply-patch | intentionally_replaced_v1_rule | SF2 Narrator no longer owns durable narrative writes, so V1 checklist would be harmful if copied. |
| Scene boundaries | V1 scene pacing + scene_end tracked/extracted | preserved and strengthened | Narrator establishment/continuation, scene snapshot effects, scene bundle cache, Archivist scene_result | preserved in SF2 prompt + dynamic packet | Load-bearing and heavily duplicated. Keep through ticket 08. |
| Suggested actions | V1 mandatory scene-valid quick actions | preserved | `narrator/prompt.ts`, `narrator/tools.ts`, per-turn establishment instruction | preserved in SF2 prompt/schema | SF2 adds prose-grounding and stance coherence. Good parity. |
| Compressed-state warnings | V1 compressed state warnings: no commit, scene summary owed, close, depleted item, roll gate | partially replaced | scene packet, recovery/coherence notes, sentinels, roll gates, diagnostics | preserved in SF2 dynamic packet | SF2 has stronger role-specific notes but not every V1 warning class. Do not port blindly. |
| Roll drought / momentum trap | V1 prompt and `[SYSTEM: ROLL DROUGHT]` | weak/unclear in inspected SF2 surfaces | roll-gates, pacing diagnostics, required roll gates | accidentally missing / needs decision | SF2 gates individual inputs, but no inspected roll-drought ratio directive equivalent. Prefer diagnostic/replay fixture over prompt prose. |
| Dense scene roster / present NPC authority | V1 dense scene roster in compressed state | preserved and strengthened | scene bundle cast/off-stage cast, present_npc_ids, Archivist registry, role alias block | preserved in SF2 dynamic packet | SF2 is better: on-stage/off-stage split and Narrator opening law. |
| Chapter close timing | V1 turn budget + objective resolved close directives | preserved differently | Author pacing contract, Narrator close criteria, chapter meaning prompt, pressure ladder requirements | preserved in SF2 prompt + dynamic packet | SF2 close requires current chapter objective + first two ladder steps + decisive scene; less hard turn-budget than V1. This is likely intentional but should be reviewed. |
| Passive perception | V1 PP auto-notice | not found in inspected SF2 prompt surfaces | player block has stats/proficiencies, not PP | accidentally missing / needs decision | If SF2 wants D&D-like passive discovery, add as code/packet rule, not loose prompt. |
| Advantage/disadvantage from disposition/cohesion/origin | V1 explicit | partial | `request_roll.modifier_type`; scene packet disposition contracts; no cohesion equivalent seen | accidentally missing / needs decision | SF2 supports modifiers but lacks explicit modifier trigger table in inspected surfaces. |
| Opening hooks/title selection | V1 server-side hook/title + setup prompt | replaced | Arc Author + Chapter Author seed/arc plan | intentionally_replaced_v1_rule | Do not reintroduce V1 opening hook prose shape into SF2 Narrator. |
| Audit prompt | V1 periodic Haiku audit | replaced by Archivist/coherence/apply-patch | Archivist prompt/tools, sentinel context | intentionally_replaced_v1_rule | SF2's post-turn Archivist is the successor, not an optional audit. |

## Duplication And Bug-Scar Table

| Rule / scar | Appears in | Classification | Recommended action | Rationale |
|---|---|---|---|---|
| Fail-forward / failed roll must create consequence | `narrator/prompt.ts`, `turn-context.ts` roll result, `request_roll.consequence_on_fail`, V1 core | `duplicate`, `bug_scar` | keep for now | It operates in normal and roll-resume contexts. Removing one copy risks behavior regression. |
| Hidden cognition / "what you don't notice" ban | `narrator/prompt.ts` fail-forward, hidden cognition, click-of-realization, roll result; V1 core | `duplicate`, `bug_scar` | keep or move to sentinel after calibration | This is a known high-frequency failure. Good eventual sentinel/replay candidate. |
| Establishment vs continuation | `narrator/prompt.ts`, `renderPerTurnDelta`, scene bundle comments, scene snapshot rules | `duplicate`, `bug_scar` | keep through ticket 08 | Explicitly marked most-failed. Structural extraction only. |
| Present/off-stage NPC authority | Author visible_npc_ids rules, Narrator opening law, scene bundle off-stage cast, role alias block, Archivist NPC preservation | `duplicate`, `bug_scar` | keep, later move more to code/validator | Multiple roles need the same constraint at different points. |
| Suggested-action grounding | Narrator role and `narrate_turn` schema | `duplicate` | keep | Role guidance explains why; schema enforces localized contract at tool call. |
| Skill hint examples | Narrator role and `genre-examples.ts` | `example`, `genre_profile_candidate` | move to genre profile after human approval | Safe only if interpolation remains byte-stable or tests compare output prompt. |
| Pressure-ladder scene-coupled trigger ban | Author role, Author retry, validator errors, genre examples | `duplicate`, `bug_scar`, `code_owned_candidate` | keep prompt + validator; move examples to profile later | Validator-backed, but prompt prevents invalid first pass cost. |
| Outcome spectrum human anchors | Author role, Author retry, author schema descriptions | `duplicate`, `bug_scar` | keep | Strong quality/cost rule; retry is targeted. |
| Procedure must be human leverage | Arc Author, Chapter Author continuation, Chapter Meaning transition seed, Author retry | `duplicate`, `bug_scar` | keep, consider validator/replay coverage | Core SF2 principle; do not trim without fixtures. |
| Chapter continuation law / do not restage | Author role, Author situation, Chapter Meaning transition seed, scene packet continuation dramatic turn | `duplicate`, `bug_scar` | keep | Cross-role handoff contract. |
| Document attribution drift | Archivist role and Archivist tool schema | `duplicate`, `bug_scar` | keep or move more into deterministic scanner | Tool schema and audit policy reinforce each other. |
| Pronoun/age/identity drift | Archivist role, scene bundle identity fields, turn registry | `duplicate`, `bug_scar` | keep | Locked-field detection depends on dynamic registry plus prompt. |
| Ladder fire skepticism / no consecutive fires | Archivist turn message plus runtime rejection note | `duplicate`, `code_owned_candidate` | move to validator/runtime where not already, keep prompt note | Prompt reduces bad proposals; runtime should remain authoritative. |
| Location continuity guard for departed ship | `messages.ts` dynamic private block; sentinel context location continuity | `bug_scar`, `code_owned_candidate` | move to code/sentinel eventually; keep now | Narrow scar from playthrough drift. |
| Role/playbook name is not in-world entity name | Arc Author, Chapter Author, Author situation | `duplicate`, `bug_scar` | keep or validator fixture | Specific Space Opera failure. |
| V1 transaction/ledger dedup | V1 prompt/tool/tool-processor | `intentionally_replaced_v1_rule` for SF2 | do not port to Narrator prompt without SF2 economy design | SF2 inspected surfaces have credits_delta only; durable obligations exist in Archivist. Needs separate economy ticket if parity desired. |

## Prompt Edit Decision Queue

No prompt deletion/restoration should happen automatically from this audit. Decisions below should be explicit review items.

| Decision | Default recommendation | Risk | Affected files | Suggested verification |
|---|---|---|---|---|
| Restore origin as persistent social modifier in SF2? | Needs human decision. Prefer derived packet/Author/NPC disposition contract over generic Narrator prose. | Without it, origin may become cosmetic; with loose prose, Narrator may over-index stereotypes. | `lib/sf2/author/prompt.ts`, `lib/sf2/retrieval/scene-packet.ts`, possibly `lib/sf2/narrator/prompt.ts` | Add replay fixture where origin should change NPC starting disposition or roll modifier. |
| Restore V1 witness marks in SF2? | Needs human decision. | Could add a strong moral mechanic, but conflicts with SF2 Archivist ownership unless modeled. | types/schema/Archivist/Narrator roll modifier path | New schema + fixture; not a prompt-only edit. |
| Add roll drought / momentum trap to SF2? | Prefer diagnostic/code-derived advisory over prompt restoration. | Prompt-only version may nag rolls; code version can inspect actual gates. | `roll-gates.ts`, pacing signals, scene packet advisory | Fixture with multiple forward-motion no-roll turns. |
| Add passive perception equivalent? | Needs product decision. | Can cheapen investigation if auto-notice too broad. | retrieval packet, roll gates, rules engine | Focused fixture for hidden clue under PP threshold. |
| Add V1 advantage/disadvantage trigger table? | Needs design review. | Loose prompt may conflict with code-resolved modifiers. | `narrator/prompt.ts`, `request_roll` schema, scene packet | Fixture asserting trusted/wary disposition changes modifier or effective DC. |
| Collapse duplicate hidden-cognition bans? | Do not do in ticket 08. | High regression risk; most copies are context-specific. | `narrator/prompt.ts`, `turn-context.ts` | Display sentinel/replay coverage for banned phrases before deletion. |
| Move genre examples out of role prompts? | Safe only as content-preserving module extraction first. Content changes require approval. | Examples feed both behavior and validator repair. | `genre-examples.ts`, `narrator/prompt.ts`, `author/prompt.ts`, `author/retry.ts` | Snapshot generated prompt text for at least two genres before/after. |
| Shorten Author continuation law? | Do not auto-edit. | This is current SF2 reliability spine for Ch2+. | `author/prompt.ts`, `chapter-meaning/prompt.ts` | Continuation replay fixtures around do-not-restage/procedure leverage. |
| Move ladder fire skepticism from Archivist prompt to runtime only? | Needs proof runtime fully covers it. | Over-firing pressure ladders changes chapter feel. | `archivist/prompt.ts`, apply-patch validators | Replay fixture with consecutive possible fires. |
| Harden chapter close timing like V1 hard turn budgets? | Needs product decision. | Could preserve short chapters, but may fight SF2 pressure-ladder computed pacing. | `narrator/prompt.ts`, pacing signals, Author pacing contract | Playthrough/replay around high inherited tension and late objective resolution. |

## Implementation Feed For Ticket 08

Safe Narrator Prompt Surface Module work:

- Extract `SF2_NARRATOR_CRAFT` subsections into named constants/functions without changing text: voice, mechanics, fail forward, consequences, scene discipline, craft.
- Extract genre bible lookup and bible constants behind a module boundary without changing `getSf2BibleForGenre` output.
- Extract `buildNarratorRole(genreId)` composition into stable section renderers while preserving exact section order and interpolation of `genreExamples`.
- Extract `buildNarratorSituation(state)` into a situation module as long as output text remains byte-equivalent for representative states.
- Keep `SF2_CORE` as session-scoped and world-independent.

Content changes blocked pending human approval:

- Deleting or shortening fail-forward, hidden cognition, establishment/continuation, suggested-action, chapter-close, or campaign-lexicon sections.
- Restoring V1 origin/social modifier, passive perception, witness marks, roll drought, or advantage/disadvantage trigger tables.
- Moving examples into a genre profile if output text changes.
- Any change that alters when `request_roll` is required, when `narrate_turn` is called, or how roll resume text is phrased.

Load-bearing cache/dynamic placement rules:

- No per-turn content in `SF2_CORE`, genre bible, or Narrator role constants.
- `buildNarratorSituation(state)` is chapter-scoped system content and currently cached; per-turn pressure belongs in scene packet/delta, not situation.
- Scene bundle is scene-scoped and cached/reused by scene id.
- Per-turn delta, player input, withheld opening facts, role alias lookup, roll gate, playbook preference, location continuity guard, recovery notes, coherence notes, and intent queue are dynamic user-message content.
- Roll resume uses a `tool_result` message appended to prior messages; failure instructions there must remain because normal per-turn roll-gate context is not the same surface.
- Tool cache marker remains on the last Narrator tool in `buildCachedNarratorTools`.
- `composeSystemBlocks` cache markers and `assertNoDynamicLeak` are infrastructure contracts, not prompt prose to simplify.

Suggested ticket 08 verification:

- Generate Narrator system blocks for at least `hegemony` and `space-opera` before/after and diff text.
- Generate one normal first-scene message packet and one continuation packet before/after and diff text.
- Generate one roll-resume failure message before/after and diff text.
- No replay/build is required for this ticket 06 artifact, but ticket 08 should use text snapshot checks or fixtures because cache placement and prompt bytes matter.

## Source Surfaces Not Inspected

- `lib/sf2b/narrator-role.ts`: not present in this checkout.
- `lib/sf2b/narrator-kernel.ts`: not present in this checkout.

All other listed SF2 and V1 surfaces were inspected at least for structure, key prompt text, and count baseline. `lib/genres/*` was inspected as shared genre data by file counts and targeted search; full genre files are content-heavy and were not quoted exhaustively into this artifact.
