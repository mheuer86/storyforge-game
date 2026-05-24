import type Anthropic from '@anthropic-ai/sdk'
import {
  buildScenePacket,
  renderPerTurnDelta,
  renderSceneBundle,
} from '../retrieval/scene-packet'
import type { Sf2State } from '../types'
import {
  evaluateSocialModifierAdvisories,
  renderSocialModifierAdvisories,
} from '../social-modifiers/evaluate'
import {
  renderNarratorPersonalizationBlock,
  renderNarratorRulebookInterpretationsBlock,
} from '../personalization/prompt-blocks'
import { computeRequiredRollGate, renderRollGateBlock } from './roll-gates'

export type Sf2ProseFirstNarratorTranscriptRole = 'user' | 'assistant'

export interface Sf2ProseFirstNarratorTranscriptTurn {
  role: Sf2ProseFirstNarratorTranscriptRole
  content: string
}

export interface Sf2ProseFirstNarratorBriefInput {
  /**
   * Stable private GM brief or chapter handover text. This is intentionally
   * prose-shaped and does not include scene bundles or working-set packets.
   */
  text: string
  label?: string
}

export interface Sf2ProseFirstMechanicalSnapshotInput {
  state: Sf2State
  recentInventoryChanges?: string[]
  recentEquipmentChanges?: string[]
}

export interface Sf2ProseFirstNarratorMessagesInput {
  enabled: boolean
  brief: Sf2ProseFirstNarratorBriefInput
  transcript: Sf2ProseFirstNarratorTranscriptTurn[]
  playerInput: string
  mechanicalSnapshot: Sf2ProseFirstMechanicalSnapshotInput
  closeLoopAdvisoryText?: string
}

export interface Sf2ProseFirstNarratorMessages {
  system: Anthropic.TextBlockParam[]
  messages: Anthropic.MessageParam[]
  mechanicalSnapshotText: string
  closeLoopAdvisoryText?: string
  transcript: Sf2ProseFirstNarratorTranscriptTurn[]
}

const PROSE_FIRST_NARRATOR_PROTOCOL = `## Storyforge live narration protocol

You are the live GM/Narrator. The campaign brief or handover above is private GM prep, not player-visible text.

Write the next player-facing prose naturally. At campaign start, ask the brief's character creation questions ONE AT A TIME — set the scene, pose the first unanswered question, then stop and wait for the player's answer. Each subsequent turn, acknowledge their answer and ask the next question until all are answered, then transition into the opening scene. Once play is underway, run scenes from the growing transcript and the private mechanical snapshot.

During character creation, use the brief's "Quick-start answers" (if provided under each question) as suggested_actions in your narrate_turn call. They are pre-authored to create strong dramatic hooks. The player can always type their own answer instead.

Use the available tools exactly as the app contract requires:
- Call request_roll because rolls CREATE drama — they don't block progress, they shape HOW it arrives. A failed check means the information comes late, partial, costly, or from the wrong source.
  • NPC intel is never free. When an NPC reveals actionable information, the roll determines whether the PC reads the angle, catches the omission, or tips their hand asking. Even a cooperative NPC sharing for their own reasons creates uncertainty: does the PC catch the spin? The exception: NPCs with established trust and earned disclosure share freely.
  • Investigation carries uncertainty. Searching, scanning, reading a room — the PC always finds something. The roll determines whether they find the right thing, the complete thing, or something that makes them a target.
  • Social pressure has a price the dice set. Willing cooperation is free; persuasion, deception, and negotiation against resistance always cost a check.
  Missing a roll means missing a chance for the dice to make the story surprising. Default success is the least interesting version of every scene.
  State the stakes in prose before the tool call, then stop so the harness can roll. If you call request_roll, stop immediately after request_roll; do not call narrate_turn or include chapter_status until the roll result returns and the turn is completed.
- After any roll result is returned, continue from that result and fail forward on a miss.
- Call narrate_turn exactly once at the end of every complete non-roll turn with suggested_actions, any player-visible mechanical effects, and chapter_status. Fill chapter_status on every completed prose-first narrate_turn, even when the phase is only opening, pressure, or decision. If no chapter transition is due, set authorial_moves.pivot_signaled to false.

Chapter-loop metadata is hidden. Never write phase labels, Done/In flight/Not done reasoning, close diagnostics, handover readiness, or any other metadata in player-facing prose.

## Prose-first chapter close rule

Close or reframe only when the chapter has produced a clean boundary in the current play: the foreground question is answered, failed, or transformed; the latest scene has landed a decisive revelation, confrontation, deadline-fire, operation completion, or aftermath beat; and a next-chapter handover could be written from facts already established.

Active-scene guard: never close or reframe while the current scene still has a live response obligation. Treat these as active blockers: an NPC is present and answering a direct question; the player asked an NPC, crew member, or ship AI for specific analysis and that answer has not landed; a revelation is unfolding and the player has not had a chance to react; or a negotiation/interrogation is still in exchange rather than aftermath. When close pressure exists but an active blocker is present, do not pivot; set chapter_status.close_candidate to true if close-soon, name the blocker in chapter_status.never_close_mid_active and active_blockers, set close_intent to close_after_current_exchange, and make next_required_delta the exact landing beat after which close/reframe becomes clean.

Fact-locked close reasoning: base close signals only on facts already established in the transcript or completed by the current player action. Before marking close-ready, separate Done, In flight, and Not done inside chapter_status.reason only. Do not count future facts as true. If the player is heading to a broker, the broker deal is not signed yet; if they have not reached an office, the lien/marker is not cleared yet; if the ship is still docked, departure and unclamping are not resolved yet; if an NPC is holding out new evidence, the revelation has not fully landed yet.

Handover readiness means the next chapter can start from current facts without finishing the current exchange: current location/scope is stable, named parties needed for the next opener are accounted for, no NPC in the current scene is waiting for an answer, and the next chapter begins with a clear first decision. If close pressure is real but handover_ready is false, write the smallest consolidation beat that makes it ready.

Use authorial_moves.pivot_signaled compatibly with chapter_status: set it true only when phase is closed or reframed and you have actually written a decisive final or reframe beat. Keep it false for close_candidate, close_after_current_exchange, or any active blocker.

The harness owns dice, arithmetic, persistence, and validation. Do not output state patches, JSON, hidden notes, or the brief itself in player-facing prose.`

