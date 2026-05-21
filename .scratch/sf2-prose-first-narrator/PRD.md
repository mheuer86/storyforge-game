# SF2 Prose-First Narrator

Status: shaping-refined
Type: Planning artifact
Source: 2026-05-21 design session, Pale Flame reference materials, six campaign briefs, campaign-setup and campaign-handover skills, V3 PRD

## Direction

The model is the GM. The harness owns the dice.

SF2's multi-role pipeline (Arc Author → Chapter Author → Narrator → Archivist → Chapter Meaning) degrades narrative quality rather than improving it. The best Storyforge results come from web Claude with prose handovers and transcript memory within a single context window. This prototype recovers web Claude's narrative strengths — scope variance, physical worldbuilding, NPC voice, dramatic irony, player-responsive pacing — while keeping SF2's valuable mechanical layer: streaming NDJSON with roll pause/resume, d20 resolution, code-owned persistence, and UI data extraction.

The architecture replaces hidden Author passes with pre-authored campaign briefs and a growing conversation transcript. The narrator receives the brief as its system prompt, asks character creation questions as the opening turns of play, then runs the campaign from a continuously growing context. At chapter close, a single handover model call compresses the transcript into three documents (Session Brief, GM Memory, Quick Reference) that seed the next chapter.

Supersedes: `.scratch/sf2-gm-handover/` (this PRD grew from that design review and replaces it entirely).
Partly supersedes: `.scratch/sf2-setup-calibration-reshape/` (briefs replace interactive setup wizard for the prototype).
Subsumes: `.scratch/sf2-kill-arc-author/` (Arc Author removal is a consequence, not a separate effort).

## Problem

SF2's Narrator receives entity-block scene bundles rebuilt each turn — structured working sets, not prose-shaped memory. It operates in bounded micro-scene mode. The multi-role pipeline loses narrative intent through signal degradation: the Arc Author in the Stryca playthrough explicitly designed a "revolt" scenario with three factions, named NPCs with private pressure, and a five-chapter function map. The Narrator produced 40 turns of compliance-office chamber play. The arc plan's dramatic intent never reached the prose surface.

The pipeline also imposes multi-minute setup waits (Arc Author + Chapter Author) that cost tens of thousands of tokens with no payoff for narrative quality.

Meanwhile, web Claude running the same genre with a prose handover and transcript memory produced the Pale Flame campaign: varied scope (road checkpoint → farmstead investigation → finding Maren), physical/sensory worldbuilding, strong NPC voice, dramatic irony, 7 rolls with stakes stated before rolling, and emotional moments emerging from play. The quality gap is a context gap (what the model sees), not a capability gap (what the model can do).

## Evidence

### Reference materials

| Material | What it shows |
|---|---|
| Pale Flame Chapter 1 transcript (~11,300 words) | Web Claude narrative quality benchmark: scope variance, worldbuilding, NPC voice, rolls, pacing |
| Pale Flame GM Memory (~2,100 words) | Model-generated craft intelligence: player style, PC interpretation, error log, pacing notes. Produced by web Claude with a simple "compile a handover" prompt, not human-authored |
| Pale Flame Ch2 Session Brief (~2,400 words) | Model-generated session prep: setting deltas, NPC roster, threads, clocks, opening conditions, chapter shape |
| Pale Flame Quick Reference (~390 words) | One-page play aid: stats, tensions, clocks, items, drives, companion |
| Pale Flame Ch1 input document (~3,500 words) | The campaign brief format that produced the quality benchmark: GM Style, World, Game System, Character Creation Questions, Opening Scene, GM Secrets, Cast, Session Shape |
| Stryca 40-turn SF2 transcript | Counter-example: procedural flattening, 11 intimidation rolls, single location, no scope variance, arc plan intent lost |
| Six campaign briefs (Pale Flame, Seeker, Chrome, Sable, Covenant, Cardinal) | Convergent format proof: web Claude independently produces the same document architecture across grimdark, epic-scifi, cyberpunk, noir, DnD fantasy, and Cold War espionage |
| Campaign-setup skill | Codified brief generation workflow: elicitation → construction, section-by-section |
| Campaign-handover skill | Codified chapter-close workflow: three-document output with specific section contracts |
| V3 PRD | North-star concepts: Story Surface, Owed Questions, Scene Exhaustion, Major Deltas, Chapter Job. Integrated as light craft notes, not a full Conductor |

