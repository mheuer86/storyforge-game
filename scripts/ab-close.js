#!/usr/bin/env node

// A/B test: Haiku vs Sonnet for close sequence phases
//
// Prerequisites:
//   1. Play a chapter locally with CAPTURE_CLOSE_INPUTS=true in .env.local
//   2. Trigger chapter close — inputs saved to scripts/ab-close/
//   3. Run this script: node scripts/ab-close.js
//
// Outputs side-by-side results to scripts/ab-results/

import Anthropic from '@anthropic-ai/sdk'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs'
import { join, basename } from 'path'

const client = new Anthropic()

const MODELS = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-4-6',
}

const inputDir = join(process.cwd(), 'scripts/ab-close')
const outputDir = join(process.cwd(), 'scripts/ab-results')
mkdirSync(outputDir, { recursive: true })

const inputFiles = readdirSync(inputDir).filter(f => f.endsWith('.json'))

if (inputFiles.length === 0) {
  console.log('No captured inputs found in scripts/ab-close/')
  console.log('Play a chapter with CAPTURE_CLOSE_INPUTS=true in .env.local, then trigger close.')
  process.exit(1)
}

console.log(`Found ${inputFiles.length} captured phase(s). Running both models...\n`)

let totalCost = 0

for (const file of inputFiles) {
  const capture = JSON.parse(readFileSync(join(inputDir, file), 'utf8'))
  const label = basename(file, '.json')

  console.log(`── ${label} (${capture.genre}, chapter ${capture.chapter}) ──`)

  for (const [name, model] of Object.entries(MODELS)) {
    console.log(`  ${name}...`)

    const system = capture.system.map(text => ({ type: 'text', text }))
    const tools = capture.tools.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }))

    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: capture.messages,
      tools,
    })

    const usage = response.usage
    const inputCost = (usage.input_tokens / 1_000_000) * (name === 'haiku' ? 0.80 : 3.00)
    const outputCost = (usage.output_tokens / 1_000_000) * (name === 'haiku' ? 4.00 : 15.00)
    const cost = inputCost + outputCost
    totalCost += cost

    console.log(`    ${usage.input_tokens} in / ${usage.output_tokens} out — $${cost.toFixed(4)}`)

    // Extract narrative text and tool call separately for easier comparison
    const narrative = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n')

    const toolCall = response.content.find(b => b.type === 'tool_use')

    const result = {
      model,
      label,
      genre: capture.genre,
      chapter: capture.chapter,
      phase: capture.phase,
      usage,
      cost: `$${cost.toFixed(4)}`,
      narrative,
      tool_call: toolCall ? { name: toolCall.name, input: toolCall.input } : null,
      raw_response: response.content,
    }

    writeFileSync(
      join(outputDir, `${label}-${name}.json`),
      JSON.stringify(result, null, 2)
    )
  }

  console.log()
}

console.log(`Done. Total cost: $${totalCost.toFixed(4)}`)
console.log(`Results in scripts/ab-results/`)
console.log()
console.log('Evaluation tips:')
console.log('  Phase 2 (debrief): Compare tactical analysis depth. Does Haiku reference specific rolls and events?')
console.log('  Phase 3 (curation): Compare pivotal scene summaries. Does Haiku preserve imagery and dialogue?')
console.log('  Phase 3 (curation): Compare signature lines. Does Haiku find the defining quote?')
console.log('  If you can\'t tell which is which, Haiku wins on cost.')