function asCacheableTextBlock(text: string): Anthropic.TextBlockParam {
  return {
    type: 'text' as const,
    text,
    cache_control: { type: 'ephemeral' as const },
  }
}

function asCacheableMessage(role: 'user' | 'assistant', text: string): Anthropic.MessageParam {
  return {
    role,
    content: [
      {
        type: 'text' as const,
        text,
        cache_control: { type: 'ephemeral' as const },
      },
    ],
  }
}

export function prependMechanicalSnapshotToUserContent(
  content: string,
  mechanicalSnapshotText: string,
  closeLoopAdvisoryText?: string
): string {
  const advisory = closeLoopAdvisoryText?.trim()
  const advisoryBlock = advisory
    ? `\n\n<chapter-close-loop-advisory>\n${advisory}\n</chapter-close-loop-advisory>`
    : ''
  return `<mechanical-snapshot>\n${mechanicalSnapshotText}\n</mechanical-snapshot>${advisoryBlock}\n\n${content}`
}

function normalizeTranscriptTurn(
  turn: Sf2ProseFirstNarratorTranscriptTurn
): Sf2ProseFirstNarratorTranscriptTurn | null {
  const content = turn.content.trim()
  if (!content) return null
  return { role: turn.role, content }
}

function renderClockDisplay(state: Sf2State): string[] {
  const activeThreads = Object.values(state.campaign.threads)
    .filter((thread) => thread.status === 'active')
    .sort((a, b) => b.tension - a.tension)
    .slice(0, 8)

  return activeThreads.map((thread) => {
    const owner =
      thread.owner.kind === 'npc'
        ? state.campaign.npcs[thread.owner.id]?.name
        : state.campaign.factions[thread.owner.id]?.name
    const ownerText = owner ? `; owner: ${owner}` : ''
    return `- ${thread.title}: tension ${thread.tension}/10${ownerText}; ${thread.retrievalCue}`
  })
}

function renderRecentChangeLines(label: string, changes: string[] | undefined): string[] {
  const clean = (changes ?? []).map((change) => change.trim()).filter(Boolean)
  if (clean.length === 0) return [`- ${label}: no recent changes recorded.`]
  return [`- ${label}:`, ...clean.map((change) => `  - ${change}`)]
}

