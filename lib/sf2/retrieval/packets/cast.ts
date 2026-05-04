import type {
  Sf2DispositionTier,
  Sf2EmotionalBeatTag,
  Sf2EntityId,
  Sf2Npc,
  Sf2PresentCastPacket,
  Sf2State,
  Sf2TempLoadTag,
  Sf2WorkingSet,
} from '../../types'

// Window for player-framing detection. Matches Q3 lean from the NPC
// state-bound rendering shaping zettel.
const FRAMING_WINDOW_TURNS = 5

// Dormancy threshold. Exported so scene-packet's render path can read the
// same value instead of duplicating the magic number.
export const DORMANT_TURN_THRESHOLD = 10

// Phase 5 — beat lookback for behavioral-contract derivation. A `near_confession`
// older than this window stops carrying the "won't repeat without escalation"
// rule. Three turns matches the doc's lean and keeps the rule local to the
// scene where the beat actually landed.
const BEAT_LOOKBACK_TURNS = 3

// Phase 1 — static tier→imperative lookup. Phase 3 layers tempLoadTag
// modulation on top (TEMP_LOAD_MODULATIONS below). Phase 5 (per the shaping
// zettel) adds the full behavioral contract (default posture, will share,
// will not, if pressured) derived from tier + agenda + recent beats +
// tempLoadTag. Strings are intentionally compact: the per-turn block renders
// these for every on-stage NPC and pays for verbosity in tokens.
const DISPOSITION_IMPERATIVES: Record<
  Sf2DispositionTier,
  { voiceImperative: string; behavioralContract: string; prohibitions: string[] }
> = {
  hostile: {
    voiceImperative: 'COLD, ADVERSARIAL, HIGH PROCEDURAL DISTANCE',
    behavioralContract: 'blocks, withholds, treats PC as threat',
    prohibitions: ['no volunteered intimacy', 'no warmth-as-cooperation', 'no help without leverage'],
  },
  wary: {
    voiceImperative: 'GUARDED, MEASURED, CONDITIONAL TRUST',
    behavioralContract: 'narrow answers; cooperates only when pressure justifies',
    prohibitions: ['no volunteered secrets', 'no assumed good faith', 'no easy-warmth-as-trust'],
  },
  neutral: {
    voiceImperative: 'EVEN, PRACTICAL, LOW PERSONAL INVESTMENT',
    behavioralContract: 'responds to situation; withholds costly info',
    prohibitions: ['not loyal', 'not suspicious without trigger', 'no over-personalizing'],
  },
  favorable: {
    voiceImperative: 'OPEN, HELPFUL, MODERATE PROCEDURAL DISTANCE',
    behavioralContract: 'helps within limits; assumes PC acts in good faith',
    prohibitions: ['not guarded', 'no withholding routine help', 'no caginess without state event'],
  },
  trusted: {
    voiceImperative: 'WARM, PLAIN, LOW PROCEDURAL DISTANCE',
    behavioralContract: 'volunteers context; names allies; helps actively',
    prohibitions: ['not guarded', 'not formally distant', 'no caginess without state event'],
  },
}

// Phase 3 — transient state modulations layered on top of the base imperative.
// Tags are emitted by the archivist (lib/sf2/archivist/tools.ts) as
// `temp_load_tag` and normalized to `tempLoadTag` on the Npc in apply-patch.
// They do NOT replace disposition; they bend it. A trusted NPC under
// `uneasy_under_scrutiny` still volunteers context, but with visible
// reservation. A favorable NPC who is `betrayed` cannot snap to hostile
// without a disposition write — but the imperative tells the narrator to
// render withdrawal, not warmth, while the tag is set.
const TEMP_LOAD_MODULATIONS: Record<
  Sf2TempLoadTag,
  { contractAddendum: string; prohibitions: string[] }
