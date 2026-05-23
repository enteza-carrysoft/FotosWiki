import type { MetadataRoute } from 'next'

export const revalidate = 86400 // 24 h, same cadence as search index

const WIKI_API = 'https://www.mairenawiki.es/wiki/api.php'

function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'https://fotoswiki.vercel.app'
}

async function getAllPhotoTitles(): Promise<string[]> {
  const titles: string[] = []
  let cmcontinue: string | undefined

  do {
    const url = new URL(WIKI_API)
    url.searchParams.set('format', 'json')
    url.searchParams.set('origin', '*')
    url.searchParams.set('action', 'query')
    url.searchParams.set('list', 'categorymembers')
    url.searchParams.set('cmtitle', 'Categoría:Fotos')
    url.searchParams.set('cmlimit', '500')
    url.searchParams.set('cmnamespace', '0')
    if (cmcontinue) url.searchParams.set('cmcontinue', cmcontinue)

    const res = await fetch(url.toString(), { next: { revalidate: 86400 } })
    const data = await res.json()
    const members = (data.query?.categorymembers ?? []) as Array<{ title: string }>
    titles.push(...members.map((m: { title: string }) => m.title))
    cmcontinue =
      (data.continue?.cmcontinue as string | undefined) ??
      (data['query-continue']?.categorymembers?.cmcontinue as string | undefined)
  } while (cmcontinue)

  return titles
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: base, priority: 1.0, changeFrequency: 'weekly' },
    { url: `${base}/gallery`, priority: 0.9, changeFrequency: 'daily' },
    { url: `${base}/favorites`, priority: 0.3, changeFrequency: 'never' },
  ]

  try {
    const titles = await getAllPhotoTitles()
    const photoRoutes: MetadataRoute.Sitemap = titles.map((title) => ({
      url: `${base}/foto/${encodeURIComponent(title)}`,
      priority: 0.7,
      changeFrequency: 'monthly' as const,
    }))
    return [...staticRoutes, ...photoRoutes]
  } catch {
    return staticRoutes
  }
}
