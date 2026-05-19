'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getCategoryPhotos, getBatchThumbs } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb } from '@/shared/types/wiki.types'

const BATCH = 24

export function useInfinitePhotos(category: string) {
  const [photos, setPhotos] = useState<PhotoThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cmcontinueRef = useRef<string | undefined>(undefined)
  const categoryRef = useRef(category)

  // Reset when category changes
  useEffect(() => {
    if (categoryRef.current === category) return
    categoryRef.current = category
    cmcontinueRef.current = undefined
    setPhotos([])
    setHasMore(true)
  }, [category])

  const loadMore = useCallback(async () => {
    if (loading) return
    setLoading(true)
    try {
      const currentCategory = categoryRef.current
      const { members, nextContinue } = await getCategoryPhotos(
        currentCategory,
        cmcontinueRef.current,
        BATCH
      )

      if (members.length === 0) {
        setHasMore(false)
        return
      }

      const titles = members.map((m) => m.title)
      const thumbs = await getBatchThumbs(titles, 400)

      // Only add photos that have a valid image
      const newPhotos = titles
        .filter((t) => thumbs[t]?.thumbUrl)
        .map((t) => thumbs[t])

      // Guard against stale category updates
      if (categoryRef.current !== currentCategory) return

      setPhotos((prev) => [...prev, ...newPhotos])
      cmcontinueRef.current = nextContinue
      setHasMore(!!nextContinue)
    } catch {
      // network error — allow retry
    } finally {
      setLoading(false)
    }
  }, [loading])

  // Initial load
  useEffect(() => {
    loadMore()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category])

  return { photos, loading, hasMore, loadMore }
}
