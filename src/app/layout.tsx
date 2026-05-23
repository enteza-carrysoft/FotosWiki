import type { Metadata, Viewport } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import ServiceWorkerRegistrar from '@/shared/components/ServiceWorkerRegistrar'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MairenaFotos — Archivo Fotográfico de Mairena del Alcor',
  description:
    'Más de un siglo de historia de Mairena del Alcor en imágenes. Archivo fotográfico histórico impulsado por Mairena Wiki.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MairenaFotos',
  },
}

export const viewport: Viewport = {
  themeColor: '#1c1409',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${inter.variable}`}>
      <head>
        {/* Pre-establece conexión TLS al wiki — crítico para dispositivos lentos
            que de otra forma pagarían el handshake en cada thumb concurrente */}
        <link rel="preconnect" href="https://www.mairenawiki.es" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://www.mairenawiki.es" />
      </head>
      <body className="font-inter antialiased bg-stone-950 text-white">
        {children}
        <ServiceWorkerRegistrar />
      </body>
    </html>
  )
}
