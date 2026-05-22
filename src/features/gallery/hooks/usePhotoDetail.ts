'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { getPhotoData } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb, WikiPhoto } from '@/shared/types/wiki.types'

export function usePhotoDetail() {
  const [photo, setPhoto] = useState<WikiPhoto | null>(null)
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const open = useCallback(async (thumb: PhotoThumb) => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLoading(true)
    setPhoto(null)
    try {
      const data = await getPhotoData(thumb.title, controller.signal)
      if (!controller.signal.aborted) setPhoto(data)
    } catch {
      // aborted or network error — stay in current state
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  const close = useCallback(() => {
    abortRef.current?.abort()
    setPhoto(null)
    setLoading(false)
  }, [])

  useEffect(() => () => abortRef.current?.abort(), [])

  return { photo, loading, open, close }
}
