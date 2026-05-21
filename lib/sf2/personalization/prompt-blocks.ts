type UnknownRecord = Record<string, unknown>

interface PlaystyleSurface {
  enabled: boolean
  profile: unknown
}

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function cleanLine(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed.replace(/\s+/g, ' ') : null
}

function cleanLines(value: unknown, limit = 6): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => cleanLines(item, limit)).slice(0, limit)
  }
  if (isRecord(value)) {
    const preferredKeys = [
      'summary',
      'guidance',
      'instruction',
      'pattern',
      'avoid',
      'interpretation',
      'trigger',
      'cost',
      'permission',
      'taboo',
      'consequence',
      'evidence',
      'note',
    ]
    const preferred = preferredKeys
      .map((key) => cleanLine(value[key]))
      .filter((line): line is string => Boolean(line))
    if (preferred.length > 0) return preferred.slice(0, limit)
    return Object.entries(value)
      .filter(([, item]) => typeof item === 'string')
      .map(([key, item]) => `${key}: ${String(item).trim().replace(/\s+/g, ' ')}`)
      .filter((line) => line.length > 0)
      .slice(0, limit)
  }
  const line = cleanLine(value)
  return line ? [line] : []
}

function hasContent(value: unknown): boolean {
  if (cleanLine(value)) return true
  if (Array.isArray(value)) return value.some(hasContent)
  if (!isRecord(value)) return false
  return Object.values(value).some(hasContent)
}

function readCampaign(state: unknown): UnknownRecord | null {
  if (!isRecord(state)) return null
  const campaign = state.campaign
  return isRecord(campaign) ? campaign : null
}

function readBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', 'enabled', 'live', 'on', 'yes'].includes(normalized)) return true
    if (['false', 'disabled', 'off', 'no'].includes(normalized)) return false
  }
  return null
}

export function readPlaystylePersonalization(state: unknown): PlaystyleSurface | null {
  const campaign = readCampaign(state)
  const surface = campaign?.playstylePersonalization
  if (!isRecord(surface)) return null

  const gate =
    readBoolean(surface.liveEnabled) ??
    readBoolean(surface.liveGateEnabled) ??
    readBoolean(surface.enabled) ??
    readBoolean(surface.live)
  if (gate !== true) return null

  const profile =
    surface.rollingProfile ??
    surface.profile ??
    surface.liveProfile ??
    surface.compactProfile
  if (!hasContent(profile)) return null

  return { enabled: true, profile }
}

export function readRulebookInterpretations(state: unknown): unknown | null {
  const campaign = readCampaign(state)
  const interpretations = campaign?.rulebookInterpretations
  const entries = Array.isArray(interpretations)
    ? interpretations
    : isRecord(interpretations) && Array.isArray(interpretations.entries)
      ? interpretations.entries
      : null
  if (!entries) return null
  const promptEnabled = entries.filter((entry) => {
    if (!isRecord(entry)) return false
    if (entry.promptGuidanceEnabled === false || entry.prompt_guidance_enabled === false) return false
    return hasContent(entry.setupRationale ?? entry.setup_rationale) ||
      hasContent(entry.playEvidence ?? entry.play_evidence ?? entry.evidence)
  })
  return promptEnabled.length > 0 ? promptEnabled : null
}

function renderProfile(profile: unknown): string {
  if (!isRecord(profile)) {
    return cleanLines(profile, 8).map((line) => `- ${line}`).join('\n')
  }

  const sections: string[] = []
  const knobKeys = [
    'informationEconomy',
    'decisionArchitecture',
    'consequenceTiming',
    'emotionalRegister',
    'npcLegibility',
    'errorTolerance',
  ]

  const knobs = knobKeys
    .flatMap((key) => cleanLines(profile[key], 2).map((line) => `- ${key}: ${line}`))
    .slice(0, 6)
  if (knobs.length > 0) sections.push(knobs.join('\n'))

  const worked = cleanLines(profile.workedPatterns ?? profile.worked_patterns, 4)
  if (worked.length > 0) sections.push(`Worked patterns:\n${worked.map((line) => `- ${line}`).join('\n')}`)

  const avoid = cleanLines(profile.avoidPatterns ?? profile.avoid_patterns, 4)
  if (avoid.length > 0) sections.push(`Avoid patterns:\n${avoid.map((line) => `- ${line}`).join('\n')}`)

  if (sections.length > 0) return sections.join('\n')
  return cleanLines(profile, 8).map((line) => `- ${line}`).join('\n')
}

