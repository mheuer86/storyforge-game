import type { Sf2PlayerPacket, Sf2State } from '../../types'

const STAT_KEYS: Array<'STR' | 'DEX' | 'CON' | 'INT' | 'WIS' | 'CHA'> = [
  'STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA',
]

export function buildPlayerPacket(state: Sf2State): Sf2PlayerPacket {
  const p = state.player
  const mod = (v: number) => Math.floor((v - 10) / 2)
  const proficiencyBonus = Math.floor(((p.level ?? 1) - 1) / 4) + 2
  return {
    name: p.name,
    levelHp: `L${p.level} · ${p.hp.current}/${p.hp.max} HP`,
    ac: p.ac,
    credits: p.credits,
    inspiration: p.inspiration,
    exhaustion: p.exhaustion,
    activeTraits: p.traits.map((t) => ({
      name: t.name,
      usesRemaining: t.uses?.current,
    })),
    tempModifiers: p.tempModifiers.map((m) => `${m.source}: ${m.effect}`),
    className: p.class.name,
    originName: p.origin.name,
    statModifiers: STAT_KEYS.map((k) => ({ stat: k, mod: mod(p.stats[k]) })),
    proficiencies: p.proficiencies.slice(),
    proficiencyBonus,
  }
}
