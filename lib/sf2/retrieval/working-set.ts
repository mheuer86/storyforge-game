// Scored working-set assembler.
// Pure function: given state + player input, returns a ranked inclusion list
// with explicit reasons per entity. The Narrator does not decide what matters
// — this function does. The GM escape hatch is `surface_threads` / `surface_npc_ids`
// set on the chapter runtime by code.

import type { Sf2EntityId, Sf2State, Sf2WorkingSet } from '../types'

const WEIGHTS = {
  PRESENT_IN_SCENE: 5,
  NAMED_IN_PLAYER_INPUT: 4,
  OWNER_OF_LIVE_SCENE_THREAD: 4,
  CHAPTER_SPINE: 3,
  CURRENT_PRESSURE_FACE: 3,
  MENTIONED_LAST_TURN: 3, // prose-level signal from the last Narrator output
  ADVANCED_RECENTLY: 2,
  ANCHORED_TO_SCENE: 2,
  LOAD_BEARING: 1,
  SURFACE_OVERRIDE: 6, // GM escape hatch beats default scoring
  DECAY_OFF_SCENE: -2,
  DECAY_DORMANT: -3,
  DECAY_RESOLVED: -4,
} as const

const MAX_FULL = 6
const MAX_STUB = 8
const MAX_FULL_THREADS = 5 // hard cap on thread-kind entities in full

interface Candidate {
  id: Sf2EntityId
  kind: 'npc' | 'faction' | 'thread' | 'decision' | 'promise' | 'clue' | 'beat'
  score: number
  reasons: string[]
}

function addScore(c: Candidate, delta: number, reason: string): void {
  c.score += delta
  c.reasons.push(`${delta >= 0 ? '+' : ''}${delta} ${reason}`)
}

function lowerContains(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase())
}

