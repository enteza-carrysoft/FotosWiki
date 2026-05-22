const IMAGE_CACHE = 'fotoswiki-images-v2'
const APP_CACHE = 'fotoswiki-app-v2'
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

// LRU touch: refresh cache entry insertion order on hit.
// Cache Storage iteration order = insertion order, so re-putting moves to end.
async function touchEntry(cache, request, cached) {
  try {
    await cache.delete(request)
    await cache.put(request, cached.clone())
  } catch {
    // ignore — best-effort LRU
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache-first for wiki images with LRU eviction
  if (
    url.hostname === 'www.mairenawiki.es' &&
    url.pathname.includes('/wiki/images/')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) {
          event.waitUntil(touchEntry(cache, event.request, cached))
          return cached
        }

        try {
          const response = await fetch(event.request)
          if (response.ok) {
            const keys = await cache.keys()
            // Evict oldest (= first in insertion order) until under limit
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
      })
    )
    return
  }

  // Network-first for everything else (app shell)
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  )
})
