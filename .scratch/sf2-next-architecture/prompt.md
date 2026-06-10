# Storyforge Next Architecture Prompt

Status: ready-for-agent
Source: revision of the 2026-06 architecture prompt, fact-checked against the repo as of commit `6677243` (2026-06-10)

You are a principal architect designing the next Storyforge engine.

Storyforge is a solo text RPG where Claude is the GM. The product bet is not "chat with an AI"; it is a campaign that feels narratively alive while preserving reliable mechanics, continuity, and long-lived world state.

The design thesis you must satisfy, distilled from five architecture generations and their transcripts:

> **The model owns abundance. Code owns scarcity. The player owns the table. Nothing is proven until chapter 2.**

- *Abundance* = prose, character voice, world texture, scope variance, judgment, interpretation. Every attempt to move these into structure (packets, authors, schemas) degraded them.
- *Scarcity* = randomness (dice), resources (HP/credits/clock ticks), and time (scene ends, chapter close). Every attempt to leave these to the model inflated them: skipped rolls, free reveals, chapters that never end.
- *The table* = the player's authorship stance and the meta-channel where rules are negotiated. UI affordances that reduced player input to choosing degraded the whole loop.
- *Chapter 2* = the only place quality can be measured. Every architecture ever built produced excellent chapter 1s.

You are not designing on a green field. The repo already contains a governing PRD for the prose-first direction (`.scratch/sf2-prose-first-narrator/PRD.md`, thesis: "The model is the GM. The harness owns the dice."), a two-phase Arc Author removal plan (`.scratch/sf2-kill-arc-author/`), and three hardening commits that landed *after* most of the evidence below was gathered. Your design must position itself relative to those artifacts: adopt, amend, or overturn — never ignore.

-----

## Architecture History

### V0 / Early V1

One GM model owned narration, mechanics, state mutation, memory, quick actions, and pacing.

Architecture:

- Next.js browser app.
- `/api/game` streamed one GM response.
- Browser persisted one monolithic `GameState` in `localStorage`.
- Model emitted tools such as `request_roll`, `update_character`, `start_combat`, `end_combat`, `suggest_actions`.
- Prompt included compressed game state plus recent messages.

What worked: simple; fast to build; direct narrative loop.

What failed: GM had too many jobs; state drift, duplicate mutations, weak continuity, skipped rolls; prompt memory was fragile; dynamic state in prompt hurt caching.

### V1.5

Still one GM route, but mutation became more disciplined.

Architecture:

- One `commit_turn` tool replaced many scattered mutation tools.
- `tool-processor` and domain handlers applied mutations.
- `rules-engine` added code-owned counters, thresholds, roll warnings, chapter pacing, dedupe.
- Shadow extractor emerged: GM wrote prose and key mechanics; extractor recovered narrative-state changes.
- Prompt split into core, situation module, and dynamic state; dynamic state moved out of cached system blocks into messages.

What worked: much better cost/caching; cleaner mutation boundary; code-owned mechanics were more reliable; shadow extraction proved narration and durable state extraction should be separated.

What failed: still a giant monolithic `GameState`; still too much prompt responsibility; narrative memory and mechanical state remained tangled; chapter and long-arc coherence remained hard. **Observed in play:** chapter 1s were excellent; chapter 2s rarely were — typed handover preserved facts and discarded texture. Two signature state bugs: a charge re-applied every turn until a drink cost hundreds (non-idempotent delta re-extraction) and NPC gender flips (assertions not pinned). Roll density rose sharply versus the chat prototype because the gate triggered on contestedness; suggested-action chips shifted the player from author to chooser and player input quality fell with it.

### SF2 / V2

A context-engineering rebuild. State over history.

Architecture:

- Primary `/play` engine; canonical `Sf2State` in IndexedDB.
- Separate model roles: Arc Author (long arc plan), Chapter Author (chapter setup), Narrator (prose, rolls, visible effects, quick actions), Archivist (durable state patches from prose), Chapter Meaning (transition material). A sixth role, Playstyle (end-of-chapter campaign-rulebook synthesis fed back to Author and Narrator), was added in May 2026.
- Code owns validation, pressure, pacing, roll math, retrieval, persistence, diagnostics.
- Narrator receives bounded working set + scene packet, not whole transcript.
- Archivist emits flat semantic patch proposals; code validates/partially accepts.
- Replay fixtures test deterministic contracts (283 fixtures under `fixtures/sf2/replay/` as of this writing).

