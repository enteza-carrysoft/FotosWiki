import type { PhotoIndex } from '@/shared/types/wiki.types'
import { getCategoryPhotos } from './mediawiki-api'

const INDEX_KEY = 'fotoswiki_photo_index_v2'
const INDEX_TTL = 7 * 24 * 60 * 60 * 1000 // 7 days

export function clearPhotoIndex() {
  try {
    localStorage.removeItem(INDEX_KEY)
    localStorage.removeItem('fotoswiki_photo_index') // clean up old key
  } catch { /* ignore */ }
}

export async function getOrBuildPhotoIndex(): Promise<PhotoIndex> {
  if (typeof window === 'undefined') {
    return { lastUpdated: 0, titles: [], total: 0 }
  }

  const cached = localStorage.getItem(INDEX_KEY)
  if (cached) {
    try {
      const index: PhotoIndex = JSON.parse(cached)
      if (Date.now() - index.lastUpdated < INDEX_TTL && index.titles.length > 0) {
        return index
      }
    } catch {
      // corrupted cache, rebuild
    }
  }

  const titles: string[] = []
  let cmcontinue: string | undefined

  do {
    const { members, nextContinue } = await getCategoryPhotos('Fotos', cmcontinue, 50)
    titles.push(...members.map((m) => m.title))
    cmcontinue = nextContinue
  } while (cmcontinue)

  const index: PhotoIndex = {
    lastUpdated: Date.now(),
    titles,
    total: titles.length,
  }

  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index))
  } catch {
    // localStorage might be full
  }

  return index
}

export async function getRandomPhotoTitle(): Promise<string> {
  const index = await getOrBuildPhotoIndex()

  if (index.titles.length === 0) {
    // Fallback: fetch directly from API
    const { members } = await getCategoryPhotos('Fotos', undefined, 50)
    const validMembers = members.filter((m) => m.title.startsWith('Foto'))
    if (validMembers.length === 0) throw new Error('No photos found')
    return validMembers[Math.floor(Math.random() * validMembers.length)].title
  }

  return index.titles[Math.floor(Math.random() * index.titles.length)]
}
