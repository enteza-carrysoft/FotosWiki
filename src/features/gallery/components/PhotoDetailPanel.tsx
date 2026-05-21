'use client'

import { useState } from 'react'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import { useFavorites } from '@/shared/hooks/useFavorites'
import PhotoLightbox from './PhotoLightbox'

interface Props {
  photo: WikiPhoto | null
  loading: boolean
  onClose: () => void
  onNext?: () => void
  onPrev?: () => void
  hasNext: boolean
  hasPrev: boolean
}

export default function PhotoDetailPanel({
  photo,
  loading,
  onClose,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
}: Props) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const { toggle, checkIsFavorite } = useFavorites()

  return (
    <>
      <aside className="hidden lg:flex flex-col w-[38%] border-l border-stone-800 bg-stone-950 overflow-hidden flex-shrink-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-stone-800 flex-shrink-0">
          <span className="text-stone-500 text-xs uppercase tracking-widest">Detalle</span>
          <div className="flex items-center gap-1">
            {photo && (
              <button
                onClick={() => toggle({ title: photo.title, thumbUrl: photo.thumbUrl, description: photo.description, date: photo.date, wikiUrl: photo.wikiUrl })}
                className="w-8 h-8 flex items-center justify-center text-lg transition-colors"
                aria-label={checkIsFavorite(photo.title) ? 'Quitar de favoritas' : 'Añadir a favoritas'}
              >
                <span className={checkIsFavorite(photo.title) ? 'text-red-400' : 'text-stone-500 hover:text-red-400'}>
                  {checkIsFavorite(photo.title) ? '♥' : '♡'}
                </span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-stone-500 hover:text-white transition-colors text-xl leading-none"
              aria-label="Cerrar panel"
            >
              ×
            </button>
          </div>
        </div>

        {/* Photo — fixed above scrollable area, outside overflow */}
        {photo && (
          <button
            className="relative w-full bg-stone-900 group focus:outline-none flex-shrink-0"
            onClick={() => setLightboxOpen(true)}
            aria-label="Ver foto a pantalla completa"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.thumbUrl}
              alt={photo.title}
              className="w-full object-contain max-h-72 group-hover:brightness-90 transition-[filter]"
            />
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="px-3 py-1.5 bg-black/70 text-white text-xs rounded-full">
                🔍 Pantalla completa
              </span>
            </div>
          </button>
        )}

        {/* Scrollable metadata */}
        <div className="flex-1 overflow-y-auto">
          {loading && !photo ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-7 h-7 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
            </div>
          ) : photo ? (
            <div className="p-4 space-y-4">
              {/* Title + date */}
              <div>
                <h2 className="font-playfair text-white text-xl font-bold leading-tight">
                  {photo.title}
                </h2>
                {photo.date && (
                  <p className="text-amber-400 text-sm mt-1 font-medium">{photo.date}</p>
                )}
              </div>

              {photo.description && photo.description !== photo.title && (
                <p className="text-stone-300 text-sm leading-relaxed">{photo.description}</p>
              )}

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
                  <ol className="space-y-1">
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
                className="inline-flex items-center gap-1 text-amber-400 text-sm hover:text-amber-300 transition-colors"
              >
                Ver en Mairenawiki ↗
              </a>
            </div>
          ) : null}
        </div>

        {/* Navigation */}
        <div className="flex border-t border-stone-800 flex-shrink-0">
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="flex-1 py-3 px-4 text-stone-400 hover:text-white hover:bg-stone-900 disabled:opacity-25 disabled:cursor-not-allowed text-sm transition-colors text-left"
          >
            ← Anterior
          </button>
          <div className="w-px bg-stone-800" />
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="flex-1 py-3 px-4 text-stone-400 hover:text-white hover:bg-stone-900 disabled:opacity-25 disabled:cursor-not-allowed text-sm transition-colors text-right"
          >
            Siguiente →
          </button>
        </div>
      </aside>

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
