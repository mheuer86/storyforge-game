import { getGenreConfig, type CharacterClass, type Genre, type Species } from '../../genre-config'
import type {
  Sf2Player,
  Sf2RollActionKind,
  Sf2RollActionOption,
  Sf2RollDiceMode,
  Sf2RollResourceSpend,
  Sf2RollSourceBreakdown,
  Sf2SelectedRollAction,
  Sf2State,
} from '../types'

export type Sf2Ability = keyof Sf2Player['stats']

export interface Sf2RollCheckInput {
  skill: string
  dc: number
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
}

export interface Sf2RollResolution {
  skill: string
  ability: Sf2Ability
  abilityModifier: number
  proficiencyBonus: number
  proficient: boolean
  flatBonus: number
  modifier: number
  effectiveDc: number
  diceMode: Sf2RollDiceMode
  criticalRange: number
  sourceBreakdown: Sf2RollSourceBreakdown[]
  actionOptions: Sf2RollActionOption[]
  selectedRollAction?: Sf2SelectedRollAction
  spentResources: Sf2RollResourceSpend[]
  resolutionKind?: 'trait_auto_success' | 'trait_auto_critical'
  modifierType?: 'advantage' | 'disadvantage' | 'challenge'
  modifierReason?: string
}

type TextEffect = {
  kind: 'advantage' | 'disadvantage'
  sourceKind: Sf2RollSourceBreakdown['kind']
  source: string
  label: string
  detail?: string
}

const ABILITIES: Sf2Ability[] = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']

const SKILL_STAT_PATTERNS: Array<{ patterns: RegExp[]; ability: Sf2Ability }> = [
  {
    ability: 'INT',
    patterns: [
      /\bhacking?\b/,
      /\belectronics?\b/,
      /\bnet architecture\b/,
      /\bengineering\b/,
      /\bmechanics?\b/,
      /\bcyberware (?:installation|maintenance)\b/,
      /\bxenotech\b/,
      /\bgalactic lore\b/,
      /\bforbidden lore\b/,
      /\bdrift lore\b/,
      /\barcana\b/,
      /\bhistory\b/,
      /\bnature\b/,
      /\breligion\b/,
      /\binvestigation\b/,
      /\banalysis\b/,
      /\bappraisal\b/,
      /\bcrafting\b/,
      /\bhexcrafting\b/,
    ],
  },
  {
    ability: 'DEX',
    patterns: [
      /\bpiloting\b/,
      /\bhelm\b/,
      /\bsharpshooting\b/,
      /\branged\b/,
      /\bacrobatics?\b/,
      /\bstealth\b/,
      /\bsleight of hand\b/,
      /\blockpick(?:ing)?\b/,
      /\breflex\b/,
      /\binitiative\b/,
    ],
  },
  {
    ability: 'CHA',
    patterns: [
      /\bpersuasion\b/,
      /\bdeception\b/,
      /\bintimidation\b/,
      /\bperformance\b/,
      /\bleadership\b/,
      /\bcommand\b/,
    ],
  },
  {
    ability: 'STR',
    patterns: [
      /\bathletics?\b/,
      /\bheavy weapons?\b/,
      /\bmelee\b/,
      /\bshield tactics?\b/,
    ],
  },
  {
    ability: 'CON',
    patterns: [
      /\bconstitution\b/,
      /\bcon save\b/,
      /\bendurance\b/,
      /\bcorruption resistance\b/,
    ],
  },
  {
    ability: 'WIS',
    patterns: [
      /\binsight\b/,
      /\bperception\b/,
      /\bsurvival\b/,
      /\bmedicine\b/,
      /\btracking\b/,
      /\banimal handling\b/,
      /\bstreetwise\b/,
      /\bstreet lore\b/,
    ],
  },
]

