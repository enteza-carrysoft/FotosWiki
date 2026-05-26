'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getCategoryPhotos, getBatchThumbs } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb } from '@/shared/types/wiki.types'
import { fetchServerSearchIndex, loadSearchIndex } from '@/shared/lib/search-index'
import type { SearchEntry } from '@/shared/lib/search-index'

const BATCH = 48
// Si tras N batches consecutivos no se añade ninguna foto, se considera
// que la categoría no tiene más fotos válidas y se detiene el scroll infinito
// para no martillear la API de MediaWiki en bucle.
const MAX_EMPTY_BATCHES = 3

function parsePeriodCategory(category: string): { decade: number | null; unknown: boolean } | null {
  if (!category.startsWith('period:')) return null
  if (category === 'period:unknown') return { decade: null, unknown: true }
  const n = Number(category.replace('period:', ''))
  if (!Number.isInteger(n)) return null
  return { decade: n, unknown: false }
}

let periodIndexPromise: Promise<SearchEntry[] | null> | null = null

async function getPeriodIndex(): Promise<SearchEntry[] | null> {
  const cached = await loadSearchIndex()
  if (cached) return cached

  if (!periodIndexPromise) {
    periodIndexPromise = fetchServerSearchIndex()
  }
  return periodIndexPromise
}

function getTitlesForPeriod(entries: SearchEntry[], period: { decade: number | null; unknown: boolean }): string[] {
  if (period.unknown) {
    return entries.filter((e) => !e.year).map((e) => e.title)
  }

  const start = period.decade ?? 0
  const end = start + 9
  return entries
    .filter((e) => e.year && e.year >= start && e.year <= end)
    .map((e) => e.title)
}

export function useInfinitePhotos(category: string) {
  const [photos, setPhotos] = useState<PhotoThumb[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const cmcontinueRef = useRef<string | undefined>(undefined)
  const periodOffsetRef = useRef(0)
  const periodTitlesRef = useRef<string[]>([])
  const loadingRef = useRef(false)
  const categoryRef = useRef(category)
  const abortRef = useRef<AbortController | null>(null)
  const emptyBatchesRef = useRef(0)

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return
    loadingRef.current = true
    setLoading(true)
    const currentCategory = categoryRef.current
    const period = parsePeriodCategory(currentCategory)
    const controller = new AbortController()
    abortRef.current = controller
    try {
      if (period) {
        const start = periodOffsetRef.current
        const slice = periodTitlesRef.current.slice(start, start + BATCH)
        if (slice.length === 0) {
          setHasMore(false)
          return
        }

        const thumbs = await getBatchThumbs(slice, 240, controller.signal)
        if (categoryRef.current !== currentCategory || controller.signal.aborted) return

        const newPhotos = slice.filter((t) => thumbs[t]?.thumbUrl).map((t) => thumbs[t])
        setPhotos((prev) => [...prev, ...newPhotos])
        periodOffsetRef.current += slice.length
        setHasMore(periodOffsetRef.current < periodTitlesRef.current.length)
        return
      }

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
    periodOffsetRef.current = 0
    periodTitlesRef.current = []

    const controller = new AbortController()
    abortRef.current = controller

    const doLoad = async () => {
      loadingRef.current = true
      setLoading(true)
      try {
        const period = parsePeriodCategory(category)
        if (period) {
          const entries = await getPeriodIndex()
          if (controller.signal.aborted) return
          if (!entries) {
            setHasMore(false)
            return
          }

          periodTitlesRef.current = getTitlesForPeriod(entries, period)
          periodOffsetRef.current = 0

          const firstSlice = periodTitlesRef.current.slice(0, BATCH)
          if (firstSlice.length === 0) {
            setPhotos([])
            setHasMore(false)
            return
          }

          const thumbs = await getBatchThumbs(firstSlice, 240, controller.signal)
          if (controller.signal.aborted) return

          const newPhotos = firstSlice.filter((t) => thumbs[t]?.thumbUrl).map((t) => thumbs[t])
          setPhotos(newPhotos)
          periodOffsetRef.current = firstSlice.length
          setHasMore(periodOffsetRef.current < periodTitlesRef.current.length)
          return
        }

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
