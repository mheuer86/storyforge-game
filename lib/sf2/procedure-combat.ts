import type { Sf2EntityId, Sf2State } from './types'
import type { Sf2ProcedureRuntime } from './procedure'

export const SF2_COMBAT_EXIT_CONDITIONS = [
  'defeated_all',
  'objective_met',
  'fled',
  'surrendered',
  'time_expired',
  'aborted',
] as const

export type Sf2CombatExitCondition = (typeof SF2_COMBAT_EXIT_CONDITIONS)[number]

export interface Sf2CombatStatusCondition {
  label: string
  durationRounds?: number
}

export interface Sf2CombatEnemyPacket {
  id: string
  name: string
  hp: number
  ac: number
  status: Sf2CombatStatusCondition[]
}

export interface Sf2CombatProcedurePacket {
  id: Sf2EntityId
  encounterName: string
  round: number
  initiative: string[]
  activeTurnId?: string
  enemies: Sf2CombatEnemyPacket[]
  playerPosition?: string
  hazards: string[]
  objectives: string[]
  exitConditions: Sf2CombatExitCondition[]
  parentProcedureIds: Sf2EntityId[]
}

export function buildCombatProcedurePacket(state: Sf2State): Sf2CombatProcedurePacket | undefined {
  if (!state.world.combat?.active) return undefined

  const combatRuntime = Object.values(state.campaign.procedures ?? {})
    .find((procedure) => procedure.kind === 'combat' && (procedure.status === 'active' || procedure.status === 'paused'))
  const parentProcedureIds = Object.values(state.campaign.procedures ?? {})
    .filter((procedure) =>
      procedure.id !== combatRuntime?.id &&
      (procedure.kind === 'operation' || procedure.kind === 'access') &&
      (procedure.status === 'active' || procedure.status === 'paused')
    )
    .map((procedure) => procedure.id)

  return {
    id: combatRuntime?.id ?? 'combat',
    encounterName: combatRuntime?.label ?? 'Combat',
    round: Math.max(1, state.world.combat.round),
    initiative: deriveInitiative(state, combatRuntime),
    activeTurnId: combatRuntime?.facts.find((fact) => fact.id === 'active_turn')?.text,
    enemies: state.world.combat.enemies.map((enemy, index) => ({
      id: `enemy_${index}`,
      name: enemy.name,
      hp: enemy.hp,
      ac: enemy.ac,
      status: normalizeEnemyStatus(enemy.abilities),
    })),
    playerPosition: combatRuntime?.facts.find((fact) => fact.id === 'player_position')?.text,
    hazards: deriveCombatHazards(combatRuntime),
    objectives: combatRuntime?.objectives ?? (combatRuntime?.objective ? [combatRuntime.objective] : []),
    exitConditions: deriveExitConditions(combatRuntime),
    parentProcedureIds,
  }
}

function deriveInitiative(state: Sf2State, runtime?: Sf2ProcedureRuntime): string[] {
  const runtimeOrder = runtime?.facts.find((fact) => fact.id === 'initiative_order')?.text
  if (runtimeOrder) {
    return runtimeOrder.split('|').map((entry) => entry.trim()).filter(Boolean)
  }
  return ['pc', ...state.world.combat!.enemies.map((enemy) => enemy.name)]
}

function normalizeEnemyStatus(abilities?: string[]): Sf2CombatStatusCondition[] {
  return (abilities ?? [])
    .filter((ability) => ability.startsWith('status:'))
    .map((ability) => ({ label: ability.replace(/^status:\s*/, '').trim() }))
    .filter((status) => status.label.length > 0)
}

function deriveCombatHazards(runtime?: Sf2ProcedureRuntime): string[] {
  if (!runtime) return []
  return [
    ...runtime.constraints
      .filter((constraint) => constraint.status === 'active')
      .map((constraint) => constraint.label),
    ...runtime.complications
      .filter((complication) => complication.status === 'active')
      .map((complication) => complication.label),
  ].slice(0, 4)
}

function deriveExitConditions(runtime?: Sf2ProcedureRuntime): Sf2CombatExitCondition[] {
  const linked = runtime?.linkedRefs
    .filter((ref) => ref.kind === 'clock' && SF2_COMBAT_EXIT_CONDITIONS.includes(ref.id as Sf2CombatExitCondition))
    .map((ref) => ref.id as Sf2CombatExitCondition) ?? []
  const fromFacts = runtime?.facts
    .filter((fact) => fact.id.startsWith('exit_') && SF2_COMBAT_EXIT_CONDITIONS.includes(fact.id.replace(/^exit_/, '') as Sf2CombatExitCondition))
    .map((fact) => fact.id.replace(/^exit_/, '') as Sf2CombatExitCondition) ?? []
  return [...new Set<Sf2CombatExitCondition>([...linked, ...fromFacts, 'defeated_all', 'fled'])].slice(0, 4)
}
