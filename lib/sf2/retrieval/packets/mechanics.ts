import type { Sf2MechanicsPacket, Sf2State } from '../../types'
import { buildProcedurePacket, isActiveSf2Procedure } from '../../procedure'
import { deriveSf2BeatMode, getSf2BeatModeGuidance } from '../../beat-mode'
import { buildCombatProcedurePacket } from '../../procedure-combat'

export function buildMechanicsPacket(state: Sf2State, playerInput = ''): Sf2MechanicsPacket {
  const beatMode = deriveSf2BeatMode(state, playerInput)
  const modules: Sf2MechanicsPacket['activeModules'] = []
  const procedurePackets = Object.values(state.campaign.procedures ?? {})
    .filter(isActiveSf2Procedure)
    .map((procedure) => buildProcedurePacket(procedure))
  const combatRuntime = buildCombatProcedurePacket(state)

  if (state.world.combat?.active) {
    modules.push({
      kind: 'combat',
      roundsElapsed: state.world.combat.round,
      enemies: state.world.combat.enemies.map((e) => ({
        name: e.name,
        hp: e.hp,
        ac: e.ac,
      })),
      runtime: combatRuntime,
    })
  }
  const operationRuntime = procedurePackets.find((packet) => packet.kind === 'operation')
  if (state.world.operation) {
    modules.push({
      kind: 'operation',
      phase: state.world.operation.phase,
      status: state.world.operation.status,
      runtime: operationRuntime,
    })
  } else if (operationRuntime) {
    modules.push({
      kind: 'operation',
      phase: operationRuntime.phase ?? 'orientation',
      status: operationRuntime.status,
      runtime: operationRuntime,
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

  return {
    beatMode: {
      mode: beatMode,
      guidance: getSf2BeatModeGuidance(beatMode),
    },
    activeModules: modules,
    procedures: procedurePackets,
  }
}