### Key finding: convergent brief format

All six briefs independently converge on the same document architecture:

1. GM Style (tone register, cardinal sins, pacing contract)
2. World (power structures, factions, specific location, central tension)
3. Game System (genre-named stats over same d20+modifier core, signature mechanic, tension clocks, wound system)
4. Character Creation (5 genre-specific questions that create internal tension, not mechanical loadout)
5. Opening Scene (physically grounded, immediate stakes, NPC the player cares about, clock already ticking)
6. GM Secrets (truth under the surface, antagonist logic, hinge character, planted seeds)
7. Cast (named NPCs with stats, agenda, tell, relationship to PC)
8. Session Shape (4-6 structural beats, not a script)

The mechanical core is stable across genres: same stat array (16/15/14/12/10/8), same d20+modifier, same wound pattern, same proficiency scaling. Each genre adds one signature mechanic carrying the character arc (Dimming Track, Fracture Track, Humanity Track, Stress Track, the Code, Cover Integrity).

## Architecture

### Three live model calls (down from five roles)

```
Brief (pre-authored)          Narrator (per turn)           Handover (chapter close)
      │                            │                              │
      │  loads as system prompt    │  streaming NDJSON            │  full transcript + state
      ├──────────────────────────► │  roll pause/resume           │  + mini debriefs
      │                            │  growing transcript          │
      │                            │                              ├──► Session Brief
      │                            │◄─── Archivist (UI data) ◄───┤──► GM Memory
      │                            │                              └──► Quick Reference
      │                            │
      │   code-owned: rolls, HP math, streaming, persistence, validation
```

### Content pipeline (offline, not live)

Campaign briefs are pre-authored content, not live model calls. The workflow:

1. Take an SF2 hook + genre config
2. Feed through the campaign-setup skill (in web Claude or a batch tool)
3. Produce a Pale-Flame-quality brief (~3,500 words)
4. Store as loadable content in the repo, keyed by genre/hook

Six briefs already exist as reference material. Future briefs can be tailored to specific origin/playbook combinations. This is content work, not architecture work.

### Play surface: `/play/prototype`

The prototype lives at a separate route (`/play/prototype`) to avoid modifying the existing `/play` orchestration. It has a simple selector UI showing the available campaign briefs as cards, then launches directly into the narrator.

1. Player picks a brief from the selector
2. Brief loads as narrator's cached system prompt
3. Narrator asks character creation questions as opening turns of play
4. Player answers in conversation
5. Narrator assigns stats, transitions into opening scene
6. Campaign is running

No Arc Author. No Chapter Author. No setup wizard. No setup wait. If the prototype proves out (ticket 07), the architecture migrates to the main `/play` route. If not, the route is deleted cleanly.

### During play (growing transcript)

The narrator receives a cached system prompt (the brief or handover documents) plus a continuously growing transcript. Each turn appends the player's input and the narrator's response. Prompt caching makes the growing prefix cheap: cache reads on the stable prefix, cache writes only on the new turn.

No entity-block scene bundles. No working-set retrieval. No per-turn context rebuild. The narrator has the same kind of memory web Claude has: the conversation itself.

Per-turn mechanical snapshot (HP, active wounds, clock values, inventory changes) is appended as a compact code-owned block so the narrator sees current mechanical state without deriving it from prose.

### Archivist (UI data extraction, every turn)

