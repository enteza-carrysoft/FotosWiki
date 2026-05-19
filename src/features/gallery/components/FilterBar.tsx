'use client'

import { useState } from 'react'

export interface FilterOption {
  label: string
  category: string
}

const THEME_FILTERS: FilterOption[] = [
  { label: 'Todas', category: 'Fotos' },
  { label: 'Personas', category: 'Foto personas' },
  { label: 'Vistas', category: 'Foto vistas' },
  { label: 'Feria', category: 'Foto Feria' },
  { label: 'Religión', category: 'Foto Religión' },
  { label: 'Deportes', category: 'Foto deportes' },
  { label: 'Colegios', category: 'Foto colegios' },
  { label: 'Castillo', category: 'Foto Castillo' },
  { label: 'Bodas', category: 'Foto Boda' },
  { label: 'Comuniones', category: 'Foto Comuniones' },
  { label: 'Soldados', category: 'Foto Soldados' },
  { label: 'Flamenco', category: 'Foto Festival Cante Jondo' },
  { label: 'Romería', category: 'Foto Romería' },
  { label: 'Reyes Magos', category: 'Foto Reyes Magos' },
]

// Decades where photos exist, and a representative high-volume year per decade
const YEAR_FILTERS: FilterOption[] = [
  { label: '1890–1909', category: 'Foto 1898' },
  { label: '1910s', category: 'Foto 1916' },
  { label: '1920s', category: 'Foto 1922' },
  { label: '1930s', category: 'Foto 1935' },
  { label: '1940s', category: 'Foto 1947' },
  { label: '1950s', category: 'Foto 1955' },
  { label: '1960s', category: 'Foto 1968' },
  { label: '1970s', category: 'Foto 1975' },
]

interface Props {
  activeCategory: string
  onChange: (category: string) => void
}

export default function FilterBar({ activeCategory, onChange }: Props) {
  const [tab, setTab] = useState<'theme' | 'year'>('theme')

  const filters = tab === 'theme' ? THEME_FILTERS : YEAR_FILTERS

  return (
    <div className="sticky top-0 z-20 bg-stone-950/95 backdrop-blur border-b border-stone-800 pb-2">
      {/* Tab switcher */}
      <div className="flex gap-1 px-4 pt-3 pb-2">
        {(['theme', 'year'] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t)
              // Reset to "Todas" when switching tabs
              if (t === 'theme') onChange('Fotos')
            }}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-amber-500 text-black'
                : 'text-stone-400 hover:text-white'
            }`}
          >
            {t === 'theme' ? 'Temática' : 'Por época'}
          </button>
        ))}
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 overflow-x-auto scrollbar-none pb-1">
        {filters.map((f) => (
          <button
            key={f.category}
            onClick={() => onChange(f.category)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-sm transition-colors border ${
              activeCategory === f.category
                ? 'bg-amber-500 border-amber-500 text-black font-semibold'
                : 'border-stone-700 text-stone-300 hover:border-stone-500 hover:text-white'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
