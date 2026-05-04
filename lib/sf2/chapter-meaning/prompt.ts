// Chapter-meaning synthesis prompt. Retrospective counterpart to Author's
// chapter_opening. Same 5-element shape as the opening (situation / tension /
// ticking / question / closer) — one prospective, one retrospective — so
// chapter-N's meaning feeds chapter-(N+1)'s opening synthesis deliberately.
//
// Per decision #3 compromise: run on Sonnet 4.6. This is taste-heavy literary
// synthesis feeding the primary kill criterion (thread continuity across
// transitions). Quality delta is load-bearing; cost delta is $0.06/campaign.

export const SF2_CHAPTER_MEANING_CORE = `You are the Author for Storyforge, operating in retrospective mode — synthesizing what a chapter turned out to be about.

You are not summarizing the plot. You are reading what actually happened and naming the meaning underneath it. The chapter frame was the hypothesis; the play was the test. Your job is to state the answer in language the next chapter can open from.`

export const SF2_CHAPTER_MEANING_ROLE = `## Role — chapter meaning synthesis

You write a 5-element retrospective with the same shape as a chapter opening. The opening was prospective ("here is what this chapter will test"). The meaning is retrospective ("here is what the test actually returned").

### The five elements

Each is ONE SENTENCE. Tight, weighted, distinct.

1. **situation** — what the chapter made the PC stand inside. Not what happened first; what the chapter's position *was* once the play settled. Describe it with the register the chapter taught itself to speak in.

2. **tension** — the live pressure the chapter held. What was being pulled in different directions. Not the objective; the felt force of it.

3. **ticking** — what moved while the chapter played. Time, procedure, clocks, relationships hardening or fraying. Name the specific motion.

4. **question** — the thing this chapter made *unavoidable*. Not "what happens next" — what the play itself produced as the inescapable inquiry. The question the next chapter has to answer whether it wants to or not.

5. **closer** — one line that captures the chapter's landing posture. The final image, the turn of phrase the chapter earned, the feeling left in the room.

### Craft rules

- **No plot recap.** Do not list events in order. Someone reading just your 5 elements should feel what the chapter *was*, not what it *did*.
- **Use canon vocabulary.** If the chapter coined phrases into the campaign lexicon, prefer those words. If the world has institutional language, use it.
- **Earn each word.** Five sentences total. Each word is expensive.
- **Not inspirational.** No "proving grounds," no "crucibles of fate," no generic genre varnish. Name the specific thing, in the specific register.
- **Ground every element in the actual play.** If the chapter never fired the planted revelation, don't pretend it did. If the crucible triggered, say it triggered in the *way* it triggered.

### What you receive

- The chapter's frame (objective, crucible, outcome spectrum) — the hypothesis
- All scene summaries for the chapter
- The final-state of active threads + their tension trajectories
- Recent narrator prose (last ~5 turns) for voice continuity
- Campaign lexicon — use its phrases when they fit

### What you emit

Call the \`synthesize_chapter_meaning\` tool exactly once with the 5 elements plus one field:

- **closingResolution**: from \`{clean, costly, failure, catastrophic, unresolved}\` — which outcome the chapter actually landed on per the spectrum. "unresolved" is legitimate when the chapter closed without a decisive landing (rare but real).

That is the entire output.`

import type { Sf2State } from '../types'
import { isSf2bState } from '../../sf2b/mode'
import { buildMeaningDigestCandidate } from '../../sf2b/meaning-digest'

export function buildChapterMeaningSituation(state: Sf2State): string {
  const { chapter, campaign } = state
  const frame = chapter.setup.frame
  const currentChapter = chapter.number

  const chapterTurns = state.history.turns.filter((t) => t.chapter === currentChapter)
  const recentProse = chapterTurns
    .slice(-5)
    .map((t, i) => `#### Turn ${chapterTurns.length - 5 + i + 1}\n${t.narratorProse}`)
    .join('\n\n')

  const sceneSummaries = chapter.sceneSummaries
    .map(
      (s, i) =>
        `- Scene ${i + 1}: ${s.summary}\n  (leads_to: ${s.leadsTo ?? 'null'})`
    )
    .join('\n')

  const activeThreads = Object.values(campaign.threads)
    .filter((t) => t.status === 'active')
    .map((t) => `- ${t.id} · ${t.title} · tension ${t.tension}/10 — ${t.retrievalCue}`)
    .join('\n')

  const resolvedThreads = Object.values(campaign.threads)
    .filter((t) => t.status !== 'active' && t.chapterCreated <= currentChapter)
    .map((t) => `- ${t.id} · ${t.title} → ${t.status}`)
    .join('\n')

  const lexiconItems = (campaign.lexicon ?? [])
    .slice(-10)
    .map((l) => `- "${l.phrase}" — ${l.register}`)
    .join('\n')

  const ladderFired = chapter.setup.pressureLadder.filter((s) => s.fired).length
  const ladderTotal = chapter.setup.pressureLadder.length
  const sf2bDigest = isSf2bState(state)
    ? `\n\n### SF2B deterministic meaning digest candidate\nThis is a code-derived candidate, not a script. Use it to preserve consequences and hard facts while writing a sharper five-element retrospective.\n\n${buildMeaningDigestCandidate(state).compactSummary}`
    : ''

  return `## Chapter ${currentChapter} — closing synthesis context

### Hypothesis (the chapter frame set before play)
- Title: ${chapter.title}
- Premise: ${frame.premise}
- Active pressure: ${frame.activePressure}
- Central tension: ${frame.centralTension}
- Objective: ${frame.objective}
- Crucible: ${frame.crucible}

### Outcome spectrum
- Clean: ${frame.outcomeSpectrum.clean}
- Costly: ${frame.outcomeSpectrum.costly}
- Failure: ${frame.outcomeSpectrum.failure}
- Catastrophic: ${frame.outcomeSpectrum.catastrophic}

### Pressure ladder progress
${ladderFired} of ${ladderTotal} steps fired.

### Scene summaries (what the chapter traversed)
${sceneSummaries || '_(no scenes summarized)_'}

### Active threads at close
${activeThreads || '_(none active)_'}

### Resolved threads this campaign
${resolvedThreads || '_(none)_'}

### Campaign lexicon (canon phrases the chapter contributed to or can reuse)
${lexiconItems || '_(empty)_'}

### Recent narrator prose (last 5 turns, for voice continuity)
${recentProse || '_(no turns played)_'}
${sf2bDigest}

---

Read the above. Synthesize the 5-element retrospective. Call \`synthesize_chapter_meaning\` once.`
}
