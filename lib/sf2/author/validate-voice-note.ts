// Voice-note distinctness validator. Phase 6 of NPC state-bound rendering.
//
// The two-layer split (per-NPC `voice.note` for distinctive flavor, tier-driven
// voiceImperative for behavioral binding) only works if `voice.note` carries
// actual character. If chapter-authors default to "professional and precise"
// for every NPC, three trusted NPCs collapse to one voice and the per-turn
// imperative is the only differentiator left.
//
// This validator enforces the floor: a minimum word count and a banned-template
// blocklist for generic adjective stock that authors fall back on. Failures
// are reported by `applyAuthoredToCampaign` but do not block hydration —
// the value still lands in state, just with a drift warning so playthrough
// review can flag it.

const MIN_VOICE_NOTE_WORDS = 4

// Generic descriptors that pass the word-count gate but produce
// indistinguishable voices when stacked across NPCs. Sourced from the doc's Q2
// example ("professional", "competent", "experienced") plus a few common
// failures observed in playthroughs. Match is whole-word, case-insensitive,
// and does not consider context — "professionally distant under stress" still
// fails because "professional" is the load-bearing adjective.
const BANNED_TEMPLATE_TOKENS = new Set([
  'professional',
  'professionally',
  'competent',
  'competently',
  'experienced',
])

export interface VoiceNoteValidationResult {
  ok: boolean
  reason?: string
}

export function validateVoiceNote(note: string | undefined): VoiceNoteValidationResult {
  if (note === undefined || note === null) {
    return { ok: false, reason: 'voice_note missing' }
  }
  const trimmed = note.trim()
  if (trimmed === '') return { ok: false, reason: 'voice_note empty' }
  const words = trimmed.split(/\s+/)
  if (words.length < MIN_VOICE_NOTE_WORDS) {
    return {
      ok: false,
      reason: `voice_note too thin (${words.length} word${words.length === 1 ? '' : 's'}; min ${MIN_VOICE_NOTE_WORDS})`,
    }
  }
  for (const word of words) {
    const normalized = word.toLowerCase().replace(/[^a-z]/g, '')
    if (BANNED_TEMPLATE_TOKENS.has(normalized)) {
      return {
        ok: false,
        reason: `voice_note uses banned generic descriptor "${normalized}" — voices that lean on this collapse together`,
      }
    }
  }
  return { ok: true }
}
