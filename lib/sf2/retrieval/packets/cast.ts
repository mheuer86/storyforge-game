import type {
  Sf2DispositionTier,
  Sf2Npc,
  Sf2PresentCastPacket,
  Sf2State,
  Sf2WorkingSet,
} from '../../types'

// Window for player-framing detection. Matches Q3 lean from the NPC
// state-bound rendering shaping zettel.
const FRAMING_WINDOW_TURNS = 5

// Dormancy threshold. Exported so scene-packet's render path can read the
// same value instead of duplicating the magic number.
export const DORMANT_TURN_THRESHOLD = 10

// Phase 1 — static tier→imperative lookup. Phase 5 (per the shaping zettel)
// adds temp_load + recent-beats modulation to derive the full behavioral
// contract (default posture, will share, will not, if pressured). Static
// table is the minimum viable form; expand once temp_load vocabulary is
// settled. Strings are intentionally compact: the per-turn block renders
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
        turnsAbsent
      )
      return {
        npcId: npc.id,
        name: npc.name,
        affiliation: npc.affiliation,
        pronoun: npc.identity.pronoun,
        age: npc.identity.age,
        disposition: npc.disposition,
        voice: npc.identity.voice.note,
        voiceImperative: imperative.voiceImperative,
        behavioralContract: imperative.behavioralContract,
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
  turnsAbsent: number | undefined
): { voiceImperative: string; behavioralContract: string; prohibitions: string[] } {
  const base = DISPOSITION_IMPERATIVES[disposition]
  const contractParts: string[] = [base.behavioralContract]
  const prohibitions = [...base.prohibitions]
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

// Match player-input substrings against NPC name + affiliation tokens within
// the recent framing window. Drops `npc.role` because that's a category enum
// (`'crew' | 'contact' | 'npc'`), not a job role players address NPCs by.
// Affiliation tokenization covers the "Officer Aul" / "the warden" pattern
// by splitting strings like "Imperial Warden" into matchable tokens.
function recentlyFramedByPlayer(state: Sf2State, npc: Sf2Npc): boolean {
  const affiliationTokens = (npc.affiliation ?? '')
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 4)
  const name = (npc.name ?? '').toLowerCase().trim()
  const terms = [name, ...affiliationTokens].filter((s) => s.length >= 3)
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
