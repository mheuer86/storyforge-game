import type { AuthorInputSeed } from '../types'

export type Sf2ArcVariantSeed = NonNullable<AuthorInputSeed['arcVariantSeed']>

export function getArcVariantCandidates(seed: AuthorInputSeed): Sf2ArcVariantSeed[] {
  if (seed.hook.title !== 'The Tithe') return []

  return [
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
}

export function selectArcVariantSeed(seed: AuthorInputSeed): Sf2ArcVariantSeed | undefined {
  if (seed.arcVariantSeed) return seed.arcVariantSeed
  const candidates = getArcVariantCandidates(seed)
  if (candidates.length === 0) return undefined
  return candidates[Math.floor(Math.random() * candidates.length)]
}
