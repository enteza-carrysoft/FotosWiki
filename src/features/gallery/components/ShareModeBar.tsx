'use client'

interface Props {
  count: number
  onCancel: () => void
  onShare: () => void
}

const MAX = 50

export default function ShareModeBar({ count, onCancel, onShare }: Props) {
  return (
    <div
      className="fixed bottom-0 inset-x-0 z-40 bg-stone-900 border-t border-stone-700
                 flex items-center gap-3 px-4 py-3 safe-bottom"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
    >
      <button
        onClick={onCancel}
        className="h-10 px-4 flex items-center justify-center rounded-xl
                   border border-stone-600 text-stone-300 text-sm font-medium
                   active:bg-stone-800 touch-manipulation transition-colors"
      >
        Cancelar
      </button>

      <div className="flex-1 text-center">
        {count === 0 ? (
          <span className="text-stone-500 text-sm">Toca fotos para seleccionar</span>
        ) : (
          <span className="text-white text-sm font-medium">
            {count}
            <span className="text-stone-500">/{MAX} foto{count !== 1 ? 's' : ''}</span>
          </span>
        )}
      </div>

      <button
        onClick={onShare}
        disabled={count === 0}
        className="h-10 px-4 flex items-center justify-center rounded-xl
                   bg-amber-500 text-black text-sm font-bold
                   disabled:opacity-30 disabled:cursor-not-allowed
                   active:bg-amber-400 touch-manipulation transition-colors"
      >
        Compartir ↗
      </button>
    </div>
  )
}
