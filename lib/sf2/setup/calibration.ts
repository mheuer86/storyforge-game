import { getGenreConfig, type Genre } from '../../genre-config'
import { getSf2SetupHook, getSf2SetupOrigin, getSf2SetupPlaybook } from './options'
import type {
  Sf2SetupCalibrationAnswer,
  Sf2SetupCalibrationTheme,
  Sf2SetupSelection,
} from './types'

export const MAX_SF2_SETUP_CALIBRATION_ANSWERS = 5

const THEME_ORDER: Sf2SetupCalibrationTheme[] = [
  'oath',
  'belief',
  'debt',
  'opening_pressure',
  'tone',
]

const THEME_SET = new Set<string>([
  ...THEME_ORDER,
  'fear',
  'relationship',
])

export function isSf2SetupCalibrationTheme(value: unknown): value is Sf2SetupCalibrationTheme {
  return typeof value === 'string' && THEME_SET.has(value)
}

export function clampSf2SetupCalibrationAnswers(
  answers: Array<{ question: string; answer: string; theme?: unknown }> | undefined
): Sf2SetupCalibrationAnswer[] {
  if (!Array.isArray(answers)) return []
  return answers
    .map((entry) => ({
      question: entry.question.trim().replace(/\s+/g, ' ').slice(0, 220),
      answer: entry.answer.trim().replace(/\s+/g, ' ').slice(0, 500),
      ...(isSf2SetupCalibrationTheme(entry.theme) ? { theme: entry.theme } : {}),
    }))
    .filter((entry) => entry.question.length > 0 && entry.answer.length > 0)
    .slice(0, MAX_SF2_SETUP_CALIBRATION_ANSWERS)
}

export function getNextSf2SetupCalibrationQuestion(
  selection: Pick<Sf2SetupSelection, 'genreId' | 'originId' | 'playbookId' | 'hookId'>,
  answers: Sf2SetupCalibrationAnswer[] | undefined
): { question: string; theme: Sf2SetupCalibrationTheme; index: number } | null {
  const clamped = clampSf2SetupCalibrationAnswers(answers)
  if (clamped.length >= MAX_SF2_SETUP_CALIBRATION_ANSWERS) return null

  const theme = THEME_ORDER[clamped.length] ?? 'tone'
  const config = getGenreConfig(selection.genreId as Genre)
  const origin = getSf2SetupOrigin(config, selection.originId)
  const playbook = getSf2SetupPlaybook(config, origin.id, selection.playbookId)
  const hook = getSf2SetupHook(config, origin.id, playbook, selection.hookId)
  const hookTitle = hook.title?.trim() || config.initialChapterTitle || 'the opening pressure'

  const questionByTheme: Record<Sf2SetupCalibrationTheme, string> = {
    oath: `What promise has ${playbook.name} made to themself, their crew, their home, or a person they cannot disappoint?`,
    belief: `What belief does ${playbook.name} refuse to give up, even when it makes ${hookTitle} harder?`,
    debt: `Who or what does ${playbook.name} already owe before ${hookTitle} begins?`,
    fear: `What truth would make ${playbook.name} hesitate at the worst possible moment?`,
    relationship: `Whose opinion still matters to ${playbook.name}, even if they would never admit it?`,
    opening_pressure: `What personal line should ${hookTitle} pressure first?`,
    tone: `When this campaign gets intense, should it lean more toward intimacy, danger, wonder, or moral cost?`,
  }

  return {
    question: questionByTheme[theme],
    theme,
    index: clamped.length,
  }
}

export function renderSf2SetupCalibrationSummary(
  answers: Sf2SetupCalibrationAnswer[] | undefined
): string | undefined {
  const clamped = clampSf2SetupCalibrationAnswers(answers)
  if (clamped.length === 0) return undefined
  return clamped
    .map((entry, index) => `${index + 1}. ${entry.question} ${entry.answer}`)
    .join('\n')
}
