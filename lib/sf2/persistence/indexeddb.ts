import type { Sf2State } from '../types'
import type {
  Sf2CampaignListItem,
  Sf2ChapterArtifactRecord,
  Sf2SaveSlotData,
  Sf2SaveSlotNumber,
  StoryforgePersistence2,
} from './types'
import {
  normalizePersistedSf2State,
  normalizeSf2StateForPersistence,
} from './normalize'

const DB_NAME = 'storyforge_sf2'
const DB_VERSION = 2
const STORE_CAMPAIGNS = 'campaigns'
const STORE_ARTIFACTS = 'chapter_artifacts'
const STORE_INDEX = 'campaign_index'
const STORE_SAVE_SLOTS = 'save_slots'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available in this environment'))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_CAMPAIGNS)) {
        db.createObjectStore(STORE_CAMPAIGNS, { keyPath: 'meta.campaignId' })
      }
      if (!db.objectStoreNames.contains(STORE_ARTIFACTS)) {
        const s = db.createObjectStore(STORE_ARTIFACTS, { keyPath: ['campaignId', 'chapter'] })
        s.createIndex('by_campaign', 'campaignId', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_INDEX)) {
        db.createObjectStore(STORE_INDEX, { keyPath: 'campaignId' })
      }
      if (!db.objectStoreNames.contains(STORE_SAVE_SLOTS)) {
        db.createObjectStore(STORE_SAVE_SLOTS, { keyPath: 'slot' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function txAwait<T>(tx: IDBTransaction, request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.onerror = () => reject(tx.error)
  })
}

function summarizeSaveSlot(slot: Sf2SaveSlotNumber, state: Sf2State): Sf2SaveSlotData {
  const savedAt = new Date().toISOString()
  return {
    slot,
    savedAt,
    campaignId: state.meta.campaignId,
    playerName: state.player.name,
    playerClass: state.player.class.name,
    playerOrigin: state.player.origin.name,
    genreId: state.meta.genreId,
    chapterNumber: state.meta.currentChapter,
    chapterTitle: state.chapter.title || state.meta.hookTitle || 'Chapter setup pending',
    turnCount: state.history.turns.length,
    state,
  }
}

function normalizeSaveSlot(raw: unknown): Sf2SaveSlotData | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Partial<Sf2SaveSlotData>
  if (record.slot !== 1 && record.slot !== 2 && record.slot !== 3) return null
  const normalized = normalizePersistedSf2State(record.state)
  if (!normalized) return null
  const state = normalized.state
  return {
    slot: record.slot,
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : state.meta.updatedAt,
    campaignId: state.meta.campaignId,
    playerName: typeof record.playerName === 'string' ? record.playerName : state.player.name,
    playerClass: typeof record.playerClass === 'string' ? record.playerClass : state.player.class.name,
    playerOrigin: typeof record.playerOrigin === 'string' ? record.playerOrigin : state.player.origin.name,
    genreId: typeof record.genreId === 'string' ? record.genreId : state.meta.genreId,
    chapterNumber: state.meta.currentChapter,
    chapterTitle:
      typeof record.chapterTitle === 'string' && record.chapterTitle.trim()
        ? record.chapterTitle
        : state.chapter.title || state.meta.hookTitle || 'Chapter setup pending',
    turnCount: typeof record.turnCount === 'number' ? record.turnCount : state.history.turns.length,
    state,
  }
}

