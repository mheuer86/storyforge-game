// Hydrate campaign.npcs and campaign.threads from an AuthorChapterSetupV2
// payload. Previously the client only seeded skeletal entities from ids
// (empty affiliation, voice, retrievalCue, resolutionCriteria, failureMode,
// faction_unknown owners). The Author emits rich data; we carry it into the
// graph here so the scene packet + archivist can reason against real fields.

import type {
  AuthorChapterSetupV2,
  Sf2ChapterNumber,
  Sf2Npc,
  Sf2OwnerRef,
  Sf2State,
  Sf2Thread,
} from '../types'

// Author's free-form role strings (e.g. "district solicitor") don't fit
// Sf2NpcRole's narrow union ('crew'|'contact'|'npc'). Store them as-is for
// display/retrieval; the type union is only used defensively by role-aware
// code paths (crew rollup etc.). Cast loosely here.
export function applyAuthoredToCampaign(
  state: Sf2State,
  authored: AuthorChapterSetupV2,
  chapter: Sf2ChapterNumber,
  loadBearingIds: string[]
): void {
  // Seed faction records from unique NPC affiliations BEFORE NPC hydration
  // and thread resolution. An affiliation in the Author's NPC list implies a
  // faction in the world — creating placeholder faction records ensures
  // thread owners can resolve to real faction ids instead of faction_unknown.
  const affiliationsSeen = new Set<string>()
  for (const n of authored.startingNPCs) {
    const aff = n.affiliation?.trim()
    if (!aff || affiliationsSeen.has(aff.toLowerCase())) continue
    affiliationsSeen.add(aff.toLowerCase())
    if (!findFactionByName(state, aff)) {
      const id = factionIdFromName(aff)
      if (!state.campaign.factions[id]) {
        state.campaign.factions[id] = {
          id,
          name: aff,
          stance: 'neutral',
          heat: 'none',
          heatReasons: [],
          ownedThreadIds: [],
          retrievalCue: '',
        }
      }
    }
  }

  for (const n of authored.startingNPCs) {
    const existing = state.campaign.npcs[n.id]
    if (existing) {
      // Carry-forward: per Author prompt, affiliation/role/voice_register/
      // retrieval_cue may evolve per chapter. Refresh them. Preserve the
      // Archivist-maintained fields: keyFacts, relations, lastSeenTurn,
      // disposition, tempLoad, agenda, status, signatureLines.
      existing.affiliation = n.affiliation || existing.affiliation
      existing.role = (n.role || existing.role) as Sf2Npc['role']
      existing.retrievalCue = n.retrievalCue || existing.retrievalCue
      if (n.voiceRegister) {
        existing.identity.voice.register = n.voiceRegister
        if (!existing.identity.voice.note) existing.identity.voice.note = n.voiceRegister
      }
      continue
    }
    state.campaign.npcs[n.id] = {
      id: n.id,
      name: n.name || n.id.replace(/^npc_/, '').replace(/_/g, ' '),
      affiliation: n.affiliation,
      role: (n.role || 'npc') as Sf2Npc['role'],
      status: 'alive',
      disposition: n.initialDisposition ?? 'neutral',
      identity: {
        keyFacts: [],
        voice: { note: n.voiceRegister, register: n.voiceRegister },
        relations: [],
      },
      ownedThreadIds: [],
      retrievalCue: n.retrievalCue,
      chapterCreated: chapter,
      lastSeenTurn: 0,
      signatureLines: [],
    }
  }

  const loadBearing = new Set(loadBearingIds)
  for (const t of authored.activeThreads) {
    const { owner, stakeholders } = resolveThreadOwnership(state, t.ownerHint)
    const existing = state.campaign.threads[t.id]
    if (existing) {
      // Carry-forward: per Author prompt, resolution_criteria / failure_mode
      // / tension / retrieval_cue may evolve. Refresh them. Preserve status
      // (Archivist/author-transitions own lifecycle), tensionHistory,
      // anchored relations, deterioration.
      existing.resolutionCriteria = t.resolutionCriteria || existing.resolutionCriteria
      existing.failureMode = t.failureMode || existing.failureMode
      existing.retrievalCue = t.retrievalCue || existing.retrievalCue
      if (typeof t.tension === 'number') existing.tension = clampTension(t.tension)
      existing.loadBearing = loadBearing.has(t.id)
      // Re-resolve owner only if current owner is the placeholder
      // faction_unknown — don't stomp a meaningfully resolved one.
      if (
        existing.owner.kind === 'faction' &&
        existing.owner.id === 'faction_unknown' &&
        owner
      ) {
        existing.owner = owner
        if (stakeholders.length > 0 && existing.stakeholders.length === 0) {
          existing.stakeholders = stakeholders
        }
      }
      continue
    }
    state.campaign.threads[t.id] = {
      id: t.id,
      title: t.title || t.id.replace(/^thread_/, '').replace(/_/g, ' '),
      chapterCreated: chapter,
      category: 'thread',
      retrievalCue: t.retrievalCue,
      status: 'active',
      owner: owner ?? { kind: 'faction', id: 'faction_unknown' },
      stakeholders,
      tension: clampTension(typeof t.tension === 'number' ? t.tension : 5),
      resolutionCriteria: t.resolutionCriteria,
      failureMode: t.failureMode,
      loadBearing: loadBearing.has(t.id),
      tensionHistory: [],
    }
  }
}

