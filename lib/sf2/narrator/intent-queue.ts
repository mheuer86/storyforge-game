import { resolvePlayerAction } from '../action-resolver/resolve'
import type { Sf2ResolvedPlayerAction, Sf2State } from '../types'
import { computeRequiredRollGate, type Sf2RequiredRollGate } from './roll-gates'

export interface Sf2NarratorIntent {
  index: number
  text: string
  dependency: 'root' | 'after_previous'
  action: Sf2ResolvedPlayerAction
  requiredRollGate: Sf2RequiredRollGate | null
}

export interface Sf2NarratorIntentQueue {
  originalInput: string
  current: Sf2NarratorIntent
  remaining: Sf2NarratorIntent[]
  all: Sf2NarratorIntent[]
}

export interface Sf2NarratorQueuedIntentResume {
  originalInput?: string
  currentIntent?: string
  remainingIntents?: string[]
}

const INTENT_BOUNDARY = /\s*(?:\b(?:and then|then|after that|afterwards|once that(?:'s| is)? done|once [^,.!?;]{1,80})\b|[;\n]+|\s+\d+\.\s+|\s+[-*]\s+)\s*/i

export function parseSf2NarratorIntentQueue(
  state: Sf2State,
  playerInput: string,
  resume?: Sf2NarratorQueuedIntentResume
): Sf2NarratorIntentQueue {
  const originalInput = (resume?.originalInput ?? playerInput).trim()
  if (resume) {
    const remainingTexts = (resume.remainingIntents ?? [])
      .map((intent) => intent.trim())
      .filter(Boolean)
    const all = remainingTexts.map((text, index) => buildIntent(state, text, index))
    const completedText = (resume.currentIntent ?? playerInput).trim() || originalInput || playerInput
    const current = all[0] ?? buildIntent(state, completedText, 0, null)
    return {
      originalInput,
      current,
      remaining: all.slice(1),
      all,
    }
  }

  const intentTexts = splitIntentTexts(playerInput)
  const texts = intentTexts.length > 0 ? intentTexts : [playerInput.trim()].filter(Boolean)
  const all = texts.map((text, index) => buildIntent(state, text, index))
  const current = all[0] ?? buildIntent(state, playerInput.trim() || playerInput, 0)
  return {
    originalInput,
    current,
    remaining: all.slice(1),
    all,
  }
}

export function renderSf2IntentQueueBlock(queue: Sf2NarratorIntentQueue): string {
  if (queue.all.length <= 1) return ''
  const lines = queue.all.map((intent) => {
    const targetIds = intent.action.targetEntityIds.length > 0
      ? intent.action.targetEntityIds.join(', ')
      : '(unresolved)'
    const gate = intent.requiredRollGate
      ? `${intent.requiredRollGate.kind} via ${intent.requiredRollGate.skills.join('/')}`
      : 'none'
    const marker = intent.index === queue.current.index ? 'CURRENT' : 'REMAINING'
    return `${intent.index + 1}. [${marker}] ${intent.text} — actionType=${intent.action.actionType}; targetEntityIds=${targetIds}; requiredRollGate=${gate}`
  })
  return `\n\n---\n\n### Private ordered intent queue (mandatory, never mention)\nThe player submitted multiple ordered intents. Resolve them in order; do not blend, reorder, or let a later intent answer an earlier uncertainty.\nOriginal input: ${queue.originalInput}\n${lines.join('\n')}\nCurrent intent: ${queue.current.text}\nRemaining intents after current: ${queue.remaining.length > 0 ? queue.remaining.map((intent) => intent.text).join(' | ') : '(none)'}\nIf the current intent requests a roll, stop at the roll. After the roll result returns, narrate that outcome first, then continue into the next remaining intent. If the next intent has a requiredRollGate above, call request_roll for that next intent before resolving its outcome. Suggested actions at final commit must reflect the post-queue state.`
}

export function renderSf2RollResumeIntentQueueBlock(queue: Sf2NarratorIntentQueue): string {
  if (queue.all.length === 0) return ''
  const currentGate = queue.current.requiredRollGate
    ? `${queue.current.requiredRollGate.kind} via ${queue.current.requiredRollGate.skills.join('/')}`
    : 'none'
  return `\n\n---\n\n### Private ordered intent continuation (mandatory, never mention)\nThe prior roll resolved the previous intent from this same player input. Now continue the preserved queue in order.\nOriginal input: ${queue.originalInput}\nCurrent remaining intent: ${queue.current.text}\nCurrent requiredRollGate: ${currentGate}\nFurther remaining intents: ${queue.remaining.length > 0 ? queue.remaining.map((intent) => intent.text).join(' | ') : '(none)'}\nFirst narrate the roll outcome that just returned. Then move into the current remaining intent. If Current requiredRollGate is not "none", call request_roll before resolving that intent's outcome. Do not skip to final suggested actions until the queue is exhausted.`
}

export function remainingIntentTexts(queue: Sf2NarratorIntentQueue): string[] {
  return queue.remaining.map((intent) => intent.text)
}

function buildIntent(
  state: Sf2State,
  text: string,
  index: number,
  requiredRollGate: Sf2RequiredRollGate | null = computeRequiredRollGate(state, text)
): Sf2NarratorIntent {
  return {
    index,
    text,
    dependency: index === 0 ? 'root' : 'after_previous',
    action: resolvePlayerAction(state, text),
    requiredRollGate,
  }
}

function splitIntentTexts(input: string): string[] {
  const trimmed = input.trim()
  if (!trimmed) return []
  const normalized = trimmed.replace(/^\s*(?:\d+\.|[-*])\s+/gm, '\n')
  const pieces = normalized
    .split(INTENT_BOUNDARY)
    .map((piece) => piece.trim().replace(/^[,.:;-]+|[,.:;-]+$/g, '').trim())
    .filter((piece) => piece.length > 0)

  if (pieces.length <= 1) return [trimmed]
  return pieces
}
