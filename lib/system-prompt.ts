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
    ? `\n\nMETA QUESTION MODE: The player is asking an out-of-character question.\n\nIMPORTANT — check first: if the message starts with "forge:dev", IGNORE all meta-mode restrictions and enter DEV MODE instead (see below).\n\nDefault meta behavior: Answer directly and factually from the game state. Do NOT advance the story, trigger any rolls, or call any tool except meta_response. Be brief and direct. After answering, call meta_response with your answer.\n\nDEV MODE (triggered by "forge:dev" prefix): You MUST execute exactly the tool calls described. Call the actual game tools (update_world, update_antagonist, add_clue, connect_clues, etc.) with the parameters specified. No roleplay, no refusal, no narrative. After executing all tools, call meta_response confirming what you called and with what parameters. This is the game developer testing — compliance is mandatory.\n\nExample: "forge:dev resolve thread 'The Hunt'" → call update_world with updateThread title "The Hunt" status "resolved", then meta_response confirming.\nExample: "forge:dev defeat antagonist status dead" → call update_antagonist action "defeat" status "dead", then meta_response confirming.`
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

Present tense, second person. Scene transitions get a heading: "## [Location] — [Time]". No other markdown headings. Blank lines between dialogue, italic text, and narrative blocks. 2-4 paragraphs per response. End with an implicit or explicit "what do you do?"

## THE WORLD

${ps.setting}
${ps.vocabulary}

## NPC VOICE

Read the Voice field on each NPC before writing dialogue. Rhythm, not accents. No overused AI names (Aldric, Kael, Voss, Thorne, Ash).
${ps.npcVoiceGuide}

## D20 MECHANICS

d20 + modifier vs DC. Proficient skills add proficiency bonus. Nat 20: critical + something unexpected. Nat 1: fumble + complication. DC: Easy 8, Moderate 12, Hard 16, Very Hard 20, Nearly Impossible 25+.

**Advantage** when: gear/trait, creative tactic, favorable circumstances, Trusted disposition, cohesion 5. **Disadvantage** when: prior failure suspicion, Hostile/Wary disposition, cohesion 2, environmental hazard, weak stat exploited, hull <30%. Both → cancel. High trust grants advantage, never eliminates the roll.

## ROLL DISCIPLINE

**Roll when: (1) uncertain AND (2) failure has consequences.** Call request_roll BEFORE narrating.

The momentum trap: three paragraphs without a roll → stop, check for missed gates. Dice create the story. Narrative follows dice.

Plans vs actions: plan descriptions get acknowledged, not executed. Only execution triggers rolls. Sequential actions: stop at first roll condition. NPC actions under pressure: fate roll or NPC check. Never silently resolve.

**Assessment rolls in planning scenes:** When the player asserts a fact about an uncertain situation — enemy strength, NPC loyalty, timeline feasibility — that's a check. If being wrong has consequences, call request_roll.

Requires a roll: "Carren is a hired hand" → WIS Insight. "The conduit is still open" → INT. "Their protocols are outdated" → INT.
Does NOT require a roll: "Let's hit the defense node first" → decision. "Renn, how long?" → NPC expertise. "We leave at midday" → scheduling.

**Five-turn audit:** No rolls in five player turns → review for missed gates.

**ALWAYS request_roll BEFORE the outcome.**

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

**Cohesion** (1-5): 5=advantage crew rolls. 4=one advantage/scene. 3=normal. 2=disadvantage. 1=self-interest. +1: acknowledge, keep promise, crew safety, credit. -1: use as tools, break promise, dismiss concerns.

**Disposition:** Hostile=disadvantage all social. Wary=disadvantage Persuasion. Neutral=standard. Favorable=+2. Trusted=advantage. Climbing slow, falling fast. Fear ≠ trust — compliance under threat doesn't improve disposition.

**Origin:** The player's origin (species/background) shapes how the world treats them — NPC first impressions, which institutions cooperate or resist, what social doors open and close. Reference origin-specific contacts, advantages, and positioning in NPC reactions. When introducing a new NPC, consider how they'd react to someone of this origin before defaulting to neutral. Origin is not cosmetic — it's a persistent social modifier.

