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
    getOrBuildPhotoIndex().catch(() => {})
  }, [])

  const loadDayPhoto = async () => {
    try {
      const photo = await getPhotoOfDay()
      setPhotoOfDay(photo)
      setCoverPhoto(photo)
    } catch {
      // silent fail
    }
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
    } catch {
      // keep current
    } finally {
      setModalLoading(false)
    }
  }, [])

  const handleOpenPhotoOfDay = useCallback(async () => {
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
      <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-stone-950">
        {/* Cover background */}
        {coverPhoto?.thumbUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPhoto.thumbUrl}
            alt="Mairena del Alcor"
            className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-black/85 pointer-events-none" />

        {/* Favorites badge (top right) */}
        {favorites.length > 0 && (
          <Link
            href="/favorites"
            className="absolute top-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 bg-black/40 hover:bg-black/60 border border-white/20 rounded-full text-sm text-white/70 hover:text-red-400 transition-all"
          >
            <span className="text-red-400">♥</span>
            {favorites.length}
          </Link>
        )}

        {/* Main content */}
        <div className="relative z-10 text-center px-6 max-w-2xl mx-auto flex flex-col items-center">
          <p className="text-amber-400 text-xs tracking-[0.35em] uppercase mb-6 font-medium">
            Mairena del Alcor · Sevilla
          </p>

          <h1 className="text-white font-playfair text-5xl md:text-7xl font-bold leading-[1.1] mb-5">
            Archivo<br />
            <span className="text-amber-400">Fotográfico</span>
          </h1>

          <p className="text-stone-300 text-base md:text-xl mb-10 font-light max-w-md">
            Más de un siglo de historia de Mairena del Alcor en imágenes
          </p>

          {/* Foto del Día highlight */}
          {photoOfDay && (
            <button
              onClick={handleOpenPhotoOfDay}
              className="mb-8 flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/15 rounded-2xl transition-all text-left max-w-sm w-full"
            >
              <div className="flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-stone-700">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoOfDay.thumbUrl} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="min-w-0">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-wider mb-0.5">☀ Foto del día</p>
                <p className="text-white text-sm font-medium truncate">
                  {photoOfDay.description || photoOfDay.title}
                </p>
                {photoOfDay.date && (
                  <p className="text-stone-400 text-xs">{photoOfDay.date}</p>
                )}
              </div>
            </button>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
            <button
              onClick={handleRandomPhoto}
              disabled={modalLoading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-60 text-black font-bold rounded-2xl transition-all text-base shadow-lg shadow-amber-900/40"
            >
              <span className="text-xl">🎲</span>
              {modalLoading ? 'Cargando…' : 'Foto aleatoria'}
            </button>
            <Link
              href="/gallery"
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 border border-white/30 hover:border-white/60 text-white font-semibold rounded-2xl transition-all text-base hover:bg-white/5"
            >
              Explorar galería
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-10 flex gap-6 text-center">
            {[
              { n: '+2.400', label: 'Personas' },
              { n: '+1.000', label: 'Vistas' },
              { n: '+730', label: 'Feria' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p className="text-amber-400 font-bold text-lg">{n}</p>
                <p className="text-stone-500 text-xs uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-4">
          <Link href="/favorites" className="text-stone-500 hover:text-red-400 text-xs transition-colors">
            ♡ Mis favoritas
          </Link>
          <span className="text-stone-700">·</span>
          <p className="text-stone-600 text-xs">
            Impulsado por{' '}
            <a
              href="https://www.mairenawiki.es"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stone-500 hover:text-amber-400 transition-colors"
            >
              Mairena Wiki
            </a>
          </p>
        </div>
      </div>

      {modalOpen && (
        <PhotoModal
          photo={modalPhoto}
          loading={modalLoading}
          onClose={handleClose}
          onNext={handleNextRandom}
        />
      )}
    </>
  )
}