const SKILL_ALIASES: Record<string, string[]> = {
  hacking: ['hack', 'hacking', 'network', 'networked', 'system', 'machine', 'electronics', 'ice'],
  electronics: ['electronics', 'system', 'device', 'machine'],
  engineering: ['engineering', 'engineer', 'repair', 'structural', 'technical', 'tech-repair', 'mechanical'],
  mechanics: ['mechanics', 'mechanic', 'repair', 'ship systems', 'machine'],
  xenotech: ['xenotech', 'alien technology', 'artifact', 'ancient artifact'],
  'galactic lore': ['galactic lore', 'compact-era', 'compact', 'historical', 'history', 'lore'],
  piloting: ['pilot', 'piloting', 'cockpit', 'vehicle', 'ship', 'helm', 'flight'],
  sharpshooting: ['sharpshooting', 'ranged', 'ranged attack', 'attack', 'shot', 'shoot', 'blaster', 'rifle'],
  'heavy weapons': ['heavy weapons', 'attack', 'weapon', 'fire'],
  melee: ['melee', 'attack', 'weapon', 'strike'],
  stealth: ['stealth', 'sneak', 'unnoticed', 'hidden', 'hide', 'evasion', 'evade', 'escape', 'exit'],
  athletics: ['athletics', 'climb', 'climbing', 'traversal', 'physical', 'muscle'],
  acrobatics: ['acrobatics', 'balance', 'reflex', 'physical'],
  persuasion: ['persuasion', 'persuade', 'negotiate', 'negotiation', 'cooperation', 'first impression', 'social influence'],
  deception: ['deception', 'disguise', 'lie', 'lying', 'conceal', 'hide your identity'],
  intimidation: ['intimidation', 'intimidate', 'threaten', 'fear'],
  insight: ['insight', 'read', 'emotional', 'motive', 'intent'],
  investigation: ['investigation', 'investigate', 'analysis', 'analyze', 'crime scene', 'pattern'],
  perception: ['perception', 'notice', 'detect', 'observe', 'spot'],
  medicine: ['medicine', 'medical', 'surgical', 'triage', 'stabilize'],
  streetwise: ['streetwise', 'street lore', 'underworld', 'street', 'city'],
  survival: ['survival', 'survive', 'frontier', 'wilderness'],
}

export function sf2AbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2)
}

export function sf2ProficiencyBonus(level = 1): number {
  return Math.floor((Math.max(1, level) - 1) / 4) + 2
}

export function resolveSf2SkillAbility(state: Sf2State, skill: string): {
  ability: Sf2Ability
  reason: 'explicit' | 'playbook_primary' | 'wis_fallback'
} {
  const normalized = normalizeText(skill)
  for (const entry of SKILL_STAT_PATTERNS) {
    if (entry.patterns.some((pattern) => pattern.test(normalized))) {
      return { ability: entry.ability, reason: 'explicit' }
    }
  }

  const playbook = findStatePlaybook(state)
  const primaryStat = playbook?.primaryStat?.toUpperCase()
  if (primaryStat && isAbility(primaryStat) && playerIsProficient(state.player, skill)) {
    return { ability: primaryStat, reason: 'playbook_primary' }
  }

  return { ability: 'WIS', reason: 'wis_fallback' }
}

