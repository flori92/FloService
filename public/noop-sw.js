// Service Worker vide pour désactiver temporairement la mise en cache
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Supprime tous les caches existants
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Ne fait rien pour les requêtes fetch
self.addEventListener('fetch', (event) => {
  // Laisse le navigateur gérer normalement les requêtes
  return;
});
