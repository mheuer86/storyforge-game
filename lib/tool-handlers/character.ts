import type { GameState, InventoryItem, RollBreakdown } from '../types'
import { dbg, type CommitTurnInput, type StatChange } from '../tool-processor'

export function applyCharacterChanges(
  input: NonNullable<CommitTurnInput['character']>,
  updated: GameState,
  statChanges: StatChange[],
  creditChangesThisBatch: number[],
  currLabel: string,
  fullInput: CommitTurnInput,
): GameState {
  const char = { ...updated.character }

  if (input.hp_delta !== undefined) {
    const isPhantomDamage = input.hp_delta < 0 && !input.roll_breakdown && !updated.combat.active
    if (!isPhantomDamage) {
      const newHp = Math.max(0, Math.min(char.hp.max, char.hp.current + input.hp_delta))
      if (input.hp_delta < 0) {
        statChanges.push({ type: 'loss', label: `HP ${char.hp.current} → ${newHp}` })
      } else if (input.hp_delta > 0) {
        statChanges.push({ type: 'gain', label: `HP ${char.hp.current} → ${newHp}` })
      }
      char.hp = { ...char.hp, current: newHp }
    }
  }

  if (input.hp_set !== undefined) {
    const newHp = Math.max(0, Math.min(char.hp.max, input.hp_set))
    statChanges.push({ type: newHp < char.hp.current ? 'loss' : 'gain', label: `HP → ${newHp}` })
    char.hp = { ...char.hp, current: newHp }
  }

  if (input.credits_delta !== undefined) {
    const ledgerEntry = fullInput?.world?.add_ledger_entry
    const ledgerAlreadyExists = ledgerEntry && (updated.world.ledger ?? []).some(
      e => e.amount === ledgerEntry.amount && e.description === ledgerEntry.description
    )
    if (creditChangesThisBatch.includes(input.credits_delta)) {
      dbg('DUPLICATE credit change rejected (same batch): ' + input.credits_delta)
    } else if (ledgerAlreadyExists) {
      dbg('DUPLICATE credit change rejected (ledger entry already exists): ' + input.credits_delta + ' ' + ledgerEntry?.description)
    } else {
      creditChangesThisBatch.push(input.credits_delta)
      const newCredits = char.credits + input.credits_delta
      if (input.credits_delta < 0) {
        statChanges.push({ type: 'loss', label: `${char.credits} ${currLabel} → ${newCredits}` })
      } else {
        statChanges.push({ type: 'gain', label: `+${input.credits_delta} ${currLabel}` })
      }
      char.credits = newCredits
    }
  }

  if (input.inventory_add) {
    const items: InventoryItem[] = input.inventory_add.map(item => ({
      ...item,
      maxCharges: item.max_charges ?? item.maxCharges,
    }))
    const existingNames = new Set(char.inventory.map(i => i.name.toLowerCase()))
    const newItems = items.filter(item => !existingNames.has(item.name.toLowerCase()))
    char.inventory = [...char.inventory, ...newItems]
    newItems.forEach((item) => {
      statChanges.push({ type: 'new', label: `+${item.name}` })
    })
  }

  if (input.inventory_remove) {
    const removedIds = new Set(input.inventory_remove)
    char.inventory = char.inventory.filter((item) => !removedIds.has(item.id))
  }

  if (input.inventory_use) {
    const useId = input.inventory_use.id.toLowerCase()
    let matched = false
    char.inventory = char.inventory.map((item) => {
      const id = item.id.toLowerCase()
      const name = item.name.toLowerCase()
      const slug = name.replace(/\s+/g, '_')
      const matchById = id === useId || id.startsWith(useId) || useId.startsWith(id)
      const matchByName = name === useId || name.startsWith(useId) || slug === useId || slug.startsWith(useId)
      if ((matchById || matchByName) && !matched) {
        matched = true
        if (item.charges !== undefined) {
          const newCharges = input.inventory_use!.set_charges !== undefined
            ? Math.max(0, input.inventory_use!.set_charges)
            : Math.max(0, item.charges - 1)
          if (newCharges === item.charges) return item
          if (newCharges <= 0) {
            statChanges.push({ type: 'loss', label: `${item.name} depleted` })
          } else {
            statChanges.push({ type: 'loss', label: `${item.name} ${item.charges} → ${newCharges}` })
          }
          return { ...item, charges: newCharges }
        } else if (item.quantity > 1) {
          statChanges.push({ type: 'loss', label: `${item.name} ${item.quantity} → ${item.quantity - 1}` })
          return { ...item, quantity: item.quantity - 1 }
        } else {
          statChanges.push({ type: 'loss', label: `${item.name} used` })
          return { ...item, quantity: 0 }
        }
      }
      return item
    })
  }

  if (input.temp_modifier_add) {
    char.tempModifiers = [...char.tempModifiers, input.temp_modifier_add]
    statChanges.push({ type: 'new', label: `Effect: ${input.temp_modifier_add.name}` })
  }

  if (input.temp_modifier_remove) {
    char.tempModifiers = char.tempModifiers.filter((m) => m.id !== input.temp_modifier_remove)
  }

  if (input.trait_update) {
    char.traits = char.traits.map((t) =>
      t.name === input.trait_update!.name
        ? { ...t, usesRemaining: input.trait_update!.uses_remaining }
        : t
    )
  }

  if (input.level_up) {
    const { new_level, hp_increase, new_proficiency_bonus } = input.level_up
    const newMax = char.hp.max + hp_increase
    statChanges.push({ type: 'gain', label: `Level ${new_level}! HP max +${hp_increase}` })
    char.level = new_level
    char.hp = { max: newMax, current: newMax }
    if (new_proficiency_bonus !== undefined) {
      char.proficiencyBonus = new_proficiency_bonus
      statChanges.push({ type: 'gain', label: `Proficiency +${new_proficiency_bonus}` })
    }
  }

  if (input.stat_increase) {
    const newStats = { ...char.stats }
    for (const inc of input.stat_increase) {
      const key = inc.stat as keyof typeof newStats
      if (key in newStats) {
        newStats[key] += inc.amount
        statChanges.push({ type: 'gain', label: `${inc.stat} +${inc.amount} → ${newStats[key]}` })
      }
    }
    char.stats = newStats
  }

  if (input.exhaustion_delta !== undefined) {
    const prev = char.exhaustion ?? 0
    char.exhaustion = Math.max(0, Math.min(6, prev + input.exhaustion_delta))
    if (input.exhaustion_delta > 0) {
      const labels = ['', 'Exhaustion 1: disadvantage on checks', 'Exhaustion 2: slowed', 'Exhaustion 3: disadvantage on attacks/saves', 'Exhaustion 4: HP halved', 'Exhaustion 5: immobilized', 'Exhaustion 6: death']
      statChanges.push({ type: 'loss', label: labels[char.exhaustion] || `Exhaustion ${char.exhaustion}` })
    } else {
      statChanges.push({ type: 'gain', label: char.exhaustion === 0 ? 'Exhaustion cleared' : `Exhaustion reduced to ${char.exhaustion}` })
    }
  }

  if (input.add_proficiency) {
    if (!char.proficiencies.includes(input.add_proficiency)) {
      char.proficiencies = [...char.proficiencies, input.add_proficiency]
      statChanges.push({ type: 'new', label: `Proficiency: ${input.add_proficiency}` })
    }
  }

  if (input.upgrade_to_expertise) {
    const expertiseLabel = `${input.upgrade_to_expertise} (expertise)`
    char.proficiencies = char.proficiencies.map((p) =>
      p === input.upgrade_to_expertise ? expertiseLabel : p
    )
    if (!char.proficiencies.includes(expertiseLabel)) {
      char.proficiencies = [...char.proficiencies, expertiseLabel]
    }
    statChanges.push({ type: 'gain', label: `Expertise: ${input.upgrade_to_expertise}` })
  }

  if (input.spend_inspiration) {
    char.inspiration = false
    statChanges.push({ type: 'loss', label: 'Used Inspiration' })
  }

  if (input.award_inspiration) {
    if (!char.inspiration) {
      char.inspiration = true
      statChanges.push({ type: 'gain', label: `Inspiration: ${input.award_inspiration.reason}` })
    }
  }

  return { ...updated, character: char }
}
