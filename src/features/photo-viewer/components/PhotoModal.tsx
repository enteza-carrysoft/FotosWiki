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
  nextLabel = '→ Siguiente foto aleatoria',
}: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const touchStartX = useRef<number>(0)
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
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    const delta = touchStartX.current - e.changedTouches[0].clientX
    if (Math.abs(delta) > 60) onNext()
  }

  const handleShare = async () => {
    if (!photo) return
    if (navigator.share) {
      await navigator.share({
        title: photo.description || photo.title,
        text: `${photo.description} — ${photo.date}`,
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

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/80 flex-shrink-0">
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-2xl leading-none transition-colors w-8"
          aria-label="Cerrar"
        >
          ×
        </button>
        <div className="flex gap-2 items-center">
          <button
            onClick={handleFavorite}
            disabled={!photo}
            className={`text-xl transition-all px-2 py-1 rounded-full ${
              isFav
                ? 'text-red-400 scale-110'
                : 'text-white/50 hover:text-red-400'
            }`}
            aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
          >
            {isFav ? '♥' : '♡'}
          </button>
          <button
            onClick={handleShare}
            className="text-white/70 hover:text-amber-400 transition-colors text-sm px-3 py-1 border border-white/20 rounded-full"
          >
            Compartir
          </button>
          <a
            href={photo?.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/70 hover:text-amber-400 transition-colors text-sm px-3 py-1 border border-white/20 rounded-full"
          >
            Wiki ↗
          </a>
        </div>
      </div>

      {/* Image area */}
      <div className="relative flex-1 flex items-center justify-center overflow-hidden">
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
            className={`max-h-full max-w-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setImgLoaded(true)}
          />
        )}
      </div>

      {/* Bottom metadata */}
      <div className="flex-shrink-0 bg-gradient-to-t from-black to-black/80 px-5 pt-4 pb-safe-bottom pb-6">
        {photo && (
          <>
            <h2 className="text-white font-playfair text-xl font-semibold leading-tight mb-1">
              {photo.description || photo.title}
            </h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-stone-400 text-sm mb-4">
              {photo.date && <span>{photo.date}</span>}
              {photo.author && photo.author !== 'Sin firmar' && (
                <span>{photo.author}</span>
              )}
              {photo.origin && <span className="italic">{photo.origin}</span>}
            </div>
          </>
        )}
        <div className="flex gap-3">
          <button
            onClick={onNext}
            disabled={loading}
            className="flex-1 py-3 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-semibold rounded-xl transition-colors text-sm"
          >
            {loading ? 'Cargando…' : nextLabel}
          </button>
        </div>
        <p className="text-center text-stone-600 text-xs mt-2">Desliza para ver la siguiente</p>
      </div>
    </div>
  )
}
