// Build a Sf2NarratorScenePacket from state + working set.
// Pure function. Runs on every Narrator turn.

import type {
  Sf2NarratorScenePacket,
  Sf2SceneLocationPacket,
  Sf2State,
  Sf2TemporalAnchorPacket,
  Sf2WorkingSet,
} from '../types'
import { resolvePlayerAction } from '../action-resolver/resolve'
import { computePacingAdvisory, renderPacingAdvisories } from '../pacing/signals'
import { buildChapterPacket } from './packets/chapter'
import { buildMechanicsPacket } from './packets/mechanics'
import { buildPlayerPacket } from './packets/player'
import { DORMANT_TURN_THRESHOLD, buildPresentCastPackets } from './packets/cast'
import { buildRecentContextPacket } from './packets/recent-context'
import { buildThreadPackets } from './packets/tensions'
import { buildWorkingSet } from './working-set'

export function buildScenePacket(
  state: Sf2State,
  playerInput: string,
  turnIndex: number
): { packet: Sf2NarratorScenePacket; workingSet: Sf2WorkingSet; advisoryText: string } {
  const workingSet = buildWorkingSet(state, playerInput, turnIndex)
  const resolvedAction = resolvePlayerAction(state, playerInput)

  const sceneLocation: Sf2SceneLocationPacket = {
    id: state.world.currentLocation.id,
    name: state.world.currentLocation.name,
    description: state.world.currentLocation.description,
    atmosphericConditions: state.world.currentLocation.atmosphericConditions ?? [],
  }

  const packet: Sf2NarratorScenePacket = {
    scene: {
      sceneId: state.world.sceneSnapshot.sceneId,
      chapterNumber: state.chapter.number,
      chapterTitle: state.chapter.title,
      location: sceneLocation,
      timeLabel: state.world.currentTimeLabel,
      sceneIntent: deriveSceneIntent(state),
    },
    player: buildPlayerPacket(state),
    cast: buildPresentCastPackets(state, workingSet),
    tensions: buildThreadPackets(state, workingSet),
    emotionalBeats: buildEmotionalBeatPackets(state, workingSet),
    revelationProgress: buildRevelationProgressPackets(state),
    temporalAnchors: buildTemporalAnchorPackets(state),
    chapter: buildChapterPacket(state),
    mechanics: buildMechanicsPacket(state),
    recentContext: buildRecentContextPacket(state),
    pacing: computePacingAdvisory(state),
    playerInput: { text: playerInput, inferredIntent: '', resolvedAction },
  }

  const advisoryText = renderPacingAdvisories(packet.pacing, state)

  return { packet, workingSet, advisoryText }
}

function deriveSceneIntent(state: Sf2State): string {
  if (state.history.turns.length === 0) {
    return state.chapter.artifacts.opening.sceneIntent
  }
  return ''
}

