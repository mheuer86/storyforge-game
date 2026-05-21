import type Anthropic from '@anthropic-ai/sdk'

export const HANDOVER_TOOL_NAME = 'compile_chapter_handover' as const

export const compileChapterHandoverTool: Anthropic.Tool = {
  name: HANDOVER_TOOL_NAME,
  description:
    'Compile chapter-close prose handover artifacts. Call exactly once. Does not create canonical state patches.',
  input_schema: {
    type: 'object' as const,
    properties: {
      sessionBrief: {
        type: 'string',
        description:
          'Markdown Session Brief for the next chapter. Include all required sections in order.',
      },
      gmMemory: {
        type: 'string',
        description:
          'Markdown GM Memory. For Chapter 2+, preserve prior memory and append new evidence-backed chapter observations.',
      },
      quickReference: {
        type: 'string',
        description:
          'Markdown one-page Quick Reference for play. Keep functional, concise, and separate from craft analysis.',
      },
    },
    required: ['sessionBrief', 'gmMemory', 'quickReference'],
  },
}

export const HANDOVER_TOOLS: Anthropic.Tool[] = [compileChapterHandoverTool]

export const SESSION_BRIEF_TOOL_NAME = 'compile_session_brief' as const
export const GM_MEMORY_TOOL_NAME = 'compile_gm_memory' as const
export const QUICK_REFERENCE_TOOL_NAME = 'compile_quick_reference' as const

export const compileSessionBriefTool: Anthropic.Tool = {
  name: SESSION_BRIEF_TOOL_NAME,
  description: 'Compile the Session Brief for the next chapter. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      sessionBrief: {
        type: 'string',
        description: 'Markdown Session Brief. Include all required sections in order.',
      },
    },
    required: ['sessionBrief'],
  },
}

export const compileGmMemoryTool: Anthropic.Tool = {
  name: GM_MEMORY_TOOL_NAME,
  description: 'Compile the GM Memory document. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      gmMemory: {
        type: 'string',
        description: 'Markdown GM Memory. For Chapter 2+, preserve prior memory and append new evidence-backed chapter observations.',
      },
    },
    required: ['gmMemory'],
  },
}

export const compileQuickReferenceTool: Anthropic.Tool = {
  name: QUICK_REFERENCE_TOOL_NAME,
  description: 'Compile the Character Quick Reference card. Call exactly once.',
  input_schema: {
    type: 'object' as const,
    properties: {
      quickReference: {
        type: 'string',
        description: 'Markdown one-page Quick Reference for play. Keep functional and concise.',
      },
    },
    required: ['quickReference'],
  },
}
