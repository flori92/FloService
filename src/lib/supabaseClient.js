/**
 * Client Supabase amélioré avec gestion d'erreurs et fonctionnalités avancées
 * Version compatible navigateur (sans require)
 */

// Import ES modules au niveau supérieur (compatible navigateur)
import { createClient } from '@supabase/supabase-js';

// Fonction pour récupérer les variables d'environnement de manière sécurisée
const getEnvVar = (name, fallback) => {
  // Essayer toutes les sources possibles avec gestion d'erreur
  try {
    // Vite (environnement de build)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch (e) {
    console.warn(`Erreur lors de l'accès à import.meta.env[${name}]:`, e);
  }
  
  try {
    // Variables injectées dans window
    if (typeof window !== 'undefined' && window.ENV && window.ENV[name]) {
      return window.ENV[name];
    }
  } catch (e) {
    console.warn(`Erreur lors de l'accès à window.ENV[${name}]:`, e);
  }
  
  // Valeur par défaut si aucune variable n'est trouvée
  console.warn(`Variable d'environnement ${name} non trouvée, utilisation de la valeur par défaut`);
  return fallback;
};

// Création d'un client de secours qui ne génère pas d'erreur
const createFallbackClient = () => {
  // Fonction de base pour les opérations
  const safeOp = () => Promise.resolve({
    data: null,
    error: { message: 'Client Supabase non disponible', code: 'SUPABASE_UNAVAILABLE' }
  });
  
  // Création d'un mock complet du client Supabase
  return {
    // Méthodes de base
    from: (table) => ({
      select: (columns) => ({
        eq: () => safeOp(),
        match: () => safeOp(),
        in: () => safeOp(),
        order: () => ({
          limit: () => safeOp()
        }),
        limit: () => safeOp()
      }),
      insert: () => safeOp(),
      update: () => safeOp(),
      delete: () => safeOp(),
      upsert: () => safeOp()
    }),
    
    // Auth
    auth: {
      getSession: () => safeOp(),
      getUser: () => safeOp(),
      signInWithPassword: () => safeOp(),
      signOut: () => safeOp(),
      onAuthStateChange: (callback) => ({
        data: { subscription: { unsubscribe: () => {} } }
      }),
      signUp: () => safeOp()
    },
    
    // RPC
    rpc: (func, params) => safeOp(),
    
    // Storage
    storage: {
      from: (bucket) => ({
        upload: () => safeOp(),
        download: () => safeOp(),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        list: () => safeOp(),
        remove: () => safeOp()
      })
    },
    
    // Realtime
    channel: (name) => ({
      on: () => ({
        subscribe: () => ({})
      })
    }),
    removeChannel: () => {},
    
    // Functions
    functions: {
      invoke: () => safeOp()
    }
  };
};

// Récupération des variables d'environnement avec fallback
const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://sxrofrdhpzpjqkplgoij.supabase.co');
const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww');

// Initialisation du client une seule fois
let supabaseInstance = null;
try {
  if (!supabaseUrl || !supabaseKey) {
    console.error('URL ou clé Supabase non définie, utilisation du client de secours');
    throw new Error('URL ou clé Supabase manquante');
  }
  
  // Création du client avec options sécurisées
  supabaseInstance = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    },
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    }
  });
  
  // Vérification que le client est correctement initialisé
  if (!supabaseInstance || !supabaseInstance.from) {
    throw new Error('Client Supabase mal initialisé');
  }
  
  console.log('Client Supabase initialisé avec succès avec l\'URL:', supabaseUrl);
} catch (e) {
  console.error('Erreur lors de l\'initialisation du client Supabase:', e);
  console.warn('Utilisation du client de secours pour éviter les erreurs fatales');
  supabaseInstance = createFallbackClient();
}

/**
 * Client Supabase amélioré avec méthodes supplémentaires
 */
class EnhancedSupabaseClient {
  constructor(clientInstance) {
    if (!clientInstance) {
      throw new Error('Client Supabase requis pour l\'initialisation');
    }
    this.client = clientInstance;
  }
  
