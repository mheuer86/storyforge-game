import { Sf2PrototypePlayApp } from '@/components/sf2/prototype-play-app'
import {
  campaignBriefId,
  listCampaignBriefs,
  loadCampaignBriefEntry,
  loadHandoverExample,
  type HandoverDocuments,
} from '@/lib/sf2/campaign-briefs'
import type { Sf2PrototypeBrief } from '@/components/sf2/prototype-session'

export interface Sf2PrototypeHandoverExample {
  briefId: string
  chapter: number
  documents: HandoverDocuments
}

export default async function Sf2PrototypePage() {
  const entries = listCampaignBriefs(undefined, { activeOnly: true })
  const briefs = (await Promise.all(
    entries.map(async (entry): Promise<Sf2PrototypeBrief | null> => {
      const brief = await loadCampaignBriefEntry(entry)
      if (!brief) return null
      return {
        id: campaignBriefId(entry),
        genre: entry.genre,
        hook: entry.hookKey,
        title: entry.title,
        premise: entry.premise,
        toneReference: entry.tone,
        brief,
      }
    })
  )).filter((brief): brief is Sf2PrototypeBrief => Boolean(brief))

  const handoverExamples: Sf2PrototypeHandoverExample[] = []
  for (const entry of entries) {
    const docs = await loadHandoverExample(entry.genre, entry.hookKey)
    if (docs) {
      handoverExamples.push({
        briefId: campaignBriefId(entry),
        chapter: 2,
        documents: docs,
      })
    }
  }

  return <Sf2PrototypePlayApp briefs={briefs} handoverExamples={handoverExamples} />
}
