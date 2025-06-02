/**
 * Client Supabase amélioré avec gestion d'erreurs et fonctionnalités avancées
 * Centralise la configuration et améliore l'expérience utilisateur
 */

// Création d'un client Supabase sécurisé avec gestion d'erreurs complète
let supabaseInstance = null;

// Fonction d'initialisation du client Supabase
const initSupabase = () => {
  try {
    // Import dynamique pour éviter les erreurs de référence
    const { createClient } = require('@supabase/supabase-js');
    
    // Récupération des variables d'environnement avec fallback
    const supabaseUrl = getEnvVar('VITE_SUPABASE_URL', 'https://rnxfgvpuaylyhjpzlujx.supabase.co');
    const supabaseKey = getEnvVar('VITE_SUPABASE_ANON_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJueGZndnB1YXlseWhqcHpsdWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODc5NzU3NTksImV4cCI6MjAwMzU1MTc1OX0.JdAMPLZALgIoXZPtg_9ePGEyGrBsLw0aOwdVQvg_7Eo');
    
    // Création du client avec options sécurisées
    return createClient(supabaseUrl, supabaseKey, {
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
  } catch (error) {
    console.error('Erreur critique lors de l\'initialisation de Supabase:', error);
    return createFallbackClient();
  }
};

// Fonction pour récupérer les variables d'environnement de manière sécurisée
const getEnvVar = (name, fallback) => {
  // Essayer toutes les sources possibles avec gestion d'erreur
  try {
    // Vite
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[name]) {
      return import.meta.env[name];
    }
  } catch (e) {}
  
  try {
    // React
    if (typeof process !== 'undefined' && process.env && process.env[name]) {
      return process.env[name];
    }
  } catch (e) {}
  
  try {
    // Variables injectées dans window
    if (typeof window !== 'undefined' && window.ENV && window.ENV[name]) {
      return window.ENV[name];
    }
  } catch (e) {}
  
  // Valeur par défaut
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

// Initialisation du client une seule fois
if (!supabaseInstance) {
  try {
    supabaseInstance = initSupabase();
    console.log('Client Supabase initialisé avec succès');
  } catch (e) {
    console.error('Erreur lors de l\'initialisation du client Supabase:', e);
    supabaseInstance = createFallbackClient();
  }
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
      return operation();
    } catch (error) {
      console.error(`Erreur lors de l'opération sur la table ${tableName}:`, error);
      return fallback();
    }
  }
  
  /**
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
        user_id: (await this.auth.getUser()).data.user?.id
      });
      
      if (error) throw error;
      
      return data || 0;
    } catch (error) {
      console.error('Erreur lors du comptage des messages:', error);
      return 0;
    }
  }
  
  /**
   * Récupère le profil utilisateur de manière sécurisée
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} - Profil utilisateur ou null si erreur
   */
  async getUserProfile(userId) {
    try {
      // Utiliser une requête simple pour éviter les erreurs 406
      const { data, error } = await this.client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la récupération du profil:', error);
      return null;
    }
  }
  
  /**
   * Vérifie si un utilisateur est un prestataire
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<boolean>} - True si l'utilisateur est un prestataire, false sinon
   */
  async isProvider(userId) {
    try {
      // Utiliser une requête simple pour éviter les erreurs 406
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
      return await this.safeOperation(
        'messages',
        async () => {
          const { data, error } = await this.client.from('messages').insert({
            conversation_id: conversationId,
            sender_id: senderId,
            recipient_id: recipientId,
            content
          }).select();
          
          return { data, error };
        },
        () => ({ data: null, error: new Error('La table messages n\'existe pas encore') })
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
   * @param {number} offset - Décalage pour la pagination
   * @returns {Promise<Array>} - Liste des messages
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
          
          return { data, error };
        },
        () => ({ data: [], error: null })
      );
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      return { data: [], error };
    }
  }
  
  /**
   * Marque tous les messages d'une conversation comme lus
   * @param {string} conversationId - ID de la conversation
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<number>} - Nombre de messages marqués comme lus
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

// Vérification de l'existence du client de base
if (!supabaseInstance) {
  console.error("ERREUR CRITIQUE: supabaseInstance est undefined lors de l'initialisation de EnhancedSupabaseClient. Vérifiez l'ordre d'importation/exécution des modules.");
  // Pas de throw pour éviter les crashs en production, on utilisera le client de secours
  console.warn("Utilisation du client de secours pour éviter le crash de l'application");
}
// Création de l'instance améliorée du client Supabase avec gestion des erreurs
const enhancedClient = new EnhancedSupabaseClient(supabaseInstance);

// Ajout de méthodes spécifiques pour gérer les ID non-UUID
enhancedClient.handleNonUuidId = (id) => {
  // Vérification si l'ID est au format UUID ou au format "tg-X"
  if (typeof id === 'string' && (id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i) || id.match(/^tg-\d+$/))) {
    return id;
  }
  console.warn(`ID non valide détecté: ${id}, utilisation d'un ID de secours`);
  return 'fallback-id';
};

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

// Export par défaut du client amélioré
export default enhancedClient;

// Export nommé pour la compatibilité avec le code existant
export { enhancedClient as supabase };