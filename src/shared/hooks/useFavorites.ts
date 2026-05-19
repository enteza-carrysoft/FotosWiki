'use client'

import { useCallback, useEffect, useState } from 'react'
import { getFavorites, isFavorite, toggleFavorite } from '../lib/favorites'
import type { FavoritePhoto } from '../lib/favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePhoto[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const toggle = useCallback((photo: FavoritePhoto): boolean => {
    const added = toggleFavorite(photo)
    setFavorites(getFavorites())
    return added
  }, [])

  const checkIsFavorite = useCallback((title: string) => isFavorite(title), [])

  return { favorites, toggle, checkIsFavorite }
}
