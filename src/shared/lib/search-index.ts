import { parseWikitext } from './wikitext-parser'

const STORAGE_KEY = 'fotoswiki_search_index_v3'
const TTL_MS = 7 * 24 * 60 * 60 * 1000
const BATCH = 50
const CONCURRENCY = 5

export interface SearchEntry {
  title: string
  text: string // concatenated searchable fields
}

interface StoredIndex {
  lastUpdated: number
  entries: SearchEntry[]
}

export function clearSearchIndex() {
  try {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem('fotoswiki_search_index_v2') // clean up old key
  } catch { /* ignore */ }
}

export function getSearchIndex(): SearchEntry[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const stored: StoredIndex = JSON.parse(raw)
    if (Date.now() - stored.lastUpdated > TTL_MS) return null
    return stored.entries
  } catch {
    return null
  }
}

function saveSearchIndex(entries: SearchEntry[]) {
  try {
    const stored: StoredIndex = { lastUpdated: Date.now(), entries }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // localStorage full — skip cache
  }
}

async function fetchWikitextBatch(titles: string[]): Promise<Record<string, string>> {
  const BASE = 'https://www.mairenawiki.es/wiki/api.php'
  const url = new URL(BASE)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  url.searchParams.set('action', 'query')
  url.searchParams.set('titles', titles.join('|'))
  url.searchParams.set('prop', 'revisions')
  url.searchParams.set('rvprop', 'content')

  const res = await fetch(url.toString())
  const data = await res.json()
  const pages = (data.query?.pages ?? {}) as Record<string, Record<string, unknown>>

  const result: Record<string, string> = {}
  for (const page of Object.values(pages)) {
    const title = page.title as string
    const revisions = page.revisions as Array<Record<string, unknown>> | undefined
    const wikitext = (revisions?.[0]?.['*'] as string) ?? ''
    if (title && wikitext) result[title] = wikitext
  }
  return result
}

function processWikitexts(wikitexts: Record<string, string>): SearchEntry[] {
  return Object.entries(wikitexts).map(([title, wikitext]) => {
    const meta = parseWikitext(wikitext)
    const categories = [...wikitext.matchAll(/\[\[Categor[ií]a:([^\]]+)\]\]/gi)]
      .map((m) => m[1].trim())
    return {
      title,
      text: [
        title,
        title.replace(/_/g, ' '),
        meta.name,
        meta.description,
        meta.date,
        meta.author,
        meta.origin,
        meta.location,
        ...meta.persons,
        ...categories,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase(),
    }
  })
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

  saveSearchIndex(entries)
  return entries
}

export function searchLocal(query: string, index: SearchEntry[]): string[] {
  const words = query.toLowerCase().trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  return index
    .filter((e) => words.every((w) => e.text.includes(w) || e.title.toLowerCase().includes(w)))
    .map((e) => e.title)
}
