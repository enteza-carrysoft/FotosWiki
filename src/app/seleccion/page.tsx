import type { Metadata } from 'next'
import Link from 'next/link'
import { getBatchThumbs } from '@/shared/lib/mediawiki-api'

interface Props {
  searchParams: Promise<{ f?: string }>
}

function parseTitles(raw: string | undefined): string[] {
  if (!raw) return []
  return raw.split('|').map((t) => t.trim()).filter(Boolean).slice(0, 50)
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { f } = await searchParams
  const titles = parseTitles(f)
  if (titles.length === 0) return { title: 'Selección — MairenaFotos' }

  const thumbs = await getBatchThumbs([titles[0]], 800)
  const first = thumbs[titles[0]]

  const title = `${titles.length} foto${titles.length !== 1 ? 's' : ''} de Mairena del Alcor`
  const description = 'Selección del archivo fotográfico histórico de Mairena del Alcor'

  return {
    title: `${title} — MairenaFotos`,
    description,
    openGraph: {
      title,
      description,
      images: first?.thumbUrl ? [{ url: first.thumbUrl }] : [],
      type: 'website',
      siteName: 'MairenaFotos — Mairena del Alcor',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: first?.thumbUrl ? [first.thumbUrl] : [],
    },
  }
}

export default async function SeleccionPage({ searchParams }: Props) {
  const { f } = await searchParams
  const titles = parseTitles(f)

  if (titles.length === 0) {
    return (
      <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center p-8 text-center gap-4">
        <p className="text-stone-400">No hay fotos en esta selección.</p>
        <Link href="/" className="text-amber-400 hover:text-amber-300 text-sm">
          ← Volver al inicio
        </Link>
      </div>
    )
  }

  const thumbs = await getBatchThumbs(titles, 400)
  const photos = titles.map((t) => thumbs[t]).filter(Boolean)

  return (
    <div className="min-h-[100dvh] bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="px-4 pt-6 pb-5 text-center border-b border-stone-800/60">
        <p className="text-amber-400/60 text-[10px] uppercase tracking-[0.3em] mb-2">
          Selección compartida
        </p>
        <h1 className="font-playfair text-white text-2xl font-bold leading-tight">
          {photos.length} foto{photos.length !== 1 ? 's' : ''}{' '}
          <span className="font-light italic text-amber-400">de Mairena</span>
        </h1>
        <p className="text-stone-500 text-xs mt-1.5 tracking-wide">
          Archivo fotográfico histórico · MairenaFotos
        </p>
      </header>

      {/* Grid */}
      <main className="flex-1 p-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {photos.map((photo) => (
            <Link
              key={photo.title}
              href={`/foto/${encodeURIComponent(photo.title)}`}
              className="relative block w-full overflow-hidden rounded-lg bg-stone-800 aspect-[4/3]
                         hover:opacity-90 active:scale-95 transition-all"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.title}
                className="w-full h-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent pt-4 pb-1.5 px-1.5 pointer-events-none">
                <span className="block text-white text-[10px] leading-tight font-medium line-clamp-2 text-left drop-shadow">
                  {photo.title}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>

      {/* Footer CTA */}
      <footer className="px-4 pt-5 pb-8 text-center border-t border-stone-800/60 flex flex-col items-center gap-3">
        <p className="text-stone-500 text-xs max-w-xs leading-relaxed">
          Del archivo fotográfico histórico de Mairena del Alcor · Ateneo de Mairena
        </p>
        <Link
          href="/gallery"
          className="h-12 px-8 flex items-center justify-center
                     bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                     text-black font-bold rounded-xl text-sm tracking-wide uppercase
                     touch-manipulation transition-colors"
        >
          Explorar el archivo completo
        </Link>
        <Link
          href="/"
          className="text-stone-500 hover:text-stone-300 text-xs touch-manipulation py-1 transition-colors"
        >
          ← Inicio
        </Link>
      </footer>
    </div>
  )
}
