// Pure derivation of Sf2SceneKernel from canonical state. Called once per turn
// at the start of the Narrator pipeline (and rebuilt after Archivist patches).
// Code owns the projection function; the Narrator can never write the kernel
// directly — only the underlying canonical state, which the firewall already
// constrains. The kernel is a read view, not a separate source of truth.
//
// Phase A scope: build + populate. Consumption by Narrator packet (Phase B+),
// SceneKernelPatch reducer (Phase E), and display sentinel (Phase C) come
// later. Building it now anchors the canonical-ID contract and gives us a
// stable shape to point future phases at.

import type {
  Sf2SceneKernel,
  Sf2SceneKernelCountdown,
  Sf2SceneKernelLegalTransition,
  Sf2State,
} from '../types'

// Default forbidden-without-transition list — declarative for now, enforcement
// arrives with the display sentinel (Phase C). Three rules cover the PRD's
// "absent NPC speaks", "interlocutor disappears", "location jump without
// movement" failure modes. Kernel users will read this list to decide what to
// validate; nobody is enforcing it in Phase A.
const DEFAULT_FORBIDDEN_WITHOUT_TRANSITION: readonly string[] = [
  'Absent NPCs may not speak or directly act in this scene without a narrated entrance.',
  'The current interlocutor may not become absent without an exit narrated in prose.',
  'Location may not change without movement narrated in prose.',
]

// Recent-prose tail length used for lastVisibleState. Long enough to give the
// sentinel something to scan for absent-speaker quotes; short enough that it
// doesn't bloat the kernel for log/inspection use.
const LAST_VISIBLE_STATE_CHARS = 280

export interface BuildSceneKernelOptions {
  // Optional turn id override. Defaults to current turn count as a string —
  // sufficient for monotonicity in Phase A; replace with proper turn id when
  // turn ids become first-class.
  turnId?: string
  // Optional override for absent-id derivation. By default, we use:
  //   absent = (off-stage NPCs that have appeared this chapter) ∪ (chapter setup
  //            startingNpcIds not currently present)
  // This list is conservative — every NPC who *might* be referenced in the
  // scene without being on-stage qualifies. The sentinel will use it to decide
  // when an absent_speaker violation is in play.
  absentEntityIds?: string[]
}

export function buildSceneKernel(
  state: Sf2State,
  options: BuildSceneKernelOptions = {}
): Sf2SceneKernel {
  const snapshot = state.world.sceneSnapshot
  const turnIndex = state.history.turns.length
  const turnId = options.turnId ?? `turn_${turnIndex}`

  // Cast partition. All four arrays must use canonical entity IDs only — the
  // validator (canonical-ids.ts) enforces this against the snapshot input
  // upstream; here we carry through what's already canonical.
  const presentEntityIds = [...snapshot.presentNpcIds]

  // Default current interlocutors = all present NPCs. SceneKernelPatch will
  // narrow this in Phase E. The default keeps prior behavior intact: if no
  // explicit interlocutor is set, the Narrator treats every present NPC as
  // potentially addressed.
  const currentInterlocutorIds =
    snapshot.currentInterlocutorIds && snapshot.currentInterlocutorIds.length > 0
      ? snapshot.currentInterlocutorIds.filter((id) => presentEntityIds.includes(id))
      : [...presentEntityIds]

  // Nearby = present but not currently addressed. When no narrowing has
  // happened, nearby is empty (everyone is interlocutor by default).
  const nearbyEntityIds = presentEntityIds.filter((id) => !currentInterlocutorIds.includes(id))

  const absentEntityIds =
    options.absentEntityIds !== undefined
      ? options.absentEntityIds
      : deriveAbsentEntityIds(state, presentEntityIds)

  // Speaking-allowed = present cast (NPCs and PC). The PC is always allowed to
  // speak; absent NPCs never are. Nearby NPCs are still "present" so they're
  // allowed — interlocutor narrowing affects who the player is *addressing*,
  // not who can speak.
  const speakingAllowedEntityIds = [...presentEntityIds, 'pc']

  // Procedures: project from existing world modules. Rich procedure state
  // (surgery/hack phases per PRD) is deferred until a real scenario needs it.
  const activeProcedureIds: string[] = []
  if (state.world.combat?.active) activeProcedureIds.push('combat')
  if (state.world.operation) activeProcedureIds.push('operation')
  if (state.world.exploration) activeProcedureIds.push('exploration')

  // Active countdowns: derive from temporal anchors with kind='deadline' and
  // status='active'. Other kinds (timestamp, duration) aren't pressure clocks
  // in the PRD's sense; they're timeline facts.
  const activeCountdowns: Sf2SceneKernelCountdown[] = Object.values(state.campaign.temporalAnchors ?? {})
    .filter((a) => a.status === 'active' && a.kind === 'deadline')
    .map((a) => ({
      id: a.id,
      label: a.label,
      deadlineLabel: a.anchorText,
      stakes: a.title,
    }))

  // Last visible state: tail of the most recent narrator prose. Useful for the
  // sentinel to scan for absent-speaker mentions and for log-level inspection.
  const lastTurn = state.history.turns[state.history.turns.length - 1]
  const lastVisibleState = lastTurn?.narratorProse
    ? truncateTail(lastTurn.narratorProse, LAST_VISIBLE_STATE_CHARS)
    : ''

  // Dramatic situation comes from the chapter frame's centralTension; physical
  // situation falls back to the location description plus established beats.
  const physicalSituation =
    [snapshot.location.description, ...(snapshot.established ?? [])]
      .filter(Boolean)
      .join(' · ')
      .slice(0, 280) || snapshot.location.name
  const dramaticSituation =
    state.chapter?.setup?.frame?.centralTension?.trim() || ''

  // Alias map: seed with each present/absent NPC's display name plus common
  // short-name variants. The absent-speaker sentinel scans exact aliases, so
  // "Auditor Pol" must also catch the natural prose form "Pol says".
  const aliasMap: Record<string, string[]> = {}
  for (const id of [...presentEntityIds, ...absentEntityIds]) {
    const npc = state.campaign.npcs[id]
    if (npc?.name) aliasMap[id] = buildNpcAliases(npc.name)
  }

  // legalTransitions stays empty in Phase A. Phase E will populate it from
  // chapter setup + scene context. The empty list communicates: no scene
  // transitions are pre-authorized; everything in forbiddenWithoutTransition
  // requires explicit narrated evidence.
  const legalTransitions: Sf2SceneKernelLegalTransition[] = []

  return {
    sceneId: snapshot.sceneId,
    chapterNumber: state.meta.currentChapter,
    location: {
      id: snapshot.location.id,
      name: snapshot.location.name,
    },
    time: {
      label: snapshot.timeLabel,
      activeCountdowns,
    },
    presentEntityIds,
    currentInterlocutorIds,
    nearbyEntityIds,
    absentEntityIds,
    speakingAllowedEntityIds,
    activeObjectIds: [],
    activeProcedureIds,
    currentPhysicalSituation: physicalSituation,
    currentDramaticSituation: dramaticSituation,
    lastVisibleState,
    unresolvedImmediateQuestions: [],
    forbiddenWithoutTransition: [...DEFAULT_FORBIDDEN_WITHOUT_TRANSITION],
    legalTransitions,
    aliasMap,
    version: turnIndex,
    updatedAtTurnId: turnId,
  }
}

