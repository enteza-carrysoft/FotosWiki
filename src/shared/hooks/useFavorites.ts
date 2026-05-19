'use client'

import { useCallback, useEffect, useState } from 'react'
import { getFavorites, isFavorite, toggleFavorite } from '../lib/favorites'
import type { FavoritePhoto } from '../lib/favorites'

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoritePhoto[]>([])

  useEffect(() => {
    setFavorites(getFavorites())
  }, [])

  const toggle = useCallback((photo: FavoritePhoto) => {
    toggleFavorite(photo)
    setFavorites(getFavorites())
  }, [])

  const checkIsFavorite = useCallback((title: string) => isFavorite(title), [])

  return { favorites, toggle, checkIsFavorite }
}
