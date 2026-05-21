import type {
  Sf2ChapterPlaystyleArtifact,
  Sf2PlaystyleEvidenceRef,
  Sf2PlaystyleKnobCalibration,
  Sf2PlaystylePattern,
} from '../types'

export const SF2_PLAYSTYLE_KNOBS = [
  'informationEconomy',
  'decisionArchitecture',
  'consequenceTiming',
  'emotionalRegister',
  'npcLegibility',
  'errorTolerance',
] as const

export type Sf2PlaystyleKnob = (typeof SF2_PLAYSTYLE_KNOBS)[number]

export type { Sf2PlaystyleEvidenceRef, Sf2PlaystyleKnobCalibration, Sf2PlaystylePattern }
export type Sf2PlaystyleArtifact = Sf2ChapterPlaystyleArtifact

export interface Sf2PlaystyleValidationFinding {
  field: string
  severity: 'warning' | 'error'
  message: string
}
