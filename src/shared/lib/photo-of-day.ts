import { getOrBuildPhotoIndex } from './photo-cache'
import { getPhotoData } from './mediawiki-api'
import type { WikiPhoto } from '../types/wiki.types'

const DAY_KEY = 'fotoswiki_photo_of_day'

interface CachedDayPhoto {
  date: string
  photo: WikiPhoto
}

function todayString(): string {
  return new Date().toISOString().split('T')[0]
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

  // Deterministic: days since fixed epoch → always same photo per day
  const epoch = new Date('2024-01-01').getTime()
  const daysSinceEpoch = Math.floor((Date.now() - epoch) / (1000 * 60 * 60 * 24))
  const title = index.titles[daysSinceEpoch % index.titles.length]

  const photo = await getPhotoData(title)

  if (typeof window !== 'undefined' && photo.thumbUrl) {
    localStorage.setItem(DAY_KEY, JSON.stringify({ date: todayString(), photo }))
  }

  return photo
}
