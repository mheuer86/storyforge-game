import { resolvePlayerAction } from '../action-resolver/resolve'
import { normalizeSf2SkillKey } from '../rollable-skills'
import type {
  Sf2EntityId,
  Sf2Npc,
  Sf2ResolvedPlayerAction,
  Sf2State,
} from '../types'

export type Sf2SocialModifierSource =
  | 'origin'
  | 'disposition'
  | 'cohesion'
  | 'trait'
  | 'inventory'
  | 'other'

export type Sf2SocialModifierType = 'advantage' | 'disadvantage' | 'challenge'

export interface Sf2SocialModifierAdvisory {
  id: string
  source: Sf2SocialModifierSource
  modifierType: Sf2SocialModifierType
  skills: string[]
  targetNpcId?: Sf2EntityId
  targetFactionId?: Sf2EntityId
  reason: string
  priority: number
  confidence: 'deterministic' | 'advisory'
}

export interface EvaluateSocialModifierAdvisoriesInput {
  state: Sf2State
  playerInput: string
  resolvedAction?: Sf2ResolvedPlayerAction
  skill?: string
  targetEntityIds?: Sf2EntityId[]
}

export interface ReconcileRollModifierInput {
  state: Sf2State
  playerInput: string
  skill: string
  requestedModifierType?: Sf2SocialModifierType
  requestedModifierReason?: string
  resolvedAction?: Sf2ResolvedPlayerAction
  targetEntityIds?: Sf2EntityId[]
}

export interface ReconciledRollModifier {
  modifierType?: Sf2SocialModifierType
  modifierReason?: string
  advisory?: Sf2SocialModifierAdvisory
  diagnostics: string[]
}

const SOCIAL_SKILLS = ['Persuasion', 'Deception', 'Intimidation', 'Insight', 'Performance']
const INFORMATION_SKILLS = ['Insight', 'Investigation', 'Perception']
const INSTITUTIONAL_SKILLS = ['Persuasion', 'Intimidation', 'Investigation', 'History', 'Insight']

const ORIGIN_PRIORITY = 100
const DISPOSITION_PRIORITY = 90
const COHESION_PRIORITY = 60
const GENERIC_ORIGIN_PRIORITY = 50

export function evaluateSocialModifierAdvisories(
  input: EvaluateSocialModifierAdvisoriesInput
): Sf2SocialModifierAdvisory[] {
  const resolvedAction = input.resolvedAction ?? resolvePlayerAction(input.state, input.playerInput)
  const targetEntityIds = input.targetEntityIds ?? resolvedAction.targetEntityIds
  const targetNpcs = targetEntityIds
    .map((id) => input.state.campaign.npcs[id])
    .filter((npc): npc is Sf2Npc => Boolean(npc))
  const advisories: Sf2SocialModifierAdvisory[] = []

  for (const npc of targetNpcs) {
    advisories.push(...evaluateHegemonyTargetOriginRules(input.state, input.playerInput, npc))
    advisories.push(...evaluateDispositionRules(input.state, input.playerInput, resolvedAction, npc))
  }

  advisories.push(...evaluateGenericHegemonyOriginRules(input.state, input.playerInput))
  advisories.push(...evaluateCohesionRules(input.state, input.playerInput, resolvedAction))

  const skill = input.skill
  const filtered = skill
    ? advisories.filter((advisory) => skillMatches(advisory, skill))
    : advisories

  return dedupeAdvisories(filtered).sort((a, b) => b.priority - a.priority || a.id.localeCompare(b.id))
}

export function renderSocialModifierAdvisories(
  advisories: Sf2SocialModifierAdvisory[]
): string {
  if (advisories.length === 0) return ''
  const lines = advisories.slice(0, 4).map((advisory) => {
    const target = advisory.targetNpcId ? ` · target ${advisory.targetNpcId}` : ''
    const skills = advisory.skills.length > 0 ? ` · skills ${advisory.skills.join('/')}` : ''
    return `- ${advisory.modifierType.toUpperCase()} [${advisory.source}${target}${skills}]: ${advisory.reason}`
  })
  return `\n\n---\n\n### Private social roll modifier advisories (never mention)\nThese are code-owned roll-positioning facts for this player action. When calling \`request_roll\`, apply the matching modifier_type and include the reason. If multiple lines apply, prefer target-specific origin/disposition over cohesion or generic origin posture.\n${lines.join('\n')}`
}