// Absent = chapter starting NPCs + recently-seen NPCs not currently on-stage.
// Conservative: errs toward inclusion so the sentinel has a wider net for
// absent_speaker detection. False positives cost an extra check; false
// negatives let drift through.
function deriveAbsentEntityIds(state: Sf2State, presentEntityIds: string[]): string[] {
  const presentSet = new Set(presentEntityIds)
  const absent = new Set<string>()

  // Chapter setup's startingNpcIds: every NPC the chapter expected to feature.
  for (const id of state.chapter?.setup?.startingNpcIds ?? []) {
    if (!presentSet.has(id) && state.campaign.npcs[id]) absent.add(id)
  }

  // Recently-seen NPCs: any NPC with lastSeenTurn within the last 5 turns who
  // isn't currently on-stage. Captures "Pol was just here last scene" cases.
  const turnIndex = state.history.turns.length
  const recencyWindow = 5
  for (const npc of Object.values(state.campaign.npcs)) {
    if (presentSet.has(npc.id)) continue
    if (npc.status === 'dead' || npc.status === 'gone') continue
    if (typeof npc.lastSeenTurn === 'number' && turnIndex - npc.lastSeenTurn <= recencyWindow) {
      absent.add(npc.id)
    }
  }

  return [...absent]
}

function truncateTail(text: string, chars: number): string {
  if (text.length <= chars) return text
  return '…' + text.slice(-chars + 1)
}

function buildNpcAliases(name: string): string[] {
  const trimmed = name.trim()
  if (!trimmed) return []
  const aliases = new Set<string>([trimmed])
  const tokens = trimmed.split(/\s+/).filter(Boolean)
  const titleWords = new Set([
    'auditor',
    'warden',
    'elder',
    'chief',
    'minder',
    'factor',
    'officer',
    'clerk',
    'administrator',
    'administrative',
    'inspector',
    'captain',
    'doctor',
    'dr',
    'sir',
    'lady',
    'lord',
  ])
  const meaningful = tokens.filter((token) => !titleWords.has(token.toLowerCase().replace(/[^a-z]/g, '')))
  if (meaningful.length > 0) {
    aliases.add(meaningful[meaningful.length - 1])
  }
  if (tokens.length > 1) aliases.add(tokens[tokens.length - 1])
  return [...aliases]
}
