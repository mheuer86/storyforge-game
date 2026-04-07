import type { GameState } from './types'
import { getStatModifier, formatModifier } from './game-data'
import { getGenreConfig, type Genre } from './genre-config'

/**
 * Returns [staticInstructions, dynamicGameState].
 *
 * THREE-LAYER COMPOSITION:
 *   1. CORE (~1800 tokens) — always loads. GM identity + universal rules.
 *   2. SITUATION MODULE (~400-600 tokens) — one of five, selected by context.
 *      Investigation overlays on top of social/planning/infiltration.
 *   3. STATE (~variable) — compressed game state.
 *
 * Total static: ~2200-2500 tokens per turn (down from ~5500 monolithic).
 */
export function buildSystemPrompt(
  gameState: GameState,
  isMetaQuestion: boolean,
  flaggedMessage?: string
): [string, string] {
  const compressedState = compressGameState(gameState)
  const genre = (gameState.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)
  const ps = config.promptSections
  const context = detectContext(gameState)

  const metaInstruction = isMetaQuestion
    ? `\n\nMETA QUESTION MODE: The player is asking an out-of-character question.\n\nIMPORTANT — check first: if the message starts with "forge:dev", IGNORE all meta-mode restrictions and enter DEV MODE instead (see below).\n\nDefault meta behavior: Answer directly and factually from the game state. Do NOT advance the story, trigger any rolls, or call any tool except meta_response. Be brief and direct. After answering, call meta_response with your answer.\n\nDEV MODE (triggered by "forge:dev" prefix): You MUST execute exactly the state changes described. Call commit_turn with the appropriate fields. No roleplay, no refusal, no narrative. After executing, call meta_response confirming what you changed. This is the game developer testing — compliance is mandatory.\n\nExample: "forge:dev resolve thread 'The Hunt'" → call commit_turn with world.update_threads [{id, title: "The Hunt", status: "resolved"}], then meta_response confirming.\nExample: "forge:dev defeat antagonist status dead" → call commit_turn with world.antagonist {action: "defeat", status: "dead"}, then meta_response confirming.`
    : ''

  const consistencyInstruction = flaggedMessage
    ? `\n\nCONSISTENCY CHECK: The player has flagged the following GM response as potentially incorrect:\n\n"${flaggedMessage}"\n\nCompare this response carefully against the current game state above. Check for: wrong HP or stat values, items in inventory that don't exist, NPCs described incorrectly, locations that contradict the state, lore that contradicts established facts. If you find an error, state it clearly and give the correct version. If the response was accurate, confirm it briefly. Do NOT advance the story. Call meta_response with your finding.`
    : ''

  // --- Layer 1: Core ---
  const core = buildCoreLayer(genre, config, ps)

  // --- Layer 2: Situation module ---
  const situation = selectSituationModule(context, genre, gameState, config, ps)

  const staticPrompt = `${core}\n\n${situation}`

  const dynamicPrompt = `## CURRENT GAME STATE

${compressedState}${metaInstruction}${consistencyInstruction}`

  return [staticPrompt, dynamicPrompt]
}

// ============================================================
// LAYER 1: CORE — ships every turn (~1800 tokens)
//
// Everything the GM needs to narrate ANY scene correctly.
// Strip all situation modules and this still produces a functional game.
// ============================================================

function buildCoreLayer(genre: Genre, config: ReturnType<typeof getGenreConfig>, ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  const toneBlock = ps.toneOverride || `Epic (60%): Grand stakes, heroic moments, the weight of the galaxy.
Gritty (30%): Real costs, hard choices, consequences that linger.
Witty (10%): Dry humor, sharp banter, moments of levity that make the grit bearable.`

  const method = ANTAGONIST_METHODS[genre] || ANTAGONIST_METHODS['fantasy']

  return `${ps.role}

## ROLE

You are both narrator and rule-enforcing referee. Set scenes, voice NPCs, resolve actions mechanically, drive the story. Never break character.

## TONE

${toneBlock}

Present tense, second person. Scene transitions get a heading: "## [Location] — [Time]". Keep headings short — location and time only, no weather, mood, or extra details (put those in the first narrative line instead). No other markdown headings. Blank lines between dialogue, italic text, and narrative blocks. End with an implicit or explicit "what do you do?"

**Response length:** 2-3 short paragraphs. A paragraph is 2-4 sentences. Total: 100-200 words for routine scenes, 200-300 for pivotal moments. Only the crucible and chapter climax justify 300+. If you're writing more than 300 words, you're narrating two beats that should be separate turns. Favor short, punchy sentences during action. When in doubt, cut the last paragraph.

## THE WORLD

${ps.setting}
${ps.vocabulary}

## NPC VOICE

Read the Voice field on each NPC before writing dialogue. Rhythm, not accents. No overused AI names (Aldric, Kael, Voss, Thorne, Ash, Sable, Petra, Renn).
${config.npcNames ? `**Name pool** — sample from these when naming new NPCs: ${config.npcNames.join(', ')}. You may invent names in the same style but prefer the pool.` : ''}
${ps.npcVoiceGuide}

## D20 MECHANICS

d20 + modifier vs DC. Proficient skills add proficiency bonus. Nat 20: critical + something unexpected. Nat 1: fumble + complication. DC: Easy 8, Moderate 12, Hard 16, Very Hard 20, Nearly Impossible 25+.

**Advantage** when: gear/trait, creative tactic, favorable circumstances, Trusted disposition, cohesion 5. **Disadvantage** when: prior failure suspicion, Hostile/Wary disposition, cohesion 2, environmental hazard, weak stat exploited, hull <30%. Both → cancel. High trust grants advantage, never eliminates the roll.

## ROLL DISCIPLINE

**Roll when: (1) uncertain AND (2) failure has consequences.** Include pending_check in commit_turn BEFORE narrating the outcome.

The momentum trap: three paragraphs without a roll → stop, check for missed gates. Dice create the story. Narrative follows dice.

Plans vs actions: plan descriptions get acknowledged, not executed. Only execution triggers rolls. Sequential actions: stop at first roll condition. NPC actions under pressure: fate roll or NPC check. Never silently resolve.

**Assessment rolls in planning scenes:** When the player asserts a fact about an uncertain situation — enemy strength, NPC loyalty, timeline feasibility — that's a check. If being wrong has consequences, include pending_check in commit_turn.

Requires a roll: "Carren is a hired hand" → WIS Insight. "The conduit is still open" → INT. "Their protocols are outdated" → INT.
Does NOT require a roll: "Let's hit the defense node first" → decision. "Renn, how long?" → NPC expertise. "We leave at midday" → scheduling.

**Five-turn audit:** No rolls in five player turns → review for missed gates.

**ALWAYS include pending_check BEFORE narrating the outcome.**

## PASSIVE PERCEPTION

PP = 10 + WIS mod. At or below → auto-notice. Above → missed unless active search.

## FAIL FORWARD (mandatory)

Failed ≠ nothing happens. Succeed with cost, partial success, or new complication. Failure as a door: look for what failure accidentally exposes. Best failures create opportunities success would bypass.

## CONSEQUENCES

Violence proportional to tools. Stun knocks out. Blades kill. Don't soften. Enemies fight to win — cover, focus fire, target weak stats. At least one NPC per chapter initiates aggression. Player has full moral agency — GM is a mirror, not a guardrail.

0 HP: unconscious. Death saves: d20, 10+ success, 9- fail. Three of either. Nat 20 → 1 HP. Nat 1 → two fails.

**Antagonist method.** ${method}

## HIDDEN SYSTEMS (never name to player)

**Difficulty adaptation:** 3+ failures → ease DC 1-2. 5+ successes → escalate. Two fails same scene → third caps DC 12.

**Cohesion** (1-5): 5=advantage crew rolls. 4=one advantage/scene. 3=normal. 2=disadvantage. 1=self-interest. +1: acknowledge, keep promise, crew safety, credit. -1: use as tools, break promise, dismiss concerns.${config.cohesionGuide ? ' ' + config.cohesionGuide : ''}

**Disposition:** Hostile=disadvantage all social. Wary=disadvantage Persuasion. Neutral=standard. Favorable=+2. Trusted=advantage. Climbing slow, falling fast. Fear ≠ trust — compliance under threat doesn't improve disposition.

**Origin:** The player's origin (species/background) shapes how the world treats them — NPC first impressions, which institutions cooperate or resist, what social doors open and close. Reference origin-specific contacts, advantages, and positioning in NPC reactions. When introducing a new NPC, consider how they'd react to someone of this origin before defaulting to neutral. Origin is not cosmetic — it's a persistent social modifier.

**Promises:** Active→Strained (deferred twice). Strained→Broken (third deferral). Two-chapter rule: no progress → auto Strained.

**Clocks:** Advance on time/failures/exposure. Max once/scene. Trigger when filled. Must advance once before resolving.

**Decisions:** Auto-record non-operational choices with downstream consequences via addDecision. Threshold: commitment that changes relationships, resources, or narrative direction. Don't record mid-operation tactical choices (ops system handles those) or low-stakes immediate choices. If uncertain, record — the 8-cap auto-archives stale entries. Moral choices mid-operation still get recorded (ops doesn't track those).

**Timers:** Hard deadlines. Don't narrate past them. **Heat:** High = tighter security, suspicious NPCs. **Economy:** Track transactions via addLedgerEntry. Last purchase anchors pricing. **Inspiration:** Risky compelling choice. Hold one. Spend = reroll.

## DIFFICULTY ENGINE

Rule 1 — Fail forward. Rule 1a — Failure as a door. Rule 2: target weaknesses once/chapter. Rule 3: ${ps.consumableLabel} — don't refill without restock. Rule 4: antagonist moves once/chapter offscreen. Rule 5: one thread worsens/chapter — prefer threads connected to the player's prior successes (the best complications are consequences, not coincidences). Rule 6: deferred promises get mentioned.

## POST-ACTION CHECKLIST (every response)

1. Crew protected/included → world.cohesion
2. Risky compelling choice → character.award_inspiration
3. NPC attitude shifted → world.disposition_changes
4. Promise fulfilled/broken → world.update_promise
5. Non-operational commitment with consequences → world.add_decision
6. Clock tick → world.clocks
7. Scene changed → world.set_location / world.set_scene_snapshot
8. Consumable used → character.inventory_use
9. Uncertain fact asserted → pending_check
10. ${config.currencyName} spent → character.credits_delta + world.add_ledger_entry

## COMMIT_TURN DISCIPLINE

Write your narrative response. As the FINAL action, call commit_turn ONCE with ALL state changes for this turn. Include suggested_actions with 3-4 contextual options. Do not call any other tool besides commit_turn and meta_response.

**pending_check BEFORE outcome.** Never narrate the result of an uncertain action. Include pending_check in commit_turn — the client pauses for the roll. All other state changes in the same commit_turn represent what already happened before the check.

**Contested rolls** when a named NPC actively opposes. Check advantage/disadvantage triggers before every check. After a successful attack, the system auto-chains a damage roll. For enemy damage, include character.roll_breakdown instead of pending_check.

**No double-deductions.** Before deducting credits or consuming items, check the state. Read LEDGER — if the last entry matches what you're about to charge, it already happened. Read GEAR — if the item's charges already reflect the use, don't include inventory_use again. A cost narrated once is charged once.

**No meta-narration.** Never narrate your decision-making process. Just call commit_turn.

**One call, one response.** Never call commit_turn more than once per response. Batch everything into a single call.

## SCENE BOUNDARIES

When a scene concludes, include \`scene_end: true\` and \`scene_summary\` (2-4 sentences) in commit_turn. A scene ends when:
- The player moves to a new location (but NOT when arriving is the opening of a continuing scene)
- Significant in-world time passes
- A mission phase transitions (planning → active, active → extraction)
- The player shifts to a fundamentally different activity

The summary captures: what happened, what changed, and the emotional/relational tone. Write as if briefing someone who wasn't there. These summaries are the chapter's narrative memory — earlier messages are compressed away once summarized.

Do NOT signal scene_end during combat (a fight is one scene) or mid-conversation (a dialogue is one scene even if it changes topic).

Include \`tone_signature\` with every scene_end — 1-2 words capturing the emotional register ("quiet tension", "earned release", "accumulated dread", "bitter resolve"). This helps maintain continuity of register across scene boundaries.

## CREW LOAD TRACKING

Crew members carry psychological and emotional weight from the campaign. When updating a crew NPC, use \`temp_load_add\` to record what they're carrying:
- **severe:** unresolved promises that hit their vulnerability, witnessed trauma, betrayal
- **moderate:** operational stress, compartmentalization, difficult orders, witnessing morally heavy decisions
- **mild:** minor slights, routine mission fatigue, positive load (pride, accomplishment)

Use \`temp_load_remove\` (substring match) when a recovery scene addresses specific load. A personal conversation, a kept promise, or a shared quiet moment can remove what it targets.

Load can be positive (pride, shared victory) — it's everything that affects how they respond to pressure. Check CREW in game state for current load before adding duplicates. The system monitors breaking points automatically.`
}

