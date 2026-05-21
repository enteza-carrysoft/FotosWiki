import { NextResponse } from 'next/server'
import { parseWikitext } from '@/shared/lib/wikitext-parser'
import type { SearchEntry } from '@/shared/lib/search-index'

export const revalidate = 86400 // 24 hours
export const maxDuration = 60

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'
const BATCH = 50
const CONCURRENCY = 5

function buildUrl(params: Record<string, string>): string {
  const url = new URL(WIKI_API)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

async function getAllPhotoTitles(): Promise<string[]> {
  const titles: string[] = []
  let cmcontinue: string | undefined

  do {
    const params: Record<string, string> = {
      action: 'query',
      list: 'categorymembers',
      cmtitle: 'Categoría:Fotos',
      cmlimit: '500',
      cmnamespace: '0',
    }
    if (cmcontinue) params.cmcontinue = cmcontinue

    const res = await fetch(buildUrl(params))
    const data = await res.json()
    const members = (data.query?.categorymembers ?? []) as Array<{ title: string }>
    titles.push(...members.map((m) => m.title))
    cmcontinue =
      (data.continue?.cmcontinue as string | undefined) ??
      (data['query-continue']?.categorymembers?.cmcontinue as string | undefined)
  } while (cmcontinue)

  return titles
}

async function fetchWikitextBatch(titles: string[]): Promise<Record<string, string>> {
  const res = await fetch(
    buildUrl({
      action: 'query',
      titles: titles.join('|'),
      prop: 'revisions',
      rvprop: 'content',
    })
  )
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

function buildEntries(wikitexts: Record<string, string>): SearchEntry[] {
  return Object.entries(wikitexts).map(([title, wikitext]) => {
    const meta = parseWikitext(wikitext)
    const categories = [...wikitext.matchAll(/\[\[Categor[ií]a:([^\]]+)\]\]/gi)].map((m) =>
      m[1].trim()
    )
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
        ...meta.observations,
        ...categories,
      ]
        .filter(Boolean)
        .join('\x00')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .toLowerCase(),
    }
  })
}

export async function GET() {
  try {
    const titles = await getAllPhotoTitles()

    const batches: string[][] = []
    for (let i = 0; i < titles.length; i += BATCH) {
      batches.push(titles.slice(i, i + BATCH))
    }

    const entries: SearchEntry[] = []
    for (let i = 0; i < batches.length; i += CONCURRENCY) {
      const chunk = batches.slice(i, i + CONCURRENCY)
      const results = await Promise.all(chunk.map(fetchWikitextBatch))
      for (const wikitexts of results) {
        entries.push(...buildEntries(wikitexts))
      }
    }

    return NextResponse.json(entries, {
      headers: {
        'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Failed to build index' }, { status: 500 })
  }
}
