import type { AuthorInputSeed } from '../types'

export type Sf2ArcVariantSeed = NonNullable<AuthorInputSeed['arcVariantSeed']>

export function getArcVariantCandidates(seed: AuthorInputSeed): Sf2ArcVariantSeed[] {
  if (seed.hook.title === 'The Tithe') return TITHE_VARIANTS
  if (seed.hook.title === 'Forty Thousand') return FORTY_THOUSAND_VARIANTS
  if (seed.hook.title === 'The Defector') return DEFECTOR_VARIANTS
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
    creativeAngle:
      'The shortage has become a public legitimacy crisis before the PC arrives because someone named refuses to let replacement selection proceed.',
    avoidModes: ['investigation', 'chamber_play'],
  },
  {
    id: 'tithe-protection',
    scenarioBias: 'protection',
    creativeAngle:
      "One protected person is the shortage's living fulcrum; the PC's authority makes them responsible for preventing replacement selection without openly defying the Synod.",
    avoidModes: ['investigation', 'chamber_play'],
  },
  {
    id: 'tithe-pursuit',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The missing tithe has already moved; the playable arc follows who moved them, who paid for the route, and whose jurisdiction will break first.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'tithe-underground',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The shortage exposes a hidden Undrift route that moves Resonants and children beyond official allocation, with a handler close enough to threaten or bargain with.',
    avoidModes: ['procedural_contest', 'chamber_play'],
  },
  {
    id: 'tithe-superior-fallout',
    scenarioBias: 'superior_fallout',
    creativeAngle:
      "A Synod or Imperial superior is pulling the shortage tight from above; the arc tests whether the PC contains, enforces, or exposes the engineered fallout.",
    avoidModes: ['investigation'],
  },
]

const FORTY_THOUSAND_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'forty-thousand-smuggler-run',
    scenarioBias: 'extraction',
    creativeAngle:
      'The back-channel offer is an off-book run through deniable brokers, blind route chits, patrol lanes, or blockade gaps; the forty thousand buys survival only if the PC keeps a person, cargo, or data packet protected while looking for a way to use the broker back.',
    avoidModes: ['chamber_play', 'procedural_contest'],
  },
  {
    id: 'forty-thousand-hot-cargo',
    scenarioBias: 'protection',
    creativeAngle:
      'The job is already hot: the person, cargo, data, or ship component is being hunted, and the forty-thousand-credit price was chosen because the broker knows the PC is too cornered to ask enough questions.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'forty-thousand-blockade-threading',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The job forces a running lane chase through beacon windows, pirate tolls, Corporate Bloc patrols, or Remnant interdiction; every obstacle belongs to someone who thinks the PC is exploitable.',
    avoidModes: ['chamber_play', 'procedural_contest'],
  },
  {
    id: 'forty-thousand-crew-collateral',
    scenarioBias: 'protection',
    creativeAngle:
      'The debt is tied to a crew member, ship system, license, or old favor; the paid job tests whether the PC protects shipboard trust or buys freedom by spending someone close.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'forty-thousand-black-channel',
    scenarioBias: 'underground_network',
    creativeAngle:
      'The job opens a black-channel route economy used by smugglers, refugees, salvage crews, or AI cutouts; the route survives by using desperate carriers, and the PC has to decide whether to become prey, partner, or predator.',
    avoidModes: ['siege', 'procedural_contest'],
  },
]

const DEFECTOR_VARIANTS: Sf2ArcVariantSeed[] = [
  {
    id: 'defector-hot-pursuit',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The corvette is close enough that every maneuver risks exposing the passenger, burning crew loyalty, or giving pursuit leverage over someone aboard.',
    avoidModes: ['chamber_play'],
  },
  {
    id: 'defector-safe-harbor',
    scenarioBias: 'protection',
    creativeAngle:
      'The playable pressure is who will shelter the defector and what relationship, favor, or reputation cost makes that sanctuary real.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'defector-compromised-beacons',
    scenarioBias: 'investigation',
    creativeAngle:
      'The data matters because it names people inside the beacon network; the first chapter makes testimony, trust, and survivor risk collide.',
    avoidModes: ['siege'],
  },
  {
    id: 'defector-shipboard-trust',
    scenarioBias: 'chamber_play',
    creativeAngle:
      'The defector is already aboard or nearly aboard, and the sharpest pressure is whether the crew believes her before pursuit forces a decision.',
    avoidModes: ['public_crisis'],
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
    scenarioBias: 'chamber_play',
    creativeAngle:
      'The second library exists first as a human archive fight: notes, seals, charters, and catalogue authority become weapons in the hands of scholars, patrons, or witnesses trying to control who gets to name dangerous knowledge.',
    avoidModes: ['procedural_contest', 'siege'],
  },
  {
    id: 'second-library-ruin-expedition',
    scenarioBias: 'extraction',
    creativeAngle:
      'The usable lead points into a ruin, sealed annex, or unstable magical site where rivals, witnesses, and the site itself force the Seeker to decide who can inherit the first proof before it is erased or claimed.',
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
    scenarioBias: 'protection',
    creativeAngle:
      'The waystation cache is living leverage: Church custody, hungry allies, Wasting symptoms, and patrol pressure all force the Scavenger to decide who gets fed, exposed, or protected.',
    avoidModes: ['procedural_contest', 'chamber_play'],
  },
  {
    id: 'cache-lockdown',
    scenarioBias: 'public_crisis',
    creativeAngle:
      'The waystation locks down around the buried secret, turning Church authority and outside hunger against each other while people argue over whether the cache is food, evidence, or contamination.',
    avoidModes: ['procedural_contest'],
  },
  {
    id: 'cache-map-race',
    scenarioBias: 'pursuit',
    creativeAngle:
      'The map, rival witnesses, patrol claims, or buried proof keeps moving; the Scavenger must follow the pressure before the Church edits it.',
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
    scenarioBias: 'chamber_play',
    creativeAngle:
      'The will, locked box, probate records, and official custody of the list become weapons in living hands: executor, cops, heirs, or list-adjacent people use procedure to pressure the PI before street-level danger shows itself.',
    avoidModes: ['procedural_contest', 'siege'],
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
      'The Methodical PI works the list as a social evidence web: old files, aliases, alibis, debts, and case notes point to why the dead woman trusted the PC.',
    avoidModes: ['siege', 'revolt'],
  },
]

export function selectArcVariantSeed(seed: AuthorInputSeed): Sf2ArcVariantSeed | undefined {
  if (seed.arcVariantSeed) return seed.arcVariantSeed
  const candidates = getArcVariantCandidates(seed)
  if (candidates.length === 0) return undefined
  return candidates[Math.floor(Math.random() * candidates.length)]
}
