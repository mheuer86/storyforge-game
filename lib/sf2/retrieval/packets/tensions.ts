import type {
  Sf2DispositionTier,
  Sf2HeatLevel,
  Sf2State,
  Sf2ThreadPacket,
  Sf2WorkingSet,
} from '../../types'
import { getEffectiveThreadPressure } from '../../pressure/derive'

export function buildThreadPackets(
  state: Sf2State,
  workingSet: Sf2WorkingSet
): Sf2ThreadPacket[] {
  const { campaign } = state
  const fullSet = new Set(workingSet.fullEntityIds)

  const threadIds = [...fullSet].filter((id) => Boolean(campaign.threads[id]))

  return threadIds.map((id) => {
    const t = campaign.threads[id]
    const chapterPressure = state.chapter.setup.threadPressure?.[id]
    const effectivePressure = chapterPressure
      ? getEffectiveThreadPressure(id, state.chapter.setup)
      : t.tension
    const ownerSummary = buildOwnerSummary(state, t.owner)
    const stakeholderDispositions = t.stakeholders
      .map((s) => buildStakeholderDisposition(state, s))
      .filter((x): x is NonNullable<typeof x> => Boolean(x))

    return {
      threadId: t.id,
      title: t.title,
      status: t.status,
      tension: effectivePressure,
      canonicalTension: t.tension,
      peakTension: t.peakTension,
      pressureRole: chapterPressure?.role,
      openingFloor: chapterPressure?.openingFloor,
      localEscalation: chapterPressure?.localEscalation,
      localWhyItMatters: t.retrievalCue,
      ownerSummary,
      stakeholderDispositions,
      deterioration: renderDeterioration(t.deterioration),
      anchoredDecisions: Object.values(campaign.decisions)
        .filter((d) => d.status === 'active' && d.anchoredTo.includes(t.id))
        .map((d) => ({ id: d.id, summary: d.summary })),
      anchoredPromises: Object.values(campaign.promises)
        .filter((p) => p.status === 'active' && p.anchoredTo.includes(t.id))
        .map((p) => ({ id: p.id, obligation: p.obligation })),
      anchoredClues: Object.values(campaign.clues)
        .filter((c) => c.status === 'attached' && c.anchoredTo.includes(t.id))
        .map((c) => ({ id: c.id, content: c.content })),
    }
  })
}

function buildOwnerSummary(
  state: Sf2State,
  owner: { kind: 'npc' | 'faction'; id: string }
): string {
  if (owner.kind === 'npc') {
    const npc = state.campaign.npcs[owner.id]
    if (!npc) return `npc:${owner.id} (unresolved)`
    return `${npc.name} (${npc.affiliation}, ${npc.disposition})`
  }
  const faction = state.campaign.factions[owner.id]
  if (!faction) return `faction:${owner.id} (unresolved)`
  return `${faction.name} (stance: ${faction.stance}, heat: ${faction.heat})`
}

function buildStakeholderDisposition(
  state: Sf2State,
  stakeholder: { kind: 'npc' | 'faction'; id: string }
): { ownerKind: 'npc' | 'faction'; name: string; disposition: Sf2DispositionTier | Sf2HeatLevel } | null {
  if (stakeholder.kind === 'npc') {
    const npc = state.campaign.npcs[stakeholder.id]
    if (!npc) return null
    return { ownerKind: 'npc', name: npc.name, disposition: npc.disposition }
  }
  const faction = state.campaign.factions[stakeholder.id]
  if (!faction) return null
  return { ownerKind: 'faction', name: faction.name, disposition: faction.heat }
}

function renderDeterioration(
  d: { kind: 'clock'; segments: number; filled: number } | { kind: 'timer'; deadline: string } | undefined
): string | undefined {
  if (!d) return undefined
  if (d.kind === 'clock') return `clock ${d.filled}/${d.segments}`
  return `deadline: ${d.deadline}`
}
