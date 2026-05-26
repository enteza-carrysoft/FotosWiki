'use client'

interface Props {
  searchOpen: boolean
  indexState: 'idle' | 'building' | 'ready'
  buildProgress: number
  searching: boolean
  query: string
  resultsCount: number
  onRebuildIndex: () => void
}

export default function GallerySearchStatus({
  searchOpen,
  indexState,
  buildProgress,
  searching,
  query,
  resultsCount,
  onRebuildIndex,
}: Props) {
  if (!searchOpen) return null

  if (indexState === 'building') {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-8 text-center">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin mb-4" />
        <p className="text-white text-sm font-medium mb-1">Preparando busqueda...</p>
        <p className="text-stone-500 text-xs mb-4">Indexando el archivo fotografico ({buildProgress}%)</p>
        <div className="w-48 h-1 bg-stone-800 rounded-full overflow-hidden">
          <div className="h-full bg-amber-500 rounded-full transition-all duration-300" style={{ width: `${buildProgress}%` }} />
        </div>
      </div>
    )
  }

  if (indexState === 'idle') {
    return (
      <div className="flex flex-col items-center py-16 text-center px-8 gap-3">
        <p className="text-stone-400 text-sm">No se pudo preparar la busqueda.</p>
        <button
          onClick={onRebuildIndex}
          className="h-10 px-4 rounded-lg bg-amber-500 text-black font-semibold text-sm active:bg-amber-600"
        >
          Reintentar indice
        </button>
      </div>
    )
  }

  if (searching) {
    return (
      <div className="flex justify-center py-10">
        <div className="w-8 h-8 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (query.trim() && resultsCount === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-8">
        <p className="text-stone-400 text-base mb-1">Sin resultados para «{query}»</p>
        <p className="text-stone-600 text-sm">Prueba con otro nombre, ano o lugar</p>
      </div>
    )
  }

  if (!query.trim()) {
    return (
      <div className="flex flex-col items-center py-16 text-center px-8 gap-3">
        <p className="text-stone-500 text-sm">Escribe para buscar en el archivo</p>
        <div className="text-stone-600 text-xs space-y-1.5">
          <p><span className="text-stone-500 font-mono">antonio mellado</span> - ambas palabras presentes</p>
          <p><span className="text-stone-500 font-mono">&quot;antonio mellado&quot;</span> - frase exacta</p>
          <p><span className="text-stone-500 font-mono">&quot;plaza mayor&quot; 1960</span> - frase + palabra</p>
        </div>
      </div>
    )
  }

  return (
    <p className="text-center text-stone-600 text-xs py-4">
      {resultsCount} resultado{resultsCount !== 1 ? 's' : ''}
    </p>
  )
}
