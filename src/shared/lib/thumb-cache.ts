import type { PhotoThumb } from '@/shared/types/wiki.types'
import { getBatchThumbs } from './mediawiki-api'

// In-memory cache for thumbnail URLs — survives across hooks within a session.
const cache = new Map<string, PhotoThumb>()

export async function getThumbsCached(
  titles: string[],
  width = 400,
  signal?: AbortSignal
): Promise<Record<string, PhotoThumb>> {
  const result: Record<string, PhotoThumb> = {}
  const missing: string[] = []

  for (const t of titles) {
    const cached = cache.get(t)
    if (cached) result[t] = cached
    else missing.push(t)
  }

  if (missing.length === 0) return result

  const fresh = await getBatchThumbs(missing, width, signal)
  for (const [title, thumb] of Object.entries(fresh)) {
    cache.set(title, thumb)
    result[title] = thumb
  }
  return result
}

export function preloadImage(url: string | undefined) {
  if (!url || typeof window === 'undefined') return
  const img = new Image()
  img.src = url
}
