export interface Sf2HandoverTranscriptEntry {
  role: 'player' | 'narrator' | 'system' | 'mechanics' | 'other'
  content: string
  turn?: number
  chapter?: number
  timestamp?: string
}

export interface Sf2HandoverMechanicalState {
  chapter?: number
  turn?: number
  character?: unknown
  clocks?: unknown
  inventory?: unknown
  wounds?: unknown
  rolls?: unknown
  state?: unknown
}

export interface Sf2HandoverMiniDebrief {
  title?: string
  content: string
  turn?: number
  scene?: string
}

export interface Sf2HandoverCompileRequest {
  transcript: string | Sf2HandoverTranscriptEntry[]
  mechanicalState: Sf2HandoverMechanicalState | Record<string, unknown>
  currentBrief: string
  sessionBrief?: string
  previousGmMemory?: string
  miniDebriefs?: Sf2HandoverMiniDebrief[]
  campaignName?: string
  chapterNumber?: number
  model?: string
}

export interface Sf2HandoverDocuments {
  sessionBrief: string
  gmMemory: string
  quickReference: string
}

export type Sf2HandoverSeverity = 'info' | 'warning' | 'error'

export interface Sf2HandoverDiagnostic {
  code: string
  severity: Sf2HandoverSeverity
  message: string
  document?: keyof Sf2HandoverDocuments
  section?: string
}

export interface Sf2HandoverUsage {
  inputTokens: number
  outputTokens: number
  cacheWriteTokens: number
  cacheReadTokens: number
}

export interface Sf2HandoverCompileSuccess {
  ok: true
  documents: Sf2HandoverDocuments
  diagnostics: Sf2HandoverDiagnostic[]
  usage?: Sf2HandoverUsage
  latency?: {
    totalMs: number
    apiMs: number
  }
  model: string
}

export interface Sf2HandoverCompileFailure {
  ok: false
  documents: null
  diagnostics: Sf2HandoverDiagnostic[]
  error: string
  message?: string
  status?: number
  usage?: Partial<Sf2HandoverUsage>
  latency?: {
    totalMs: number
    apiMs?: number
  }
  model: string
}

export type Sf2HandoverCompileResult =
  | Sf2HandoverCompileSuccess
  | Sf2HandoverCompileFailure
