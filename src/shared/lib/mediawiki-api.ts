import type { CategoryMember, PhotoThumb, WikiPhoto } from '@/shared/types/wiki.types'
import { parseWikitext } from './wikitext-parser'

const BASE = 'https://www.mairenawiki.es/wiki/api.php'

function buildUrl(params: Record<string, string>): string {
  const url = new URL(BASE)
  url.searchParams.set('format', 'json')
  url.searchParams.set('origin', '*')
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, v)
  }
  return url.toString()
}

export async function getCategoryPhotos(
  category: string,
  cmcontinue?: string,
  limit = 50
): Promise<{ members: CategoryMember[]; nextContinue?: string }> {
  const params: Record<string, string> = {
    action: 'query',
    list: 'categorymembers',
    cmtitle: `Categoría:${category}`,
    cmlimit: String(limit),
    cmnamespace: '0',
  }
  if (cmcontinue) params.cmcontinue = cmcontinue

  const res = await fetch(buildUrl(params))
  const data = await res.json()
  return {
    members: (data.query?.categorymembers ?? []) as CategoryMember[],
    nextContinue: data['query-continue']?.categorymembers?.cmcontinue as string | undefined,
  }
}

// Batch fetch thumbnail URLs for up to 50 photo titles in a single API call
export async function getBatchThumbs(
  photoTitles: string[],
  width = 400
): Promise<Record<string, PhotoThumb>> {
  if (photoTitles.length === 0) return {}

  const archiveTitles = photoTitles.map((t) => `Archivo:${t}.jpg`).join('|')
  const res = await fetch(
    buildUrl({
      action: 'query',
      titles: archiveTitles,
      prop: 'imageinfo',
      iiprop: 'url|size',
      iiurlwidth: String(width),
    })
  )
  const data = await res.json()
  const pages = (data.query?.pages ?? {}) as Record<string, Record<string, unknown>>

  const result: Record<string, PhotoThumb> = {}
  for (const page of Object.values(pages)) {
    const rawTitle = (page.title as string) ?? ''
    // Strip "Archivo:" prefix and ".jpg" suffix to get back photo title
    const title = rawTitle.replace(/^Archivo:/, '').replace(/\.jpg$/i, '')
    const imageinfo = (page.imageinfo as Array<{ url?: string; thumburl?: string }>)?.[0]
    if (imageinfo?.url) {
      result[title] = {
        title,
        thumbUrl: imageinfo.thumburl ?? imageinfo.url,
        wikiUrl: `https://www.mairenawiki.es/wiki/index.php?title=${encodeURIComponent(title)}`,
      }
    }
  }
  return result
}

export async function getPhotoData(title: string): Promise<WikiPhoto> {
  // Fetch page content + image filename in parallel
  const [contentRes, imageInfoRes] = await Promise.all([
    fetch(
      buildUrl({
        action: 'query',
        titles: title,
        prop: 'revisions|images|categories',
        rvprop: 'content',
        rvslots: 'main',
      })
    ),
    fetch(
      buildUrl({
        action: 'query',
        titles: `Archivo:${title}.jpg`,
        prop: 'imageinfo',
        iiprop: 'url|size',
        iiurlwidth: '800',
      })
    ),
  ])

  const [contentData, imageData] = await Promise.all([
    contentRes.json(),
    imageInfoRes.json(),
  ])

  // Parse content page
  const contentPages = contentData.query?.pages ?? {}
  const contentPage = Object.values(contentPages)[0] as Record<string, unknown>
  const revisions = contentPage?.revisions as Array<Record<string, unknown>> | undefined
  const firstRev = revisions?.[0] ?? {}
  const slots = firstRev.slots as Record<string, Record<string, string>> | undefined
  const wikitext: string = slots?.main?.['*'] ?? (firstRev['*'] as string) ?? ''
  const rawCategories = (contentPage?.categories as Array<{ title: string }>) ?? []
  const categories = rawCategories.map((c) => c.title.replace('Categoría:', ''))

  // Parse image info
  const imagePages = imageData.query?.pages ?? {}
  const imagePage = Object.values(imagePages)[0] as Record<string, unknown>
  const imageinfo = (imagePage?.imageinfo as Array<{ url?: string; thumburl?: string }>)?.[0]

  const meta = parseWikitext(wikitext)

  return {
    pageId: (contentPage?.pageid as number) ?? 0,
    title,
    description: meta.description || title,
    date: meta.date,
    author: meta.author,
    origin: meta.origin,
    categories,
    imageUrl: imageinfo?.url ?? '',
    thumbUrl: imageinfo?.thumburl ?? imageinfo?.url ?? '',
    wikiUrl: `https://www.mairenawiki.es/wiki/index.php?title=${encodeURIComponent(title)}`,
  }
}