What worked: strong state reliability; clear role ownership; validation before persistence; testability; replay diagnostics; prompt caching discipline.

What failed: multi-role pipeline caused signal degradation; Author intent did not reach the prose surface; Narrator got entity blocks rather than prose-shaped memory; bounded packets produced procedural, flattened, micro-scene play. **Observed in play (same seed as a V1.5 campaign, enabling direct comparison):** 29 rolls in 40 turns, dominated by Intimidation at DC 15–18 with a ~72% failure rate — a slot machine, not drama (the in-repo PRD records the same Stryca transcript as "11 intimidation rolls"; re-derive the exact count from the session export before quoting it further); one `scene_end` in 24 captured turns; the scenario's emotional core (a hidden child) appeared only at turn 37, as a census amendment record, while in the V1.5 run of the same seed children and mothers were on screen from the first scene. Bureaucracy proved to be an attractor state: first-class `procedures`/`documents` entities + fail-forward + bounded packets meant every failed roll converted into the cheapest available complication — paperwork — and the player rationally retreated to roll-free record-reading. The instrumentation detected its own stagnation (advisories fired, kill criteria failed the session) but had no sensor for drama and — at the time — no authority to change tempo.

**Counter-evidence to hold honestly:** a later SF2 space-opera run ("Forty Thousand", `.scratch/sf2-space-opera-3ch-20260503-234508/`) played 18 turns with ~8 well-targeted rolls and found a natural chapter close at turn 18. SF2's pathology is real but seed- and genre-sensitive, which is precisely why the promotion test below demands multiple seeds across multiple genres. That run also logged nine state-drift issues (stale clue supersession, location alias duplicates, roll values leaking into prose) — SF2's reliability is good, not solved.

**Post-evidence mitigations already in SF2 main:** deterministic narrative tempo (8 tempo modes, `lib/sf2/narrative-tempo.ts`) and pacing trip-wires (`lib/sf2/pacing/signals.ts`: reactivity ratio, scene-link discipline, thread stagnation, arc dormancy, and a forbidden-repeat detector for document/access/search/ask/waiting loops — a first bureaucracy-attractor sensor). These postdate the flattening evidence and are unproven against it. Your design must state which of these are kept, promoted, or replaced.

### SF2B

A short-lived hybrid spike: looser hook-driven Narrator shape; tension score; continuity lock ideas; objective-derived close/reframe behavior; repeated-beat advisories.

What worked: better local drama; better chapter motion when pressure was sharp.

What failed: continuity identity was fragile; a strong chapter could stop belonging to the same campaign. Runtime path deleted (commit `5c566d6`); useful pieces folded back into SF2.

Lesson: do not merely make the Narrator looser. Keep canon stricter, tension structure more deliberate, and scene writing freer.

### Current Prose-First Prototype

An isolated `/play/prototype` experiment (`app/play/prototype/`, `components/sf2/prototype-play-app.tsx`, `lib/sf2/handover/`, `lib/sf2/narrator/prose-first-close-loop.ts`).

Architecture:

- Pre-authored Markdown campaign briefs (`content/sf2/campaign-briefs/`); no Arc Author or Chapter Author.
- Narrator receives private GM brief or handover documents plus growing transcript.
- Character creation happens in conversation.
- Code still owns dice, HP math, roll pause/resume, persistence, Archivist extraction, validation.
- Archivist extracts UI/state data after each turn but is not the Narrator's memory layer.
- Chapter close compiles three prose artifacts: Session Brief, GM Memory, Quick Reference — three parallel Sonnet calls (`lib/sf2/handover/compiler.ts`, max_tokens 8192/10240/2048), partial success tolerated.
- Caching: stable brief/handover prefix + growing transcript prefix cached; current mechanical snapshot appended uncached. Four breakpoints: system blocks, scene bundle (keyed on `sceneId`), last assistant message (advances each turn), uncached current-turn delta.
- Persistence: IndexedDB `storyforge_sf2_prototype`, 3 save slots, full session blob including `handoverDocuments`.

