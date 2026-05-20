'use client'

import { useCallback, useState } from 'react'
import Link from 'next/link'
import { useFavorites } from '@/shared/hooks/useFavorites'
import type { FavoritePhoto } from '@/shared/lib/favorites'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import PhotoModal from '@/features/photo-viewer/components/PhotoModal'

export default function FavoritesScreen() {
  const { favorites } = useFavorites()
  const [modalPhoto, setModalPhoto] = useState<WikiPhoto | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openPhoto = useCallback((photo: FavoritePhoto, index: number) => {
    setCurrentIndex(index)
    // FavoritePhoto has all needed fields to show in modal directly (no API call)
    setModalPhoto({
      pageId: 0,
      title: photo.title,
      description: photo.description,
      date: photo.date,
      author: '',
      origin: '',
      persons: [],
      categories: [],
      imageUrl: photo.thumbUrl,
      thumbUrl: photo.thumbUrl,
      wikiUrl: photo.wikiUrl,
    })
    setModalOpen(true)
  }, [])

  const handleNext = useCallback(() => {
    if (favorites.length === 0) return
    const nextIndex = (currentIndex + 1) % favorites.length
    setCurrentIndex(nextIndex)
    const photo = favorites[nextIndex]
    setModalPhoto({
      pageId: 0,
      title: photo.title,
      description: photo.description,
      date: photo.date,
      author: '',
      origin: '',
      persons: [],
      categories: [],
      imageUrl: photo.thumbUrl,
      thumbUrl: photo.thumbUrl,
      wikiUrl: photo.wikiUrl,
    })
  }, [favorites, currentIndex])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setModalPhoto(null)
  }, [])

  return (
    <>
      <div className="min-h-screen bg-stone-950 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-800">
          <Link href="/" className="text-stone-400 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Inicio
          </Link>
          <div className="flex-1 text-center">
            <h1 className="font-playfair text-white text-lg font-bold">Mis Favoritas</h1>
          </div>
          <div className="w-16 text-right">
            <span className="text-stone-500 text-sm">{favorites.length}</span>
          </div>
        </header>

        <main className="flex-1 p-4">
          {favorites.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4">
              <p className="text-6xl">♡</p>
              <h2 className="font-playfair text-white text-2xl">Aún no tienes favoritas</h2>
              <p className="text-stone-400 text-sm max-w-xs">
                Abre cualquier foto y pulsa el corazón para guardarla aquí.
              </p>
              <Link
                href="/gallery"
                className="mt-4 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-black font-semibold rounded-xl transition-colors"
              >
                Explorar galería
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {favorites.map((photo, i) => (
                <button
                  key={photo.title}
                  onClick={() => openPhoto(photo, i)}
                  className="relative block w-full overflow-hidden rounded-lg bg-stone-800 aspect-[4/3] hover:opacity-90 active:scale-95 transition-all"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.thumbUrl}
                    alt={photo.description || photo.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute top-1.5 right-1.5 text-red-400 text-sm drop-shadow">♥</div>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>

      {modalOpen && modalPhoto && (
        <PhotoModal
          photo={modalPhoto}
          loading={false}
          onClose={handleClose}
          onNext={handleNext}
          nextLabel="→ Siguiente favorita"
        />
      )}
    </>
  )
}
