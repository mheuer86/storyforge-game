import { getGenreConfig, type AtmosphericPressureSurface, type Genre } from '../genres'
import type { Sf2Location, Sf2State } from './types'

const MAX_CONDITIONS = 6
const MIN_GENERATED_DETAILS = 3

const GENRE_ALIASES: Record<string, Genre> = {
  hegemony: 'epic-scifi',
}

const ARCHETYPE_MATCHERS: Array<{ archetype: string; terms: string[] }> = [
  { archetype: 'cantina', terms: ['cantina', 'bar', 'lounge'] },
  { archetype: 'berth-ring', terms: ['berth', 'dock', 'docking', 'slip', 'clamp'] },
  { archetype: 'transit', terms: ['transit', 'bridge', 'helm', 'corridor', 'route', 'beacon'] },
  { archetype: 'customs', terms: ['customs', 'inspection', 'intake', 'checkpoint', 'security'] },
  { archetype: 'freight-manifest', terms: ['freight', 'manifest', 'cargo', 'warehouse', 'weighbridge'] },
  { archetype: 'tithe-hall', terms: ['tithe', 'counting hall', 'allocation hall'] },
  { archetype: 'registry-admin', terms: ['registry', 'admin', 'administrative', 'records', 'clerk'] },
  { archetype: 'transit-authority', terms: ['transit authority', 'passage gate', 'drift-lane', 'route office'] },
  { archetype: 'shield-lattice', terms: ['shield', 'lattice', 'ward pylon', 'attunement housing'] },
  { archetype: 'noble-institutional', terms: ['receiving room', 'house chamber', 'noble', 'institutional', 'conclave'] },
]

export function buildAtmosphericConditions(
  state: Sf2State,
  location: Sf2Location,
  playerInput: string,
  turnIndex: number
): string[] {
  const existing = normalizeConditions(location.atmosphericConditions)
  const genreId = resolveGenreId(state.meta.genreId)
  if (!genreId) return existing

  const genre = getGenreConfig(genreId)
  const palettes = genre.atmosphericPalettes
  if (!palettes) return existing

  const archetype = inferLocationArchetype(location)
  const palette = archetype ? palettes[archetype] : undefined
  if (!palette) return existing

  const pressureSurface = inferPressureSurface(state)
  const candidates = [
    ...(palette.baseline ?? []),
    ...(pressureSurface === 'baseline' ? [] : palette[pressureSurface] ?? []),
  ]
  if (candidates.length === 0) return existing

  const seed = [
    state.meta.campaignId,
    state.meta.currentSceneId,
    location.id,
    location.name,
    archetype,
    pressureSurface,
    playerInput,
    String(turnIndex),
  ].join('|')
  const availableSlots = Math.max(0, MAX_CONDITIONS - existing.length)
  const targetCount = Math.min(
    availableSlots,
    candidates.length,
    Math.max(MIN_GENERATED_DETAILS, 3 + (hashString(`${seed}|count`) % 4))
  )
  if (targetCount <= 0) return existing.slice(0, MAX_CONDITIONS)

  return [...existing, ...selectDeterministic(candidates, targetCount, seed)].slice(0, MAX_CONDITIONS)
}

function resolveGenreId(rawGenreId: string): Genre | null {
  const genreId = GENRE_ALIASES[rawGenreId] ?? rawGenreId
  return isKnownGenre(genreId) ? genreId : null
}

function isKnownGenre(genreId: string): genreId is Genre {
  return [
    'space-opera',
    'fantasy',
    'grimdark',
    'cyberpunk',
    'noire',
    'epic-scifi',
    'western',
    'zombie',
    'wasteland',
    'cold-war',
  ].includes(genreId)
}

function normalizeConditions(conditions: string[] | undefined): string[] {
  const seen = new Set<string>()
  const normalized: string[] = []
  for (const condition of conditions ?? []) {
    const trimmed = condition.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    normalized.push(trimmed)
  }
  return normalized.slice(0, MAX_CONDITIONS)
}

function inferLocationArchetype(location: Sf2Location): string | null {
  const haystack = `${location.name} ${location.description} ${(location.aliases ?? []).join(' ')}`.toLowerCase()
  return ARCHETYPE_MATCHERS.find((matcher) =>
    matcher.terms.some((term) => haystack.includes(term))
  )?.archetype ?? null
}

function inferPressureSurface(state: Sf2State): AtmosphericPressureSurface {
  const currentStep = state.chapter.setup.pressureLadder.find((step) => !step.fired)
  const text = [
    state.chapter.setup.frame.activePressure,
    state.chapter.setup.frame.crucible,
    currentStep?.pressure,
    currentStep?.narrativeEffect,
    state.chapter.setup.antagonistField.currentPrimaryFace?.pressureStyle,
  ].filter(Boolean).join(' ').toLowerCase()

  if (/\b(debt|fee|lien|balance|credit|writ|escrow|payment|collector)\b/.test(text)) return 'debt'
  if (/\b(customs|inspection|security|authority|permit|clearance|detention|mandate)\b/.test(text)) return 'authority'
  if (/\b(transit|route|departure|passage|corridor|beacon|drift-lane|jump)\b/.test(text)) return 'transit'
  if (/\b(registry|admin|bureaucr|institution|synod|house|tithe|allocation|compliance)\b/.test(text)) return 'institutional'
  if (/\b(danger|hazard|attack|pursuit|breach|quarantine|emergency|hostile)\b/.test(text)) return 'danger'
  return 'baseline'
}

function selectDeterministic(values: string[], count: number, seed: string): string[] {
  return values
    .map((value, index) => ({ value, score: hashString(`${seed}|${index}|${value}`) }))
    .sort((a, b) => a.score - b.score || a.value.localeCompare(b.value))
    .slice(0, count)
    .map((entry) => entry.value)
}

function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}