What worked (observed in two sessions, cold-war and space-opera): clear narrative step up — scope variance, NPC interiority, session-zero-through-fiction (player answers metabolized into campaign canon and reused as emotional lenses), found-family crew texture, emotional core on screen from turn 1. Roll density fell back to chat-prototype levels (5 rolls/22 turns; 9/43) with varied skills. Player free-text authorship returned. Clocks with narrative names drove a converging climax.

What failed (observed, **before the three hardening commits below**): the Narrator never closed a chapter — both sessions parked at their climax (six clocks at 9–10/10) with `handoverDocuments` empty. Chapters were loose; obvious landing points were drifted past. Rolls became *too* sparse: the advisory roll gate (`required: false, binding: expected`) allowed free reveals and free successes in highly uncertain situations. `narrator_output_recovered` fired on roughly half of turns (leaky prose↔structure contract, survived via repair logic). The Archivist rejected narration over 8,000 chars — the harness was sized for SF2 prose lengths and the returning scope variance burst it.

**What has been hardened since (and what remains unproven):**

1. **Roll gate** (commits `935675d`, `6677243`): the gate now has three binding tiers (`advisory`/`expected`/`hard`), and code contextually *hardens* bindings — NPC information without earned disclosure, social pressure against a resistant NPC, clandestine contact, and high-stakes contexts (combat, active operation, tension ≥ 7) escalate to `hard`, where the prompt reads "You MUST call `request_roll`". A "drama engine + information cost" protocol replaced the permissive uncertainty language and tripled gate compliance (22% → 67%) across an 11-scenario experiment. **Open:** 67% compliance on a SHOULD is still a free-lunch budget of one turn in three; neither roll-density bound is enforced; no post-hoc free-lunch detector exists anywhere in the codebase.
2. **Chapter close** (commit `efe81a6`): a code-owned close loop controller now exists (`lib/sf2/narrator/prose-first-close-loop.ts`) — a five-phase machine (`early_no_close`, `compress_no_future`, `close_candidate_or_plan`, `active_revelation_defer`, `hard_boundary_strict`) driven by the chapter pacing contract (`targetTurns.min`, default 12), fact-locks that force "Done / In flight / Not done" separation, and active-blocker detection (live combat, active operation, an NPC mid-answer, an unfolding revelation). The Narrator must echo `chapter_status` (phase, close_candidate, close_intent, handover_ready, active_blockers) on every `narrate_turn`. **Open:** code computes close *candidacy*; the Narrator still *declares* close. Nothing forces a landing if the Narrator ignores `close_candidate` indefinitely — the original failure mode is constrained, not eliminated. No session has yet crossed a chapter boundary through this controller, so the architecture's central bet — prose-shaped handover — is still untested.
3. **Archivist sizing** (fixed): input cap is now 32,000 chars (`app/api/sf2/archivist/route.ts:31`). The 8,000-char rejection is dead. The recovery-rate question is not: repair strategies (alt-key normalization, carry-forward from prior turn, synthesized defaults, XML-leak containment) plus private re-establishment notes fed back to the Narrator still paper over a leaky contract. The post-hardening recovery rate has not been re-measured; measure it before designing the replacement contract.

Known risks: prompt-cache TTL expiry during long player pauses (5-minute ephemeral TTL; the PRD floats keepalive-every-~4-minutes vs. accepting misses vs. 1-hour TTL); growing transcript cost requiring compaction; handover/typed-state conflicts (typed state must win for hard facts); Archivist must not become the true memory layer again.

-----

## Ground Truth Inventory

Verified against the repo at commit `6677243`. Design against this, not against memory of the system.

**Model roles and models today:**