export function resolveSf2Roll(
  state: Sf2State,
  check: Sf2RollCheckInput,
  selectedActionId?: string | null
): Sf2RollResolution {
  const abilityResolution = resolveSf2SkillAbility(state, check.skill)
  const ability = abilityResolution.ability
  const abilityModifier = sf2AbilityModifier(state.player.stats[ability] ?? 10)
  const proficiencyBonus = sf2ProficiencyBonus(state.player.level)
  const proficient = playerIsProficient(state.player, check.skill)
  const sourceBreakdown: Sf2RollSourceBreakdown[] = [
    {
      kind: 'stat',
      source: ability,
      label: `${ability} ${formatSigned(abilityModifier)}`,
      value: abilityModifier,
      detail: abilityResolution.reason === 'explicit'
        ? 'Skill mapping'
        : abilityResolution.reason === 'playbook_primary'
          ? 'Fallback to playbook primary stat'
          : 'Fallback ability',
    },
  ]
  if (proficient) {
    sourceBreakdown.push({
      kind: 'proficiency',
      source: 'proficiency',
      label: `Proficiency ${formatSigned(proficiencyBonus)}`,
      value: proficiencyBonus,
      detail: 'Player proficiency',
    })
  }

  const flatBonuses = collectFlatBonuses(state, check.skill)
  sourceBreakdown.push(...flatBonuses.sources)

  const passiveEffects = collectPassiveEffects(state, check.skill)
  for (const effect of passiveEffects) {
    sourceBreakdown.push({
      kind: effect.kind,
      source: effect.source,
      label: effect.label,
      detail: effect.detail,
    })
  }

  const actionOptions = collectRollActionOptions(state, check.skill)
  const selectedOption = selectedActionId
    ? actionOptions.find((option) => option.id === selectedActionId)
    : undefined
  const spentResources = selectedOption?.spend ? [selectedOption.spend] : []
  if (selectedOption) {
    sourceBreakdown.push({
      kind: selectedOption.sourceType === 'trait' ? 'selected_trait' : 'selected_item',
      source: selectedOption.sourceName,
      label: selectedOption.label,
      detail: selectedOption.description,
    })
  }

  if (check.modifierType === 'challenge') {
    sourceBreakdown.push({
      kind: 'challenge',
      source: 'check',
      label: 'Challenge +2 DC',
      value: 2,
      detail: check.modifierReason,
    })
  } else if (check.modifierType === 'advantage' || check.modifierType === 'disadvantage') {
    sourceBreakdown.push({
      kind: check.modifierType,
      source: 'position',
      label: check.modifierType === 'advantage' ? 'Advantage' : 'Disadvantage',
      detail: check.modifierReason,
    })
  }

  const selectedKind = selectedOption?.kind
  const advantageCount =
    passiveEffects.filter((effect) => effect.kind === 'advantage').length
    + (check.modifierType === 'advantage' ? 1 : 0)
    + (selectedKind === 'advantage' ? 1 : 0)
  const disadvantageCount =
    passiveEffects.filter((effect) => effect.kind === 'disadvantage').length
    + (check.modifierType === 'disadvantage' ? 1 : 0)

  const diceMode: Sf2RollDiceMode =
    advantageCount > 0 && disadvantageCount === 0
      ? 'advantage'
      : disadvantageCount > 0 && advantageCount === 0
        ? 'disadvantage'
        : 'normal'

  const criticalRange = selectedKind === 'expanded_crit'
    ? selectedOption?.criticalRange ?? 19
    : 20
  const resolutionKind = selectedKind === 'auto_success'
    ? 'trait_auto_success'
    : selectedKind === 'auto_critical'
      ? 'trait_auto_critical'
      : undefined
  const modifierType = diceMode === 'advantage' || diceMode === 'disadvantage'
    ? diceMode
    : check.modifierType === 'challenge'
      ? 'challenge'
      : undefined
  const modifierReason = selectedOption?.label
    ?? check.modifierReason
    ?? passiveEffects.find((effect) => effect.kind === modifierType)?.detail

  return {
    skill: check.skill,
    ability,
    abilityModifier,
    proficiencyBonus,
    proficient,
    flatBonus: flatBonuses.total,
    modifier: abilityModifier + (proficient ? proficiencyBonus : 0) + flatBonuses.total,
    effectiveDc: check.dc + (check.modifierType === 'challenge' ? 2 : 0),
    diceMode,
    criticalRange,
    sourceBreakdown,
    actionOptions,
    selectedRollAction: selectedOption
      ? {
          id: selectedOption.id,
          kind: selectedOption.kind,
          sourceType: selectedOption.sourceType,
          sourceId: selectedOption.sourceId,
          sourceName: selectedOption.sourceName,
          label: selectedOption.label,
          description: selectedOption.description,
        }
      : undefined,
    spentResources,
    resolutionKind,
    modifierType,
    modifierReason,
  }
}