// Render the stable portion of the scene packet — the pre-fetch bundle. This
// is what gets cached at scene open and reused across the scene's turns.
// Excludes mutable fields: disposition, tempLoad, thread tension, PC
// mechanical state, pacing advisories, recent context, player input.
export function renderSceneBundle(
  packet: Sf2NarratorScenePacket,
  state: Sf2State
): string {
  const lines: string[] = []

  lines.push(
    `## Scene opening — chapter ${packet.scene.chapterNumber}: ${packet.scene.chapterTitle} · ${packet.scene.sceneId}`
  )

  lines.push(`\n### Scene`)
  lines.push(`- Location: ${packet.scene.location.name} — ${packet.scene.location.description}`)
  if (packet.scene.location.atmosphericConditions.length > 0) {
    lines.push(`- Atmosphere: ${packet.scene.location.atmosphericConditions.join(', ')}`)
  }
  if (packet.scene.sceneIntent) lines.push(`- Intent: ${packet.scene.sceneIntent}`)

  lines.push(`\n### Chapter`)
  lines.push(`- Objective: ${packet.chapter.objective}`)
  lines.push(`- Crucible: ${packet.chapter.crucible}`)
  if (packet.chapter.currentPressureFace) {
    lines.push(`- Pressure face (at scene open): ${packet.chapter.currentPressureFace}`)
  }
  if (packet.chapter.currentPressureStep) {
    lines.push(
      `- Pressure step: "${packet.chapter.currentPressureStep.pressure}" (${packet.chapter.currentPressureStep.narrativeEffect})`
    )
  }
  if (packet.chapter.arc) {
    lines.push(`- Arc: ${packet.chapter.arc.title} — scenario shape for GM use: ${packet.chapter.arc.scenario} (do not use this label as diegetic wording)`)
    lines.push(`- Arc question: ${packet.chapter.arc.question}`)
    if (packet.chapter.arc.chapterFunction) {
      lines.push(`- Chapter function: ${packet.chapter.arc.chapterFunction}`)
    }
    if (packet.chapter.arc.activePressureEngines.length > 0) {
      lines.push(`- Active pressure engines: ${packet.chapter.arc.activePressureEngines.join(' | ')}`)
    }
  }
  if (packet.chapter.pacingContract) {
    const p = packet.chapter.pacingContract
    lines.push(`- Pacing target: resolve "${p.chapterQuestion}" in ${p.targetTurns.min}-${p.targetTurns.max} turns`)
  }

  if (packet.cast.length > 0) {
    lines.push(`\n### Cast on-stage (identity — stable within scene)`)
    for (const c of packet.cast) {
      const dormancy =
        c.turnsAbsent !== undefined && c.turnsAbsent >= DORMANT_TURN_THRESHOLD
          ? ` · **dormant ${c.turnsAbsent} turns — re-establish on re-encounter**`
          : ''
      lines.push(`- **${c.name}** (${c.npcId}) — ${c.affiliation}${dormancy}`)
      lines.push(`  voice: ${c.voice}`)
      lines.push(`  relation: ${c.relationToPlayer}`)
    }
    lines.push(
      `\nMutable state (disposition, tempLoad, agenda) is provided fresh each turn in the per-turn block — do not treat identity and mutable state as the same.`
    )
  }

  // Off-stage chapter cast — NPCs authored for this chapter (or carried over
  // from prior chapters with live narrative weight) who are NOT currently
  // on-stage. Surfaces them to the Narrator so when the player pursues a role
  // the Author defined, the Narrator uses the authored id/name instead of
  // inventing a parallel character.
  const offstageCast = buildOffstageCast(state, packet)
  if (offstageCast.length > 0) {
    lines.push(`\n### Chapter cast — off-stage (authored for this chapter)`)
    lines.push(
      `These NPCs exist in the chapter but are not on-stage right now. When the player pursues one of these roles, or the fiction calls for one of them to come into scene, use the authored id and name — do NOT invent a parallel character. Invent new NPCs only when no entry below fits the fiction's needs.`
    )
    for (const n of offstageCast) {
      lines.push(`- **${n.name}** (${n.id}) — ${n.affiliation}${n.role ? ` · ${n.role}` : ''}${n.retrievalCue ? ` — ${n.retrievalCue}` : ''}`)
    }
  }

  if (packet.tensions.length > 0) {
    lines.push(`\n### Threads in scope (identity — stable within scene)`)
    for (const t of packet.tensions) {
      lines.push(`- **${t.title}** (${t.threadId})`)
      lines.push(`  why: ${t.localWhyItMatters}`)
      lines.push(`  owner: ${t.ownerSummary}`)
      if (t.deterioration) lines.push(`  deterioration: ${t.deterioration}`)
      if (t.anchoredDecisions.length > 0) {
        lines.push(`  decisions: ${t.anchoredDecisions.map((d) => d.summary).join(' | ')}`)
      }
      if (t.anchoredPromises.length > 0) {
        lines.push(`  promises: ${t.anchoredPromises.map((p) => p.obligation).join(' | ')}`)
      }
      if (t.anchoredClues.length > 0) {
        lines.push(`  clues: ${t.anchoredClues.map((c) => c.content.slice(0, 100)).join(' | ')}`)
      }
    }
    lines.push(
      `\nTension values shift turn-by-turn — they're provided in the per-turn block, not here.`
    )
  }

  if (packet.temporalAnchors.length > 0) {
    lines.push(`\n### Timeline anchors (canonical time facts)`)
    for (const a of packet.temporalAnchors) {
      lines.push(`- ${a.label} (${a.anchorId}, ${a.kind}, ${a.status}) — ${a.anchorText}`)
    }
  }

  // Prior scene summary at scene open (if we just transitioned from one).
  const lastSummary = state.chapter.sceneSummaries.at(-1)
  if (lastSummary) {
    lines.push(`\n### Prior scene`)
    lines.push(`- ${lastSummary.summary}${lastSummary.leadsTo ? ` (leads_to: ${lastSummary.leadsTo})` : ''}`)
  }

  // Campaign lexicon — grows slowly; acceptable to cache at scene level.
  const lexicon = state.campaign.lexicon ?? []
  if (lexicon.length > 0) {
    const recent = lexicon.slice(-8)
    lines.push(`\n### Campaign lexicon (canon phrases — reuse when they fit)`)
    for (const e of recent) lines.push(`- "${e.phrase}" — ${e.register}`)
  }

  return lines.join('\n')
}

