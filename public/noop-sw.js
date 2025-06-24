// Service Worker optimisé pour FloService
// Version: 1.1.0 - Résolution des problèmes de re-enregistrement

const CACHE_NAME = 'floservice-v1';
const isProduction = true; // Défini en production

self.addEventListener('install', (event) => {
  console.log('[SW] Installation du Service Worker FloService v1.1.0');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation du Service Worker');
  event.waitUntil(
    Promise.all([
      // Supprime les anciens caches si nécessaire
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(cacheName => cacheName !== CACHE_NAME)
            .map(cacheName => {
              console.log('[SW] Suppression du cache obsolète:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Prend le contrôle immédiatement
      self.clients.claim()
    ])
  );
});

// Gestionnaire fetch minimal pour éviter les avertissements
self.addEventListener('fetch', (event) => {
  // En développement ou pour les requêtes API, laisser passer
  if (!isProduction || event.request.url.includes('/api/') || event.request.url.includes('supabase.co')) {
    return; // Laisse le navigateur gérer
  }
  
  // Pour les autres ressources statiques, utilisation du cache si nécessaire
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(response => {
        return response || fetch(event.request);
      })
    );
  }
});

// Gestion des messages du client principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker FloService initialisé');
