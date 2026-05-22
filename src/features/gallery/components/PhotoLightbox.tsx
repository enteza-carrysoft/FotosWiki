'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface Props {
  src: string
  alt: string
  onClose: () => void
}

export default function PhotoLightbox({ src, alt, onClose }: Props) {
  const [zoomed, setZoomed] = useState(false)
  const [scale, setScale] = useState(2.5)
  const outerRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef({ active: false, startDist: 0, startScale: 2.5, wasPinching: false })
  const lastTapRef = useRef(0)

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Non-passive touchmove to block browser native pinch-zoom during gesture
  useEffect(() => {
    const el = outerRef.current
    if (!el) return
    const handler = (e: TouchEvent) => {
      if (e.touches.length >= 2) e.preventDefault()
    }
    el.addEventListener('touchmove', handler, { passive: false })
    return () => el.removeEventListener('touchmove', handler)
  }, [])

  const getTouchDist = (t1: { clientX: number; clientY: number }, t2: { clientX: number; clientY: number }) =>
    Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      pinchRef.current = {
        active: true,
        startDist: getTouchDist(e.touches[0], e.touches[1]),
        startScale: scale,
        wasPinching: false,
      }
    }
  }, [scale])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2 || !pinchRef.current.active) return
    const d = getTouchDist(e.touches[0], e.touches[1])
    const newScale = Math.max(1, Math.min(6, pinchRef.current.startScale * (d / pinchRef.current.startDist)))
    setScale(newScale)
    if (newScale > 1.3) setZoomed(true)
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (e.touches.length < 2 && pinchRef.current.active) {
      pinchRef.current.active = false
      pinchRef.current.wasPinching = true
      // suppress the click that fires after pinch ends
      setTimeout(() => { pinchRef.current.wasPinching = false }, 150)
      if (scale < 1.3) {
        setZoomed(false)
        setScale(2.5)
      }
    }
  }, [scale])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!zoomed) return
    e.preventDefault()
    setScale((s) => Math.max(1.5, Math.min(6, s - e.deltaY * 0.005)))
  }, [zoomed])

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (pinchRef.current.wasPinching) return

    // Double-tap detection
    const now = Date.now()
    const isDoubleTap = now - lastTapRef.current < 300
    lastTapRef.current = isDoubleTap ? 0 : now

    if (!zoomed) {
      setZoomed(true)
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const ratioX = (e.clientX - rect.left) / rect.width
      const ratioY = (e.clientY - rect.top) / rect.height
      setTimeout(() => {
        const c = scrollRef.current
        if (!c) return
        c.scrollLeft = ratioX * c.scrollWidth - c.clientWidth / 2
        c.scrollTop = ratioY * c.scrollHeight - c.clientHeight / 2
      }, 30)
    } else {
      setZoomed(false)
      setScale(2.5)
    }
  }, [zoomed])

  return (
    <div
      ref={outerRef}
      className="fixed inset-0 z-[100] bg-black flex flex-col select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <span className="text-white/40 text-xs">
          {zoomed
            ? 'Desliza para moverte · Pellizca para zoom · Toca para ajustar'
            : 'Toca para ampliar · Pellizca para zoom'}
        </span>
        <button
          onClick={onClose}
          className="pointer-events-auto w-11 h-11 flex items-center justify-center text-white text-2xl leading-none bg-black/50 rounded-full hover:bg-black/70 active:bg-black/80 touch-manipulation"
          aria-label="Cerrar visor"
        >
          ×
        </button>
      </div>

      {/* Fit view */}
      {!zoomed && (
        <div
          className="flex-1 flex items-center justify-center overflow-hidden"
          style={{ cursor: 'zoom-in' }}
          onClick={handleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-black/60 rounded-full text-white/60 text-xs pointer-events-none">
            🔍 Toca para zoom
          </div>
        </div>
      )}

      {/* Zoomed + pannable view */}
      {zoomed && (
        <div
          ref={scrollRef}
          className="flex-1 overflow-auto"
          style={{ cursor: 'zoom-out' }}
          onWheel={handleWheel}
          onClick={handleClick}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="block h-auto"
            style={{ width: `${scale * 100}vw`, maxWidth: 'none' }}
            draggable={false}
          />
        </div>
      )}
    </div>
  )
}