export class IndexedDbPersistence implements StoryforgePersistence2 {
  private dbPromise?: Promise<IDBDatabase>

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb()
    return this.dbPromise
  }

  async loadCampaign(campaignId: string): Promise<Sf2State | null> {
    const db = await this.db()
    const tx = db.transaction(STORE_CAMPAIGNS, 'readonly')
    const store = tx.objectStore(STORE_CAMPAIGNS)
    const result = await txAwait(tx, store.get(campaignId))
    return normalizePersistedSf2State(result)?.state ?? null
  }

  async saveCampaign(state: Sf2State): Promise<void> {
    const normalized = normalizeSf2StateForPersistence(state)
    const db = await this.db()
    const tx = db.transaction([STORE_CAMPAIGNS, STORE_INDEX], 'readwrite')
    const campaigns = tx.objectStore(STORE_CAMPAIGNS)
    const index = tx.objectStore(STORE_INDEX)
    await txAwait(tx, campaigns.put(normalized))
    const item: Sf2CampaignListItem = {
      campaignId: normalized.meta.campaignId,
      genreId: normalized.meta.genreId,
      playbookId: normalized.meta.playbookId,
      originId: normalized.meta.originId,
      currentChapter: normalized.meta.currentChapter,
      updatedAt: normalized.meta.updatedAt,
    }
    await txAwait(tx, index.put(item))
  }

  async listCampaigns(): Promise<Sf2CampaignListItem[]> {
    const db = await this.db()
    const tx = db.transaction(STORE_INDEX, 'readonly')
    const store = tx.objectStore(STORE_INDEX)
    const req = store.getAll()
    return txAwait(tx, req) as Promise<Sf2CampaignListItem[]>
  }

  async deleteCampaign(campaignId: string): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(
      [STORE_CAMPAIGNS, STORE_INDEX, STORE_ARTIFACTS],
      'readwrite'
    )
    await txAwait(tx, tx.objectStore(STORE_CAMPAIGNS).delete(campaignId))
    await txAwait(tx, tx.objectStore(STORE_INDEX).delete(campaignId))
    const artifactStore = tx.objectStore(STORE_ARTIFACTS)
    const byCampaign = artifactStore.index('by_campaign')
    const cursorReq = byCampaign.openCursor(IDBKeyRange.only(campaignId))
    await new Promise<void>((resolve, reject) => {
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result
        if (cursor) {
          cursor.delete()
          cursor.continue()
        } else {
          resolve()
        }
      }
      cursorReq.onerror = () => reject(cursorReq.error)
    })
  }

  async getSaveSlot(slot: Sf2SaveSlotNumber): Promise<Sf2SaveSlotData | null> {
    const db = await this.db()
    const tx = db.transaction(STORE_SAVE_SLOTS, 'readonly')
    const store = tx.objectStore(STORE_SAVE_SLOTS)
    const result = await txAwait(tx, store.get(slot))
    return normalizeSaveSlot(result)
  }

  async listSaveSlots(): Promise<(Sf2SaveSlotData | null)[]> {
    return Promise.all(([1, 2, 3] as const).map((slot) => this.getSaveSlot(slot)))
  }

  async saveToSlot(slot: Sf2SaveSlotNumber, state: Sf2State): Promise<void> {
    const normalized = normalizeSf2StateForPersistence(state)
    const db = await this.db()
    const tx = db.transaction(STORE_SAVE_SLOTS, 'readwrite')
    await txAwait(tx, tx.objectStore(STORE_SAVE_SLOTS).put(summarizeSaveSlot(slot, normalized)))
  }

  async saveChapterArtifact(record: Sf2ChapterArtifactRecord): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(STORE_ARTIFACTS, 'readwrite')
    await txAwait(tx, tx.objectStore(STORE_ARTIFACTS).put(record))
  }

  async loadChapterArtifacts(campaignId: string): Promise<Sf2ChapterArtifactRecord[]> {
    const db = await this.db()
    const tx = db.transaction(STORE_ARTIFACTS, 'readonly')
    const store = tx.objectStore(STORE_ARTIFACTS)
    const index = store.index('by_campaign')
    const req = index.getAll(IDBKeyRange.only(campaignId))
    return txAwait(tx, req) as Promise<Sf2ChapterArtifactRecord[]>
  }
}

export function createIndexedDbPersistence(): StoryforgePersistence2 {
  return new IndexedDbPersistence()
}
