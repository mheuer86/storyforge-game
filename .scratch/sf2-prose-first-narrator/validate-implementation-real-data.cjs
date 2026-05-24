#!/usr/bin/env node

const fs = require('node:fs')
const path = require('node:path')
const { pathToFileURL } = require('node:url')
const { createJiti } = require('jiti')

const repoRoot = path.resolve(__dirname, '../..')
const defaultExportPath = '/tmp/codex-remote-attachments/019e53f2-2dd1-7903-8d39-1fc937688814/AEC2ACCE-9E25-42C4-BE73-8E148212022E/1-sf2-prose-first-space-opera_forty-thousand-2.json'
const exportPath = process.argv[2] ?? defaultExportPath
const resultsDir = path.join(repoRoot, '.scratch/sf2-prose-first-narrator/close-loop/results')

const phaseExpectation = {
  no_close: 'early_no_close',
  compress_no_future: 'compress_no_future',
  close_candidate_or_plan: 'close_candidate_or_plan',
  active_revelation_defer: 'active_revelation_defer',
  hard_boundary_strict: 'hard_boundary_strict',
}

const transportNotDoneFacts = [
  { id: 'broker_deal', text: 'broker deal accepted', aliases: ['broker deal', 'job accepted', 'deal signed'] },
  { id: 'lien_cleared', text: 'lien cleared', aliases: ['lien clearance', 'marker cleared', 'lien paid'] },
  { id: 'cargo_loaded', text: 'cargo loaded', aliases: ['cargo loading', 'loaded cargo', 'loading'] },
  { id: 'ship_unclamped', text: 'ship unclamped', aliases: ['unclamping', 'clamps released', 'undocked'] },
  { id: 'departure', text: 'departure complete', aliases: ['departed', 'departure', 'burned clear'] },
]

