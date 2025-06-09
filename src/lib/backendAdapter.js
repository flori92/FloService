/**
 * Adaptateur pour les backends Supabase et Appwrite
 * 
 * Ce fichier fournit une interface unifiée pour interagir avec le backend,
 * qu'il s'agisse de Supabase ou d'Appwrite.
 */

import { backendConfig } from '../config/backendConfig';
import { supabase } from './supabase-secure';

// Classe d'adaptateur qui fournit une interface unifiée
class BackendAdapter {
  constructor() {
    this.provider = backendConfig.provider;
    this.isSupabase = true;
    this.client = supabase;
    this.collections = {
      PROFILES: 'profiles',
      PROVIDER_PROFILES: 'provider_profiles',
      SERVICES: 'services',
      CONVERSATIONS: 'conversations',
      MESSAGES: 'messages',
      BOOKINGS: 'bookings',
      INVOICES: 'invoices'
    };
  }
  
  /**
   * Authentification avec email et mot de passe
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @returns {Promise<object>} - Données de session
   */
  async signIn(email, password) {
    if (this.isAppwrite) {
      return await this.client.signIn(email, password);
    } else {
      const { data, error } = await this.client.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Inscription avec email et mot de passe
   * @param {string} email - Email de l'utilisateur
   * @param {string} password - Mot de passe de l'utilisateur
   * @param {string} name - Nom de l'utilisateur
   * @returns {Promise<object>} - Données utilisateur
   */
  async signUp(email, password, name) {
    if (this.isAppwrite) {
      return await this.client.signUp(email, password, name);
    } else {
      const { data, error } = await this.client.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });
      
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Déconnexion de l'utilisateur
   * @returns {Promise<void>}
   */
  async signOut() {
    if (this.isAppwrite) {
      return await this.client.signOut();
    } else {
      const { error } = await this.client.auth.signOut();
      if (error) throw error;
    }
  }
  
  /**
   * Récupère l'utilisateur actuellement connecté
   * @returns {Promise<object|null>} - Données utilisateur ou null
   */
  async getCurrentUser() {
    if (this.isAppwrite) {
      return await this.client.getCurrentUser();
    } else {
      const { data, error } = await this.client.auth.getUser();
      if (error) return null;
      return data.user;
    }
  }
  
  /**
   * Crée un document dans une collection
   * @param {string} collection - Nom de la collection
   * @param {object} data - Données à insérer
   * @param {string} [id] - ID du document (optionnel)
   * @returns {Promise<object>} - Document créé
   */
  async create(collection, data, id = null) {
    if (this.isAppwrite) {
      return await this.client.create(collection, data, id);
    } else {
      const { data: result, error } = await this.client
        .from(collection)
        .insert(data)
        .select()
        .single();
        
      if (error) throw error;
      return result;
    }
  }
  
  /**
   * Récupère un document par son ID
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @returns {Promise<object>} - Document récupéré
   */
  async getById(collection, id) {
    if (this.isAppwrite) {
      return await this.client.getById(collection, id);
    } else {
      const { data, error } = await this.client
        .from(collection)
        .select('*')
        .eq('id', id)
        .single();
        
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Met à jour un document
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @param {object} data - Données à mettre à jour
   * @returns {Promise<object>} - Document mis à jour
   */
  async update(collection, id, data) {
    if (this.isAppwrite) {
      return await this.client.update(collection, id, data);
    } else {
      const { data: result, error } = await this.client
        .from(collection)
        .update(data)
        .eq('id', id)
        .select()
        .single();
        
      if (error) throw error;
      return result;
    }
  }
  
  /**
   * Supprime un document
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    if (this.isAppwrite) {
      return await this.client.delete(collection, id);
    } else {
      const { error } = await this.client
        .from(collection)
        .delete()
        .eq('id', id);
        
      if (error) throw error;
    }
  }
  
  /**
   * Récupère des documents avec filtrage
   * @param {string} collection - Nom de la collection
   * @param {object} options - Options de filtrage
   * @returns {Promise<Array>} - Documents récupérés
   */
  async query(collection, options = {}) {
    if (this.isAppwrite) {
      const result = await this.client.query(collection, options);
      return result.documents || [];
    } else {
      let query = this.client.from(collection).select('*');
      
      // Appliquer les filtres
      if (options.filters) {
        options.filters.forEach(filter => {
          // Convertir les filtres Appwrite en filtres Supabase
          // Exemple: Query.equal('field', 'value') => query.eq('field', 'value')
          const filterStr = filter.toString();
          const match = filterStr.match(/(\w+)\s*([=!<>]+)\s*(.+)/);
          
          if (match) {
            const [, field, operator, value] = match;
            
            switch (operator) {
              case '=':
                query = query.eq(field, value);
                break;
              case '!=':
                query = query.neq(field, value);
                break;
              case '>':
                query = query.gt(field, value);
                break;
              case '>=':
                query = query.gte(field, value);
                break;
              case '<':
                query = query.lt(field, value);
                break;
              case '<=':
                query = query.lte(field, value);
                break;
              default:
                query = query.eq(field, value);
            }
          }
        });
      }
      
      // Appliquer la limite
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      // Appliquer l'offset
      if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
      }
      
      // Appliquer le tri
      if (options.orderBy && options.orderBy.length > 0) {
        options.orderBy.forEach(order => {
          const orderStr = order.toString();
          const isAsc = !orderStr.includes('DESC');
          const field = orderStr.replace(/ASC|DESC/i, '').trim();
          
          query = query.order(field, { ascending: isAsc });
        });
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    }
  }
  
  /**
   * Upload un fichier
   * @param {string} bucketId - ID du bucket
   * @param {File} file - Fichier à uploader
   * @param {string} [path] - Chemin du fichier (optionnel)
   * @returns {Promise<object>} - Fichier uploadé
   */
  async uploadFile(bucketId, file, path = null) {
    if (this.isAppwrite) {
      return await this.client.uploadFile(bucketId, file, path);
    } else {
      const { data, error } = await this.client.storage
        .from(bucketId)
        .upload(path || `${Date.now()}_${file.name}`, file);
        
      if (error) throw error;
      return data;
    }
  }
  
  /**
   * Récupère l'URL d'un fichier
   * @param {string} bucketId - ID du bucket
   * @param {string} fileId - ID du fichier
   * @returns {string} - URL du fichier
   */
  getFileUrl(bucketId, fileId) {
    if (this.isAppwrite) {
      return this.client.getFileUrl(bucketId, fileId);
    } else {
      return this.client.storage
        .from(bucketId)
        .getPublicUrl(fileId)
        .data
        .publicUrl;
    }
  }
  
  /**
   * S'abonne aux changements d'une collection
   * @param {string} collection - Nom de la collection
   * @param {Function} callback - Fonction de callback
   * @returns {Function} - Fonction pour se désabonner
   */
  subscribeToCollection(collection, callback) {
    if (this.isAppwrite) {
      return this.client.subscribeToCollection(collection, callback);
    } else {
      const channel = this.client
        .channel(`public:${collection}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: collection 
        }, payload => {
          callback(payload);
        })
        .subscribe();
        
      return () => {
        this.client.removeChannel(channel);
      };
    }
  }
}

// Créer et exporter une instance de l'adaptateur
const backendAdapter = new BackendAdapter();
export default backendAdapter;