import type {
  Sf2EntityId,
  Sf2Npc,
  Sf2OwnerRef,
  Sf2State,
} from '../types'

// Shared entity-reference policy for SF2. Keep fuzzy recovery, placeholder
// creation, owner-hint parsing, and canonical id allocation here so model
// drift gets one code-owned answer instead of several similar guesses.

export type EntityPrefix =
  | 'npc'
  | 'faction'
  | 'thread'
  | 'decision'
  | 'promise'
  | 'clue'
  | 'arc'
  | 'location'
  | 'temporal_anchor'
  | 'doc'
  | 'beat'

export function resolveAgentId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (!idOrName) return null
  if (state.campaign.npcs[idOrName]) return idOrName
  if (state.campaign.factions[idOrName]) return idOrName
  const direct = resolveNpcId(state, idOrName) ?? resolveFactionId(state, idOrName)
  if (direct) return direct
  return resolveBySynthesizedAgentId(state, idOrName)
}

export function resolveBySynthesizedAgentId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  const m = idOrName.match(/^(?:npc|faction)_(.+)$/i)
  if (!m) return null
  const tokens = m[1]
    .toLowerCase()
    .split('_')
    .filter((t) => t.length >= 3)
  if (tokens.length < 2) return null

  let best: { npc: Sf2EntityId; score: number } | null = null
  let bestTied = false
  for (const npc of Object.values(state.campaign.npcs)) {
    const haystack = `${npc.role} ${npc.retrievalCue} ${npc.affiliation}`.toLowerCase()
    const score = tokens.reduce((acc, t) => (haystack.includes(t) ? acc + 1 : acc), 0)
    if (score < 2) continue
    if (!best || score > best.score) {
      best = { npc: npc.id, score }
      bestTied = false
    } else if (score === best.score) {
      bestTied = true
    }
  }
  return best && !bestTied ? best.npc : null
}

export function resolvedBySynthesizedAgentId(
  state: Sf2State,
  rawReference: string,
  resolvedId: Sf2EntityId
): boolean {
  if (rawReference === resolvedId) return false
  if (state.campaign.npcs[rawReference]) return false
  if (state.campaign.factions[rawReference]) return false
  if (resolveNpcId(state, rawReference) !== null) return false
  if (resolveFactionId(state, rawReference) !== null) return false
  return resolveBySynthesizedAgentId(state, rawReference) === resolvedId
}

export function resolveNpcId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (state.campaign.npcs[idOrName]) return idOrName
  const match = Object.values(state.campaign.npcs).find(
    (n) => n.name.toLowerCase() === idOrName.toLowerCase()
  )
  return match?.id ?? null
}

export function resolveFactionId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (state.campaign.factions[idOrName]) return idOrName
  const match = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === idOrName.toLowerCase()
  )
  return match?.id ?? null
}

export function resolveThreadId(state: Sf2State, idOrTitle: string): Sf2EntityId | null {
  if (state.campaign.threads[idOrTitle]) return idOrTitle
  const match = Object.values(state.campaign.threads).find(
    (t) => t.title.toLowerCase() === idOrTitle.toLowerCase()
  )
  return match?.id ?? null
}

export function resolveArcId(state: Sf2State, idOrTitle: string): Sf2EntityId | null {
  if (state.campaign.arcs[idOrTitle]) return idOrTitle
  const match = Object.values(state.campaign.arcs).find(
    (a) => a.title.toLowerCase() === idOrTitle.toLowerCase()
  )
  return match?.id ?? null
}

export function resolveTemporalAnchorTargetId(state: Sf2State, idOrName: string): Sf2EntityId | null {
  if (!idOrName) return null
  if (state.campaign.threads[idOrName]) return idOrName
  if (state.campaign.decisions[idOrName]) return idOrName
  if (state.campaign.promises[idOrName]) return idOrName
  if (state.campaign.clues[idOrName]) return idOrName
  if (state.campaign.npcs[idOrName]) return idOrName
  if (state.campaign.factions[idOrName]) return idOrName
  return (
    resolveThreadId(state, idOrName) ??
    resolveNpcId(state, idOrName) ??
    resolveFactionId(state, idOrName)
  )
}

// Resolve a Narrator-emitted NPC reference (id, shortened id, or bare name)
// to a canonical NPC id in the registry. Returns null if no match.
export function resolveNpcReference(state: Sf2State, raw: string): string | null {
  if (!raw) return null
  const r = raw.trim()
  if (!r) return null

  if (state.campaign.npcs[r]) return r

  const withPrefix = r.startsWith('npc_') ? r : `npc_${r}`
  if (state.campaign.npcs[withPrefix]) return withPrefix

  const withoutPrefix = r.startsWith('npc_') ? r.slice(4) : r
  if (state.campaign.npcs[withoutPrefix]) return withoutPrefix

  const normCandidates = [r, withoutPrefix]
    .map(slugifyEntityReference)
    .filter((value, index, values) => value && values.indexOf(value) === index)
  for (const npc of Object.values(state.campaign.npcs)) {
    const nameSlug = slugifyEntityReference(npc.name)
    const idTail = npc.id.replace(/^npc_/, '')
    for (const norm of normCandidates) {
      if (nameSlug === norm || idTail === norm) return npc.id
      const lastToken = nameSlug.split('_').pop() ?? ''
      if (lastToken && lastToken === norm) return npc.id
    }
  }
  return null
}