// Render the mutable portion — changes every turn. Goes in the per-turn user
// message at BP4 (uncached). Kept thin: mechanical state, current mutable
// reads on cast + threads, active pacing advisories, pending resolution.
export function renderPerTurnDelta(
  packet: Sf2NarratorScenePacket,
  opts: {
    advisoryText: string
    isInitial: boolean
    playerInput: string
    // Canonical facts held off-page at opening — only meaningful when isInitial is true.
    withheldPremiseFacts?: string[]
  }
): string {
  const lines: string[] = []

  lines.push(`## Current turn — mutable state`)

  lines.push(`\n### Player`)
  lines.push(`- ${packet.player.name} · ${packet.player.className} · ${packet.player.originName}`)
  lines.push(
    `- ${packet.player.levelHp} · AC ${packet.player.ac} · ${packet.player.credits}c · insp ${packet.player.inspiration} · exh ${packet.player.exhaustion}`
  )
  const statLine = packet.player.statModifiers
    .map((s) => `${s.stat} ${s.mod >= 0 ? '+' : ''}${s.mod}`)
    .join(' · ')
  lines.push(`- ${statLine}`)
  if (packet.player.proficiencies.length > 0) {
    lines.push(
      `- **Proficiencies** (+${packet.player.proficiencyBonus}): ${packet.player.proficiencies.join(', ')}. Prefer these when surfacing a check.`
    )
  }
  if (packet.player.activeTraits.length > 0) {
    lines.push(
      `- Traits: ${packet.player.activeTraits.map((t) => (t.usesRemaining !== undefined ? `${t.name} (${t.usesRemaining})` : t.name)).join(', ')}`
    )
  }
  if (packet.player.tempModifiers.length > 0) {
    lines.push(`- Temp: ${packet.player.tempModifiers.join(' | ')}`)
  }

  lines.push(`- Time: ${packet.scene.timeLabel}`)

  if (packet.temporalAnchors.length > 0) {
    lines.push(`- Timeline anchors: ${packet.temporalAnchors.map((a) => `${a.label}: ${a.anchorText}`).join(' | ')}`)
  }

  const revealHints = renderActiveRevelationHintProgress(packet, opts.isInitial)
  if (revealHints.length > 0) {
    lines.push(`\n### Revelation hint progress (GM-only)`)
    lines.push(...revealHints)
  }

  if (packet.cast.length > 0) {
    lines.push(`\n### Cast — current read (mutable)`)
    for (const c of packet.cast) {
      const pressure = c.activePressure ? ` · pressure: ${c.activePressure}` : ''
      lines.push(`- ${c.name} (${c.npcId}) — ${c.disposition.toUpperCase()} · ${c.voiceImperative}`)
      lines.push(`  contract: ${c.behavioralContract}`)
      if (c.prohibitions.length > 0) {
        lines.push(`  prose ban: ${c.prohibitions.join(' · ')}`)
      }
      lines.push(`  read: ${c.currentRead}${pressure}`)
    }
  }

  if (packet.tensions.length > 0) {
    lines.push(`\n### Thread tensions (mutable)`)
    for (const t of packet.tensions) {
      const stakeholders =
        t.stakeholderDispositions.length > 0
          ? ` · stakeholders: ${t.stakeholderDispositions.map((s) => `${s.name}:${s.disposition}`).join(', ')}`
          : ''
      const runtime =
        t.openingFloor !== undefined
          ? ` · chapter pressure ${t.tension}/10 (opening ${t.openingFloor}/10${t.localEscalation ? ` +${t.localEscalation} local` : ''}; canonical ${t.canonicalTension}/10${t.peakTension !== undefined ? `; peak ${t.peakTension}/10` : ''}${t.pressureRole ? `; role ${t.pressureRole}` : ''})`
          : ` · tension ${t.tension}/10`
      lines.push(`- ${t.title} (${t.threadId}): ${t.status}${runtime}${stakeholders}`)
    }
  }

  if (packet.emotionalBeats.length > 0) {
    lines.push(`\n### Recent beats (retrievable emotional memory)`)
    for (const b of packet.emotionalBeats) {
      lines.push(`- ${b.text} (${b.beatId}; tags: ${b.emotionalTags.join(', ')}; Ch${b.chapterCreated} T${b.turn})`)
    }
  }

  if (packet.mechanics.activeModules.length > 0) {
    lines.push(`\n### Mechanics active`)
    for (const m of packet.mechanics.activeModules) {
      if (m.kind === 'combat') {
        lines.push(
          `- Combat round ${m.roundsElapsed}, enemies: ${m.enemies.map((e) => `${e.name} (${e.hp} HP, AC ${e.ac})`).join(', ')}`
        )
      } else if (m.kind === 'operation') {
        lines.push(`- Operation · phase: ${m.phase} · ${m.status}`)
      } else if (m.kind === 'exploration') {
        lines.push(`- Exploration · ${m.area} · ${m.progress}`)
      } else if (m.kind === 'investigation') {
        lines.push(`- Investigation · ${m.clueCount} clues · recent: ${m.openLeads.join(' | ')}`)
      }
    }
  }

  if (opts.advisoryText) {
    lines.push(`\n---\n${opts.advisoryText}`)
  }

  lines.push(`\n---\n## ${opts.isInitial ? 'CURRENT TURN (opening — ESTABLISHMENT mode)' : 'CURRENT TURN (CONTINUATION mode)'}`)
  if (opts.isInitial) {
    lines.push(
      `**Establishment turn.** Open the chapter from the opening scene spec. Establish the room, the atmosphere, and introduce on-stage NPCs with enough role grounding that the player knows who each one is and why they matter — name + role/affiliation + the one thing that makes their presence here pressure-bearing, before you move to body language. The player has not acted yet. Write the first beat that invites player action. End with narrate_turn including 3-4 suggested_actions.`
    )
    if (opts.withheldPremiseFacts && opts.withheldPremiseFacts.length > 0) {
      lines.push(`\n### Withheld premise facts (TRUE in state — NOT stated in opening prose)`)
      for (const f of opts.withheldPremiseFacts) {
        lines.push(`- ${f}`)
      }
      lines.push(
        `These facts are canon. Do NOT narrate them in the opening. They must emerge through play — a question, a contradiction, an investigation, an NPC slip. Opening prose stating a withheld fact undermines the chapter's discovery arc.`
      )
    }
  } else {
    if (opts.playerInput) {
      lines.push(`\n### Player input`)
      lines.push(opts.playerInput)
    }
    if (packet.playerInput.resolvedAction) {
      lines.push(`\n### Resolved player action (deterministic)`)
      lines.push(renderResolvedAction(packet.playerInput.resolvedAction))
    }
    lines.push(
      `\n**Continuation turn.** The scene was already established in your prior prose (visible above as the last assistant message). DO NOT re-describe the room, atmosphere, or spatial layout — the player has them. NPC positions, postures, and arrangements in your prior prose are canonical: you may move an NPC this turn, but you must narrate the movement, not silently re-place them. Open this turn with reaction, dialogue, action, or a sensory beat — not with a scene-setter. Write in PC POV. Call narrate_turn at the end.`
    )
  }

  return lines.join('\n')
}

