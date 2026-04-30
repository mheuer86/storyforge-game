import type Anthropic from '@anthropic-ai/sdk'
import {
  buildScenePacket,
  renderPerTurnDelta,
  renderSceneBundle,
} from '../retrieval/scene-packet'
import type { Sf2State } from '../types'

// Skill tags in suggested actions ("[Intimidation]", "[Persuasion or
// Insight]") are a contract: when the player chose a tagged action, that
// turn must surface the skill check. The Narrator's roll-frequency heuristic
// ("one check every 2-3 turns") otherwise wins and silently skips the roll.
// Programmatic injection here makes the contract binding rather than advisory.
const SKILL_TAG_PATTERN = /\[([^\]]+)\]/g
const ROLLABLE_SKILLS = new Map<string, string>([
  ['intimidation', 'Intimidation'],
  ['persuasion', 'Persuasion'],
  ['deception', 'Deception'],
  ['insight', 'Insight'],
  ['perception', 'Perception'],
  ['investigation', 'Investigation'],
  ['athletics', 'Athletics'],
  ['acrobatics', 'Acrobatics'],
  ['stealth', 'Stealth'],
  ['sleightofhand', 'Sleight of Hand'],
  ['arcana', 'Arcana'],
  ['religion', 'Religion'],
  ['history', 'History'],
  ['medicine', 'Medicine'],
  ['survival', 'Survival'],
  ['nature', 'Nature'],
  ['performance', 'Performance'],
])

function extractSkillTags(playerInput: string): string[] {
  if (!playerInput) return []
  const skills: string[] = []
  for (const match of playerInput.matchAll(SKILL_TAG_PATTERN)) {
    const inside = match[1].trim()
    // Reject non-skill bracketed text ("[No roll — a pure choice]",
    // "[Establish private ground...]"). Accept only when the bracket
    // names a known rollable skill.
    const tokens = inside.split(/\s+or\s+|\s*,\s*|\s+and\s+/i).map((t) => t.trim())
    for (const tok of tokens) {
      const norm = tok.toLowerCase().replace(/[^a-z]/g, '')
      const canonical = ROLLABLE_SKILLS.get(norm)
      if (canonical) {
        if (!skills.includes(canonical)) skills.push(canonical)
      }
    }
  }
  return skills
}

function buildSkillTagBindingBlock(playerInput: string): string {
  const skills = extractSkillTags(playerInput)
  if (skills.length === 0) return ''
  const skillList = skills.length === 1
    ? `\`${skills[0]}\``
    : skills.map((s) => `\`${s}\``).join(' or ')
  return `\n\n---\n\n### Skill-tag binding (mandatory)\nThe player chose a quick action tagged with ${skillList}. That tag is a binding commitment, not advisory. **You MUST call \`request_roll\` with one of those skills this turn before resolving the action's outcome.** Pick the skill that best fits the moment, set an appropriate DC, and pause narration at the point of uncertainty per the standard roll-flow rules. The roll-frequency heuristic does not apply when a tag is present — surface the check even if you've already rolled this scene.`
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
    ? `\n\n---\n\n### Private continuity notes (never mention)\nThese notes are system-private continuity context. Do NOT quote, paraphrase, acknowledge, or narrate them. Do not say you are correcting anything. Continue the scene naturally from the last visible prose, using the notes only to avoid repeating the mismatch.\n${coherenceNotes.map((n) => `- ${n}`).join('\n')}`
    : ''
  const roleAliasBlock = buildRoleAliasBlock(state, playerInput)
  const skillTagBlock = buildSkillTagBindingBlock(playerInput)
  const playbookPrefBlock = buildPlaybookPreferenceBlock(state)
  const locationContinuityGuardBlock = buildLocationContinuityGuardBlock(state)

  const openingSeed = state.chapter.artifacts.opening
  const perTurnDeltaText = renderPerTurnDelta(packet, {
    advisoryText,
    isInitial,
    playerInput,
    withheldPremiseFacts: isInitial ? openingSeed?.withheldPremiseFacts : undefined,
  }) + roleAliasBlock + skillTagBlock + playbookPrefBlock + locationContinuityGuardBlock + recoveryBlock + coherenceBlock

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

  return { messages, workingSet, advisoryText, bundleRebuilt }
}
