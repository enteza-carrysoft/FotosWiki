'use client'

import { useRef, useState } from 'react'

export interface FilterOption {
  label: string
  category: string
  emoji?: string
}

const THEME_FILTERS: FilterOption[] = [
  { label: 'Todas', category: 'Fotos', emoji: '📷' },
  { label: 'Personas', category: 'Foto personas', emoji: '👥' },
  { label: 'Vistas', category: 'Foto vistas', emoji: '🏘️' },
  { label: 'Feria', category: 'Foto Feria', emoji: '🎡' },
  { label: 'Religión', category: 'Foto Religión', emoji: '⛪' },
  { label: 'Deportes', category: 'Foto deportes', emoji: '⚽' },
  { label: 'Colegios', category: 'Foto colegios', emoji: '🏫' },
  { label: 'Castillo', category: 'Foto Castillo', emoji: '🏰' },
  { label: 'Bodas', category: 'Foto Boda', emoji: '💍' },
  { label: 'Comuniones', category: 'Foto Comuniones', emoji: '🕊️' },
  { label: 'Soldados', category: 'Foto Soldados', emoji: '🎖️' },
  { label: 'Flamenco', category: 'Foto Festival Cante Jondo', emoji: '💃' },
  { label: 'Romería', category: 'Foto Romería', emoji: '🌸' },
  { label: 'Reyes Magos', category: 'Foto Reyes Magos', emoji: '👑' },
]

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

const THEME_CATEGORIES = new Set(THEME_FILTERS.map((f) => f.category))

interface Props {
  activeCategory: string
  onChange: (category: string) => void
}

export default function FilterBar({ activeCategory, onChange }: Props) {
  const initialTab: 'theme' | 'year' = THEME_CATEGORIES.has(activeCategory) ? 'theme' : 'year'
  const [tab, setTab] = useState<'theme' | 'year'>(initialTab)
  // Remember last picked category per tab so switching back restores it
  const lastByTab = useRef<{ theme: string; year: string }>({
    theme: initialTab === 'theme' ? activeCategory : 'Fotos',
    year: initialTab === 'year' ? activeCategory : YEAR_FILTERS[0].category,
  })

  const filters = tab === 'theme' ? THEME_FILTERS : YEAR_FILTERS

  const handleTabChange = (next: 'theme' | 'year') => {
    if (next === tab) return
    // Save current and restore the saved one for the new tab
    lastByTab.current[tab] = activeCategory
    setTab(next)
    onChange(lastByTab.current[next])
  }

  const handleChipChange = (category: string) => {
    lastByTab.current[tab] = category
    onChange(category)
  }

  return (
    <div className="sticky top-0 z-20 bg-stone-950/98 backdrop-blur-md border-b border-stone-800/60">
      {/* Tab switcher — min 44px height */}
      <div className="flex px-3 pt-2 pb-1 gap-1">
        {(['theme', 'year'] as const).map((t) => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            className={`h-10 px-5 rounded-full text-sm font-semibold transition-colors touch-manipulation ${
              tab === t
                ? 'bg-amber-500 text-black'
                : 'text-stone-400 active:text-white'
            }`}
          >
            {t === 'theme' ? 'Temática' : 'Por época'}
          </button>
        ))}
      </div>

      {/* Filter chips — min 44px height, larger tap area */}
      <div className="flex gap-2 px-3 pb-2 overflow-x-auto scrollbar-none">
        {filters.map((f) => {
          const active = activeCategory === f.category
          return (
            <button
              key={f.category}
              onClick={() => handleChipChange(f.category)}
              className={`flex-shrink-0 h-10 px-4 rounded-full text-sm font-medium transition-colors touch-manipulation border whitespace-nowrap ${
                active
                  ? 'bg-amber-500 border-amber-500 text-black font-semibold'
                  : 'border-stone-700 text-stone-300 active:border-stone-400 active:text-white'
              }`}
            >
              {f.emoji && <span className="mr-1.5">{f.emoji}</span>}
              {f.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
