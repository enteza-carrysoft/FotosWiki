'use client'

import Link from 'next/link'

interface Props {
  onOpenSearch: () => void
  onEnterShareMode: () => void
}

export default function GalleryBottomNav({ onOpenSearch, onEnterShareMode }: Props) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 lg:hidden z-40 border-t border-stone-800 bg-stone-950/95 backdrop-blur-sm"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        <button
          onClick={onOpenSearch}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-stone-300 active:text-amber-400 touch-manipulation"
        >
          <span className="text-2xl leading-none">🔍</span>
          <span className="text-xs font-medium tracking-wide">Buscar fotos</span>
        </button>
        <div className="w-px bg-stone-800 my-2" />
        <button
          onClick={onEnterShareMode}
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-stone-300 active:text-amber-400 touch-manipulation"
        >
          <span className="text-2xl leading-none">📤</span>
          <span className="text-xs font-medium tracking-wide">Seleccionar</span>
        </button>
        <div className="w-px bg-stone-800 my-2" />
        <Link
          href="/favorites"
          className="flex-1 flex flex-col items-center justify-center py-3 gap-1 text-stone-300 active:text-red-400 touch-manipulation"
        >
          <span className="text-2xl leading-none">♡</span>
          <span className="text-xs font-medium tracking-wide">Mis favoritas</span>
        </Link>
      </div>
    </nav>
  )
}
