'use client'

import { useEffect, useRef, useState } from 'react'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import { useFavorites } from '@/shared/hooks/useFavorites'

interface Props {
  photo: WikiPhoto | null
  loading: boolean
  onClose: () => void
  onNext: () => void
  nextLabel?: string
}

export default function PhotoModal({
  photo,
  loading,
  onClose,
  onNext,
  nextLabel = 'Siguiente aleatoria',
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const touchStartX = useRef<number>(0)
  const touchStartY = useRef<number>(0)
  const { toggle, checkIsFavorite } = useFavorites()
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    setImgLoaded(false)
    if (photo) setIsFav(checkIsFavorite(photo.title))
  }, [photo?.title, checkIsFavorite])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNext])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    // Only swipe horizontal if not scrolling vertically
    if (Math.abs(dx) > 60 && dy < 40) onNext()
  }

  const handleShare = async () => {
    if (!photo) return
    if (navigator.share) {
      await navigator.share({
        title: photo.description || photo.title,
        text: photo.description ? `${photo.description} — ${photo.date}` : photo.title,
        url: photo.wikiUrl,
      }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(photo.wikiUrl).catch(() => {})
    }
  }

  const handleFavorite = () => {
    if (!photo) return
    const added = toggle({
      title: photo.title,
      thumbUrl: photo.thumbUrl,
      description: photo.description,
      date: photo.date,
      wikiUrl: photo.wikiUrl,
    })
    setIsFav(added)
  }

  const hasMetadata = photo && (photo.description || photo.date || photo.origin || photo.persons.length > 0)

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar — minimal, just close + fav */}
      <div className="flex items-center justify-between px-3 pt-safe-top py-2 bg-gradient-to-b from-black/70 to-transparent absolute top-0 left-0 right-0 z-10 flex-shrink-0">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white text-2xl rounded-full bg-black/40 active:bg-black/60 touch-manipulation"
          aria-label="Cerrar"
        >
          ×
        </button>
        <button
          onClick={handleFavorite}
          disabled={!photo}
          className={`w-10 h-10 flex items-center justify-center text-xl rounded-full bg-black/40 active:bg-black/60 touch-manipulation transition-all ${
            isFav ? 'text-red-400' : 'text-white/70'
          }`}
          aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      {/* Image — full bleed, takes all available space */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden bg-black">
        {(loading || !imgLoaded) && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}
        {photo?.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.thumbUrl}
            alt={photo.description || photo.title}
            className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
      </div>

      {/* Bottom panel */}
      <div className="flex-shrink-0 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pt-5 pb-4 safe-bottom">

        {/* Metadata */}
        {hasMetadata && (
          <div className="mb-3">
            {photo.description && photo.description !== photo.title && (
              <h2 className="text-white font-playfair text-lg font-semibold leading-snug mb-1 line-clamp-2">
                {photo.description}
              </h2>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-stone-400 text-xs">
              {photo.date && <span>{photo.date}</span>}
              {photo.author && photo.author !== 'Sin firmar' && <span>{photo.author}</span>}
              {photo.origin && <span className="italic truncate max-w-[200px]">{photo.origin}</span>}
            </div>
            {photo.persons.length > 0 && (
              <p className="text-stone-500 text-xs mt-1 line-clamp-2">{photo.persons.join(', ')}</p>
            )}
          </div>
        )}

        {/* Action row */}
        <div className="flex gap-2 items-center">
          <button
            onClick={onNext}
            disabled={loading}
            className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-2xl touch-manipulation text-sm transition-colors"
          >
            {loading ? 'Cargando…' : nextLabel}
          </button>
          <button
            onClick={handleShare}
            className="h-12 w-12 flex items-center justify-center border border-white/25 rounded-2xl text-white/70 hover:text-white active:bg-white/10 touch-manipulation transition-colors text-lg"
            aria-label="Compartir"
          >
            ↗
          </button>
          <a
            href={photo?.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="h-12 w-12 flex items-center justify-center border border-white/25 rounded-2xl text-white/70 hover:text-white active:bg-white/10 touch-manipulation transition-colors text-xs font-medium"
            aria-label="Ver en Wiki"
          >
            Wiki
          </a>
        </div>
      </div>
    </div>
  )
}
