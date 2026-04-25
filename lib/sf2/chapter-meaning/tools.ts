import type Anthropic from '@anthropic-ai/sdk'

export const CHAPTER_MEANING_TOOL_NAME = 'synthesize_chapter_meaning' as const

export const synthesizeChapterMeaningTool: Anthropic.Tool = {
  name: CHAPTER_MEANING_TOOL_NAME,
  description:
    'Emit the 5-element chapter-close retrospective. One sentence per element. Call ONCE per chapter close.',
  input_schema: {
    type: 'object' as const,
    properties: {
      situation: {
        type: 'string',
        description: 'One sentence. What the chapter made the PC stand inside, once play settled.',
      },
      tension: {
        type: 'string',
        description: 'One sentence. The live pressure the chapter held.',
      },
      ticking: {
        type: 'string',
        description: 'One sentence. What moved while the chapter played.',
      },
      question: {
        type: 'string',
        description: 'One sentence. The inquiry the chapter made unavoidable for the next chapter.',
      },
      closer: {
        type: 'string',
        description: 'One sentence. The chapter\'s landing posture — final image, turn of phrase, feeling.',
      },
      closingResolution: {
        type: 'string',
        enum: ['clean', 'costly', 'failure', 'catastrophic', 'unresolved'],
        description:
          'Where the chapter landed on its own outcome spectrum. "unresolved" when the chapter closed without decisive landing.',
      },
    },
    required: ['situation', 'tension', 'ticking', 'question', 'closer', 'closingResolution'],
  },
}

export const CHAPTER_MEANING_TOOLS: Anthropic.Tool[] = [synthesizeChapterMeaningTool]
