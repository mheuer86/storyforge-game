import type { Sf2AreaNode, Sf2Location, Sf2State } from './types'

type LocationLike = Partial<Pick<Sf2Location, 'id' | 'name' | 'description' | 'atmosphericConditions' | 'locked' | 'chapterCreated' | 'aliases' | 'areaNodes'>>

const NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
  eleven: '11',
  twelve: '12',
  thirteen: '13',
  fourteen: '14',
  fifteen: '15',
  sixteen: '16',
  seventeen: '17',
  eighteen: '18',
  nineteen: '19',
  twenty: '20',
}

const GENERIC_LOCATION_TOKENS = new Set([
  'a',
  'an',
  'and',
  'at',
  'in',
  'into',
  'of',
  'on',
  's',
  'the',
  'to',
])

const LOCATION_ANCHOR_KINDS = new Set([
  'arm',
  'bay',
  'berth',
  'dock',
  'gate',
  'hangar',
  'pier',
  'platform',
  'slip',
  'terminal',
])

export function canonicalLocationNameKey(name: string): string {
  const normalized = normalizeLocationText(name)
  const tokens = normalized.split(' ').filter((token) => token && !GENERIC_LOCATION_TOKENS.has(token))
  const bayMatch = normalized.match(/\bbay\s*0*(\d+)\b/)
  const berthMatch = normalized.match(/\b(arm|berth|dock|pier|gate)\s*0*(\d+)(?:\s+([a-z][a-z0-9]*))?\b/)

  if (bayMatch) {
    const bayNumber = bayMatch[1]
    const context = [...new Set(tokens.filter((token) => {
      return token !== 'bay' &&
        token !== bayNumber &&
        token !== 'station' &&
        token !== 'exterior' &&
        !/^\d+$/.test(token)
    }))].sort().join(' ')
    const exterior = tokens.includes('exterior') ? ':exterior' : ''
    return `bay:${bayNumber}${exterior}:${context}`
  }

  if (berthMatch) {
    const [, kind, number, rawSuffix = ''] = berthMatch
    const suffix = rawSuffix.length === 1 ? rawSuffix : ''
    const compactNumber = `${number}${suffix}`
    const berthIndex = tokens.findIndex((token, index) => {
      const next = tokens[index + 1]?.replace(/^0+/, '')
      return token === kind && (next === number || next === compactNumber)
    })
    const contextTokens = kind === 'arm'
      ? tokens
      : berthIndex > 0 ? tokens.slice(0, berthIndex) : tokens
    const genericArmContext = new Set(['corridor', 'cargo', 'side', 'docking'])
    const context = [...new Set(contextTokens.filter((token) => {
      return token !== 'station' &&
        token !== kind &&
        (kind !== 'arm' || !genericArmContext.has(token)) &&
        token !== number &&
        token !== suffix &&
        token !== compactNumber
    }))].sort().join(' ')

    return `${kind}:${number}${suffix}:${context}`
  }

  return [...new Set(tokens)].sort().join(' ')
}

export function locationSemanticKey(location: LocationLike): string {
  return canonicalLocationNameKey(location.name || location.id || '')
}

export function findMatchingLocation(
  state: Sf2State,
  proposed: LocationLike
): Sf2Location | null {
  const flattened = parseFlattenedLocationAlias(state, proposed)
  if (flattened) return flattened.location

  const proposedKey = locationSemanticKey(proposed)
  if (!proposedKey) return null

  const currentCandidates = [
    state.world.currentLocation,
    state.world.sceneSnapshot.location,
  ].filter((location): location is Sf2Location => Boolean(location?.id))

  for (const location of currentCandidates) {
    if (locationsSemanticallyMatch(location, proposed, proposedKey)) return location
  }

  for (const location of Object.values(state.campaign.locations)) {
    if (locationsSemanticallyMatch(location, proposed, proposedKey)) return location
  }

  return null
}

