import { isActiveSf2Procedure } from '../procedure'
import type { Sf2State } from '../types'
import { canonicalizeSf2RollableSkill, normalizeSf2SkillKey } from '../rollable-skills'

export type Sf2RollGateSource =
  | 'skill_tag'
  | 'free_text'
  | 'active_procedure_constraint'
  | 'npc_information'
  | 'combat_state'
  | 'explicit_player_request'

export type Sf2RollGateKind =
  | 'skill_tag'
  | 'social_pressure'
  | 'npc_information'
  | 'technical_system'
  | 'investigation_search'
  | 'risky_movement'
  | 'physical_contest'
  | 'constrained_departure'
  | 'combat_attack'
  | 'resistance_save'
  | 'explicit_roll'

export type Sf2RollGateBinding = 'advisory' | 'expected' | 'hard'

export interface Sf2RequiredRollGate {
  required: true
  kind: Sf2RollGateKind
  source: Sf2RollGateSource
  skills: string[]
  reason: string
  binding: Sf2RollGateBinding
  sourceId?: string
}

const SKILL_TAG_PATTERN = /\[([^\]]+)\]/g

const GATE_SKILLS: Record<Exclude<Sf2RollGateKind, 'skill_tag'>, string[]> = {
  social_pressure: ['Intimidation', 'Persuasion', 'Deception'],
  npc_information: ['Persuasion', 'Intimidation', 'Insight'],
  technical_system: ['Investigation', 'Arcana'],
  investigation_search: ['Perception', 'Investigation'],
  risky_movement: ['Stealth', 'Acrobatics', 'Athletics'],
  physical_contest: ['Athletics', 'Acrobatics'],
  constrained_departure: ['Piloting', 'Investigation', 'Athletics'],
  combat_attack: ['Athletics', 'Acrobatics'],
  resistance_save: ['Athletics', 'Acrobatics', 'Insight'],
  explicit_roll: ['Investigation', 'Perception', 'Persuasion'],
}

export function extractSf2RollSkillTags(playerInput: string): string[] {
  if (!playerInput) return []
  const skills: string[] = []
  for (const match of playerInput.matchAll(SKILL_TAG_PATTERN)) {
    const tokens = match[1].trim().split(/\s+or\s+|\s*,\s*|\s+and\s+/i).map((t) => t.trim())
    for (const tok of tokens) {
      const canonical = canonicalizeSf2RollableSkill(tok)
      if (canonical && !skills.includes(canonical)) skills.push(canonical)
    }
  }
  return skills
}

export interface Sf2RollSkillTagDiagnostics {
  skills: string[]
  unknownSkillLikeTags: string[]
}

export function inspectSf2RollSkillTags(playerInput: string): Sf2RollSkillTagDiagnostics {
  if (!playerInput) return { skills: [], unknownSkillLikeTags: [] }
  const skills: string[] = []
  const unknownSkillLikeTags: string[] = []
  for (const match of playerInput.matchAll(SKILL_TAG_PATTERN)) {
    const tokens = match[1].trim().split(/\s+or\s+|\s*,\s*|\s+and\s+/i).map((t) => t.trim())
    for (const tok of tokens) {
      const canonical = canonicalizeSf2RollableSkill(tok)
      if (canonical) {
        if (!skills.includes(canonical)) skills.push(canonical)
      } else if (looksLikeSkillTag(tok) && !unknownSkillLikeTags.includes(tok)) {
        unknownSkillLikeTags.push(tok)
      }
    }
  }
  return { skills, unknownSkillLikeTags }
}