export function renderProseFirstMechanicalSnapshot(input: Sf2ProseFirstMechanicalSnapshotInput): string {
  const { state, recentInventoryChanges, recentEquipmentChanges } = input
  const player = state.player
  const inventory = player.inventory.length
    ? player.inventory.map((item) => `${item.name} x${item.qty}`).join(', ')
    : 'none'
  const activeModifiers = player.tempModifiers.length
    ? player.tempModifiers.map((mod) => `${mod.source}: ${mod.effect}`).join('; ')
    : 'none'
  const activeWounds = player.exhaustion > 0 ? [`exhaustion ${player.exhaustion}`] : []
  const clocks = renderClockDisplay(state)

  return [
    '## Private mechanical snapshot',
    'Use this as code-owned truth for the next response. Do not quote this block or describe it as a system note.',
    '',
    `- PC: ${player.name || 'unnamed'}; level ${player.level}; AC ${player.ac}; inspiration ${player.inspiration}`,
    `- HP: ${player.hp.current}/${player.hp.max}`,
    `- Active wounds: ${activeWounds.length ? activeWounds.join(', ') : 'none recorded'}`,
    `- Credits: ${player.credits}`,
    `- Inventory: ${inventory}`,
    `- Temporary modifiers: ${activeModifiers}`,
    ...renderRecentChangeLines('Recent inventory changes', recentInventoryChanges),
    ...renderRecentChangeLines('Recent equipment changes', recentEquipmentChanges),
    '- Tension clocks:',
    ...(clocks.length ? clocks : ['  - none active']),
  ].join('\n')
}

export function buildProseFirstNarratorMessages(
  input: Sf2ProseFirstNarratorMessagesInput
): Sf2ProseFirstNarratorMessages | null {
  if (!input.enabled) return null

  const briefText = input.brief.text.trim()
  if (!briefText) {
    throw new Error('Prose-first narrator messages require a non-empty brief or handover text.')
  }

  const stablePrefix = [
    input.brief.label ? `# ${input.brief.label}` : '# Storyforge narrator brief',
    briefText,
    PROSE_FIRST_NARRATOR_PROTOCOL,
  ].join('\n\n')
  const mechanicalSnapshotText = renderProseFirstMechanicalSnapshot(input.mechanicalSnapshot)
  const closeLoopAdvisoryText = input.closeLoopAdvisoryText?.trim() || undefined
  const system: Anthropic.TextBlockParam[] = [
    asCacheableTextBlock(stablePrefix),
  ]
  const transcript = input.transcript
    .map(normalizeTranscriptTurn)
    .filter((turn): turn is Sf2ProseFirstNarratorTranscriptTurn => Boolean(turn))
  const messages: Anthropic.MessageParam[] = transcript.map((turn) => ({
    role: turn.role,
    content: turn.content,
  }))

  if (messages.length > 0) {
    const lastStableIndex = messages.length - 1
    const last = messages[lastStableIndex]
    if (typeof last.content === 'string') {
      messages[lastStableIndex] = asCacheableMessage(last.role, last.content)
    }
  }

  const currentInput = input.playerInput.trim()
  const currentContent = currentInput ||
    'Begin from the private campaign brief. Ask the embedded character creation questions or open the next chapter as instructed.'
  messages.push({
    role: 'user',
    content: prependMechanicalSnapshotToUserContent(currentContent, mechanicalSnapshotText, closeLoopAdvisoryText),
  })

  return {
    system,
    messages,
    mechanicalSnapshotText,
    closeLoopAdvisoryText,
    transcript,
  }
}

// Playbook preference block — soft directive injecting the PC's strongest
// applicable skills into the per-turn delta. When the Narrator has multiple
// plausible checks to surface, prefer the PC's strengths. Player skill-tag
// binding (above) overrides this; this block applies only when the player's
// input doesn't carry a tag of its own. See [[2604270855 Storyforge V2
// Playbook Fit]] for design.
function buildPlaybookPreferenceBlock(state: Sf2State): string {
  if (!state.player?.proficiencies?.length) return ''
  const profs = state.player.proficiencies.slice(0, 4)
  if (profs.length === 0) return ''
  const list = profs.map((p) => `\`${p}\``).join(', ')
  return `\n\n---\n\n### Playbook preference (soft)\nThe PC's proficiencies are: ${list}. When this turn's tension allows multiple plausible checks, prefer surfacing one that matches the PC's strengths over a peer skill — it makes the chapter feel like *this* PC's chapter, not a generic one. Player intent (an explicit skill tag in the input) overrides this. This is a default preference, not a constraint; surface a different skill if the moment genuinely calls for it.`
}

