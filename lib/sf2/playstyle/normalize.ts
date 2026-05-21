import type { Sf2State } from '../types'
import {
  SF2_PLAYSTYLE_KNOBS,
  type Sf2PlaystyleArtifact,
  type Sf2PlaystyleEvidenceRef,
  type Sf2PlaystyleKnob,
  type Sf2PlaystyleKnobCalibration,
  type Sf2PlaystylePattern,
  type Sf2PlaystyleValidationFinding,
} from './types'

type RawRecord = Record<string, unknown>

const DEFAULT_KNOB: Sf2PlaystyleKnobCalibration = {
  value: 'insufficient evidence',
  guidance: 'Do not personalize this axis yet; keep default Storyforge pacing and clarity.',
  confidence: 'low',
  evidence: [],
}

export function normalizePlaystyleArtifact(
  raw: unknown,
  state: Sf2State
): { artifact: Sf2PlaystyleArtifact; validationFindings: Sf2PlaystyleValidationFinding[] } {
  const input = isRecord(raw) ? raw : {}
  const rawKnobs = isRecord(input.knobs) ? input.knobs : {}
  const findings: Sf2PlaystyleValidationFinding[] = []

  const artifact: Sf2PlaystyleArtifact = {
    chapter: state.meta.currentChapter,
    synthesizedAtTurn: state.history.turns.at(-1)?.index ?? state.history.turns.length,
    summary: compact(String(input.summary ?? ''), 700),
    informationEconomy: normalizeKnob(input.informationEconomy ?? rawKnobs.informationEconomy, state, 'informationEconomy', findings),
    decisionArchitecture: normalizeKnob(input.decisionArchitecture ?? rawKnobs.decisionArchitecture, state, 'decisionArchitecture', findings),
    consequenceTiming: normalizeKnob(input.consequenceTiming ?? rawKnobs.consequenceTiming, state, 'consequenceTiming', findings),
    emotionalRegister: normalizeKnob(input.emotionalRegister ?? rawKnobs.emotionalRegister, state, 'emotionalRegister', findings),
    npcLegibility: normalizeKnob(input.npcLegibility ?? rawKnobs.npcLegibility, state, 'npcLegibility', findings),
    errorTolerance: normalizeKnob(input.errorTolerance ?? rawKnobs.errorTolerance, state, 'errorTolerance', findings),
    workedPatterns: normalizePatterns(input.workedPatterns, state, 'workedPatterns', findings),
    avoidPatterns: normalizePatterns(input.avoidPatterns, state, 'avoidPatterns', findings),
  }

  for (const knob of SF2_PLAYSTYLE_KNOBS) {
    const entry = artifact[knob]
    if (entry.evidence.length === 0) {
      findings.push({ field: `${knob}.evidence`, severity: 'warning', message: `${knob} has no usable evidence references` })
    }
  }

  return { artifact, validationFindings: findings }
}

export function renderPlaystyleProfileBlock(artifact: Sf2PlaystyleArtifact): string {
  const knobLines = SF2_PLAYSTYLE_KNOBS.map((knob) => {
    const entry = artifact[knob]
    return `- ${labelKnob(knob)} (${entry.confidence}): ${entry.value}. ${entry.guidance}`
  })
  const worked = artifact.workedPatterns
    .slice(0, 3)
    .map((p) => `- Worked: ${p.pattern} - ${p.guidance}`)
  const avoid = artifact.avoidPatterns
    .slice(0, 3)
    .map((p) => `- Avoid: ${p.pattern} - ${p.guidance}`)

  return [
    `## Campaign-local playstyle profile`,
    `Chapter ${artifact.chapter}, synthesized at turn ${artifact.synthesizedAtTurn}.`,
    artifact.summary || renderFallbackSummary(artifact),
    '',
    ...knobLines,
    ...worked,
    ...avoid,
  ].join('\n')
}

export function renderPlaystyleProfileSummary(artifact: Sf2PlaystyleArtifact): string {
  return compact(
    `${artifact.summary || renderFallbackSummary(artifact)} ${SF2_PLAYSTYLE_KNOBS.map((knob) => {
      const entry = artifact[knob]
      return `${labelKnob(knob)}: ${entry.value}`
    }).join('; ')}`,
    900
  )
}

