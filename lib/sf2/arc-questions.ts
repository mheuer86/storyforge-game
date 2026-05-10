import type { Sf2ChapterMeaning, Sf2EntityId, Sf2State } from './types'

export interface LatentArcQuestionCandidate {
  id: Sf2EntityId
  question: string
  whyItMatters: string
  answerImpactAxis: string
  activationTags: string[]
}

export interface LatentArcQuestionSelection {
  candidates: LatentArcQuestionCandidate[]
  promotionRequired: boolean
  signals: string[]
}

export function selectLatentArcQuestionsForChapter(
  state: Sf2State,
  targetChapter: number,
  priorChapterMeaning?: Sf2ChapterMeaning | null
): LatentArcQuestionSelection {
  const arc = state.campaign.arcPlan
  if (!arc || targetChapter <= 1) {
    return { candidates: [], promotionRequired: false, signals: [] }
  }

  const questions = arc.latentArcQuestions ?? []
  const signals = deriveLatentQuestionSignals(state, targetChapter, priorChapterMeaning)
  const hasPromoted = questions.some((q) => q.status === 'promoted')
  const chapterGate = targetChapter >= 3 && !hasPromoted
  const open = questions.filter((q) => q.status === 'open')
  const ranked = open
    .map((q) => ({
      q,
      score: scoreQuestion(q.activationTags, signals, chapterGate),
    }))
    .filter((row) => chapterGate || row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)

  return {
    candidates: ranked.map(({ q }) => ({
      id: q.id,
      question: q.question,
      whyItMatters: q.whyItMatters,
      answerImpactAxis: q.answerImpactAxis,
      activationTags: q.activationTags,
    })),
    promotionRequired: ranked.length > 0 && chapterGate,
    signals: [...signals],
  }
}

export function applyLatentArcQuestionChapterOpen(
  state: Sf2State,
  targetChapter: number,
  promotedQuestionIds: Sf2EntityId[]
): void {
  const arc = state.campaign.arcPlan
  if (!arc) return
  const promoted = new Set(promotedQuestionIds)
  const selection = selectLatentArcQuestionsForChapter(state, targetChapter)
  const considered = new Set(selection.candidates.map((q) => q.id))

  for (const question of arc.latentArcQuestions ?? []) {
    if (question.status !== 'open') continue
    if (promoted.has(question.id)) {
      question.status = 'promoted'
      question.promotedChapter = targetChapter
      question.lastConsideredChapter = targetChapter
      question.consideredCount = (question.consideredCount ?? 0) + 1
      continue
    }
    if (!considered.has(question.id)) continue
    question.lastConsideredChapter = targetChapter
    question.consideredCount = (question.consideredCount ?? 0) + 1
    if (question.consideredCount >= 2) {
      question.status = 'retired'
      question.retiredChapter = targetChapter
    }
  }
}

function deriveLatentQuestionSignals(
  state: Sf2State,
  targetChapter: number,
  priorChapterMeaning?: Sf2ChapterMeaning | null
): Set<string> {
  const signals = new Set<string>()
  if (targetChapter >= 3) signals.add('chapter_reversal')
  if (Object.values(state.campaign.threads).some((thread) => thread.status === 'active' && thread.tension >= 7)) {
    signals.add('high_tension_thread')
  }
  if (Object.values(state.campaign.factions).some((faction) => faction.heat !== 'none')) {
    signals.add('faction_heat')
  }
  if (Object.values(state.campaign.obligations).some((obligation) => obligation.status === 'active')) {
    signals.add('obligation_due')
  }
  if (Object.values(state.campaign.clues).some((clue) => clue.status !== 'consumed')) {
    signals.add('repeated_clue')
  }
  if (Object.values(state.campaign.npcs).some((npc) => npc.disposition === 'hostile' || npc.disposition === 'wary')) {
    signals.add('trust_break')
  }
  if (priorChapterMeaning?.closingResolution === 'failure') signals.add('failed_outcome')
  if (priorChapterMeaning?.closingResolution === 'catastrophic') signals.add('catastrophic_outcome')
  return signals
}

function scoreQuestion(tags: string[], signals: Set<string>, chapterGate: boolean): number {
  const signalHits = tags.filter((tag) => signals.has(tag)).length
  return signalHits * 10 + (chapterGate ? 1 : 0)
}
