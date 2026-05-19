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
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
