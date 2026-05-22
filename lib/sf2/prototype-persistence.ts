import type { Sf2PrototypeSession } from '@/components/sf2/prototype-session'

export type Sf2PrototypeSaveSlotNumber = 1 | 2 | 3

export interface Sf2PrototypeSaveSlotData {
  slot: Sf2PrototypeSaveSlotNumber
  savedAt: string
  campaignId: string
  briefId: string
  title: string
  genre: string
  hook: string
  playerName: string
  playerClass: string
  playerOrigin: string
  chapterNumber: number
  chapterTitle: string
  turnCount: number
  transcriptCount: number
  session: Sf2PrototypeSession
}

export interface Sf2PrototypeSlotPersistence {
  getSaveSlot(slot: Sf2PrototypeSaveSlotNumber): Promise<Sf2PrototypeSaveSlotData | null>
  listSaveSlots(): Promise<(Sf2PrototypeSaveSlotData | null)[]>
  saveToSlot(slot: Sf2PrototypeSaveSlotNumber, session: Sf2PrototypeSession): Promise<void>
}

const DB_NAME = 'storyforge_sf2_prototype'
const DB_VERSION = 1
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

function summarizeSaveSlot(
  slot: Sf2PrototypeSaveSlotNumber,
  session: Sf2PrototypeSession,
): Sf2PrototypeSaveSlotData {
  return {
    slot,
    savedAt: new Date().toISOString(),
    campaignId: session.state.meta.campaignId,
    briefId: session.brief.id,
    title: session.brief.title,
    genre: session.brief.genre,
    hook: session.brief.hook,
    playerName: session.state.player.name,
    playerClass: session.state.player.class.name,
    playerOrigin: session.state.player.origin.name,
    chapterNumber: session.state.meta.currentChapter,
    chapterTitle: session.state.chapter.title || session.brief.title,
    turnCount: session.state.history.turns.length,
    transcriptCount: session.transcript.length,
    session,
  }
}

function normalizeSaveSlot(raw: unknown): Sf2PrototypeSaveSlotData | null {
  if (!raw || typeof raw !== 'object') return null
  const record = raw as Partial<Sf2PrototypeSaveSlotData>
  if (record.slot !== 1 && record.slot !== 2 && record.slot !== 3) return null
  const session = record.session
  if (!session || typeof session !== 'object') return null
  if (!session.state || !session.brief) return null

  return {
    slot: record.slot,
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : session.state.meta.updatedAt,
    campaignId: session.state.meta.campaignId,
    briefId: session.brief.id,
    title: session.brief.title,
    genre: session.brief.genre,
    hook: session.brief.hook,
    playerName: session.state.player.name,
    playerClass: session.state.player.class.name,
    playerOrigin: session.state.player.origin.name,
    chapterNumber: session.state.meta.currentChapter,
    chapterTitle: session.state.chapter.title || session.brief.title,
    turnCount: session.state.history.turns.length,
    transcriptCount: session.transcript.length,
    session,
  }
}

class IndexedDbPrototypeSlotPersistence implements Sf2PrototypeSlotPersistence {
  private dbPromise?: Promise<IDBDatabase>

  private db(): Promise<IDBDatabase> {
    if (!this.dbPromise) this.dbPromise = openDb()
    return this.dbPromise
  }

  async getSaveSlot(slot: Sf2PrototypeSaveSlotNumber): Promise<Sf2PrototypeSaveSlotData | null> {
    const db = await this.db()
    const tx = db.transaction(STORE_SAVE_SLOTS, 'readonly')
    const store = tx.objectStore(STORE_SAVE_SLOTS)
    const result = await txAwait(tx, store.get(slot))
    return normalizeSaveSlot(result)
  }

  async listSaveSlots(): Promise<(Sf2PrototypeSaveSlotData | null)[]> {
    return Promise.all(([1, 2, 3] as const).map((slot) => this.getSaveSlot(slot)))
  }

  async saveToSlot(slot: Sf2PrototypeSaveSlotNumber, session: Sf2PrototypeSession): Promise<void> {
    const db = await this.db()
    const tx = db.transaction(STORE_SAVE_SLOTS, 'readwrite')
    await txAwait(tx, tx.objectStore(STORE_SAVE_SLOTS).put(summarizeSaveSlot(slot, session)))
  }
}

export function createSf2PrototypeSlotPersistence(): Sf2PrototypeSlotPersistence {
  return new IndexedDbPrototypeSlotPersistence()
}
