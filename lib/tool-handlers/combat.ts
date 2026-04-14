import type { GameState, Enemy, InventoryItem } from '../types'
import type { CommitTurnInput, StatChange } from '../tool-processor'

export function applyCombatChanges(
  input: NonNullable<CommitTurnInput['combat']>,
  updated: GameState,
  statChanges: StatChange[],
  currLabel: string,
): GameState {
  if (input.start) {
    const enemies = input.start.enemies.map(e => ({
      ...e,
      attackBonus: e.attack_bonus ?? (e as unknown as Enemy).attackBonus ?? 0,
    }))
    updated = {
      ...updated,
      combat: {
        active: true,
        round: 1,
        enemies,
        log: [input.start.description],
      },
    }
    statChanges.push({ type: 'new', label: 'Combat started' })
  }

  if (input.update_enemies) {
    let enemies = [...updated.combat.enemies]
    for (const update of input.update_enemies) {
      const idx = enemies.findIndex(e => e.name.toLowerCase() === update.name.toLowerCase())
      if (idx === -1) continue
      const enemy = { ...enemies[idx] }
      if (update.hp_delta !== undefined) {
        enemy.hp = { ...enemy.hp, current: Math.max(0, enemy.hp.current + update.hp_delta) }
      }
      if (update.status === 'defeated' || update.status === 'dead' || update.status === 'fled' || enemy.hp.current <= 0) {
        statChanges.push({ type: 'gain', label: `${enemy.name} ${update.status || 'defeated'}` })
        enemies.splice(idx, 1)
      } else {
        enemies[idx] = enemy
      }
    }
    if (enemies.length === 0 && updated.combat.active) {
      updated = { ...updated, combat: { active: false, round: 0, enemies: [], log: [...updated.combat.log, 'All enemies defeated'] } }
      statChanges.push({ type: 'neutral', label: 'Combat ended' })
    } else {
      updated = { ...updated, combat: { ...updated.combat, enemies } }
    }
  }

  if (input.end) {
    if (input.end.loot && input.end.loot.length > 0) {
      const char = { ...updated.character }
      const items: InventoryItem[] = input.end.loot.map(item => ({
        ...item,
        maxCharges: item.max_charges ?? item.maxCharges,
      }))
      char.inventory = [...char.inventory, ...items]
      items.forEach((item) => statChanges.push({ type: 'gain', label: `Looted: ${item.name}` }))
      updated = { ...updated, character: char }
    }
    if (input.end.credits_gained) {
      const char = { ...updated.character, credits: updated.character.credits + input.end.credits_gained }
      statChanges.push({ type: 'gain', label: `+${input.end.credits_gained} ${currLabel}` })
      updated = { ...updated, character: char }
    }
    updated = {
      ...updated,
      combat: { active: false, round: 0, enemies: [], log: [] },
    }
    statChanges.push({ type: 'neutral', label: `Combat: ${input.end.outcome}` })
  }

  return updated
}
