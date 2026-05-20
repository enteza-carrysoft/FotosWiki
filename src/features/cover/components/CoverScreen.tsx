'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { getPhotoData } from '@/shared/lib/mediawiki-api'
import { getOrBuildPhotoIndex, getRandomPhotoTitle } from '@/shared/lib/photo-cache'
import { getPhotoOfDay } from '@/shared/lib/photo-of-day'
import { useFavorites } from '@/shared/hooks/useFavorites'
import type { WikiPhoto } from '@/shared/types/wiki.types'
import PhotoModal from '@/features/photo-viewer/components/PhotoModal'

export default function CoverScreen() {
  const [coverPhoto, setCoverPhoto] = useState<WikiPhoto | null>(null)
  const [photoOfDay, setPhotoOfDay] = useState<WikiPhoto | null>(null)
  const [modalPhoto, setModalPhoto] = useState<WikiPhoto | null>(null)
  const [modalLoading, setModalLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const { favorites } = useFavorites()

  useEffect(() => {
    loadDayPhoto()
    getOrBuildPhotoIndex().catch(() => { })
  }, [])

  const loadDayPhoto = async () => {
    try {
      const photo = await getPhotoOfDay()
      setPhotoOfDay(photo)
      setCoverPhoto(photo)
    } catch { /* silent */ }
  }

  const handleRandomPhoto = useCallback(async () => {
    setModalLoading(true)
    setModalOpen(true)
    try {
      const title = await getRandomPhotoTitle()
      const photo = await getPhotoData(title)
      setModalPhoto(photo)
    } catch {
      setModalOpen(false)
    } finally {
      setModalLoading(false)
    }
  }, [])

  const handleNextRandom = useCallback(async () => {
    setModalLoading(true)
    try {
      const title = await getRandomPhotoTitle()
      const photo = await getPhotoData(title)
      setModalPhoto(photo)
    } catch { /* keep current */ }
    finally { setModalLoading(false) }
  }, [])

  const handleOpenPhotoOfDay = useCallback(() => {
    if (!photoOfDay) return
    setModalPhoto(photoOfDay)
    setModalOpen(true)
  }, [photoOfDay])

  const handleClose = useCallback(() => {
    setModalOpen(false)
    setModalPhoto(null)
  }, [])

  return (
    <>
      <div className="relative min-h-[100dvh] flex flex-col overflow-hidden bg-stone-950">

        {/* Background */}
        {coverPhoto?.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto.thumbUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/90 pointer-events-none" />

        {/* Top-right: favorites badge */}
        {favorites.length > 0 && (
          <Link
            href="/favorites"
            className="absolute right-4 z-20 flex items-center gap-1.5 px-3 h-9 bg-black/50 border border-white/20 rounded-full text-sm text-white/70 touch-manipulation active:text-red-400"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <span className="text-red-400">♥</span>
            {favorites.length}
          </Link>
        )}

        {/* Main — spread content top to bottom using justify-between */}
        <div className="relative z-10 flex-1 flex flex-col px-5 pt-12 pb-6 max-w-lg mx-auto w-full text-center">

          {/* Top: branding */}
          <div>
            <p className="text-amber-400 text-[10px] tracking-[0.4em] uppercase mb-3 font-semibold">
              Mairena del Alcor · Sevilla
            </p>

            <h1 className="text-white font-playfair text-5xl sm:text-6xl font-bold leading-[1.05] mb-3">
              Mairena<br />
              <span className="text-amber-400">en Fotos</span>
            </h1>

            <p className="text-stone-300 text-sm sm:text-base font-light leading-relaxed max-w-xs mx-auto">
              Más de un siglo de historia de Mairena del Alcor en imágenes
            </p>
          </div>

          {/* Middle: Foto del Día — grows to fill space */}
          <div className="flex-1 flex flex-col justify-center py-6">
            {photoOfDay && (
              <button
                onClick={handleOpenPhotoOfDay}
                className="flex items-center gap-3 w-full px-4 py-3.5 bg-white/8 active:bg-white/15 border border-white/15 rounded-2xl text-left touch-manipulation transition-colors"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden bg-stone-700 ring-1 ring-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photoOfDay.thumbUrl} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-amber-400 text-[10px] font-bold uppercase tracking-widest mb-0.5">
                    ☀ Foto del día
                  </p>
                  <p className="text-white text-sm font-medium truncate leading-snug">
                    {photoOfDay.description && photoOfDay.description !== photoOfDay.title
                      ? photoOfDay.description
                      : photoOfDay.title}
                  </p>
                  {photoOfDay.date && (
                    <p className="text-stone-400 text-xs mt-0.5">{photoOfDay.date}</p>
                  )}
                </div>
                <span className="text-stone-500 text-lg flex-shrink-0">›</span>
              </button>
            )}
          </div>

          {/* Bottom: action buttons + stats */}
          <div>
            <div className="flex flex-col gap-3 w-full mb-8">
              <button
                onClick={handleRandomPhoto}
                disabled={modalLoading}
                className="w-full h-14 flex items-center justify-center gap-2 bg-amber-500 active:bg-amber-600 disabled:opacity-60 text-black font-bold rounded-2xl touch-manipulation text-base shadow-lg shadow-amber-900/30 transition-colors"
              >
                <span className="text-xl">🎲</span>
                {modalLoading ? 'Cargando…' : 'Foto aleatoria'}
              </button>
              <Link
                href="/gallery"
                className="w-full h-14 flex items-center justify-center border border-white/25 active:border-white/50 active:bg-white/5 text-white font-semibold rounded-2xl touch-manipulation text-base transition-colors"
              >
                Explorar galería
              </Link>
            </div>

            <div className="flex gap-8 justify-center text-center">
              {[
                { n: '+2.400', label: 'Personas' },
                { n: '+1.000', label: 'Vistas' },
                { n: '+730', label: 'Feria' },
              ].map(({ n, label }) => (
                <div key={label}>
                  <p className="text-amber-400 font-bold text-base">{n}</p>
                  <p className="text-stone-500 text-[10px] uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-safe-bottom flex items-center justify-center gap-3 pb-5 flex-shrink-0">
          <Link
            href="/favorites"
            className="text-stone-500 active:text-red-400 text-xs touch-manipulation py-2 px-1"
          >
            ♡ Mis favoritas
          </Link>
          <span className="text-stone-700 text-xs">·</span>
          <a
            href="https://www.mairenawiki.es"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stone-600 active:text-amber-400 text-xs touch-manipulation py-2 px-1"
          >
            Mairena Wiki
          </a>
        </div>
      </div>

      {modalOpen && (
        <PhotoModal
          photo={modalPhoto}
          loading={modalLoading}
          onClose={handleClose}
          onNext={handleNextRandom}
          nextLabel="Siguiente aleatoria"
        />
      )}
    </>
  )
}