async function main() {
  const jiti = createJiti(__filename, { interopDefault: true })
  const closeLoop = jiti(path.join(repoRoot, 'lib/sf2/narrator/prose-first-close-loop.ts'))
  const extractor = await import(pathToFileURL(path.join(repoRoot, '.scratch/sf2-prose-first-narrator/close-loop/extract-v4-optimization-probes.mjs')).href)
  const exportData = JSON.parse(fs.readFileSync(exportPath, 'utf8'))
  const { probes, summary } = extractor.extractV4OptimizationProbes(exportPath)

  const probeResults = probes.map((probe) => validateProbe(closeLoop, probe))
  const factLock = validateFactLock(closeLoop)
  const finalState = validateFinalState(closeLoop, exportData)
  const genericSmoke = validateGenericSmoke(closeLoop)

  const failures = [
    ...probeResults.filter((result) => !result.pass).map((result) => `${result.id}: expected ${result.expectedPhase}, got ${result.actualPhase}`),
    ...factLock.failures,
    ...finalState.failures,
    ...genericSmoke.failures,
  ]

  const result = {
    generatedAt: new Date().toISOString(),
    exportPath,
    summary,
    pass: failures.length === 0,
    failures,
    probeResults,
    factLock,
    finalState,
    genericSmoke,
  }

  fs.mkdirSync(resultsDir, { recursive: true })
  const outPath = path.join(resultsDir, `${new Date().toISOString().replace(/[:.]/g, '-')}-implementation-real-data-validation.json`)
  fs.writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`)

  const passed = probeResults.filter((result) => result.pass).length
  console.log(`Implementation real-data validation: ${result.pass ? 'PASS' : 'FAIL'}`)
  console.log(`40k optimized probes: ${passed}/${probeResults.length}`)
  console.log(`Fact-lock repair sentinel: ${factLock.pass ? 'PASS' : 'FAIL'}`)
  console.log(`Final-state derivation: ${finalState.pass ? 'PASS' : 'FAIL'} (${finalState.phase})`)
  console.log(`Generic smoke: ${genericSmoke.pass ? 'PASS' : 'FAIL'} (${genericSmoke.checkedArtifacts} artifacts)`)
  console.log(`Result JSON: ${path.relative(repoRoot, outPath)}`)

  if (!result.pass) process.exitCode = 1
}

function validateProbe(closeLoop, probe) {
  const advisoryInput = buildImplementationInput(probe)
  const advisory = closeLoop.buildProseFirstCloseLoopAdvisory(advisoryInput)
  const expectedPhase = phaseExpectation[probe.expected]
  return {
    id: probe.id,
    label: probe.label,
    expected: probe.expected,
    expectedPhase,
    actualPhase: advisory.phase,
    pass: advisory.phase === expectedPhase,
    activeBlockers: advisory.activeBlockers,
    notDoneFactIds: advisory.facts.notDone.map((fact) => fact.id),
    requiredNextDelta: advisory.requiredNextDelta,
    forbiddenRepeat: advisory.forbiddenRepeat,
  }
}

function buildImplementationInput(probe) {
  const recentProse = probe.transcript.slice(-10).map((entry) => entry.content).join('\n')
  const base = {
    turnIndex: probe.turn,
    playerInput: probe.playerInput,
    recentProse,
  }

  switch (probe.id) {
    case 'p1-passenger-arrangement':
      return {
        ...base,
        doneFacts: [
          { id: 'passenger_arrangement', text: 'passenger arrangement established', aliases: ['Davan/Kes arrangement', 'passenger arrangement'] },
        ],
        inFlightFacts: [
          { id: 'broker_negotiation', text: 'broker negotiation/job decision is in flight', aliases: ['broker negotiation', 'job decision'] },
        ],
        notDoneFacts: transportNotDoneFacts,
        closePressure: true,
      }
    case 'p2-broker-job-accepted':
      return {
        ...base,
        doneFacts: [
          { id: 'broker_job_accepted', text: 'broker job accepted', aliases: ['job accepted', 'broker deal accepted'] },
        ],
        objectiveAccepted: true,
        decisionCommitted: true,
        closePressure: true,
      }
    case 'p3-crew-cohesion-tested':
      return {
        ...base,
        doneFacts: [
          { id: 'broker_job_accepted', text: 'broker job accepted', aliases: ['job accepted', 'broker deal accepted'] },
        ],
        activeBlockers: ['Slink is present and answering a direct question; finish the revelation before close'],
        objectiveAccepted: true,
        decisionCommitted: true,
        closePressure: true,
      }
    case 'p4-undock-boundary':
      return {
        ...base,
        doneFacts: [
          { id: 'ship_unclamped', text: 'ship unclamped', aliases: ['undocked', 'clamps released'] },
        ],
        hardBoundary: 'undock/departure boundary crossed',
        objectiveAccepted: true,
        decisionCommitted: true,
        closePressure: true,
      }
    case 'p5-cooling-cut-boundary':
      return {
        ...base,
        hardBoundary: 'corridor operation boundary crossed',
        objectiveAccepted: true,
        decisionCommitted: true,
        closePressure: true,
      }
    default:
      return base
  }
}

function validateFactLock(closeLoop) {
  const raw = {
    phase: 'closed',
    foreground_question: 'The broker deal and departure are complete.',
    answered: true,
    close_candidate: true,
    close_intent: 'close_this_turn',
    handover_ready: true,
    signals_true: ['broker deal accepted', 'lien cleared', 'cargo loaded'],
    never_close_mid_active: [],
    active_blockers: [],
    reason: 'Done: broker deal signed, lien cleared, cargo loaded. Not done: none.',
  }
  const normalized = closeLoop.normalizeProseFirstChapterStatus(raw)
  const result = closeLoop.detectProseFirstFactLockViolations({
    status: normalized.status,
    notDoneFacts: transportNotDoneFacts,
  })
  const ids = result.violations.map((violation) => violation.factId).sort()
  const required = ['broker_deal', 'cargo_loaded', 'lien_cleared']
  const failures = required
    .filter((id) => !ids.includes(id))
    .map((id) => `fact-lock missing violation for ${id}`)
  return {
    pass: failures.length === 0,
    failures,
    closeClaimed: result.closeClaimed,
    violationIds: ids,
  }
}

function validateFinalState(closeLoop, exportData) {
  const failures = []
  if (!exportData.currentState) {
    return { pass: false, failures: ['export missing currentState'], phase: null }
  }
  const input = closeLoop.buildProseFirstCloseLoopInputFromState({
    state: exportData.currentState,
    playerInput: 'Continue from the current corridor pressure.',
    transcript: [],
  })
  const advisory = closeLoop.buildProseFirstCloseLoopAdvisory(input)
  const threadFactIds = [
    ...advisory.facts.done,
    ...advisory.facts.inFlight,
    ...advisory.facts.notDone,
  ].map((fact) => fact.id)

  if (!threadFactIds.some((id) => id.startsWith('thread_'))) {
    failures.push('final-state derivation did not surface generic thread-derived facts')
  }
  if (input.turnIndex < 40) {
    failures.push(`final-state turnIndex expected >= 40, got ${input.turnIndex}`)
  }

  return {
    pass: failures.length === 0,
    failures,
    phase: advisory.phase,
    turnIndex: input.turnIndex,
    hardBoundary: input.hardBoundary ?? null,
    doneFactIds: advisory.facts.done.map((fact) => fact.id),
    inFlightFactIds: advisory.facts.inFlight.map((fact) => fact.id),
    notDoneFactIds: advisory.facts.notDone.map((fact) => fact.id),
  }
}

function validateGenericSmoke(closeLoop) {
  const artifacts = [
    '.scratch/sf2-tui/prose-first-runs/2026-05-21T20-52-43-183Z-cold-war-cardinal/artifact.json',
    '.scratch/sf2-tui/prose-first-runs/2026-05-21T20-08-32-883Z-pale-flame/artifact.json',
    '.scratch/sf2-tui/prose-first-runs/2026-05-21T20-52-47-401Z-grimdark-pale-flame/artifact.json',
    '.scratch/sf2-tui/prose-first-runs/2026-05-21T20-17-56-506Z-space-opera-forty-thousand/artifact.json',
  ]
  const forbidden = [
    'broker deal accepted',
    'lien cleared',
    'cargo loaded',
    'ship unclamped',
    'departure complete',
    'Gannett',
    'Verada',
    'Sable',
  ]
  const checked = []
  const failures = []

  for (const artifact of artifacts) {
    const artifactPath = path.join(repoRoot, artifact)
    if (!fs.existsSync(artifactPath)) continue
    const data = JSON.parse(fs.readFileSync(artifactPath, 'utf8'))
    const transcript = data.transcript ?? []
    const player = transcript.find((entry) => entry.speaker === 'player')
    const recentProse = transcript.map((entry) => entry.content).join('\n')
    const advisory = closeLoop.buildProseFirstCloseLoopAdvisory({
      playerInput: player?.content ?? '',
      recentProse,
    })
    checked.push({
      artifact,
      brief: data.brief?.id,
      phase: advisory.phase,
    })
    for (const fragment of forbidden) {
      if (advisory.text.includes(fragment)) {
        failures.push(`${artifact} leaked forbidden fragment "${fragment}"`)
      }
    }
  }

  return {
    pass: failures.length === 0,
    failures,
    checkedArtifacts: checked.length,
    checked,
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
