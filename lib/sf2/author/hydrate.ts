// Hydrate campaign.npcs and campaign.threads from an AuthorChapterSetupV2
// payload. Previously the client only seeded skeletal entities from ids
// (empty affiliation, voice, retrievalCue, resolutionCriteria, failureMode,
// faction_unknown owners). The Author emits rich data; we carry it into the
// graph here so the scene packet + archivist can reason against real fields.

import type {
  AuthorChapterSetupV2,
  Sf2ChapterNumber,
  Sf2Npc,
  Sf2State,
  Sf2Thread,
} from '../types'
import {
  ensureReferencedFallbackOwners,
  factionIdFromName,
  findFactionByName,
  resolveAuthoredThreadOwnership,
} from '../reference-policy'
import { rebuildOwnerThreadBackrefs } from '../state-indexes'
import { mergeThreadResolutionGates } from '../thread-resolution'
import { validateVoiceNote } from './validate-voice-note'

export function applyAuthoredToCampaign(
  state: Sf2State,
  authored: AuthorChapterSetupV2,
  chapter: Sf2ChapterNumber,
  loadBearingIds: string[]
): void {
  const authoredAtTurn = state.history.turns.length

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
    // Phase 6 — voice_note carries per-NPC distinctness. voice_register stays
    // the formal speaking style. If voice_note is missing or fails validation,
    // fall back to voice_register (preserving prior behavior) and warn so
    // playthrough review can flag thin voices before they collapse together.
    const noteCheck = validateVoiceNote(n.voiceNote)
    const resolvedNote = noteCheck.ok && n.voiceNote ? n.voiceNote : n.voiceRegister
    if (!noteCheck.ok && n.voiceRegister) {
      console.warn(
        `[author/hydrate] npc ${n.id} (${n.name}): ${noteCheck.reason}; falling back to voice_register`
      )
    }
    const existing = state.campaign.npcs[n.id]
    if (existing) {
      // Carry-forward: per Author prompt, affiliation/role/voice_register/
      // voice_note/retrieval_cue may evolve per chapter. Refresh them.
      // Preserve the Archivist-maintained fields: keyFacts, relations,
      // lastSeenTurn, disposition, tempLoad, tempLoadTag, agenda, status,
      // signatureLines.
      existing.affiliation = n.affiliation || existing.affiliation
      existing.role = (n.role || existing.role) as Sf2Npc['role']
      existing.retrievalCue = n.retrievalCue || existing.retrievalCue
      if (n.voiceRegister) {
        existing.identity.voice.register = n.voiceRegister
      }
      if (resolvedNote) {
        existing.identity.voice.note = resolvedNote
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
        voice: { note: resolvedNote, register: n.voiceRegister },
        relations: [],
      },
      ownedThreadIds: [],
      retrievalCue: n.retrievalCue,
      chapterCreated: chapter,
      lastSeenTurn: authoredAtTurn,
      signatureLines: [],
    }
  }

  const loadBearing = new Set(loadBearingIds)
  for (const t of authored.activeThreads) {
    const { owner, stakeholders } = resolveAuthoredThreadOwnership(state, t.ownerHint)
    const existing = state.campaign.threads[t.id]
    if (existing) {
      // Carry-forward: per Author prompt, resolution_criteria / failure_mode
      // / tension / retrieval_cue may evolve. Refresh them. Preserve status
      // (Archivist/author-transitions own lifecycle), tensionHistory,
      // anchored relations, deterioration.
      existing.resolutionCriteria = t.resolutionCriteria || existing.resolutionCriteria
      existing.failureMode = t.failureMode || existing.failureMode
      existing.retrievalCue = t.retrievalCue || existing.retrievalCue
      existing.resolutionGates = mergeThreadResolutionGates(existing.resolutionGates ?? [], t.resolutionGates ?? [])
      existing.progressEvents = existing.progressEvents ?? []
      if (typeof t.tension === 'number') existing.tension = clampTension(t.tension)
      existing.peakTension = Math.max(existing.peakTension ?? existing.tension, existing.tension)
      existing.loadBearing = loadBearing.has(t.id)
      existing.successorToThreadId = t.successorToThreadId
      existing.chapterDriverKind = t.driverKind
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
      peakTension: clampTension(typeof t.tension === 'number' ? t.tension : 5),
      resolutionCriteria: t.resolutionCriteria,
      failureMode: t.failureMode,
      loadBearing: loadBearing.has(t.id),
      successorToThreadId: t.successorToThreadId,
      chapterDriverKind: t.driverKind,
      resolutionGates: t.resolutionGates ?? [],
      progressEvents: [],
      tensionHistory: [],
    }
  }

  const activeArcId = authored.arcLink?.arcId
  const activeArc = activeArcId ? state.campaign.arcs[activeArcId] : undefined
  if (activeArc) {
    const existing = new Set(activeArc.threadIds)
    for (const threadId of authored.activeThreads.map((t) => t.id)) {
      if (state.campaign.threads[threadId]) {
        existing.add(threadId)
        state.campaign.threads[threadId].anchoredArcId = activeArc.id
      }
    }
    activeArc.threadIds = [...existing]
  }

  ensureReferencedFallbackOwners(state)
  rebuildOwnerThreadBackrefs(state)
}

function clampTension(n: number): Sf2Thread['tension'] {
  const v = Math.max(0, Math.min(10, Math.round(n)))
  return v as Sf2Thread['tension']
}