The Archivist runs after every narrator turn to extract structured data for the play shell's three-column UI: character panel (stats, HP, wounds, equipment), NPC/cast panel, and location/intel panel. It operates the same as in current SF2 — receiving the narrator's latest output and producing state patches — but its role changes: it feeds the UI only. It is no longer the narrator's memory layer — the growing transcript is.

### Diagnostics

The prototype includes a collapsible diagnostics panel showing the loaded brief, the full growing transcript as the narrator receives it, per-turn mechanical snapshots, Archivist output, and handover documents when produced. This is critical for evaluating narrative quality and diagnosing issues.

### Chapter close (one model call)

When the narrator decides the chapter is done, a single handover model call runs with:
- Full available transcript (or compacted sections + mini debriefs if context grew large)
- Current mechanical state
- Handover skill instructions as system prompt

It produces three documents:
- **Session Brief**: paste-and-play context for the next chapter's narrator (~2,400 words)
- **GM Memory**: craft intelligence that accumulates across chapters (~2,100+ words, growing)
- **Quick Reference**: one-page play aid (~400 words)

The Session Brief replaces the campaign brief as the narrator's system prompt for the next chapter. The GM Memory is included as additional context. The Quick Reference is available for UI or reference.

### Mini debriefs

At natural breakpoints (scene transitions, roughly every 8-10 turns), the narrator generates internal GM notes — not visible to the player — capturing what worked, player style observations, live tensions, and craft lessons. These survive any future compaction and feed the handover compiler at chapter close.

Mini debriefs are preparation material for the handover, not a compaction mechanism.

### What's removed

| Removed | Rationale |
|---|---|
| Arc Author | Pre-authored briefs carry arc-level intent directly into narrator context without signal degradation |
| Chapter Author | Session Brief from handover carries chapter setup; character creation questions in brief handle opening |
| Scene bundles / working set | Growing transcript replaces entity-block context with prose-shaped memory |
| Code-computed close readiness | Model decides chapter close; code tracks non-negotiable constraints (minimum turns, active procedures) |
| Story Surface as separate rendering | The brief/handover IS the prose-shaped context; no separate rendering pass needed |
| Conductor / scope enforcement | Light craft notes in system prompt; no code-enforced scope control |

### What's preserved

| Preserved | Role |
|---|---|
| Streaming NDJSON with roll pause/resume | Core game feel |
| d20 resolution, HP/damage math | Code-owned mechanics |
| IndexedDB persistence, save slots | Campaign storage |
| Archivist | UI panel data extraction |
| Validation / partial accept | Archivist patch integrity |
| Play shell three-column UI | Player-facing surface |
| Genre configs | Genre selection and mechanical constants |

## Requirements

| Req | Requirement | Priority |
|---|---|---|
| R0 | Narrator prose quality matches or exceeds web Claude benchmark (Pale Flame), not just current SF2. | Core goal |
| R1 | Campaign start is instant — no multi-minute Author waits. | Must-have |
| R2 | Campaign briefs are pre-authored content loaded from storage, not live model calls. | Must-have |
| R3 | Character creation happens as narrator conversation from the brief's questions, not a separate wizard or model call. | Must-have |
| R4 | Narrator context is a growing transcript with prompt caching, not entity-block scene bundles rebuilt per turn. | Must-have |
| R5 | Chapter-close handover produces three documents: Session Brief, GM Memory, Quick Reference. | Must-have |
| R6 | Session Brief replaces campaign brief for Chapter 2+; GM Memory accumulates across chapters. | Must-have |
| R7 | Code owns rolls, HP math, streaming NDJSON, roll pause/resume, persistence, and clock value tracking. | Must-have |
| R8 | Model owns narrative scope, scene transitions, chapter pacing, NPC voice, worldbuilding, when to call rolls, and chapter close decisions. | Must-have |
| R9 | Archivist continues for UI data extraction; it is not the narrator's memory layer. | Must-have |
| R10 | Architecture fails open: missing brief falls back to current SF2 pipeline behind reversible gates. | Must-have |
| R11 | Start with minimal narrator restrictions. Add rules only when evidence shows they are needed. | Must-have |
| R12 | Streaming and roll pause/resume behavior is preserved exactly. | Must-have |
| R13 | Pre-authored briefs cover at least one hook per active SF2 genre before the prototype can be compared. | Must-have |
| R14 | Handover documents are stored as persistent artifacts accessible via diagnostics/export. | Should-have |
| R15 | Mini debriefs at scene boundaries capture craft notes for the handover compiler. | Should-have |
| R16 | Non-negotiable chapter constraints (minimum turns, active procedures) remain code-enforced. | Should-have |

