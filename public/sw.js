/**
 * Service Worker for caching and performance optimization
 * HTML pages are always network-first so maintenance mode and content updates apply.
 */

const CACHE_NAME = 'adoptrees-v3';
const STATIC_CACHE = 'adoptrees-static-v3';
const API_CACHE = 'adoptrees-api-v3';

// Asset-only precache — never precache HTML routes
const STATIC_FILES = [
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_FILES)),
      self.skipWaiting(),
    ])
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((cacheNames) =>
        Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== CACHE_NAME &&
              cacheName !== STATIC_CACHE &&
              cacheName !== API_CACHE
            ) {
              return caches.delete(cacheName);
            }
          })
        )
      ),
      self.clients.claim(),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') {
    return;
  }

  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(handleRequest(request));
});

async function handleRequest(request) {
  const url = new URL(request.url);

  // Never serve cached HTML for the home page or any navigation
  if (request.mode === 'navigate' || url.pathname === '/' || url.pathname === '') {
    return networkOnly(request);
  }

  if (isStaticAsset(url)) {
    return cacheFirst(request, STATIC_CACHE);
  }

  if (url.pathname.startsWith('/api/eco-community')) {
    return fetch(request);
  }

  // Never cache site settings — used for maintenance mode
  if (url.pathname.startsWith('/api/settings')) {
    return fetch(request);
  }

  if (isApiCall(url)) {
    return networkFirst(request, API_CACHE);
  }

  if (isImage(url)) {
    return cacheFirst(request, STATIC_CACHE);
  }

  return networkFirst(request, CACHE_NAME);
}

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return (
      (await caches.match('/offline.html')) ||
      new Response('Offline', { status: 503 })
    );
  }
}

async function cacheFirst(request, cacheName) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    return new Response('Offline', { status: 503 });
  }
}

async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    if (request.mode === 'navigate') {
      return (
        (await caches.match('/offline.html')) ||
        new Response('Offline', { status: 503 })
      );
    }

    return new Response('Offline', { status: 503 });
  }
}

function isStaticAsset(url) {
  return (
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.startsWith('/_next/static/')
  );
}

function isApiCall(url) {
  return url.pathname.startsWith('/api/');
}

function isImage(url) {
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i);
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

async function doBackgroundSync() {
  // Implement background sync logic here
}

self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_192,h_192,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png',
      badge: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_72,h_72,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey,
        url: data.url || '/',
      },
      actions: [
        {
          action: 'explore',
          title: data.actionTitle || 'Open Chat',
          icon: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_192,h_192,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png',
        },
        {
          action: 'close',
          title: 'Close',
          icon: 'https://res.cloudinary.com/dmhdhzr6y/image/upload/w_192,h_192,c_fill,r_max/v1763716774/WhatsApp_Image_2025-11-21_at_10.35.39_AM_wvwvdy_e_background_removal_f_png.jpg_szp33f.png',
        },
      ],
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client && client.url.includes(targetUrl)) {
            return client.focus();
          }
        }

        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});