**Promises:** Active→Strained (deferred twice). Strained→Broken (third deferral). Two-chapter rule: no progress → auto Strained.

**Clocks:** Advance on time/failures/exposure. Max once/scene. Trigger when filled. Must advance once before resolving.

**Decisions:** Auto-record non-operational choices with downstream consequences via addDecision. Threshold: commitment that changes relationships, resources, or narrative direction. Don't record mid-operation tactical choices (ops system handles those) or low-stakes immediate choices. If uncertain, record — the 8-cap auto-archives stale entries. Moral choices mid-operation still get recorded (ops doesn't track those).

**Timers:** Hard deadlines. Don't narrate past them. **Heat:** High = tighter security, suspicious NPCs. **Economy:** Track transactions via addLedgerEntry. Last purchase anchors pricing. **Inspiration:** Risky compelling choice. Hold one. Spend = reroll.

## DIFFICULTY ENGINE

Rule 1 — Fail forward. Rule 1a — Failure as a door. Rule 2: target weaknesses once/chapter. Rule 3: ${ps.consumableLabel} — don't refill without restock. Rule 4: antagonist moves once/chapter offscreen. Rule 5: one thread worsens/chapter. Rule 6: deferred promises get mentioned.

## POST-ACTION CHECKLIST (every response)

1. Crew protected/included → cohesion
2. Risky compelling choice → inspiration
3. NPC attitude shifted → disposition
4. Promise fulfilled/broken → updatePromise
5. Non-operational commitment with consequences → addDecision
6. Clock tick → update_clock
7. Scene changed → setLocation/setSceneSnapshot
8. Consumable used → inventoryUse
9. Uncertain fact asserted → request_roll
10. ${config.currencyName} spent → update_character + addLedgerEntry

## TOOL DISCIPLINE

request_roll BEFORE outcome. Never narrate state change without tool call. suggest_actions MANDATORY every response. Contested rolls when named NPC opposes. Check advantage/disadvantage triggers before every roll. After a successful attack, request_roll with rollType="damage" and sides matching the weapon's damage die. For enemy damage, use update_character with rollBreakdown instead of request_roll.

**Consumable tracking.** When the player uses a consumable, call update_character with inventoryUse in the same response.

**No double-deductions.** Before deducting credits or consuming items, check the state. Read LEDGER — if the last entry matches what you're about to charge, it already happened. Read GEAR — if the item's charges already reflect the use, don't call inventoryUse again. A cost narrated once is charged once. This applies across turns: if you narrated using a medpatch last turn and charges went from 6 to 5, do not decrement again this turn.

**No meta-narration.** Never narrate your decision-making process. Don't write "let me resolve that" or "I'll call a roll for this." Just call the tool.

**Output order:** 1. Narrative. 2. State mutations. 3. suggest_actions (always).`
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
2. **Second scene:** Create a situation requiring a low-stakes skill check (DC 10-12). Don't name the skill. Call request_roll, let the mechanic speak. This teaches that dice matter.
3. **Third scene:** A small skirmish — 1-2 enemies, Tier 1-2. Walk the player through combat by doing it. This teaches the combat rhythm.

${ps.tutorialContext}

After these three beats, play normally. The training wheels come off.

**Chapter 1 pacing:** Shorter chapter than normal. The objective should be achievable in 15-20 turns. One clear goal, one complication, one resolution. Don't introduce more than 3-4 NPCs or 2-3 threads.

${ps.traitRules ? ps.traitRules : ''}

${ps.assetMechanic || ''}

## CHAPTER FRAME
Establish with set_chapter_frame by turn 3. By turn 5 without direction, an NPC forces a decision.

## CHAPTER CLOSE
Call signal_close_ready when resolution + forward hook are met. Include selfAssessment.`
}

// ============================================================
// PLANNING MODULE — briefings, strategy, prep (~500 tokens)
// ============================================================

