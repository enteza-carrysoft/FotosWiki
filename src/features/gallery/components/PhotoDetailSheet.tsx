'use client'

import { useEffect, useRef, useState } from 'react'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import { useFavorites } from '@/shared/hooks/useFavorites'
import PhotoLightbox from './PhotoLightbox'

async function sharePhoto(photo: WikiPhoto) {
  if (typeof navigator === 'undefined') return
  const appUrl = `${window.location.origin}/foto/${encodeURIComponent(photo.title)}`
  const payload = {
    title: photo.description || photo.title,
    text: photo.description ? `${photo.description}${photo.date ? ` — ${photo.date}` : ''}` : photo.title,
    url: appUrl,
  }
  if (typeof navigator.share === 'function') {
    try { await navigator.share(payload) } catch { /* user cancelled */ }
    return
  }
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(photo.wikiUrl) } catch { /* ignore */ }
  }
}

type SheetSnap = 'mini' | 'full'

interface Props {
  photo: WikiPhoto | null
  loading: boolean
  error?: boolean
  onRetry?: () => void
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
  hasNext: boolean
  hasPrev: boolean
}

export default function PhotoDetailSheet({
  photo,
  loading,
  error,
  onRetry,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: Props) {
  const [snap, setSnap] = useState<SheetSnap>('mini')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const { toggle, checkIsFavorite } = useFavorites()
  const touchStartY = useRef(0)
  const touchLastY = useRef(0)
  const isDragging = useRef(false)

  useEffect(() => {
    setSnap('mini')
  }, [photo?.title])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY
    touchLastY.current = e.touches[0].clientY
    isDragging.current = true
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchLastY.current = e.touches[0].clientY
  }

  const handleTouchEnd = () => {
    if (!isDragging.current) return
    isDragging.current = false
    const delta = touchLastY.current - touchStartY.current

    if (delta < -60) {
      setSnap('full')
    } else if (delta > 60) {
      if (snap === 'full') setSnap('mini')
      else onClose()
    }
  }

  const isFull = snap === 'full'
  const heightClass = isFull ? 'h-[82vh]' : 'h-[46vh]'

  return (
    <>
      {isFull && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setSnap('mini')}
        />
      )}

      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-stone-900 rounded-t-2xl border-t border-stone-700 shadow-2xl flex flex-col transition-[height] duration-300 ease-out ${heightClass}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div
          className="flex justify-center pt-3 pb-2 flex-shrink-0 cursor-pointer select-none"
          onClick={() => setSnap(isFull ? 'mini' : 'full')}
        >
          <div className="w-10 h-1 bg-stone-600 rounded-full" />
        </div>

        {loading && !photo ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
          </div>
        ) : error && !photo ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-stone-400 text-sm">No se pudo cargar la foto</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-4 py-2 bg-stone-800 active:bg-stone-700 text-stone-200 text-sm rounded-lg touch-manipulation"
              >
                Reintentar
              </button>
            )}
          </div>
        ) : photo ? (
          <>
            {/* Photo — full width, tappable to open lightbox */}
            <button
              onClick={() => setLightboxOpen(true)}
              className="w-full flex-shrink-0 overflow-hidden bg-stone-950 relative"
              style={{ height: '52%' }}
              aria-label="Ver a pantalla completa"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.title}
                className="w-full h-full object-contain"
              />
              {/* Tap-to-zoom hint */}
              <span className="absolute bottom-2 right-2 bg-black/50 text-white text-[10px] px-1.5 py-0.5 rounded-full pointer-events-none">
                ⤢ pantalla completa
              </span>
            </button>

            {/* Scrollable info area */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              <div className="px-4 py-2">
                {/* Title + actions */}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-playfair text-white font-bold text-base leading-tight">
                      {photo.title}
                    </h2>
                    {photo.date && (
                      <p className="text-amber-400 text-xs mt-0.5 font-medium">{photo.date}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => sharePhoto(photo)}
                      className="w-9 h-9 flex items-center justify-center text-stone-400 active:text-white text-base touch-manipulation"
                      aria-label="Compartir"
                    >
                      ↗
                    </button>
                    <button
                      onClick={() => toggle({ title: photo.title, thumbUrl: photo.thumbUrl, imageUrl: photo.imageUrl, description: photo.description, date: photo.date, wikiUrl: photo.wikiUrl })}
                      className="w-9 h-9 flex items-center justify-center text-xl touch-manipulation"
                      aria-label={checkIsFavorite(photo.title) ? 'Quitar de favoritas' : 'Añadir a favoritas'}
                    >
                      <span className={checkIsFavorite(photo.title) ? 'text-red-400' : 'text-stone-500'}>
                        {checkIsFavorite(photo.title) ? '♥' : '♡'}
                      </span>
                    </button>
                    <button
                      onClick={onClose}
                      className="w-9 h-9 flex items-center justify-center text-stone-400 active:text-white text-xl leading-none touch-manipulation"
                      aria-label="Cerrar"
                    >
                      ×
                    </button>
                  </div>
                </div>

                {/* Extended details — always scrollable if expanded */}
                {photo.description && photo.description !== photo.title && (
                  <p className="text-stone-300 text-sm leading-relaxed mt-2">{photo.description}</p>
                )}

                {isFull && (
                  <div className="mt-3 space-y-4">
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
                            <span
                              key={c}
                              className="px-2 py-0.5 bg-stone-800 text-stone-400 text-xs rounded-full"
                            >
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
                            <li key={i} className="text-stone-300 text-sm leading-relaxed">
                              {obs}
                            </li>
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

                    <div className="h-4" />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* Navigation */}
        <div className="flex border-t border-stone-800 flex-shrink-0">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex-1 py-3 text-stone-400 active:text-white disabled:opacity-25 text-sm text-left px-4 touch-manipulation"
          >
            ← Anterior
          </button>
          <div className="w-px bg-stone-800" />
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex-1 py-3 text-stone-400 active:text-white disabled:opacity-25 text-sm text-right px-4 touch-manipulation"
          >
            Siguiente →
          </button>
        </div>
      </div>

      {lightboxOpen && photo && (
        <PhotoLightbox
          src={photo.imageUrl || photo.thumbUrl}
          alt={photo.title}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </>
  )
}