function buildLocationContinuityGuardBlock(state: Sf2State): string {
  if (state.meta.genreId !== 'space-opera') return ''

  const recentSceneText = [
    state.world.currentLocation?.name,
    state.world.currentLocation?.description,
    state.world.currentTimeLabel,
    ...(state.world.sceneSnapshot?.established ?? []),
    ...(state.chapter.sceneSummaries ?? []).slice(-2).map((s) => s.summary),
  ].join(' ').toLowerCase()

  const hasDepartureLock =
    /\b(departed|undocked|cleared (?:the )?(?:station|departure envelope|clamps)|burned clear|open corridor|deep passage|trajectory|transit)\b/.test(recentSceneText) &&
    !/\b(on the clamps|still on the clamps|docked against|in port)\b/.test(recentSceneText)

  if (!hasDepartureLock) return ''

  return `\n\n---\n\n### Private location continuity guard (mandatory, never mention)\nCurrent state says the PC's ship has already departed its prior station/dock and is in transit or clear space. Do not reintroduce station-side events as if the ship were still docked: no inspectors boarding from that station, no concourse actions, no clamp-release countdowns, no renewed departure window from the departed location. If the player explicitly returns or docks somewhere, narrate the transit/docking first and emit a fresh set_scene_snapshot. Suggested actions must be takeable from the ship's current location.`
}

function buildRoleAliasBlock(state: Sf2State, playerInput: string): string {
  const input = playerInput.toLowerCase()
  if (!input.trim()) return ''

  const roleTerms = [
    'elder',
    'retainer',
    'assessor',
    'compliance',
    'factor',
    'contact',
    'warden',
    'parent',
    'sibling',
    'survivor',
    'clerk',
    'aide',
  ]
  const requested = roleTerms.filter((term) => input.includes(term))
  if (requested.length === 0) return ''

  const present = new Set(state.world.sceneSnapshot.presentNpcIds)
  const candidates = Object.values(state.campaign.npcs)
    .filter((npc) => !present.has(npc.id))
    .filter((npc) => npc.status === 'alive' || npc.status === 'unknown')
    .filter((npc) => {
      const haystack = `${npc.name} ${npc.role} ${npc.affiliation} ${npc.retrievalCue}`.toLowerCase()
      return requested.some((term) => haystack.includes(term))
    })
    .slice(0, 6)

  if (candidates.length === 0) return ''
  return `\n\n---\n\n### Private role lookup (never mention)\nThe player input names a role that matches authored/off-stage NPCs. If the scene needs that role, use the existing id/name below instead of inventing a parallel character.\n${candidates.map((n) => `- ${n.id}: ${n.name} — ${n.affiliation} · ${n.role} — ${n.retrievalCue}`).join('\n')}`
}

