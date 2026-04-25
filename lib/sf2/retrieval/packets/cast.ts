import type {
  Sf2PresentCastPacket,
  Sf2State,
  Sf2WorkingSet,
} from '../../types'

export function buildPresentCastPackets(
  state: Sf2State,
  workingSet: Sf2WorkingSet
): Sf2PresentCastPacket[] {
  const presentIds = new Set(state.world.sceneSnapshot.presentNpcIds)
  // Include any NPCs in the working-set full bucket that are on-stage.
  for (const id of workingSet.fullEntityIds) {
    const npc = state.campaign.npcs[id]
    if (npc && presentIds.has(id)) presentIds.add(id)
  }

  const currentTurn = state.history.turns.length

  return [...presentIds]
    .map((id) => state.campaign.npcs[id])
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((npc) => ({
      npcId: npc.id,
      name: npc.name,
      affiliation: npc.affiliation,
      pronoun: npc.identity.pronoun,
      age: npc.identity.age,
      disposition: npc.disposition,
      voice: npc.identity.voice.note,
      currentRead: deriveCurrentRead(npc),
      relationToPlayer: deriveRelationToPlayer(npc),
      activePressure: deriveActivePressure(npc),
      turnsAbsent:
        npc.lastSeenTurn !== undefined && currentTurn > npc.lastSeenTurn
          ? currentTurn - npc.lastSeenTurn
          : undefined,
    }))
}

function deriveCurrentRead(npc: {
  disposition: string
  identity: { vulnerability?: string }
  agenda?: { currentMove: string }
}): string {
  if (npc.agenda?.currentMove) return npc.agenda.currentMove
  return npc.disposition
}

function deriveRelationToPlayer(npc: {
  disposition: string
  affiliation: string
}): string {
  return `${npc.affiliation} · ${npc.disposition}`
}

function deriveActivePressure(npc: {
  agenda?: { pursuing: string }
  disposition: string
}): string {
  if (npc.agenda?.pursuing) return npc.agenda.pursuing
  return ''
}