function renderActiveRevelationHintProgress(packet: Sf2NarratorScenePacket, isInitial: boolean): string[] {
  if (isInitial) return []
  return packet.revelationProgress.map((r) => {
    const remaining = Math.max(0, r.hintsRequired - r.hintsDelivered)
    const contexts = r.validRevealContexts.length > 0 ? r.validRevealContexts.join(', ') : 'any context'
    const invalid = r.invalidRevealContexts && r.invalidRevealContexts.length > 0
      ? `; avoid ${r.invalidRevealContexts.join(', ')}`
      : ''
    const phraseHint = remaining > 0 && r.hintPhrases.length > 0
      ? `; eligible after ${remaining} more hint${remaining === 1 ? '' : 's'} such as "${r.hintPhrases.slice(0, 2).join('" or "')}"`
      : ''
    return `- ${r.revelationId}: ${r.hintsDelivered}/${r.hintsRequired} hints delivered; reveal context: ${contexts}${invalid}${phraseHint}`
  })
}

function renderResolvedAction(action: NonNullable<Sf2NarratorScenePacket['playerInput']['resolvedAction']>): string {
  const targets = action.targetEntityIds.length > 0 ? action.targetEntityIds.join(', ') : '(unresolved)'
  const refs = action.resolvedReferences.length > 0
    ? action.resolvedReferences.map((r) => `${r.surface} -> ${r.resolvedToEntityId} (${r.confidence}; ${r.basis})`).join(' | ')
    : '(none)'
  const forbidden = action.forbiddenTargetSubstitutions.length > 0
    ? action.forbiddenTargetSubstitutions.join(', ')
    : '(none)'
  return [
    `- actionType: ${action.actionType}`,
    `- targetEntityIds: ${targets}`,
    `- resolvedReferences: ${refs}`,
    `- forbiddenTargetSubstitutions: ${forbidden}`,
    `Use targetEntityIds for ambiguous pronouns or role references. Do not redirect this action to any forbiddenTargetSubstitutions unless the prose first narrates a legal transition that changes the scene.`,
  ].join('\n')
}

