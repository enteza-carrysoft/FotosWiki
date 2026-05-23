'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useInfinitePhotos } from '../hooks/useInfinitePhotos'
import { usePhotoSearch } from '../hooks/usePhotoSearch'
import { usePhotoDetail } from '../hooks/usePhotoDetail'
import type { PhotoThumb } from '@/shared/types/wiki.types'
import { preloadImage } from '@/shared/lib/thumb-cache'
import FilterBar from './FilterBar'
import PhotoCard from './PhotoCard'
import PhotoDetailPanel from './PhotoDetailPanel'
import PhotoDetailSheet from './PhotoDetailSheet'
import ShareModeBar from './ShareModeBar'
import ShareDialog from './ShareDialog'

export default function GalleryScreen() {
  const [activeCategory, setActiveCategory] = useState('Fotos')
  const { photos, loading, hasMore, loadMore } = useInfinitePhotos(activeCategory)

  const [searchOpen, setSearchOpen] = useState(false)
  const { query, setQuery, results, searching, indexState, buildProgress, clear, rebuildIndex } =
    usePhotoSearch(searchOpen)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const { photo: detailPhoto, loading: detailLoading, error: detailError, open: openDetail, retry: retryDetail, close: closeDetail } =
    usePhotoDetail()
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  // Share mode state
  const [isShareMode, setIsShareMode] = useState(false)
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set())
  const [showShareDialog, setShowShareDialog] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  const sentinelRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (searchOpen) return
    const el = sentinelRef.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore && !loading) loadMore() },
      { rootMargin: '600px' }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [hasMore, loading, loadMore, searchOpen])

  const openSearch = () => {
    setSearchOpen(true)
    setTimeout(() => searchInputRef.current?.focus(), 50)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    clear()
  }

  const activePhotos = searchOpen ? results : photos
  const panelOpen = selectedIndex >= 0

  const handleNext = useCallback(() => {
    const nextIndex = selectedIndex + 1
    if (nextIndex >= activePhotos.length) {
      if (!searchOpen && hasMore) loadMore()
      return
    }
    setSelectedIndex(nextIndex)
    openDetail(activePhotos[nextIndex])
  }, [selectedIndex, activePhotos, hasMore, loadMore, searchOpen, openDetail])

  const handlePrev = useCallback(() => {
    const prevIndex = selectedIndex - 1
    if (prevIndex < 0) return
    setSelectedIndex(prevIndex)
    openDetail(activePhotos[prevIndex])
  }, [selectedIndex, activePhotos, openDetail])

  const handleClose = useCallback(() => {
    setSelectedIndex(-1)
    closeDetail()
  }, [closeDetail])

  const enterShareMode = useCallback(() => {
    setIsShareMode(true)
    setSelectedTitles(new Set())
    setSelectedIndex(-1)
    closeDetail()
  }, [closeDetail])

  const exitShareMode = useCallback(() => {
    if (selectedTitles.size > 0 && !confirm(`¿Salir y perder las ${selectedTitles.size} foto${selectedTitles.size !== 1 ? 's' : ''} seleccionadas?`)) return
    setIsShareMode(false)
    setSelectedTitles(new Set())
  }, [selectedTitles.size])

  const toggleShareTitle = useCallback((title: string) => {
    setSelectedTitles((prev) => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title)
      else if (next.size < 50) next.add(title)
      return next
    })
  }, [])

  const openPhoto = useCallback((photo: PhotoThumb, index: number) => {
    if (isShareMode) {
      toggleShareTitle(photo.title)
      return
    }
    setSelectedIndex(index)
    openDetail(photo)
  }, [isShareMode, toggleShareTitle, openDetail])

  // Preload neighboring thumbnails when selection changes
  useEffect(() => {
    if (selectedIndex < 0) return
    preloadImage(activePhotos[selectedIndex + 1]?.thumbUrl)
    preloadImage(activePhotos[selectedIndex - 1]?.thumbUrl)
  }, [selectedIndex, activePhotos])

  const handleShareConfirm = useCallback(async (albumTitle: string) => {
    setShowShareDialog(false)
    const titlesParam = encodeURIComponent(Array.from(selectedTitles).join('|'))
    const titleParam = albumTitle ? `&title=${encodeURIComponent(albumTitle)}` : ''
    const shareUrl = `${window.location.origin}/seleccion?f=${titlesParam}${titleParam}`
    const shareCount = selectedTitles.size
    const text = albumTitle
      ? `📷 ${albumTitle}\n\n${shareCount} foto${shareCount !== 1 ? 's' : ''} del archivo histórico de Mairena del Alcor`
      : `📷 ${shareCount} foto${shareCount !== 1 ? 's' : ''} del archivo histórico de Mairena del Alcor`
    if (navigator.share) {
      await navigator.share({ title: albumTitle || 'MairenaFotos', text, url: shareUrl }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(shareUrl).catch(() => {})
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    }
    setIsShareMode(false)
    setSelectedTitles(new Set())
  }, [selectedTitles])

  const skeletonCount = photos.length === 0 && loading && !searchOpen ? 18 : 0

  const gridCols = panelOpen
    ? 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'

  return (
    <div className="bg-stone-950 flex flex-col lg:h-screen">
      {/* Header */}
      <header className="flex items-center px-3 border-b border-stone-800 flex-shrink-0" style={{ minHeight: '52px' }}>
        {searchOpen ? (
          <>
            <button
              onClick={closeSearch}
              className="h-11 flex items-center justify-center px-2 text-stone-400 active:text-white touch-manipulation text-sm flex-shrink-0"
            >
              {isShareMode ? '← Selección' : '←'}
            </button>
            <input
              ref={searchInputRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'Buscar… Usa “comillas” para frase exacta'}
              className="flex-1 bg-transparent text-white placeholder-stone-500 text-sm outline-none py-2 px-1"
            />
            {query && (
              <button
                onClick={clear}
                className="h-11 w-11 flex items-center justify-center text-stone-500 active:text-white touch-manipulation text-lg flex-shrink-0"
              >
                ×
              </button>
            )}
            {indexState === 'ready' && !query && (
              <button
                onClick={rebuildIndex}
                title="Actualizar índice de búsqueda"
                className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-amber-400 touch-manipulation text-xl flex-shrink-0"
              >
                ↺
              </button>
            )}
          </>
        ) : isShareMode ? (
          <>
            <button
              onClick={exitShareMode}
              className="h-11 flex items-center justify-center px-2 text-stone-400 active:text-white touch-manipulation text-sm flex-shrink-0"
            >
              ← Cancelar
            </button>
            <p className="flex-1 text-center text-white text-sm font-medium">
              {selectedTitles.size === 0
                ? 'Selecciona fotos'
                : `${selectedTitles.size}/50 seleccionadas`}
            </p>
            <div className="flex items-center">
              {shareCopied && (
                <span className="text-amber-400 text-xs mr-1">¡Copiado!</span>
              )}
              <button
                onClick={openSearch}
                className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-white touch-manipulation text-xl"
                aria-label="Buscar"
              >
                🔍
              </button>
            </div>
          </>
        ) : (
          <>
            <Link
              href="/"
              className="h-11 flex items-center gap-1 px-2 text-stone-400 active:text-white touch-manipulation text-sm"
            >
              ← Inicio
            </Link>
            <h1 className="flex-1 text-center font-playfair text-white text-lg font-bold">
              Galería
            </h1>
            <button
              onClick={openSearch}
              className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-white touch-manipulation text-xl"
              aria-label="Buscar"
            >
              🔍
            </button>
            <button
              onClick={enterShareMode}
              className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-amber-400 touch-manipulation text-base"
              aria-label="Compartir selección de fotos"
              title="Compartir fotos"
            >
              ↗
            </button>
            <Link
              href="/favorites"
              className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-red-400 touch-manipulation text-xl"
              aria-label="Mis favoritas"
            >
              ♡
            </Link>
          </>
        )}
      </header>

      {!searchOpen && (
        <FilterBar activeCategory={activeCategory} onChange={setActiveCategory} />
      )}

      {/* Content row: grid + desktop panel */}
      <div className="flex flex-1 lg:overflow-hidden min-h-0">
        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto">
          {/* Index building progress */}
          {searchOpen && indexState === 'building' && (
            <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
              <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-4" />
              <p className="text-white text-sm font-medium mb-1">Preparando búsqueda…</p>
              <p className="text-stone-500 text-xs mb-4">
                Indexando el archivo fotográfico ({buildProgress}%)
              </p>
              <div className="w-48 h-1 bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full transition-all duration-300"
                  style={{ width: `${buildProgress}%` }}
                />
              </div>
            </div>
          )}

          <main className={`p-2 ${panelOpen ? 'pb-[32vh] lg:pb-4' : ''} ${isShareMode ? 'pb-24' : ''}`}>
            {indexState !== 'building' && (
              <div className={`grid gap-1.5 transition-all duration-300 ${gridCols}`}>
                {activePhotos.map((photo, i) => (
                  <PhotoCard
                    key={photo.title}
                    photo={photo}
                    onClick={(p) => openPhoto(p, i)}
                    selected={!isShareMode && i === selectedIndex}
                    shareMode={isShareMode}
                    shareSelected={selectedTitles.has(photo.title)}
                  />
                ))}
                {Array.from({ length: skeletonCount }).map((_, i) => (
                  <div key={`skel-${i}`} className="aspect-square rounded-lg bg-stone-800 animate-pulse" />
                ))}
              </div>
            )}

            {/* Search states */}
            {searchOpen && indexState === 'ready' && searching && (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              </div>
            )}
            {searchOpen && indexState === 'ready' && !searching && query.trim() && results.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center px-8">
                <p className="text-stone-400 text-base mb-1">Sin resultados para «{query}»</p>
                <p className="text-stone-600 text-sm">Prueba con otro nombre, año o lugar</p>
              </div>
            )}
            {searchOpen && indexState === 'ready' && !query.trim() && (
              <div className="flex flex-col items-center py-16 text-center px-8 gap-3">
                <p className="text-stone-500 text-sm">Escribe para buscar en el archivo</p>
                <div className="text-stone-600 text-xs space-y-1.5">
                  <p><span className="text-stone-500 font-mono">antonio mellado</span> — ambas palabras presentes</p>
                  <p><span className="text-stone-500 font-mono">"antonio mellado"</span> — frase exacta</p>
                  <p><span className="text-stone-500 font-mono">"plaza mayor" 1960</span> — frase + palabra</p>
                </div>
              </div>
            )}

            {searchOpen && results.length > 0 && (
              <p className="text-center text-stone-600 text-xs py-4">
                {results.length} resultado{results.length !== 1 ? 's' : ''}
              </p>
            )}

            {/* Infinite scroll sentinel */}
            {!searchOpen && (
              <div ref={sentinelRef} className="h-16 flex items-center justify-center mt-2">
                {loading && photos.length > 0 && (
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-amber-500 animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                )}
                {!hasMore && photos.length > 0 && (
                  <p className="text-stone-600 text-xs">{photos.length} fotos</p>
                )}
              </div>
            )}
          </main>
        </div>

        {/* Desktop detail panel — only renders when a photo is selected */}
        {panelOpen && (
          <PhotoDetailPanel
            photo={detailPhoto}
            loading={detailLoading}
            error={detailError}
            onRetry={retryDetail}
            onClose={handleClose}
            onNext={handleNext}
            onPrev={handlePrev}
            hasNext={selectedIndex < activePhotos.length - 1}
            hasPrev={selectedIndex > 0}
          />
        )}
      </div>

      {/* Mobile bottom sheet — hidden in share mode */}
      {panelOpen && !isShareMode && (
        <PhotoDetailSheet
          photo={detailPhoto}
          loading={detailLoading}
          error={detailError}
          onRetry={retryDetail}
          onClose={handleClose}
          onNext={handleNext}
          onPrev={handlePrev}
          hasNext={selectedIndex < activePhotos.length - 1}
          hasPrev={selectedIndex > 0}
        />
      )}

      {/* Share mode bar */}
      {isShareMode && (
        <ShareModeBar
          count={selectedTitles.size}
          onCancel={exitShareMode}
          onShare={() => setShowShareDialog(true)}
        />
      )}

      {/* Share dialog */}
      {showShareDialog && (
        <ShareDialog
          count={selectedTitles.size}
          onCancel={() => setShowShareDialog(false)}
          onConfirm={handleShareConfirm}
        />
      )}
    </div>
  )
}
