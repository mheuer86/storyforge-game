import type { Sf2ChapterArtifacts, Sf2ChapterNumber, Sf2State } from '../types'

export interface Sf2CampaignListItem {
  campaignId: string
  genreId: string
  playbookId: string
  originId: string
  currentChapter: Sf2ChapterNumber
  updatedAt: string
}

export interface Sf2ChapterArtifactRecord {
  campaignId: string
  chapter: Sf2ChapterNumber
  artifacts: Sf2ChapterArtifacts
  storedAt: string
}

export interface StoryforgePersistence2 {
  loadCampaign(campaignId: string): Promise<Sf2State | null>
  saveCampaign(state: Sf2State): Promise<void>
  listCampaigns(): Promise<Sf2CampaignListItem[]>
  deleteCampaign(campaignId: string): Promise<void>
  saveChapterArtifact(record: Sf2ChapterArtifactRecord): Promise<void>
  loadChapterArtifacts(campaignId: string): Promise<Sf2ChapterArtifactRecord[]>
}
