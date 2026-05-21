import Anthropic from '@anthropic-ai/sdk'
import type { NextRequest } from 'next/server'
import { z } from 'zod'
import { compileSf2HandoverParallel } from '@/lib/sf2/handover/compiler'
import type { Sf2HandoverCompileRequest } from '@/lib/sf2/handover/types'

function resolveClient(req: NextRequest): Anthropic {
  const byokKey = req.headers.get('x-anthropic-key')?.trim()
  const envKey = process.env.ANTHROPIC_API_KEY?.trim()
  const chosenKey = byokKey || envKey
  return chosenKey ? new Anthropic({ apiKey: chosenKey }) : new Anthropic()
}

export const runtime = 'nodejs'
export const maxDuration = 120

const transcriptEntrySchema = z.object({
  role: z.enum(['player', 'narrator', 'system', 'mechanics', 'other']),
  content: z.string().min(1),
  turn: z.number().optional(),
  chapter: z.number().optional(),
  timestamp: z.string().optional(),
})

const miniDebriefSchema = z.object({
  title: z.string().optional(),
  content: z.string().min(1),
  turn: z.number().optional(),
  scene: z.string().optional(),
})

const requestSchema = z.object({
  transcript: z.union([z.string().min(1), z.array(transcriptEntrySchema).min(1)]),
  mechanicalState: z.record(z.unknown()),
  currentBrief: z.string().min(1),
  sessionBrief: z.string().optional(),
  previousGmMemory: z.string().optional(),
  miniDebriefs: z.array(miniDebriefSchema).optional(),
  campaignName: z.string().optional(),
  chapterNumber: z.number().optional(),
  model: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const parsed = requestSchema.safeParse(body)
  if (!parsed.success) {
    return new Response(
      JSON.stringify({ error: 'invalid_request', detail: parsed.error.flatten() }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const client = resolveClient(req)
  const result = await compileSf2HandoverParallel(
    parsed.data as Sf2HandoverCompileRequest,
    client
  )

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
