import type { AuthorInputSeed } from '../types'

export type Sf2ArcVariantSeed = NonNullable<AuthorInputSeed['arcVariantSeed']>

export function getArcVariantCandidates(seed: AuthorInputSeed): Sf2ArcVariantSeed[] {
  if (seed.hook.title === 'The Tithe') return TITHE_VARIANTS
  if (seed.hook.title === 'Forty Thousand') return FORTY_THOUSAND_VARIANTS
  if (seed.hook.title === 'The Second Library') return SECOND_LIBRARY_VARIANTS
  if (seed.hook.title === 'Blackout') return BLACKOUT_VARIANTS
  if (seed.hook.title === 'The Cache') return CACHE_VARIANTS
  if (seed.hook.title === 'Five Names') return FIVE_NAMES_VARIANTS
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
    id: 'forty-thousand-smuggler-run',
    scenarioBias: 'extraction',
    creativeAngle:
      'The back-channel offer is an off-book run through customs scans, false manifests, patrol windows, or blockade lanes; the forty thousand clears departure only if the Driftrunner keeps the cargo, passenger, or data uninspected until handoff.',
    avoidModes: ['chamber_play', 'procedural_contest'],
  },
  {
    id: 'forty-thousand-hot-cargo',
    scenarioBias: 'protection',
    creativeAngle:
      'The job turns out to be hot: the person, cargo, data, or ship component is already being hunted, and the forty-thousand-credit price forces the Driftrunner to protect it before knowing why.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'forty-thousand-blockade-threading',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The route itself is the danger: beacon windows, pirate tolls, Corporate Bloc patrols, or Remnant interdiction turn the forty-thousand-credit obligation into a running lane chase.',
    avoidModes: ['chamber_play', 'procedural_contest'],
  },
  {
    id: 'forty-thousand-crew-collateral',
    scenarioBias: 'protection',
    creativeAngle:
      'The debt, lien, or hold is tied to a crew member, ship system, license, or old favor; the paid route tests whether the Driftrunner protects shipboard trust or buys freedom by spending it.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'forty-thousand-black-channel',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The job opens a black-channel courier route used by smugglers, refugees, salvage crews, or AI cutouts; it is not a resistance network by default, but a route economy that survives by staying deniable.',
    avoidModes: ['siege', 'procedural_contest'],
  },
]

const SECOND_LIBRARY_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'second-library-murder-inquiry',
    scenarioBias: 'investigation',
    creativeAngle:
      'The suspicious death is the first playable pressure: contradictory witnesses, damaged notes, and the impossible claim that the scholar already knew the Seeker.',
    avoidModes: ['siege', 'revolt'],
  },
  {
    id: 'second-library-archive-custody',
    scenarioBias: 'procedural_contest',
    creativeAngle:
      'The second library exists first as an archive fight over notes, seals, charters, catalogue authority, publication rights, and who gets to name dangerous knowledge.',
    avoidModes: ['siege'],
  },
  {
    id: 'second-library-ruin-expedition',
    scenarioBias: 'extraction',
    creativeAngle:
      'The usable lead points into a ruin, sealed annex, or unstable magical site where the Seeker must recover an index, key, fragment, or witness before rivals or the site itself erase it.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'second-library-living-memory',
    scenarioBias: 'chamber_play',
    creativeAngle:
      'The first real lead is a living memory-keeper, witness, or academic rival whose room-bound testimony changes the meaning of the dead scholar\'s notes with every answer.',
    avoidModes: ['siege', 'public_crisis'],
  },
]

const BLACKOUT_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'blackout-dead-drop',
    scenarioBias: 'extraction',
    creativeAngle:
      'The blackout creates a live dead drop: a person, deck, shard, or access token is trapped inside the dark zone, and the PC name broadcast marks who is supposed to pick it up.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'blackout-trace-race',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The source jumps between cameras, local channels, devices, substations, and hijacked bodies; tracing it means moving through the city while heat follows the trace.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'blackout-shadow-mesh',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The blackout exposes a hidden resident mesh, runner collective, or anti-corp infrastructure layer that only survives while its nodes stay invisible.',
    avoidModes: ['siege'],
  },
  {
    id: 'blackout-street-panic',
    scenarioBias: 'public_crisis',
    creativeAngle:
      'The six-block blackout becomes a street-level survival crisis where the PC name broadcast makes every faction ask what the PC owes them.',
    avoidModes: ['chamber_play'],
  },
]

const CACHE_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'cache-waystation-heist',
    scenarioBias: 'extraction',
    creativeAngle:
      'The cache must be removed from beneath Church custody before patrol timing, Wasting symptoms, or hungry allies make stealth impossible.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'cache-lockdown',
    scenarioBias: 'siege',
    creativeAngle:
      'The waystation locks down around the buried secret, turning the cache into a pressure point between Church authority and outside hunger.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'cache-map-race',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The map, rival witnesses, patrol route, or buried proof keeps moving; the Scavenger must track the route before the Church edits it.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'cache-hungry-claimants',
    scenarioBias: 'protection',
    creativeAngle:
      'The cache can save a vulnerable group only if the PC protects the map, supplies, or witness from every faction with a claim.',
    avoidModes: ['procedural_contest'],
  },
]

const FIVE_NAMES_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'five-names-first-target',
    scenarioBias: 'protection',
    creativeAngle:
      'The first living name is in immediate danger, and keeping them alive matters more than getting a clean answer from them.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'five-names-probate-squeeze',
    scenarioBias: 'procedural_contest',
    creativeAngle:
      'The will, locked box, probate records, and official custody of the list become weapons before the street-level danger shows itself.',
    avoidModes: ['siege'],
  },
  {
    id: 'five-names-one-by-one',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The surviving names are disappearing, changing identities, or being moved through the city faster than the PI can interview them.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'five-names-closed-room',
    scenarioBias: 'chamber_play',
    creativeAngle:
      'The will reading, funeral, probate office, hotel room, or back-room meeting brings several list-adjacent people into one pressure space where everyone lies differently.',
    avoidModes: ['siege', 'public_crisis'],
  },
  {
    id: 'five-names-case-web',
    scenarioBias: 'investigation',
    creativeAngle:
      'The Methodical PI works the list as an evidence web: old files, aliases, alibis, debts, and case notes reveal why the dead woman trusted the PC.',
    avoidModes: ['siege', 'revolt'],
  },
]

export function selectArcVariantSeed(seed: AuthorInputSeed): Sf2ArcVariantSeed | undefined {
  if (seed.arcVariantSeed) return seed.arcVariantSeed
  const candidates = getArcVariantCandidates(seed)
  if (candidates.length === 0) return undefined
  return candidates[Math.floor(Math.random() * candidates.length)]
}
