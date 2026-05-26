'use client'

import Link from 'next/link'
import type { RefObject } from 'react'

interface Props {
  searchOpen: boolean
  isShareMode: boolean
  query: string
  indexState: 'idle' | 'building' | 'ready'
  selectedCount: number
  shareCopied: boolean
  searchInputRef: RefObject<HTMLInputElement | null>
  onCloseSearch: () => void
  onQueryChange: (value: string) => void
  onClear: () => void
  onRebuildIndex: () => void
  onEnterShareMode: () => void
  onExitShareMode: () => void
  onOpenSearch: () => void
}

export default function GalleryHeader({
  searchOpen,
  isShareMode,
  query,
  indexState,
  selectedCount,
  shareCopied,
  searchInputRef,
  onCloseSearch,
  onQueryChange,
  onClear,
  onRebuildIndex,
  onEnterShareMode,
  onExitShareMode,
  onOpenSearch,
}: Props) {
  if (searchOpen) {
    return (
      <header className="flex items-center px-3 border-b border-stone-800 flex-shrink-0" style={{ minHeight: '52px' }}>
        <button
          onClick={onCloseSearch}
          className="h-11 flex items-center justify-center px-2 text-stone-400 active:text-white touch-manipulation text-sm flex-shrink-0"
        >
          {isShareMode ? '← Seleccion' : '←'}
        </button>
        <input
          ref={searchInputRef}
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={'Buscar... Usa "comillas" para frase exacta'}
          className="flex-1 bg-transparent text-white placeholder-stone-500 text-sm outline-none py-2 px-1"
        />
        {query && (
          <button
            onClick={onClear}
            className="h-11 w-11 flex items-center justify-center text-stone-500 active:text-white touch-manipulation text-lg flex-shrink-0"
          >
            ×
          </button>
        )}
        {indexState === 'ready' && !query && (
          <button
            onClick={onRebuildIndex}
            title="Actualizar indice de busqueda"
            className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-amber-400 touch-manipulation text-xl flex-shrink-0"
          >
            ↺
          </button>
        )}
        {!isShareMode && (
          <button
            onClick={onEnterShareMode}
            className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-amber-400 touch-manipulation text-lg flex-shrink-0"
            aria-label="Seleccionar fotos para compartir"
            title="Seleccionar fotos"
          >
            📤
          </button>
        )}
      </header>
    )
  }

  if (isShareMode) {
    return (
      <header className="flex items-center px-3 border-b border-stone-800 flex-shrink-0" style={{ minHeight: '52px' }}>
        <button
          onClick={onExitShareMode}
          className="h-11 flex items-center justify-center px-2 text-stone-400 active:text-white touch-manipulation text-sm flex-shrink-0"
        >
          ← Cancelar
        </button>
        <p className="flex-1 text-center text-white text-sm font-medium">
          {selectedCount === 0 ? 'Selecciona fotos' : `${selectedCount}/50 seleccionadas`}
        </p>
        <div className="flex items-center">
          {shareCopied && <span className="text-amber-400 text-xs mr-1">Copiado</span>}
          <button
            onClick={onOpenSearch}
            className="h-11 w-11 flex items-center justify-center text-stone-400 active:text-white touch-manipulation text-xl"
            aria-label="Buscar"
          >
            🔍
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="flex items-center px-3 border-b border-stone-800 flex-shrink-0" style={{ minHeight: '52px' }}>
      <Link
        href="/"
        className="h-11 flex items-center gap-1 px-2 text-stone-400 active:text-white touch-manipulation text-sm"
      >
        ← Inicio
      </Link>
      <h1 className="flex-1 text-center font-playfair text-white text-lg font-bold">Galeria</h1>
      <div className="hidden lg:flex items-center gap-1">
        <button
          onClick={onOpenSearch}
          className="h-11 flex flex-col items-center justify-center px-3 gap-0.5 text-stone-400 hover:text-white touch-manipulation"
          aria-label="Buscar"
        >
          <span className="text-xl leading-none">🔍</span>
          <span className="text-xs font-medium tracking-wide">Buscar fotos</span>
        </button>
        <button
          onClick={onEnterShareMode}
          className="h-11 flex flex-col items-center justify-center px-3 gap-0.5 text-stone-400 hover:text-amber-400 touch-manipulation"
          aria-label="Compartir seleccion de fotos"
        >
          <span className="text-xl leading-none">📤</span>
          <span className="text-xs font-medium tracking-wide">Seleccionar</span>
        </button>
        <Link
          href="/favorites"
          className="h-11 flex flex-col items-center justify-center px-3 gap-0.5 text-stone-400 hover:text-red-400 touch-manipulation"
          aria-label="Mis favoritas"
        >
          <span className="text-xl leading-none">♡</span>
          <span className="text-xs font-medium tracking-wide">Mis favoritas</span>
        </Link>
      </div>
    </header>
  )
}
