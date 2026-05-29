'use client'

import { useEffect, useRef, useState } from 'react'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import { useFavorites } from '@/shared/hooks/useFavorites'
import PhotoComments from '@/features/comments/components/PhotoComments'

interface Props {
  photo: WikiPhoto | null
  loading: boolean
  onClose: () => void
  onNext: () => void
  onPrev?: () => void
  nextLabel?: string
}

export default function PhotoModal({
  photo,
  loading,
  onClose,
  onNext,
  onPrev,
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
  }, [photo, checkIsFavorite])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') onNext()
      if (e.key === 'ArrowLeft') onPrev?.()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose, onNext, onPrev])

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
    if (dy >= 40) return
    if (dx > 60) onNext()
    else if (dx < -60 && onPrev) onPrev()
  }

  const handleShare = async () => {
    if (!photo) return
    const appUrl = `${window.location.origin}/foto/${encodeURIComponent(photo.title)}`
    if (navigator.share) {
      await navigator.share({
        title: photo.description || photo.title,
        text: photo.description ? `${photo.description} — ${photo.date}` : photo.title,
        url: appUrl,
      }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(appUrl).catch(() => {})
    }
  }

  const handleFavorite = () => {
    if (!photo) return
    const added = toggle({
      title: photo.title,
      thumbUrl: photo.thumbUrl,
      imageUrl: photo.imageUrl,
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
      {/* Top bar — floating */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 pt-safe-top py-2 bg-gradient-to-b from-black/70 to-transparent pointer-events-none">
        <button
          onClick={onClose}
          className="pointer-events-auto w-10 h-10 flex items-center justify-center text-white/80 hover:text-white text-2xl rounded-full bg-black/40 active:bg-black/60 touch-manipulation"
          aria-label="Cerrar"
        >
          ×
        </button>
        <button
          onClick={handleFavorite}
          disabled={!photo}
          className={`pointer-events-auto w-10 h-10 flex items-center justify-center text-xl rounded-full bg-black/40 active:bg-black/60 touch-manipulation transition-all ${
            isFav ? 'text-red-400' : 'text-white/70'
          }`}
          aria-label={isFav ? 'Quitar de favoritos' : 'Guardar en favoritos'}
        >
          {isFav ? '♥' : '♡'}
        </button>
      </div>

      {/* Photo — full width, never scrolls away */}
      <div className="flex-shrink-0 bg-black relative">
        {(loading || !imgLoaded) && (
          <div className="absolute inset-0 min-h-[40vw] flex items-center justify-center">
            <div className="w-10 h-10 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        )}
        {(photo?.imageUrl || photo?.thumbUrl) && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo.imageUrl || photo.thumbUrl}
            alt={photo.description || photo.title}
            className={`w-full h-auto block transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{ maxHeight: '70vh', objectFit: 'contain' }}
            onLoad={() => setImgLoaded(true)}
          />
        )}
      </div>

      {/* Scrollable metadata */}
      <div className="flex-1 overflow-y-auto overscroll-contain bg-stone-900 min-h-0">
        {photo ? (
          <div className="px-4 py-3 space-y-4">

            {/* Title + date */}
            <div>
              {photo.description && photo.description !== photo.title && (
                <h2 className="font-playfair text-white font-bold text-lg leading-snug mb-1">
                  {photo.description}
                </h2>
              )}
              {!photo.description && (
                <h2 className="font-playfair text-white font-bold text-lg leading-snug mb-1">
                  {photo.title}
                </h2>
              )}
              {photo.date && (
                <p className="text-amber-400 text-sm font-medium">{photo.date}</p>
              )}
            </div>

            {photo.author && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-1">
                  Fotógrafo / Autor
                </span>
                <p className="text-stone-200 text-sm">{photo.author}</p>
              </div>
            )}

            {photo.origin && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-1">
                  Origen / Colección
                </span>
                <p className="text-stone-200 text-sm">{photo.origin}</p>
              </div>
            )}

            {photo.persons.length > 0 && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-2">
                  Personajes identificados
                </span>
                <ol className="space-y-1.5">
                  {photo.persons.map((person, i) => (
                    <li key={i} className="flex items-start gap-2 text-stone-200 text-sm">
                      <span className="text-amber-500 font-mono text-xs mt-0.5 flex-shrink-0 w-5 text-right">
                        {i + 1}.
                      </span>
                      <span>{person}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {photo.categories.length > 0 && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-2">
                  Categorías
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {photo.categories.map((c) => (
                    <span key={c} className="px-2 py-0.5 bg-stone-800 text-stone-400 text-xs rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {photo.observations.length > 0 && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-2">
                  Observaciones
                </span>
                <ul className="space-y-1.5">
                  {photo.observations.map((obs, i) => (
                    <li key={i} className="text-stone-300 text-sm leading-relaxed">{obs}</li>
                  ))}
                </ul>
              </div>
            )}

            <a
              href={photo.wikiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-amber-400 text-sm"
            >
              Ver en Mairenawiki ↗
            </a>

            <PhotoComments photoTitle={photo.title} />

            <div className="h-2" />
          </div>
        ) : !loading && (
          <div className="flex items-center justify-center h-full">
            <p className="text-stone-500 text-sm">Sin datos disponibles</p>
          </div>
        )}
      </div>

      {/* Fixed action row */}
      <div className="flex-shrink-0 bg-stone-900 border-t border-stone-800 px-4 py-3 safe-bottom flex gap-2 items-center">
        <button
          onClick={onNext}
          disabled={loading}
          className="flex-1 h-12 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-50 text-black font-bold rounded-2xl touch-manipulation text-sm transition-colors"
        >
          {loading ? 'Cargando…' : nextLabel}
        </button>
        <button
          onClick={handleShare}
          className="h-12 w-12 flex items-center justify-center border border-white/15 rounded-2xl text-white/70 hover:text-white active:bg-white/10 touch-manipulation transition-colors text-lg"
          aria-label="Compartir"
        >
          ↗
        </button>
        <a
          href={photo?.wikiUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="h-12 w-12 flex items-center justify-center border border-white/15 rounded-2xl text-white/70 hover:text-white active:bg-white/10 touch-manipulation transition-colors text-xs font-medium"
          aria-label="Ver en Wiki"
        >
          Wiki
        </a>
      </div>
    </div>
  )
}
