/**
 * Client Supabase amélioré avec gestion d'erreurs et fonctionnalités avancées
 * Centralise la configuration et améliore l'expérience utilisateur
 */

// import { createClient } from '@supabase/supabase-js'; // Supprimé car nous utilisons l'instance de supabase-secure
import { supabase as baseSupabaseClient } from './supabase-secure';
import { safeTableOperation, getErrorMessage } from '../utils/errorHandler';

// Configuration de base
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// La création du client Supabase de base est maintenant gérée dans supabase-secure.ts

/**
 * Client Supabase amélioré avec méthodes supplémentaires
 */
class EnhancedSupabaseClient {
  constructor(clientInstance) {
    this.client = clientInstance; // Utilise l'instance fournie
    
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

// Créer et exporter l'instance améliorée
if (!baseSupabaseClient) {
  console.error("ERREUR CRITIQUE: baseSupabaseClient (depuis supabase-secure.ts) est undefined lors de l'initialisation de EnhancedSupabaseClient. Vérifiez l'ordre d'importation/exécution des modules.");
  throw new Error("Échec de l'initialisation du client Supabase de base.");
}
const enhancedSupabase = new EnhancedSupabaseClient(baseSupabaseClient);

export default enhancedSupabase;
export { baseSupabaseClient as supabase }; // Exporter également le client de base pour la compatibilité