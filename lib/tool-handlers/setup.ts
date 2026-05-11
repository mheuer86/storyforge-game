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

export interface ChapterSeedInput extends ChapterSetupInput {
  npcs_to_retire?: string[]
  npcs_to_promote?: string[]
  threads_to_close?: string[]
  chapter_frame?: {
    objective: string
    crucible: string
    outcome_spectrum: {
      clean: string
      costly: string
      failure: string
      catastrophic: string
    }
  }
  opening_seed?: string
  forbidden_ch2_shapes?: string[]
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

export function applyChapterSeedChanges(
  input: ChapterSeedInput,
  updated: GameState,
  statChanges: StatChange[],
): GameState {
  const { threads, ...setupInput } = input
  let next = applySetupChanges(setupInput, updated, statChanges)
  let world = { ...next.world }

  if (input.npcs_to_promote) {
    const promoteNames = new Set(input.npcs_to_promote.map(name => name.toLowerCase()))
    world.npcs = world.npcs.map(npc =>
      promoteNames.has(npc.name.toLowerCase())
        ? {
            ...npc,
            role: npc.role ?? 'npc',
            status: npc.status === 'gone' ? 'active' : npc.status,
            lastSeen: input.location?.name ?? npc.lastSeen,
          }
        : npc
    )
    for (const name of input.npcs_to_promote) dbg(`CHAPTER_SEED promote NPC: ${name}`)
  }

  if (input.npcs_to_retire) {
    const retireNames = new Set(input.npcs_to_retire.map(name => name.toLowerCase()))
    world.npcs = world.npcs.map(npc =>
      retireNames.has(npc.name.toLowerCase())
        ? {
            ...npc,
            status: 'gone',
            lastSeen: `Retired before Chapter ${next.meta.chapterNumber}`,
          }
        : npc
    )
    for (const name of input.npcs_to_retire) dbg(`CHAPTER_SEED retire NPC: ${name}`)
  }

  if (input.threads_to_close) {
    const closeIds = new Set(input.threads_to_close.map(id => id.toLowerCase()))
    world.threads = world.threads.map(thread =>
      closeIds.has(thread.id.toLowerCase()) || closeIds.has(thread.title.toLowerCase())
        ? { ...thread, status: 'closed', deteriorating: false }
        : thread
    )
    for (const id of input.threads_to_close) dbg(`CHAPTER_SEED close thread: ${id}`)
  }

  if (threads) {
    for (const t of threads) {
      const existingIdx = world.threads.findIndex(thread =>
        thread.id.toLowerCase() === t.id.toLowerCase() ||
        thread.title.toLowerCase() === t.title.toLowerCase()
      )
      if (existingIdx >= 0) {
        world.threads = world.threads.map((thread, idx) =>
          idx === existingIdx
            ? { ...thread, title: t.title, status: t.status, deteriorating: t.deteriorating }
            : thread
        )
        dbg(`CHAPTER_SEED update thread: ${t.title}`)
      } else {
        world.threads = [...world.threads, t]
        dbg(`CHAPTER_SEED new thread: ${t.title} [${t.deteriorating ? 'WORSENING' : 'STABLE'}]`)
      }
    }
  }

  next = { ...next, world }

  if (input.chapter_frame) {
    next = {
      ...next,
      chapterFrame: {
        objective: input.chapter_frame.objective,
        crucible: input.chapter_frame.crucible,
        outcomeSpectrum: input.chapter_frame.outcome_spectrum,
      },
    }
    dbg(`CHAPTER_SEED chapter_frame rewritten: ${input.chapter_frame.objective.slice(0, 80)}...`)
  }

  if (input.opening_seed || input.forbidden_ch2_shapes) {
    const meta = {
      ...next.meta,
      chapterSeed: {
        ...(input.opening_seed && { openingSeed: input.opening_seed }),
        ...(input.forbidden_ch2_shapes && { forbiddenShapes: input.forbidden_ch2_shapes }),
        createdAt: new Date().toISOString(),
      },
    }
    next = { ...next, meta }
    if (input.opening_seed) dbg('CHAPTER_SEED opening seed stored')
    if (input.forbidden_ch2_shapes?.length) dbg(`CHAPTER_SEED forbidden shapes: ${input.forbidden_ch2_shapes.length}`)
  }

  return next
}