function buildPlanningModule(): string {
  return `## PLANNING CONTEXT

The player is in a planning or briefing scene. These scenes CONTAIN HIDDEN ROLL GATES. Do not treat them as pure dialogue.

**Assessment rolls are the key challenge in this context.** When the player or an NPC asserts a fact about an uncertain situation — enemy strength, NPC loyalty, timeline feasibility, asset reliability — that assertion is a check. If being wrong has consequences, call request_roll before confirming.

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

When the player commits to a plan, capture it immediately via update_world(setOperationState). This is canonical — do not contradict it. If the player changes the plan, update state first.

Log assessed facts with confidence level. Unrolled assessments show "NO ROLL" in state — address them.

## NPC REACTIONS TO PLANS

NPCs in planning scenes are not yes-machines. They challenge, refine, and object based on expertise and disposition. A plan that survives NPC pushback is stronger. A plan that doesn't should evolve.

## PACING

Planning is the preparation phase. It should build toward the crucible, not replace it. If planning exceeds 10 turns, the crucible is overdue. An NPC should push toward action.

## SOCIAL ELEMENTS

Even in planning, play the people. A briefing room has body language, glances, silences. Include at least one character moment in extended planning sessions.

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close_ready when resolution + hook. Include selfAssessment.`
}

// ============================================================
// COMBAT MODULE (~500 tokens)
// ============================================================

function buildCombatModule(genre: string, ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  const method = ANTAGONIST_METHODS[genre] || ANTAGONIST_METHODS['fantasy']
  return `## COMBAT CONTEXT

**Turn order:** Player action → Enemy response → New situation → suggest_actions.

1. Player picks action (Attack, Ability, Item, Flee, custom, environmental interaction)
2. Resolve attack: request_roll (d20 skill check to hit). On hit, IMMEDIATELY call request_roll AGAIN for damage (see DAMAGE ROLL PROTOCOL below). Then apply the rolled damage total via update_character(hpChange=-total) on the target.
3. Enemies act: batch into one beat, call defensive save for dodgeable attacks. For enemy damage, do NOT use request_roll — instead roll the damage yourself and call update_character with hpChange AND rollBreakdown (label, dice, roll, modifier, total, damageType, sides) so the UI shows a damage badge.
4. Present new situation with suggest_actions

## DAMAGE ROLL PROTOCOL

After EVERY successful player hit, you MUST call request_roll for damage. No exceptions.

1. Do NOT narrate a damage number — the dice decide.
2. Do NOT write "roll your damage" as text — call the tool.
3. IMMEDIATELY call request_roll with: rollType="damage", sides matching the weapon's damage die (e.g. sides=10 for "1d10 energy"), checkType=weapon name, damageType from the weapon string, dc=0, modifier from the relevant stat if the weapon specifies +STAT (e.g. "+DEX" → use DEX modifier).
4. Wait for the damage result before narrating the hit's effect or continuing to enemy actions.

The same applies to **healing items:** call request_roll with rollType="healing", sides matching the item's die, checkType=item name, damageType="HP", dc=0, modifier=the resolved stat bonus. Then apply via update_character(hpChange=+total).

**Spatial tracking:** Maintain positions for all combatants, hazards, and exits. Update each round. Do not teleport — movement is consistent and logical. Player needs relative distances and cover.

**Environmental combat:** suggest_actions MUST include one environmental option when terrain is usable. Pit → shove. Chandelier → cut chain. Unstable wall → collapse. The environment is a weapon.

**Threat tiers:**
T1 (Civilian): HP 8, AC 10, +2/1d4. T2 (Trained): HP 15, AC 13, +4/1d6.
T3 (Veteran): HP 25, AC 15, +6/1d8. T4 (Elite): HP 40, AC 17, +8/1d10.
T5 (Apex): HP 60+, AC 18+, +10/1d12. Rare, earned.

**Special abilities:** Declare at start_combat: name, mechanic, save/DC, range, cooldown. Canonical — don't change mid-fight. Use signature ability rounds 1-2.

**Enemies fight to win.** Cover, focus fire, target weak stats. Don't monologue when they should shoot. Intelligent enemies adapt mid-fight.

## DEATH & DEFEAT

0 HP → unconscious. Death saves: d20/round, 10+ success, 9- fail. Nat 20 → 1 HP. Nat 1 → two fails. Three either way. Total defeat redirects, doesn't end.

${ps.assetMechanic || ''}

## CHAPTER FRAME + CLOSE
Frame: set by turn 3. Close: signal_close_ready when resolution + hook.`
}