export function parseFlattenedLocationAlias(
  state: Sf2State,
  proposed: LocationLike
): { location: Sf2Location; areaNode: Sf2AreaNode; alias: string } | null {
  const alias = proposed.name?.trim()
  if (!alias || !alias.includes(',')) return null
  const [rawChild, ...rawParentParts] = alias.split(',')
  const childName = rawChild.trim()
  const parentName = rawParentParts.join(',').trim()
  if (!childName || !parentName) return null

  const candidates = [
    state.world.currentLocation,
    state.world.sceneSnapshot.location,
    ...Object.values(state.campaign.locations),
  ].filter((location): location is Sf2Location => Boolean(location?.id))

  const parentKey = canonicalLocationNameKey(parentName)
  const location = candidates.find((candidate) =>
    canonicalLocationNameKey(candidate.name || candidate.id) === parentKey ||
    (candidate.aliases ?? []).some((candidateAlias) => canonicalLocationNameKey(candidateAlias) === parentKey)
  )
  if (!location) return null

  return {
    location,
    areaNode: ensureAreaNode(location, childName, {
      alias,
      proposedId: proposed.id,
      description: proposed.description,
      atmosphericConditions: proposed.atmosphericConditions,
      locked: proposed.locked,
    }),
    alias,
  }
}

export function locationsSemanticallyEquivalent(
  existing: LocationLike,
  proposed: LocationLike
): boolean {
  return locationsSemanticallyMatch(existing, proposed)
}

function locationsSemanticallyMatch(
  existing: LocationLike,
  proposed: LocationLike,
  proposedKey = locationSemanticKey(proposed)
): boolean {
  if (locationSemanticKey(existing) === proposedKey) return true
  if (sameNumberedLocationAnchor(existing, proposed)) return true

  const existingTokens = locationTokens(existing)
  const proposedTokens = locationTokens(proposed)
  if (existingTokens.length < 3 || proposedTokens.length < 3) return false

  const shorter = existingTokens.length <= proposedTokens.length ? existingTokens : proposedTokens
  const longer = existingTokens.length <= proposedTokens.length ? proposedTokens : existingTokens
  const longerSet = new Set(longer)
  const overlap = shorter.filter((token) => longerSet.has(token))

  return overlap.length >= 3 && overlap.length / shorter.length >= 0.8
}

function locationTokens(location: LocationLike): string[] {
  const text = [
    location.name,
    location.id?.replace(/_/g, ' '),
  ].filter(Boolean).join(' ')

  return Array.from(new Set(
    normalizeLooseLocationText(text)
      .split(/\s+/)
      .filter((token) => token.length > 1 && !GENERIC_LOCATION_TOKENS.has(token))
  ))
}

