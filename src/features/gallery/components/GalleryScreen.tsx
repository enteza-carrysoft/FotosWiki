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

  const [modalPhoto, setModalPhoto] = useState<WikiPhoto | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const currentIndexRef = useRef<number>(-1)

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore() },
      { rootMargin: '600px' }
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

  const skeletonCount = photos.length === 0 && loading ? 18 : 0

  return (
    <>
      <div className="min-h-screen bg-stone-950 flex flex-col">
        {/* Header — 52px min height for comfortable tap */}
        <header className="flex items-center px-3 h-13 border-b border-stone-800 flex-shrink-0" style={{ minHeight: '52px' }}>
          <Link
            href="/"
            className="h-11 flex items-center gap-1 px-2 text-stone-400 active:text-white touch-manipulation text-sm"
          >
            ← Inicio
          </Link>
          <h1 className="flex-1 text-center font-playfair text-white text-lg font-bold">
            Galería
          </h1>
          <Link
            href="/favorites"
            className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-red-400 touch-manipulation text-xl"
            aria-label="Mis favoritas"
          >
            ♡
          </Link>
        </header>

        <FilterBar activeCategory={activeCategory} onChange={setActiveCategory} />

        {/* Grid — 3 cols on mobile for more density, keeps images at useful size */}
        <main className="flex-1 p-2">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-1.5">
            {photos.map((photo, i) => (
              <PhotoCard key={photo.title} photo={photo} onClick={(p) => openPhoto(p, i)} />
            ))}
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <div key={`skel-${i}`} className="aspect-square rounded-lg bg-stone-800 animate-pulse" />
            ))}
          </div>

          <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-2">
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
              <p className="text-stone-600 text-xs">{photos.length} fotos</p>
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
          nextLabel="Siguiente foto"
        />
      )}
    </>
  )
}
