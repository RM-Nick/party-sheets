// Minimal service worker so the site can be installed as an app. It always goes to the network,
// so updates appear straight away and nothing private is cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => { if (e.request.method === 'GET') e.respondWith(fetch(e.request)); });
