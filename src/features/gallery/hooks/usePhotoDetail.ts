'use client'

import { useState, useCallback } from 'react'
import { getPhotoData } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb, WikiPhoto } from '@/shared/types/wiki.types'

export function usePhotoDetail() {
  const [photo, setPhoto] = useState<WikiPhoto | null>(null)
  const [loading, setLoading] = useState(false)

  const open = useCallback(async (thumb: PhotoThumb) => {
    setLoading(true)
    setPhoto(null)
    try {
      const data = await getPhotoData(thumb.title)
      setPhoto(data)
    } catch {
      // stay closed on error
    } finally {
      setLoading(false)
    }
  }, [])

  const close = useCallback(() => {
    setPhoto(null)
    setLoading(false)
  }, [])

  return { photo, loading, open, close }
}