export function createPlaceholderNpcFromReference(state: Sf2State, raw: string): string | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const slug = slugifyEntityReference(trimmed.replace(/^npc_/, ''))
  if (!slug) return null
  const id = `npc_${slug}`
  if (state.campaign.npcs[id]) return id

  state.campaign.npcs[id] = {
    id,
    name: slug.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    affiliation: 'Unknown',
    role: 'npc',
    status: 'alive',
    disposition: 'neutral',
    identity: {
      keyFacts: ['Created from Narrator scene snapshot; Archivist did not canonicalize details yet.'],
      voice: { note: 'Not yet established.', register: 'Not yet established.' },
      relations: [],
    },
    ownedThreadIds: [],
    retrievalCue: `${slug.replace(/_/g, ' ')} — placeholder from scene snapshot`,
    chapterCreated: state.meta.currentChapter,
    lastSeenTurn: state.history.turns.length,
    signatureLines: [],
  }
  return id
}

export function findMatchingNpc(state: Sf2State, proposedName: string): Sf2Npc | null {
  const proposed = normalizeEntityReferenceText(proposedName)
  if (proposed.length < 3) return null
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null
  const kinshipTokens = new Set([
    'brother',
    'sister',
    'father',
    'mother',
    'parent',
    'parents',
    'son',
    'daughter',
    'child',
    'children',
    'spouse',
    'wife',
    'husband',
  ])

  for (const npc of Object.values(state.campaign.npcs)) {
    const existing = normalizeEntityReferenceText(npc.name)
    if (existing === proposed) return npc
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    if (existingTokens.size === 0) continue

    const proposedInExisting = [...proposedTokens].every((t) => existingTokens.has(t))
    if (!proposedInExisting) continue
    if (
      proposedTokens.size === 1 &&
      [...existingTokens].some((t) => kinshipTokens.has(t))
    ) {
      continue
    }

    const minToken = [...proposedTokens].find((t) => t.length >= 4)
    if (minToken) return npc
  }
  return null
}

export function findMatchingSnapshotPlaceholder(
  state: Sf2State,
  proposedName: string,
  proposedCue: string
): Sf2Npc | null {
  const proposed = normalizeEntityReferenceText(`${proposedName} ${proposedCue}`)
  if (proposed.length < 3) return null
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null

  for (const npc of Object.values(state.campaign.npcs)) {
    const isPlaceholder =
      npc.retrievalCue.includes('placeholder from scene snapshot') ||
      npc.identity.keyFacts.some((fact) => fact.includes('Created from Narrator scene snapshot'))
    if (!isPlaceholder) continue

    const existing = normalizeEntityReferenceText(`${npc.id.replace(/^npc_/, '')} ${npc.name} ${npc.retrievalCue}`)
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    const overlap = [...proposedTokens].filter((t) => existingTokens.has(t))
    if (overlap.some((t) => t.length >= 4)) return npc
  }
  return null
}

export function isAnonymousNpc(npc: Sf2Npc): boolean {
  const haystack = normalizeEntityReferenceText(`${npc.id} ${npc.name} ${npc.role} ${npc.retrievalCue}`)
  return [
    'unknown',
    'unnamed',
    'unidentified',
    'anonymous',
    'younger man',
    'young man',
    'girl',
    'boy',
    'elder',
  ].some((marker) => haystack.includes(marker))
}

export function findMatchingAnonymousNpc(
  state: Sf2State,
  proposedName: string,
  proposedCue: string
): Sf2Npc | null {
  const proposed = normalizeEntityReferenceText(`${proposedName} ${proposedCue}`)
  if (proposed.length < 3) return null
  const anonymousMarkers = ['younger man', 'young man', 'girl', 'boy', 'elder']
  const proposedMarker = anonymousMarkers.find((marker) => proposed.includes(marker))
  if (!proposedMarker) return null
  const proposedTokens = new Set(proposed.split(' ').filter((t) => t.length >= 3))
  if (proposedTokens.size === 0) return null

  for (const npc of Object.values(state.campaign.npcs)) {
    if (!isAnonymousNpc(npc)) continue
    const existing = normalizeEntityReferenceText(`${npc.name} ${npc.role} ${npc.retrievalCue}`)
    if (!existing.includes(proposedMarker)) continue
    const existingTokens = new Set(existing.split(' ').filter((t) => t.length >= 3))
    const overlap = [...proposedTokens].filter((t) => existingTokens.has(t))
    if (overlap.some((t) => t.length >= 4)) return npc
  }
  return null
}