  /**
   * Vérifie si une table existe avant d'exécuter une opération
   * @param {string} tableName - Nom de la table à vérifier
   * @param {Function} operation - Opération à exécuter si la table existe
   * @param {Function} fallback - Opération à exécuter si la table n'existe pas
   * @returns {Promise<any>} - Résultat de l'opération
   */
  async safeOperation(tableName, operation, fallback) {
    try {
      // Vérifier si la table existe
      const { data, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .single();
      
      if (error || !data) {
        console.warn(`La table ${tableName} n'existe pas encore, utilisation du fallback`);
        return fallback ? fallback() : { data: null, error: new Error(`Table ${tableName} non disponible`) };
      }
      
      // La table existe, exécuter l'opération
      return await operation();
    } catch (error) {
      console.error(`Erreur lors de la vérification de la table ${tableName}:`, error);
      return fallback ? fallback() : { data: null, error };
    }
  }
  
  /**
   * Compte le nombre de messages non lus pour un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<number>} - Nombre de messages non lus
   */
  async countUnreadMessages(userId) {
    try {
      const { data, error } = await this.client.rpc('count_unread_messages', { 
        recipient_id: userId,
        conversation_id: null 
      });
      
      if (error) {
        throw error;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des messages:', error);
      return 0;
    }
  }
  
  /**
   * Compte le nombre de messages non lus dans une conversation spécifique
   * @param {string} conversationId - ID de la conversation
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<number>} - Nombre de messages non lus
   */
  async countUnreadMessagesInConversation(conversationId, userId) {
    try {
      const { data, error } = await this.client.rpc('count_unread_messages', { 
        recipient_id: userId,
        conversation_id: conversationId 
      });
      
      if (error) {
        throw error;
      }
      
      return data || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des messages:', error);
      return 0;
    }
  }
  
  /**
   * Vérifie si l'ID fourni correspond à l'utilisateur actuellement connecté
   * @param {string} userId - ID à vérifier
   * @returns {Promise<boolean>} - True si c'est l'utilisateur actuel
   */
  async isCurrentUserId(userId) {
    try {
      const { data: { session } } = await this.client.auth.getSession();
      return session?.user?.id === userId;
    } catch (error) {
      console.error('Erreur lors de la vérification de l\'ID utilisateur:', error);
      return false;
    }
  }
  
  /**
   * Vérifie si un utilisateur est un prestataire
   * @param {string} userId - ID de l'utilisateur à vérifier
   * @returns {Promise<boolean>} - True si l'utilisateur est un prestataire
   */
  async isProvider(userId) {
    try {
      // Vérifier d'abord si c'est l'utilisateur actuel
      let isCurrentUser = false;
      try {
        const { data: { session } } = await this.client.auth.getSession();
        isCurrentUser = session?.user?.id === userId;
      } catch (err) {
        console.warn('Impossible de vérifier si userId correspond à l\'utilisateur connecté:', err);
      }
      
      // Si c'est l'utilisateur actuel, utiliser get_my_provider_status (plus sûr)
      if (isCurrentUser) {
        try {
          const { data: myStatus, error: myStatusError } = await this.client.rpc('get_my_provider_status');
          if (!myStatusError) {
            return myStatus === true;
          }
          console.warn('La fonction RPC get_my_provider_status a échoué:', myStatusError);
        } catch (rpcErr) {
          console.warn('Exception lors de l\'appel RPC get_my_provider_status:', rpcErr);
        }
      }
      
      // Sinon, essayer d'utiliser la méthode RPC is_provider avec l'ID spécifié
      try {
        const { data: rpcCheck, error: rpcError } = await this.client.rpc('is_provider', { user_id: userId });
        if (!rpcError) {
          return rpcCheck === true;
        }
        console.warn('La fonction RPC is_provider a échoué:', rpcError);
      } catch (rpcErr) {
        console.warn('Exception lors de l\'appel RPC is_provider:', rpcErr);
      }
      
      // Méthode de dernier recours : requête directe sur la table profiles
      // ATTENTION: Cette méthode échouera si la politique RLS est restrictive
      console.warn('Utilisation de la méthode de dernier recours (requête directe sur profiles) pour userId:', userId);
      
      const { data, error } = await this.client
        .from('profiles')
        .select('is_provider')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('Erreur lors de la vérification du statut prestataire:', error);
        return false;
      }
      
      return !!data?.is_provider;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut de prestataire:', error);
      return false;
    }
  }
  
  /**
   * Crée ou récupère une conversation entre deux utilisateurs
   * @param {string} userId1 - ID du premier participant
   * @param {string} userId2 - ID du second participant
   * @returns {Promise<Object>} - Conversation créée ou existante
   */
  async getOrCreateConversation(userId1, userId2) {
    try {
      return await this.safeOperation(
        'conversations',
        async () => {
          const { data, error } = await this.client.rpc('get_or_create_conversation', {
            p_client_id: userId1,
            p_provider_external_id: userId2
          });
          
          if (error) {
            throw error;
          }
          
          return { data, error: null };
        },
        () => ({ data: null, error: new Error('La table conversations n\'existe pas encore') })
      );
    } catch (error) {
      console.error('Erreur lors de la création/récupération de la conversation:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Envoie un message dans une conversation
   * @param {string} conversationId - ID de la conversation
   * @param {string} senderId - ID de l'expéditeur
   * @param {string} recipientId - ID du destinataire
   * @param {string} content - Contenu du message
   * @returns {Promise<Object>} - Message créé
   */
  async sendMessage(conversationId, senderId, recipientId, content) {
    try {
      // Vérifier si l'ID est au format UUID ou au format "tg-X"
      const safeId = (id) => {
        if (typeof id === 'string' && (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || id.match(/^tg-\d+$/))) {
          return id;
        }
        console.warn(`ID non valide détecté: ${id}, utilisation d'un ID de secours`);
        return 'fallback-id';
      };
      
      return await this.safeOperation(
        'messages',
        async () => {
          const { data, error } = await this.client
            .from('messages')
            .insert({
              conversation_id: conversationId,
              sender_id: safeId(senderId),
              recipient_id: safeId(recipientId),
              content,
              read: false
            })
            .select()
            .single();
          
          if (error) {
            throw error;
          }
          
          return { data, error: null };
        },
        () => ({ 
          data: null, 
          error: new Error('La table messages n\'existe pas encore ou une erreur est survenue lors de l\'envoi') 
        })
      );
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      return { data: null, error };
    }
  }
  
  /**
   * Récupère les messages d'une conversation
   * @param {string} conversationId - ID de la conversation
   * @param {number} limit - Nombre maximum de messages à récupérer
   * @param {number} offset - Offset pour la pagination
   * @returns {Promise<Object>} - Liste des messages
   */
  async getMessages(conversationId, limit = 50, offset = 0) {
    try {
      return await this.safeOperation(
        'messages',
        async () => {
          const { data, error } = await this.client
            .from('messages')
            .select('*')
            .eq('conversation_id', conversationId)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);
          
          if (error) {
            throw error;
          }
          
          return { data, error: null };
        },
        () => ({ data: [], error: new Error('La table messages n\'existe pas encore') })
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return { data: [], error };
    }
  }
  
  /**
   * Marque les messages comme lus
   * @param {string} conversationId - ID de la conversation
   * @param {string} userId - ID de l'utilisateur qui lit les messages
   * @returns {Promise<Object>} - Résultat de l'opération
   */
  async markMessagesAsRead(conversationId, userId) {
    try {
      return await this.safeOperation(
        'messages',
        async () => {
          return await this.client.rpc('mark_messages_as_read', {
            p_conversation_id: conversationId,
            p_user_id: userId
          });
        },
        () => ({ data: 0, error: null })
      );
    } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus:', error);
      return { data: 0, error };
    }
  }
}

// Création de l'instance améliorée du client Supabase
const enhancedClient = new EnhancedSupabaseClient(supabaseInstance);

// Méthode pour vérifier si les migrations ont été appliquées
enhancedClient.checkMigrationsApplied = async () => {
  try {
    // Vérifier l'existence de tables clés
    const { data, error } = await enhancedClient.client.from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['messages', 'conversations', 'services']);
    
    if (error) {
      console.error('Erreur lors de la vérification des migrations:', error);
      return false;
    }
    
    return data.map(row => row.table_name).every(table => ['messages', 'conversations', 'services'].includes(table));
  } catch (error) {
    console.error('Erreur lors de la vérification des migrations:', error);
    return false;
  }
};

// Méthode pour gérer les ID non-UUID
enhancedClient.handleNonUuidId = (id) => {
  // Vérification si l'ID est au format UUID ou au format "tg-X"
  if (typeof id === 'string' && (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || id.match(/^tg-\d+$/))) {
    return id;
  }
  console.warn(`ID non valide détecté: ${id}, utilisation d'un ID de secours`);
  return 'fallback-id';
};

// Export par défaut du client amélioré
export default enhancedClient;

// Export nommé pour la compatibilité avec le code existant
export { enhancedClient as supabase };
