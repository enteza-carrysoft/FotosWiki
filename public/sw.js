const IMAGE_CACHE = 'fotoswiki-images-v1'
const APP_CACHE = 'fotoswiki-app-v1'
const MAX_IMAGES = 300

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

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  // Cache-first for wiki images
  if (
    url.hostname === 'www.mairenawiki.es' &&
    url.pathname.includes('/wiki/images/')
  ) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok) {
            // Evict oldest if over limit
            const keys = await cache.keys()
            if (keys.length >= MAX_IMAGES) {
              await cache.delete(keys[0])
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
