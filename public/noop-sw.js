// Service Worker temporairement désactivé pour résoudre les problèmes CSP
// Version: 1.3.0 - Mode bypass pour développement

const CACHE_NAME = 'floservice-v3';
const isProduction = false; // Temporairement désactivé en dev

self.addEventListener('install', (event) => {
  console.log('[SW] Service Worker FloService v1.3.0 - Mode bypass CSP');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activation en mode bypass - Suppression de tous les caches');
  event.waitUntil(
    Promise.all([
      // Supprime TOUS les caches existants
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[SW] Suppression du cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      self.clients.claim()
    ])
  );
});

// Gestionnaire fetch désactivé pour éviter les conflits CSP
self.addEventListener('fetch', (event) => {
  // Ne fait rien - laisse le navigateur gérer toutes les requêtes
  console.log('[SW] Bypass fetch pour:', event.request.url);
  return;
});

// Gestion des messages du client principal
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[SW] Service Worker FloService initialisé en mode bypass CSP');