export function reconcileRollModifierWithSocialAdvisories(
  input: ReconcileRollModifierInput
): ReconciledRollModifier {
  const advisories = evaluateSocialModifierAdvisories(input)
  const advisory = advisories[0]
  const diagnostics: string[] = []
  if (!advisory) {
    return {
      modifierType: input.requestedModifierType,
      modifierReason: input.requestedModifierReason,
      diagnostics,
    }
  }

  if (!input.requestedModifierType) {
    return {
      modifierType: advisory.modifierType,
      modifierReason: advisory.reason,
      advisory,
      diagnostics,
    }
  }

  if (input.requestedModifierType === advisory.modifierType) {
    return {
      modifierType: input.requestedModifierType,
      modifierReason: appendReason(input.requestedModifierReason, advisory.reason),
      advisory,
      diagnostics,
    }
  }

  if (isDeterministicTargetSpecific(advisory)) {
    diagnostics.push(
      `social_modifier_override:${advisory.id}: narrator=${input.requestedModifierType}; code=${advisory.modifierType}`
    )
    return {
      modifierType: advisory.modifierType,
      modifierReason: appendReason(
        advisory.reason,
        input.requestedModifierReason
          ? `Narrator requested ${input.requestedModifierType}: ${input.requestedModifierReason}`
          : `Narrator requested ${input.requestedModifierType}`
      ),
      advisory,
      diagnostics,
    }
  }

  diagnostics.push(
    `social_modifier_conflict_preserved:${advisory.id}: narrator=${input.requestedModifierType}; advisory=${advisory.modifierType}`
  )
  return {
    modifierType: input.requestedModifierType,
    modifierReason: input.requestedModifierReason,
    advisory,
    diagnostics,
  }
}

function evaluateHegemonyTargetOriginRules(
  state: Sf2State,
  playerInput: string,
  npc: Sf2Npc
): Sf2SocialModifierAdvisory[] {
  if (!isHegemony(state)) return []
  const originId = state.player.origin.id
  const factionText = affiliationText(npc)
  const advisories: Sf2SocialModifierAdvisory[] = []

  if (originId === 'synod' && isUndrift(factionText) && isSocialInformationAttempt(playerInput)) {
    advisories.push({
      id: `origin_synod_undrift_${npc.id}`,
      source: 'origin',
      modifierType: 'disadvantage',
      skills: [...SOCIAL_SKILLS, ...INFORMATION_SKILLS],
      targetNpcId: npc.id,
      reason: 'Undrift contact treats Synod-trained PCs as an institutional threat.',
      priority: ORIGIN_PRIORITY,
      confidence: 'deterministic',
    })
  }

  if (
    originId === 'undrift' &&
    (isSynod(factionText) || isImperial(factionText) || isHouse(factionText)) &&
    isSocialInformationAttempt(playerInput)
  ) {
    advisories.push({
      id: `origin_undrift_institution_${npc.id}`,
      source: 'origin',
      modifierType: 'disadvantage',
      skills: [...SOCIAL_SKILLS, ...INFORMATION_SKILLS],
      targetNpcId: npc.id,
      reason: 'Institutional NPC treats an Undrift PC as illegal, exposed, or dangerous until trust is earned.',
      priority: ORIGIN_PRIORITY,
      confidence: 'deterministic',
    })
  }

  if (
    originId === 'spent-resonant' &&
    isSynod(factionText) &&
    mentionsExposedCapacity(playerInput)
  ) {
    advisories.push({
      id: `origin_spent_resonant_synod_danger_${npc.id}`,
      source: 'origin',
      modifierType: 'challenge',
      skills: [...SOCIAL_SKILLS, ...INFORMATION_SKILLS],
      targetNpcId: npc.id,
      reason: 'Exposing remaining Resonant capacity creates Synod danger, not simple leverage.',
      priority: ORIGIN_PRIORITY,
      confidence: 'deterministic',
    })
  }

  return advisories
}

