'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getPhotoData } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb, WikiPhoto } from '@/shared/types/wiki.types'

export function usePhotoDetail() {
  const [photo, setPhoto] = useState<WikiPhoto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const pendingThumb = useRef<PhotoThumb | null>(null)

  const fetchPhoto = useCallback(async (thumb: PhotoThumb, controller: AbortController) => {
    try {
      const data = await getPhotoData(thumb.title, controller.signal)
      if (!controller.signal.aborted) {
        setPhoto(data)
        setError(false)
      }
    } catch {
      if (controller.signal.aborted) return
      // Auto-retry once after a short pause (covers transient network errors)
      try {
        await new Promise((r) => setTimeout(r, 900))
        if (controller.signal.aborted) return
        const data = await getPhotoData(thumb.title, controller.signal)
        if (!controller.signal.aborted) {
          setPhoto(data)
          setError(false)
        }
      } catch {
        if (!controller.signal.aborted) setError(true)
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const open = useCallback(async (thumb: PhotoThumb) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    pendingThumb.current = thumb

    setLoading(true)
    setPhoto(null)
    setError(false)

    await fetchPhoto(thumb, controller)
  }, [fetchPhoto])

  const retry = useCallback(() => {
    if (!pendingThumb.current) return
    const thumb = pendingThumb.current
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setPhoto(null)
    setError(false)

    fetchPhoto(thumb, controller)
  }, [fetchPhoto])

  const close = useCallback(() => {
    abortRef.current?.abort()
    pendingThumb.current = null
    setPhoto(null)
    setLoading(false)
    setError(false)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { photo, loading, error, open, retry, close }
}
