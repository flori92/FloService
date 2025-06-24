// Service Worker KILLER - Force la suppression de tous les SW existants
// Version: 2.0.0 - Suppression définitive

console.log('[KILL-SW] Service Worker Killer activé - Suppression forcée');

// Force la suppression immédiate
self.addEventListener('install', (event) => {
  console.log('[KILL-SW] Installation - Suppression immédiate de tous les caches');
  event.waitUntil(
    Promise.all([
      // Supprime TOUS les caches sans exception
      caches.keys().then((cacheNames) => {
        console.log('[KILL-SW] Caches trouvés:', cacheNames);
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('[KILL-SW] SUPPRESSION cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      // Force l'activation immédiate
      self.skipWaiting()
    ])
  );
});

self.addEventListener('activate', (event) => {
  console.log('[KILL-SW] Activation - Nettoyage complet');
  event.waitUntil(
    Promise.all([
      // Re-supprime tout au cas où
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map(cacheName => caches.delete(cacheName))
        );
      }),
      // Prend le contrôle immédiat
      self.clients.claim(),
      // Auto-destruction après nettoyage
      self.registration.unregister().then(() => {
        console.log('[KILL-SW] Service Worker killer auto-détruit avec succès');
      })
    ])
  );
});

// AUCUN gestionnaire fetch - laisse tout passer
// Pas d'interception = pas d'erreurs CSP

console.log('[KILL-SW] Service Worker Killer prêt - Auto-destruction programmée');