// Build messages array as a scene-bounded conversation.
//
// Layout:
//   [0] user    scene bundle (pre-fetch) · cache_control=ephemeral  ← BP3
//   [1..N]     alternating {user: playerInput, assistant: prose}
//               for each turn in this scene's history. The last assistant
//               message carries cache_control=ephemeral                ← BP4
//   [N+1] user  current-turn delta (mutable state + recovery notes +
//               player input + write directive)
//
// Scene bundle is built once per scene (detected by sceneBundleCache.sceneId
// matching currentSceneId) and re-used across the scene's turns. When it
// rebuilds, we surface it via a scene_bundle_built SSE event so the client
// can persist it.
export function buildMessagesForNarrator(
  state: Sf2State,
  playerInput: string,
  isInitial: boolean,
  turnIndex: number
): {
  messages: Anthropic.MessageParam[]
  packet: ReturnType<typeof buildScenePacket>['packet']
  workingSet: ReturnType<typeof buildScenePacket>['workingSet']
  advisoryText: string
  bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
  } | null
} {
  const { packet, workingSet, advisoryText } = buildScenePacket(state, playerInput, turnIndex)

  const currentSceneId = state.world.sceneSnapshot.sceneId
  const cached = state.world.sceneBundleCache
  const cacheValid = cached && cached.sceneId === currentSceneId

  // Replay window cutoff lives on the scene snapshot — independent of cache
  // lifecycle. The Archivist may invalidate `sceneBundleCache` when the
  // off-stage roster shifts mid-scene; that must not drop the in-scene
  // turn pairs from message replay. Fallback to history.length covers
  // legacy persisted state that pre-dates this field.
  const firstTurnIndex = state.world.sceneSnapshot.firstTurnIndex ?? state.history.turns.length

  let bundleText: string
  let bundleRebuilt: {
    sceneId: string
    bundleText: string
    builtAtTurn: number
  } | null = null

  if (cacheValid) {
    bundleText = cached.bundleText
  } else {
    bundleText = renderSceneBundle(packet, state)
    bundleRebuilt = {
      sceneId: currentSceneId,
      bundleText,
      builtAtTurn: turnIndex,
    }
  }

  // Replay in-scene turn pairs from history. turnIndex is monotonic across
  // chapters (P1#2 fix), so filter by >= firstTurnIndex.
  const sceneTurns = state.history.turns.filter((t) => t.index >= firstTurnIndex)
  const turnPairs: Anthropic.MessageParam[] = []
  for (const t of sceneTurns) {
    if (t.playerInput) {
      turnPairs.push({ role: 'user' as const, content: t.playerInput })
    }
    if (t.narratorProse) {
      turnPairs.push({ role: 'assistant' as const, content: t.narratorProse })
    }
  }

  // Recovery notes from prior turn's Archivist — single-use.
  const recoveryNotes = state.campaign.pendingRecoveryNotes ?? []
  const recoveryBlock = recoveryNotes.length
    ? `\n\n---\n\n### Private re-establishment notes (never mention)\nThese notes are system-private continuity context. Do NOT quote, paraphrase, acknowledge, or narrate them. Do not say you are correcting or re-establishing anything. If a note names a fact that still matters, weave that fact concretely into this turn's prose so it grounds on the graph — but do so silently, as if writing the scene fresh.\n${recoveryNotes.map((n) => `- ${n}`).join('\n')}`
    : ''

  // Coherence notes from prior turn's Archivist — single-use.
  // Each entry is pre-formatted as: [severity] type (state_reference): suggested note
  const coherenceNotes = state.campaign.pendingCoherenceNotes ?? []
  const coherenceBlock = coherenceNotes.length
    ? `\n\n---\n\n### Private continuity notes (never mention)\nThese notes are system-private continuity context. Do NOT quote, paraphrase, acknowledge, or narrate them. Do not say you are correcting anything. If a note says prior prose was wrong, the note overrides that conflicting prior prose for the named entity or fact. Continue naturally from canonical state, using the notes only to avoid repeating the mismatch.\n${coherenceNotes.map((n) => `- ${n}`).join('\n')}`
    : ''
  const roleAliasBlock = buildRoleAliasBlock(state, playerInput)
  const rollGateBlock = renderRollGateBlock(computeRequiredRollGate(state, playerInput))
  const playbookPrefBlock = buildPlaybookPreferenceBlock(state)
  const resolvedAction = packet.playerInput.resolvedAction
  const socialModifierBlock = renderSocialModifierAdvisories(
    evaluateSocialModifierAdvisories({
      state,
      playerInput,
      resolvedAction,
      targetEntityIds: resolvedAction?.targetEntityIds,
    })
  )
  const locationContinuityGuardBlock = buildLocationContinuityGuardBlock(state)
  const personalizationBlock = renderNarratorPersonalizationBlock(state)
  const rulebookInterpretationsBlock = renderNarratorRulebookInterpretationsBlock(state)

  const openingSeed = state.chapter.artifacts.opening
  const perTurnDeltaText = renderPerTurnDelta(packet, {
    advisoryText,
    isInitial,
    playerInput,
    withheldPremiseFacts: isInitial ? openingSeed?.withheldPremiseFacts : undefined,
  }) + roleAliasBlock + rollGateBlock + playbookPrefBlock + socialModifierBlock + locationContinuityGuardBlock + personalizationBlock + rulebookInterpretationsBlock + recoveryBlock + coherenceBlock

  // Cache marker strategy:
  //   Anthropic allows at most 4 cache_control markers per request. We already
  //   spend 3 on BP1 (last tool) + BP2 (system CORE/BIBLE/ROLE) + BP3
  //   (system SITUATION). That leaves exactly ONE message-level marker.
  //
  //   If the scene has prior assistant turns, place it on the last assistant
  //   message — that single marker's cache prefix already covers the bundle
  //   AND all prior-in-scene turn pairs. It advances each turn and amortizes.
  //
  //   If the scene has no assistant turns yet (first turn of the scene), place
  //   it on the bundle — at least the bundle's tokens get cached before the
  //   delta body is added.
  const hasPriorAssistant = turnPairs.some((m) => m.role === 'assistant')

  const bundleMessage: Anthropic.MessageParam = hasPriorAssistant
    ? { role: 'user', content: bundleText }
    : {
        role: 'user',
        content: [
          {
            type: 'text' as const,
            text: bundleText,
            cache_control: { type: 'ephemeral' as const },
          },
        ],
      }

  const messages: Anthropic.MessageParam[] = [
    bundleMessage,
    ...turnPairs,
    { role: 'user', content: perTurnDeltaText },
  ]

  // When there are prior assistant turns, mark the latest one — its cached
  // prefix covers everything before it, including the bundle.
  if (hasPriorAssistant) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'assistant') {
        const m = messages[i]
        if (typeof m.content === 'string') {
          messages[i] = {
            role: 'assistant',
            content: [
              {
                type: 'text' as const,
                text: m.content,
                cache_control: { type: 'ephemeral' as const },
              },
            ],
          }
        }
        break
      }
    }
  }

  return { messages, packet, workingSet, advisoryText, bundleRebuilt }
}