function buildTemporalAnchorPackets(state: Sf2State): Sf2TemporalAnchorPacket[] {
  return Object.values(state.campaign.temporalAnchors ?? {})
    .filter((a) => a.status === 'active')
    .slice(-8)
    .map((a) => ({
      anchorId: a.id,
      kind: a.kind,
      label: a.label,
      anchorText: a.anchorText,
      status: a.status,
      anchoredTo: a.anchoredTo,
    }))
}

function buildEmotionalBeatPackets(
  state: Sf2State,
  workingSet: Sf2WorkingSet
): Sf2NarratorScenePacket['emotionalBeats'] {
  return workingSet.emotionalBeatIds
    .map((id) => state.campaign.beats?.[id])
    .filter((b): b is NonNullable<typeof b> => Boolean(b))
    .map((b) => ({
      beatId: b.id,
      text: b.text,
      participants: b.participants,
      anchoredTo: b.anchoredTo,
      emotionalTags: b.emotionalTags,
      salience: b.salience,
      turn: b.turn,
      chapterCreated: b.chapterCreated,
    }))
}

function buildRevelationProgressPackets(
  state: Sf2State
): Sf2NarratorScenePacket['revelationProgress'] {
  return state.chapter.scaffolding.possibleRevelations
    .filter((r) => !r.revealed)
    .filter((r) => (r.hintsRequired ?? 0) > 0 || (r.hintPhrases ?? []).length > 0)
    .slice(0, 4)
    .map((r) => ({
      revelationId: r.id,
      statement: r.statement,
      hintsDelivered: r.hintsDelivered ?? 0,
      hintsRequired: r.hintsRequired ?? 0,
      hintPhrases: r.hintPhrases ?? [],
      validRevealContexts: r.validRevealContexts ?? [],
      invalidRevealContexts: r.invalidRevealContexts,
    }))
}

