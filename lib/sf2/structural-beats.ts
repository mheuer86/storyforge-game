import type { Sf2State } from './types'

export type Sf2ChapterStructuralBeat = {
  name: string
  beat: string
  directive: string
}

// 7-point story arc compressed into 5 chapter slots. Each chapter has a
// structural job; without naming it here, mid-arc chapters default to
// uniform rising action and Ch3-Ch4 go flat.
export const CHAPTER_STRUCTURAL_BEATS: Record<1 | 2 | 3 | 4 | 5, Sf2ChapterStructuralBeat> = {
  1: {
    name: 'ESTABLISH',
    beat: 'hook + setup',
    directive:
      'Surface the pressure source, make the PC\'s role load-bearing, plant the inciting threat. End the chapter with the line of tension the next four chapters will pull on. Do NOT start at maximum pressure — establish has runway. The chapter\'s pressure_question names what the PC is being asked to decide about, not what they\'ll do.',
  },
  2: {
    name: 'COMPLICATE',
    beat: 'plot turn 1 + pinch 1',
    directive:
      'PC commits to a path that can\'t be undone (the first turn). Antagonist or institution applies its first real pressure (the first pinch). End the chapter with the PC reactive, operating on someone else\'s clock. The pressure_question must SHARPEN — something is at stake now that wasn\'t before.',
  },
  3: {
    name: 'PIVOT',
    beat: 'midpoint flip',
    directive:
      '**LOAD-BEARING CHAPTER. This is the chapter that goes flat under uniform rising-action.** A revelation lands that recontextualizes prior chapters. The arc question shifts shape. The PC moves from reactive to proactive — they pick the next move, not someone else. Stakes invert, escalate, or both. Something the PC believed in Ch1-2 turns out to be wrong, costly, or insufficient. The pressure_question must be DIFFERENT from prior chapters; the chapter\'s answer changes how the rest of the arc reads. Name the flip explicitly — what reverses, what surfaces, what the PC realizes they\'ve been doing wrong. Do NOT write "Ch3 deepens the conflict" or "Ch3 raises the stakes" — that\'s the under-authoring that produces flat chapters.',
  },
  4: {
    name: 'ESCALATE',
    beat: 'pinch 2 + plot turn 2',
    directive:
      'The costliest pressure point. The antagonist\'s strongest move; the cost of the PC\'s Ch3 commitment surfaces. PC commits to the final approach — the only way out is through. End the chapter with all options narrowed to the resolution path. The pressure_question names the cost the PC is now visibly paying.',
  },
  5: {
    name: 'RESOLVE',
    beat: 'resolution sequence',
    directive:
      'Outcomes lock in. The arc question gets its answer. If the arc resolved in Ch4, this chapter is an epilogue or coda — outcome consequences without new pressure. The pressure_question is the explicit form of the arc-question for this run.',
  },
}

export function renderStructuralBeatForChapter(
  chapter: number,
  arc?: Sf2State['campaign']['arcPlan']
): string {
  const beat = CHAPTER_STRUCTURAL_BEATS[chapter as 1 | 2 | 3 | 4 | 5]
  if (!beat) return ''
  const arcSpecific = arc?.chapterFunctionMap.find((c) => c.chapter === chapter)
  const arcSpecificBlock = arcSpecific
    ? `\n**Arc-author's authored function for this chapter:**\n- function: ${arcSpecific.function}\n- pressure_question: ${arcSpecific.pressureQuestion}\n- possible end states: ${arcSpecific.possibleEndStates.join(' | ')}\n\nYour chapter setup must honor BOTH the structural beat above AND the arc-specific authored function. The structural beat is the *shape* of the chapter; the authored function is the *content*. If they conflict, treat the structural beat as load-bearing — the arc-author may have under-authored the function (a common Ch3 failure mode is writing rising-action language for what should be a midpoint flip).`
    : ''
  return `### Chapter ${chapter} structural beat — ${beat.name} (${beat.beat})

${beat.directive}
${arcSpecificBlock}`
}

export function renderStructuralBeatList(): string {
  return (Object.entries(CHAPTER_STRUCTURAL_BEATS) as Array<[string, Sf2ChapterStructuralBeat]>)
    .map(([chapter, beat]) => `**Ch${chapter} — ${beat.name}** (${beat.beat})
- ${beat.directive}`)
    .join('\n\n')
}
