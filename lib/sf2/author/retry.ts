export function buildAuthorRetryNudge(errors: string[]): string {
  const pressureLadderSceneCoupled = errors.some((error) =>
    /pressure_ladder\[\d+\]\.trigger_condition is scene-coupled/.test(error)
  )

  const sceneCoupledGuidance = pressureLadderSceneCoupled
    ? `\n\nFor pressure_ladder scene-coupled trigger errors: rewrite the named rung's trigger_condition only. Do not mention places, rooms, doors, gates, bays, docks, terminals, consoles, desks, tables, thresholds, corridors, hangars, offices, booths, or other scene objects. Bind the trigger to an entity-level action, choice, claim, refusal, disclosure, or faction move that can still happen after the scene changes. Good: "Sollar formally marks the PC's route evasive." Bad: "The route gate locks behind the PC."`
    : ''

  return `Your previous tool call was invalid. Repair these exact issues:\n${errors.map((e) => `  - ${e}`).join('\n')}\n\nRe-emit \`author_chapter_setup\` now with EVERY required field filled with substantive, non-empty content. For continuation_dramatic_turn/procedure_gravity errors, make the next chapter's first pressure a person/faction/institution using leverage; any mechanism, timer, readout, query, route choice, or access gate must have an owner and occupy at most one opening beat. For SF2B continuity_lock errors, preserve the locked ids/facts exactly: bridge closing geometry in opening_scene_spec, mention locked continuity facets, and set carried tension_score lines only to source ids listed in the continuity lock. New NPCs or new pressures must use carried=false.${sceneCoupledGuidance}\n\nStay inside the field-length budgets; compact complete output is preferred over exhaustive prose. The full chapter setup must come back in this single tool call.`
}
