// Service Worker KILLER - Force la suppression de tous les SW existants
// Version: 2.0.0 - Suppression définitive

console.log('🚨 [KILLER SW] Démarrage du processus de nettoyage ultra-puissant');

// Installation immédiate et forcée
self.addEventListener('install', (event) => {
  console.log('⚡ [KILLER SW] Installation - Suppression MASSIVE des caches');
  
  // Force l'activation immédiate sans attendre
  self.skipWaiting();
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      console.log(`🗑️ [KILLER SW] ${cacheNames.length} caches détectés pour suppression`);
      
      return Promise.all(
        cacheNames.map(cacheName => {
          console.log(`💥 [KILLER SW] Suppression cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      ).then(() => {
        console.log('✅ [KILLER SW] TOUS les caches supprimés avec succès');
      });
    })
  );
});

// Activation et auto-destruction
self.addEventListener('activate', (event) => {
  console.log('🔥 [KILLER SW] Activation - Prise de contrôle et auto-destruction');
  
  // Prend le contrôle immédiat de tous les clients
  event.waitUntil(
    self.clients.claim().then(() => {
      console.log('⚡ [KILLER SW] Contrôle des clients établi');
      
      // Auto-destruction programmée après nettoyage
      setTimeout(() => {
        console.log('💀 [KILLER SW] Début auto-destruction...');
        
        self.registration.unregister().then((success) => {
          if (success) {
            console.log('☠️ [KILLER SW] Auto-destruction réussie - Service Worker éliminé');
            
            // Notifier les clients qu'ils doivent se recharger pour éliminer complètement le SW
            self.clients.matchAll().then(clients => {
              clients.forEach(client => {
                client.postMessage({
                  type: 'KILLER_FINISHED',
                  message: 'Service Worker éliminé - Rechargement automatique nécessaire'
                });
              });
            });
          } else {
            console.error('❌ [KILLER SW] Échec auto-destruction');
          }
        });
      }, 1000); // 1 seconde pour être sûr que le nettoyage est terminé
    })
  );
});

// AUCUN gestionnaire fetch - Le killer n'intercepte RIEN
// Toutes les requêtes passent directement au navigateur
console.log('🚫 [KILLER SW] Aucun gestionnaire fetch - Interception désactivée');

// Ajout d'un gestionnaire pour recharger la page après auto-destruction
self.addEventListener('message', (event) => {
  if (event.data.type === 'KILLER_FINISHED') {
    console.log('🔄 [KILLER SW] Rechargement automatique de la page...');
    event.source.reload();
  }
});