export function renderScenePacket(packet: Sf2NarratorScenePacket): string {
  const lines: string[] = []

  lines.push(`## Scene packet — chapter ${packet.scene.chapterNumber}: ${packet.scene.chapterTitle}`)

  lines.push(`\n### Scene`)
  lines.push(`- Location: ${packet.scene.location.name} — ${packet.scene.location.description}`)
  if (packet.scene.location.atmosphericConditions.length > 0) {
    lines.push(`- Atmosphere: ${packet.scene.location.atmosphericConditions.join(', ')}`)
  }
  lines.push(`- Time: ${packet.scene.timeLabel}`)
  if (packet.scene.sceneIntent) lines.push(`- Intent: ${packet.scene.sceneIntent}`)

  lines.push(`\n### Player (${packet.player.name})`)
  lines.push(`- ${packet.player.className} · ${packet.player.originName}`)
  lines.push(
    `- ${packet.player.levelHp} · AC ${packet.player.ac} · ${packet.player.credits}c · insp ${packet.player.inspiration} · exh ${packet.player.exhaustion}`
  )
  const statLine = packet.player.statModifiers
    .map((s) => `${s.stat} ${s.mod >= 0 ? '+' : ''}${s.mod}`)
    .join(' · ')
  lines.push(`- ${statLine}`)
  if (packet.player.proficiencies.length > 0) {
    lines.push(
      `- **Proficiencies** (+${packet.player.proficiencyBonus} when used): ${packet.player.proficiencies.join(', ')}. Prefer these skills when surfacing a check that could plausibly use them — the PC is built for them.`
    )
  }
  if (packet.player.activeTraits.length > 0) {
    lines.push(
      `- Traits: ${packet.player.activeTraits.map((t) => (t.usesRemaining !== undefined ? `${t.name} (${t.usesRemaining})` : t.name)).join(', ')}`
    )
  }
  if (packet.player.tempModifiers.length > 0) {
    lines.push(`- Temp: ${packet.player.tempModifiers.join(' | ')}`)
  }

  if (packet.cast.length > 0) {
    lines.push(`\n### Cast on-stage`)
    for (const c of packet.cast) {
      const pressure = c.activePressure ? ` · pressure: ${c.activePressure}` : ''
      const dormancy =
        c.turnsAbsent !== undefined && c.turnsAbsent >= DORMANT_TURN_THRESHOLD
          ? ` · **dormant ${c.turnsAbsent} turns — re-establish on re-encounter**`
          : ''
      lines.push(`- **${c.name}** (${c.npcId}) — ${c.affiliation}, ${c.disposition}${dormancy}`)
      lines.push(`  voice: ${c.voice}`)
      lines.push(`  read: ${c.currentRead}${pressure}`)
    }
  }

  if (packet.tensions.length > 0) {
    lines.push(`\n### Tensions in scope`)
    for (const t of packet.tensions) {
      const runtime =
        t.openingFloor !== undefined
          ? `chapter pressure ${t.tension}/10 (opening ${t.openingFloor}/10; canonical ${t.canonicalTension}/10${t.peakTension !== undefined ? `; peak ${t.peakTension}/10` : ''}${t.pressureRole ? `; role ${t.pressureRole}` : ''})`
          : `tension ${t.tension}/10`
      lines.push(`- **${t.title}** (${t.threadId}) · ${t.status} · ${runtime}`)
      lines.push(`  why: ${t.localWhyItMatters}`)
      lines.push(`  owner: ${t.ownerSummary}`)
      if (t.stakeholderDispositions.length > 0) {
        lines.push(
          `  stakeholders: ${t.stakeholderDispositions.map((s) => `${s.name}:${s.disposition}`).join(', ')}`
        )
      }
      if (t.deterioration) lines.push(`  deterioration: ${t.deterioration}`)
      if (t.anchoredDecisions.length > 0) {
        lines.push(`  decisions: ${t.anchoredDecisions.map((d) => d.summary).join(' | ')}`)
      }
      if (t.anchoredPromises.length > 0) {
        lines.push(`  promises: ${t.anchoredPromises.map((p) => p.obligation).join(' | ')}`)
      }
      if (t.anchoredClues.length > 0) {
        lines.push(`  clues: ${t.anchoredClues.map((c) => c.content.slice(0, 100)).join(' | ')}`)
      }
    }
  }

  if (packet.emotionalBeats.length > 0) {
    lines.push(`\n### Recent beats`)
    for (const b of packet.emotionalBeats) {
      lines.push(`- ${b.text} (${b.beatId}; tags: ${b.emotionalTags.join(', ')}; Ch${b.chapterCreated} T${b.turn})`)
    }
  }

  lines.push(`\n### Chapter`)
  lines.push(`- Objective: ${packet.chapter.objective}`)
  lines.push(`- Crucible: ${packet.chapter.crucible}`)
  if (packet.chapter.currentPressureFace) {
    lines.push(`- Pressure face: ${packet.chapter.currentPressureFace}`)
  }
  if (packet.chapter.currentPressureStep) {
    lines.push(
      `- Pressure step: "${packet.chapter.currentPressureStep.pressure}" (${packet.chapter.currentPressureStep.narrativeEffect})`
    )
  }
  if (packet.chapter.arc) {
    lines.push(`- Arc: ${packet.chapter.arc.title} — scenario shape for GM use: ${packet.chapter.arc.scenario} (do not use this label as diegetic wording)`)
    lines.push(`- Arc question: ${packet.chapter.arc.question}`)
    if (packet.chapter.arc.chapterFunction) {
      lines.push(`- Chapter function: ${packet.chapter.arc.chapterFunction}`)
    }
  }
  if (packet.chapter.pacingContract) {
    const p = packet.chapter.pacingContract
    lines.push(`- Pacing target: resolve "${p.chapterQuestion}" in ${p.targetTurns.min}-${p.targetTurns.max} turns`)
  }

  if (packet.mechanics.activeModules.length > 0) {
    lines.push(`\n### Mechanics active`)
    for (const m of packet.mechanics.activeModules) {
      if (m.kind === 'combat') {
        lines.push(
          `- Combat round ${m.roundsElapsed}, enemies: ${m.enemies.map((e) => `${e.name} (${e.hp} HP, AC ${e.ac})`).join(', ')}`
        )
      } else if (m.kind === 'operation') {
        lines.push(`- Operation · phase: ${m.phase} · ${m.status}`)
      } else if (m.kind === 'exploration') {
        lines.push(`- Exploration · ${m.area} · ${m.progress}`)
      } else if (m.kind === 'investigation') {
        lines.push(`- Investigation · ${m.clueCount} clues · recent: ${m.openLeads.join(' | ')}`)
      }
    }
  }

  if (packet.recentContext.lastThreeTurns.length > 0) {
    lines.push(`\n### Recent context (last ${packet.recentContext.lastThreeTurns.length} turns)`)
    for (const t of packet.recentContext.lastThreeTurns) {
      if (t.playerInput) lines.push(`- T${t.index} player: ${t.playerInput}`)
      if (t.narratorProse) lines.push(`- T${t.index} narrator: ${t.narratorProse}`)
    }
  }
  if (packet.recentContext.lastSceneSummary) {
    const s = packet.recentContext.lastSceneSummary
    lines.push(`\n### Last scene`)
    lines.push(`- ${s.summary} (leads_to: ${s.leadsTo ?? 'null'})`)
  }

  if (packet.playerInput.text) {
    lines.push(`\n### Player input`)
    lines.push(packet.playerInput.text)
  }

  return lines.join('\n')
}

