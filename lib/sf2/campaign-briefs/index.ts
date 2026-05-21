import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { Genre } from '../../genres'

export type CampaignBriefGenre = Extract<Genre, 'space-opera' | 'fantasy' | 'grimdark' | 'cyberpunk' | 'noire' | 'epic-scifi' | 'cold-war'>
export type ActiveSf2CampaignBriefGenre = Extract<CampaignBriefGenre, 'space-opera' | 'fantasy' | 'grimdark' | 'cyberpunk' | 'noire' | 'epic-scifi' | 'cold-war'>

export interface CampaignBriefEntry {
  genre: CampaignBriefGenre
  hookKey: string
  title: string
  premise: string
  tone: string
  contentPath: string
  activeSf2Genre: boolean
}

export const ACTIVE_SF2_CAMPAIGN_BRIEF_GENRES = [
  'space-opera',
  'fantasy',
  'grimdark',
  'cyberpunk',
  'noire',
  'epic-scifi',
  'cold-war',
] as const satisfies readonly ActiveSf2CampaignBriefGenre[]

export function campaignBriefId(entry: Pick<CampaignBriefEntry, 'genre' | 'hookKey'>): string {
  return `${entry.genre}:${entry.hookKey}`
}

export const CAMPAIGN_BRIEF_REGISTRY = [
  {
    genre: 'space-opera',
    hookKey: 'forty-thousand',
    title: 'Forty Thousand',
    premise: 'A human Driftrunner under a fixed forty-thousand-credit debt is offered a rotten job that may be the only way out.',
    tone: 'Worn-starship pressure, crew warmth, practical wit, and debt with teeth.',
    contentPath: 'content/sf2/campaign-briefs/space-opera/forty-thousand.md',
    activeSf2Genre: true,
  },
  {
    genre: 'grimdark',
    hookKey: 'pale-flame',
    title: 'The Pale Flame',
    premise: 'Cold Iron, Cold Council: a grimdark medieval campaign in the Reach of Ennvarr.',
    tone: 'Morally corroded, weighty, and unsentimental.',
    contentPath: 'content/sf2/campaign-briefs/grimdark/pale-flame.md',
    activeSf2Genre: true,
  },
  {
    genre: 'epic-scifi',
    hookKey: 'hegemony-seeker',
    title: 'The Hegemony',
    premise: 'A Resonant Seeker serving the institution that owns them arrives on Caul-9.',
    tone: 'Red Rising register: propulsive class warfare with the system turned against itself.',
    contentPath: 'content/sf2/campaign-briefs/epic-scifi/hegemony-seeker.md',
    activeSf2Genre: true,
  },
  {
    genre: 'cyberpunk',
    hookKey: 'chrome',
    title: 'Chrome',
    premise: 'An underground doc/hacker becomes a liability when a fourteen-year-old brings in forbidden tech.',
    tone: 'Blade Runner noir with Matrix stakes: street-level, rain-soaked, and no good options.',
    contentPath: 'content/sf2/campaign-briefs/cyberpunk/chrome.md',
    activeSf2Genre: true,
  },
  {
    genre: 'noire',
    hookKey: 'sable',
    title: 'Sable',
    premise: 'A criminal fixer gets the call: two bodies, one of them a cop.',
    tone: 'Sin City register: timeless, stylized, merciless noir.',
    contentPath: 'content/sf2/campaign-briefs/noire/sable.md',
    activeSf2Genre: true,
  },
  {
    genre: 'fantasy',
    hookKey: 'covenant',
    title: 'The Covenant',
    premise: 'A mage of the Covenant reaches their first solo posting as three children vanish into the Silence.',
    tone: 'DnD adventurer register: wonder-forward, propulsive, and exploration-driven.',
    contentPath: 'content/sf2/campaign-briefs/fantasy/covenant.md',
    activeSf2Genre: true,
  },
  {
    genre: 'cold-war',
    hookKey: 'cardinal',
    title: 'Cardinal',
    premise: 'A CIA field operative in Berlin, October 1983, investigates why CARDINAL missed three dead drops.',
    tone: 'Tom Clancy procedural with institutional paranoia and personal cost.',
    contentPath: 'content/sf2/campaign-briefs/cold-war/cardinal.md',
    activeSf2Genre: true,
  },
] as const satisfies readonly CampaignBriefEntry[]

export function listCampaignBriefs(
  genre?: CampaignBriefGenre,
  options: { activeOnly?: boolean } = {}
): CampaignBriefEntry[] {
  return CAMPAIGN_BRIEF_REGISTRY.filter((entry) => {
    if (genre && entry.genre !== genre) return false
    if (options.activeOnly && !entry.activeSf2Genre) return false
    return true
  })
}

export function getCampaignBriefEntry(
  genre: CampaignBriefGenre,
  hookKey: string,
): CampaignBriefEntry | null {
  return CAMPAIGN_BRIEF_REGISTRY.find(
    (entry) => entry.genre === genre && entry.hookKey === hookKey,
  ) ?? null
}

export async function loadCampaignBriefEntry(entry: CampaignBriefEntry): Promise<string | null> {
  const relativePath = entry.contentPath.replace(/^content\/sf2\/campaign-briefs\//, '')
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return null
  }

  try {
    return await readFile(
      path.join(process.cwd(), 'content', 'sf2', 'campaign-briefs', relativePath),
      'utf8'
    )
  } catch {
    return null
  }
}

export async function loadCampaignBrief(
  genre: CampaignBriefGenre,
  hookKey: string,
): Promise<string | null> {
  const entry = getCampaignBriefEntry(genre, hookKey)
  if (!entry) return null

  return loadCampaignBriefEntry(entry)
}

export interface HandoverDocuments {
  sessionBrief: string
  gmMemory: string
  quickReference: string
}

export interface HandoverExampleEntry {
  genre: CampaignBriefGenre
  hookKey: string
  chapter: number
  basePath: string
}

export const HANDOVER_EXAMPLE_REGISTRY: readonly HandoverExampleEntry[] = [
  {
    genre: 'grimdark',
    hookKey: 'pale-flame',
    chapter: 2,
    basePath: 'content/sf2/handover-examples/grimdark/pale-flame',
  },
]

export function getHandoverExample(
  genre: CampaignBriefGenre,
  hookKey: string,
): HandoverExampleEntry | null {
  return HANDOVER_EXAMPLE_REGISTRY.find(
    (entry) => entry.genre === genre && entry.hookKey === hookKey,
  ) ?? null
}

async function safeReadFile(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export async function loadHandoverExample(
  genre: CampaignBriefGenre,
  hookKey: string,
): Promise<HandoverDocuments | null> {
  const entry = getHandoverExample(genre, hookKey)
  if (!entry) return null

  const base = path.join(process.cwd(), entry.basePath)
  const [sessionBrief, gmMemory, quickReference] = await Promise.all([
    safeReadFile(path.join(base, 'session-brief.md')),
    safeReadFile(path.join(base, 'gm-memory.md')),
    safeReadFile(path.join(base, 'quick-reference.md')),
  ])

  if (!sessionBrief || !gmMemory || !quickReference) return null

  return { sessionBrief, gmMemory, quickReference }
}
