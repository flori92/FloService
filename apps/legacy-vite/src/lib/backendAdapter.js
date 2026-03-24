/**
 * Backend adapter for Supabase
 * Provides a unified interface for interacting with the Supabase backend.
 * Cleaned: removed all dead Appwrite code paths.
 */

import { supabase } from './supabase-secure';

// Collection name constants — single source of truth
export const COLLECTIONS = {
  PROFILES: 'profiles',
  PROVIDER_PROFILES: 'provider_profiles',
  SERVICES: 'services',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  BOOKINGS: 'bookings',
  INVOICES: 'invoices',
};

class BackendAdapter {
  constructor() {
    this.provider = 'supabase';
    this.isSupabase = true;
    this.client = supabase;
    this.collections = COLLECTIONS;
  }

  /**
   * Sign in with email and password
   * @param {string} email
   * @param {string} password
   * @returns {Promise<object>} Session data
   */
  async signIn(email, password) {
    const { data, error } = await this.client.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Sign up with email and password
   * @param {string} email
   * @param {string} password
   * @param {string} name
   * @returns {Promise<object>} User data
   */
  async signUp(email, password, name) {
    console.log('[BackendAdapter] SignUp attempt with:', { email, nameProvided: !!name });
    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          nom: name,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error('[BackendAdapter] SignUp error:', error);
      throw error;
    }
    console.log('[BackendAdapter] SignUp success:', data);
    return data;
  }

  /**
   * Sign in with Google OAuth
   * @returns {Promise<object>} Session data
   */
  async signInWithGoogle() {
    console.log('[BackendAdapter] Tentative de connexion Google OAuth');
    const { data, error } = await this.client.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      console.error('[BackendAdapter] Google Auth error:', error);
      throw error;
    }
    console.log('[BackendAdapter] Google Auth initiated');
    return data;
  }

  /**
   * Sign out
   * @returns {Promise<void>}
   */
  async signOut() {
    const { error } = await this.client.auth.signOut();
    if (error) throw error;
  }

  /**
   * Get currently signed-in user
   * @returns {Promise<object|null>}
   */
  async getCurrentUser() {
    const { data, error } = await this.client.auth.getUser();
    if (error) return null;
    return data.user;
  }

  /**
   * Create a document in a collection
   * @param {string} collection - Table name
   * @param {object} data - Data to insert
   * @returns {Promise<object>} Created document
   */
  async create(collection, data) {
    const { data: result, error } = await this.client
      .from(collection)
      .insert(data)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  /**
   * Get a document by its ID
   * @param {string} collection - Table name
   * @param {string} id - Document ID
   * @returns {Promise<object>}
   */
  async getById(collection, id) {
    const { data, error } = await this.client
      .from(collection)
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Update a document
   * @param {string} collection - Table name
   * @param {string} id - Document ID
   * @param {object} data - Data to update
   * @returns {Promise<object>}
   */
  async update(collection, id, data) {
    const { data: result, error } = await this.client
      .from(collection)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return result;
  }

  /**
   * Delete a document
   * @param {string} collection - Table name
   * @param {string} id - Document ID
   * @returns {Promise<void>}
   */
  async delete(collection, id) {
    const { error } = await this.client
      .from(collection)
      .delete()
      .eq('id', id);
    if (error) throw error;
  }

  /**
   * Query documents with filtering, ordering and pagination
   * @param {string} collection - Table name
   * @param {object} options - Query options
   * @returns {Promise<Array>}
   */
  async query(collection, options = {}) {
    let query = this.client.from(collection).select('*');

    // Apply filters
    if (options.filters) {
      options.filters.forEach((filter) => {
        if (filter.field && filter.operator && filter.value !== undefined) {
          // Structured filter object: { field, operator, value }
          switch (filter.operator) {
            case '=':
              query = query.eq(filter.field, filter.value);
              break;
            case '!=':
              query = query.neq(filter.field, filter.value);
              break;
            case '>':
              query = query.gt(filter.field, filter.value);
              break;
            case '>=':
              query = query.gte(filter.field, filter.value);
              break;
            case '<':
              query = query.lt(filter.field, filter.value);
              break;
            case '<=':
              query = query.lte(filter.field, filter.value);
              break;
            default:
              query = query.eq(filter.field, filter.value);
          }
        }
      });
    }

    // Apply limit
    if (options.limit) {
      query = query.limit(options.limit);
    }

    // Apply offset
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    // Apply ordering
    if (options.orderBy && options.orderBy.length > 0) {
      options.orderBy.forEach((order) => {
        if (typeof order === 'string') {
          const isDesc = order.toUpperCase().startsWith('DESC');
          const field = order.replace(/^(ASC|DESC)\s*\(?\s*/i, '').replace(/\)\s*$/i, '').trim();
          query = query.order(field, { ascending: !isDesc });
        }
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Upload a file
   * @param {string} bucketId - Storage bucket ID
   * @param {File} file - File to upload
   * @param {string} [path] - File path (optional)
   * @returns {Promise<object>}
   */
  async uploadFile(bucketId, file, path = null) {
    const { data, error } = await this.client.storage
      .from(bucketId)
      .upload(path || `${Date.now()}_${file.name}`, file);
    if (error) throw error;
    return data;
  }

  /**
   * Get a file's public URL
   * @param {string} bucketId - Storage bucket ID
   * @param {string} fileId - File path/ID
   * @returns {string}
   */
  getFileUrl(bucketId, fileId) {
    return this.client.storage
      .from(bucketId)
      .getPublicUrl(fileId)
      .data.publicUrl;
  }

  /**
   * Subscribe to real-time changes on a collection
   * @param {string} collection - Table name
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribeToCollection(collection, callback) {
    const channel = this.client
      .channel(`public:${collection}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: collection },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    return () => {
      this.client.removeChannel(channel);
    };
  }
}

// Create and export a singleton instance
const backendAdapter = new BackendAdapter();
export default backendAdapter;