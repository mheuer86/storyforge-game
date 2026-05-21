import Anthropic from '@anthropic-ai/sdk'
import { startTimer } from '@/lib/sf2/instrumentation/latency'
import {
  HANDOVER_TOOL_NAME,
  HANDOVER_TOOLS,
  compileSessionBriefTool,
  compileGmMemoryTool,
  compileQuickReferenceTool,
} from './tools'
import {
  buildHandoverSituation,
  SF2_HANDOVER_CORE,
  SF2_HANDOVER_ROLE,
  SF2_HANDOVER_ROLE_SESSION_BRIEF,
  SF2_HANDOVER_ROLE_GM_MEMORY,
  SF2_HANDOVER_ROLE_QUICK_REFERENCE,
} from './prompt'
import type {
  Sf2HandoverCompileFailure,
  Sf2HandoverCompileRequest,
  Sf2HandoverCompileResult,
  Sf2HandoverDiagnostic,
  Sf2HandoverDocuments,
  Sf2HandoverUsage,
} from './types'
import {
  hasBlockingHandoverDiagnostics,
  normalizeHandoverDocuments,
  validateHandoverDocuments,
} from './validation'

export const DEFAULT_HANDOVER_MODEL =
  process.env.SF2_HANDOVER_MODEL || 'claude-sonnet-4-6'

function usageFromResponseUsage(usage: {
  input_tokens: number
  output_tokens: number
  cache_creation_input_tokens?: number | null
  cache_read_input_tokens?: number | null
}): Sf2HandoverUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    cacheWriteTokens: usage.cache_creation_input_tokens ?? 0,
    cacheReadTokens: usage.cache_read_input_tokens ?? 0,
  }
}

function failOpen(
  input: {
    error: string
    message?: string
    status?: number
    model: string
    totalMs: number
    apiMs?: number
    usage?: Partial<Sf2HandoverUsage>
  },
  diagnostics: Sf2HandoverDiagnostic[]
): Sf2HandoverCompileFailure {
  return {
    ok: false,
    documents: null,
    diagnostics: [
      ...diagnostics,
      {
        code: 'handover_failed_open',
        severity: 'warning',
        message:
          'Handover compilation failed open. Chapter transition may continue with existing Chapter Meaning or prior artifacts.',
      },
    ],
    error: input.error,
    message: input.message,
    status: input.status,
    usage: input.usage,
    latency: { totalMs: input.totalMs, apiMs: input.apiMs },
    model: input.model,
  }
}

export async function compileSf2Handover(
  request: Sf2HandoverCompileRequest,
  client: Anthropic
): Promise<Sf2HandoverCompileResult> {
  const requestTimer = startTimer()
  const model = request.model || DEFAULT_HANDOVER_MODEL
  const messages: Anthropic.MessageParam[] = [
    { role: 'user', content: buildHandoverSituation(request) },
  ]

  try {
    const apiTimer = startTimer()
    const response = await client.messages.create({
      model,
      max_tokens: 16384,
      system: `${SF2_HANDOVER_CORE}\n\n${SF2_HANDOVER_ROLE}`,
      tools: HANDOVER_TOOLS,
      tool_choice: { type: 'any', disable_parallel_tool_use: true },
      messages,
    })
    const apiMs = apiTimer.elapsed()
    const usage = usageFromResponseUsage(response.usage)
    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock =>
        block.type === 'tool_use' && block.name === HANDOVER_TOOL_NAME
    )

    if (!toolUse) {
      const textPreview = response.content
        .filter((block): block is Anthropic.TextBlock => block.type === 'text')
        .map((block) => block.text)
        .join('\n')
        .slice(0, 500)
      return failOpen(
        {
          error: 'handover_no_tool_use',
          message: textPreview,
          model,
          totalMs: requestTimer.elapsed(),
          apiMs,
          usage,
        },
        [
          {
            code: 'handover_no_tool_use',
            severity: 'error',
            message: `Model stopped with ${response.stop_reason} without calling ${HANDOVER_TOOL_NAME}.`,
          },
        ]
      )
    }

    const documents = normalizeHandoverDocuments(toolUse.input)
    const diagnostics = validateHandoverDocuments(documents, request.mechanicalState)
    if (hasBlockingHandoverDiagnostics(diagnostics)) {
      return failOpen(
        {
          error: 'handover_invalid_documents',
          model,
          totalMs: requestTimer.elapsed(),
          apiMs,
          usage,
        },
        diagnostics
      )
    }

    return {
      ok: true,
      documents,
      diagnostics,
      usage,
      latency: { totalMs: requestTimer.elapsed(), apiMs },
      model,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown_error'
    const status = err instanceof Anthropic.APIError ? err.status : undefined
    return failOpen(
      {
        error: 'handover_exception',
        message,
        status,
        model,
        totalMs: requestTimer.elapsed(),
      },
      [
        {
          code: 'handover_exception',
          severity: 'error',
          message,
        },
      ]
    )
  }
}

