'use client'

import { useCallback, useEffect, useState } from 'react'
import type { WikiComment } from '@/shared/types/wiki-comment.types'

export function usePhotoComments(photoTitle: string | undefined) {
  const [comments, setComments] = useState<WikiComment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    if (!photoTitle) return
    setLoading(true)
    setError(false)
    try {
      const res = await fetch(
        `/api/photo-comments/${encodeURIComponent(photoTitle)}`,
        { cache: 'no-store' }
      )
      if (!res.ok) throw new Error('http')
      const data = (await res.json()) as { comments: WikiComment[] }
      setComments(data.comments ?? [])
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [photoTitle])

  useEffect(() => {
    void load()
  }, [load])

  const addOptimistic = useCallback((c: WikiComment) => {
    setComments((prev) => [...prev, c])
  }, [])

  return { comments, loading, error, reload: load, addOptimistic }
}
