'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { getThumbsCached } from '@/shared/lib/thumb-cache'
import { getOrBuildPhotoIndex } from '@/shared/lib/photo-cache'
import { getSearchIndex, buildSearchIndex, fetchServerSearchIndex, clearSearchIndex, searchLocal } from '@/shared/lib/search-index'
import { clearPhotoIndex } from '@/shared/lib/photo-cache'
import type { PhotoThumb } from '@/shared/types/wiki.types'

type IndexState = 'idle' | 'building' | 'ready'

export function usePhotoSearch(active: boolean) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<PhotoThumb[]>([])
  const [searching, setSearching] = useState(false)
  const [indexState, setIndexState] = useState<IndexState>('idle')
  const [buildProgress, setBuildProgress] = useState(0)

  const indexRef = useRef(getSearchIndex())
  const buildingRef = useRef(false)

  // When search opens, ensure the index exists
  useEffect(() => {
    if (!active) return
    if (indexRef.current) { setIndexState('ready'); return }
    if (buildingRef.current) return

    buildingRef.current = true
    setIndexState('building')
    setBuildProgress(0)

    const run = async () => {
      try {
        const serverEntries = await fetchServerSearchIndex()
        if (serverEntries) {
          indexRef.current = serverEntries
          setIndexState('ready')
          return
        }
        // Fallback: build locally if server endpoint fails
        const photoIndex = await getOrBuildPhotoIndex()
        const entries = await buildSearchIndex(photoIndex.titles, setBuildProgress)
        indexRef.current = entries
        setIndexState('ready')
      } catch {
        setIndexState('idle')
      } finally {
        buildingRef.current = false
      }
    }
    run()
  }, [active])

  // Debounced search against local index
  useEffect(() => {
    if (!query.trim() || !indexRef.current) {
      setResults([])
      return
    }
    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const titles = searchLocal(query, indexRef.current!)
        if (titles.length === 0) { setResults([]); return }
        const thumbs = await getThumbsCached(titles.slice(0, 48), 400)
        setResults(titles.filter((t) => thumbs[t]?.thumbUrl).map((t) => thumbs[t]))
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const clear = useCallback(() => {
    setQuery('')
    setResults([])
  }, [])

  const rebuildIndex = useCallback(() => {
    if (buildingRef.current) return
    clearSearchIndex()
    clearPhotoIndex()
    indexRef.current = null
    buildingRef.current = true
    setIndexState('building')
    setBuildProgress(0)
    setResults([])
    setQuery('')
    const run = async () => {
      try {
        const serverEntries = await fetchServerSearchIndex()
        if (serverEntries) {
          indexRef.current = serverEntries
          setIndexState('ready')
          return
        }
        // Fallback: build locally if server endpoint fails
        const photoIndex = await getOrBuildPhotoIndex()
        const entries = await buildSearchIndex(photoIndex.titles, setBuildProgress)
        indexRef.current = entries
        setIndexState('ready')
      } catch {
        setIndexState('idle')
      } finally {
        buildingRef.current = false
      }
    }
    run()
  }, [])

  return { query, setQuery, results, searching, indexState, buildProgress, clear, rebuildIndex }
}
