/**
 * Client Supabase amélioré avec gestion d'erreurs et fonctionnalités avancées
 * Centralise la configuration et améliore l'expérience utilisateur
 */

import { createClient } from '@supabase/supabase-js';
import { safeTableOperation, getErrorMessage } from '../utils/errorHandler';

// Configuration de base
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

// Création du client Supabase de base
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': 'FloService'
    }
  }
});

/**
 * Client Supabase amélioré avec méthodes supplémentaires
 */
class EnhancedSupabaseClient {
  constructor(baseClient) {
    this.client = baseClient;
    
    // Exposer les méthodes de base du client Supabase
    this.auth = this.client.auth;
    this.from = this.client.from;
    this.rpc = this.client.rpc;
    this.storage = this.client.storage;
    this.channel = this.client.channel;
    this.removeChannel = this.client.removeChannel;
  }
  
  /**
   * Effectue une opération sécurisée sur une table avec vérification d'existence
   * @param {string} tableName - Nom de la table
   * @param {Function} operation - Fonction à exécuter si la table existe
   * @param {Function} fallback - Fonction à exécuter si la table n'existe pas
   * @returns {Promise<any>} - Résultat de l'opération ou du fallback
   */
  async safeOperation(tableName, operation, fallback) {
    return safeTableOperation(this.client, tableName, operation, fallback);
  }
  
  /**
   * Récupère le nombre de messages de manière sécurisée
   * @param {string} conversationId - ID de la conversation
   * @returns {Promise<number>} - Nombre de messages ou 0 si erreur
   */
  async getMessageCount(conversationId) {
    try {
      const { data, error } = await this.client.rpc('safe_message_count', { 
        p_conversation_id: conversationId 
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
      const { data, error } = await this.client.rpc('get_user_profile', { 
        user_id: userId 
      });
      
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
      const { data, error } = await this.client.rpc('is_provider', { 
        user_id: userId 
      });
      
      if (error) throw error;
      
      return !!data;
    } catch (error) {
      console.error('Erreur lors de la vérification du statut de prestataire:', error);
      return false;
    }
  }
  
  /**
   * Crée ou récupère une conversation entre deux utilisateurs
   * @param {string} participant1Id - ID du premier participant
   * @param {string} participant2Id - ID du second participant
   * @returns {Promise<Object>} - Conversation créée ou existante
   */
  async getOrCreateConversation(participant1Id, participant2Id) {
    try {
      const { data, error } = await this.client.rpc('get_or_create_conversation', {
        p_participant1_id: participant1Id,
        p_participant2_id: participant2Id
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erreur lors de la création/récupération de la conversation:', error);
      throw new Error(getErrorMessage(error));
    }
  }
  
  /**
   * Envoie un message dans une conversation
   * @param {string} conversationId - ID de la conversation
   * @param {string} recipientId - ID du destinataire
   * @param {string} content - Contenu du message
   * @returns {Promise<Object>} - Message créé
   */
  async sendMessage(conversationId, recipientId, content) {
    try {
      const { data, error } = await this.client.rpc('send_message', {
        p_conversation_id: conversationId,
        p_recipient_id: recipientId,
        p_content: content
      });
      
      if (error) throw error;
      
      return data;
    } catch (error) {
      console.error('Erreur lors de l\'envoi du message:', error);
      throw new Error(getErrorMessage(error));
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
      const { data, error } = await this.client.rpc('get_messages', {
        p_conversation_id: conversationId,
        p_limit: limit,
        p_offset: offset
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des messages:', error);
      throw new Error(getErrorMessage(error));
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
      const { data, error } = await this.client.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: userId
      });
      
      if (error) throw error;
      
      return data || 0;
    } catch (error) {
      console.error('Erreur lors du marquage des messages comme lus:', error);
      return 0;
    }
  }
  
  /**
   * Récupère les conversations d'un utilisateur
   * @param {string} userId - ID de l'utilisateur
   * @param {number} limit - Nombre maximum de conversations à récupérer
   * @param {number} offset - Décalage pour la pagination
   * @returns {Promise<Array>} - Liste des conversations
   */
  async getUserConversations(userId, limit = 20, offset = 0) {
    try {
      const { data, error } = await this.client.rpc('get_user_conversations', {
        p_user_id: userId,
        p_limit: limit,
        p_offset: offset
      });
      
      if (error) throw error;
      
      return data || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des conversations:', error);
      return [];
    }
  }
}

// Créer et exporter l'instance améliorée
const enhancedSupabase = new EnhancedSupabaseClient(supabase);

export default enhancedSupabase;
export { supabase }; // Exporter également le client de base pour la compatibilité
