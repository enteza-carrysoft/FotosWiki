'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useInfinitePhotos } from '../hooks/useInfinitePhotos'
import { getPhotoData } from '@/shared/lib/mediawiki-api'
import type { PhotoThumb, WikiPhoto } from '@/shared/types/wiki.types'
import FilterBar from './FilterBar'
import PhotoCard from './PhotoCard'
import PhotoModal from '@/features/photo-viewer/components/PhotoModal'

export default function GalleryScreen() {
  const [activeCategory, setActiveCategory] = useState('Fotos')
  const { photos, loading, hasMore, loadMore } = useInfinitePhotos(activeCategory)

  // Modal state
  const [modalPhoto, setModalPhoto] = useState<WikiPhoto | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const currentIndexRef = useRef<number>(-1)

  // Infinite scroll sentinel
  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) loadMore()
      },
      { rootMargin: '400px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore])

  const openPhoto = useCallback(async (photo: PhotoThumb, index: number) => {
    currentIndexRef.current = index
    setModalLoading(true)
    setModalOpen(true)
    setModalPhoto(null)
    try {
      const full = await getPhotoData(photo.title)
      setModalPhoto(full)
    } catch {
      setModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }, [])

  const handleNext = useCallback(async () => {
    const nextIndex = currentIndexRef.current + 1
    if (nextIndex >= photos.length) {
      // Load more and try again after
      if (hasMore) loadMore()
      return
    }
    currentIndexRef.current = nextIndex
    setModalLoading(true)
    setModalPhoto(null)
    try {
      const full = await getPhotoData(photos[nextIndex].title)
      setModalPhoto(full)
    } catch {
      // stay on current
    } finally {
      setModalLoading(false)
    }
  }, [photos, hasMore, loadMore])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setModalPhoto(null)
  }, [])

  const handleCategoryChange = useCallback((cat: string) => {
    setActiveCategory(cat)
  }, [])

  // Skeleton cards while loading initial batch
  const skeletonCount = photos.length === 0 && loading ? 24 : 0

  return (
    <>
      <div className="min-h-screen bg-stone-950 flex flex-col">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-800">
          <Link
            href="/"
            className="text-stone-400 hover:text-white transition-colors text-sm flex items-center gap-1"
          >
            ← Inicio
          </Link>
          <div className="flex-1 text-center">
            <h1 className="font-playfair text-white text-lg font-bold">Galería</h1>
          </div>
          <Link
            href="/favorites"
            className="text-stone-400 hover:text-red-400 transition-colors text-xl w-8 text-right"
            aria-label="Mis favoritas"
          >
            ♡
          </Link>
        </header>

        {/* Sticky filter bar */}
        <FilterBar activeCategory={activeCategory} onChange={handleCategoryChange} />

        {/* Photo grid */}
        <main className="flex-1 p-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {photos.map((photo, i) => (
              <PhotoCard key={photo.title} photo={photo} onClick={(p) => openPhoto(p, i)} />
            ))}

            {/* Skeleton placeholders on initial load */}
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div
                key={`skel-${i}`}
                className="aspect-[4/3] rounded-lg bg-stone-800 animate-pulse"
              />
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center mt-4">
            {loading && photos.length > 0 && (
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            )}
            {!hasMore && photos.length > 0 && (
              <p className="text-stone-600 text-sm">
                {photos.length} fotos cargadas
              </p>
            )}
          </div>
        </main>
      </div>

      {modalOpen && (
        <PhotoModal
          photo={modalPhoto}
          loading={modalLoading}
          onClose={handleClose}
          onNext={handleNext}
          nextLabel="→ Siguiente foto"
        />
      )}
    </>
  )
}
