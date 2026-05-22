const IMAGE_CACHE = 'fotoswiki-images-v3'
const APP_CACHE = 'fotoswiki-app-v3'
const MAX_IMAGES = 500

self.addEventListener('install', () => self.skipWaiting())

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

async function touchEntry(cache, request, cached) {
  try {
    await cache.delete(request)
    await cache.put(request, cached.clone())
  } catch { /* best-effort */ }
}

async function cacheFirstImage(event, cache) {
  const cached = await cache.match(event.request)
  if (cached) {
    event.waitUntil(touchEntry(cache, event.request, cached))
    return cached
  }
  try {
    const response = await fetch(event.request)
    if (response.ok) {
      const keys = await cache.keys()
      const overflow = keys.length - MAX_IMAGES + 1
      if (overflow > 0) {
        await Promise.all(keys.slice(0, overflow).map((k) => cache.delete(k)))
      }
      cache.put(event.request, response.clone())
    }
    return response
  } catch {
    return new Response('', { status: 503, statusText: 'Offline' })
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache-first for Next.js optimized images (served via next/image component)
  if (url.pathname.startsWith('/_next/image')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => cacheFirstImage(event, cache))
    )
    return
  }

  // Cache-first for original wiki images (used in lightbox / modal full-res)
  if (
    url.hostname === 'www.mairenawiki.es' &&
    url.pathname.includes('/wiki/images/')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => cacheFirstImage(event, cache))
    )
    return
  }

  // Network-first for everything else (app shell)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