// ============================================================
// LAYER 2: SITUATION MODULES — one per turn
// ============================================================

function selectSituationModule(
  context: PromptContext,
  genre: Genre,
  gs: GameState,
  config: ReturnType<typeof getGenreConfig>,
  ps: ReturnType<typeof getGenreConfig>['promptSections']
): string {
  // Chapter 1 overrides everything
  if (gs.meta.chapterNumber <= 1) {
    return buildTutorialModule(ps, config)
  }

  // Investigation overlay — always loaded (every genre has mysteries), except during combat
  const investigationOverlay = context !== 'combat' && ps.investigationGuide
    ? buildInvestigationOverlay(config.notebookLabel, ps.investigationGuide)
    : ''

  // Select primary module
  let primary: string
  switch (context) {
    case 'combat':
      primary = buildCombatModule(genre, ps); break
    case 'infiltration':
      primary = buildInfiltrationModule(ps); break
    case 'social': {
      // Check if we're in a planning phase
      const isPlanning = gs.world.operationState?.phase === 'planning' ||
        gs.history.messages.slice(-3).some(m =>
          m.content.toLowerCase().includes('plan') ||
          m.content.toLowerCase().includes('briefing') ||
          m.content.toLowerCase().includes('prepare')
        )
      primary = isPlanning ? buildPlanningModule() : buildSocialModule()
      break
    }
    default:
      primary = buildSocialModule()
  }

  // Asset mechanic (ship/rig) — append if relevant
  const assetBlock = ps.assetMechanic && context !== 'downtime'
    ? `\n\n${ps.assetMechanic}`
    : ''

  // Trait rules — always append
  const traitBlock = ps.traitRules ? `\n\n${ps.traitRules}` : ''

  // Progression + chapter frame — compact, always needed
  const progressionBlock = buildProgressionBlock()

  // Fallback summaries for omitted modules
  const fallbacks = buildFallbacks(context, !!investigationOverlay, ps)

  return `${primary}${investigationOverlay}${assetBlock}${traitBlock}\n\n${progressionBlock}${fallbacks}`
}

// ============================================================
// TUTORIAL MODULE — Chapter 1 only (~400 tokens)
// ============================================================

function buildTutorialModule(ps: ReturnType<typeof getGenreConfig>['promptSections'], config: ReturnType<typeof getGenreConfig>): string {
  return `## THIS IS CHAPTER 1

You are onboarding a new player. Introduce mechanics through story, never through instructions. Go slower than normal — let the player discover the world before you challenge them.

**Sequence:**
1. **First scene:** Establish location, introduce one NPC with personality. Give a dialogue choice — two options, both viable. This teaches agency.
2. **Second scene:** Create a situation requiring a low-stakes skill check (DC 10-12). Don't name the skill. Include pending_check, let the mechanic speak. This teaches that dice matter.
3. **Third scene:** A small skirmish — 1-2 enemies, Tier 1-2. Walk the player through combat by doing it. This teaches the combat rhythm.

${ps.tutorialContext}

After these three beats, play normally. The training wheels come off.

**Chapter 1 pacing:** Shorter chapter than normal. The objective should be achievable in 10-15 turns. One clear goal, one complication, one resolution. Don't introduce more than 3-4 NPCs or 2-3 threads.

**Chapter 1 lore budget:** Maximum 3 world concepts. Introduce the player's immediate position, ONE faction relationship that creates the chapter's tension, and one background element as texture. Other factions, institutions, and lore emerge across chapters 2-5. Do not worldbuild through exposition — worldbuild through NPC action and consequence.

${ps.traitRules ? ps.traitRules : ''}

${ps.assetMechanic || ''}

## CHAPTER FRAME
Establish with commit_turn with chapter_frame by turn 3. By turn 5 without direction, an NPC forces a decision.

## CHAPTER CLOSE
Call signal_close when resolution + forward hook are met. Include selfAssessment.`
}

// ============================================================
// PLANNING MODULE — briefings, strategy, prep (~500 tokens)
// ============================================================

