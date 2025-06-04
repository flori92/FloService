/**
 * Couche de compatibilité Supabase → Appwrite
 * 
 * Ce fichier remplace les imports de Supabase par des imports d'Appwrite
 * tout en conservant la même interface pour minimiser les modifications
 * dans le code existant.
 */

import AppwriteClient, { 
  client, 
  account, 
  databases, 
  storage, 
  functions, 
  avatars, 
  COLLECTIONS, 
  databaseId,
  ID,
  Query 
} from './appwriteClient';

// Création d'un objet qui imite l'interface de Supabase
// mais utilise Appwrite en interne
const supabase = {
  // Auth
  auth: {
    getSession: async () => {
      try {
        const user = await AppwriteClient.getCurrentUser();
        return { data: { session: user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    getUser: async () => {
      try {
        const user = await AppwriteClient.getCurrentUser();
        return { data: { user }, error: null };
      } catch (error) {
        return { data: { user: null }, error };
      }
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const session = await AppwriteClient.signIn(email, password);
        return { data: { session }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    },
    signOut: async () => {
      try {
        await AppwriteClient.signOut();
        return { error: null };
      } catch (error) {
        return { error };
      }
    },
    onAuthStateChange: (callback) => {
      // Appwrite ne fournit pas d'équivalent direct
      // On simule un comportement similaire avec une vérification périodique
      console.warn('Appwrite ne supporte pas directement onAuthStateChange, simulation utilisée');
      
      let lastAuthState = null;
      const checkInterval = 5000; // 5 secondes
      
      const intervalId = setInterval(async () => {
        try {
          const user = await AppwriteClient.getCurrentUser();
          const newAuthState = user ? 'SIGNED_IN' : 'SIGNED_OUT';
          
          if (newAuthState !== lastAuthState) {
            lastAuthState = newAuthState;
            callback(newAuthState, { user });
          }
        } catch (error) {
          console.error('Erreur lors de la vérification de l\'état d\'authentification:', error);
        }
      }, checkInterval);
      
      // Retourner un objet avec une méthode unsubscribe
      return {
        data: {
          subscription: {
            unsubscribe: () => clearInterval(intervalId)
          }
        }
      };
    },
    signUp: async ({ email, password, options }) => {
      try {
        const name = options?.data?.full_name || 'Utilisateur';
        const user = await AppwriteClient.signUp(email, password, name);
        return { data: { user }, error: null };
      } catch (error) {
        return { data: null, error };
      }
    }
  },
  
  // Database
  from: (collection) => ({
    select: (columns = '*') => ({
      eq: (field, value) => {
        return AppwriteClient.query(collection, {
          filters: [Query.equal(field, value)]
        }).then(result => ({ data: result.documents, error: null }))
        .catch(error => ({ data: null, error }));
      },
      match: (params) => {
        const filters = Object.entries(params).map(([field, value]) => 
          Query.equal(field, value)
        );
        
        return AppwriteClient.query(collection, { filters })
          .then(result => ({ data: result.documents, error: null }))
          .catch(error => ({ data: null, error }));
      },
      in: (field, values) => {
        return AppwriteClient.query(collection, {
          filters: values.map(value => Query.equal(field, value))
        }).then(result => ({ data: result.documents, error: null }))
        .catch(error => ({ data: null, error }));
      },
      order: (field, { ascending = true } = {}) => ({
        limit: (limit) => {
          return AppwriteClient.query(collection, {
            orderBy: [ascending ? Query.orderAsc(field) : Query.orderDesc(field)],
            limit
          }).then(result => ({ data: result.documents, error: null }))
          .catch(error => ({ data: null, error }));
        }
      }),
      limit: (limit) => {
        return AppwriteClient.query(collection, { limit })
          .then(result => ({ data: result.documents, error: null }))
          .catch(error => ({ data: null, error }));
      }
    }),
    insert: (data, options = {}) => {
      return AppwriteClient.create(collection, data, options.id)
        .then(result => ({ data: result, error: null }))
        .catch(error => ({ data: null, error }));
    },
    update: (data) => {
      if (!data.id) {
        return Promise.resolve({ data: null, error: new Error('ID manquant pour la mise à jour') });
      }
      
      const { id, ...updateData } = data;
      return AppwriteClient.update(collection, id, updateData)
        .then(result => ({ data: result, error: null }))
        .catch(error => ({ data: null, error }));
    },
    delete: () => ({
      eq: (field, value) => {
        // Pour Supabase, on peut supprimer avec un filtre
        // Pour Appwrite, on doit d'abord récupérer l'ID puis supprimer
        return AppwriteClient.query(collection, {
          filters: [Query.equal(field, value)]
        }).then(result => {
          if (result.documents.length === 0) {
            return { data: null, error: null };
          }
          
          const id = result.documents[0].$id;
          return AppwriteClient.delete(collection, id)
            .then(() => ({ data: { id }, error: null }))
            .catch(error => ({ data: null, error }));
        }).catch(error => ({ data: null, error }));
      }
    }),
    upsert: (data) => {
      // Si l'ID existe, on met à jour, sinon on crée
      if (data.id) {
        const { id, ...updateData } = data;
        return AppwriteClient.update(collection, id, updateData)
          .then(result => ({ data: result, error: null }))
          .catch(error => ({ data: null, error }));
      } else {
        return AppwriteClient.create(collection, data)
          .then(result => ({ data: result, error: null }))
          .catch(error => ({ data: null, error }));
      }
    }
  }),
  
  // Storage
  storage: {
    from: (bucket) => ({
      upload: async (path, file) => {
        try {
          const result = await AppwriteClient.uploadFile(bucket, file, path);
          return { data: result, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      download: async (path) => {
        try {
          const url = AppwriteClient.getFileUrl(bucket, path);
          const response = await fetch(url);
          const blob = await response.blob();
          return { data: blob, error: null };
        } catch (error) {
          return { data: null, error };
        }
      },
      getPublicUrl: (path) => {
        try {
          const publicUrl = AppwriteClient.getFileUrl(bucket, path);
          return { data: { publicUrl }, error: null };
        } catch (error) {
          return { data: { publicUrl: '' }, error };
        }
      },
      list: async () => {
        try {
          // Appwrite n'a pas d'équivalent direct pour lister les fichiers
          // Il faudrait implémenter une collection spécifique pour suivre les fichiers
          console.warn('La méthode list() n\'est pas complètement implémentée avec Appwrite');
          return { data: [], error: null };
        } catch (error) {
          return { data: [], error };
        }
      },
      remove: async (path) => {
        try {
          // On suppose que path est l'ID du fichier
          await storage.deleteFile(bucket, path);
          return { data: { path }, error: null };
        } catch (error) {
          return { data: null, error };
        }
      }
    })
  },
  
  // Realtime
  channel: (name) => ({
    on: (event, filter) => ({
      subscribe: (callback) => {
        console.warn('Appwrite ne supporte pas encore complètement le realtime pour les collections');
        return AppwriteClient.subscribeToCollection(name, callback);
      }
    })
  }),
  removeChannel: () => {
    console.warn('Appwrite ne supporte pas encore complètement le realtime pour les collections');
  },
  
  // RPC
  rpc: async (func, params) => {
    try {
      console.warn(`La fonction RPC ${func} n'a pas d'équivalent direct dans Appwrite`);
      
      // Implémentation spécifique pour certaines fonctions RPC courantes
      if (func === 'mark_messages_as_read') {
        const { p_conversation_id, p_user_id } = params;
        
        // Récupérer les messages non lus
        const result = await AppwriteClient.query(COLLECTIONS.MESSAGES, {
          filters: [
            Query.equal('conversation_id', p_conversation_id),
            Query.equal('recipient_id', p_user_id),
            Query.equal('read', false)
          ]
        });
        
        // Marquer chaque message comme lu
        const updatePromises = result.documents.map(message => 
          AppwriteClient.update(COLLECTIONS.MESSAGES, message.$id, { read: true })
        );
        
        await Promise.all(updatePromises);
        return { data: updatePromises.length, error: null };
      }
      
      return { data: null, error: new Error(`Fonction RPC ${func} non implémentée`) };
    } catch (error) {
      return { data: null, error };
    }
  }
};

// Export par défaut du client compatible
export default supabase;

// Export nommé pour la compatibilité avec le code existant
export { supabase };
