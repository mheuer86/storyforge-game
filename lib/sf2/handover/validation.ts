import type {
  Sf2HandoverDiagnostic,
  Sf2HandoverDocuments,
} from './types'

const REQUIRED_SECTIONS: Record<keyof Sf2HandoverDocuments, string[]> = {
  sessionBrief: [
    'Header',
    'How To Use This Document',
    'GM Style',
    'Setting',
    'Game System',
    'Character Sheet',
    'NPC Roster',
    'Active Threads',
    'Tension Clocks',
    'Opening Conditions',
    'Chapter Shape',
  ],
  gmMemory: [
    'The Player',
    'The Character',
    'What Worked',
    "What Didn't Work",
    'Pacing Notes',
    'Tone Notes',
    'Things To Watch For',
    'Wishes For Future Chapters',
    'Roll Log',
    'Chapter Debrief',
  ],
  quickReference: [
    'Core Block',
    'Rolls To Reach For',
    'The Three Tensions',
    'Active Clocks',
    'What They Carry',
    'What Drives Them',
  ],
}

const CROSS_DOCUMENT_MARKERS: Record<keyof Sf2HandoverDocuments, string[]> = {
  sessionBrief: ['## GM Memory', '# GM Memory', '## Character Quick Reference', '# Character Quick Reference'],
  gmMemory: ['## Session Brief', '# Session Brief', '## Character Quick Reference', '# Character Quick Reference'],
  quickReference: ['## Session Brief', '# Session Brief', '## GM Memory', '# GM Memory'],
}

function normalizeHeading(value: string): string {
  return value
    .toLowerCase()
    .replace(/[—–-].*$/, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function headingRegex(section: string): RegExp {
  const escaped = section.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`^#{1,4}\\s+${escaped}(?:\\s|$|[—:-])`, 'im')
}

function hasSection(document: string, section: string): boolean {
  if (headingRegex(section).test(document)) return true
  const normalizedSection = normalizeHeading(section)
  return document
    .split('\n')
    .some((line) => {
      const trimmed = line
        .replace(/^#{1,6}\s+/, '')
        .replace(/^\d+[\s.·—:-]+/, '')
        .trim()
      return normalizeHeading(trimmed).startsWith(normalizedSection)
    })
}

export function normalizeHandoverDocuments(input: unknown): Sf2HandoverDocuments {
  const value = input as Partial<Record<keyof Sf2HandoverDocuments, unknown>>
  return {
    sessionBrief: String(value.sessionBrief ?? '').trim(),
    gmMemory: String(value.gmMemory ?? '').trim(),
    quickReference: String(value.quickReference ?? '').trim(),
  }
}

export function validateHandoverDocuments(
  documents: Sf2HandoverDocuments,
  mechanicalState: unknown
): Sf2HandoverDiagnostic[] {
  const diagnostics: Sf2HandoverDiagnostic[] = []

  for (const [documentKey, requiredSections] of Object.entries(REQUIRED_SECTIONS) as [
    keyof Sf2HandoverDocuments,
    string[],
  ][]) {
    const document = documents[documentKey]
    if (!document) {
      diagnostics.push({
        code: 'handover_document_empty',
        severity: 'error',
        document: documentKey,
        message: `${documentKey} is empty.`,
      })
      continue
    }

    for (const section of requiredSections) {
      if (!hasSection(document, section)) {
        diagnostics.push({
          code: 'handover_missing_section',
          severity: 'warning',
          document: documentKey,
          section,
          message: `${documentKey} is missing required section "${section}".`,
        })
      }
    }

    for (const marker of CROSS_DOCUMENT_MARKERS[documentKey]) {
      if (document.includes(marker)) {
        diagnostics.push({
          code: 'handover_document_merged',
          severity: 'warning',
          document: documentKey,
          message: `${documentKey} appears to include another handover document marker: ${marker}.`,
        })
      }
    }
  }

  diagnostics.push(...validateMechanicalEcho(documents, mechanicalState))
  return diagnostics
}

function validateMechanicalEcho(
  documents: Sf2HandoverDocuments,
  mechanicalState: unknown
): Sf2HandoverDiagnostic[] {
  const diagnostics: Sf2HandoverDiagnostic[] = []
  const state = mechanicalState as Record<string, unknown>
  const character = state.character as Record<string, unknown> | undefined
  const hp = character?.hp
  const hpCurrent = typeof hp === 'object' && hp ? (hp as Record<string, unknown>).current : state.hpCurrent
  const hpMax = typeof hp === 'object' && hp ? (hp as Record<string, unknown>).max : state.hpMax
  const combined = `${documents.sessionBrief}\n${documents.quickReference}`

  if (typeof hpCurrent === 'number' && typeof hpMax === 'number') {
    const expected = `${hpCurrent}/${hpMax}`
    if (!combined.includes(expected)) {
      diagnostics.push({
        code: 'handover_mechanical_echo_missing',
        severity: 'info',
        message: `Authoritative HP is ${expected}, but that exact value was not found in Session Brief or Quick Reference.`,
      })
    }
  }

  return diagnostics
}

export function hasBlockingHandoverDiagnostics(diagnostics: Sf2HandoverDiagnostic[]): boolean {
  return diagnostics.some((diagnostic) => diagnostic.severity === 'error')
}
