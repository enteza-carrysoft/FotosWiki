import {
  buildEntriesFromWikitexts,
  fetchWikitextBatch,
  normalizeSearchText,
  type SearchEntry,
} from './search-index-core'

export type { SearchEntry } from './search-index-core'

const LS_KEY = 'fotoswiki_search_index_v7'
const IDB_KEY = 'search-index-v7'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const BATCH = 50
const CONCURRENCY = 5

interface StoredIndex {
  lastUpdated: number
  entries: SearchEntry[]
}

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME = 'fotoswiki-db'
const DB_VERSION = 1
const STORE = 'kv'

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
}

async function idbGet<T>(key: string): Promise<T | null> {
  const db = await openDB()
  if (!db) return null
  return new Promise((resolve) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
    req.onsuccess = () => resolve((req.result as T) ?? null)
    req.onerror = () => resolve(null)
  })
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB()
  if (!db) return
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => resolve()
  })
}

// ── Public API ────────────────────────────────────────────────────────────────

// Load from IndexedDB (primary). Falls back to localStorage and migrates automatically.
export async function loadSearchIndex(): Promise<SearchEntry[] | null> {
  // 1. IndexedDB
  try {
    const stored = await idbGet<StoredIndex>(IDB_KEY)
    if (stored && Date.now() - stored.lastUpdated <= TTL_MS) return stored.entries
  } catch { /* fall through */ }

  // 2. localStorage fallback + auto-migration
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const stored: StoredIndex = JSON.parse(raw)
      if (Date.now() - stored.lastUpdated <= TTL_MS) {
        idbSet(IDB_KEY, stored) // migrate — fire-and-forget
        localStorage.removeItem(LS_KEY) // free up space
        return stored.entries
      }
    }
  } catch { /* fall through */ }

  return null
}

async function saveSearchIndex(entries: SearchEntry[]): Promise<void> {
  const stored: StoredIndex = { lastUpdated: Date.now(), entries }
  await idbSet(IDB_KEY, stored)
  try { localStorage.removeItem(LS_KEY) } catch { /* ignore */ }
}

export function clearSearchIndex(): void {
  idbDelete(IDB_KEY) // fire-and-forget
  try {
    localStorage.removeItem(LS_KEY)
    localStorage.removeItem('fotoswiki_search_index_v6')
    localStorage.removeItem('fotoswiki_search_index_v5')
    localStorage.removeItem('fotoswiki_search_index_v4')
    localStorage.removeItem('fotoswiki_search_index_v3')
    localStorage.removeItem('fotoswiki_search_index_v2')
  } catch { /* ignore */ }
}

// ── Core logic (unchanged) ────────────────────────────────────────────────────

function processWikitexts(wikitexts: Record<string, string>): SearchEntry[] {
  return buildEntriesFromWikitexts(wikitexts)
}

export async function fetchServerSearchIndex(): Promise<SearchEntry[] | null> {
  try {
    const res = await fetch('/api/search-index')
    if (!res.ok) return null
    const entries: unknown = await res.json()
    if (!Array.isArray(entries)) return null
    saveSearchIndex(entries as SearchEntry[]) // fire-and-forget
    return entries as SearchEntry[]
  } catch {
    return null
  }
}

export async function buildSearchIndex(
  titles: string[],
  onProgress?: (pct: number) => void
): Promise<SearchEntry[]> {
  const entries: SearchEntry[] = []
  const batches: string[][] = []

  for (let i = 0; i < titles.length; i += BATCH) {
    batches.push(titles.slice(i, i + BATCH))
  }

  let completed = 0

  for (let i = 0; i < batches.length; i += CONCURRENCY) {
    const chunk = batches.slice(i, i + CONCURRENCY)
    const results = await Promise.all(chunk.map(fetchWikitextBatch))
    for (const wikitexts of results) {
      entries.push(...processWikitexts(wikitexts))
    }
    completed += chunk.length
    onProgress?.(Math.round((completed / batches.length) * 100))
  }

  saveSearchIndex(entries) // fire-and-forget
  return entries
}

export function searchLocal(query: string, index: SearchEntry[]): string[] {
  const q = query
    .replace(/[“”„‟❝❞]/g, '"') // smart double quotes → straight
    .replace(/[‘’‚‛❛❜]/g, "'") // smart single quotes → straight
    .trim()

  const normalized = normalizeSearchText(q)
  if (!normalized) return []

  const phrases: string[] = []
  const phraseRegex = /["“”]([^"“”]+)["“”]/g
  let m
  while ((m = phraseRegex.exec(normalized)) !== null) {
    const p = m[1].trim()
    if (p) phrases.push(p)
  }
  const words = normalized
    .replace(/["“”][^"“”]*["“”]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (phrases.length === 0 && words.length === 0) return []

  return index
    .filter((e) => {
      const fields = e.text.split('\x00')
      const phraseOk = phrases.every((p) => fields.some((f) => f.includes(p)))
      const wordsOk = words.every((w) => fields.some((f) => f.includes(w)))
      return phraseOk && wordsOk
    })
    .map((e) => e.title)
}
