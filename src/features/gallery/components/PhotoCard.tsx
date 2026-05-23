'use client'

import { useState } from 'react'
import type { PhotoThumb } from '@/shared/types/wiki.types'

interface Props {
  photo: PhotoThumb
  onClick: (photo: PhotoThumb) => void
  selected?: boolean
  shareMode?: boolean
  shareSelected?: boolean
}

export default function PhotoCard({ photo, onClick, selected, shareMode, shareSelected }: Props) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)

  return (
    <button
      onClick={() => onClick(photo)}
      className={`group relative block w-full overflow-hidden rounded-lg bg-stone-800 aspect-[4/3] active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-amber-400 ${
        !imgLoaded && !imgError ? 'animate-pulse' : ''
      } ${selected ? 'ring-2 ring-amber-400 brightness-75' : ''} ${shareSelected ? 'ring-2 ring-amber-400' : ''}`}
      aria-label={shareMode ? `${shareSelected ? 'Quitar' : 'Añadir'} ${photo.title}` : `Ver foto ${photo.title}`}
      aria-pressed={shareMode ? shareSelected : selected}
    >
      {!imgError ? (
        // <img> nativo en vez de next/image:
        // - mairenawiki.es está detrás de Cloudflare que bloquea IPs de Vercel,
        //   por lo que next/image requería 'unoptimized' (sin beneficio real).
        // - <img> nativo tiene menos overhead de DOM/JS en tablets lentas.
        // - El browser decide concurrencia, lazy-load nativo y decoding async.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo.thumbUrl}
          alt={photo.title}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-stone-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent pt-6 pb-1.5 px-1.5 pointer-events-none">
        <span className="block text-white text-[10px] leading-tight font-medium line-clamp-2 text-left drop-shadow">
          {photo.title}
        </span>
      </div>

      {/* Share mode selection overlay */}
      {shareMode && (
        <>
          {shareSelected && (
            <div className="absolute inset-0 bg-amber-400/10 pointer-events-none" />
          )}
          <div className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all pointer-events-none ${
            shareSelected
              ? 'bg-amber-400 border-amber-400 text-black'
              : 'bg-black/40 border-white/60'
          }`}>
            {shareSelected && (
              <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </div>
        </>
      )}
    </button>
  )
}