// Render campaign lexicon as a compact block. Returns empty string when no
// entries. Caller decides where to splice it (scene-packet block or appended).
export function renderCampaignLexicon(lexicon: Array<{ phrase: string; register: string }>): string {
  if (!lexicon || lexicon.length === 0) return ''
  // Keep most recent 8 to avoid bloating the per-turn message.
  const recent = lexicon.slice(-8)
  const lines = recent.map((e) => `- "${e.phrase}" — ${e.register}`)
  return `### Campaign lexicon (canon phrases — reuse when they fit)\n${lines.join('\n')}`
}

// Relevance filter for off-stage chapter cast.
//
// Goal: surface authored / load-bearing NPCs that aren't currently on-stage,
// so when the player pursues "the elder" or the fiction calls for an authored
// role, the Narrator uses the authored id/name instead of inventing a parallel.
// Keep the list tight — this rides in the cached scene bundle.
//
// An off-stage NPC is worth preserving if ANY of:
//   (1) Authored for the current chapter (in startingNpcIds) — always include
//   (2) Owns an active thread
//   (3) Was on-stage within the last 15 turns
//   (4) Is a stakeholder in an active decision or live promise
// AND:
//   - status is alive or unknown (exclude dead/gone)
//   - not currently in presentNpcIds
//
// Capped at 8, priority-ordered by the criteria above.
interface OffstageCastEntry {
  id: string
  name: string
  affiliation: string
  role: string
  retrievalCue: string
}