export function buildWorkingSet(
  state: Sf2State,
  playerInput: string,
  turnIndex: number
): Sf2WorkingSet {
  const candidates = new Map<Sf2EntityId, Candidate>()
  const reg = (
    id: Sf2EntityId,
    kind: Candidate['kind']
  ): Candidate => {
    let c = candidates.get(id)
    if (!c) {
      c = { id, kind, score: 0, reasons: [] }
      candidates.set(id, c)
    }
    return c
  }

  const { world, chapter, campaign, history } = state
  const setup = chapter.setup
  const sceneNpcIds = new Set(world.sceneSnapshot.presentNpcIds)
  const input = playerInput.trim()
  const recentTurns = history.turns.slice(-3)

  // Seed: present NPCs
  for (const npcId of sceneNpcIds) {
    const npc = campaign.npcs[npcId]
    if (!npc) continue
    const c = reg(npcId, 'npc')
    addScore(c, WEIGHTS.PRESENT_IN_SCENE, 'present in scene')
  }

  // Seed: NPCs/factions/threads named in current player input
  if (input.length > 0) {
    const lower = input.toLowerCase()
    for (const npc of Object.values(campaign.npcs)) {
      if (lowerContains(lower, npc.name)) {
        const c = reg(npc.id, 'npc')
        addScore(c, WEIGHTS.NAMED_IN_PLAYER_INPUT, `named in player input ("${npc.name}")`)
      }
    }
    for (const faction of Object.values(campaign.factions)) {
      if (lowerContains(lower, faction.name)) {
        const c = reg(faction.id, 'faction')
        addScore(c, WEIGHTS.NAMED_IN_PLAYER_INPUT, `named in player input ("${faction.name}")`)
      }
    }
    for (const thread of Object.values(campaign.threads)) {
      if (lowerContains(lower, thread.title)) {
        const c = reg(thread.id, 'thread')
        addScore(c, WEIGHTS.NAMED_IN_PLAYER_INPUT, `named in player input ("${thread.title}")`)
      }
    }
  }

  // Seed: scene-bundle threads (owner in scene OR stakeholder in scene OR spine).
  // Also: add owners as candidates so disposition/agenda travel with the thread.
  for (const thread of Object.values(campaign.threads)) {
    if (thread.status !== 'active') continue
    const ownerInScene =
      thread.owner.kind === 'npc' && sceneNpcIds.has(thread.owner.id)
    const stakeholderInScene = thread.stakeholders.some(
      (s) => s.kind === 'npc' && sceneNpcIds.has(s.id)
    )
    const isSpine = setup.spineThreadId === thread.id
    const isLoadBearing = setup.loadBearingThreadIds.includes(thread.id)
    if (ownerInScene || stakeholderInScene || isSpine) {
      const c = reg(thread.id, 'thread')
      if (ownerInScene) addScore(c, WEIGHTS.OWNER_OF_LIVE_SCENE_THREAD, 'owner on-stage')
      if (stakeholderInScene) addScore(c, WEIGHTS.ANCHORED_TO_SCENE, 'stakeholder on-stage')
      if (isSpine) addScore(c, WEIGHTS.CHAPTER_SPINE, 'chapter spine')
      if (isLoadBearing) addScore(c, WEIGHTS.LOAD_BEARING, 'load-bearing')
      // Surface the thread's owner too if not already in scene.
      if (thread.owner.kind === 'npc' && !sceneNpcIds.has(thread.owner.id)) {
        const ownerNpc = campaign.npcs[thread.owner.id]
        if (ownerNpc) {
          const oc = reg(thread.owner.id, 'npc')
          addScore(oc, 1, `owner of scene thread "${thread.title}"`)
        }
      } else if (thread.owner.kind === 'faction') {
        const faction = campaign.factions[thread.owner.id]
        if (faction) {
          const fc = reg(thread.owner.id, 'faction')
          addScore(fc, 1, `faction owner of scene thread "${thread.title}"`)
        }
      }
    }
  }

  // Seed: current pressure face (if its NPC id is resolvable).
  const faceId = setup.antagonistField.currentPrimaryFace.id
  const faceAsNpc = campaign.npcs[faceId]
  if (faceAsNpc) {
    const c = reg(faceId, 'npc')
    addScore(c, WEIGHTS.CURRENT_PRESSURE_FACE, 'current pressure face')
  }

  // Seed: entities touched in the MOST RECENT Narrator prose (strong signal).
  // Entities the prose just named should carry into the next turn.
  const lastTurn = history.turns.at(-1)
  if (lastTurn) {
    const prose = lastTurn.narratorProse.toLowerCase()
    const hints = lastTurn.narratorAnnotation?.hintedEntities
    // Hinted npcs: prefer canonical ids, fall back to name match against registry
    if (hints) {
      for (const ref of hints.npcsMentioned) {
        if (campaign.npcs[ref]) {
          const c = reg(ref, 'npc')
          addScore(c, WEIGHTS.MENTIONED_LAST_TURN, 'mentioned in last narrator turn')
        }
      }
      for (const ref of hints.threadsTouched) {
        const threadId = campaign.threads[ref]?.id
        if (threadId) {
          const c = reg(threadId, 'thread')
          addScore(c, WEIGHTS.MENTIONED_LAST_TURN, 'mentioned in last narrator turn')
        }
      }
    }
    // Also pull NPCs whose names appear in prose (catches NPCs the hint missed)
    for (const npc of Object.values(campaign.npcs)) {
      if (npc.name.length > 2 && prose.includes(npc.name.toLowerCase())) {
        const c = reg(npc.id, 'npc')
        if (!c.reasons.some((r) => r.includes('mentioned in last narrator turn'))) {
          addScore(c, WEIGHTS.MENTIONED_LAST_TURN, `named in last prose ("${npc.name}")`)
        }
      }
    }
  }

  // Seed: entities touched in older recent turns (weaker signal).
  // Drop the current-scene bonus for off-scene NPCs.
  for (const turn of recentTurns.slice(0, -1)) {
    const hints = turn.narratorAnnotation?.hintedEntities
    if (!hints) continue
    for (const npcRef of hints.npcsMentioned) {
      const npc = campaign.npcs[npcRef]
      if (npc && sceneNpcIds.has(npcRef)) {
        const c = reg(npcRef, 'npc')
        addScore(c, WEIGHTS.ADVANCED_RECENTLY, `touched in turn ${turn.index} (on-stage)`)
      }
    }
    for (const threadRef of hints.threadsTouched) {
      const threadId = campaign.threads[threadRef]?.id
      if (threadId) {
        const c = reg(threadId, 'thread')
        addScore(c, WEIGHTS.ADVANCED_RECENTLY, `touched in turn ${turn.index}`)
      }
    }
  }

  // Seed: thread.lastAdvancedTurn within the last 2 turns
  for (const thread of Object.values(campaign.threads)) {
    if (
      thread.lastAdvancedTurn !== undefined &&
      turnIndex - thread.lastAdvancedTurn <= 2 &&
      thread.status === 'active'
    ) {
      const c = reg(thread.id, 'thread')
      addScore(c, WEIGHTS.ADVANCED_RECENTLY, 'advanced in last 2 turns')
    }
  }

  // Seed: anchored decisions/promises/clues for scene-candidate threads.
  for (const [id, cand] of candidates) {
    if (cand.kind !== 'thread') continue
    const thread = campaign.threads[id]
    if (!thread) continue
    for (const decision of Object.values(campaign.decisions)) {
      if (decision.status === 'active' && decision.anchoredTo.includes(id)) {
        const dc = reg(decision.id, 'decision')
        addScore(dc, WEIGHTS.ANCHORED_TO_SCENE, `anchored to "${thread.title}"`)
      }
    }
    for (const promise of Object.values(campaign.promises)) {
      if (promise.status === 'active' && promise.anchoredTo.includes(id)) {
        const pc = reg(promise.id, 'promise')
        addScore(pc, WEIGHTS.ANCHORED_TO_SCENE, `anchored to "${thread.title}"`)
      }
    }
    for (const clue of Object.values(campaign.clues)) {
      if (clue.status === 'attached' && clue.anchoredTo.includes(id)) {
        const cc = reg(clue.id, 'clue')
        addScore(cc, WEIGHTS.ANCHORED_TO_SCENE, `anchored to "${thread.title}"`)
      }
    }
  }

  // Seed: floating clues whose content mentions any on-stage NPC or scene context
  const lowerInput = input.toLowerCase()
  for (const clueId of campaign.floatingClueIds) {
    const clue = campaign.clues[clueId]
    if (!clue) continue
    const content = clue.content.toLowerCase()
    for (const npcId of sceneNpcIds) {
      const npc = campaign.npcs[npcId]
      if (npc && content.includes(npc.name.toLowerCase())) {
        const c = reg(clue.id, 'clue')
        addScore(c, 2, `floating clue references on-stage ${npc.name}`)
        break
      }
    }
    if (lowerInput && content.includes(lowerInput.slice(0, 40))) {
      const c = reg(clue.id, 'clue')
      addScore(c, 2, 'floating clue matches player input')
    }
  }

  // GM override: surface_threads / surface_npc_ids
  for (const tid of setup.surfaceThreads) {
    if (campaign.threads[tid]) {
      const c = reg(tid, 'thread')
      addScore(c, WEIGHTS.SURFACE_OVERRIDE, 'gm surface override')
    }
  }
  for (const nid of setup.surfaceNpcIds) {
    if (campaign.npcs[nid]) {
      const c = reg(nid, 'npc')
      addScore(c, WEIGHTS.SURFACE_OVERRIDE, 'gm surface override')
    }
  }

  // Emotional beats ride on the graph rather than competing with full entity
  // slots. Surface the top three by graph relevance, salience, and recency.
  const beatScores = new Map<Sf2EntityId, Candidate>()
  for (const beat of Object.values(campaign.beats ?? {})) {
    let score = Math.round(beat.salience * 10)
    const reasons = [`salience ${beat.salience.toFixed(2)}`]
    const participantHit = beat.participants.some(
      (id) => sceneNpcIds.has(id) || candidates.has(id)
    )
    const anchorHit = beat.anchoredTo.some((id) => candidates.has(id))
    if (participantHit) {
      score += WEIGHTS.ANCHORED_TO_SCENE
      reasons.push(`+${WEIGHTS.ANCHORED_TO_SCENE} participant in scope`)
    }
    if (anchorHit) {
      score += WEIGHTS.ANCHORED_TO_SCENE
      reasons.push(`+${WEIGHTS.ANCHORED_TO_SCENE} anchor in scope`)
    }
    const age = Math.max(0, turnIndex - beat.turn)
    const recency = Math.max(0, 5 - Math.floor(age / 3))
    if (recency > 0) {
      score += recency
      reasons.push(`+${recency} recent`)
    }
    if (!participantHit && !anchorHit && recency === 0) continue
    beatScores.set(beat.id, { id: beat.id, kind: 'beat', score, reasons })
  }

  // Decay: off-scene / dormant / resolved
  for (const cand of candidates.values()) {
    if (cand.kind === 'thread') {
      const thread = campaign.threads[cand.id]
      if (!thread) continue
      if (thread.status !== 'active') {
        addScore(cand, WEIGHTS.DECAY_RESOLVED, 'resolved/inactive')
        continue
      }
      const lastTouch = thread.lastAdvancedTurn ?? thread.chapterCreated
      const ownerOnStage =
        thread.owner.kind === 'npc' && sceneNpcIds.has(thread.owner.id)
      const stakeholderOnStage = thread.stakeholders.some(
        (s) => s.kind === 'npc' && sceneNpcIds.has(s.id)
      )
      if (
        turnIndex - lastTouch > 5 &&
        !ownerOnStage &&
        !stakeholderOnStage
      ) {
        addScore(cand, WEIGHTS.DECAY_DORMANT, 'dormant 5+ turns off-stage')
      }
    }
    if (cand.kind === 'npc') {
      const npc = campaign.npcs[cand.id]
      if (!npc) continue
      const lastSeen = npc.lastSeenTurn ?? 0
      const offScene = !sceneNpcIds.has(cand.id)
      if (offScene && turnIndex - lastSeen >= 2) {
        addScore(cand, WEIGHTS.DECAY_OFF_SCENE, `off-scene ${turnIndex - lastSeen} turns`)
      }
      if (offScene && turnIndex - lastSeen > 5) {
        addScore(cand, WEIGHTS.DECAY_DORMANT, 'dormant 5+ turns')
      }
    }
  }

  // Rank and bucket.
  const ranked = [...candidates.values()].sort((a, b) => b.score - a.score)

  const fullIds: Sf2EntityId[] = []
  const stubIds: Sf2EntityId[] = []
  const excludedIds: Sf2EntityId[] = []
  let fullThreadCount = 0

  for (const cand of ranked) {
    if (cand.score < 0) {
      excludedIds.push(cand.id)
      continue
    }
    if (fullIds.length < MAX_FULL) {
      if (cand.kind === 'thread') {
        if (fullThreadCount >= MAX_FULL_THREADS) {
          if (stubIds.length < MAX_STUB) stubIds.push(cand.id)
          else excludedIds.push(cand.id)
          continue
        }
        fullThreadCount += 1
      }
      fullIds.push(cand.id)
    } else if (stubIds.length < MAX_STUB) {
      stubIds.push(cand.id)
    } else {
      excludedIds.push(cand.id)
    }
  }

  const reasonsByEntityId: Record<Sf2EntityId, string[]> = {}
  for (const cand of candidates.values()) {
    reasonsByEntityId[cand.id] = cand.reasons
  }
  const emotionalBeatIds = [...beatScores.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((b) => {
      reasonsByEntityId[b.id] = b.reasons
      return b.id
    })

  return {
    fullEntityIds: fullIds,
    stubEntityIds: stubIds,
    excludedEntityIds: excludedIds,
    emotionalBeatIds,
    reasonsByEntityId,
    computedAtTurn: turnIndex,
  }
}