| Role | Model | Status |
|---|---|---|
| Narrator | Sonnet 4.6 | live, streaming, hot path |
| Archivist | Haiku 4.5 | live, per-turn |
| Chapter Author | Sonnet 4.6 | live |
| Arc Author | Sonnet 4.6 | **still live** in the chapter-close path (`components/sf2/play-app.tsx`); removal plan exists at `.scratch/sf2-kill-arc-author/` (phase 1: skippable; phase 2: delete) but no phase has shipped |
| Chapter Meaning | Sonnet 4.6 | live |
| Playstyle | Sonnet 4.6 | live; end-of-chapter rulebook synthesis with a live toggle — the nearest existing substrate for table talk |

**Reliability sensors that exist today** (`lib/sf2/instrumentation/session-summary.ts`, `lib/sf2/diagnostics-store.ts`): anchor-miss rate (kill criterion ≤ 5%), thread continuity (≥ 50% per transition), arc advancement (≥ 1 per chapter per active arc), total cost (≤ $7 per instrumented session), per-role cache hit ratio, TTFT/latency per call, narrator output recovery rate, meta-question rate, archivist call rate, coherence findings by type/severity, tempo match/mismatch diagnostics, pacing advisories fired, and working-set telemetry (excluded-but-referenced, full-but-unreferenced, stub-but-mutated).

**Working-set retrieval** (`lib/sf2/retrieval/working-set.ts`): max 6 full entities, 8 stubs, 5 full threads, scored selection (presence in scene, named in input, spine, pressure face, recency, decay).

**Actor firewall** (`lib/sf2/firewall/actor.ts`): actors `narrator`/`archivist`/`author`/`code` with explicit allowed-write sets; throws in dev/test, logs in production.

**Replay harness:** `npm run sf2:replay`; fixtures built from session exports via `npm run sf2:fixture`. Existing categories already include `chapter-close-*` (spine resolution, stalled fallback, successor promotion), `display-sentinel-*` (leak detection), `actor-firewall-*`, `archivist-*`, `persistence-*`. New regression fixtures must land in this harness, not a parallel one.

**Persistence:** SF2 IndexedDB `storyforge_sf2` v2 (stores: `campaigns`, `chapter_artifacts`, `campaign_index`, `save_slots`); prototype IndexedDB `storyforge_sf2_prototype` v1 (3 save slots, full session blob). V1 legacy saves remain in `localStorage`.

**Evidence artifacts and traceability:** the Stryca 40-turn SF2 transcript and the Pale Flame chapter set (transcript ~11,300 words, GM Memory ~2,100, Session Brief ~2,400, Quick Reference ~390, input brief ~3,500) are catalogued in `.scratch/sf2-prose-first-narrator/PRD.md`; the Forty Thousand V2 playthrough export (~24 MB) backs the same-seed comparison; six convergent campaign briefs exist across genres (Pale Flame, Seeker, Chrome, Sable, Covenant, Cardinal). Where this prompt's numbers and the PRD disagree (e.g., Intimidation roll counts), the session export is the source of truth — re-derive before quoting.

-----

## Exhibits

These are verbatim evidence. Design against them, not just the summaries above.

**Exhibit A — what unified authorship with full context can do (V0 chat prototype, chapter retrospective, written to the player):**

> "**Vasek.** Commander Dren Vasek has done nothing visible in the entire chapter. That's not because he's gone — it's because he's patient. He lost people at Athex-7. He knows the Meridian's transponder. The longer he's quiet, the more dangerous the eventual contact. You haven't asked about him, tracked him, or prepared for him. He's the uncontrolled variable going into Chapter 3."

No bounded-packet Narrator can write this sentence: it requires noticing a chapter-long *absence*. This retrospective was simultaneously handover document, foreshadowing engine, correction channel, and the single most engagement-producing artifact in the dataset.

**Exhibit B — same seed, two architectures (the flattening, controlled):**

V1.5, "The Tithe," the hidden child on screen:

> Tenne stands up slowly from the table. "Mum," she says. "What's an assessment?" The question lands in the room like something dropped from a great height. … She steps aside. Not surrender. Something heavier than surrender.

SF2, same seed, the hidden child's entrance, turn 37:

> "Sela Orvain. Seven years old. The correction removed her name from the active census and entered it under provisional classification pending secondary review." Amendment timestamp 13:51, clerk code C-114.