function renderRulebookInterpretationsBody(interpretations: unknown): string {
  if (Array.isArray(interpretations)) {
    return interpretations
      .flatMap((item) => renderRulebookInterpretationLines(item))
      .slice(0, 8)
      .join('\n')
  }
  if (!isRecord(interpretations)) {
    return cleanLines(interpretations, 8).map((line) => `- ${line}`).join('\n')
  }

  const entries = Object.entries(interpretations)
    .flatMap(([key, value]) => renderRulebookInterpretationLines(value).map((line) => `- ${key}: ${line}`))
    .slice(0, 8)
  return entries.join('\n')
}

function renderRulebookInterpretationLines(value: unknown): string[] {
  const record = isRecord(value) ? value : null
  if (!record) return cleanLines(value, 2).map((line) => `- ${line}`)
  const ruleName = cleanLine(record.ruleName ?? record.rule_name ?? record.ruleId ?? record.rule_id) ?? 'local rule'
  const reading = cleanLine(record.campaignSpecificReading ?? record.campaign_specific_reading ?? record.campaignReading)
  const triggers = cleanLines(record.triggers, 2).join('; ')
  const costs = cleanLines(record.costs, 2).join('; ')
  const taboos = cleanLines(record.taboos, 2).join('; ')
  const excluded = cleanLines(record.excludedExamples ?? record.excluded_examples, 2).join('; ')
  const lines = [
    reading ? `- ${ruleName}: ${reading}` : null,
    triggers ? `  triggers: ${triggers}` : null,
    costs ? `  costs: ${costs}` : null,
    taboos ? `  taboos: ${taboos}` : null,
    excluded ? `  excluded: ${excluded}` : null,
  ].filter((line): line is string => Boolean(line))
  return lines.length > 0 ? lines : cleanLines(value, 2).map((line) => `- ${line}`)
}

export function renderAuthorPersonalizationBlock(state: unknown): string {
  const personalization = readPlaystylePersonalization(state)
  if (!personalization) return ''
  return `\n\n### Campaign-local playstyle guidance (private GM technique; not fiction facts)\nLive gate: enabled. Use this rolling profile only to tune Author technique: opening camera, information economy, decision shape, consequence timing, emotional register, NPC legibility, and tolerance for ambiguity. Do not treat it as campaign lore, PC motivation, or player-facing text.\n${renderProfile(personalization.profile)}`
}

export function renderNarratorPersonalizationBlock(state: unknown): string {
  const personalization = readPlaystylePersonalization(state)
  if (!personalization) return ''
  return `\n\n---\n\n### Private campaign-local playstyle guidance (never mention)\nLive gate: enabled. Use this rolling profile only to tune GM technique for this turn: information economy, decision shape, consequence timing, emotional register, NPC legibility, and ambiguity tolerance. It is not fiction, not PC motive, and never player-facing content.\n${renderProfile(personalization.profile)}`
}

export function renderAuthorRulebookInterpretationsBlock(state: unknown): string {
  const interpretations = readRulebookInterpretations(state)
  if (!interpretations) return ''
  return `\n\n### Campaign-local rulebook interpretations\nThese are local readings of generic rules into this campaign's triggers, costs, permissions, taboos, and consequences. Keep them separate from playstyle guidance and apply them as rules/context, not player psychology.\n${renderRulebookInterpretationsBody(interpretations)}`
}

export function renderNarratorRulebookInterpretationsBlock(state: unknown): string {
  const interpretations = readRulebookInterpretations(state)
  if (!interpretations) return ''
  return `\n\n---\n\n### Private campaign-local rulebook interpretations (never mention as a block)\nApply these campaign-local readings of generic rules to triggers, costs, permissions, taboos, and consequences. Keep them separate from playstyle guidance; do not quote this block to the player.\n${renderRulebookInterpretationsBody(interpretations)}`
}