export function applySf2RollResourceSpends(state: Sf2State, spends: Sf2RollResourceSpend[]): Sf2State {
  if (spends.length === 0) return state
  const next = structuredClone(state)
  for (const spend of spends) {
    if (spend.kind === 'trait') {
      const trait = next.player.traits.find((candidate) =>
        resourceMatches(candidate, spend)
      )
      if (trait?.uses) {
        trait.uses.current = Math.max(0, trait.uses.current - spend.amount)
      }
      continue
    }
    const item = next.player.inventory.find((candidate) =>
      resourceMatches(candidate, spend)
    )
    if (item && typeof item.charges === 'number') {
      item.charges = Math.max(0, item.charges - spend.amount)
    }
  }
  return next
}

function collectFlatBonuses(state: Sf2State, skill: string): {
  total: number
  sources: Sf2RollSourceBreakdown[]
} {
  let total = 0
  const sources: Sf2RollSourceBreakdown[] = []

  for (const item of state.player.inventory) {
    const value = parseFlatBonus(item.description, skill)
      ?? parseFlatBonus(item.effect, skill)
    if (!value) continue
    total += value
    sources.push({
      kind: 'flat_bonus',
      source: item.name,
      label: `${item.name} ${formatSigned(value)}`,
      value,
      detail: item.description ?? item.effect,
    })
  }

  for (const modifier of state.player.tempModifiers) {
    const value = parseFlatBonus(modifier.effect, skill)
    if (!value) continue
    total += value
    sources.push({
      kind: 'temp',
      source: modifier.source,
      label: `${modifier.source} ${formatSigned(value)}`,
      value,
      detail: modifier.effect,
    })
  }

  return { total, sources }
}

function collectPassiveEffects(state: Sf2State, skill: string): TextEffect[] {
  const effects: TextEffect[] = []
  const origin = findStateOrigin(state)
  if (origin) {
    effects.push(...textEffectsFromDescription({
      sourceKind: 'origin',
      source: origin.name,
      labelPrefix: origin.name,
      description: `${origin.lore}\n${origin.shiftedMechanic?.description ?? ''}`,
      skill,
      limited: false,
    }))
  }

  for (const trait of state.player.traits) {
    effects.push(...textEffectsFromDescription({
      sourceKind: 'trait',
      source: trait.name,
      labelPrefix: trait.name,
      description: trait.description,
      skill,
      limited: Boolean(trait.uses && trait.uses.max > 0),
    }))
  }

  for (const item of state.player.inventory) {
    if (hasItemCharges(item)) continue
    effects.push(...textEffectsFromDescription({
      sourceKind: 'equipment',
      source: item.name,
      labelPrefix: item.name,
      description: item.description ?? item.effect,
      skill,
      limited: false,
    }))
  }

  for (const modifier of state.player.tempModifiers) {
    effects.push(...textEffectsFromDescription({
      sourceKind: 'temp',
      source: modifier.source,
      labelPrefix: modifier.source,
      description: modifier.effect,
      skill,
      limited: false,
    }))
  }

  return dedupeTextEffects(effects)
}

function collectRollActionOptions(state: Sf2State, skill: string): Sf2RollActionOption[] {
  const options: Sf2RollActionOption[] = []
  for (const trait of state.player.traits) {
    if (!trait.description || !trait.uses || trait.uses.current <= 0) continue
    options.push(...actionOptionsFromText({
      sourceType: 'trait',
      sourceId: trait.id,
      sourceName: trait.name,
      description: trait.description,
      skill,
      uses: trait.uses,
    }))
  }

  for (const item of state.player.inventory) {
    if (!hasItemCharges(item) || (item.charges ?? 0) <= 0) continue
    options.push(...actionOptionsFromText({
      sourceType: 'item',
      sourceId: item.id,
      sourceName: item.name,
      description: item.description ?? item.effect ?? '',
      skill,
      uses: { current: item.charges ?? 0, max: item.maxCharges ?? item.charges ?? 0 },
    }))
  }

  return dedupeOptions(options)
}