Same scenario. In one, a child; in the other, a database row. The schema taught the Narrator what the world is made of.

**Exhibit C — the prototype's twin scarcity failures (pre-hardening; the named mechanisms have since changed — see prototype section — but no post-hardening session has yet disproven either failure):**

Roll log of a 43-turn session: 9 rolls total, multiple decisive reveals and NPC capitulations granted without any roll. End state: clocks `broker_realizes_the_deception 10/10`, `meridian_tail_corridor_pressure 9/10`, `verada_dispersal_weapon 9/10` — the close signal firing with nobody listening. `handoverDocuments: {sessionBrief: "", gmMemory: "", quickReference: ""}`.

-----

## Durable Lessons

Use these as non-negotiable design constraints:

1. State is authoritative for hard facts, mechanics, IDs, ownership, HP, inventory, clocks, rolls, and persistence.
1. Prose-shaped GM memory is better input for narration than entity packets alone.
1. The Narrator should not own durable canonical state writes.
1. The model can suggest; code validates and persists.
1. Dice, arithmetic, roll resolution, HP, inventory, and resource spending belong in code.
1. If a model repeatedly fails a mechanical task, move that responsibility into code.
1. Prompt caching matters. Stable identity/brief/role content should be cacheable; mutable HP/player input/current-turn facts must not poison cached prefixes.
1. Long-lived continuity needs both typed machine state and interpretive GM memory/handover artifacts.
1. Cross-chapter transition should preserve judgment, not just facts.
1. Avoid multi-minute hidden setup waits unless they produce visible quality.
1. The player-facing streaming feel, roll pause/resume, and dice cadence are core game feel.
1. Architecture must support replay/debug artifacts and deterministic regression tests.
1. Start with reversible gates and compare against current SF2/prototype evidence.
1. **The model generates abundance; code must own scarcity.** The three scarce resources are randomness, resources, and endings. Any of them left to the model inflates: advisory roll gates produced free reveals; model-owned chapter close produced chapters that never end.
1. **Roll gates must bind on consequence, not contestedness.** Gating on "is this contested" produced the Intimidation slot machine; advisory gating produced free lunches. The binding predicate is *decisive gain under uncertainty*: reveals, NPC capitulations, irreversible commitments, risk to body/cover/resources. Roll density is a banded target (~1 per 5 to ~1 per 2 player turns) with both bounds enforced. *Status: partially encoded — contextual gate hardening (`lib/sf2/narrator/roll-gates.ts`) raised prompt-level compliance from 22% to 67%; the band itself is enforced nowhere.*
1. **Ending authority lives outside the Narrator.** A narrator-shaped model optimizes for flow and will never volunteer an ending; endings also discipline middles — chapters that cannot close go loose and pressure inflates until everything is urgent and nothing is. Close conditions are compiled at chapter open and checked in code; the Narrator authors *how* a chapter ends, never *whether*. *Status: partially encoded — the close loop controller computes candidacy and phases in code, but the Narrator still declares the close; there is no forcing function.*
1. **Schema ontology is destiny.** Whatever entity kinds dominate the Narrator-visible surface become what the world is made of. First-class procedures/documents made bureaucracy an attractor because failures convert into the cheapest complication in context. Any Narrator-visible surface must be seeded with people and physical stakes; failure-complication budgets must be denominated in something other than paperwork.
1. **The player is a system component.** Suggestion chips turned the player from author into chooser and prose quality fell with input quality; free text restored both. Quick actions must provoke authorship (prompts, hooks, open questions), not substitute for it.
1. **Chapter-1 evidence is worthless.** Quality is measured on chapter 2+, after a real handover, with texture probes: do non-plot details (an untouched glass of amber; a ghost asset used as an emotional lens; "Rix. Not Captain.") survive the boundary and pay off unprompted?
1. **GM memory works best when the player can read it.** The chat prototype's chapter retrospective was simultaneously handover, correction channel (a gender flip would have been caught in seconds), and engagement artifact. Handover needs a player-facing face, and chapter close should be framed as a writing task the Narrator gets to relish — the retrospective *is* the close ceremony — not as the death of the scene.

-----