function normalizeLooseLocationText(text: string): string {
  return text
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/['’]s\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function normalizeLocationText(text: string): string {
  let normalized = text
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/['’]s\b/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[\u2013\u2014-]/g, ' ')
    .replace(/\b(\d+)([a-z])\b/g, '$1 $2')

  for (const [word, digit] of Object.entries(NUMBER_WORDS)) {
    normalized = normalized.replace(new RegExp(`\\b(${[...LOCATION_ANCHOR_KINDS].join('|')})\\s+${word}\\b`, 'g'), `$1 ${digit}`)
  }

  return normalized
    .replace(/\b(arm|bay|berth|dock|gate|hangar|pier|platform|slip|terminal)\s*0*(\d+)/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

function sameNumberedLocationAnchor(existing: LocationLike, proposed: LocationLike): boolean {
  const existingAnchors = extractNumberedLocationAnchors(existing)
  if (existingAnchors.length === 0) return false
  const proposedAnchors = extractNumberedLocationAnchors(proposed)
  if (proposedAnchors.length === 0) return false
  const sharedAnchors = proposedAnchors.filter((anchor) =>
    existingAnchors.includes(anchor) && !anchor.startsWith('arm:')
  )
  if (sharedAnchors.length === 0) return false
  const existingNameAnchors = extractNumberedLocationAnchorsFromText(existing.name || existing.id || '')
  const proposedNameAnchors = extractNumberedLocationAnchorsFromText(proposed.name || proposed.id || '')
  if (sharedAnchors.some((anchor) => existingNameAnchors.includes(anchor) && proposedNameAnchors.includes(anchor))) {
    return false
  }

  const existingContext = locationContextTokens(existing)
  const proposedContext = locationContextTokens(proposed)
  const proposedContextSet = new Set(proposedContext)
  const contextOverlap = existingContext.filter((token) => proposedContextSet.has(token))
  if (contextOverlap.length >= 2) return true

  const existingTokenSet = new Set(locationFullTokens(existing))
  const fullOverlap = locationFullTokens(proposed).filter((token) => existingTokenSet.has(token))
  return fullOverlap.length >= 6
}

function extractNumberedLocationAnchors(location: LocationLike): string[] {
  return extractNumberedLocationAnchorsFromText(locationFullText(location))
}

function extractNumberedLocationAnchorsFromText(text: string): string[] {
  const normalized = normalizeLocationText(text)
  const anchors = new Set<string>()
  const re = /\b(arm|bay|berth|dock|gate|hangar|pier|platform|slip|terminal)\s*0*(\d+)(?:\s+([a-z][a-z0-9]*))?\b/g
  let match: RegExpExecArray | null
  while ((match = re.exec(normalized)) !== null) {
    const [, kind, number, rawSuffix = ''] = match
    const suffix = rawSuffix.length === 1 ? rawSuffix : ''
    anchors.add(`${kind}:${number}${suffix}`)
  }
  return [...anchors]
}

function locationContextTokens(location: LocationLike): string[] {
  const anchors = new Set<string>()
  for (const anchor of extractNumberedLocationAnchors(location)) {
    const [kind, rawNumber] = anchor.split(':')
    anchors.add(kind)
    anchors.add(rawNumber)
    const number = rawNumber.replace(/[a-z]$/, '')
    const suffix = rawNumber.slice(number.length)
    if (number) anchors.add(number)
    if (suffix) anchors.add(suffix)
  }
  return locationFullTokens(location).filter((token) =>
    !anchors.has(token) &&
    !GENERIC_LOCATION_TOKENS.has(token)
  )
}

function locationFullTokens(location: LocationLike): string[] {
  return Array.from(new Set(
    normalizeLocationText(locationFullText(location))
      .split(/\s+/)
      .filter((token) => token.length > 1 && !GENERIC_LOCATION_TOKENS.has(token))
  ))
}

function locationFullText(location: LocationLike): string {
  return [
    location.id?.replace(/_/g, ' '),
    location.name,
    location.description,
    ...(location.atmosphericConditions ?? []),
  ].filter(Boolean).join(' ')
}

export function mergeLocationIntoExisting(
  existing: Sf2Location,
  proposed: LocationLike
): Sf2Location {
  const merged: Sf2Location = { ...existing }
  const proposedName = proposed.name?.trim()
  const proposedDescription = proposed.description?.trim()

  if (proposedName && (!merged.name || isGeneratedLocationName(merged))) {
    merged.name = proposedName
  }
  if (proposedDescription && (!merged.description || proposedDescription.length > merged.description.length)) {
    merged.description = proposedDescription
  }
  if (proposed.atmosphericConditions?.length) {
    merged.atmosphericConditions = mergeStringLists(
      merged.atmosphericConditions ?? [],
      proposed.atmosphericConditions
    )
  }
  if (proposed.aliases?.length) {
    merged.aliases = mergeStringLists(merged.aliases ?? [], proposed.aliases)
  }
  if (proposed.areaNodes?.length) {
    merged.areaNodes = mergeAreaNodes(merged.areaNodes ?? [], proposed.areaNodes)
  }
  if (typeof proposed.locked === 'boolean') merged.locked = proposed.locked
  if (merged.chapterCreated === undefined && proposed.chapterCreated !== undefined) {
    merged.chapterCreated = proposed.chapterCreated
  }
  return merged
}

export function ensureAreaNode(
  location: Sf2Location,
  childName: string,
  options: {
    alias?: string
    proposedId?: string
    description?: string
    atmosphericConditions?: string[]
    locked?: boolean
  } = {}
): Sf2AreaNode {
  const nodes = location.areaNodes ?? []
  const childKey = canonicalLocationNameKey(childName)
  const existing = nodes.find((node) =>
    canonicalLocationNameKey(node.name || node.id) === childKey ||
    (node.aliases ?? []).some((alias) => canonicalLocationNameKey(alias) === childKey)
  )
  const aliasList = [options.alias, childName].filter((value): value is string => Boolean(value?.trim()))
  if (existing) {
    existing.aliases = mergeStringLists(existing.aliases ?? [], aliasList)
    if (!existing.description && options.description) existing.description = options.description
    if (options.atmosphericConditions?.length) {
      existing.atmosphericConditions = mergeStringLists(existing.atmosphericConditions ?? [], options.atmosphericConditions)
    }
    if (typeof options.locked === 'boolean') existing.locked = options.locked
    return existing
  }
  const id = options.proposedId && !options.proposedId.startsWith(location.id)
    ? options.proposedId
    : `${location.id}_${slugifyLocationId(childName)}`
  const node: Sf2AreaNode = {
    id,
    name: childName,
    aliases: mergeStringLists([], aliasList),
  }
  if (options.description) node.description = options.description
  if (options.atmosphericConditions?.length) node.atmosphericConditions = options.atmosphericConditions
  if (typeof options.locked === 'boolean') node.locked = options.locked
  location.areaNodes = [...nodes, node]
  return node
}

export function replaceLocationReferences(
  state: Sf2State,
  fromId: string,
  toLocation: Sf2Location
): void {
  if (state.world.currentLocation.id === fromId) state.world.currentLocation = toLocation
  if (state.world.currentPosition?.locationId === fromId) {
    state.world.currentPosition.locationId = toLocation.id
  }
  if (state.world.sceneSnapshot.location.id === fromId) {
    state.world.sceneSnapshot.location = toLocation
  }
  if (state.meta.currentSceneId === fromId) state.meta.currentSceneId = toLocation.id
  if (state.chapter.currentSceneId === fromId) state.chapter.currentSceneId = toLocation.id
  if (state.world.sceneSnapshot.sceneId === fromId) {
    state.world.sceneSnapshot.sceneId = toLocation.id
  }
}

function mergeAreaNodes(existing: Sf2AreaNode[], proposed: Sf2AreaNode[]): Sf2AreaNode[] {
  const out = existing.map((node) => ({ ...node }))
  for (const node of proposed) {
    const key = canonicalLocationNameKey(node.name || node.id)
    const match = out.find((candidate) => canonicalLocationNameKey(candidate.name || candidate.id) === key || candidate.id === node.id)
    if (!match) {
      out.push({ ...node })
      continue
    }
    if (!match.description && node.description) match.description = node.description
    match.aliases = mergeStringLists(match.aliases ?? [], node.aliases ?? [])
    match.atmosphericConditions = mergeStringLists(match.atmosphericConditions ?? [], node.atmosphericConditions ?? [])
    if (typeof node.locked === 'boolean') match.locked = node.locked
    match.exitIds = mergeStringLists(match.exitIds ?? [], node.exitIds ?? [])
    match.routeConstraints = mergeStringLists(match.routeConstraints ?? [], node.routeConstraints ?? [])
    match.hazards = mergeStringLists(match.hazards ?? [], node.hazards ?? [])
    if (!match.ambientAlertness && node.ambientAlertness) match.ambientAlertness = node.ambientAlertness
  }
  return out
}

function slugifyLocationId(value: string): string {
  return normalizeLocationText(value).replace(/\s+/g, '_') || 'area'
}

function isGeneratedLocationName(location: Pick<Sf2Location, 'id' | 'name'>): boolean {
  return location.name === location.id.replace(/_/g, ' ')
}

function mergeStringLists(existing: string[], proposed: string[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const item of [...existing, ...proposed]) {
    const value = item.trim()
    if (!value) continue
    const key = value.toLocaleLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(value)
  }
  return out
}
