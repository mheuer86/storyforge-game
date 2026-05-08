import type { Sf2Location, Sf2State } from './types'

type LocationLike = Partial<Pick<Sf2Location, 'id' | 'name' | 'description' | 'atmosphericConditions' | 'locked' | 'chapterCreated'>>

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

export function canonicalLocationNameKey(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/['’]s\b/g, ' ')
    .replace(/[()]/g, ' ')
    .replace(/[\u2013\u2014-]/g, ' ')
    .replace(/\b(\d+)([a-z])\b/g, '$1 $2')
    .replace(/\b(arm|bay|berth|dock|pier|gate)\s*0*(\d+)/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
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

function locationsSemanticallyMatch(
  existing: Sf2Location,
  proposed: LocationLike,
  proposedKey = locationSemanticKey(proposed)
): boolean {
  if (locationSemanticKey(existing) === proposedKey) return true

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
    text
      .normalize('NFKD')
      .toLocaleLowerCase()
      .replace(/['’]s\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !GENERIC_LOCATION_TOKENS.has(token))
  ))
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
  if (typeof proposed.locked === 'boolean') merged.locked = proposed.locked
  if (merged.chapterCreated === undefined && proposed.chapterCreated !== undefined) {
    merged.chapterCreated = proposed.chapterCreated
  }
  return merged
}

export function replaceLocationReferences(
  state: Sf2State,
  fromId: string,
  toLocation: Sf2Location
): void {
  if (state.world.currentLocation.id === fromId) state.world.currentLocation = toLocation
  if (state.world.sceneSnapshot.location.id === fromId) {
    state.world.sceneSnapshot.location = toLocation
  }
  if (state.meta.currentSceneId === fromId) state.meta.currentSceneId = toLocation.id
  if (state.chapter.currentSceneId === fromId) state.chapter.currentSceneId = toLocation.id
  if (state.world.sceneSnapshot.sceneId === fromId) {
    state.world.sceneSnapshot.sceneId = toLocation.id
  }
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
