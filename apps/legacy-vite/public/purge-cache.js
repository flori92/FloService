// 🔥 PURGE TOTALE CACHE NAVIGATEUR v1.0
// Mission: Forcer la suppression du kill-sw.js fantôme

console.log('💀 PURGE CACHE - Élimination kill-sw.js fantôme');

// 1. Suppression immédiate - pas d'installation
self.addEventListener('install', (event) => {
  console.log('⚡ PURGE: Installation et suppression immédiate');
  self.skipWaiting();
});

// 2. Activation et auto-destruction IMMÉDIATE
self.addEventListener('activate', async (event) => {
  console.log('🧹 PURGE: Activation et nettoyage final');
  
  event.waitUntil((async () => {
    try {
      // Suppression de TOUS les caches sans exception
      const cacheNames = await caches.keys();
      console.log(`🗑️ PURGE: Destruction ${cacheNames.length} caches`);
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      // Prise de contrôle clients
      await self.clients.claim();
      
      // Notification fin de purge
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_PURGED',
          message: '🧹 Cache purgé - kill-sw.js éliminé',
          timestamp: Date.now()
        });
      });
      
      console.log('✅ PURGE: Cache purgé avec succès');
      
      // Auto-destruction IMMÉDIATE
      setTimeout(async () => {
        const registration = await self.registration;
        await registration.unregister();
        console.log('💀 PURGE: Auto-destruction terminée');
      }, 100);
      
    } catch (error) {
      console.error('💥 ERREUR PURGE:', error);
    }
  })());
});

// AUCUNE interception - Transparent
self.addEventListener('fetch', () => {
  // Rien - transparence totale
});

console.log('🎯 PURGE configurée - Prête à éliminer kill-sw.js');