> = {
  uneasy_under_scrutiny: {
    contractAddendum: 'guarded notes are allowed; narrate as visible reservation, not as tier change',
    prohibitions: ['no smooth confidence', 'no easy reassurance to PC'],
  },
  vulnerable: {
    contractAddendum: 'soft underneath; honesty surfaces in small admissions, not speeches',
    prohibitions: ['no posturing', 'no deflection through procedure'],
  },
  betrayed: {
    contractAddendum: 'withdrawn; cooperates only on procedure, refuses personal warmth',
    prohibitions: ['no volunteered intimacy', 'no easy forgiveness without state event'],
  },
  exhausted: {
    contractAddendum: 'short answers; one beat per exchange, no long disclosure',
    prohibitions: ['no extended monologue', 'no repeating prior confession'],
  },
  cornered: {
    contractAddendum: 'binary stance — either holds or breaks; nothing in between',
    prohibitions: ['no measured middle ground', 'no graceful redirect'],
  },
}

// Phase 5 — full behavioral contract per tier. Pairs with the imperative
// table above; the imperative is the headline, this is the breakdown the
// narrator reads when deciding what an NPC will and won't say in the moment.
// Each tier defines a default posture (relational stance toward the PC) and
// the will/will-not lists that shape disclosure under no special pressure.
// Beat-driven and tempLoadTag-driven shifts are layered on top in
// deriveBehavioralContract().
const TIER_CONTRACT_DEFAULTS: Record<
  Sf2DispositionTier,
  {
    defaultPosture: string
    willShare: string[]
    willNot: string[]
  }
> = {
  hostile: {
    defaultPosture: 'guards self; treats PC as threat',
    willShare: [],
    willNot: ['anything strategic without leverage', 'personal context'],
  },
  wary: {
    defaultPosture: 'measures PC; conditional cooperation',
    willShare: ['public-record context'],
    willNot: ['secrets', 'allies', 'personal worry'],
  },
  neutral: {
    defaultPosture: 'professional; no investment',
    willShare: ['routine information'],
    willNot: ['costly information without reason'],
  },
  favorable: {
    defaultPosture: 'assumes PC acts in good faith',
    willShare: ['operational concerns', 'shared judgments'],
    willNot: ['undisclosed allies without ask'],
  },
  trusted: {
    defaultPosture: 'assumes PC is acting in good faith',
    willShare: ['operational concerns', 'personal worry', 'limited faction doubt'],
    willNot: ['become cagey without a new state event'],
  },
}

export function buildPresentCastPackets(
  state: Sf2State,
  workingSet: Sf2WorkingSet
): Sf2PresentCastPacket[] {
  const presentIds = new Set(state.world.sceneSnapshot.presentNpcIds)
  // Include any NPCs in the working-set full bucket that are on-stage.
  for (const id of workingSet.fullEntityIds) {
    const npc = state.campaign.npcs[id]
    if (npc && presentIds.has(id)) presentIds.add(id)
  }

  const currentTurn = state.history.turns.length

  return [...presentIds]
    .map((id) => state.campaign.npcs[id])
    .filter((n): n is NonNullable<typeof n> => Boolean(n))
    .map((npc) => {
      const turnsAbsent =
        npc.lastSeenTurn !== undefined && currentTurn > npc.lastSeenTurn
          ? currentTurn - npc.lastSeenTurn
          : undefined
      const imperative = deriveDispositionImperative(
        npc.disposition,
        recentlyFramedByPlayer(state, npc),
        turnsAbsent,
        npc.tempLoadTag
      )
      const recentBeatTags = recentBeatTagsFor(state, npc.id, currentTurn)
      const contract = deriveBehavioralContract({
        tier: npc.disposition,
        agenda: npc.agenda,
        tempLoadTag: npc.tempLoadTag,
        recentBeatTags,
      })
      return {
        npcId: npc.id,
        name: npc.name,
        affiliation: npc.affiliation,
        pronoun: npc.identity.pronoun,
        age: npc.identity.age,
        disposition: npc.disposition,
        tempLoadTag: npc.tempLoadTag,
        voice: npc.identity.voice.note,
        voiceImperative: imperative.voiceImperative,
        behavioralContract: imperative.behavioralContract,
        defaultPosture: contract.defaultPosture,
        willShare: contract.willShare,
        willNot: contract.willNot,
        ifPressured: contract.ifPressured,
        prohibitions: imperative.prohibitions,
        currentRead: deriveCurrentRead(npc),
        relationToPlayer: deriveRelationToPlayer(npc),
        activePressure: deriveActivePressure(npc),
        turnsAbsent,
      }
    })
}

