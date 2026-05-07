const BASE_ANONYMOUS_MARKERS = [
  'unknown',
  'unnamed',
  'unidentified',
  'anonymous',
  'younger man',
  'young man',
  'girl',
  'boy',
  'elder',
  'aide',
] as const

const GENRE_ANONYMOUS_MARKERS: Record<string, readonly string[]> = {
  cyberpunk: ['suit', 'exec', 'fixer', 'runner', 'street doc'],
  noire: ['client', 'informant', 'bartender', 'secretary', 'gumshoe'],
  grimdark: ['acolyte', 'penitent', 'novice', 'guard', 'scribe'],
  fantasy: ['apprentice', 'guard', 'villager', 'initiate'],
  'space-opera': ['dockhand', 'tech', 'officer', 'passenger'],
}

export function getAnonymousMarkers(genreId?: string | null): string[] {
  const genreMarkers = genreId ? GENRE_ANONYMOUS_MARKERS[genreId] ?? [] : []
  return Array.from(new Set([...BASE_ANONYMOUS_MARKERS, ...genreMarkers]))
}

export function containsAnonymousMarker(value: string, genreId?: string | null): boolean {
  const haystack = value.toLowerCase()
  return getAnonymousMarkers(genreId).some((marker) => haystack.includes(marker))
}