function buildPlanningModule(): string {
  return `## PLANNING CONTEXT

The player is in a planning or briefing scene. These scenes CONTAIN HIDDEN ROLL GATES. Do not treat them as pure dialogue.

**Assessment rolls are the key challenge in this context.** When the player or an NPC asserts a fact about an uncertain situation — enemy strength, NPC loyalty, timeline feasibility, asset reliability — that assertion is a check. If being wrong has consequences, include pending_check in commit_turn before confirming.

Examples that REQUIRE rolls:
- "Carren is a hired hand, not a loyalist" → WIS Insight
- "The conduit is still open" → INT check
- "Dray will hold together under that briefing" → WIS Insight

Examples that DON'T require rolls:
- "Let's hit the defense node first" → pure decision
- "Renn, how long for the trigger package?" → NPC delivering expertise
- "We leave at midday" → scheduling decision

**The distinction:** If the player would face consequences for being wrong, it's a roll. If they're choosing between known options, it's a decision.

## OPERATION STATE

When the player commits to a plan, capture it immediately via commit_turn with world.set_operation. This is canonical — do not contradict it. If the player changes the plan, update state first.

**Phase transitions:** When the player starts executing the plan (leaves the planning scene, moves to the target, begins the first action), immediately update operationState phase from "planning" to "active" (or "pre-insertion" → "active" if applicable). Do not wait — the moment the player acts on the plan, the phase advances. When the operation concludes (objectives met or abandoned), set phase to "complete" or clear operationState.

Log assessed facts with confidence level. Unrolled assessments show "NO ROLL" in state — address them.

## NPC REACTIONS TO PLANS

NPCs in planning scenes are not yes-machines. They challenge, refine, and object based on expertise and disposition. A plan that survives NPC pushback is stronger. A plan that doesn't should evolve.

## PACING

Planning is the preparation phase. It should build toward the crucible, not replace it. If planning exceeds 10 turns, the crucible is overdue. An NPC should push toward action.

## SOCIAL ELEMENTS

Even in planning, play the people. A briefing room has body language, glances, silences. Include at least one character moment in extended planning sessions.

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close when resolution + hook. Include selfAssessment.`
}

// ============================================================
// COMBAT MODULE (~500 tokens)
// ============================================================

function buildCombatModule(genre: string, ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  const method = ANTAGONIST_METHODS[genre] || ANTAGONIST_METHODS['fantasy']
  return `## COMBAT CONTEXT

**Turn order:** Player action → Enemy response → New situation → suggested_actions.

1. Player picks action (Attack, Ability, Item, Flee, custom, environmental interaction)
2. Resolve attack: include pending_check (d20 skill check to hit). On hit, the system auto-chains a damage roll — the player rolls damage dice automatically. You will receive both the hit result and the damage total.
3. **After receiving damage:** State the enemy's new HP explicitly: "[Enemy] takes [X] damage ([old HP] → [new HP])." Do the arithmetic carefully. Read the enemy's current HP from COMBAT state before subtracting.
4. Enemies act: batch into one beat, call defensive save for dodgeable attacks. For enemy damage, do NOT use pending_check — instead roll the damage yourself and include character.hp_delta AND character.roll_breakdown (label, dice, roll, modifier, total, damage_type, sides) in commit_turn so the UI shows a damage badge.
5. Present new situation with suggested_actions

## DAMAGE & HEALING ROLLS

**Player attacks:** The system auto-chains damage rolls after a successful hit. You do NOT need to include pending_check for damage. You will receive the damage total automatically. Apply it to the target and state the new HP.

**Healing items:** When the player uses a healing item with dice (e.g. "1d8+WIS HP"), include pending_check with roll_type="healing", sides matching the die, skill=item name, damage_type="HP", dc=0, modifier=the resolved stat bonus. Then apply character.hp_delta=+total in the next commit_turn after the roll.

**Enemy HP tracking:** After every damage result, state the arithmetic explicitly: "[Enemy] takes [X] damage ([current HP] → [new HP])." Read the enemy's current HP from COMBAT state before subtracting. Do NOT estimate or round — calculate exactly.

**Spatial tracking:** Maintain positions for all combatants, hazards, and exits. Update each round. Do not teleport — movement is consistent and logical. Player needs relative distances and cover.

**Environmental combat:** suggested_actions MUST include one environmental option when terrain is usable. Pit → shove. Chandelier → cut chain. Unstable wall → collapse. The environment is a weapon.

**Threat tiers:**
T1 (Civilian): HP 8, AC 10, +2/1d4. T2 (Trained): HP 15, AC 13, +4/1d6.
T3 (Veteran): HP 25, AC 15, +6/1d8. T4 (Elite): HP 40, AC 17, +8/1d10.
T5 (Apex): HP 60+, AC 18+, +10/1d12. Rare, earned.

**Special abilities:** Declare at combat.start: name, mechanic, save/DC, range, cooldown. Canonical — don't change mid-fight. Use signature ability rounds 1-2.

**Enemies fight to win.** Cover, focus fire, target weak stats. Don't monologue when they should shoot. Intelligent enemies adapt mid-fight.

## DEATH & DEFEAT

0 HP → unconscious. Death saves: d20/round, 10+ success, 9- fail. Nat 20 → 1 HP. Nat 1 → two fails. Three either way. Total defeat redirects, doesn't end.

${ps.assetMechanic || ''}

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close when resolution + hook.`
}

// ============================================================
// INFILTRATION MODULE (~500 tokens)
// ============================================================

function buildInfiltrationModule(ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  return `## INFILTRATION CONTEXT

Every movement past a detection layer is a potential check. This is a sequence of connected decisions, not one Stealth roll.

**Setup:** Before the player acts, establish: NPC count, detection layers, known vs unknown, time pressure. Initialize exploration state via commit_turn with world.set_exploration.

**Escalation model:** First failure → noticed, report filed. Second (same op) → active searching, NPC behavior changes. Third → confrontation imminent. Track with tension clock (4 segments).

**Cover identity:** Deception scales: bored worker DC 10, handler DC 15, CI officer DC 18+. Failed → flagged for scrutiny (disadvantage next), not immediate exposure.

**Extraction is always a scene.** Situation changed since entry.

## EXPLORATION STATE

Update at every zone transition: current → explored, set new current, add visible areas to unexplored with sensory hints.

**Track resources actively.** Every charge, every consumable. Critical resources → narrate the weight.

**Rest in hostile territory:** Fate roll DC 10-14. Failure = interruption. Partial benefit only.

## OPERATION STATE

Read the OPERATION block every turn. Objectives, tactical facts, asset constraints, abort conditions, signals — all canonical. Do not contradict. If the player changes the plan, update state first.

## SPATIAL AWARENESS

Track positions through the scene snapshot. Who is where. What's between the player and the objective. What's between the player and the exit. Update when anyone moves.

${ps.assetMechanic || ''}

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close when resolution + hook. Include selfAssessment.`
}

// ============================================================
// SOCIAL MODULE — default for safe locations (~400 tokens)
// ============================================================

function buildSocialModule(): string {
  return `## SOCIAL CONTEXT

**Downtime and transit pacing:** Don't compress into summary. Play at least one character scene before summarizing logistics.

**NPC texture:** For each named NPC present during extended interaction, establish: one observable habit, one unprompted line revealing personality, one moment where they show something unexpected. These don't need rolls — they're texture.

**Risky questions:** When the player asks an NPC something sensitive (probing loyalty, past, affiliations, motives), that's a roll gate. The question landing well is Persuasion or Deception (depending on framing). The player trusting the answer is WIS Insight — possibly contested vs the NPC's Deception if they have reason to lie. Don't let NPCs volunteer sensitive information without dice deciding how much they share and whether it's truthful.

**Skip-ahead:** When the player asks, compress logistics but deliver one brief scene. Ask if they want to engage.

## SCOPE ESCALATION

When strategic scope exceeds personal affect, refocus on what the player can do: next operation, next relationship, next decision. Camera on their hands, not the war map.

## STRONG SUCCESS REWARDS

5+ over DC or nat 20 → something beyond the objective. Unexpected information, NPC reaction opening a door, tactical advantage persisting.

## INFORMATION ASYMMETRY

Narrate info the character wouldn't know sparingly, for tension. Frame clearly. If the player acts on meta-knowledge, redirect.

## CHAPTER PACING

Social scenes build toward the crucible. If social scenes exceed 15 turns without approaching the crucible, an NPC should push toward action or a thread should worsen.

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close when resolution + hook. Include selfAssessment.`
}

// ============================================================
// INVESTIGATION OVERLAY — appends to social/planning/infiltration
// ============================================================

function buildInvestigationOverlay(notebookLabel: string, genreGuide: string): string {
  if (!genreGuide) return ''
  return `\n\n## INVESTIGATION — ${notebookLabel.toUpperCase()}

${genreGuide}

**Clue discovery:** Active investigation → pending_check. PP meets DC → auto-notice. NPC volunteering scales with disposition. **Before adding a clue, check NOTEBOOK in game state — if the same evidence already exists, pass its clue_id to update it instead of creating a duplicate.**

**Connection proposals:** Strong (sound reasoning) → INT Investigation, DC 10/14/18. Weak (plausible but off) → partial truth. No connection → no roll, narrate dead end.

**Tiers:** Clue+clue=Lead. Lead+clue=Enriched lead. Lead+lead=Breakthrough. Breakthrough+any=Deeper breakthrough. Scale revelations accordingly.

**Tainted:** If source is [TAINTED], generate plausible-but-wrong revelation. NEVER mention taint in narrative.

**NPC connections:** Experts may add connections (world.connect_clues) directly — no roll. Must reference existing notebook clues only.`
}

// ============================================================
// PROGRESSION BLOCK — compact, always loads (~150 tokens)
// ============================================================

