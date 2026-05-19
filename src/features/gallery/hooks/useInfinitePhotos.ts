'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getCategoryPhotos, getBatchThumbs } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb } from '@/shared/types/wiki.types'

const BATCH = 48

export function useInfinitePhotos(category: string) {
  const [photos, setPhotos] = useState<PhotoThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cmcontinueRef = useRef<string | undefined>(undefined)
  const loadingRef = useRef(false)
  const categoryRef = useRef(category)

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const currentCategory = categoryRef.current
    try {
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

      // Discard results if category changed while loading
      if (categoryRef.current !== currentCategory) return

      const newPhotos = titles
        .filter((t) => thumbs[t]?.thumbUrl)
        .map((t) => thumbs[t])

      setPhotos((prev) => [...prev, ...newPhotos])
      cmcontinueRef.current = nextContinue
      setHasMore(!!nextContinue)
    } catch {
      // network error — allow retry
    } finally {
      loadingRef.current = false
      setLoading(false)
    }
  }, [])

  // Reset and reload when category changes
  useEffect(() => {
    categoryRef.current = category
    cmcontinueRef.current = undefined
    loadingRef.current = false
    setPhotos([])
    setHasMore(true)
    setLoading(false)

    let cancelled = false
    const doLoad = async () => {
      loadingRef.current = true
      setLoading(true)
      try {
        const { members, nextContinue } = await getCategoryPhotos(category, undefined, BATCH)
        if (cancelled) return
        if (members.length === 0) { setHasMore(false); return }
        const titles = members.map((m) => m.title)
        const thumbs = await getBatchThumbs(titles, 400)
        if (cancelled) return
        const newPhotos = titles.filter((t) => thumbs[t]?.thumbUrl).map((t) => thumbs[t])
        setPhotos(newPhotos)
        cmcontinueRef.current = nextContinue
        setHasMore(!!nextContinue)
      } catch {
        // allow retry via loadMore
      } finally {
        if (!cancelled) { loadingRef.current = false; setLoading(false) }
      }
    }
    doLoad()
    return () => { cancelled = true }
  }, [category])

  return { photos, loading, hasMore, loadMore }
}
