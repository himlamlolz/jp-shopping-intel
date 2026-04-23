const CACHE = 'jp-intel-v1'
const SHELL = ['/', '/wishlist', '/calculator', '/discovery', '/scan', '/analytics', '/calendar', '/settings']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}))
  self.skipWaiting()
})
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request).then(r => r ?? new Response('Offline', { status: 503 })))
  )
})
