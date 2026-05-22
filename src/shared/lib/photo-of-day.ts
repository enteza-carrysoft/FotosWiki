import { getOrBuildPhotoIndex } from './photo-cache'
import { getPhotoData } from './mediawiki-api'
import type { WikiPhoto } from '../types/wiki.types'

const DAY_KEY = 'fotoswiki_photo_of_day'

interface CachedDayPhoto {
  date: string
  photo: WikiPhoto
}

// Use UTC throughout — `todayString` and `daysSinceEpoch` must reference the same day boundary,
// otherwise the photo of the day flips at midnight UTC vs local and shows two photos in succession.
function todayString(): string {
  return new Date().toISOString().split('T')[0]
}

function daysSinceEpoch(): number {
  const epoch = Date.UTC(2024, 0, 1)
  return Math.floor((Date.now() - epoch) / (1000 * 60 * 60 * 24))
}

export async function getPhotoOfDay(): Promise<WikiPhoto> {
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(DAY_KEY)
      if (cached) {
        const { date, photo }: CachedDayPhoto = JSON.parse(cached)
        if (date === todayString() && photo.thumbUrl) return photo
      }
    } catch {
      // corrupted — rebuild
    }
  }

  const index = await getOrBuildPhotoIndex()
  if (index.titles.length === 0) throw new Error('No photos in index')

  const title = index.titles[daysSinceEpoch() % index.titles.length]
  const photo = await getPhotoData(title)

  if (typeof window !== 'undefined' && photo.thumbUrl) {
    localStorage.setItem(DAY_KEY, JSON.stringify({ date: todayString(), photo }))
  }

  return photo
}