function normalizeKnob(
  value: unknown,
  state: Sf2State,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystyleKnobCalibration {
  if (!isRecord(value)) {
    findings.push({ field, severity: 'error', message: 'missing knob calibration object' })
    return DEFAULT_KNOB
  }
  return {
    value: compact(String(value.value ?? ''), 140) || DEFAULT_KNOB.value,
    guidance: compact(String(value.guidance ?? ''), 320) || DEFAULT_KNOB.guidance,
    confidence: normalizeConfidence(value.confidence, field, findings),
    evidence: normalizeEvidenceList(value.evidence, state, `${field}.evidence`, findings),
  }
}

function normalizePatterns(
  value: unknown,
  state: Sf2State,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystylePattern[] {
  if (!Array.isArray(value)) {
    findings.push({ field, severity: 'warning', message: 'missing pattern list' })
    return []
  }
  return value
    .map((item, index) => normalizePattern(item, state, `${field}.${index}`, findings))
    .filter((item): item is Sf2PlaystylePattern => Boolean(item))
    .slice(0, 5)
}

function normalizePattern(
  value: unknown,
  state: Sf2State,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystylePattern | null {
  if (!isRecord(value)) {
    findings.push({ field, severity: 'warning', message: 'invalid pattern object' })
    return null
  }
  const pattern = compact(String(value.pattern ?? ''), 220)
  const guidance = compact(String(value.guidance ?? ''), 320)
  if (!pattern || !guidance) {
    findings.push({ field, severity: 'warning', message: 'pattern or guidance is empty' })
  }
  const evidence = normalizeEvidenceList(value.evidence, state, `${field}.evidence`, findings)
  if (evidence.length === 0) {
    findings.push({ field: `${field}.evidence`, severity: 'warning', message: 'pattern has no usable evidence references' })
  }
  return {
    pattern: pattern || 'unspecified pattern',
    guidance: guidance || 'Keep default GM handling until stronger evidence appears.',
    evidence,
  }
}

function normalizeEvidenceList(
  value: unknown,
  state: Sf2State,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystyleEvidenceRef[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item, index) => normalizeEvidence(item, state, `${field}.${index}`, findings))
    .filter((item): item is Sf2PlaystyleEvidenceRef => Boolean(item))
    .slice(0, 4)
}

function normalizeEvidence(
  value: unknown,
  state: Sf2State,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystyleEvidenceRef | null {
  if (!isRecord(value)) {
    findings.push({ field, severity: 'warning', message: 'invalid evidence reference' })
    return null
  }
  const kind = normalizeEvidenceKind(value.kind)
  const chapter = normalizePositiveNumber(value.chapter) ?? state.meta.currentChapter
  const turnIndex = normalizePositiveNumber(value.turnIndex ?? value.turn ?? value.turn_index)
  const summaryIndex = normalizePositiveNumber(value.summaryIndex ?? value.summary_index)
  const note = compact(String(value.note ?? ''), 260)
  const excerpt =
    compact(String(value.excerpt ?? value.quote ?? ''), 180) ||
    note ||
    'Evidence reference supplied without an excerpt.'
  const evidence: Sf2PlaystyleEvidenceRef = {
    kind,
    chapter,
    excerpt,
    ...(note ? { note } : {}),
  }
  if (turnIndex !== undefined) evidence.turnIndex = turnIndex
  if (summaryIndex !== undefined) evidence.summaryIndex = summaryIndex

  if (kind === 'turn' && turnIndex !== undefined && !state.history.turns.some((t) => t.index === turnIndex)) {
    findings.push({ field, severity: 'warning', message: `turn ${turnIndex} does not exist in state.history.turns` })
  }
  if (kind === 'scene_summary' && summaryIndex !== undefined && !state.chapter.sceneSummaries[summaryIndex - 1]) {
    findings.push({ field, severity: 'warning', message: `scene summary ${summaryIndex} does not exist in current chapter` })
  }
  return evidence
}

function normalizeConfidence(
  value: unknown,
  field: string,
  findings: Sf2PlaystyleValidationFinding[]
): Sf2PlaystyleKnobCalibration['confidence'] {
  if (value === 'low' || value === 'medium' || value === 'high') return value
  findings.push({ field: `${field}.confidence`, severity: 'warning', message: 'invalid confidence; defaulted to low' })
  return 'low'
}

function normalizeEvidenceKind(value: unknown): Sf2PlaystyleEvidenceRef['kind'] {
  return value === 'turn' || value === 'scene_summary' || value === 'chapter_artifact' || value === 'setup_rationale'
    ? value
    : value === 'chapter_meaning' || value === 'state'
      ? 'chapter_artifact'
    : 'turn'
}

function normalizePositiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.floor(value)
    : undefined
}

function renderFallbackSummary(artifact: Pick<Sf2PlaystyleArtifact, Sf2PlaystyleKnob>): string {
  return `Playstyle calibration remains tentative: ${SF2_PLAYSTYLE_KNOBS.map((knob) => `${labelKnob(knob)}=${artifact[knob].value}`).join('; ')}.`
}

function labelKnob(knob: Sf2PlaystyleKnob): string {
  return knob.replace(/[A-Z]/g, (match) => ` ${match.toLowerCase()}`)
}

function compact(value: string, max: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, max)
}

function isRecord(value: unknown): value is RawRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
