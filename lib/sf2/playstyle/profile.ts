import type {
  Sf2CampaignPlaystyleProfile,
  Sf2ChapterPlaystyleArtifact,
  Sf2PlaystylePersonalizationState,
  Sf2State,
} from '../types'

const MAX_PROFILE_PATTERNS = 8
const MAX_REVISION_NOTES = 8

export function isPlaystylePersonalizationLive(state: Sf2State): boolean {
  return state.campaign.playstylePersonalization?.liveEnabled !== false
}

export function markPlaystylePersonalizationStatus(
  state: Sf2State,
  status: NonNullable<Sf2PlaystylePersonalizationState['lastStatus']>['status'],
  reason?: string
): void {
  const surface = ensurePlaystylePersonalizationState(state)
  surface.lastStatus = {
    status,
    chapter: state.meta.currentChapter,
    turn: state.history.turns.length,
    ...(reason ? { reason } : {}),
  }
}

export function applyChapterPlaystyleArtifact(
  state: Sf2State,
  artifact: Sf2ChapterPlaystyleArtifact
): void {
  const surface = ensurePlaystylePersonalizationState(state)
  surface.artifacts = [
    ...surface.artifacts.filter((entry) => entry.chapter !== artifact.chapter),
    artifact,
  ].sort((a, b) => a.chapter - b.chapter)
  surface.rollingProfile = updateRollingPlaystyleProfile(surface.rollingProfile, artifact)
  surface.lastStatus = {
    status: surface.liveEnabled ? 'enabled' : 'disabled',
    chapter: artifact.chapter,
    turn: artifact.synthesizedAtTurn,
  }
  state.chapter.artifacts.playstyle = artifact
}

export function updateRollingPlaystyleProfile(
  prior: Sf2CampaignPlaystyleProfile | undefined,
  artifact: Sf2ChapterPlaystyleArtifact
): Sf2CampaignPlaystyleProfile {
  const evidenceChapters = uniqueNumbers([
    ...(prior?.evidenceChapters ?? []),
    artifact.chapter,
  ])
  return {
    updatedAtChapter: artifact.chapter,
    updatedAtTurn: artifact.synthesizedAtTurn,
    evidenceChapters,
    informationEconomy: profileLine(artifact.informationEconomy),
    decisionArchitecture: profileLine(artifact.decisionArchitecture),
    consequenceTiming: profileLine(artifact.consequenceTiming),
    emotionalRegister: profileLine(artifact.emotionalRegister),
    npcLegibility: profileLine(artifact.npcLegibility),
    errorTolerance: profileLine(artifact.errorTolerance),
    workedPatterns: mergePatterns(
      prior?.workedPatterns ?? [],
      artifact.workedPatterns.map((pattern) => `${pattern.pattern}: ${pattern.guidance}`)
    ),
    avoidPatterns: mergePatterns(
      prior?.avoidPatterns ?? [],
      artifact.avoidPatterns.map((pattern) => `${pattern.pattern}: ${pattern.guidance}`)
    ),
    revisionNotes: mergePatterns(
      prior?.revisionNotes ?? [],
      [`Chapter ${artifact.chapter}: ${artifact.summary || 'playstyle profile updated from observed play.'}`],
      MAX_REVISION_NOTES
    ),
  }
}

function ensurePlaystylePersonalizationState(state: Sf2State): Sf2PlaystylePersonalizationState {
  if (!state.campaign.playstylePersonalization) {
    state.campaign.playstylePersonalization = {
      liveEnabled: true,
      artifacts: [],
      lastStatus: { status: 'enabled' },
    }
  }
  state.campaign.playstylePersonalization.artifacts =
    state.campaign.playstylePersonalization.artifacts ?? []
  return state.campaign.playstylePersonalization
}

function profileLine(
  knob: Sf2ChapterPlaystyleArtifact['informationEconomy']
): string {
  return [knob.value, knob.guidance]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(' - ')
}

function mergePatterns(
  prior: string[],
  next: string[],
  limit = MAX_PROFILE_PATTERNS
): string[] {
  const seen = new Set<string>()
  const merged: string[] = []
  for (const value of [...next, ...prior]) {
    const trimmed = value.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(trimmed)
    if (merged.length >= limit) break
  }
  return merged
}

function uniqueNumbers(values: number[]): number[] {
  return Array.from(new Set(values.filter((value) => Number.isFinite(value) && value > 0))).sort((a, b) => a - b)
}
