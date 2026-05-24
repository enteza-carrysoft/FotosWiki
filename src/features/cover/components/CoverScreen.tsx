'use client'

import { useCallback, useEffect, useState } from 'react'
import Image from 'next/image'
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
      <div className="relative min-h-[100dvh] flex flex-col overflow-hidden bg-[#130b04]">

        {/* Background photo — sepia tinted */}
        {coverPhoto?.thumbUrl && (
          <Image
            src={coverPhoto.thumbUrl}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            unoptimized
            style={{ opacity: 0.22, filter: 'sepia(80%) contrast(1.15) brightness(0.9)' }}
          />
        )}

        {/* Vignette + warm gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#130b04]/85 via-[#130b04]/30 to-[#130b04]/97 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#130b04_100%)] pointer-events-none" />

        {/* Favorites badge */}
        {favorites.length > 0 && (
          <Link
            href="/favorites"
            className="absolute right-4 z-20 flex items-center gap-1.5 px-3 h-9 bg-[#1e1008]/80 border border-[#c9a84c]/25 rounded-full text-sm text-[#c9a84c]/70 touch-manipulation"
            style={{ top: 'calc(env(safe-area-inset-top, 0px) + 16px)' }}
          >
            <span className="text-red-400/80">♥</span>
            {favorites.length}
          </Link>
        )}

        {/* Main */}
        <div className="relative z-10 flex-1 flex flex-col px-6 pt-10 pb-6 max-w-lg mx-auto w-full text-center">

          {/* ── HEADER ── */}
          <div className="mb-auto">

            {/* Institution badge */}
            <div className="flex justify-center mb-5">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full
                              bg-[#c9a84c]/12 border border-[#c9a84c]/30">
                <span className="w-1 h-1 rounded-full bg-[#c9a84c]/80 flex-shrink-0" />
                <p className="text-[#c9a84c]/90 text-[11px] tracking-[0.22em] uppercase font-semibold">
                  Ateneo de Mairena del Alcor
                </p>
                <span className="w-1 h-1 rounded-full bg-[#c9a84c]/80 flex-shrink-0" />
              </div>
            </div>

            {/* Main title */}
            <h1 className="font-playfair leading-none mb-2 select-none">
              <span className="block text-[#f0e8d5] font-bold"
                    style={{ fontSize: 'clamp(3.5rem, 15vw, 5rem)' }}>
                Mairena
              </span>
              <span className="block font-light italic text-[#c9a84c]"
                    style={{ fontSize: 'clamp(3rem, 13vw, 4.25rem)' }}>
                en Fotos
              </span>
            </h1>

            {/* Ornamental rule */}
            <div className="flex items-center gap-2 justify-center my-4">
              <div className="h-px w-8 bg-[#c9a84c]/30" />
              <span className="text-[#c9a84c]/45 text-[8px] tracking-widest">◆  ◆  ◆</span>
              <div className="h-px w-8 bg-[#c9a84c]/30" />
            </div>

            {/* Archive descriptor — straight from the boceto */}
            <p className="text-[#c9a84c]/50 text-[10px] tracking-[0.3em] uppercase mb-5">
              Archivo de fotos antiguas · anteriores a 1975
            </p>

            {/* MairenaWiki attribution badge */}
            <a
              href="https://www.mairenawiki.es"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full
                         bg-[#c9a84c]/10 active:bg-[#c9a84c]/20
                         border border-[#c9a84c]/30 active:border-[#c9a84c]/55
                         touch-manipulation transition-all"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#c9a84c]/70 flex-shrink-0" />
              <span className="text-[#c9a84c]/80 text-[11px] tracking-[0.25em] uppercase font-semibold">
                MairenaWiki
              </span>
              <span className="text-[#c9a84c]/35 text-[9px]">↗</span>
            </a>
          </div>

          {/* ── FOTO DEL DÍA ── */}
          <div className="flex-1 flex flex-col justify-center py-7">
            {photoOfDay ? (
              <button
                onClick={handleOpenPhotoOfDay}
                className="group flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl text-left touch-manipulation transition-all
                           bg-[#1e1008]/60 active:bg-[#2e1e10]/80
                           border border-[#c9a84c]/18 active:border-[#c9a84c]/35"
              >
                {/* Thumbnail with vintage frame */}
                <div className="relative flex-shrink-0">
                  <div className="w-[62px] h-[62px] rounded-lg overflow-hidden bg-[#2a1a0a]
                                  ring-1 ring-[#c9a84c]/20 shadow-lg shadow-black/60"
                       style={{ filter: 'sepia(25%) contrast(1.05)' }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoOfDay.thumbUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                  {/* corner accent */}
                  <span className="absolute -top-1 -left-1 text-[#c9a84c]/60 text-[8px] leading-none">▪</span>
                  <span className="absolute -bottom-1 -right-1 text-[#c9a84c]/60 text-[8px] leading-none">▪</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-[#c9a84c] text-[9px] font-bold uppercase tracking-[0.3em] mb-1 flex items-center gap-1.5">
                    <span className="opacity-70">☀</span> Foto del día
                  </p>
                  <p className="text-[#f0e8d5]/85 text-sm font-medium truncate leading-snug font-playfair">
                    {photoOfDay.description && photoOfDay.description !== photoOfDay.title
                      ? photoOfDay.description
                      : photoOfDay.title}
                  </p>
                  {photoOfDay.date && (
                    <p className="text-[#c9a84c]/45 text-[11px] mt-0.5 tracking-wide">{photoOfDay.date}</p>
                  )}
                </div>
                <span className="text-[#c9a84c]/35 group-active:text-[#c9a84c]/70 text-xl flex-shrink-0 transition-colors">›</span>
              </button>
            ) : (
              /* placeholder skeleton while loading */
              <div className="w-full h-[74px] rounded-xl bg-[#1e1008]/50 border border-[#c9a84c]/10 animate-pulse" />
            )}
          </div>

          {/* ── CTA BUTTONS ── */}
          <div>
            <div className="flex flex-col gap-3 w-full mb-7">
              {/* Primary */}
              <Link
                href="/gallery"
                className="w-full h-14 flex items-center justify-center
                           bg-[#c9a84c] active:bg-[#b89438]
                           text-[#130b04] font-bold rounded-xl
                           touch-manipulation text-[15px] tracking-wider uppercase
                           shadow-lg shadow-[#c9a84c]/15 transition-colors"
              >
                Explorar las fotos
              </Link>

              {/* Secondary */}
              <button
                onClick={handleRandomPhoto}
                disabled={modalLoading}
                className="w-full h-12 flex items-center justify-center gap-2
                           bg-transparent active:bg-[#c9a84c]/8 disabled:opacity-50
                           border border-[#c9a84c]/25 active:border-[#c9a84c]/50
                           text-[#c9a84c]/70 font-medium rounded-xl
                           touch-manipulation text-sm transition-colors"
              >
                {modalLoading ? 'Cargando…' : '🎲 Foto aleatoria'}
              </button>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-center gap-0">
              <div className="h-px flex-1 bg-[#c9a84c]/12" />
              {[
                { n: '+2.400', label: 'Personas' },
                { n: '+1.000', label: 'Vistas' },
                { n: '+730', label: 'Feria' },
              ].map(({ n, label }, i) => (
                <div key={label} className="flex items-center">
                  {i > 0 && <div className="w-px h-7 bg-[#c9a84c]/15 mx-4" />}
                  <div className="text-center">
                    <p className="text-[#c9a84c] font-bold text-[13px] font-playfair">{n}</p>
                    <p className="text-[#c9a84c]/35 text-[9px] uppercase tracking-widest">{label}</p>
                  </div>
                </div>
              ))}
              <div className="h-px flex-1 bg-[#c9a84c]/12" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pb-safe-bottom flex items-center justify-center gap-3 pb-5 flex-shrink-0">
          <Link
            href="/favorites"
            className="text-[#c9a84c]/35 active:text-red-400/80 text-xs touch-manipulation py-2 px-1 transition-colors"
          >
            ♡ Mis favoritas
          </Link>
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
