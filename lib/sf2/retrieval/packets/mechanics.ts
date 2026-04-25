import type { Sf2MechanicsPacket, Sf2State } from '../../types'

export function buildMechanicsPacket(state: Sf2State): Sf2MechanicsPacket {
  const modules: Sf2MechanicsPacket['activeModules'] = []
  if (state.world.combat?.active) {
    modules.push({
      kind: 'combat',
      roundsElapsed: state.world.combat.round,
      enemies: state.world.combat.enemies.map((e) => ({
        name: e.name,
        hp: e.hp,
        ac: e.ac,
      })),
    })
  }
  if (state.world.operation) {
    modules.push({
      kind: 'operation',
      phase: state.world.operation.phase,
      status: state.world.operation.status,
    })
  }
  if (state.world.exploration) {
    modules.push({
      kind: 'exploration',
      area: state.world.exploration.area,
      progress: state.world.exploration.progress,
    })
  }

  // Investigation overlay: if there are attached clues in the current chapter,
  // surface a light summary.
  const attachedClues = Object.values(state.campaign.clues).filter(
    (c) => c.status === 'attached'
  )
  const floatingClues = state.campaign.floatingClueIds.length
  if (attachedClues.length > 0 || floatingClues > 0) {
    modules.push({
      kind: 'investigation',
      clueCount: attachedClues.length + floatingClues,
      openLeads: attachedClues.slice(-3).map((c) => c.content.slice(0, 80)),
    })
  }

  return { activeModules: modules }
}
