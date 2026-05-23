'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getCategoryPhotos, getBatchThumbs } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb } from '@/shared/types/wiki.types'

const BATCH = 48
// Si tras N batches consecutivos no se añade ninguna foto, se considera
// que la categoría no tiene más fotos válidas y se detiene el scroll infinito
// para no martillear la API de MediaWiki en bucle.
const MAX_EMPTY_BATCHES = 3

export function useInfinitePhotos(category: string) {
  const [photos, setPhotos] = useState<PhotoThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cmcontinueRef = useRef<string | undefined>(undefined)
  const loadingRef = useRef(false)
  const categoryRef = useRef(category)
  const abortRef = useRef<AbortController | null>(null)
  const emptyBatchesRef = useRef(0)

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const currentCategory = categoryRef.current
    const controller = new AbortController()
    abortRef.current = controller
    try {
      const { members, nextContinue } = await getCategoryPhotos(
        currentCategory,
        cmcontinueRef.current,
        BATCH,
        controller.signal
      )

      if (members.length === 0) {
        setHasMore(false)
        return
      }

      const titles = members.map((m) => m.title)
      const thumbs = await getBatchThumbs(titles, 240, controller.signal)

      // Discard results if category changed while loading
      if (categoryRef.current !== currentCategory || controller.signal.aborted) return

      const newPhotos = titles
        .filter((t) => thumbs[t]?.thumbUrl)
        .map((t) => thumbs[t])

      // Guard anti-loop: si un batch no añade fotos, contar.
      // Tras MAX_EMPTY_BATCHES seguidos cortamos hasMore para no machacar la API.
      if (newPhotos.length === 0) {
        emptyBatchesRef.current += 1
      } else {
        emptyBatchesRef.current = 0
        setPhotos((prev) => [...prev, ...newPhotos])
      }

      cmcontinueRef.current = nextContinue
      const reachedEnd = !nextContinue || emptyBatchesRef.current >= MAX_EMPTY_BATCHES
      setHasMore(!reachedEnd)
    } catch {
      // network error or aborted — allow retry
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
    emptyBatchesRef.current = 0
    abortRef.current?.abort()
    setPhotos([])
    setHasMore(true)
    setLoading(false)

    const controller = new AbortController()
    abortRef.current = controller

    const doLoad = async () => {
      loadingRef.current = true
      setLoading(true)
      try {
        const { members, nextContinue } = await getCategoryPhotos(category, undefined, BATCH, controller.signal)
        if (controller.signal.aborted) return
        if (members.length === 0) { setHasMore(false); return }
        const titles = members.map((m) => m.title)
        const thumbs = await getBatchThumbs(titles, 240, controller.signal)
        if (controller.signal.aborted) return
        const newPhotos = titles.filter((t) => thumbs[t]?.thumbUrl).map((t) => thumbs[t])
        if (newPhotos.length === 0) emptyBatchesRef.current = 1
        setPhotos(newPhotos)
        cmcontinueRef.current = nextContinue
        setHasMore(!!nextContinue)
      } catch {
        // allow retry via loadMore
      } finally {
        if (!controller.signal.aborted) { loadingRef.current = false; setLoading(false) }
      }
    }
    doLoad()
    return () => { controller.abort() }
  }, [category])

  // Final unmount cleanup
  useEffect(() => () => abortRef.current?.abort(), [])

  return { photos, loading, hasMore, loadMore }
}