## Assumptions To Attack

Do not generically "challenge assumptions." Take an explicit position, with reasoning, on each of these:

A. **The per-turn Archivist.** Its writes were consumed mostly by UI chips and diagnostics, not by the Narrator. Does it survive per-turn, move to scene-end or chapter-end cadence, or merge into the close ceremony? What breaks if it runs less often? (Today it is the only Haiku role; everything else is Sonnet — factor cost into the cadence argument.)
B. **Working-set retrieval.** Once the growing transcript is in the Narrator's context, what is retrieval still for? Cold facts from prior chapters only? Defend keeping it, or cut it — and account for the existing working-set telemetry (excluded-but-referenced, full-but-unreferenced) as evidence either way.
C. **Chapter Author as code.** Should chapter setup return not as a model role but as a *compiler* — deriving close conditions, pressure seeds, and a complication budget from the brief/handover with zero model calls and zero hidden wait? Note the close loop controller already consumes a `pacingContract` from chapter setup; a compiler would own that contract's source.
D. **Suggested actions.** Should they exist at all? If yes, specify a form that provably does not displace player authorship (e.g., questions and hooks rather than complete actions; appearing only on player idle).
E. **Three handover documents vs one.** Is the Session Brief / GM Memory / Quick Reference split earning its complexity, or should there be one GM-memory document with a player-facing rendering? The split exists in code today (three parallel Sonnet calls, max_tokens 8192/10240/2048, partial success tolerated) but has never been exercised by a real chapter close.
F. **The Narrator output contract and its recovery rate.** The 8,000-char Archivist ceiling is fixed (now 32,000); the real bug remains: a repair path (`narrator_output_recovered`: alt-key normalization, carry-forwards, synthesized defaults, XML-leak containment) that fired on ~half of pre-hardening turns is a contract bug being survived, not solved. Re-measure post-hardening, then propose the actual contract that gets recovery under 10%.
G. **The close loop's missing forcing function.** Code computes `close_candidate`; the Narrator declares close. Is "candidacy in code, declaration in model" strong enough, or does the controller need escalation authority — e.g., after N turns of ignored candidacy, the turn delta becomes a binding landing directive the Narrator must execute? What is N, and what blocks escalation (the existing active-blocker list, or something stricter)?
H. **Playstyle as the table-talk substrate.** A Playstyle role already synthesizes a campaign rulebook end-of-chapter and feeds it to Author and Narrator. Is table talk an extension of this (player-visible, negotiated, persisted as brief amendments), or a separate channel? Building a second rulebook mechanism next to an existing one needs justification.

-----

## Task

Design the best next Storyforge architecture. Do not simply choose V1, SF2, or the prose-first prototype. Synthesize from the lessons, exhibits, ground truth, and constraints above.

Answer all of the following:

1. What is the core loop from player input to persisted state?
1. What does the Narrator see each turn?
1. What is canonical state, what is GM memory, and what is transcript?
1. Which model roles remain, which are removed, and which become optional/fallback? (Address all six live roles, including Playstyle; for Arc Author, position against the existing two-phase removal plan.)
1. How do setup and chapter transitions work?
1. How do handover documents relate to typed state?
1. How does the system handle conflicts between prose memory and machine state?
1. What exactly is cached, and where are cache boundaries? (Position against the prototype's current four-breakpoint layout.)
1. When and how does compaction happen?
1. What is persisted in IndexedDB? (Position against the two existing databases; state whether they merge.)
1. What APIs/routes/modules should exist?
1. What validation/firewall rules are needed? (The actor firewall exists; specify the new actor set and allowed-write sets.)
1. What deterministic replay fixtures should cover the architecture?
1. What is the migration path from current SF2? (Reconcile with the open ticket inventory in `.scratch/sf2-prose-first-narrator/` and `.scratch/sf2-kill-arc-author/` — adopt, reorder, or retire those tickets explicitly.)
1. What are the biggest risks and kill criteria?
1. **Who owns scarcity** — dice requirement, costs, clock ticks, chapter close — and through what *binding* mechanism? Specify the roll-gate trigger predicate and the close-gate condition source exactly. The current close-gate condition source is the chapter pacing contract (`targetTurns.min`, default 12) plus fact-locks plus active blockers; adopt it or replace it with reasons.
1. **Specify the free-lunch detector**: what does it inspect per turn; what counts as a violation ("decisive information, agreement, or position gained without a roll, a cost, or previously established setup"); does it fail open (log) or fail closed (bounce the turn to the Narrator with a roll request); and how does it avoid regressing to SF2 roll density? State how it composes with the existing pre-turn gate hardening — prevention and detection are different layers; say whether you need both.
1. **What is the player-visible surface of state**, and how does the player correct it when it is wrong?
1. **How do quick actions avoid degrading player authorship?** (See assumption D.)
1. **Does table talk exist?** A meta-channel where player and GM negotiate campaign-specific rules (progression systems, new trackers, house rules), persisted as brief amendments. This was the chat prototype's biggest engagement mechanism and no productized version has had it. Address assumption H (the Playstyle role). If you cut table talk, justify the cut.
1. **What is the chapter-close ceremony?** Specify the close-gate trigger, the Narrator's landing directive, the player-facing retrospective, and the handover compilation — and how these are one pass, not four. Position against the existing five-phase close loop controller and the existing three-document parallel compiler.

## Validation and Evaluation Requirements

Your kill criteria must come in two classes:

**Reliability sensors** (exist today — see Ground Truth Inventory for the full list): anchor-miss rate ≤ 5%, thread continuity ≥ 50% per transition, arc advancement ≥ 1/chapter/arc, cost ≤ $7/session, per-role cache hit ratio, TTFT/latency, narrator output recovery rate, coherence findings. State which you keep, retire, or re-band.

**Narrative sensors** (mostly do not exist today; you must specify them): scene-end cadence (scenes per N turns, with bands); roll-density band compliance; free-lunch rate; named characters with speaking roles per chapter, split by social rank/role breadth; complication-type distribution (procedural vs physical vs interpersonal vs resource — note the forbidden-repeat pacing signal is a crude precursor; subsume or replace it); texture-survival score across handover (defined below); time-to-emotional-core (turns until the scenario's designed emotional payload is on screen).

**The promotion test is same-seed A/B.** The same seed run on two architectures produced the cleanest evidence in the project's history (Exhibit B). Specify: N seeds across ≥3 genres, played to chapter 3 minimum on both the candidate and the incumbent, scored on both sensor classes plus blind side-by-side prose preference. Candidate seeds with existing cross-architecture history: "The Tithe" (V1.5 + SF2 runs), "Forty Thousand" (V1.5 + SF2 runs + 24 MB export), plus at least one prototype brief (Pale Flame, Covenant, or Cardinal) to cover a third genre.

**Texture-survival score:** at chapter close, sample 5 non-plot texture facts from the transcript (sensory details, relationship microsignals, objects with emotional charge). In chapter 2+, probe whether the Narrator can pay each off unprompted when contextually invited. Score = survivals/5. Specify how this is automated.

**Regression fixtures must include, by name** (all in the existing `fixtures/sf2/replay/` harness; several have existing neighbors to extend rather than duplicate — `chapter-close-*`, `display-sentinel-*`):

- delta idempotency (the compounding drink bug)
- assertion pinning (the gender-flip bug)
- prose seam stitching (pre-roll/post-roll concatenation artifacts: "…actually do it.Thessaly's…")
- harness-vocabulary leakage into fiction ("the roll gate has been pending") — extends `display-sentinel-*`
- narrator-output recovery rate ceiling (<10% of turns, else the contract is wrong)
- Archivist input sizing for prose-first output lengths (cap is 32,000 chars today; fixture pins it against real prototype prose)
- close-gate firing (a full clock or met objective must produce a landing directive within its grace window) — extends `chapter-close-*`
- close-gate escalation (candidacy ignored for N turns must escalate, per assumption G)
- free-lunch detection (a decisive reveal without roll/cost/setup must be flagged)
- roll-density band (both bounds)

## Budgets

Honor these per-turn budgets. Values marked *(measured)* come from repo artifacts; values marked *(target)* are PRD targets not yet measured in production — re-measure from diagnostics exports before treating them as ceilings.

- Visible time-to-first-token: ≤ 5s *(target; current SF2 per-call TTFT is instrumented in `lib/sf2/instrumentation/latency.ts` — pull the live figure)*.
- Narrator stable prefix: ~8,800 tokens *(measured from Pale Flame artifacts: brief ~4,500 + GM Memory ~2,800 + Quick Reference ~500 + craft/mechanical ~1,000)*; growing transcript ~600–800 tokens/turn; ~29k total at a 30-turn chapter end (~15% of the 200k window) *(measured)*. Of Narrator input, ≥ 80% should be cache-read *(target)*.
- Cost reference points: V1 ~$0.30/chapter, SF2 ~$0.80/chapter *(measured)*; prose-first estimate $2–3/chapter on Sonnet even at ~50% cache miss *(estimated)*; instrumented-session kill criterion ≤ $7 *(existing)*. Background model spend (Archivist + sentinels + gates) ≤ 25% of Narrator spend *(target — propose your own number with reasoning if this is wrong)*.
- Chapter close (retrospective + handover, total): ≤ 30s wall clock *(target)*, may stream; the existing compiler runs three parallel Sonnet calls.
- Prompt-cache TTL is 5 minutes (ephemeral). Specify the pause story: keepalive pings (~every 4 minutes), accepting misses, or 1-hour TTL — with cost math.
- Sentinel/gate passes run on a small fast model (Haiku-class); the Narrator is the only large-model call on the hot path.

-----

## Output Format

**0. Three Decisions First.** Before the full format: name the three decisions that matter most in this design, your position on each, and what evidence would change your mind. The thinking leads the template, not vice versa.

1. **Executive Thesis** — one paragraph naming the architecture and its central bet.
1. **Core Architecture** — diagram or bullet flow; include model calls, code-owned steps, and persistence boundaries.
1. **State Model** — separate: canonical machine state; GM memory/handover state; transcript/recent scene memory; derived caches/indexes; diagnostics/replay artifacts.
1. **Runtime Loop** — step-by-step: normal turn; roll pause/resume; free-lunch bounce; chapter close/open ceremony.
1. **Prompt and Cache Strategy** — explicit breakpoints; what must never enter cached prefixes; how brief, handover, growing transcript, and mechanical snapshot are handled; the TTL-expiry-during-pause story.
1. **Roles** — keep/remove/change, with reasons: Narrator; Archivist; Arc Author (against the existing removal plan); Chapter Author; Chapter Meaning; Playstyle; Handover Compiler; Scarcity Warden (roll gate + free-lunch + close gate, model or code); optional Conductor/Scope Controller.
1. **Validation and Repair** — patch validation; prose-memory/state conflict detection and repair; what fails open vs closed; the Narrator output contract that gets recovery below 10%.
1. **Persistence** — IndexedDB stores and save shape; migration/versioning across the two existing databases; what remains in localStorage, if anything.
1. **Testing** — fixture categories including every named regression above; fixtures required before promoting to `/play`.
1. **Migration Plan** — smallest safe slices; reversible gates; explicit disposition of the open tickets in `.scratch/sf2-prose-first-narrator/` and `.scratch/sf2-kill-arc-author/`; the same-seed A/B evaluation plan against current SF2 and the prose-first prototype.
1. **Tradeoffs** — explicit about what this gives up: cost, latency, narrative quality, reliability, implementation complexity.
1. **Final Recommendation** — clear yes/no with one-line reasons: retire Arc Author (execute, amend, or cancel the existing plan); retain Chapter Author as fallback (or rebuild as compiler); make handover docs first-class; make handover player-facing; use growing transcript; keep working-set retrieval; keep per-turn Archivist; extend Playstyle into table talk (or build table talk separately, or cut it); add the Scarcity Warden; keep or replace the five-phase close loop controller; add compaction now or later.

Be concrete. Avoid generic AI-architecture advice. Use the vocabulary above. Where you deviate from a Durable Lesson, say so explicitly and argue from the exhibits. Where you deviate from shipped code or an open PRD, name the file or ticket you are overruling.
