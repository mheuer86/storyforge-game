import type Anthropic from '@anthropic-ai/sdk'

export const PLAYSTYLE_TOOL_NAME = 'synthesize_playstyle_profile' as const

const evidenceRefSchema = {
  type: 'object' as const,
  properties: {
    kind: {
      type: 'string',
      enum: ['turn', 'scene_summary', 'chapter_artifact', 'setup_rationale'],
      description: 'Where this evidence came from.',
    },
    chapter: {
      type: 'number',
      description: 'Chapter number for this evidence.',
    },
    turnIndex: {
      type: 'number',
      description: 'Turn index when kind is turn.',
    },
    summaryIndex: {
      type: 'number',
      description: '1-based scene summary index when kind is scene_summary.',
    },
    excerpt: {
      type: 'string',
      description: 'Short excerpt or phrase. Keep under 20 words.',
    },
    note: {
      type: 'string',
      description: 'Why this evidence supports the calibration.',
    },
  },
  required: ['kind', 'chapter', 'excerpt', 'note'],
}

const knobSchema = {
  type: 'object' as const,
  properties: {
    value: {
      type: 'string',
      description: 'Compact label for the observed human-player preference.',
    },
    guidance: {
      type: 'string',
      description: 'Actionable GM calibration for future Author/Narrator use.',
    },
    confidence: {
      type: 'string',
      enum: ['low', 'medium', 'high'],
      description: 'Evidence strength. Prefer low when this is first-chapter inference.',
    },
    evidence: {
      type: 'array' as const,
      items: evidenceRefSchema,
      minItems: 1,
      description: 'Evidence references to chapter turns, scene summaries, Chapter Meaning, or state.',
    },
  },
  required: ['value', 'guidance', 'confidence', 'evidence'],
}

const patternSchema = {
  type: 'object' as const,
  properties: {
    pattern: {
      type: 'string',
      description: 'Observed pattern in how the human player engages the game.',
    },
    guidance: {
      type: 'string',
      description: 'What future GM behavior should do with this pattern.',
    },
    evidence: {
      type: 'array' as const,
      items: evidenceRefSchema,
      minItems: 1,
      description: 'Evidence references backing the pattern.',
    },
  },
  required: ['pattern', 'guidance', 'evidence'],
}

export const synthesizePlaystyleProfileTool: Anthropic.Tool = {
  name: PLAYSTYLE_TOOL_NAME,
  description:
    'Emit campaign-local human-player playstyle calibration at chapter close. Call ONCE.',
  input_schema: {
    type: 'object' as const,
    properties: {
      informationEconomy: knobSchema,
      decisionArchitecture: knobSchema,
      consequenceTiming: knobSchema,
      emotionalRegister: knobSchema,
      npcLegibility: knobSchema,
      errorTolerance: knobSchema,
      workedPatterns: {
        type: 'array' as const,
        items: patternSchema,
        minItems: 1,
        maxItems: 5,
        description: 'What GM techniques worked for this human player.',
      },
      avoidPatterns: {
        type: 'array' as const,
        items: patternSchema,
        minItems: 1,
        maxItems: 5,
        description: 'What GM techniques should be avoided or softened for this human player.',
      },
      summary: {
        type: 'string',
        description: 'One compact paragraph summarizing the calibration.',
      },
    },
    required: [
      'informationEconomy',
      'decisionArchitecture',
      'consequenceTiming',
      'emotionalRegister',
      'npcLegibility',
      'errorTolerance',
      'workedPatterns',
      'avoidPatterns',
      'summary',
    ],
  },
}

export const PLAYSTYLE_TOOLS: Anthropic.Tool[] = [synthesizePlaystyleProfileTool]