function evaluateGenericHegemonyOriginRules(
  state: Sf2State,
  playerInput: string
): Sf2SocialModifierAdvisory[] {
  if (!isHegemony(state)) return []
  const originId = state.player.origin.id
  const input = normalizeText(playerInput)

  if (
    originId === 'imperial-service' &&
    /\b(protocol|jurisdiction|authority|clearance|official|imperial|throne|mandate|warrant|credential)\b/.test(input)
  ) {
    return [{
      id: 'origin_imperial_service_authority',
      source: 'origin',
      modifierType: 'advantage',
      skills: INSTITUTIONAL_SKILLS,
      reason: 'Imperial Service training and clearance support protocol, jurisdiction, and official-authority checks.',
      priority: GENERIC_ORIGIN_PRIORITY,
      confidence: 'advisory',
    }]
  }

  if (
    originId === 'minor-house' &&
    /\b(trade|bargain|negotiate|negotiation|alliance|ally|contract|house|dowry|patron|retainer)\b/.test(input)
  ) {
    return [{
      id: 'origin_minor_house_negotiation',
      source: 'origin',
      modifierType: 'advantage',
      skills: ['Persuasion', 'Insight', 'History'],
      reason: 'Minor House upbringing supports trade, negotiation, and alliance-building checks.',
      priority: GENERIC_ORIGIN_PRIORITY,
      confidence: 'advisory',
    }]
  }

  if (
    originId === 'spent-resonant' &&
    /\b(synod|resonant|attunement|classification|ashen|ward|procedure|protocol|handling)\b/.test(input) &&
    !mentionsExposedCapacity(playerInput)
  ) {
    return [{
      id: 'origin_spent_resonant_institutional_knowledge',
      source: 'origin',
      modifierType: 'advantage',
      skills: ['Investigation', 'Insight', 'History', 'Religion', 'Arcana'],
      reason: 'Spent Resonant history provides institutional knowledge of Synod procedure and Resonant handling.',
      priority: GENERIC_ORIGIN_PRIORITY,
      confidence: 'advisory',
    }]
  }

  return []
}

function evaluateDispositionRules(
  state: Sf2State,
  playerInput: string,
  resolvedAction: Sf2ResolvedPlayerAction,
  npc: Sf2Npc
): Sf2SocialModifierAdvisory[] {
  const input = normalizeText(playerInput)
  const hasLeverage = mentionsLeverage(input, state, npc)
  const skills = [...SOCIAL_SKILLS, ...INFORMATION_SKILLS]

  if (
    (npc.disposition === 'trusted' || npc.disposition === 'favorable') &&
    isCooperativeAsk(input, resolvedAction)
  ) {
    return [{
      id: `disposition_${npc.disposition}_${npc.id}`,
      source: 'disposition',
      modifierType: 'advantage',
      skills,
      targetNpcId: npc.id,
      reason: `${npc.name} is ${npc.disposition} and the request aligns with cooperative help or information-sharing.`,
      priority: DISPOSITION_PRIORITY,
      confidence: 'deterministic',
    }]
  }

  if (
    npc.disposition === 'wary' &&
    isSensitiveInformationExtraction(input, resolvedAction) &&
    !hasLeverage
  ) {
    return [{
      id: `disposition_wary_sensitive_${npc.id}`,
      source: 'disposition',
      modifierType: 'disadvantage',
      skills: ['Persuasion', 'Deception', 'Insight', 'Investigation', 'Perception'],
      targetNpcId: npc.id,
      reason: `${npc.name} is wary and the action seeks sensitive information without established leverage.`,
      priority: DISPOSITION_PRIORITY,
      confidence: 'deterministic',
    }]
  }

  if (
    npc.disposition === 'hostile' &&
    resolvedAction.actionType !== 'pressure_npc' &&
    /\b(persuade|convince|deceive|lie|cooperate|help|trust|share|tell)\b/.test(input)
  ) {
    return [{
      id: `disposition_hostile_cooperation_${npc.id}`,
      source: 'disposition',
      modifierType: 'disadvantage',
      skills: ['Persuasion', 'Deception'],
      targetNpcId: npc.id,
      reason: `${npc.name} is hostile and the check asks them to cooperate without leverage.`,
      priority: DISPOSITION_PRIORITY,
      confidence: 'deterministic',
    }]
  }

  return []
}

function evaluateCohesionRules(
  state: Sf2State,
  playerInput: string,
  resolvedAction: Sf2ResolvedPlayerAction
): Sf2SocialModifierAdvisory[] {
  const cohesion = state.derived?.cohesion
  if (typeof cohesion !== 'number' || !Number.isFinite(cohesion)) return []
  if (!dependsOnCrewSupport(playerInput, resolvedAction)) return []

  if (cohesion >= 4) {
    return [{
      id: 'cohesion_high_support',
      source: 'cohesion',
      modifierType: 'advantage',
      skills: [...SOCIAL_SKILLS, ...INFORMATION_SKILLS],
      reason: `High cohesion (${cohesion}/5) supports coordinated crew or contact-backed checks.`,
      priority: COHESION_PRIORITY,
      confidence: 'advisory',
    }]
  }

  if (cohesion <= 2) {
    return [{
      id: 'cohesion_low_support',
      source: 'cohesion',
      modifierType: 'disadvantage',
      skills: [...SOCIAL_SKILLS, ...INFORMATION_SKILLS],
      reason: `Low cohesion (${cohesion}/5) undermines checks relying on crew trust, contact reliability, or coordinated assistance.`,
      priority: COHESION_PRIORITY,
      confidence: 'advisory',
    }]
  }

  return []
}

