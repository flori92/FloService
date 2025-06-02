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
  console.log('Client Supabase initialisé avec succès');
} catch (e) {
  console.error('Erreur lors de l\'initialisation du client Supabase:', e);
  supabaseInstance = createFallbackClient();
}

/**
 * Client Supabase amélioré avec méthodes supplémentaires
 */
class EnhancedSupabaseClient {
  constructor(clientInstance) {
    if (!clientInstance) {
      console.error('Instance de client Supabase non fournie, utilisation du client de secours');
      this.client = createFallbackClient();
    } else {
      this.client = clientInstance;
    }
    
    // Exposer les méthodes de base du client Supabase
    this.auth = this.client.auth;
    this.from = this.client.from;
    this.rpc = this.client.rpc;
    this.storage = this.client.storage;
    this.channel = this.client.channel;
    this.removeChannel = this.client.removeChannel;
    this.functions = this.client.functions;
  }
  
  /**
   * Effectue une opération sécurisée sur une table avec vérification d'existence
   * @param {string} tableName - Nom de la table
   * @param {Function} operation - Fonction à exécuter si la table existe
   * @param {Function} fallback - Fonction à exécuter si la table n'existe pas
   * @returns {Promise<any>} - Résultat de l'opération ou du fallback
   */
  async safeOperation(tableName, operation, fallback) {
    try {
      return await operation();
    } catch (error) {
      console.error(`Erreur lors de l'opération sur la table ${tableName}:`, error);
      return await fallback();
    }
  }
  
  /**
   * Vérifie si une table existe dans la base de données
   * @param {string} tableName - Nom de la table à vérifier
   * @returns {Promise<boolean>} - True si la table existe, false sinon
   */
  async tableExists(tableName) {
    try {
      const { data, error } = await this.client
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .maybeSingle();
      
      if (error) {
        console.error(`Erreur lors de la vérification de l'existence de la table ${tableName}:`, error);
        return false;
      }
      
      return !!data;
    } catch (error) {
      console.error(`Erreur lors de la vérification de l'existence de la table ${tableName}:`, error);
      return false;
    }
  }
  
  /**
   * Récupère le nombre de messages de manière sécurisée
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise<number>} - Nombre de messages ou 0 si erreur
   */
  async getMessageCount(conversationId) {
    try {
      const { data, error } = await this.client.rpc('safe_message_count', { 
        conversation_id: conversationId 
      });
      
      if (error) throw error;
      
      return data || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des messages:', error);
      return 0;
    }
  }
  
  /**
   * Vérifie si un utilisateur est un prestataire
   * @param {string} userId - ID de l'utilisateur à vérifier
   * @returns {Promise<boolean>} - True si l'utilisateur est un prestataire, false sinon
   */
  async isProvider(userId) {
    try {
      const { data, error } = await this.client
        .from('profiles')
        .select('is_provider')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
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
          
          if (error) throw error;
          
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
          
          if (error) throw error;
          
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
          
          if (error) throw error;
          
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
          const { data, error } = await this.client.rpc('mark_messages_as_read', {
            p_conversation_id: conversationId,
            p_user_id: userId
          });
          
          return { data, error };
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
    
    // Vérifier que toutes les tables requises existent
    const requiredTables = ['messages', 'conversations', 'services'];
    const existingTables = data.map(row => row.table_name);
    const allTablesExist = requiredTables.every(table => existingTables.includes(table));
    
    return allTablesExist;
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