function buildOffstageCast(
  state: Sf2State,
  packet: Sf2NarratorScenePacket
): OffstageCastEntry[] {
  const presentIds = new Set(packet.cast.map((c) => c.npcId))
  const startingIds = new Set(state.chapter.setup.startingNpcIds ?? [])
  const currentTurn = state.history.turns.length
  const RECENCY_WINDOW = 15
  const CAP = 8

  // Compute anchored stakeholder ids from live promises. (Decisions don't
  // have a direct NPC owner — they anchor to threads. Promise owners are the
  // cleanest direct-NPC signal.)
  const anchoredNpcIds = new Set<string>()
  for (const p of Object.values(state.campaign.promises)) {
    if (p.status !== 'active') continue
    if (p.owner?.kind === 'npc' && p.owner.id) anchoredNpcIds.add(p.owner.id)
  }

  const threadOwnerIds = new Set<string>()
  for (const t of Object.values(state.campaign.threads)) {
    if (t.status !== 'active') continue
    if (t.owner?.kind === 'npc' && t.owner.id) threadOwnerIds.add(t.owner.id)
  }

  // Build candidate set with priority tier for ordering.
  type Candidate = { npc: typeof state.campaign.npcs[string]; priority: number }
  const candidates: Candidate[] = []
  for (const npc of Object.values(state.campaign.npcs)) {
    if (presentIds.has(npc.id)) continue
    if (npc.status !== 'alive' && npc.status !== 'unknown') continue

    let priority = 0
    if (startingIds.has(npc.id)) priority = 4
    else if (threadOwnerIds.has(npc.id)) priority = 3
    else if (npc.lastSeenTurn !== undefined && currentTurn - npc.lastSeenTurn <= RECENCY_WINDOW) priority = 2
    else if (anchoredNpcIds.has(npc.id)) priority = 1
    else continue // doesn't qualify

    candidates.push({ npc, priority })
  }

  candidates.sort((a, b) => {
    if (b.priority !== a.priority) return b.priority - a.priority
    // Within same tier, prefer more recently seen.
    const aSeen = a.npc.lastSeenTurn ?? -1
    const bSeen = b.npc.lastSeenTurn ?? -1
    return bSeen - aSeen
  })

  return candidates.slice(0, CAP).map(({ npc }) => ({
    id: npc.id,
    name: npc.name,
    affiliation: npc.affiliation,
    role: npc.role ?? '',
    retrievalCue: npc.retrievalCue,
  }))
}
