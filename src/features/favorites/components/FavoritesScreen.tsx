'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
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
  const [copied, setCopied] = useState(false)

  const toWikiPhoto = (photo: FavoritePhoto): WikiPhoto => ({
    pageId: 0,
    title: photo.title,
    description: photo.description,
    date: photo.date,
    author: '',
    origin: '',
    persons: [],
    observations: [],
    categories: [],
    imageUrl: photo.imageUrl || photo.thumbUrl,
    thumbUrl: photo.thumbUrl,
    wikiUrl: photo.wikiUrl,
  })

  const openPhoto = useCallback((photo: FavoritePhoto, index: number) => {
    setCurrentIndex(index)
    setModalPhoto(toWikiPhoto(photo))
    setModalOpen(true)
  }, [])

  const handleNext = useCallback(() => {
    if (favorites.length === 0) return
    const nextIndex = (currentIndex + 1) % favorites.length
    setCurrentIndex(nextIndex)
    setModalPhoto(toWikiPhoto(favorites[nextIndex]))
  }, [favorites, currentIndex])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setModalPhoto(null)
  }, [])

  const handleShareFavorites = useCallback(async () => {
    if (favorites.length === 0) return
    const titlesParam = favorites.map((f) => f.title).join('|')
    const shareUrl = `${window.location.origin}/seleccion?f=${encodeURIComponent(titlesParam)}`
    const shareText = `${favorites.length} foto${favorites.length !== 1 ? 's' : ''} del archivo histórico de Mairena del Alcor`
    if (navigator.share) {
      await navigator.share({ title: 'Mis fotos — MairenaFotos', text: shareText, url: shareUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(shareUrl).catch(() => {})
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }
  }, [favorites])

  return (
    <>
      <div className="min-h-screen bg-stone-950 flex flex-col">
        <header className="flex items-center gap-3 px-4 py-3 border-b border-stone-800">
          <Link href="/" className="text-stone-400 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0">
            ← Inicio
          </Link>
          <div className="flex-1 text-center">
            <h1 className="font-playfair text-white text-lg font-bold">Mis Favoritas</h1>
          </div>
          <div className="w-16 flex items-center justify-end gap-2">
            <span className="text-stone-500 text-sm">{favorites.length}</span>
            {favorites.length > 0 && (
              <button
                onClick={handleShareFavorites}
                className="w-8 h-8 flex items-center justify-center rounded-full
                           text-amber-400/70 hover:text-amber-400 active:bg-stone-800
                           touch-manipulation transition-colors text-base"
                aria-label="Compartir selección"
                title={copied ? '¡Enlace copiado!' : 'Compartir favoritas'}
              >
                {copied ? '✓' : '↗'}
              </button>
            )}
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
                  <Image
                    src={photo.thumbUrl}
                    alt={photo.description || photo.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover"
                    loading="lazy"
                    unoptimized
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
