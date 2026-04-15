import type { GameState, DispositionTier } from '../types'
import { dbg, type StatChange } from '../tool-processor'
import { findNpcByName } from '../npc-utils'

export interface ChapterSetupInput {
  npcs?: {
    name: string
    description?: string
    last_seen?: string
    disposition?: DispositionTier
    voice_note?: string
    role?: 'crew' | 'contact' | 'npc'
    affiliation?: string
    key_facts?: string[]
    relations?: { name: string; type: string }[]
  }[]
  location?: { name: string; description: string }
  factions?: { name: string; stance: string }[]
  threads?: { id: string; title: string; status: string; deteriorating: boolean }[]
}

export function applySetupChanges(
  input: ChapterSetupInput,
  updated: GameState,
  statChanges: StatChange[],
): GameState {
  const world = { ...updated.world }

  // ── NPCs: upsert (existing crew → merge, new → create) ──
  if (input.npcs) {
    for (const n of input.npcs) {
      const existing = findNpcByName(world.npcs, n.name)
      if (existing) {
        // Merge into existing NPC (crew enrichment)
        world.npcs = world.npcs.map(x => {
          if (x.name !== existing.name) return x
          return {
            ...x,
            ...(n.description !== undefined && { description: n.description }),
            ...(n.last_seen !== undefined && { lastSeen: n.last_seen }),
            ...(n.disposition !== undefined && { disposition: n.disposition }),
            ...(n.voice_note !== undefined && { voiceNote: n.voice_note }),
            ...(n.role !== undefined && { role: n.role }),
            ...(n.affiliation !== undefined && { affiliation: n.affiliation }),
            ...(n.key_facts && { keyFacts: n.key_facts.slice(0, 3) }),
            ...(n.relations && { relations: n.relations }),
          }
        })
        dbg(`SETUP upsert NPC: ${existing.name} (${n.key_facts?.length ?? 0} facts, ${n.relations?.length ?? 0} relations)`)
      } else {
        // Create new NPC
        world.npcs = [...world.npcs, {
          name: n.name,
          description: n.description ?? '',
          lastSeen: n.last_seen ?? 'Unknown',
          disposition: n.disposition,
          voiceNote: n.voice_note,
          role: n.role,
          affiliation: n.affiliation,
          keyFacts: n.key_facts?.slice(0, 3),
          relations: n.relations,
        }]
        statChanges.push({ type: 'new', label: `Met: ${n.name}` })
        dbg(`SETUP new NPC: ${n.name} [${n.role ?? 'npc'}|${n.disposition ?? 'neutral'}]`)
      }

    }
  }

  // Ensure every NPC affiliation has a matching faction (referential integrity)
  const affiliations = new Set(world.npcs.filter(n => n.affiliation).map(n => n.affiliation!))
  for (const aff of affiliations) {
    if (!world.factions.some(f => f.name === aff)) {
      world.factions = [...world.factions, { name: aff, stance: 'Unknown' }]
      dbg(`SETUP auto-faction for orphan affiliation: ${aff}`)
    }
  }

  // ── Location ──
  if (input.location) {
    world.currentLocation = { name: input.location.name, description: input.location.description }
    dbg(`SETUP location: ${input.location.name}`)
  }

  // ── Factions ──
  if (input.factions) {
    for (const f of input.factions) {
      const existing = world.factions.find(x => x.name === f.name)
      if (existing) {
        world.factions = world.factions.map(x => x.name === f.name ? { ...x, stance: f.stance } : x)
      } else {
        world.factions = [...world.factions, f]
      }
      dbg(`SETUP faction: ${f.name} — ${f.stance}`)
    }
  }

  // ── Threads ──
  if (input.threads) {
    for (const t of input.threads) {
      world.threads = [...world.threads, t]
      dbg(`SETUP thread: ${t.title} [${t.deteriorating ? 'WORSENING' : 'STABLE'}]`)
    }
  }

  return { ...updated, world }
}