function deriveDispositionImperative(
  disposition: Sf2DispositionTier,
  recentlyFramed: boolean,
  turnsAbsent: number | undefined,
  tempLoadTag: Sf2TempLoadTag | undefined
): { voiceImperative: string; behavioralContract: string; prohibitions: string[] } {
  const base = DISPOSITION_IMPERATIVES[disposition]
  const contractParts: string[] = [base.behavioralContract]
  const prohibitions = [...base.prohibitions]
  // Phase 3 — tempLoadTag bends the imperative without changing tier. Layered
  // before framing/dormancy so transient-state addenda sit next to the base
  // contract, with situational addenda after.
  if (tempLoadTag !== undefined) {
    const mod = TEMP_LOAD_MODULATIONS[tempLoadTag]
    contractParts.push(`temp: ${tempLoadTag.replace(/_/g, ' ')} — ${mod.contractAddendum}`)
    prohibitions.push(...mod.prohibitions)
  }
  if (recentlyFramed) {
    contractParts.push('recently framed by player — continue, do not reintroduce')
    prohibitions.push('no first-encounter template')
  }
  if (turnsAbsent !== undefined && turnsAbsent >= DORMANT_TURN_THRESHOLD) {
    contractParts.push(`dormant ${turnsAbsent}t — re-establish via one present-tense detail`)
    prohibitions.push('no wiki-paragraph reintroduction')
  }
  return {
    voiceImperative: base.voiceImperative,
    behavioralContract: contractParts.join('; '),
    prohibitions,
  }
}

// Match player-input substrings against NPC name, role, and affiliation tokens
// within the recent framing window. Affiliation tokenization covers the
// "Officer Aul" / "the warden" pattern by splitting strings like
// "Imperial Warden" into matchable tokens.
function recentlyFramedByPlayer(state: Sf2State, npc: Sf2Npc): boolean {
  const affiliationTokens = (npc.affiliation ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4)
  const roleTokens = (npc.role ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4)
  const name = (npc.name ?? '').toLowerCase().trim()
  const role = (npc.role ?? '').toLowerCase().trim()
  const terms = [name, role, ...roleTokens, ...affiliationTokens].filter((s) => s.length >= 3)
  if (terms.length === 0) return false
  return state.history.turns.slice(-FRAMING_WINDOW_TURNS).some((turn) => {
    const input = (turn.playerInput ?? '').toLowerCase()
    return terms.some((term) => input.includes(term))
  })
}

function deriveCurrentRead(npc: {
  disposition: string
  identity: { vulnerability?: string }
  agenda?: { currentMove: string }
}): string {
  if (npc.agenda?.currentMove) return npc.agenda.currentMove
  return npc.disposition
}

function deriveRelationToPlayer(npc: {
  disposition: string
  affiliation: string
}): string {
  return `${npc.affiliation} · ${npc.disposition}`
}

function deriveActivePressure(npc: {
  agenda?: { pursuing: string }
  disposition: string
}): string {
  if (npc.agenda?.pursuing) return npc.agenda.pursuing
  return ''
}

