export type Sf2SetupCalibrationTheme =
  | 'oath'
  | 'belief'
  | 'debt'
  | 'fear'
  | 'relationship'
  | 'tone'
  | 'opening_pressure'

export interface Sf2SetupCalibrationAnswer {
  question: string
  answer: string
  theme?: Sf2SetupCalibrationTheme
}

export interface Sf2SetupSelection {
  genreId: string
  originId: string
  playbookId: string
  hookId: string
  characterName?: string
  calibrationAnswers?: Sf2SetupCalibrationAnswer[]
}

export interface Sf2SetupGenreOption {
  id: string
  name: string
}

export interface Sf2SetupOriginOption {
  id: string
  name: string
  description: string
}

export interface Sf2SetupPlaybookOption {
  id: string
  name: string
  concept: string
}

export interface Sf2SetupHookOption {
  id: string
  title: string
  premise: string
  objective?: string
  crucible?: string
  arcName?: string
  firstEpisode?: string
}
