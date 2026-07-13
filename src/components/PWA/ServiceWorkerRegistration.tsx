'use client';

import { useEffect } from 'react';

async function clearAdoptreesCaches() {
  if (!('caches' in window)) return;

  const keys = await caches.keys();
  await Promise.all(
    keys
      .filter((key) => key.includes('adoptrees'))
      .map((key) => caches.delete(key))
  );
}

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      process.env.NODE_ENV === 'production'
    ) {
      // Drop old cached homepage/HTML that blocked maintenance mode on /
      clearAdoptreesCaches().catch(() => {});

      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          registration.update().catch(() => {});

          setInterval(() => {
            registration.update();
          }, 5 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (
                  newWorker.state === 'installed' &&
                  navigator.serviceWorker.controller
                ) {
                  // Activate immediately so home page stops using the old cache
                  newWorker.postMessage?.({ type: 'SKIP_WAITING' });
                  window.location.reload();
                }
              });
            }
          });
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  }, []);

  return null;
}
