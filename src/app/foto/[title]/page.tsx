import { cache } from 'react'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { getPhotoData } from '@/shared/lib/mediawiki-api'

export const revalidate = 86400

// Deduplicate within the same request (generateMetadata + page body)
const getCachedPhoto = cache((title: string) => getPhotoData(title))

export async function generateMetadata({
  params,
}: {
  params: Promise<{ title: string }>
}): Promise<Metadata> {
  const { title: raw } = await params
  const title = decodeURIComponent(raw)
  try {
    const photo = await getCachedPhoto(title)
    const ogImage = photo.imageUrl || photo.thumbUrl
    const description = [photo.description !== photo.title ? photo.description : null, photo.date, photo.author]
      .filter(Boolean)
      .join(' · ')
    return {
      title: `${photo.description || photo.title} — FotosWiki Mairena del Alcor`,
      description: description || 'Archivo fotográfico histórico de Mairena del Alcor',
      openGraph: {
        title: photo.description || photo.title,
        description: description || 'Archivo fotográfico histórico de Mairena del Alcor',
        images: ogImage ? [{ url: ogImage }] : [],
        type: 'article',
        siteName: 'FotosWiki — Mairena del Alcor',
      },
      twitter: {
        card: 'summary_large_image',
        title: photo.description || photo.title,
        description: description || undefined,
        images: ogImage ? [ogImage] : [],
      },
    }
  } catch {
    return { title: 'FotosWiki — Mairena del Alcor' }
  }
}

export default async function FotoDetailPage({
  params,
}: {
  params: Promise<{ title: string }>
}) {
  const { title: raw } = await params
  const title = decodeURIComponent(raw)

  let photo
  try {
    photo = await getCachedPhoto(title)
    if (!photo.thumbUrl && !photo.imageUrl) notFound()
  } catch {
    notFound()
  }

  const hasMetadata =
    (photo.description && photo.description !== photo.title) ||
    photo.date ||
    photo.author ||
    photo.origin ||
    photo.persons.length > 0

  return (
    <div className="min-h-[100dvh] bg-stone-950 flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-800 flex-shrink-0">
        <Link
          href="/"
          className="text-stone-400 hover:text-white transition-colors text-sm flex items-center gap-1.5 touch-manipulation"
        >
          ← Inicio
        </Link>
        <span className="font-playfair text-white text-base font-bold">FotosWiki</span>
        <Link
          href="/gallery"
          className="text-amber-400 hover:text-amber-300 transition-colors text-sm touch-manipulation"
        >
          Galería
        </Link>
      </header>

      {/* Photo */}
      <div className="relative w-full bg-black flex-shrink-0" style={{ minHeight: '40vh', maxHeight: '65vh' }}>
        <Image
          src={photo.imageUrl || photo.thumbUrl}
          alt={photo.description || photo.title}
          fill
          priority
          sizes="100vw"
          className="object-contain"
        />
      </div>

      {/* Metadata */}
      <div className="flex-1 px-4 py-5 max-w-2xl mx-auto w-full space-y-4">
        <div>
          <h1 className="font-playfair text-white text-xl font-bold leading-tight">
            {photo.description && photo.description !== photo.title
              ? photo.description
              : photo.title}
          </h1>
          {photo.date && (
            <p className="text-amber-400 text-sm mt-1 font-medium">{photo.date}</p>
          )}
        </div>

        {hasMetadata && (
          <div className="space-y-3 text-sm">
            {photo.author && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-0.5">
                  Fotógrafo / Autor
                </span>
                <p className="text-stone-200">{photo.author}</p>
              </div>
            )}
            {photo.origin && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-0.5">
                  Origen / Colección
                </span>
                <p className="text-stone-200">{photo.origin}</p>
              </div>
            )}
            {photo.persons.length > 0 && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-1">
                  Personajes identificados
                </span>
                <ol className="space-y-0.5">
                  {photo.persons.map((person, i) => (
                    <li key={i} className="flex items-start gap-2 text-stone-200">
                      <span className="text-amber-500 font-mono text-xs mt-0.5 flex-shrink-0 w-5 text-right">
                        {i + 1}.
                      </span>
                      <span>{person}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {photo.categories.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {photo.categories.map((c) => (
                  <span
                    key={c}
                    className="px-2 py-0.5 bg-stone-800 text-stone-400 text-xs rounded-full"
                  >
                    {c}
                  </span>
                ))}
              </div>
            )}
            {photo.observations.length > 0 && (
              <div>
                <span className="text-stone-500 text-xs uppercase tracking-wider block mb-1">
                  Observaciones
                </span>
                <ul className="space-y-1 text-stone-300">
                  {photo.observations.map((obs, i) => (
                    <li key={i}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* CTAs */}
        <div className="flex flex-col gap-3 pt-2 pb-6">
          <Link
            href="/gallery"
            className="w-full h-13 flex items-center justify-center
                       bg-amber-500 hover:bg-amber-400 active:bg-amber-600
                       text-black font-bold rounded-xl text-sm tracking-wide uppercase
                       touch-manipulation transition-colors"
            style={{ height: '3.25rem' }}
          >
            Explorar las fotos
          </Link>
          <a
            href={photo.wikiUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full h-11 flex items-center justify-center
                       border border-stone-700 text-stone-400 hover:text-white hover:border-stone-500
                       rounded-xl text-sm touch-manipulation transition-colors"
          >
            Ver en MairenaWiki ↗
          </a>
        </div>
      </div>
    </div>
  )
}