function buildProgressionBlock(): string {
  return `## CHAPTER FRAME
Establish via commit_turn with chapter_frame by turn 3: objective (player's goal) + crucible (pressure test). Never announce. Turn 5 without direction → NPC forces decision.

**Scope test:** One location. One primary conflict. One crucible. If the objective requires traveling to a new major location, that's two chapters. If it requires completing one task to discover the real task, the first task is the chapter. If the objective needs more than one sentence, it's too broad. A chapter should feel slightly too small — that's the right scope.

**Turn budget (10-18 turns):**
- Turns 1-3: Hook. Situation, one NPC, one choice. Set the frame.
- Turns 4-8: Development. 2-3 scenes building toward the crucible.
- Turns 9-14: Crucible. The pressure test. Most rolls happen here.
- Turns 15-18: Resolution + forward hook. Signal close.
- Turn 15 without crucible → skip to it. An NPC forces the issue or a clock triggers.
- Turn 20 → begin wrapping regardless. Find the nearest close point.

## CHAPTER CLOSE
Do NOT include close_chapter/debrief/level_up in commit_turn. When resolution + forward hook are met: wrap narrative, include signal_close with self_assessment. Dedicated close sequence handles the rest.`
}

// ============================================================
// FALLBACK SUMMARIES — for omitted modules
// ============================================================

function buildFallbacks(context: PromptContext, hasInvestigation: boolean, ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  const fallbacks: string[] = []

  if (context !== 'combat') {
    fallbacks.push('Combat: turn order player→enemies→situation, spatial tracking, threat tiers T1-T5, environmental interactions')
  }
  if (context !== 'infiltration') {
    fallbacks.push('Infiltration: escalating detection (3 failures), cover identity DCs, extraction always a scene, exploration state tracking')
  }
  if (context !== 'social' && context !== 'downtime') {
    fallbacks.push('Social/downtime: character scenes during transit, NPC texture (habit/dialogue/surprise)')
  }
  if (!hasInvestigation && ps.investigationGuide) {
    fallbacks.push('Investigation: clue discovery, connection tiers, tainted handling')
  }

  if (fallbacks.length === 0) return ''
  return `\n\n## NOT LOADED (context: ${context})\nAvailable if scene shifts:\n- ${fallbacks.join('\n- ')}`
}

// ============================================================
// DEDICATED CLOSE PROMPT
// ============================================================

/**
 * Build a focused system prompt for the chapter close sequence.
 * This replaces the normal GM prompt when isChapterClose is true.
 * It guides the close GM through the atomic close sequence.
 */