// Phase 5 — recent beat tags for an NPC, scoped to the lookback window. Reads
// state.campaign.beats (not history.turns); beats are how the archivist marks
// emotional events that the contract derivation needs to see (`near_confession`
// shifts willShare; `intimidation_failed` shifts ifPressured). 'pc' beats
// where the NPC is not a participant are correctly excluded by the
// participants check.
function recentBeatTagsFor(
  state: Sf2State,
  npcId: Sf2EntityId,
  currentTurn: number
): Set<Sf2EmotionalBeatTag> {
  const tags = new Set<Sf2EmotionalBeatTag>()
  const beats = state.campaign.beats ?? {}
  for (const beat of Object.values(beats)) {
    if (!beat.participants.includes(npcId)) continue
    if (currentTurn - beat.turn > BEAT_LOOKBACK_TURNS) continue
    for (const tag of beat.emotionalTags) tags.add(tag)
  }
  return tags
}

// Derives the four-line behavioral contract surfaced under the imperative.
// Tier defaults set the baseline; recent beats and tempLoadTag layer on top.
// Beat-driven rules:
//   - `near_confession` in window: any 'personal worry' entry in willShare
//     moves to willNot as "already shared, won't repeat without escalation."
//   - `intimidation_failed` in window: adds "open displays of pressure" to
//     willNot — the NPC has already refused that lever once.
// tempLoadTag drives ifPressured directly; in its absence, tier supplies a
// default escalation pattern.
function deriveBehavioralContract(input: {
  tier: Sf2DispositionTier
  agenda: Sf2Npc['agenda']
  tempLoadTag: Sf2TempLoadTag | undefined
  recentBeatTags: Set<Sf2EmotionalBeatTag>
}): {
  defaultPosture: string
  willShare: string[]
  willNot: string[]
  ifPressured: string
} {
  const base = TIER_CONTRACT_DEFAULTS[input.tier]
  const willShare = [...base.willShare]
  const willNot = [...base.willNot]
  // Default posture is tier-driven; agenda.pursuing colors it when present.
  const defaultPosture = input.agenda?.pursuing
    ? `${base.defaultPosture} (pursuing: ${input.agenda.pursuing})`
    : base.defaultPosture
  // Beat-driven shifts.
  if (input.recentBeatTags.has('near_confession')) {
    const idx = willShare.indexOf('personal worry')
    if (idx >= 0) {
      willShare.splice(idx, 1)
      willNot.push('personal worry — already shared, won\'t repeat without escalation')
    }
  }
  if (input.recentBeatTags.has('intimidation_failed')) {
    willNot.push('responding to repeat displays of pressure')
  }
  if (input.recentBeatTags.has('cost_accepted')) {
    willShare.push('the cost just paid (in context, not as exposition)')
  }
  return {
    defaultPosture,
    willShare,
    willNot,
    ifPressured: deriveIfPressured(input.tier, input.tempLoadTag, input.recentBeatTags),
  }
}

// Escalation gradient. The interesting cases are tempLoadTag + beat
// combinations; the no-tag fallback hands a relationship-aware default to the
// narrator so the field is never empty.
function deriveIfPressured(
  tier: Sf2DispositionTier,
  tag: Sf2TempLoadTag | undefined,
  beats: Set<Sf2EmotionalBeatTag>
): string {
  if (tag === 'vulnerable' && beats.has('cost_accepted')) {
    return 'hurt first, defensive second'
  }
  if (tag === 'betrayed' && beats.has('intimidation_failed')) {
    return 'shut down, refuse procedure'
  }
  if (tag === 'cornered') return 'binary: holds or breaks; no middle ground'
  if (tag === 'exhausted') return 'truncated reactivity; no escalation match'
  if (tag === 'uneasy_under_scrutiny') return 'composed under pressure but visibly tighter'
  if (tag === 'vulnerable') return 'softens before defending'
  if (tag === 'betrayed') return 'withdrawal first; refusal second'
  if (tier === 'hostile' || tier === 'wary') return 'meets pressure with pressure'
  return 'protects the relationship; refuses without snapping to hostility'
}