function skillMatches(advisory: Sf2SocialModifierAdvisory, skill: string): boolean {
  const key = normalizeSf2SkillKey(skill)
  return advisory.skills.some((candidate) => normalizeSf2SkillKey(candidate) === key)
}

function dedupeAdvisories(advisories: Sf2SocialModifierAdvisory[]): Sf2SocialModifierAdvisory[] {
  const byId = new Map<string, Sf2SocialModifierAdvisory>()
  for (const advisory of advisories) byId.set(advisory.id, advisory)
  return [...byId.values()]
}

function isDeterministicTargetSpecific(advisory: Sf2SocialModifierAdvisory): boolean {
  return (
    advisory.confidence === 'deterministic' &&
    Boolean(advisory.targetNpcId || advisory.targetFactionId) &&
    (advisory.source === 'origin' || advisory.source === 'disposition')
  )
}

function appendReason(existing: string | undefined, addition: string): string {
  const trimmedExisting = existing?.trim()
  const trimmedAddition = addition.trim()
  if (!trimmedExisting) return trimmedAddition
  if (!trimmedAddition) return trimmedExisting
  if (trimmedExisting.toLowerCase().includes(trimmedAddition.toLowerCase())) return trimmedExisting
  return `${trimmedExisting}; ${trimmedAddition}`
}

function isHegemony(state: Sf2State): boolean {
  return state.meta.genreId === 'epic-scifi' || state.meta.genreId === 'hegemony'
}

function affiliationText(npc: Sf2Npc): string {
  return normalizeText(`${npc.affiliation} ${npc.role} ${npc.retrievalCue}`)
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ')
}

function isUndrift(text: string): boolean {
  return /\bundrift\b/.test(text)
}

function isSynod(text: string): boolean {
  return /\bsynod\b/.test(text)
}

function isImperial(text: string): boolean {
  return /\b(imperial|throne|hegemony)\b/.test(text)
}

function isHouse(text: string): boolean {
  return /\b(house|major house|minor house|great house|rival house)\b/.test(text)
}

function isSocialInformationAttempt(playerInput: string): boolean {
  const input = normalizeText(playerInput)
  return /\b(ask|question|press|pressure|push|demand|tell|share|convince|persuade|deceive|lie|read|probe|learn|extract|cooperate|help|aid|warn|negotiate)\b/.test(input)
}

function isCooperativeAsk(input: string, resolvedAction: Sf2ResolvedPlayerAction): boolean {
  if (resolvedAction.actionType === 'question_npc' || resolvedAction.actionType === 'address_npc') return true
  return /\b(ask|help|aid|support|share|tell|explain|vouch|introduce|coordinate|cooperate|work with|trust)\b/.test(input)
}

function isSensitiveInformationExtraction(
  input: string,
  resolvedAction: Sf2ResolvedPlayerAction
): boolean {
  if (resolvedAction.actionType === 'question_npc' || resolvedAction.actionType === 'pressure_npc') {
    return /\b(secret|sensitive|classified|hidden|hiding|truth|tell me|who|where|why|what happened|name|ally|contact|network|safehouse|evidence|ledger|record|document|file|proof|confess|admit)\b/.test(input)
  }
  return /\b(extract|probe|read|interrogate|confess|admit|reveal)\b/.test(input)
}

function mentionsLeverage(input: string, state: Sf2State, npc: Sf2Npc): boolean {
  if (/\b(leverage|proof|evidence|bargain|trade|promise|owed|debt|protect|shield|blackmail|warrant|authority|clearance)\b/.test(input)) {
    return true
  }
  const recentText = state.history.turns
    .slice(-3)
    .map((turn) => `${turn.playerInput} ${turn.narratorProse}`)
    .join(' ')
    .toLowerCase()
  return recentText.includes(npc.id.toLowerCase()) &&
    /\b(earned trust|trust earned|gave leverage|has leverage|proved|vouched|promised protection)\b/.test(recentText)
}

function dependsOnCrewSupport(playerInput: string, resolvedAction: Sf2ResolvedPlayerAction): boolean {
  const input = normalizeText(playerInput)
  if (/\b(crew|team|retinue|contact|contacts|ally|allies|network|handler|support|coordinate|together|backup|back me|vouch|introduce)\b/.test(input)) {
    return true
  }
  return resolvedAction.actionType === 'address_npc' &&
    /\b(we|our)\b/.test(input) &&
    /\b(help|support|coordinate|trust|together)\b/.test(input)
}

function mentionsExposedCapacity(playerInput: string): boolean {
  const input = normalizeText(playerInput)
  return /\b(reveal|show|expose|demonstrate|use)\b/.test(input) &&
    /\b(drift|capacity|attune|resonant|power)\b/.test(input)
}
