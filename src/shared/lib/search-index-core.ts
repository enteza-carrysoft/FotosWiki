import { parseWikitext } from './wikitext-parser'
import { fetchMediaWikiJson } from './mediawiki-fetch'
import { resolvePhotoYearFromWikitext } from './photo-year'

export interface SearchEntry {
  title: string
  text: string
  year?: number
}

interface WikiQueryPagesResponse {
  query?: {
    pages?: Record<string, Record<string, unknown>>
  }
}

export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function extractCategories(wikitext: string): string[] {
  return [...wikitext.matchAll(/\[\[Categor[ií]a:([^\]]+)\]\]/gi)].map((match) => match[1].trim())
}

export function toSearchEntry(title: string, wikitext: string): SearchEntry {
  const meta = parseWikitext(wikitext)
  const yearResolution = resolvePhotoYearFromWikitext(wikitext)
  return {
    title,
    year: yearResolution.year ?? undefined,
    text: normalizeSearchText(
      [
        title,
        title.replace(/_/g, ' '),
        meta.name,
        meta.description,
        meta.date,
        meta.author,
        meta.origin,
        meta.location,
        ...meta.persons,
        ...meta.observations,
        ...extractCategories(wikitext),
      ]
        .filter(Boolean)
        .join('\x00')
    ),
  }
}

export function buildEntriesFromWikitexts(wikitexts: Record<string, string>): SearchEntry[] {
  return Object.entries(wikitexts).map(([title, wikitext]) => toSearchEntry(title, wikitext))
}

export async function fetchWikitextBatch(titles: string[]): Promise<Record<string, string>> {
  if (titles.length === 0) return {}

  const data = await fetchMediaWikiJson<WikiQueryPagesResponse>({
    action: 'query',
    titles: titles.join('|'),
    prop: 'revisions',
    rvprop: 'content',
  })

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