interface ParallelDocSpec {
  key: keyof Sf2HandoverDocuments
  role: string
  tool: Anthropic.Tool
  maxTokens: number
}

const PARALLEL_SPECS: ParallelDocSpec[] = [
  {
    key: 'sessionBrief',
    role: SF2_HANDOVER_ROLE_SESSION_BRIEF,
    tool: compileSessionBriefTool,
    maxTokens: 8192,
  },
  {
    key: 'gmMemory',
    role: SF2_HANDOVER_ROLE_GM_MEMORY,
    tool: compileGmMemoryTool,
    maxTokens: 10240,
  },
  {
    key: 'quickReference',
    role: SF2_HANDOVER_ROLE_QUICK_REFERENCE,
    tool: compileQuickReferenceTool,
    maxTokens: 2048,
  },
]

export async function compileSf2HandoverParallel(
  request: Sf2HandoverCompileRequest,
  client: Anthropic
): Promise<Sf2HandoverCompileResult> {
  const requestTimer = startTimer()
  const model = request.model || DEFAULT_HANDOVER_MODEL
  const situation = buildHandoverSituation(request)
  const diagnostics: Sf2HandoverDiagnostic[] = []

  const results = await Promise.allSettled(
    PARALLEL_SPECS.map(async (spec) => {
      const apiTimer = startTimer()
      const response = await client.messages.create({
        model,
        max_tokens: spec.maxTokens,
        system: [
          {
            type: 'text' as const,
            text: `${SF2_HANDOVER_CORE}\n\n${situation}`,
            cache_control: { type: 'ephemeral' as const },
          },
          { type: 'text' as const, text: spec.role },
        ],
        tools: [spec.tool],
        tool_choice: { type: 'any', disable_parallel_tool_use: true },
        messages: [{ role: 'user', content: 'Compile the handover document now.' }],
      })
      const apiMs = apiTimer.elapsed()
      const usage = usageFromResponseUsage(response.usage)
      const toolUse = response.content.find(
        (block): block is Anthropic.ToolUseBlock =>
          block.type === 'tool_use' && block.name === spec.tool.name
      )

      if (!toolUse) {
        throw new Error(`${spec.key}: model stopped with ${response.stop_reason} without calling ${spec.tool.name}`)
      }

      const value = (toolUse.input as Record<string, unknown>)[spec.key]
      return {
        key: spec.key,
        value: String(value ?? '').trim(),
        usage,
        apiMs,
      }
    })
  )

  const documents: Sf2HandoverDocuments = { sessionBrief: '', gmMemory: '', quickReference: '' }
  let totalUsage: Sf2HandoverUsage = { inputTokens: 0, outputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0 }
  let maxApiMs = 0
  let failCount = 0

  for (const [index, result] of results.entries()) {
    const spec = PARALLEL_SPECS[index]
    if (result.status === 'fulfilled') {
      documents[result.value.key] = result.value.value
      totalUsage = sumUsage(totalUsage, result.value.usage)
      maxApiMs = Math.max(maxApiMs, result.value.apiMs)
    } else {
      failCount++
      const message = result.reason instanceof Error ? result.reason.message : String(result.reason)
      diagnostics.push({
        code: 'handover_parallel_doc_failed',
        severity: 'error',
        document: spec.key,
        message: `${spec.key} compilation failed: ${message}`,
      })
    }
  }

  if (failCount === PARALLEL_SPECS.length) {
    return failOpen(
      {
        error: 'handover_all_parallel_failed',
        model,
        totalMs: requestTimer.elapsed(),
        apiMs: maxApiMs || undefined,
        usage: totalUsage,
      },
      diagnostics
    )
  }

  diagnostics.push(...validateHandoverDocuments(documents, request.mechanicalState))

  if (failCount > 0) {
    diagnostics.push({
      code: 'handover_partial_compile',
      severity: 'warning',
      message: `${failCount} of 3 handover documents failed to compile. Proceeding with available documents.`,
    })
  }

  return {
    ok: true,
    documents,
    diagnostics,
    usage: totalUsage,
    latency: { totalMs: requestTimer.elapsed(), apiMs: maxApiMs },
    model,
  }
}

function sumUsage(a: Sf2HandoverUsage, b: Sf2HandoverUsage): Sf2HandoverUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
  }
}