## Guardrails

- Do not build mid-chapter compaction in the first slice. A 40-turn chapter (~30k tokens of transcript) fits comfortably in a 200k window. Solve compaction from evidence when GM Memory growth causes actual problems.
- Do not build a full V3 Conductor. Use light craft notes (scene exhaustion guidance, scope variance reminders) in the narrator system prompt. Add enforcement only if the narrator consistently fails at scope control.
- Do not expose internal section names (handover, GM Memory, mini debrief) in player-facing UI unless diagnostics are open.
- Do not let handover documents create canonical state entities. Handovers suggest tensions and candidates; the Archivist and validation pipeline own durable writes.
- Do not turn GM Memory into cross-campaign player profiling. It remains campaign-local.
- Do not over-restrict the narrator from the start. The prototype should demonstrate what the model does well before constraining what it does poorly.
- Preserve fail-open behavior: every new path must fall back to the current SF2 pipeline if the brief or handover is missing/invalid.

## Known Production Concerns

### Prompt cache TTL

The Anthropic prompt cache has a 5-minute TTL. In a text RPG where players routinely spend 5+ minutes reading prose and considering options, the cache will expire between turns. A cache miss on 30k+ tokens of accumulated transcript is ~10x the cost of a cache hit.

Mitigations (in order of priority for production):
1. **Cache keepalive**: lightweight ping every ~4 minutes while a session is active
2. **Accept and budget**: total session cost even with 50% cache misses is likely under $2-3 on Sonnet for a 30-turn chapter
3. **Cost-triggered compaction**: compact older turns when transcript exceeds a cost threshold, not a narrative one

Not a concern for the prototype phase.

### Content authoring volume

Each hook requires a ~3,500-word campaign brief. The campaign-setup skill can generate these, but quality review is needed. Six briefs exist as reference material; remaining hooks need authoring. This is content work that scales linearly with hook count.

Future briefs can be tailored to specific origin/playbook combinations, increasing permutations but also increasing authoring cost.

## Context Budget Math

Based on Pale Flame evidence:

| Component | Tokens (approx) |
|---|---|
| Campaign brief / Session Brief | ~4,500 |
| GM Memory (chapter 1) | ~2,800 |
| Quick Reference | ~500 |
| Craft notes / mechanical snapshot | ~1,000 |
| **Stable prefix total** | **~8,800** |
| Transcript per turn (avg) | ~600-800 |
| 30-turn chapter transcript | ~20,000 |
| **Total at chapter end** | **~29,000** |

At ~29k tokens, a full chapter uses ~15% of a 200k context window. No compaction pressure for several chapters even with growing GM Memory.

## Ticket Index

1. [Store Campaign Briefs As Loadable Content](issues/01-store-campaign-briefs-as-loadable-content.md)
2. [Growing Transcript Narrator Context](issues/02-growing-transcript-narrator-context.md)
3. [Brief-Driven Campaign Start](issues/03-brief-driven-campaign-start.md)
4. [Chapter-Close Handover Compiler](issues/04-chapter-close-handover-compiler.md)
5. [Feed Handover To Narrator For Chapter 2+](issues/05-feed-handover-to-narrator-continuation.md)
6. [Terminal Runner End-To-End Exercise](issues/06-terminal-runner-end-to-end.md)
7. [Retire Multi-Role Pipeline](issues/07-retire-multi-role-pipeline.md)