function actionOptionsFromText(input: {
  sourceType: 'trait' | 'item'
  sourceId?: string
  sourceName: string
  description: string
  skill: string
  uses: { current: number; max: number }
}): Sf2RollActionOption[] {
  const description = input.description
  const text = normalizeText(description)
  const clauses = splitEffectClauses(description)
  const clauseMatches = (predicate: (text: string) => boolean) =>
    clauses.some((clause) =>
      predicate(normalizeText(clause))
      && effectClauseAppliesToSkill(input.skill, clause, { allowGenericCheck: true })
    )
  const options: Sf2RollActionOption[] = []
  const sourceSlug = slug(input.sourceId ?? input.sourceName)
  const base = {
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    sourceName: input.sourceName,
    description,
    spend: {
      kind: input.sourceType === 'trait' ? 'trait' as const : 'item' as const,
      id: input.sourceId,
      name: input.sourceName,
      amount: 1,
      before: input.uses.current,
      after: Math.max(0, input.uses.current - 1),
    },
  }

  if (clauseMatches(mentionsAutoSuccess)) {
    options.push({
      ...base,
      id: `${input.sourceType}:${sourceSlug}:auto-success`,
      kind: 'auto_success',
      label: `${input.sourceName}: auto-success`,
    })
  }

  if (clauseMatches(mentionsAutoCritical)) {
    options.push({
      ...base,
      id: `${input.sourceType}:${sourceSlug}:auto-critical`,
      kind: 'auto_critical',
      label: `${input.sourceName}: auto-critical`,
    })
  } else if (clauseMatches(mentionsExpandedCrit)) {
    options.push({
      ...base,
      id: `${input.sourceType}:${sourceSlug}:expanded-crit`,
      kind: 'expanded_crit',
      label: `${input.sourceName}: crit on 19-20`,
      criticalRange: 19,
    })
  }

  if (
    clauseMatches((clauseText) =>
      mentionsLimitedAdvantage(clauseText) || (input.sourceType === 'item' && mentionsAdvantage(clauseText))
    )
  ) {
    options.push({
      ...base,
      id: `${input.sourceType}:${sourceSlug}:advantage`,
      kind: 'advantage',
      label: `${input.sourceName}: advantage`,
    })
  }

  if (mentionsReroll(text)) {
    options.push({
      ...base,
      id: `${input.sourceType}:${sourceSlug}:reroll`,
      kind: 'reroll',
      label: `${input.sourceName}: reroll`,
    })
  }

  return options
}

function textEffectsFromDescription(input: {
  sourceKind: Sf2RollSourceBreakdown['kind']
  source: string
  labelPrefix: string
  description?: string
  skill: string
  limited: boolean
}): TextEffect[] {
  if (!input.description) return []
  const effects: TextEffect[] = []
  const clauses = splitEffectClauses(input.description)
  for (const clause of clauses) {
    const text = normalizeText(clause)
    if (input.limited && !isAlwaysOnClause(text)) continue
    if (mentionsAdvantage(text) && effectClauseAppliesToSkill(input.skill, clause, { allowGenericCheck: false })) {
      effects.push({
        kind: 'advantage',
        sourceKind: input.sourceKind,
        source: input.source,
        label: `${input.labelPrefix}: advantage`,
        detail: clause.trim(),
      })
    }
    if (mentionsDisadvantage(text) && effectClauseAppliesToSkill(input.skill, clause, { allowGenericCheck: false })) {
      effects.push({
        kind: 'disadvantage',
        sourceKind: input.sourceKind,
        source: input.source,
        label: `${input.labelPrefix}: disadvantage`,
        detail: clause.trim(),
      })
    }
  }
  return effects
}

