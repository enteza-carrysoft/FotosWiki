const IMAGE_CACHE = 'fotoswiki-images-v4'
const APP_CACHE = 'fotoswiki-app-v4'
const MAX_IMAGES = 500
// Solo revisar tamaño de cache cada N puts (evita cache.keys() costoso en cada miss)
const EVICTION_CHECK_EVERY = 25
let putCounter = 0

const PRECACHE_URLS = ['/', '/gallery', '/favorites']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS).catch(() => {}))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== IMAGE_CACHE && k !== APP_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

async function maybeEvict(cache) {
  try {
    const keys = await cache.keys()
    const overflow = keys.length - MAX_IMAGES
    if (overflow > 0) {
      // Borra los más antiguos (Cache API mantiene orden de inserción)
      await Promise.all(keys.slice(0, overflow + 10).map((k) => cache.delete(k)))
    }
  } catch { /* best-effort */ }
}

async function cacheFirstImage(event, cache) {
  const cached = await cache.match(event.request)
  if (cached) return cached
  try {
    const response = await fetch(event.request)
    if (response.ok) {
      // No esperar al put — devolver respuesta inmediatamente
      const respClone = response.clone()
      event.waitUntil((async () => {
        try {
          await cache.put(event.request, respClone)
          putCounter++
          if (putCounter >= EVICTION_CHECK_EVERY) {
            putCounter = 0
            await maybeEvict(cache)
          }
        } catch { /* best-effort */ }
      })())
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache-first: Next.js static chunks (content-hashed — nunca cambian)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached
        const response = await fetch(event.request)
        if (response.ok) cache.put(event.request, response.clone())
        return response
      })
    )
    return
  }

  // Cache-first: Next.js image optimizer (legacy, por si acaso)
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => cacheFirstImage(event, cache))
    )
    return
  }

  // Cache-first: imágenes de MediaWiki (galería + lightbox)
  if (url.hostname === 'www.mairenawiki.es' && url.pathname.includes('/wiki/images/')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => cacheFirstImage(event, cache))
    )
    return
  }

  // Network-first: rutas de API (índice de búsqueda, etc.)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    )
    return
  }

  // Stale-while-revalidate: navegación HTML (/, /gallery, /favorites, /foto/*)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.open(APP_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) cache.put(event.request, response.clone())
            return response
          })
          .catch(() => null)
        if (cached) {
          event.waitUntil(networkFetch)
          return cached
        }
        return networkFetch.then((r) => r || new Response('Sin conexión. Abre la app con red al menos una vez.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
      })
    )
    return
  }

  // Default: network-first con fallback a cache
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