export function computeRequiredRollGate(state: Sf2State, playerInput: string): Sf2RequiredRollGate | null {
  const tagInspection = inspectSf2RollSkillTags(playerInput)
  if (tagInspection.unknownSkillLikeTags.length > 0) {
    console.warn('[sf2/roll-gate] unknown skill tag(s)', {
      tags: tagInspection.unknownSkillLikeTags,
      playerInput: playerInput.slice(0, 500),
    })
  }
  const taggedSkills = tagInspection.skills
  if (taggedSkills.length > 0) {
    return {
      required: true,
      kind: 'skill_tag',
      source: 'skill_tag',
      skills: taggedSkills,
      reason: 'player included a bracketed skill hint',
      binding: 'expected',
    }
  }

  const input = normalizeRollGateText(playerInput)
  if (!input || shouldSkipRollGate(input)) return null

  const explicitRoll = detectExplicitRoll(input)
  if (explicitRoll) return explicitRoll

  const combatGate = detectCombatGate(state, input)
  if (combatGate) return combatGate

  const resistanceGate = detectResistanceGate(input)
  if (resistanceGate) return resistanceGate

  const npcGate = detectNpcInformationGate(state, input)
  if (npcGate) return npcGate

  const departureGate = detectConstrainedDepartureGate(state, input)
  if (departureGate) return departureGate

  if (matchesAny(input, [
    /\b(compel|demand|threaten|intimidate|lean on|corner|confront|challenge|coerce|make (?:him|her|them|it) (?:talk|answer|move|stand down))\b/,
    /\b(?:pressure|press|push|force)\b.{0,40}\b(?:him|her|them|someone|somebody|to|into|for|about)\b/,
    /\b(?:speed up|hurry|expedite|accelerate|make sure|you better|need\b.{0,30}\bnow)\b/,
    /\b(talk (?:him|her|them|it) (?:into|down|out of)|convince|persuade|bluff|lie to|deceive|fast[- ]talk|negotiate|bargain)\b/,
  ])) {
    return buildGate('social_pressure', 'free_text', 'social pressure or leverage against another actor')
  }

  if (matchesAny(input, [
    /\b(hack|slice|decrypt|crack|bypass|override|spoof|jam|scan|diagnose|calibrate|repair|reroute|patch|access|unlock|open|force open|disable|disarm)\b/,
    /\b(console|terminal|system|network|camera|sensor|drone|door|lock|hatch|ward|rune|array|engine|reactor|beacon|manifest|database|archive|logs?)\b.*\b(check|search|scan|query|pull|access|review|compare)\b/,
  ])) {
    return buildGate('technical_system', 'free_text', 'technical, magical, or system interaction with an uncertain result')
  }

  if (matchesAny(input, [
    /\b(search|look for|inspect|examine|investigate|sweep|scan|study|analyze|analyse|track|trace|follow the trail|check (?:the )?(?:room|area|desk|body|logs?|records?|files?|manifest|cargo|hold))\b/,
    /\b(find (?:a|the|any|where|who|what|why)|figure out|piece together|read the room|case the place)\b/,
  ])) {
    return buildGate('investigation_search', 'free_text', 'investigation, search, scan, or non-trivial observation')
  }

  if (matchesAny(input, [
    /\b(sneak|hide|slip past|creep|shadow|tail|evade|escape|flee|run past|dash through|cross|climb|jump|leap|crawl|squeeze|swim|balance|pickpocket|palm)\b/,
    /\b(through|past|across|over|under)\b.*\b(guards?|patrol|fire|gap|chasm|crowd|checkpoint|blocked|locked|watched|danger|hazard)\b/,
  ])) {
    return buildGate('risky_movement', 'free_text', 'risky stealth, escape, or movement under pressure')
  }

  if (matchesAny(input, [
    /\b(grapple|shove|tackle|wrestle|force|break|bend|lift|drag|carry|hold (?:him|her|them|it|the)|restrain|block|slam|kick|smash|force (?:the )?(?:door|hatch|gate|lock))\b/,
  ])) {
    return buildGate('physical_contest', 'free_text', 'physical contest or force against resistance')
  }

  return null
}

