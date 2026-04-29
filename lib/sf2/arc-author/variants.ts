import type { AuthorInputSeed } from '../types'

export type Sf2ArcVariantSeed = NonNullable<AuthorInputSeed['arcVariantSeed']>

export function getArcVariantCandidates(seed: AuthorInputSeed): Sf2ArcVariantSeed[] {
  if (seed.hook.title === 'The Tithe') return TITHE_VARIANTS
  if (seed.hook.title === 'Forty Thousand') return FORTY_THOUSAND_VARIANTS
  return []
}

const TITHE_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'tithe-revolt',
    scenarioBias: 'revolt',
    creativeAngle: 'The shortage has become a public legitimacy crisis before the PC arrives.',
    avoidModes: ['investigation', 'chamber_play'],
  },
  {
    id: 'tithe-protection',
    scenarioBias: 'protection',
    creativeAngle:
      "The PC's authority makes them responsible for preventing replacement selection without openly defying the Synod.",
    avoidModes: ['investigation', 'chamber_play'],
  },
  {
    id: 'tithe-pursuit',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The missing tithe has already moved; the playable arc follows custody, flight, and jurisdiction.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'tithe-underground',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The shortage exposes a hidden route that moves Resonants and children beyond official allocation.',
    avoidModes: ['procedural_contest', 'chamber_play'],
  },
  {
    id: 'tithe-superior-fallout',
    scenarioBias: 'superior_fallout',
    creativeAngle:
      "The Warden's superiors have already made the cruel choice; the arc tests whether the PC contains, enforces, or exposes the fallout.",
    avoidModes: ['investigation'],
  },
]

const FORTY_THOUSAND_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'forty-thousand-extraction',
    scenarioBias: 'extraction',
    creativeAngle:
      'The real arc is getting the passenger and sealed crate off-station before clamps, collectors, or customs close every exit.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'forty-thousand-pursuit',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The job leaves the station quickly, then becomes a beacon-corridor chase where debt, cargo, and destination all keep moving.',
    avoidModes: ['chamber_play', 'procedural_contest'],
  },
  {
    id: 'forty-thousand-protection',
    scenarioBias: 'protection',
    creativeAngle:
      'The passenger or crate is a vulnerable asset several factions want intact, forcing the Driftrunner to choose what protection costs.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'forty-thousand-procedural-contest',
    scenarioBias: 'procedural_contest',
    creativeAngle:
      'Station law, debt contracts, docking authority, and manifest technicalities are the trap before the ship can leave.',
    avoidModes: ['revolt', 'siege'],
  },
  {
    id: 'forty-thousand-underground-network',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The route past the last beacon exposes a hidden smuggling or refugee channel that depends on people staying unlisted.',
    avoidModes: ['siege'],
  },
]

export function selectArcVariantSeed(seed: AuthorInputSeed): Sf2ArcVariantSeed | undefined {
  if (seed.arcVariantSeed) return seed.arcVariantSeed
  const candidates = getArcVariantCandidates(seed)
  if (candidates.length === 0) return undefined
  return candidates[Math.floor(Math.random() * candidates.length)]
}
