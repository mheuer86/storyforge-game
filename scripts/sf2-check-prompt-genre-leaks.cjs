const fs = require('node:fs')
const path = require('node:path')

const repoRoot = path.resolve(__dirname, '..')
const promptFiles = [
  'lib/sf2/author/prompt.ts',
  'lib/sf2/narrator/prompt.ts',
]

const bannedTerms = [
  'Sova',
  'Kael',
  'Vethis',
  'Coll',
  'Orvath',
  'Fen Sollar',
  'Corvin',
  'Sev',
  'Warden',
  'Synod',
  'Resonant',
  'Tithe',
  'Undrift',
]

function stripGenreConditionalBlocks(source) {
  return source.replace(/export const SF2_BIBLE_[A-Z0-9_]+ = `[\s\S]*?`\n/g, '')
}

const findings = []

for (const relativePath of promptFiles) {
  const absolutePath = path.join(repoRoot, relativePath)
  const source = stripGenreConditionalBlocks(fs.readFileSync(absolutePath, 'utf8'))
  const lines = source.split(/\r?\n/)

  for (const term of bannedTerms) {
    const pattern = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`)
    lines.forEach((line, index) => {
      if (pattern.test(line)) {
        findings.push(`${relativePath}:${index + 1}: ${term}: ${line.trim()}`)
      }
    })
  }
}

if (findings.length > 0) {
  console.error('Genre-specific Hegemony terms leaked into shared SF2 prompt source:')
  console.error(findings.join('\n'))
  process.exit(1)
}

console.log('No genre-specific Hegemony terms found in shared SF2 Author/Narrator prompts.')