function splitEffectClauses(description: string): string[] {
  return description
    .split(/(?:\.|;|\n|\bbut\b|\bhowever\b)/i)
    .map((clause) => clause.trim())
    .filter(Boolean)
}

function parseFlatBonus(description: string | undefined, skill: string): number | null {
  if (!description) return null
  const text = normalizeText(description)
  if (!textMatchesSkill(skill, description)) return null
  const match = text.match(/([+-]\d+)\s+(?:to|on)\s+(?:all\s+)?[\w\s-]*checks?/)
    ?? text.match(/([+-]\d+)\s+[\w\s-]*checks?/)
  if (!match) return null
  const value = Number.parseInt(match[1] ?? '', 10)
  if (!Number.isFinite(value)) return null
  return value
}

function mentionsAdvantage(text: string): boolean {
  return /\badvantage\s+(?:on|when|while|with|against|for|in|involving)\b/.test(text)
    || /\b(?:gain|gains|grant|grants|granted|has|have|with|automatic|automatically|permanent|passive)\s+advantage\s+on\b/.test(text)
    || /\bat advantage\b/.test(text)
}

function mentionsDisadvantage(text: string): boolean {
  return /\bdisadvantage\s+(?:on|when|while|with|against|for|in|involving|until)\b/.test(text)
    || /\bat disadvantage\b/.test(text)
}

function mentionsLimitedAdvantage(text: string): boolean {
  return mentionsAdvantage(text) && /\b(once|first|next|per chapter|per day|as a bonus action)\b/.test(text)
}

function mentionsAutoSuccess(text: string): boolean {
  return /\bauto-?succeed\b/.test(text)
    || /\bautomatically succeed\b/.test(text)
    || /\bautomatic success\b/.test(text)
    || /\bworks automatically\b/.test(text)
    || /\bpass unquestioned\b/.test(text)
}

function mentionsAutoCritical(text: string): boolean {
  return /\bautomatic critical\b/.test(text)
    || /\bauto-?critical\b/.test(text)
    || /\bnext attack is an automatic critical hit\b/.test(text)
}

function mentionsExpandedCrit(text: string): boolean {
  return /\bcrit(?:s|ical hit)? on 19-20\b/.test(text)
    || /\bcritical hit on a 19-20\b/.test(text)
    || /\bcritical hit \(on a 19-20\)/.test(text)
}

function mentionsReroll(text: string): boolean {
  return /\breroll\b/.test(text) || /\bre-roll\b/.test(text) || /\broll again\b/.test(text)
}

function isAlwaysOnClause(text: string): boolean {
  if (/\balso has\b/.test(text) || /\bpassive\b/.test(text) || /\bpermanent\b/.test(text)) return true
  if (/\badvantage on all\b/.test(text)) return true
  if (!/\b(once|first|next|per chapter|per day|as a bonus action)\b/.test(text)) return true
  return false
}

function textMatchesSkill(skill: string, description: string): boolean {
  const text = normalizeText(description)
  const normalizedSkill = normalizeText(skill)
  if (!normalizedSkill) return false
  if (text.includes(normalizedSkill)) return true
  const aliases = skillAliases(normalizedSkill)
  return aliases.some((alias) => text.includes(alias))
}

function effectClauseAppliesToSkill(
  skill: string,
  description: string,
  options: { allowGenericCheck: boolean }
): boolean {
  if (textMatchesSkill(skill, description)) return true
  return options.allowGenericCheck && mentionsGenericCheckTarget(normalizeText(description))
}

