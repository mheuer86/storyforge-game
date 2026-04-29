// Pure-code transform: AuthorChapterSetupV2 → { runtimeState, scaffolding, openingSeed }
//
// The load-bearing move: authored content splits three ways.
//   runtimeState: persisted, retrieval-facing
//   scaffolding:  system-only, NEVER reaches Narrator raw
//   openingSeed:  Narrator-facing, first scene only
//
// See docs/storyforge-2-design.md §3 "Author output + three-way transform."

import type {
  AuthorChapterSetupV2,
  Sf2AntagonistFace,
  Sf2AntagonistPossibleFace,
  Sf2ChapterNumber,
  Sf2ChapterSetupRuntimeState,
  Sf2ChapterSetupScaffolding,
  Sf2EntityId,
  Sf2OpeningScenePacketSeed,
  Sf2ThreadStatus,
} from '../types'

export interface ChapterSetupTransformResult {
  chapter: Sf2ChapterNumber
  runtimeState: Sf2ChapterSetupRuntimeState
  scaffolding: Sf2ChapterSetupScaffolding
  openingSeed: Sf2OpeningScenePacketSeed
  threadTransitions: Array<{ id: string; toStatus: Sf2ThreadStatus; reason: string }>
}

export function transformAuthorSetup(
  authored: AuthorChapterSetupV2,
  chapter: Sf2ChapterNumber
): ChapterSetupTransformResult {
  // Resolve defaultFace into Sf2AntagonistFace (needs id). If authored payload
  // provides possibleFaces with matching name, use that id; otherwise synthesize
  // one.
  const defaultFaceMatch = authored.antagonistField.possibleFaces.find(
    (f) => f.name === authored.antagonistField.defaultFace.name
  )
  const defaultFaceId = defaultFaceMatch?.id ?? 'face_default'
  const defaultFace: Sf2AntagonistFace = {
    id: defaultFaceId,
    name: authored.antagonistField.defaultFace.name,
    role: authored.antagonistField.defaultFace.role,
    pressureStyle: authored.antagonistField.defaultFace.pressureStyle,
  }
  const loadBearingThreadIds = authored.activeThreads
    .filter((t) => t.tension >= 6)
    .map((t) => t.id)
  const successorThreadIds = authored.activeThreads
    .filter((t) => t.driverKind === 'successor')
    .map((t) => t.id)
  const newPressureThreadIds = authored.activeThreads
    .filter((t) => t.driverKind === 'new_pressure')
    .map((t) => t.id)
  const preferredDriver = authored.activeThreads.find(
    (t) => (t.driverKind === 'successor' || t.driverKind === 'new_pressure') && t.tension >= 6
  )
  const preferredLoadBearing = authored.activeThreads.find((t) => t.tension >= 6)

  const runtimeState: Sf2ChapterSetupRuntimeState = {
    chapter,
    title: authored.chapterFrame.title,
    frame: authored.chapterFrame,
    antagonistField: {
      sourceSystem: authored.antagonistField.sourceSystem,
      corePressure: authored.antagonistField.corePressure,
      defaultFace,
      currentPrimaryFace: { ...defaultFace },
      escalationLogic: authored.antagonistField.escalationLogic,
    },
    startingNpcIds: authored.startingNPCs.map((n) => n.id),
    activeThreadIds: authored.activeThreads.map((t) => t.id),
    spineThreadId: preferredDriver?.id ?? preferredLoadBearing?.id ?? authored.activeThreads[0]?.id,
    loadBearingThreadIds,
    carriedThreadIds: authored.activeThreads
      .filter((t) => t.driverKind === 'carry_forward')
      .map((t) => t.id),
    successorThreadIds,
    newPressureThreadIds,
    editorializedLore: authored.editorializedLore,
    openingSceneSpec: authored.openingSceneSpec,
    pressureLadder: authored.pressureLadder.map((step) => ({
      id: step.id,
      pressure: step.pressure,
      triggerCondition: step.triggerCondition,
      narrativeEffect: step.narrativeEffect,
      severity: step.severity ?? 'standard',
      fired: false,
    })),
    threadPressure: {},
    threadInitialTensions: Object.fromEntries(
      authored.activeThreads
        .filter((t) => typeof t.initialTension === 'number')
        .map((t) => [t.id, t.initialTension as number])
    ),
    arcLink: authored.arcLink,
    pacingContract: authored.pacingContract,
    surfaceThreads: [],
    surfaceNpcIds: [],
  }

  const antagonistFaces: Sf2AntagonistPossibleFace[] = authored.antagonistField.possibleFaces.map(
    (face) => ({
      id: face.id,
      name: face.name,
      role: face.role,
      pressureStyle: face.pressureStyle,
      becomesPrimaryWhen: face.becomesPrimaryWhen,
      active: face.name === authored.antagonistField.defaultFace.name,
    })
  )

  const scaffolding: Sf2ChapterSetupScaffolding = {
    chapter,
    npcHiddenPressures: Object.fromEntries(
      authored.startingNPCs.map((n) => [n.id, n.hiddenPressure])
    ),
    antagonistFaces,
    possibleRevelations: authored.possibleRevelations.map((r) => ({
      id: r.id,
      statement: r.statement,
      heldBy: r.heldBy,
      emergenceCondition: r.emergenceCondition,
      recontextualizes: r.recontextualizes,
      revealed: false,
      hintPhrases: r.hintPhrases ?? [],
      hintsRequired: r.hintsRequired ?? (r.hintPhrases && r.hintPhrases.length > 0 ? 2 : 0),
      hintsDelivered: 0,
      hintEvidence: [],
      validRevealContexts: r.validRevealContexts ?? [],
      invalidRevealContexts: r.invalidRevealContexts,
    })),
    moralFaultLines: authored.moralFaultLines,
    escalationOptions: authored.escalationOptions.map((e) => ({
      id: e.id,
      type: e.type,
      condition: e.condition,
      consequence: e.consequence,
      used: false,
    })),
    continuationMoves: authored.continuationMoves,
  }

  // Opening visibility: prefer the Author's explicit visibleNpcIds (new field)
  // over the legacy all-startingNPCs-visible default. The all-visible default
  // collapses opening scenes into convened-room tableaus (table/hearing/audit)
  // regardless of hook. Narrowing to 1-2 visible NPCs lets the opening vector
  // breathe — other startingNPCs still exist in the chapter, just not on-stage
  // at opening.
  const startingNpcIdSet = new Set(authored.startingNPCs.map((n) => n.id))
  const authorVisibleNpcIds = (authored.openingSceneSpec.visibleNpcIds ?? [])
    .filter((id) => startingNpcIdSet.has(id))
  const visibleNpcIds: Sf2EntityId[] =
    authorVisibleNpcIds.length > 0
      ? authorVisibleNpcIds
      : authored.startingNPCs.slice(0, 2).map((n) => n.id)
  const visibleThreadIds: Sf2EntityId[] = authored.activeThreads
    .filter((t) => t.tension >= 5)
    .map((t) => t.id)
    .slice(0, 3) // keep the opening's visible thread list tight

  const openingSeed: Sf2OpeningScenePacketSeed = {
    sceneIntent: authored.openingSceneSpec.immediateChoice,
    openingPressure: authored.chapterFrame.activePressure,
    chapterObjective: authored.chapterFrame.objective,
    chapterCrucible: authored.chapterFrame.crucible,
    visibleNpcIds,
    visibleThreadIds,
    loreForOpening: authored.editorializedLore.slice(0, 2).map((item) => ({
      item: item.item,
      renderedHint: item.deliveryMethod,
    })),
    sceneWarnings: [
      'Do not open with exposition.',
      'Use visible procedure and role behavior to teach the world.',
      'Keep the current pressure face live without implying it is permanent.',
    ],
    withheldPremiseFacts: authored.openingSceneSpec.withheldPremiseFacts,
  }

  return {
    chapter,
    runtimeState,
    scaffolding,
    openingSeed,
    threadTransitions: authored.threadTransitions ?? [],
  }
}
