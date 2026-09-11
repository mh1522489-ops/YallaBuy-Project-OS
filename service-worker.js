const CACHE_NAME = 'yallabuy-cache-v226'; // غيّر الرقم عشان يتحدث
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icons/icon-192x192.jpg',
  '/icons/icon-512x512.jpg',
  '/icons/icon-180x180.jpg'
  // ضيف هنا أي CSS/JS files حقيقية عندك
];

const NEVER_CACHE = [
  '/api/',
  '/auth/',
  '/login',
  '/register',
  '/checkout',
  '/user/',
  '/admin/'
];

function shouldCache(url) {
  return !NEVER_CACHE.some(path => url.includes(path));
}

// 1. التثبيت
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching core assets...');
        return cache.addAll(CORE_ASSETS);
      })
      .then(() => {
        console.log('Core assets cached successfully!');
        return self.skipWaiting();
      })
      .catch((err) => {
        console.error('Cache failed:', err);
      })
  );
});

// 2. التفعيل
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 3. جلب الطلبات
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  if (!request.url.startsWith('http') || request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // ✅ لو لقيناه في cache → نرجعه على طول
      if (cachedResponse) {
        return cachedResponse;
      }

      // ✅ لو مش في cache → نجيب من النت
      return fetch(request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }

        // ✅ نخزن في cache بس لو static asset
        if (shouldCache(request.url)) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      }).catch(() => {
        // ✅ لو offline وطلب صفحة → نرجع index.html
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        
        // ✅ لو offline وطلب asset → نرجع 404 بسيط
        return new Response('Offline', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});

// 4. رسائل التحديث
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
