import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FotosWiki — Mairena del Alcor',
    short_name: 'FotosWiki',
    description: 'Archivo fotográfico histórico de Mairena del Alcor',
    start_url: '/',
    display: 'standalone',
    background_color: '#1c1409',
    theme_color: '#1c1409',
    icons: [
      {
        src: '/icon-192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
