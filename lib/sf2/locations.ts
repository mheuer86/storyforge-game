import type { Sf2Location, Sf2State } from './types'

type LocationLike = Partial<Pick<Sf2Location, 'id' | 'name' | 'description' | 'atmosphericConditions' | 'locked' | 'chapterCreated'>>

export function canonicalLocationNameKey(name: string): string {
  const normalized = name
    .normalize('NFKD')
    .toLocaleLowerCase()
    .replace(/[()]/g, ' ')
    .replace(/[\u2013\u2014-]/g, ' ')
    .replace(/\b(arm|bay|berth|dock|pier|gate)\s*0*(\d+)/g, '$1 $2')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
  const tokens = normalized.split(' ').filter(Boolean)
  const bayMatch = normalized.match(/\bbay\s*0*(\d+)\b/)
  const berthMatch = normalized.match(/\b(arm|berth|dock|pier|gate)\s*0*(\d+)\s*([a-z])?\b/)

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
    const [, kind, number, suffix = ''] = berthMatch
    const compactNumber = `${number}${suffix}`
    const berthIndex = tokens.findIndex((token, index) => {
      const next = tokens[index + 1]?.replace(/^0+/, '')
      return token === kind && (next === number || next === compactNumber)
    })
    const contextTokens = berthIndex > 0 ? tokens.slice(0, berthIndex) : tokens
    const context = [...new Set(contextTokens.filter((token) => {
      return token !== 'station' &&
        token !== kind &&
        token !== 'corridor' &&
        token !== 'cargo' &&
        token !== 'side' &&
        token !== 'docking' &&
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
    if (locationSemanticKey(location) === proposedKey) return location
  }

  for (const location of Object.values(state.campaign.locations)) {
    if (locationSemanticKey(location) === proposedKey) return location
  }

  return null
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
