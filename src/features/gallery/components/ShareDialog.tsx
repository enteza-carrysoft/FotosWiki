'use client'

import { useRef, useState } from 'react'

interface Props {
  count: number
  onCancel: () => void
  onConfirm: (title: string) => void
}

export default function ShareDialog({ count, onCancel, onConfirm }: Props) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleConfirm = () => {
    onConfirm(title.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative w-full sm:max-w-md bg-stone-900 border border-stone-700 rounded-t-2xl sm:rounded-2xl p-6 flex flex-col gap-5"
           style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>

        <div className="text-center">
          <p className="text-amber-400/70 text-[10px] uppercase tracking-[0.25em] mb-1">
            Compartir selección
          </p>
          <h2 className="font-playfair text-white text-xl font-bold">
            {count} foto{count !== 1 ? 's' : ''} seleccionada{count !== 1 ? 's' : ''}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-stone-400 text-xs font-medium tracking-wide uppercase">
            Título del álbum (opcional)
          </label>
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleConfirm()}
            placeholder="Ej: Corpus 1978, Feria de Mayo…"
            maxLength={80}
            className="w-full bg-stone-800 border border-stone-600 rounded-xl px-4 py-3
                       text-white placeholder-stone-500 text-sm
                       focus:outline-none focus:border-amber-500 transition-colors"
            autoFocus
          />
          {title && (
            <p className="text-stone-600 text-xs text-right">{title.length}/80</p>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-12 flex items-center justify-center rounded-xl
                       border border-stone-600 text-stone-300 text-sm font-medium
                       active:bg-stone-800 touch-manipulation transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 h-12 flex items-center justify-center rounded-xl
                       bg-amber-500 text-black text-sm font-bold
                       active:bg-amber-400 touch-manipulation transition-colors"
          >
            Compartir ↗
          </button>
        </div>
      </div>
    </div>
  )
}