// ============================================================
// INFILTRATION MODULE (~500 tokens)
// ============================================================

function buildInfiltrationModule(ps: ReturnType<typeof getGenreConfig>['promptSections']): string {
  return `## INFILTRATION CONTEXT

Every movement past a detection layer is a potential check. This is a sequence of connected decisions, not one Stealth roll.

**Setup:** Before the player acts, establish: NPC count, detection layers, known vs unknown, time pressure. Initialize exploration state via update_world(setExplorationState).

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
Frame: set by turn 3. Close: signal_close_ready when resolution + hook. Include selfAssessment.`
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
Frame: set by turn 3. Close: signal_close_ready when resolution + hook. Include selfAssessment.`
}

// ============================================================
// INVESTIGATION OVERLAY — appends to social/planning/infiltration
// ============================================================

function buildInvestigationOverlay(notebookLabel: string, genreGuide: string): string {
  if (!genreGuide) return ''
  return `\n\n## INVESTIGATION — ${notebookLabel.toUpperCase()}

${genreGuide}

**Clue discovery:** Active investigation → request_roll. PP meets DC → auto-notice. NPC volunteering scales with disposition. **Before adding a clue, check NOTEBOOK in game state — if the same evidence already exists, pass its clueId to update it instead of creating a duplicate.**

**Connection proposals:** Strong (sound reasoning) → INT Investigation, DC 10/14/18. Weak (plausible but off) → partial truth. No connection → no roll, narrate dead end.

**Tiers:** Clue+clue=Lead. Lead+clue=Enriched lead. Lead+lead=Breakthrough. Breakthrough+any=Deeper breakthrough. Scale revelations accordingly.

**Tainted:** If source is [TAINTED], generate plausible-but-wrong revelation. NEVER mention taint in narrative.

**NPC connections:** Experts may connect_clues directly — no roll. Must reference existing notebook clues only.`
}

// ============================================================
// PROGRESSION BLOCK — compact, always loads (~150 tokens)
// ============================================================

function buildProgressionBlock(): string {
  return `## CHAPTER FRAME
Establish via set_chapter_frame by turn 3: objective (player's goal) + crucible (pressure test). Never announce. Turn 5 without direction → NPC forces decision. 25+ turns without crucible → escalate.

## CHAPTER CLOSE
Do NOT call close_chapter/generate_debrief/levelUp. When resolution + forward hook are met: wrap narrative, call signal_close_ready with selfAssessment. Dedicated close sequence handles the rest.`
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

Execute these steps IN ORDER. Each step is a tool call.

### Step 1: AUDIT
Review the game state. Check:
- Active threads: which resolved this chapter? Which carry forward?
- Open promises: which were fulfilled or broken?
- Tension clocks: which should advance, trigger, or resolve?
- Antagonist: did they move this chapter?
- Operation state: clear it (setOperationState: null) if the operation completed.
- Exploration state: clear it (setExplorationState: null) if the player exited the facility.

Call update_world to resolve/update any stale entries. Call update_antagonist if the antagonist's status changed.

### Step 2: CLOSE CHAPTER
Call close_chapter with:
- summary: 2-3 sentence narrative summary (this is long-term memory — write carefully)
- keyEvents: 3-5 key events (decisions, people met, consequences)
- nextTitle: title for the next chapter
- resolutionMet: how the chapter objective was resolved
- forwardHook: what creates momentum into the next chapter

### Step 3: LEVEL UP
Call update_character with levelUp:
- newLevel: ${newLevel}
- hpIncrease: ${hpIncrease} (hit die avg ${hitDie} + CON mod ${conMod >= 0 ? '+' : ''}${conMod}, min 1)${profBonusNote}${asiNote}

### Step 4: SKILL POINTS
Award 0-2 skill points. 1 point per criterion met:
1. A non-proficient skill was used creatively during the chapter
2. Major objective achieved with no failed primary checks
3. A key decision had lasting positive payoff

Call update_character with addProficiency for each skill point, choosing from non-proficient skills relevant to this chapter's events. Current proficiencies: ${gameState.character.proficiencies.join(', ')}.

### Step 5: DEBRIEF
Call generate_debrief with:
- tactical: THE DICE TOLD A STORY + WHAT WORKED + WHAT COST YOU. Analyze the roll log. Name pivotal rolls, patterns, and the roll that defined the chapter. Identify 2-3 smart player decisions. Name real costs (not just HP — relationships, closed options, information gaps).
- strategic: THREADS AND PRESSURE. Which threads advanced, worsened from neglect, or newly opened? What's most urgent next chapter?
- luckyBreaks: specific moments where chance favored the player
- costsPaid: specific permanent costs from this chapter
- promisesKept: promises fulfilled or advanced
- promisesBroken: promises strained or broken
Reference active decisions by category in tactical/strategic sections — which held, which broke, which had consequences. Supersede any decisions no longer relevant via updateDecision before generating the debrief.
${selfAssessment ? `\nFor GM Transparency (Section 6), incorporate the GM's self-assessment above into your analysis.` : ''}

### Step 6: SET NEXT FRAME
Call set_chapter_frame with a provisional frame for the next chapter:
- objective: derived from the forward hook — what does it demand the player do next?
- crucible: the natural pressure point for that objective

This is provisional — the narrative GM will confirm or adjust it in the first turns of the new chapter.

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
  const recentMessages = gameState.history.messages.slice(-12)
  const messageLog = recentMessages
    .map((m) => `[${m.role}] ${m.content.slice(0, 200)}`)
    .join('\n')

  const instructions = `You are the state auditor for a ${config.name} RPG. You are NOT the narrative GM. Your job is mechanical: verify game state accuracy and fix drift.

## YOUR TASK

Compare the CURRENT STATE below against the RECENT MESSAGES. Look for discrepancies where the narrative described something happening but the state wasn't updated, or where state values don't match what should have occurred.

## CHECKS (in order)

### 1. CONSUMABLES
- Were items used in recent messages (potions, medpatches, ammo) but charges not decremented?
- Were items picked up or dropped but inventory not updated?
- Fix with update_character (inventoryUse, inventoryAdd, inventoryRemove).

### 2. HP & RESOURCES
- Does HP reflect damage taken and healing received in recent messages?
- Fix with update_character (hpChange or hpSet).
- For ${config.currencyAbbrev}: calculate the correct balance from starting credits minus LEDGER entries. If the current balance doesn't match, use hpSet-style correction: call update_character with creditsChange to set the exact correct amount. Do NOT apply incremental +/- adjustments — calculate the right number and set it directly.

### 3. TEMPORARY EFFECTS
- Are there expired temp modifiers still listed? (Check duration descriptions against scene progression.)
- Fix with update_character (removeTempModifier).

### 4. LOCATION & SCENE
- Does the current location match where the narrative says the player is?
- Is the scene snapshot stale (describes a scene that's clearly over)?
- Fix with update_world (location, sceneSnapshot).

### 5. NPC STATUS
- Were any NPCs killed, captured, or departed in recent messages but still marked active?
- Did any NPC's disposition clearly change based on recent interactions?
- Fix with update_world (npcs) or update_disposition.

### 6. TRAIT USES
- Were class traits used but usesRemaining not decremented?
- Fix with update_character (traitUse).

### 7. PROMISES
- Were any promises fulfilled in recent messages but still marked "open"? (Player delivered, NPC acknowledged.)
- Were any promises clearly broken? (Player did the opposite, or deadline passed in narrative.)
- Fix with update_world (promises — set status to "fulfilled" or "broken").

### 8. DECISIONS
- Did the player commit to a non-operational choice with consequences that isn't recorded? (Trust, alliances, resource allocation, moral choices outside operations.)
- Are any active decisions now obsolete? (Circumstances changed, player reversed course.)
- Fix with update_world (addDecision or updateDecision).

### 9. THREADS
- Did any thread clearly resolve in recent messages but is still marked "open"?
- Did any thread worsen (deteriorating flag should be true) based on neglect or escalation?
- Fix with update_world (threads — set status or deteriorating flag).

### 10. CLOCKS
- Should any tension clock have advanced based on recent events?
- Fix with update_clock (advance, trigger, or resolve).

### 11. OPERATION STATE
- Is there an active operation whose phase should have advanced? (e.g. planning scene ended but phase still "planning", or operation clearly completed but not cleared.)
- Were any objectives clearly achieved or failed in recent messages but still marked "active"?
- Fix with update_world (setOperationState — update phase or objective status, or set to null if operation is over).

### 12. EXPLORATION STATE
- Is there an active exploration state but the player clearly left the facility?
- Is the current zone wrong based on recent movement?
- Are resources consumed in recent messages but not reflected?
- Fix with update_world (setExplorationState — update zones/resources, or set to null if exited).

### 13. TIMERS
- Has an active timer's deadline passed based on currentTime? Set to expired.
- Fix with update_world (updateTimer).

### 14. HEAT
- Did recent actions increase faction exposure but heat wasn't updated?
- Fix with update_world (updateHeat).

## RULES
- Be conservative. Only fix clear discrepancies, not ambiguous ones.
- Do NOT generate any narrative text. Your only output is tool calls.
- If everything looks correct, output nothing (no tool calls needed).
- Do NOT call suggest_actions, request_roll, or any narrative tool.
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

  // Exploration state is an explicit infiltration signal
  if (gs.world.explorationState) return 'infiltration'

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

  // NPC compression: drop neutral non-recent NPCs entirely
  const recentChapters = gs.history.chapters.slice(-2).map(ch => ch.title.toLowerCase())
  const isRecent = (n: { lastSeen: string }) =>
    recentChapters.some(t => n.lastSeen.toLowerCase().includes(t)) ||
    n.lastSeen.toLowerCase().includes(w.currentLocation.name.toLowerCase()) ||
    w.currentLocation.name.toLowerCase().includes(n.lastSeen.toLowerCase())

  const relevantNpcs = nonCrewNpcs.filter(n => {
    if (n.disposition && n.disposition !== 'neutral') return true
    return isRecent(n)
  }).slice(0, 12)

  const npcsLine =
    relevantNpcs.length > 0
      ? relevantNpcs.map((n) => {
          const tier = n.disposition ? n.disposition.charAt(0).toUpperCase() + n.disposition.slice(1) : 'Neutral'
          const role = n.role ?? 'npc'
          const voice = n.voiceNote ? `|Voice:${n.voiceNote}` : ''
          const cbt = n.combatTier ? `|T${n.combatTier}${n.combatNotes ? ' ' + n.combatNotes : ''}` : ''
          if (isRecent(n)) {
            return `${n.name}|${role}|${tier}${voice}${cbt} — ${n.description}, last:${n.lastSeen}`
          }
          return `${n.name}|${role}|${tier}${voice}${cbt}`
        }).join('; ')
      : 'None'

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
        const voice = n.voiceNote ? `|Voice:${n.voiceNote}` : ''
        const vuln = n.vulnerability ? `[vuln:${n.vulnerability}]` : ''
        return `${n.name}${voice}${vuln}`
      }).join('; ')
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

  // Derive turn count from player messages in current chapter
  const playerTurnCount = gs.history.messages.filter(m => m.role === 'player').length
  const frameLine = gs.chapterFrame
    ? `FRAME: ${gs.chapterFrame.objective} | Crucible: ${gs.chapterFrame.crucible} | Turns: ${playerTurnCount}`
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
    ? `\nHEAT: ${heatEntries.map(h => `${h.faction}=${h.level} (${h.reasons.join(',')})`).join(' | ')}`
    : ''

  // --- Ledger ---
  const ledger = w.ledger ?? []
  const lastTx = ledger.length > 0 ? ledger[ledger.length - 1] : null
  const ledgerSuffix = lastTx
    ? ` | Last: ${lastTx.amount > 0 ? '+' : ''}${lastTx.amount} (${lastTx.description}, ${lastTx.day})`
    : ''

  const toolCheatSheet = `TOOLS: update_world(setLocation|setCurrentTime|setSceneSnapshot|addNpcs|updateNpc|addThread|updateThread|addPromise|updatePromise|addDecision|updateDecision|addFaction|setOperationState|setExplorationState|addTimer|updateTimer|updateHeat|addLedgerEntry) | update_character(hp|credits|inventory|levelUp|exhaustion) | request_roll | signal_close_ready | set_chapter_frame | start_combat | end_combat | update_ship | update_cohesion | update_disposition | update_clock | update_antagonist | award_inspiration | add_clue | connect_clues | suggest_actions | meta_response`

  return `PRESSURE: ${pressureLine}

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
NPCS: ${npcsLine}
THREADS: ${threadsLine}
PROMISES: ${promisesLine}${decisionsLine ? `\nDECISIONS: ${decisionsLine}` : ''}
ANTAG: ${antagonistLine}
CLOCKS: ${clocksLine}${timersLine}${heatLine}${shipSection}${operationSection}${explorationSection}${notebookSection}

${combatSection}
${historySection}
${chapterLine}${frameLine ? '\n' + frameLine : ''}

${toolCheatSheet}`
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
): Array<{ role: 'user' | 'assistant'; content: string }> {
  const allMessages = gameState.history.messages
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = []

  // Boost history budget during active operations when context matters most
  const hasActiveOp = gameState.world.operationState &&
    ['active', 'extraction'].includes(gameState.world.operationState.phase)
  const hasExploration = !!gameState.world.explorationState
  const budget = TARGET_HISTORY_TOKENS + ((hasActiveOp || hasExploration) ? OPERATION_TOKEN_BOOST : 0)

  // Walk backwards from most recent, accumulating until token budget hit
  // but always include at least MIN_MESSAGE_FLOOR messages
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
      const prefix = msg.role === 'meta-question' ? '[META] ' : ''
      messages.push({ role: 'user', content: prefix + msg.content })
    } else if (msg.role === 'gm' || msg.role === 'meta-response') {
      messages.push({ role: 'assistant', content: msg.content })
    }
  }

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

IMPORTANT: Use update_world to establish the starting location (setLocation), the current time (setCurrentTime — e.g. "Day 1, early morning"), the scene snapshot (setSceneSnapshot), at least one NPC (addNpcs), one faction (addFaction), and one narrative thread (addThread). The world state is blank — you must populate it.`

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
    ? `\n\nChapter frame (provisional — confirm or adjust in your first turns): Objective: ${frame.objective}. Crucible: ${frame.crucible}. If the player's first actions redirect the chapter's direction fundamentally, update the frame with set_chapter_frame. Otherwise, confirm it silently and play toward the crucible.`
    : chapterNumber > 1
      ? `\n\nNo chapter frame established yet. Establish one with set_chapter_frame within the first 2-3 turns, based on the player's direction.`
      : ''

  const op = gameState.world.operationState
  const opContext = op
    ? `\n\nActive operation: ${op.name}, phase: ${op.phase}. Primary objective: ${op.objectives[0]?.text || 'see state'}.`
    : ''

  return `Continue the campaign. The player is resuming at Chapter ${chapterNumber}: ${chapterTitle}.

Current location: ${location}. Do not restart the story, do not retread completed chapter events, and do not use tutorial-as-narrative structure.${narrativeAnchor}${frameOrientation}${opContext}`
}
