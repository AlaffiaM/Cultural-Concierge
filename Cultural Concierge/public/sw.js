// Alaffia PWA Service Worker
// Cache name — bump version to force a fresh cache install
const CACHE = 'alaffia-v1'

// Files to pre-cache during the install event
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
]

// Install event — pre-cache critical app shell files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// Activate event — clean up old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  )
})

// Fetch event — network-first strategy with cache fallback
// Tries the network first; if it fails, serves the cached version
// Only caches same-origin, successful responses
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // Skip non-navigation requests in development to avoid MIME-type issues
  const url = new URL(event.request.url)
  const isNav = event.request.mode === 'navigate'
  const isSameOrigin = url.origin === location.origin

  if (!isSameOrigin && !isNav) return

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone()
            const contentType = response.headers.get('content-type') || ''
            // Only cache JS, CSS, HTML, fonts, and images — not error pages
            if (contentType.startsWith('text/') || contentType.startsWith('application/javascript') || contentType.startsWith('font/') || contentType.startsWith('image/')) {
              caches.open(CACHE).then((cache) => cache.put(event.request, clone))
            }
          }
          return response
        })
        .catch(() => cached)
      return cached || fetchPromise
    })
  )
})
