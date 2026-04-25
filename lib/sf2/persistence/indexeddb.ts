import type { Sf2State } from '../types'
import type {
  Sf2CampaignListItem,
  Sf2ChapterArtifactRecord,
  StoryforgePersistence2,
} from './types'

const DB_NAME = 'storyforge_sf2'
const DB_VERSION = 1
const STORE_CAMPAIGNS = 'campaigns'
const STORE_ARTIFACTS = 'chapter_artifacts'
const STORE_INDEX = 'campaign_index'

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
    return (result as Sf2State | undefined) ?? null
  }

  async saveCampaign(state: Sf2State): Promise<void> {
    const db = await this.db()
    const tx = db.transaction([STORE_CAMPAIGNS, STORE_INDEX], 'readwrite')
    const campaigns = tx.objectStore(STORE_CAMPAIGNS)
    const index = tx.objectStore(STORE_INDEX)
    await txAwait(tx, campaigns.put(state))
    const item: Sf2CampaignListItem = {
      campaignId: state.meta.campaignId,
      genreId: state.meta.genreId,
      playbookId: state.meta.playbookId,
      originId: state.meta.originId,
      currentChapter: state.meta.currentChapter,
      updatedAt: state.meta.updatedAt,
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