export function renderRollGateBlock(gate: Sf2RequiredRollGate | null): string {
  if (!gate) return ''
  const skillList = gate.skills.length === 1
    ? `\`${gate.skills[0]}\``
    : gate.skills.map((skill) => `\`${skill}\``).join(' or ')
  if (gate.binding === 'hard') {
    return `\n\n---\n\n### Private hard roll gate (never mention)\nThe player's action pushes against immediate mandatory uncertainty: ${gate.reason}. Gate source: ${gate.source}. **You MUST call \`request_roll\` before resolving the action's outcome.** Use ${skillList}, choosing the skill that best fits the fiction and PC approach. Pause at the uncertainty point; do not narrate success, failure, or the target's substantive answer until the roll result returns.`
  }
  if (gate.source === 'skill_tag') {
    return `\n\n---\n\n### Private roll advisory (expected, never mention)\nThe player included a bracketed skill hint for ${skillList}. Treat that hint as a strong expectation, not a hard binding. Prefer calling \`request_roll\` with one of those skills if the action has meaningful uncertainty. If the fiction is already resolved or the current tempo asks for compression, you may continue without a roll; resolve naturally, land a visible delta, and do not expose the tag or this advisory.`
  }
  return `\n\n---\n\n### Private roll advisory (expected, never mention)\nThe player's action pushes against meaningful uncertainty: ${gate.reason}. Gate source: ${gate.source}. You SHOULD call \`request_roll\` before resolving the action's outcome, using ${skillList}. If you continue without a roll, still resolve the action decisively: fail forward, reveal partial information, advance time, add cost, or let an antagonist move. For broad goals, resolve at goal scale after at most one meaningful roll; failure means progress arrives late, publicly, through the wrong person, with a cost, or alongside an antagonist move, not that nothing happens. Do not convert a broad goal into repeated requests, document checks, or refusal loops.`
}

function detectExplicitRoll(input: string): Sf2RequiredRollGate | null {
  if (!/\b(roll|check|skill check)\b/.test(input)) return null
  return buildGate('explicit_roll', 'explicit_player_request', 'the player explicitly requested a check', 'hard')
}

function detectCombatGate(state: Sf2State, input: string): Sf2RequiredRollGate | null {
  if (!state.world.combat?.active) return null
  if (!matchesAny(input, [/\b(attack|shoot|strike|stab|slash|punch|kick|cast|blast|fire|aim|swing|hit)\b/])) return null
  return buildGate('combat_attack', 'combat_state', 'combat attack or consequential combat maneuver', 'hard')
}

function detectResistanceGate(input: string): Sf2RequiredRollGate | null {
  const resistanceVerb = /\b(resist|endure|hold steady|keep control|shake off|fight through|brace(?: myself| yourself| against)?|withstand|push through)\b/.test(input)
  const harmContext = /\b(poison|compulsion|panic|terror|charm|stun|collapse|blast|fire|vacuum|radiation|possession|pain|fear|smoke|heat|cold|pressure)\b/.test(input)
  if (!resistanceVerb || !harmContext) return null
  return buildGate('resistance_save', 'free_text', 'save-like resistance against immediate harm or compulsion', 'hard')
}

function detectConstrainedDepartureGate(state: Sf2State, input: string): Sf2RequiredRollGate | null {
  if (!matchesAny(input, [
    /\b(launch|undock|depart|take off|lift off|fly|pilot|burn|jump|leave)\b/,
    /\b(go|head|move)\b.{0,30}\b(cockpit|bridge|ship|shuttle|helm)\b/,
  ])) return null

  const activeProcedure = Object.values(state.campaign.procedures ?? {}).find((procedure) => {
    if (!isActiveSf2Procedure(procedure)) return false
    const haystack = [
      procedure.label,
      procedure.objective,
      procedure.stakes,
      ...procedure.constraints.filter((c) => c.status === 'active').map((c) => `${c.label} ${c.kind} ${c.clearsWhen ?? ''}`),
      ...procedure.complications.filter((c) => c.status === 'active').map((c) => `${c.label} ${c.effectSummary} ${c.clearsWhen ?? ''}`),
    ].join(' ').toLowerCase()
    return /\b(launch|undock|depart|departure|clearance|seal|sealed|clamp|bay|dock|route|egress|escape|window|countdown|constraint)\b/.test(haystack)
  })

  if (activeProcedure) {
    return {
      ...buildGate('constrained_departure', 'active_procedure_constraint', 'launch, undock, departure, or cockpit movement under an unresolved procedure constraint'),
      sourceId: activeProcedure.id,
    }
  }
  return null
}