export function resolveThreadOwnership(
  state: Sf2State,
  ownerHint: string
): { owner: Sf2OwnerRef | null; stakeholders: Sf2OwnerRef[] } {
  if (!ownerHint) return { owner: null, stakeholders: [] }
  const parts = ownerHint
    .split(/[,;/&]|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (parts.length <= 1) {
    return { owner: resolveThreadOwner(state, ownerHint), stakeholders: [] }
  }

  const refs: Sf2OwnerRef[] = []
  const seen = new Set<string>()
  for (const p of parts) {
    const ref = resolveThreadOwner(state, p)
    if (!ref) continue
    const key = `${ref.kind}:${ref.id}`
    if (seen.has(key)) continue
    seen.add(key)
    refs.push(ref)
  }
  if (refs.length === 0) return { owner: null, stakeholders: [] }
  return { owner: refs[0], stakeholders: refs.slice(1) }
}

export function resolveThreadOwner(state: Sf2State, ownerHint: string): Sf2OwnerRef | null {
  if (!ownerHint) return null
  const hint = ownerHint.trim().toLowerCase()

  if (state.campaign.npcs[ownerHint]) {
    return { kind: 'npc', id: ownerHint }
  }
  if (state.campaign.factions[ownerHint]) {
    return { kind: 'faction', id: ownerHint }
  }

  const npc = Object.values(state.campaign.npcs).find(
    (n) => n.name.toLowerCase() === hint || hint.includes(n.name.toLowerCase())
  )
  if (npc) return { kind: 'npc', id: npc.id }

  const faction = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === hint || hint.includes(f.name.toLowerCase())
  )
  if (faction) return { kind: 'faction', id: faction.id }

  const affMatch = Object.values(state.campaign.npcs).find((n) => {
    const aff = (n.affiliation ?? '').toLowerCase()
    if (!aff) return false
    return aff === hint || hint.includes(aff) || aff.includes(hint)
  })
  if (affMatch?.affiliation) {
    const seeded = findFactionByName(state, affMatch.affiliation)
    if (seeded) return { kind: 'faction', id: seeded.id }
  }

  const autoId = factionIdFromName(ownerHint)
  if (!state.campaign.factions[autoId]) {
    state.campaign.factions[autoId] = {
      id: autoId,
      name: ownerHint,
      stance: 'neutral',
      heat: 'none',
      heatReasons: [],
      ownedThreadIds: [],
      retrievalCue: '',
    }
  }
  return { kind: 'faction', id: autoId }
}

export function findFactionByName(
  state: Sf2State,
  name: string
): { id: string; name: string } | null {
  const n = name.trim().toLowerCase()
  if (!n) return null
  const match = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === n
  )
  return match ?? null
}

export function factionIdFromName(name: string): string {
  const slug = slugifyEntityReference(name).slice(0, 60)
  return `faction_${slug || 'anon'}`
}

export function getEntityRegistry(
  state: Sf2State,
  prefix: EntityPrefix
): Record<string, { id: string }> {
  switch (prefix) {
    case 'npc':
      return state.campaign.npcs as Record<string, { id: string }>
    case 'faction':
      return state.campaign.factions as Record<string, { id: string }>
    case 'thread':
      return state.campaign.threads as Record<string, { id: string }>
    case 'decision':
      return state.campaign.decisions as Record<string, { id: string }>
    case 'promise':
      return state.campaign.promises as Record<string, { id: string }>
    case 'clue':
      return state.campaign.clues as Record<string, { id: string }>
    case 'arc':
      return state.campaign.arcs as Record<string, { id: string }>
    case 'location':
      return state.campaign.locations as Record<string, { id: string }>
    case 'temporal_anchor':
      return state.campaign.temporalAnchors as Record<string, { id: string }>
    case 'doc':
      return (state.campaign.documents ?? {}) as Record<string, { id: string }>
    case 'beat':
      return (state.campaign.beats ?? {}) as Record<string, { id: string }>
  }
}

export function nextEntityId(prefix: EntityPrefix, state: Sf2State): Sf2EntityId {
  const registry = getEntityRegistry(state, prefix)
  let i = Object.keys(registry).length
  let id = `${prefix}_${i}`
  while (registry[id]) {
    i += 1
    id = `${prefix}_${i}`
  }
  return id
}

export function findAliasSurface(input: string, alias: string): string | null {
  if (!alias.trim()) return null
  const match = input.match(new RegExp(`\\b${escapeRegExp(alias)}\\b`, 'i'))
  return match?.[0] ?? null
}

export function normalizeEntityReferenceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function slugifyEntityReference(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
