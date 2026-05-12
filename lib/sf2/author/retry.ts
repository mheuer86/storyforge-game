import { getSf2GenreExamples } from '../genre-examples'

export const AUTHOR_DEFAULT_MAX_ATTEMPTS = 2

const SCENE_COUPLED_PRESSURE_LADDER_ERROR_RE =
  /pressure_ladder\[\d+\]\.trigger_condition is scene-coupled/
const OUTCOME_SPECTRUM_HUMAN_ANCHOR_ERROR_RE =
  /chapter_frame\.outcome_spectrum\.(?:clean|costly|failure|catastrophic) must name a human consequence/
const CONTINUATION_CONTRACT_ERROR_RE =
  /continuation_(?:moves|dramatic_turn)(?: is missing|(?:\.[\w_]+)+ is empty|.* requires )/
const PROCEDURE_GRAVITY_ERROR_RE = /^procedure_gravity: /
const TRANSITION_SEED_PROCEDURE_LEVERAGE_ERROR_RE =
  /transition_seed\.procedure_residue .+ marked leverage but continuation_dramatic_turn\.procedure_budget does not assign it to a pressure owner/

export function shouldRetryAuthorValidation(errors: string[]): boolean {
  return errors.some((error) =>
    SCENE_COUPLED_PRESSURE_LADDER_ERROR_RE.test(error) ||
    OUTCOME_SPECTRUM_HUMAN_ANCHOR_ERROR_RE.test(error) ||
    CONTINUATION_CONTRACT_ERROR_RE.test(error) ||
    PROCEDURE_GRAVITY_ERROR_RE.test(error) ||
    TRANSITION_SEED_PROCEDURE_LEVERAGE_ERROR_RE.test(error)
  )
}

export function buildAuthorRetryNudge(errors: string[], genreId?: string, hookTitle?: string): string {
  const pressureLadderSceneCoupled = errors.some((error) =>
    SCENE_COUPLED_PRESSURE_LADDER_ERROR_RE.test(error)
  )
  const outcomeSpectrumHumanAnchor = errors.some((error) =>
    OUTCOME_SPECTRUM_HUMAN_ANCHOR_ERROR_RE.test(error)
  )
  const continuationContract = errors.some((error) =>
    CONTINUATION_CONTRACT_ERROR_RE.test(error)
  )
  const procedureOwnerLeverage = errors.some((error) =>
    PROCEDURE_GRAVITY_ERROR_RE.test(error) ||
    TRANSITION_SEED_PROCEDURE_LEVERAGE_ERROR_RE.test(error)
  )
  const genreExamples = getSf2GenreExamples(genreId || 'generic')
  const goodTrigger = genreExamples.entityBoundTriggers[0]
  const badTrigger = genreExamples.sceneCoupledTriggers[0]

  const sceneCoupledGuidance = pressureLadderSceneCoupled
    ? `\n\nFor pressure_ladder scene-coupled trigger errors: rewrite the named rung's trigger_event. Use kind "entity_action" for entity-to-entity pressure and remove incidental rooms, doors, gates, bays, docks, terminals, consoles, desks, tables, thresholds, corridors, hangars, offices, booths, and other scene objects from actor_id, target_id, and stakes. Use kind "location_objective" only when the location is the durable objective anchor (for example, retrieving a package from a station), and then provide location_id. Bind ordinary triggers to entity-level action, choice, claim, refusal, disclosure, or faction move that can still happen after the scene changes. Good: "${goodTrigger}" Bad: "${badTrigger}"`
    : ''
  const outcomeSpectrumGuidance = outcomeSpectrumHumanAnchor
    ? `\n\nFor outcome_spectrum human-anchor errors: Rewrite only the invalid outcome tiers so every tier names a person, faction, relationship, or cost surface. Keep the chapter objective and the tier order. Use these meanings: clean: who remains safe, trusted, loyal, free, or still willing to help; costly: who cools, becomes owed, loses standing, or charges a price; failure: who is exposed, hunted, burned, betrayed, or made unsafe; catastrophic: what relationship, registry, sanctuary, or protection breaks open permanently. ${outcomeSpectrumExample(genreId, hookTitle)}`
    : ''
  const continuationGuidance = continuationContract
    ? `\n\nFor continuation contract errors: Chapter 2+ requires complete continuation_moves and continuation_dramatic_turn blocks. Fill every required continuation_moves subfield with specific prior-chapter meaning, scale escalation, named threat, worsened thread detail, and planted revelation. Fill continuation_dramatic_turn as the playable turn: prior meaning, larger pattern, named pressure_owner, human leverage, worsened detail, offscreen antagonist pressure, and procedure_budget.`
    : ''
  const procedureOwnerGuidance = procedureOwnerLeverage
    ? `\n\nFor procedure_residue/procedure_gravity errors: if procedure_residue.keepAs is "leverage", the mechanism must resolve to continuation_dramatic_turn.pressure_owner.id_or_new_bridge or another named person/faction/institution in procedure_budget.owner_using_it. Do not leave owner_using_it as "none", a timer, a readout, a gate, or an abstract system. State how that named owner uses the mechanism to take/offer something or force an irreversible choice.`
    : ''

  return `Your previous tool call was invalid. Repair these exact issues:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\nRe-emit \`author_chapter_setup\` now with EVERY required field filled with substantive, non-empty content. For continuation_dramatic_turn/procedure_gravity errors, make the next chapter's first pressure a person/faction/institution using leverage; any mechanism, timer, readout, query, or access gate must have an owner and occupy at most one opening beat.${sceneCoupledGuidance}${outcomeSpectrumGuidance}${continuationGuidance}${procedureOwnerGuidance}\n\nStay inside the field-length budgets; compact complete output is preferred over exhaustive prose. The full chapter setup must come back in this single tool call.`
}

function outcomeSpectrumExample(genreId?: string, hookTitle?: string): string {
  if (genreId === 'space-opera' && hookTitle === 'The Defector') {
    return 'Defector example: clean "The passenger still trusts you; the safe-harbor contact keeps the channel open." failure "The defector is exposed; the corvette knows who sheltered her."'
  }
  if (genreId === 'space-opera') {
    return 'Space Opera example: clean "The client still trusts the PC; the broker keeps the channel open." failure "The pursuer has the PC\'s transponder; the safe route is burned."'
  }
  return 'Example: clean "Laine still trusts the PC; the witness remains safe." failure "Vasek has the PC\'s name; Sable\'s contact is burned."'
}
