/**
 * Service Worker pour FloService
 * Créé le 03/06/2025
 */

// Nom du cache
const CACHE_NAME = 'floservice-cache-v1';

// Liste des ressources à mettre en cache immédiatement
const INITIAL_CACHED_RESOURCES = [
  '/',
  '/index.html',
  '/floservice.svg',
  '/manifest.json'
];

// Installation du Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Mise en cache des ressources initiales');
        return cache.addAll(INITIAL_CACHED_RESOURCES);
      })
      .then(() => {
        // Force l'activation immédiate sans attendre la fermeture des onglets
        return self.skipWaiting();
      })
  );
});

// Activation du Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Supprime les anciens caches
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Suppression de l\'ancien cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Prend le contrôle de tous les clients sans recharger
      return self.clients.claim();
    })
  );
});

// Stratégie de mise en cache: Network First avec fallback sur le cache
self.addEventListener('fetch', (event) => {
  // Ignore les requêtes non GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Ignore les requêtes vers Supabase ou d'autres API
  const url = new URL(event.request.url);
  if (url.pathname.includes('/rest/v1/') || 
      url.pathname.includes('/auth/v1/') ||
      url.hostname.includes('supabase.co')) {
    return;
  }
  
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Vérifie si la réponse est valide
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone la réponse car elle ne peut être utilisée qu'une fois
        const responseToCache = response.clone();
        
        // Mise en cache de la réponse
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });
        
        return response;
      })
      .catch(() => {
        // En cas d'échec, essaie de récupérer depuis le cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            
            // Pour les ressources HTML, retourne la page d'accueil en cas d'échec
            if (event.request.headers.get('accept').includes('text/html')) {
              return caches.match('/index.html');
            }
            
            // Sinon, retourne une erreur
            return new Response('Ressource non disponible hors ligne', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Gestion des messages
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Préchargement des ressources en arrière-plan
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CACHE_URLS') {
    const { payload: { urls } } = event.data;
    
    event.waitUntil(
      caches.open(CACHE_NAME)
        .then((cache) => {
          return cache.addAll(urls);
        })
    );
  }
});
