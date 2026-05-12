#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const repoRoot = path.resolve(__dirname, '..')

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
    fileName: filename,
  }).outputText

  module._compile(output, filename)
}

const { genres, getGenreConfig } = require(path.join(repoRoot, 'lib/genre-config.ts'))
const { getEligibleOpeningHooks } = require(path.join(repoRoot, 'lib/opening-hooks.ts'))

const expectedWardenPool = [
  'The Allocation',
  'The Testing',
  'Quiet Disposal',
  'The Dowry',
  'The Garrison',
  'The Adjudicator',
  'Compromised',
  'The Requisitions',
  'The Tithe',
  'The Fleet Order',
  'The Defector',
]

const excludedWardenExamples = [
  'The Tithe Delegation',
  'The Intercept',
  'Silent Terms',
  'The Route',
  'The Ward',
]

function hookName(hook) {
  if (typeof hook === 'string') return hook
  return hook.title || hook.hook
}

function asHookObject(hook) {
  return typeof hook === 'string' ? { hook } : hook
}

function sameMembers(actual, expected) {
  const actualSet = new Set(actual)
  const expectedSet = new Set(expected)
  return actual.length === expected.length
    && actual.every((item) => expectedSet.has(item))
    && expected.every((item) => actualSet.has(item))
}

const errors = []
let comboCount = 0
let hookCount = 0

for (const { id: genreId } of genres) {
  const config = getGenreConfig(genreId)
  hookCount += config.openingHooks.length

  config.openingHooks.map(asHookObject).forEach((hook, index) => {
    if (hook.classes?.length && !hook.origins?.length) {
      errors.push(`${genreId} hook #${index + 1} "${hookName(hook)}" has classes without origins`)
    }
  })

  for (const origin of config.species) {
    const playbooks = config.playbooks?.[origin.id] ?? config.classes

    for (const playbook of playbooks) {
      comboCount += 1
      const eligible = getEligibleOpeningHooks(config, origin.id, playbook)

      if (eligible.length === 0) {
        errors.push(`${genreId}/${origin.id}/${playbook.id} has no eligible opening hooks`)
      }
    }
  }
}

const epicScifi = getGenreConfig('epic-scifi')
const imperialWarden = epicScifi.playbooks?.['imperial-service']?.find((playbook) => playbook.id === 'warden')

if (!imperialWarden) {
  errors.push('epic-scifi/imperial-service/warden playbook is missing')
} else {
  const wardenPool = getEligibleOpeningHooks(epicScifi, 'imperial-service', imperialWarden).map(hookName)

  if (!sameMembers(wardenPool, expectedWardenPool)) {
    const expectedSet = new Set(expectedWardenPool)
    const actualSet = new Set(wardenPool)
    const extra = wardenPool.filter((title) => !expectedSet.has(title))
    const missing = expectedWardenPool.filter((title) => !actualSet.has(title))
    errors.push(`epic-scifi/imperial-service/warden pool mismatch. Missing: ${missing.join(', ') || 'none'}. Extra: ${extra.join(', ') || 'none'}.`)
  }

  for (const title of excludedWardenExamples) {
    if (wardenPool.includes(title)) {
      errors.push(`epic-scifi/imperial-service/warden should exclude "${title}"`)
    }
  }
}

if (errors.length > 0) {
  console.error('V1 opening hook audit failed:')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`V1 opening hook audit passed: ${hookCount} hooks, ${comboCount} origin/playbook combinations.`)
console.log(`epic-scifi/imperial-service/warden: ${expectedWardenPool.join(', ')}`)
