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
      transition_seed: {
        type: 'object' as const,
        description:
          'Concrete seed for the next Author. Converts the retrospective into consequence, pressure owner, do-not-restage list, and procedure residue.',
        properties: {
          prior_chapter_meant: {
            type: 'string',
            description: 'One sentence. What the prior chapter meant in campaign terms.',
          },
          earned_consequence: {
            type: 'string',
            description: 'One sentence. What the player earned the world to do next.',
          },
          pressure_owner_candidate: {
            type: 'string',
            description: 'Named person, faction, institution, or role most likely to act next.',
          },
          worsened_detail: {
            type: 'string',
            description: 'Small prior detail that should become load-bearing next chapter.',
          },
          unresolved_question: {
            type: 'string',
            description: 'Question the next chapter should not be able to ignore.',
          },
          do_not_restage: {
            type: 'array' as const,
            items: { type: 'string' },
            description: '2-5 prior mechanisms/milestones that must not become pending again.',
          },
          procedure_residue: {
            type: 'object' as const,
            properties: {
              mechanism: {
                type: 'string',
                description: 'Procedure/mechanism that mattered, or "none".',
              },
              keep_as: {
                type: 'string',
                enum: ['constraint', 'leverage', 'background', 'discard'],
                description:
                  'How the next Author should treat this mechanism. constraint/background/discard means do not make it the opener.',
              },
            },
            required: ['mechanism', 'keep_as'],
          },
        },
        required: [
          'prior_chapter_meant',
          'earned_consequence',
          'pressure_owner_candidate',
          'worsened_detail',
          'unresolved_question',
          'do_not_restage',
          'procedure_residue',
        ],
      },
    },
    required: ['situation', 'tension', 'ticking', 'question', 'closer', 'closingResolution', 'transition_seed'],
  },
}

export const CHAPTER_MEANING_TOOLS: Anthropic.Tool[] = [synthesizeChapterMeaningTool]