function detectNpcInformationGate(state: Sf2State, input: string): Sf2RequiredRollGate | null {
  const asksForInformation = matchesAny(input, [
    /\b(ask|question|interrogate|press|grill|probe|draw out|get (?:him|her|them|it) to tell|make (?:him|her|them|it) tell)\b/,
    /\b(what|why|who|where|when|how)\b.*\b(know|happened|saw|heard|hide|hiding|want|plan|means?|about)\b/,
  ])
  if (!asksForInformation) return null

  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  const npc = Object.values(state.campaign.npcs).find((candidate) => {
    if (!present.has(candidate.id)) return false
    const trusted = candidate.disposition === 'trusted'
    const earnedDisclosure = candidate.identity?.keyFacts?.some((fact) =>
      /\b(trusts|trusted|earned disclosure|shared freely|owes the truth|full disclosure)\b/i.test(fact)
    )
    return !trusted || !earnedDisclosure
  })
  if (!npc) return null
  return {
    ...buildGate('npc_information', 'npc_information', 'actionable information extraction from a wary or neutral NPC, or another NPC without explicit earned disclosure'),
    sourceId: npc.id,
  }
}

function buildGate(
  kind: Exclude<Sf2RollGateKind, 'skill_tag'>,
  source: Sf2RollGateSource,
  reason: string,
  binding: Sf2RollGateBinding = 'expected'
): Sf2RequiredRollGate {
  return { required: true, kind, source, reason, skills: GATE_SKILLS[kind], binding }
}

function normalizeRollGateText(value: string): string {
  return value.toLocaleLowerCase().replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim()
}

function matchesAny(input: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(input))
}

function shouldSkipRollGate(input: string): boolean {
  if (input.length < 3) return true
  if (/\b(no roll|do not roll|don't roll|pure choice|just narrate)\b/.test(input)) return true
  if (/^\s*(yes|no|okay|ok|continue|go on|next|wait|listen|nod|shrug|smile|say nothing|stay quiet)\.?\s*$/.test(input)) return true
  if (/^\s*(i\s+)?(?:choose|pick|select|take)\s+(?:option\s+)?[a-c1-3]\.?\s*$/.test(input)) return true
  if (/^\s*(i\s+)?(?:accept|agree|refuse|decline|allow|permit|choose|decide)\b/.test(input)) return true
  if (/^\s*(i\s+)?(?:go|walk|head|return|arrive|enter|leave|move)\s+(?:to|toward|into|back to|inside|outside|aboard|down|up)\b/.test(input) &&
    !/\b(quietly|carefully|sneak|avoid|evade|past|guard|patrol|watched|locked|blocked|danger|under fire|chase|cockpit|bridge|ship|shuttle|helm)\b/.test(input)) {
    return true
  }
  if (/\b(rest|sleep|eat|drink|wait|downtime|camp|shop|buy|sell|equip|inventory|save)\b/.test(input) &&
    !/\b(haggle|steal|sneak|search|scan|hack|convince|pressure|threaten)\b/.test(input)) {
    return true
  }
  if (/\b(observe|look around|glance|watch|listen)\b/.test(input) &&
    !/\b(for|closely|carefully|hidden|secret|clue|trace|sign|tell|danger|threat|trap)\b/.test(input)) {
    return true
  }
  if (/\b(use|take|follow|accept|open)\b.*\b(route|passage|door|access|permission|key|chip|badge|invitation|clearance)\b/.test(input) &&
    /\b(already|cleared|earned|given|granted|unlocked|open)\b/.test(input)) {
    return true
  }
  return false
}

function looksLikeSkillTag(token: string): boolean {
  const trimmed = token.trim()
  if (!trimmed || trimmed.length > 48) return false
  if (/[—:;.!?]/.test(trimmed)) return false
  if (!normalizeSf2SkillKey(trimmed)) return false
  if (/\([^)]+\)/.test(trimmed)) return true
  if (/\bof\b/i.test(trimmed)) return true
  return /^[A-Z][A-Za-z]*(?:\s+[A-Z][A-Za-z]*){0,2}$/.test(trimmed)
}