// Parse a possibly-multi-owner hint into a primary owner + stakeholders.
// The Author sometimes emits comma-separated or "and"-joined hints like
// "Tersil Vann, Maret Coss" or "House Kelvari and House Vael". Without
// splitting, resolveThreadOwner falls through every match attempt and
// auto-creates a garbage composite faction (e.g. faction_npc_tersil_vann_npc_maret_coss).
function resolveThreadOwnership(
  state: Sf2State,
  ownerHint: string
): { owner: Sf2OwnerRef | null; stakeholders: Sf2OwnerRef[] } {
  if (!ownerHint) return { owner: null, stakeholders: [] }
  // Split on comma, semicolon, slash, ampersand, or " and ".
  const parts = ownerHint
    .split(/[,;/&]|\s+and\s+/i)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  if (parts.length <= 1) {
    // Single hint — preserve prior single-owner behavior.
    return { owner: resolveThreadOwner(state, ownerHint), stakeholders: [] }
  }

  // Multi-hint: resolve each part, first resolved becomes owner, rest
  // become stakeholders. De-dup references.
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

function clampTension(n: number): Sf2Thread['tension'] {
  const v = Math.max(0, Math.min(10, Math.round(n)))
  return v as Sf2Thread['tension']
}

function resolveThreadOwner(state: Sf2State, ownerHint: string): Sf2OwnerRef | null {
  if (!ownerHint) return null
  const hint = ownerHint.trim().toLowerCase()

  // Exact id match (owner_hint is sometimes just the id).
  if (state.campaign.npcs[ownerHint]) {
    return { kind: 'npc', id: ownerHint }
  }
  if (state.campaign.factions[ownerHint]) {
    return { kind: 'faction', id: ownerHint }
  }

  // Fuzzy name match on NPCs (either exact-name or hint contains the name).
  const npc = Object.values(state.campaign.npcs).find(
    (n) => n.name.toLowerCase() === hint || hint.includes(n.name.toLowerCase())
  )
  if (npc) return { kind: 'npc', id: npc.id }

  // Fuzzy name match on factions.
  const faction = Object.values(state.campaign.factions).find(
    (f) => f.name.toLowerCase() === hint || hint.includes(f.name.toLowerCase())
  )
  if (faction) return { kind: 'faction', id: faction.id }

  // Match via NPC affiliation: the Author sometimes writes owner_hint as a
  // faction-shaped name even though the NPC-created faction id differs (e.g.
  // hint "The Imperial Service" when NPCs have affiliation "Imperial Service").
  // Check if any NPC affiliation matches the hint; return that affiliation's
  // auto-seeded faction.
  const affMatch = Object.values(state.campaign.npcs).find((n) => {
    const aff = (n.affiliation ?? '').toLowerCase()
    if (!aff) return false
    return aff === hint || hint.includes(aff) || aff.includes(hint)
  })
  if (affMatch?.affiliation) {
    const seeded = findFactionByName(state, affMatch.affiliation)
    if (seeded) return { kind: 'faction', id: seeded.id }
  }

  // Last-resort: auto-create a faction from the hint. Better than
  // faction_unknown — at least the id is readable and future references to
  // the same name resolve here.
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

function findFactionByName(
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

function factionIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60)
  return `faction_${slug || 'anon'}`
}
