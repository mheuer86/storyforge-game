Status: ready-for-agent

# 09 — Roll discipline experiment harness

## Problem

The prose-first narrator's current roll protocol — "Call request_roll only when there is meaningful uncertainty" — is too permissive. In a 21-turn Forty Thousand playthrough, the roll gate sentinel detected 10 roll-worthy moments but the narrator only called 6 rolls. Seven expected rolls were missed entirely (the narrator gave away information or resolved uncertain actions without a check).

The missed rolls cluster around two gate kinds:
- `npc_information`: NPC gave up actionable intel without a Persuasion/Insight check (5 missed)
- `investigation_search`: player searched or investigated without a Perception check (2 missed)

A blunt cadence rule ("roll every N turns") isn't the right fix — the problem is nuanced. What's needed is better protocol language that helps the narrator recognize which moments demand mechanical uncertainty and which don't.

## Experiment design

Build a TUI harness that:
1. Extracts "test scenarios" from a real playthrough export
2. Replays each scenario through the live narrator API with swappable protocol text
3. Records whether the narrator calls `request_roll` and what it writes
4. Compares results across protocol variants against the roll gate ground truth

### Test scenario structure

Each scenario is a self-contained narrator API call:
```ts
{
  id: string                          // e.g. "forty-thousand-t15"
  turnIndex: number                   // which turn this came from
  brief: string                       // campaign brief text
  transcript: { role, content }[]     // all prior turns (narrator=assistant, player=user)
  playerInput: string                 // the current player input being evaluated
  mechanicalSnapshot: object          // HP, inventory, clocks at this turn
  groundTruth: {
    gateKind: string                  // roll gate kind that fired
    gateBinding: string               // advisory | expected | hard
    gateSkills: string[]              // what skills the gate recommended
    narratorActuallyRolled: boolean   // what happened in the real playthrough
    rollData?: object                 // if a roll did happen, its details
  }
}
```

### Scenario extraction

From the Forty Thousand export, extract scenarios for every turn where a roll gate fired (both hits and misses):

