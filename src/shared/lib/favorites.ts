import type { WikiPhoto } from '../types/wiki.types'

const FAVORITES_KEY = 'fotoswiki_favorites'

export type FavoritePhoto = Pick<WikiPhoto, 'title' | 'thumbUrl' | 'imageUrl' | 'description' | 'date' | 'wikiUrl'>

export function getFavorites(): FavoritePhoto[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? '[]')
  } catch {
    return []
  }
}

export function toggleFavorite(photo: FavoritePhoto): boolean {
  const favs = getFavorites()
  const idx = favs.findIndex((f) => f.title === photo.title)
  if (idx >= 0) {
    favs.splice(idx, 1)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
    return false
  }
  favs.push(photo)
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs))
  return true
}

export function isFavorite(title: string): boolean {
  return getFavorites().some((f) => f.title === title)
}