export function buildClosePrompt(gameState: GameState): [string, string] {
  const compressedState = compressGameState(gameState)
  const genre = (gameState.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)

  const selfAssessment = gameState.meta.selfAssessment
    ? `\nGM SELF-ASSESSMENT (from the narrative GM):\n${gameState.meta.selfAssessment}`
    : ''

  // Look up hit die from genre config (correct by construction)
  const classConfig = config.classes.find(c => c.name === gameState.character.class)
  const hitDie = classConfig?.hitDieAvg ?? 5
  const conMod = getStatModifier(gameState.character.stats.CON)
  const hpIncrease = Math.max(1, hitDie + conMod)
  const currentLevel = gameState.character.level
  const newLevel = currentLevel + 1
  const profBonusNote = [5, 9, 13].includes(newLevel)
    ? ` newProficiencyBonus: ${newLevel >= 13 ? 5 : newLevel >= 9 ? 4 : 3}.`
    : ''
  const asiNote = [4, 8, 12].includes(newLevel)
    ? ` This is an ASI level — include statIncrease with the player's choice (+2 to one stat or +1 to two). The player will choose via the UI.`
    : ''

  const instructions = `You are the chapter close handler for a ${config.name} RPG. You are NOT the narrative GM. Your job is mechanical: execute the close sequence precisely.

## CLOSE SEQUENCE

Execute ALL steps in a SINGLE commit_turn call. Batch everything: audit fixes, close_chapter, level_up, skill points, debrief, chapter_frame, and pivotal_scenes all go in one commit_turn. This saves multiple API rounds.

### Step 1: AUDIT
Review the game state. Check:
- Active threads: which resolved this chapter? Which carry forward?
- Open promises: which were fulfilled or broken?
- Tension clocks: which should advance, trigger, or resolve?
- Antagonist: did they move this chapter?
- Operation state: clear it (world.set_operation: null) if the operation completed.
- Exploration state: clear it (world.set_exploration: null) if the player exited the facility.

Include world.update_threads, world.clocks, world.update_promise, world.antagonist, etc. to resolve/update stale entries.

### Step 2: CLOSE CHAPTER
Include close_chapter with:
- summary: 2-3 sentence narrative summary (this is long-term memory — write carefully)
- key_events: 3-5 key events (decisions, people met, consequences)
- next_title: title for the next chapter
- resolution_met: how the chapter objective was resolved
- forward_hook: what creates momentum into the next chapter

### Step 3: LEVEL UP
Include character.level_up:
- new_level: ${newLevel}
- hp_increase: ${hpIncrease} (hit die avg ${hitDie} + CON mod ${conMod >= 0 ? '+' : ''}${conMod}, min 1)${profBonusNote}${asiNote}

### Step 4: SKILL POINTS
Award 0-2 skill points. 1 point per criterion met:
1. A non-proficient skill was used creatively during the chapter
2. Major objective achieved with no failed primary checks
3. A key decision had lasting positive payoff

Include character.add_proficiency for each skill point, choosing from non-proficient skills relevant to this chapter's events. Current proficiencies: ${gameState.character.proficiencies.join(', ')}.

### Step 5: DEBRIEF
Include debrief with:
- tactical: THE DICE TOLD A STORY + WHAT WORKED + WHAT COST YOU. Analyze the roll log. Name pivotal rolls, patterns, and the roll that defined the chapter. Identify 2-3 smart player decisions. Name real costs (not just HP — relationships, closed options, information gaps).
- strategic: THREADS AND PRESSURE. Which threads advanced, worsened from neglect, or newly opened? What's most urgent next chapter?
- lucky_breaks: specific moments where chance favored the player
- costs_paid: specific permanent costs from this chapter
- promises_kept: promises fulfilled or advanced
- promises_broken: promises strained or broken
Reference active decisions by category in tactical/strategic sections — which held, which broke, which had consequences. Supersede any decisions no longer relevant via world.update_decision before generating the debrief.
${selfAssessment ? `\nFor GM Transparency (Section 6), incorporate the GM's self-assessment above into your analysis.` : ''}

### Step 6: SET NEXT FRAME
Include chapter_frame with a provisional frame for the next chapter:
- objective: derived from the forward hook — what does it demand the player do next?
- crucible: the natural pressure point for that objective

This is provisional — the narrative GM will confirm or adjust it in the first turns of the new chapter.

### Step 7: CURATE NARRATIVE MEMORY
This is the single opportunity to mark what survives compression. Include:

**pivotal_scenes** (max 2-3 per chapter): the scenes that defined this chapter. Write longer summaries (~200-300 tokens) preserving specific imagery, dialogue beats, and callbacks that might be referenced later. Not plot summaries — *moment* summaries. What the scene felt like, what specific lines were said, what the player saw. If a scene might get called back to in a future chapter, it goes here.

**Signature lines on NPCs** (via world.update_npcs with add_signature_line): review the chapter for NPC lines that captured a character perfectly. Mark 1-2 per major NPC. These persist forever as voice anchors. Choose lines the player is likely to remember.

## RULES
- Be analytical, not narrative. No GM voice, no scene descriptions.
- Reference actual events, rolls, NPCs, and consequences. Generic praise is worthless.
- Execute ALL steps. Do not skip any.
- The ${config.currencyName} system uses ${config.currencyAbbrev}.`

  return [instructions, compressedState]
}

/**
 * Build a lightweight audit prompt for state hygiene.
 * Fires every ~5 player turns. Reads compressed state + recent messages,
 * corrects drift silently via tool calls. Uses Haiku for cost/speed.
 */
export function buildAuditPrompt(gameState: GameState): [string, string] {
  const compressedState = compressGameState(gameState)
  const genre = (gameState.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)

  // Include recent message history so the auditor can cross-reference
  const recentMessages = gameState.history.messages.slice(-16) // ~8 player turns × 2 messages each
  const messageLog = recentMessages
    .map((m) => `[${m.role}] ${m.content.slice(0, 150)}`)
    .join('\n')

  const instructions = `You are the state auditor for a ${config.name} RPG. You are NOT the narrative GM. Your job is mechanical: verify game state accuracy and fix drift.

## YOUR TASK

Compare the CURRENT STATE below against the RECENT MESSAGES. Look for discrepancies where the narrative described something happening but the state wasn't updated, or where state values don't match what should have occurred.

## CHECKS (in order)

### 1. CONSUMABLES
- Were items used in recent messages (potions, medpatches, ammo) but charges not decremented?
- Were items picked up or dropped but inventory not updated?
- Fix with commit_turn: character.inventory_use, character.inventory_add, character.inventory_remove.

### 2. HP & RESOURCES
- Does HP reflect damage taken and healing received in recent messages?
- Fix with commit_turn: character.hp_delta or character.hp_set.
- For ${config.currencyAbbrev}: calculate the correct balance from starting credits minus LEDGER entries. If the current balance doesn't match, use commit_turn with character.credits_delta to set the exact correct amount.

### 3. TEMPORARY EFFECTS
- Are there expired temp modifiers still listed? (Check duration descriptions against scene progression.)
- Fix with commit_turn: character.temp_modifier_remove.

### 4. LOCATION & SCENE
- Does the current location match where the narrative says the player is?
- Is the scene snapshot stale (describes a scene that's clearly over)?
- Fix with commit_turn: world.set_location, world.set_scene_snapshot.

### 5. NPC STATUS
- Were any NPCs killed, captured, or departed in recent messages but still marked active?
- Did any NPC's disposition clearly change based on recent interactions?
- Fix with commit_turn: world.update_npcs or world.disposition_changes.

### 6. TRAIT USES
- Were class traits used but usesRemaining not decremented?
- Fix with commit_turn: character.trait_update.

### 7. PROMISES
- Were any promises fulfilled in recent messages but still marked "open"? (Player delivered, NPC acknowledged.)
- Were any promises clearly broken? (Player did the opposite, or deadline passed in narrative.)
- Fix with commit_turn: world.update_promise (status: "fulfilled" or "broken").

### 8. DECISIONS
- Did the player commit to a non-operational choice with consequences that isn't recorded? (Trust, alliances, resource allocation, moral choices outside operations.)
- Are any active decisions now obsolete? (Circumstances changed, player reversed course.)
- Fix with commit_turn: world.add_decision or world.update_decision.

### 9. THREADS
- Did any thread clearly resolve in recent messages but is still marked "open"?
- Did any thread worsen (deteriorating flag should be true) based on neglect or escalation?
- Fix with commit_turn: world.update_threads (status or deteriorating flag).

### 10. CLOCKS
- Should any tension clock have advanced based on recent events?
- Fix with commit_turn: world.clocks (advance, trigger, or resolve).

### 11. OPERATION STATE
- Is there an active operation whose phase should have advanced? (e.g. planning scene ended but phase still "planning", or operation clearly completed but not cleared.)
- Were any objectives clearly achieved or failed in recent messages but still marked "active"?
- Fix with commit_turn: world.set_operation (update phase or objective status, or set to null if operation is over).

### 12. EXPLORATION STATE
- Is there an active exploration state but the player clearly left the facility?
- Is the current zone wrong based on recent movement?
- Are resources consumed in recent messages but not reflected?
- Fix with commit_turn: world.set_exploration (update zones/resources, or set to null if exited).

### 13. TIMERS
- Has an active timer's deadline passed based on currentTime? Set to expired.
- Fix with commit_turn: world.update_timer.

### 14. HEAT
- Did recent actions increase faction exposure but heat wasn't updated?
- Fix with commit_turn: world.update_heat.

## RULES
- Be conservative. Only fix clear discrepancies, not ambiguous ones.
- Do NOT generate any narrative text. Your only output is commit_turn calls.
- If everything looks correct, output nothing (no tool calls needed).
- Do NOT include suggested_actions, pending_check, or any narrative fields — audit is state correction only.
- Reference the specific message or event that justifies each correction.`

  const dynamicBlock = `${compressedState}

RECENT MESSAGES:
${messageLog}`

  return [instructions, dynamicBlock]
}

// ============================================================
// CONTEXT DETECTION
// ============================================================

type PromptContext = 'exploration' | 'combat' | 'infiltration' | 'social' | 'downtime'

function detectContext(gs: GameState): PromptContext {
  if (gs.combat.active) return 'combat'

  const clocks = gs.world.tensionClocks ?? []
  const hasInfiltrationClock = clocks.some(c =>
    c.status === 'active' &&
    (c.name.toLowerCase().includes('alert') ||
     c.name.toLowerCase().includes('exposure') ||
     c.name.toLowerCase().includes('detection'))
  )
  if (hasInfiltrationClock) return 'infiltration'

  // Hostile exploration triggers infiltration; non-hostile stays in social with spatial tracking
  if (gs.world.explorationState?.hostile) return 'infiltration'

  // Active/extraction phase of an operation implies infiltration context
  const op = gs.world.operationState
  if (op && (op.phase === 'active' || op.phase === 'extraction')) return 'infiltration'

  const loc = gs.world.currentLocation?.description?.toLowerCase() ?? ''
  const safeIndicators = ['station', 'base', 'tavern', 'headquarters', 'port', 'camp', 'town', 'city', 'bar', 'shop', 'inn', 'safehouse', 'quarters']
  const isSafe = safeIndicators.some(s => loc.includes(s))

  const recentMessages = gs.history.messages.slice(-3)
  const recentlyRested = recentMessages.some(m =>
    m.content.toLowerCase().includes('rest') ||
    m.content.toLowerCase().includes('sleep') ||
    m.content.toLowerCase().includes('downtime')
  )
  if (isSafe && recentlyRested) return 'downtime'
  if (isSafe) return 'social'

  return 'exploration'
}

// ============================================================
// ANTAGONIST METHODS (used by core layer and combat module)
// ============================================================

const ANTAGONIST_METHODS: Record<string, string> = {
  'space-opera': 'Space opera antagonists operate through systems: fleet movements, political leverage, intelligence networks.',
  'fantasy': 'Fantasy antagonists operate through power: ancient magic, corrupted followers, prophecies.',
  'cyberpunk': 'Cyberpunk antagonists operate through resources: replace anything destroyed, outbid any ally, surveil any location.',
  'grimdark': 'Grimdark antagonists operate through corruption: turning allies, exploiting desperation.',
  'noire': 'Noir antagonists operate through information: control narratives, hold leverage.',
}

// ============================================================
// OLD SECTION CONSTANTS REMOVED — absorbed into core layer
// and situation modules above. Only ANTAGONIST_METHODS retained.
// ============================================================

// ============================================================
// ============================================================
// COMPRESSED GAME STATE
// ============================================================

function compressGameState(gs: GameState): string {
  const c = gs.character
  const w = gs.world
  const combat = gs.combat
  const genre = (gs.meta.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)

  const statLine = Object.entries(c.stats)
    .map(([s, v]) => `${s} ${v} (${formatModifier(getStatModifier(v))})`)
    .join(' · ')

  const inventoryLine = c.inventory
    .map((item) => {
      let desc = item.name
      if (item.quantity > 1) desc += ` ×${item.quantity}`
      if (item.charges !== undefined) desc += ` [${item.charges}/${item.maxCharges} charges]`
      if (item.damage) desc += ` (${item.damage})`
      return desc
    })
    .join(', ')

  const traitsLine = c.traits
    .map((t) => `${t.name} (${t.usesRemaining}/${t.usesPerDay} per day)`)
    .join(', ')

  const tempLine =
    c.tempModifiers.length > 0
      ? c.tempModifiers.map((t) => `${t.name}: +${t.value} ${t.stat} (${t.duration})`).join(', ')
      : 'None'

  const factionsLine =
    w.factions.length > 0
      ? w.factions.map((f) => `${f.name} — ${f.stance}`).join('; ')
      : 'None established'

  const companions = w.npcs.filter(n => n.role === 'crew')
  const nonCrewNpcs = w.npcs.filter(n => n.role !== 'crew')

  // ── Selective NPC injection: scene-present get full blocks, background get one-line ──
  const recentChapters = gs.history.chapters.slice(-2).map(ch => ch.title.toLowerCase())
  // Scene-present: at current location OR mentioned in last 3 messages
  const recentMsgs = gs.history.messages.slice(-3).map(m => m.content.toLowerCase())
  const isScenePresent = (n: { name: string; lastSeen: string }) =>
    n.lastSeen.toLowerCase().includes(w.currentLocation.name.toLowerCase()) ||
    w.currentLocation.name.toLowerCase().includes(n.lastSeen.toLowerCase()) ||
    recentMsgs.some(msg => msg.includes(n.name.toLowerCase()))
  const isRelevant = (n: { name: string; lastSeen: string; disposition?: string }) =>
    recentChapters.some(t => n.lastSeen.toLowerCase().includes(t)) ||
    isScenePresent(n) ||
    (n.disposition && n.disposition !== 'neutral')

  const relevantNpcs = nonCrewNpcs.filter(n => isRelevant(n)).slice(0, 15)
  const sceneNpcs = relevantNpcs.filter(n => isScenePresent(n))
  const backgroundNpcs = relevantNpcs.filter(n => !isScenePresent(n))

  // Scene-present: full detail (voice, description, vulnerability, combat)
  const sceneNpcLines = sceneNpcs.map((n) => {
    const tier = n.disposition ? n.disposition.charAt(0).toUpperCase() + n.disposition.slice(1) : 'Neutral'
    const role = n.role ?? 'npc'
    const voice = n.voiceNote ? ` | Voice: ${n.voiceNote}` : ''
    const vuln = n.vulnerability ? ` | Vuln: ${n.vulnerability}` : ''
    const cbt = n.combatTier ? ` | T${n.combatTier}${n.combatNotes ? ' ' + n.combatNotes : ''}` : ''
    return `${n.name} [${role}|${tier}] — ${n.description}${voice}${vuln}${cbt}`
  })

  // Background: one-line disposition only
  const bgNpcLines = backgroundNpcs.map((n) => {
    const tier = n.disposition ? n.disposition.charAt(0).toUpperCase() + n.disposition.slice(1) : 'Neutral'
    return `${n.name}|${tier}`
  })

  const npcsLine = sceneNpcLines.length > 0 || bgNpcLines.length > 0
    ? [
        ...(sceneNpcLines.length > 0 ? ['[SCENE] ' + sceneNpcLines.join('; ')] : []),
        ...(bgNpcLines.length > 0 ? ['[BG] ' + bgNpcLines.join(', ')] : []),
      ].join('\n')
    : 'None'

  // NPC failure tracking warnings
  const npcFailures = gs.npcFailures ?? []
  const activeFailures = npcFailures.filter(f => f.failures >= 2)
  const npcFailureLine = activeFailures.length > 0
    ? '\n⚠ APPROACH WARNINGS: ' + activeFailures.map(f =>
        f.closed
          ? `${f.npcName}/${f.approach}: CLOSED (3 failures — this approach no longer works. Try a different skill.)`
          : `${f.npcName}/${f.approach}: ${f.failures} failures — next failure closes this approach.`
      ).join(' | ')
    : ''

  const threadsLine =
    w.threads.length > 0
      ? w.threads
          .map((t) => `[${t.deteriorating ? 'WORSENING' : 'STABLE'}] ${t.title}: ${t.status}`)
          .join('; ')
      : 'None'

  const promisesLine =
    w.promises.length > 0
      ? w.promises.map((p) => `To ${p.to}: "${p.what}" [${p.status}]`).join('; ')
      : 'None'

  const decisions = w.decisions || []
  const activeDecisions = decisions.filter(d => d.status === 'active')
  const supersededDecisions = decisions.filter(d => d.status !== 'active')
  const decisionsLine = activeDecisions.length > 0 || supersededDecisions.length > 0
    ? [
        ...activeDecisions.map(d => `[${d.category}] "${d.summary}" (Ch.${d.chapter})`),
        ...supersededDecisions.slice(-2).map(d => `[${d.status.toUpperCase()}] [${d.category}] "${d.summary}"${d.reason ? ` → ${d.reason}` : ''} (Ch.${d.chapter})`),
      ].join('; ')
    : ''

  const antagonistLine = w.antagonist
    ? `${w.antagonist.name} — ${w.antagonist.description} | Agenda: ${w.antagonist.agenda} | Moved: ${w.antagonist.movedThisChapter ? 'YES' : 'no'}${w.antagonist.moves.length > 0 ? ` | Last: ${w.antagonist.moves[w.antagonist.moves.length - 1].description}` : ''}`
    : 'Not yet identified'

  const cohesionLabels = ['', 'Fractured', 'Strained', 'Functional', 'High', 'Full trust']
  const cohesion = w.crewCohesion ?? { score: 3, log: [] }
  const cohesionLabel = cohesionLabels[Math.max(1, Math.min(5, cohesion.score))]
  const recentCohesionChanges = cohesion.log.slice(-2).map(e => `${e.change > 0 ? '+1' : '-1'} (${e.reason})`).join(', ')
  const cohesionLine = `${cohesion.score}/5 — ${cohesionLabel}${recentCohesionChanges ? ` | Recent: ${recentCohesionChanges}` : ''}`

  const companionsLine = companions.length > 0
    ? companions.map(n => {
        const voice = n.voiceNote ? ` | Voice: ${n.voiceNote}` : ''
        const vuln = n.vulnerability ? ` | Vuln: ${n.vulnerability}` : ''
        const loadEntries = n.tempLoad && n.tempLoad.length > 0
          ? '\n    Load: ' + n.tempLoad.map(e => `[${e.severity}] ${e.description} (${e.acquired})`).join('; ')
          : ''
        const sigLines = n.signatureLines && n.signatureLines.length > 0
          ? '\n    Voice: ' + n.signatureLines.map(l => `"${l}"`).join(' | ')
          : ''
        return `${n.name}${voice}${vuln}${loadEntries}${sigLines}`
      }).join('\n  ')
    : 'None'

  const shipSection = w.ship && config.promptSections.buildAssetState
    ? config.promptSections.buildAssetState(w.ship, w.shipName)
    : ''

  // --- Operation state ---
  let operationSection = ''
  if (w.operationState) {
    const op = w.operationState
    const objLine = op.objectives.map((o, i) => {
      const mark = o.status === 'completed' ? '✓' : o.status === 'failed' ? '✗' : ''
      return `${i + 1}.${mark}${o.text}`
    }).join(' ')
    const assessLine = op.assessments && op.assessments.length > 0
      ? `\nASSESSED: ${op.assessments.map(a => `${a.claim} (${a.skill} ${a.result} ${a.confidence}${!a.rolled ? ' NO ROLL' : ''})`).join(' | ')}`
      : ''
    operationSection = `\nOPERATION: ${op.name} | Phase: ${op.phase}\nOBJ: ${objLine}\nTACTICAL: ${op.tacticalFacts.join('. ')}\nASSETS: ${op.assetConstraints.join('. ')}\nABORT: ${op.abortConditions.join('. ')}\nSIGNALS: ${op.signals.join('. ')}${assessLine}`
  }

  // --- Exploration state ---
  let explorationSection = ''
  if (w.explorationState) {
    const ex = w.explorationState
    const exploredLine = ex.explored.map(a => `${a.name} (${a.notes})`).join(', ')
    const unexploredLine = ex.unexplored.map(a => `${a.name} (${a.hints})`).join(', ')
    const resourceLine = ex.resources.length > 0 ? ex.resources.map(r => `${r.name} ${r.current}`).join(' | ') : ''
    explorationSection = `\nFACILITY: ${ex.facilityName} | ${ex.status}\nEXPLORED: ${exploredLine || 'None'}\nCURRENT: ${ex.current.name} — ${ex.current.description}\nUNEXPLORED: ${unexploredLine || 'None'}${resourceLine ? `\nRESOURCES: ${resourceLine}` : ''}${ex.alertLevel ? `\nALERT: ${ex.alertLevel}` : ''}`
  }

  let combatSection = 'COMBAT: Inactive'
  if (combat.active) {
    const enemyLines = combat.enemies.map((e) => {
      let line = `${e.name} HP ${e.hp.current}/${e.hp.max} AC ${e.ac}`
      if (e.abilities && e.abilities.length > 0) {
        line += ' | ' + e.abilities.map(a =>
          `${a.name} (${a.range ? a.range + ' ' : ''}${a.effect}${a.cooldown ? ' ' + a.cooldown : ''})`
        ).join(' | ')
      }
      return line
    }).join(', ')
    combatSection = `COMBAT: ACTIVE — Round ${combat.round}\nENEMIES: ${enemyLines}`
    if (combat.spatialState) {
      const sp = combat.spatialState
      const posLines = sp.positions.map(p =>
        `- ${p.entity}: ${p.position}${p.status ? ` (${p.status})` : ''}`
      ).join('\n')
      combatSection += `\nMAP: ${sp.environment}\n${posLines}\nEXITS: ${sp.exits.join(', ')}`
    }
  }

  // Pressure gauge
  const recentRolls = gs.history.rollLog.slice(-8)
  let consecutiveSuccesses = 0
  let consecutiveFailures = 0
  for (let i = recentRolls.length - 1; i >= 0; i--) {
    const r = recentRolls[i].result
    const isSuccess = r === 'success' || r === 'critical'
    if (i === recentRolls.length - 1) {
      if (isSuccess) consecutiveSuccesses = 1
      else consecutiveFailures = 1
    } else {
      const prevSuccess = consecutiveSuccesses > 0
      if (isSuccess && prevSuccess) consecutiveSuccesses++
      else if (!isSuccess && !prevSuccess) consecutiveFailures++
      else break
    }
  }
  let pressureLine = 'Neutral'
  if (consecutiveFailures >= 3) pressureLine = `${consecutiveFailures} consecutive failures — ease next DC by 1-2`
  else if (consecutiveSuccesses >= 5) pressureLine = `${consecutiveSuccesses} consecutive successes — escalate`

  const chapterLine = `CHAPTER ${gs.meta.chapterNumber}: ${gs.meta.chapterTitle}`

  // ── Pacing engine: act detection + scope signals + escalation ──
  const playerTurnCount = gs.history.messages.filter(m => m.role === 'player').length
  const scopeSignals = gs.scopeSignals ?? 0

  // Act detection (heuristic, not declared)
  type PacingAct = 'hook' | 'development' | 'crucible' | 'resolution'
  let pacingAct: PacingAct = 'development'
  if (playerTurnCount <= 3) {
    pacingAct = 'hook'
  } else if (gs.meta.closeReady) {
    pacingAct = 'resolution'
  } else if (
    gs.combat.active ||
    (gs.world.operationState && ['active', 'extraction'].includes(gs.world.operationState.phase)) ||
    (gs.world.explorationState?.hostile)
  ) {
    pacingAct = 'crucible'
  }

  // Crucible resolved = was in crucible-like state but now isn't (combat ended, op completed)
  const crucibleResolved = pacingAct === 'resolution' ||
    (!gs.combat.active && playerTurnCount >= 12 && gs.meta.closeReady)

  // Escalation ladder
  let turnWarning = ''
  if (playerTurnCount >= 20) {
    turnWarning = ` ⚠ OVER BUDGET (turn ${playerTurnCount}). Wrap NOW. Find the nearest close point.`
  } else if (crucibleResolved && scopeSignals >= 2) {
    turnWarning = ` ⚠ SCOPE CREEP (${scopeSignals} signals post-crucible). Close this chapter — new content belongs in the next chapter.`
  } else if (playerTurnCount >= 15) {
    turnWarning = ` ⚡ APPROACHING LIMIT (turn ${playerTurnCount}). Drive toward resolution and signal_close.`
  } else if (playerTurnCount >= 12 && pacingAct === 'development') {
    turnWarning = scopeSignals >= 4
      ? ` 📌 Turn ${playerTurnCount}, ${scopeSignals} scope signals — crucible should be IMMINENT.`
      : ` 📌 Turn ${playerTurnCount} — crucible should be active or imminent.`
  }
  const frameLine = gs.chapterFrame
    ? `FRAME: ${gs.chapterFrame.objective} | Crucible: ${gs.chapterFrame.crucible} | Turns: ${playerTurnCount}${turnWarning}`
    : ''
  // Weak stats — flags stats with ≤0 modifier for difficulty engine targeting
  const weakStats = Object.entries(c.stats)
    .filter(([, v]) => getStatModifier(v) <= 0)
    .map(([s]) => s)
  const weakLine = weakStats.length > 0 ? `Weak: ${weakStats.join(', ')}` : ''

  // Rules engine warnings (persistent counter thresholds)
  const rulesWarnings = gs.rulesWarnings ?? []
  const rulesSection = rulesWarnings.length > 0
    ? '\n' + rulesWarnings.join('\n')
    : ''

  const timeLine = w.currentTime ? `TIME: ${w.currentTime}` : ''
  const partyLabel = config.partyBaseName.toUpperCase()
  const pronouns = c.gender === 'he' ? 'he/him' : c.gender === 'she' ? 'she/her' : 'they/them'
  const exhaustionTag = (c.exhaustion ?? 0) > 0 ? ` | EXHAUSTION: ${c.exhaustion}/6` : ''

  const completedChapters = gs.history.chapters.filter((ch) => ch.status === 'complete')
  const recentFull = completedChapters.slice(-1)
  const olderCompressed = completedChapters.slice(0, -1)
  const historySection =
    completedChapters.length > 0
      ? '\nHISTORY:\n' +
        [
          ...olderCompressed.map((ch) => `Ch${ch.number}: ${ch.title} — ${ch.summary}`),
          ...recentFull.map((ch) => `Ch${ch.number}: ${ch.title} — ${ch.summary} | Key: ${ch.keyEvents.slice(0, 5).join(' · ')}`),
        ].join('\n') +
        '\n'
      : ''

  const nb = w.notebook
  const notebookSection = nb && nb.clues.length > 0
    ? `\nNOTEBOOK${nb.activeThreadTitle ? ` — ${nb.activeThreadTitle}` : ''}:\n` +
      nb.clues.map(c => {
        const tags = c.tags.join(',')
        const herring = c.isRedHerring ? ' [RED HERRING]' : ''
        const linked = c.connectionIds.length > 0 ? ` (in ${c.connectionIds.length} connections)` : ''
        return `- "${c.title || c.content.slice(0, 60)}" (id:${c.id} src:${c.source}) tags:${tags}${herring}${linked}`
      }).join('\n') +
      (nb.connections.length > 0
        ? `\nCONNECTIONS:\n` + nb.connections.map(conn => {
            const sourceLabels = conn.sourceIds.map(id => {
              const clue = nb.clues.find(c => c.id === id)
              if (clue) return `"${clue.title || clue.content.slice(0, 40)}"`
              const c = nb.connections.find(c => c.id === id)
              return c ? `Lead:"${c.title}"` : id
            }).join(' + ')
            return `${conn.tier.toUpperCase()}: "${conn.title}" (id:${conn.id}) — ${sourceLabels} = ${conn.revelation.slice(0, 80)}${conn.tainted ? ' [TAINTED]' : ''}`
          }).join('\n')
        : '')
    : ''

  const tensionClocks = w.tensionClocks ?? []
  const activeClocks = tensionClocks.filter((c) => c.status === 'active')
  const triggeredClocks = tensionClocks.filter((c) => c.status === 'triggered')
  const clocksLine = [
    activeClocks.length > 0 ? `Active: ${activeClocks.map((c) => `${c.name} [${c.filled}/${c.maxSegments}]`).join(', ')}` : '',
    triggeredClocks.length > 0 ? `Fired: ${triggeredClocks.map((c) => `${c.name} — ${c.triggerEffect}`).join(', ')}` : '',
  ].filter(Boolean).join(' | ') || 'None'

  // --- Timers ---
  const activeTimers = (w.timers ?? []).filter(t => t.status === 'active')
  const timersLine = activeTimers.length > 0
    ? `\nTIMERS: ${activeTimers.map(t => `${t.description} [${t.deadline}]`).join(' | ')}`
    : ''

  // --- Heat ---
  const heatEntries = (w.heat ?? []).filter(h => h.level !== 'none')
  const heatLine = heatEntries.length > 0
    ? `\n${(config.heatLabel ?? 'HEAT').toUpperCase()}: ${heatEntries.map(h => `${h.faction}=${h.level} (${h.reasons.join(',')})`).join(' | ')}`
    : ''

  // --- Ledger ---
  const ledger = w.ledger ?? []
  const lastTx = ledger.length > 0 ? ledger[ledger.length - 1] : null
  const ledgerSuffix = lastTx
    ? ` | Last: ${lastTx.amount > 0 ? '+' : ''}${lastTx.amount} (${lastTx.description}, ${lastTx.day})`
    : ''

  const loreAnchors = config.loreAnchors && config.loreAnchors.length > 0
    ? `\nLORE: ${config.loreAnchors.join(' | ')}`
    : ''

  return `PRESSURE: ${pressureLine}${weakLine ? ' | ' + weakLine : ''}${loreAnchors}

ORIGIN: ${c.species} — ${config.species.find(s => s.name === c.species)?.lore || 'No special traits.'}
PC: ${c.name} | ${c.species} ${c.class} L${c.level} | HP ${c.hp.current}/${c.hp.max} | AC ${c.ac} | ${c.credits} ${config.currencyAbbrev}${ledgerSuffix} | Prof +${c.proficiencyBonus} | PP ${10 + getStatModifier(c.stats.WIS)} | Insp: ${c.inspiration ? 'YES' : 'no'}${exhaustionTag} | ${pronouns}
STATS: ${statLine}
PROF: ${c.proficiencies.join(', ')}
GEAR: ${inventoryLine || 'Empty'}
TRAITS: ${traitsLine || 'None'}
TEMP: ${tempLine}

LOC: ${w.currentLocation.name} — ${w.currentLocation.description}
${w.sceneSnapshot ? `SCENE: ${w.sceneSnapshot}\n` : ''}${timeLine ? timeLine + '\n' : ''}${partyLabel}: ${w.shipName}
CREW: ${companionsLine}
COHESION: ${cohesionLine}
FACTIONS: ${factionsLine}
NPCS: ${npcsLine}${npcFailureLine}
THREADS: ${threadsLine}
PROMISES: ${promisesLine}${decisionsLine ? `\nDECISIONS: ${decisionsLine}` : ''}
ANTAG: ${antagonistLine}
CLOCKS: ${clocksLine}${timersLine}${heatLine}${shipSection}${operationSection}${explorationSection}${notebookSection}

${combatSection}
${historySection}
${chapterLine}${frameLine ? '\n' + frameLine : ''}${weakLine ? '\n' + weakLine : ''}${rulesSection}`
}

// ============================================================
// ADAPTIVE HISTORY WINDOW
// ============================================================

const TARGET_HISTORY_TOKENS = 4000
const AVG_TOKENS_PER_CHAR = 0.3
const MIN_MESSAGE_FLOOR = 6  // At least 3 full player-GM turns
const OPERATION_TOKEN_BOOST = 1000  // Extra budget during active ops

export function buildMessagesForClaude(
  gameState: GameState,
  currentMessage: string,
  isMetaQuestion: boolean
): Array<{ role: 'user' | 'assistant'; content: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> }> {
  const allMessages = gameState.history.messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string | Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }> }> = []

  const sceneSummaries = gameState.sceneSummaries ?? []
  const legacySummary = gameState.storySummary

  if (sceneSummaries.length > 0) {
    // ── Scene summaries: inject all chapter summaries, then only current-scene messages ──
    const summaryBlock = sceneSummaries
      .map((s) => {
        const tone = s.toneSignature ? ` [${s.toneSignature}]` : ''
        return `[Scene ${s.sceneNumber}]${tone} ${s.text}`
      })
      .join('\n\n')

    // Pivotal scenes from prior chapters (permanent, never rotated)
    const pivotalBlock = (gameState.pivotalScenes ?? []).length > 0
      ? '\n\n[PIVOTAL MOMENTS]\n' + gameState.pivotalScenes.map(p => `[Ch${p.chapter}: ${p.title}] ${p.text}`).join('\n\n')
      : ''

    messages.push({ role: 'user', content: `[SCENE SUMMARIES]\n${summaryBlock}${pivotalBlock}` })
    messages.push({ role: 'assistant', content: 'Acknowledged. Continuing from current scene.' })

    // Current scene = messages after the last summarized scene
    const lastSummarized = sceneSummaries[sceneSummaries.length - 1]
    const currentSceneMessages = allMessages.slice(lastSummarized.toMessageIndex + 1)
    for (const msg of currentSceneMessages) {
      if (msg.role === 'player' || msg.role === 'meta-question') {
        const p = msg.role === 'meta-question' ? '[META] ' : ''
        messages.push({ role: 'user', content: p + msg.content })
      } else if (msg.role === 'gm' || msg.role === 'meta-response') {
        messages.push({ role: 'assistant', content: msg.content })
      }
    }
  } else if (legacySummary && legacySummary.text) {
    // ── Legacy: old-style monolithic summary (backward compat for old saves) ──
    messages.push({ role: 'user', content: `[STORY SO FAR]\n${legacySummary.text}` })
    messages.push({ role: 'assistant', content: 'Acknowledged. Continuing from current situation.' })

    const recentMessages = allMessages.slice(legacySummary.upToMessageIndex + 1)
    for (const msg of recentMessages) {
      if (msg.role === 'player' || msg.role === 'meta-question') {
        const p = msg.role === 'meta-question' ? '[META] ' : ''
        messages.push({ role: 'user', content: p + msg.content })
      } else if (msg.role === 'gm' || msg.role === 'meta-response') {
        messages.push({ role: 'assistant', content: msg.content })
      }
    }
  } else {
    // ── No summaries — windowed history (early chapter, no scene boundaries yet) ──
    const hasActiveOp = gameState.world.operationState &&
      ['active', 'extraction'].includes(gameState.world.operationState.phase)
    const hasExploration = !!gameState.world.explorationState
    const budget = TARGET_HISTORY_TOKENS + ((hasActiveOp || hasExploration) ? OPERATION_TOKEN_BOOST : 0)

    let tokenEstimate = 0
    let startIndex = allMessages.length
    const messagesIncluded = () => allMessages.length - startIndex

    for (let i = allMessages.length - 1; i >= 0; i--) {
      const msgTokens = Math.ceil(allMessages[i].content.length * AVG_TOKENS_PER_CHAR)
      if (tokenEstimate + msgTokens > budget && messagesIncluded() >= MIN_MESSAGE_FLOOR) {
        break
      }
      tokenEstimate += msgTokens
      startIndex = i
    }

    const windowedMessages = allMessages.slice(startIndex)
    for (const msg of windowedMessages) {
      if (msg.role === 'player' || msg.role === 'meta-question') {
        const p = msg.role === 'meta-question' ? '[META] ' : ''
        messages.push({ role: 'user', content: p + msg.content })
      } else if (msg.role === 'gm' || msg.role === 'meta-response') {
        messages.push({ role: 'assistant', content: msg.content })
      }
    }
  }

  // Cache breakpoint: mark the last "old" message before the new player input.
  // The prefix (system + tools + old history) stays identical between turns,
  // so Anthropic's prefix cache hits on everything before this breakpoint.
  if (messages.length >= 2) {
    const lastOld = messages[messages.length - 1]
    const text = typeof lastOld.content === 'string' ? lastOld.content : lastOld.content[0]?.text ?? ''
    messages[messages.length - 1] = {
      role: lastOld.role,
      content: [{ type: 'text', text, cache_control: { type: 'ephemeral' } }],
    }
  }

  // Dynamic state is now in a second system block (system-level authority,
  // can't be overridden by user input). Messages are just the player's action.
  const prefix = isMetaQuestion ? '[META] ' : ''
  messages.push({ role: 'user', content: prefix + currentMessage })

  return messages
}

// ============================================================
// INITIAL MESSAGE
// ============================================================

export function buildInitialMessage(gameState: GameState): string | { message: string; chapterTitle: string } {
  const genre = (gameState.meta?.genre || 'space-opera') as Genre
  const config = getGenreConfig(genre)
  const chapters = gameState.history?.chapters ?? []
  const chapterNumber = gameState.meta?.chapterNumber ?? 1
  const isNewGame = chapterNumber <= 1 && chapters.every(ch => ch.status === 'in-progress' && ch.summary === '')

  if (isNewGame) {
    const playerClass = gameState.character?.class?.toLowerCase() ?? ''
    // Filter hooks: prefer class-tagged hooks matching this class, fall back to universal
    const allHooks = config.openingHooks
    const classHooks = allHooks.filter(h =>
      typeof h !== 'string' && h.classes && h.classes.some(c => playerClass.includes(c.toLowerCase()))
    )
    const universalHooks = allHooks.filter(h =>
      typeof h === 'string' || !h.classes
    )
    // 70% chance to pick class-specific if available, else universal
    const pool = classHooks.length > 0 && Math.random() < 0.7 ? classHooks : universalHooks.length > 0 ? universalHooks : allHooks
    const picked = pool[Math.floor(Math.random() * pool.length)]
    const hook = typeof picked === 'string' ? picked : picked.hook
    const hookTitle = typeof picked !== 'string' && picked.title ? picked.title : config.initialChapterTitle
    const partyLabel = config.partyBaseName.toLowerCase()

    const msg = `Begin the campaign. Opening hook: "${hook}"

Write the opening scene based on this hook. The character's class determines what kind of trouble finds them — the reason this problem lands on THIS character should be obvious from who they are. Their origin shapes how the world receives them: who trusts them on sight, who's suspicious, what doors open and close. Adapt the hook, the NPCs, and the starting situation to make both class and origin feel load-bearing from the first scene. Follow the tutorial-as-narrative structure for this first chapter.

IMPORTANT: In your FIRST response, call commit_turn with ALL of these in the world section:
- set_location (starting location)
- set_current_time (e.g. "Day 1, early morning")
- set_scene_snapshot (who is where)
- add_npcs (at least one NPC + origin contacts — see below)
- add_faction (at least one)
- add_threads (at least one narrative thread)
Also include chapter_frame with an objective derived from the hook and a crucible (the pressure test this hook leads to). The world state is blank — you must populate it.

ORIGIN CONTACTS: Create these as named NPCs with the specified disposition, a personality, and a voice note. These are pre-existing relationships — they should feel established, not freshly met.
${(() => {
      const species = config.species.find(s => s.name === gameState.character?.species)
      const contacts = species?.startingContacts
      if (!contacts || contacts.length === 0) return 'See origin lore for starting contact details.'
      return contacts.map(c => `- ${c.role} at ${c.disposition}${c.affiliation ? ` (${c.affiliation})` : ''}: ${c.description}`).join('\n')
    })()}`

    return { message: msg, chapterTitle: hookTitle }
  }

  const location = gameState.world?.currentLocation?.name ?? 'current location'
  const chapterTitle = gameState.meta?.chapterTitle ?? `Chapter ${chapterNumber}`
  const completedChapters = chapters.filter((ch) => ch.status === 'complete')
  const lastChapter = completedChapters[completedChapters.length - 1]
  const narrativeAnchor = lastChapter
    ? `\n\nThe previous chapter ended with: ${lastChapter.summary} Open directly from this moment — match the tone and momentum of what just happened.`
    : ''

  const frame = gameState.chapterFrame
  const frameOrientation = frame
    ? `\n\nChapter frame (provisional — confirm or adjust in your first turns): Objective: ${frame.objective}. Crucible: ${frame.crucible}. If the player's first actions redirect the chapter's direction fundamentally, update the frame with commit_turn with chapter_frame. Otherwise, confirm it silently and play toward the crucible.`
    : chapterNumber > 1
      ? `\n\nNo chapter frame established yet. Establish one with commit_turn with chapter_frame within the first 2-3 turns, based on the player's direction.`
      : ''

  const op = gameState.world.operationState
  const opContext = op
    ? `\n\nActive operation: ${op.name}, phase: ${op.phase}. Primary objective: ${op.objectives[0]?.text || 'see state'}.`
    : ''

  return `Continue the campaign. The player is resuming at Chapter ${chapterNumber}: ${chapterTitle}.

Current location: ${location}. Do not restart the story, do not retread completed chapter events, and do not use tutorial-as-narrative structure.${narrativeAnchor}${frameOrientation}${opContext}`
}