function mentionsGenericCheckTarget(text: string): boolean {
  if (!/\bchecks?\b|\bsaves?\b/.test(text)) return false
  return /\b(?:any|one|a|the)\s+(?:skill\s+)?checks?\b/.test(text)
    || /\b(?:next|first|related)\s+(?:related\s+)?checks?\b/.test(text)
    || /\b(?:physical|arcane)(?:\s+or\s+(?:physical|arcane))*\s+checks?\b/.test(text)
    || /\bany\s+(?:saves?|checks?)\b/.test(text)
    || /\bany\s+saves?\s+or\s+checks?\b/.test(text)
    || /\bany\s+checks?\s+or\s+saves?\b/.test(text)
}

function skillAliases(normalizedSkill: string): string[] {
  const aliases = new Set<string>([normalizedSkill])
  if (normalizedSkill.includes('attack')) {
    aliases.add('attack')
    aliases.add('weapon')
  }
  for (const [key, values] of Object.entries(SKILL_ALIASES)) {
    if (normalizedSkill.includes(key) || key.includes(normalizedSkill)) {
      values.forEach((value) => aliases.add(normalizeText(value)))
    }
  }
  return [...aliases].filter(Boolean)
}

function playerIsProficient(player: Sf2Player, skill: string): boolean {
  const s = normalizeText(skill)
  return player.proficiencies.some((proficiency) => {
    const p = normalizeText(proficiency)
    return s.includes(p) || p.includes(s)
  })
}

function findStatePlaybook(state: Sf2State): CharacterClass | null {
  const genreId = state.meta.genreId ?? state.meta.setupSelection?.genreId
  if (!genreId) return null
  let config: ReturnType<typeof getGenreConfig>
  try {
    config = getGenreConfig(genreId as Genre)
  } catch {
    return null
  }

  const candidates = [
    ...(state.player.origin.id ? (config.playbooks?.[state.player.origin.id] ?? []) : []),
    ...(state.meta.setupSelection?.originId ? (config.playbooks?.[state.meta.setupSelection.originId] ?? []) : []),
    ...Object.values(config.playbooks ?? {}).flat(),
    ...config.classes,
  ]
  return candidates.find((candidate) =>
    candidate.id === state.player.class.id
    || candidate.name === state.player.class.name
    || candidate.id === state.meta.playbookId
  ) ?? null
}

function findStateOrigin(state: Sf2State): Species | null {
  const genreId = state.meta.genreId ?? state.meta.setupSelection?.genreId
  if (!genreId) return null
  try {
    const config = getGenreConfig(genreId as Genre)
    return config.species.find((origin) =>
      origin.id === state.player.origin.id
      || origin.name === state.player.origin.name
      || origin.id === state.meta.originId
    ) ?? null
  } catch {
    return null
  }
}

function hasItemCharges(item: Sf2Player['inventory'][number]): boolean {
  return typeof item.charges === 'number' || typeof item.maxCharges === 'number'
}

function resourceMatches(
  candidate: { id?: string; name: string },
  spend: Pick<Sf2RollResourceSpend, 'id' | 'name'>
): boolean {
  if (spend.id && candidate.id === spend.id) return true
  return normalizeText(candidate.name) === normalizeText(spend.name)
}

function dedupeOptions(options: Sf2RollActionOption[]): Sf2RollActionOption[] {
  const seen = new Set<string>()
  const out: Sf2RollActionOption[] = []
  for (const option of options) {
    if (seen.has(option.id)) continue
    seen.add(option.id)
    out.push(option)
  }
  return out
}

function dedupeTextEffects(effects: TextEffect[]): TextEffect[] {
  const seen = new Set<string>()
  const out: TextEffect[] = []
  for (const effect of effects) {
    const key = `${effect.kind}:${effect.source}:${effect.label}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(effect)
  }
  return out
}

function isAbility(value: string): value is Sf2Ability {
  return ABILITIES.includes(value as Sf2Ability)
}

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[^a-z0-9+-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function slug(value: string): string {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : String(value)
}
