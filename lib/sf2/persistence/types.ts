import type { Sf2ChapterArtifacts, Sf2ChapterNumber, Sf2State } from '../types'

export type Sf2SaveSlotNumber = 1 | 2 | 3

export interface Sf2CampaignListItem {
  campaignId: string
  genreId: string
  playbookId: string
  originId: string
  currentChapter: Sf2ChapterNumber
  updatedAt: string
}

export interface Sf2SaveSlotData {
  slot: Sf2SaveSlotNumber
  savedAt: string
  campaignId: string
  playerName: string
  playerClass: string
  playerOrigin: string
  genreId: string
  chapterNumber: Sf2ChapterNumber
  chapterTitle: string
  turnCount: number
  state: Sf2State
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
  getSaveSlot(slot: Sf2SaveSlotNumber): Promise<Sf2SaveSlotData | null>
  listSaveSlots(): Promise<(Sf2SaveSlotData | null)[]>
  saveToSlot(slot: Sf2SaveSlotNumber, state: Sf2State): Promise<void>
  saveChapterArtifact(record: Sf2ChapterArtifactRecord): Promise<void>
  loadChapterArtifacts(campaignId: string): Promise<Sf2ChapterArtifactRecord[]>
}
