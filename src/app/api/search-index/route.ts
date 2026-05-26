import { NextResponse } from 'next/server'
import {
  buildEntriesFromWikitexts,
  fetchWikitextBatch,
  type SearchEntry,
} from '@/shared/lib/search-index-core'
import { fetchMediaWikiJson } from '@/shared/lib/mediawiki-fetch'

export const revalidate = 86400 // 24 hours
export const maxDuration = 60

const BATCH = 50
const CONCURRENCY = 5

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

    const data = await fetchMediaWikiJson<{
      query?: { categorymembers?: Array<{ title: string }> }
      continue?: { cmcontinue?: string }
      'query-continue'?: { categorymembers?: { cmcontinue?: string } }
    }>(params)
    const members = (data.query?.categorymembers ?? []) as Array<{ title: string }>
    titles.push(...members.map((m) => m.title))
    cmcontinue =
      (data.continue?.cmcontinue as string | undefined) ??
      (data['query-continue']?.categorymembers?.cmcontinue as string | undefined)
  } while (cmcontinue)

  return titles
}

function buildEntries(wikitexts: Record<string, string>): SearchEntry[] {
  return buildEntriesFromWikitexts(wikitexts)
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
