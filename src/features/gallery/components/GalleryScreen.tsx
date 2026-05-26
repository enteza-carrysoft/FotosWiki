'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
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
import GalleryHeader from './GalleryHeader'
import GalleryBottomNav from './GalleryBottomNav'
import GallerySearchStatus from './GallerySearchStatus'

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

  const showBottomNav = !searchOpen && !isShareMode && !panelOpen

  const mainPb = panelOpen
    ? 'pb-[32vh] lg:pb-4'
    : isShareMode
      ? 'pb-24'
      : showBottomNav
        ? 'pb-24 lg:pb-0'
        : ''

  const gridCols = panelOpen
    ? 'grid-cols-3 sm:grid-cols-3 lg:grid-cols-4'
    : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6'

  const showGrid = !searchOpen || indexState === 'ready'

  return (
    <div className="bg-stone-950 flex flex-col lg:h-screen">
      <GalleryHeader
        searchOpen={searchOpen}
        isShareMode={isShareMode}
        query={query}
        indexState={indexState}
        selectedCount={selectedTitles.size}
        shareCopied={shareCopied}
        searchInputRef={searchInputRef}
        onCloseSearch={closeSearch}
        onQueryChange={setQuery}
        onClear={clear}
        onRebuildIndex={rebuildIndex}
        onEnterShareMode={enterShareMode}
        onExitShareMode={exitShareMode}
        onOpenSearch={openSearch}
      />

      {!searchOpen && (
        <FilterBar activeCategory={activeCategory} onChange={setActiveCategory} />
      )}

      {/* Content row: grid + desktop panel */}
      <div className="flex flex-1 lg:overflow-hidden min-h-0">
        {/* Scrollable grid area */}
        <div className="flex-1 overflow-y-auto">
          <GallerySearchStatus
            searchOpen={searchOpen}
            indexState={indexState}
            buildProgress={buildProgress}
            searching={searching}
            query={query}
            resultsCount={results.length}
            onRebuildIndex={rebuildIndex}
          />

          <main className={`p-2 ${mainPb}`}>
            {showGrid && (
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

      {/* Bottom navigation bar — mobile only, fixed */}
      {showBottomNav && <GalleryBottomNav onOpenSearch={openSearch} onEnterShareMode={enterShareMode} />}
    </div>
  )
}