**Missed rolls (narrator should have rolled but didn't):**
- Turn 7-9: broker conversation (npc_information on npc_4) — info flowed freely
- Turn 15: Toussaint office (npc_information on npc_7) — station chief gave intel
- Turn 17-19: Gate C / Davan conversation (npc_information on npc_9 × 3) — Sable Hand passengers revealed plot freely
- Turn 6: early investigation_search — observation without check
- Turn 21: late investigation_search — container inspection without second check

**Actual rolls (narrator did call request_roll):**
- Turn 10: Scan DC 15 → critical (reading broker body language)
- Turn 13: Insight DC 15 → failure (reading Slink)
- Turn 14: Scan DC 15 → failure (reading route data board)
- Turn 16: Scan DC 14 → success (identifying patch on passenger)
- Turn 20: Charm DC 15 → failure (convincing broker about passengers)
- Turn 21: Scan DC 15 → failure (container inspection)

### Protocol variants to test

Each variant replaces `PROSE_FIRST_NARRATOR_PROTOCOL` in the system prompt. Start with:

**v0 (baseline):** Current text — "Call request_roll only when there is meaningful uncertainty"

**v1 (enumerated triggers):** Add explicit trigger categories:
- NPC intel extraction from non-trusted NPCs
- Investigation/search with hidden information
- Social pressure against resistance
- Technical bypass under time pressure

**v2 (information cost):** Frame around information never being free:
- "Information from NPCs who aren't trusted allies always has a price — a roll, a concession, a risk"
- "Searching, scanning, investigating always carries uncertainty unless the answer is sitting in plain sight"

**v3 (pacing anchor):** Tie rolls to narrative pacing:
- "A stretch of 3+ turns without a roll usually means something was given away for free"
- "After a social exchange reveals key intel, consider whether that NPC would really have given it up without being read"

**v4 (fail-forward emphasis):** Emphasize that rolls create drama, not barriers:
- "Rolls don't block progress — they shape HOW progress arrives. A failed Insight check means the player gets the info through a worse channel"
- "Missing a roll means missing a chance for the dice to make the story surprising"

### Harness operation

```
node .scratch/sf2-tui/roll-discipline-experiment.mjs \
  --export /path/to/playthrough-export.json \
  --variant v0 \
  --scenarios all \
  --dry-run        # show scenarios without calling API
```

Modes:
- `--dry-run`: extract and display scenarios, no API calls
- `--variant <name>`: run a specific protocol variant (default: v0)
- `--scenarios <spec>`: `all`, `missed-only`, `rolled-only`, or comma-separated turn numbers
- `--compare v0,v1,v2`: run multiple variants and produce comparison table

Output per scenario:
```
Turn 15 | gate: npc_information (expected) | ground truth: NO ROLL
  v0: NO ROLL — "The office is small in the way that authority..."
  v1: ROLL (Insight DC 14) — "Toussaint's expression is carefully neutral..."
  v2: ROLL (Persuasion DC 13) — "The station chief gestures you inside..."
```

### Success criteria

A good protocol variant should:
1. Call rolls on ≥80% of `expected`-binding gates (currently ~43%)
2. Not over-roll: shouldn't add rolls where no gate fired
3. Keep narrative quality — rolls should feel organic, not mechanical
4. Maintain genre voice — the roll request should enhance the scene, not interrupt it
5. Have good `why` and `consequence_on_fail` quality on called rolls

## Files to create

- `.scratch/sf2-tui/roll-discipline-experiment.mjs` — main harness
- `.scratch/sf2-tui/roll-discipline/extract-scenarios.mjs` — scenario extractor
- `.scratch/sf2-tui/roll-discipline/protocol-variants.mjs` — protocol text variants
- `.scratch/sf2-tui/roll-discipline/results/` — output directory

## Dependencies

- Live Anthropic API key (BYOK via `ANTHROPIC_API_KEY` env var)
- A playthrough export JSON file (the Forty Thousand one at minimum)
- The campaign brief text (loaded from `content/sf2/campaign-briefs/`)

## Notes

- The experiment does NOT need to resolve rolls or run the archivist — it only needs to observe whether `request_roll` is called and evaluate the quality of the narrator's output up to that point
- Each scenario is a single API call — no multi-turn state needed
- Token cost: ~10K input per scenario (brief + transcript prefix + snapshot + protocol), ~1-2K output. At 13 scenarios × 4 variants = ~52 calls, roughly ~600K input tokens + ~100K output tokens total
- The roll gate system (`roll-gates.ts`) is the ground truth oracle — it already runs on every turn in production and classifies player inputs

## Confound: stat mismatch in the Forty Thousand export

All 6 rolls in this playthrough had `modifier: 0` because the narrator used custom brief stat names (`Scan`, `Insight`, `Charm`) that the roll resolver couldn't map to STR/DEX/CON/INT/WIS/CHA. This is already fixed by the stat standardization ticket (#10).

This matters for the experiment in two ways:

1. **Separate questions.** Roll frequency (did the narrator call at the right moments?) is independent of roll quality (did the modifier resolve correctly?). This experiment tests frequency only. The +0 issue is orthogonal and already addressed.

2. **Possible feedback loop.** If the narrator observed mid-conversation that every roll produced a bare d20 with no modifier, it may have become less inclined to call rolls — treating them as mechanically meaningless. The stat fix alone might improve roll frequency even without protocol changes. A good first step is to run the experiment against a NEW playthrough on the standardized briefs and compare frequency vs. the Forty Thousand baseline.

## Risk

- Protocol changes that increase roll frequency might harm pacing in other playthrough types (social-heavy, downtime, etc.). The experiment should include scenarios from different genres once we have more exports.
- Over-indexing on one playthrough's patterns. The Forty Thousand run is heavily investigation/social — combat-heavy runs might need different tuning.
- Turn 12's `explicit_roll` hard gate is a false positive: the player asked MIRA (ship AI) for analysis, not for a skill check. The regex pattern in `roll-gates.ts` fires on word shape, not intent. The experiment should note this as a known noisy scenario rather than treating it as a true miss.
