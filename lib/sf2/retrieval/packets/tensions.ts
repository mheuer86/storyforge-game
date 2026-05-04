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
  workingSet: Sf2WorkingSet,
  turnIndex: number
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
    const cluesForThread = Object.values(campaign.clues).filter((c) => c.anchoredTo.includes(t.id))
    // Δ surfaces only on the turn the change actually happened. lastAdvancedTurn
    // is stamped to the patch's turnIndex (state pointer), which equals the next
    // narrator render's turnIndex in both replay and production.
    const tensionJustAdvanced = t.lastAdvancedTurn === turnIndex
    const previousCanonical = tensionJustAdvanced
      ? [...t.tensionHistory]
          .filter((entry) => entry.turn < turnIndex)
          .sort((a, b) => b.turn - a.turn)[0]?.value
      : undefined
    const rawDelta = previousCanonical === undefined ? undefined : t.tension - previousCanonical
    const tensionDelta = rawDelta !== undefined && rawDelta !== 0 ? rawDelta : undefined

    return {
      threadId: t.id,
      title: t.title,
      status: t.status,
      tension: effectivePressure,
      tensionDelta,
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
      anchoredClues: cluesForThread
        .filter((c) => c.status === 'attached')
        .map((c) => ({ id: c.id, content: c.content })),
      resolutionGates: (t.resolutionGates ?? []).map((g) => ({
        id: g.id,
        label: g.label,
        condition: g.condition,
        status: g.status,
      })),
      clueTier: deriveClueTier(cluesForThread),
    }
  })
}

function deriveClueTier(
  clues: Array<{ status: 'floating' | 'attached' | 'consumed' }>
): Sf2ThreadPacket['clueTier'] {
  if (clues.length === 0) return undefined
  const floating = clues.filter((c) => c.status === 'floating').length
  const attached = clues.filter((c) => c.status === 'attached').length
  const consumed = clues.filter((c) => c.status === 'consumed').length
  if (consumed >= 1 || attached >= 2) return 'load_bearing'
  if (attached >= 1 || floating >= 3) return 'evidenced'
  return 'lead'
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
