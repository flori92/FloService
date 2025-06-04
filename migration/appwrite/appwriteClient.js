/**
 * Client Appwrite pour FloService
 * Ce fichier remplace supabaseClient.js et fournit des fonctions utilitaires
 * pour faciliter la migration depuis Supabase
 */

import { Client, Account, Databases, Storage, Functions, Avatars, ID, Query } from 'appwrite';

/**
 * Récupère une variable d'environnement avec fallback
 * @param {string} key - Clé de la variable d'environnement
 * @param {any} fallback - Valeur par défaut si la variable n'existe pas
 * @returns {any} - Valeur de la variable d'environnement ou fallback
 */
const getEnvVar = (key, fallback) => {
  try {
    // Vérifier si import.meta.env est disponible (Vite)
    if (import.meta && import.meta.env) {
      const value = import.meta.env[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    
    // Vérifier si process.env est disponible (Node.js)
    if (typeof process !== 'undefined' && process.env) {
      const value = process.env[key];
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
  } catch (error) {
    console.error(`Erreur lors de la récupération de la variable d'environnement ${key}:`, error);
  }
  
  return fallback;
};

// Configuration du client Appwrite
const appwriteEndpoint = getEnvVar('VITE_APPWRITE_ENDPOINT', 'https://fra.cloud.appwrite.io/v1');
const appwriteProjectId = getEnvVar('VITE_APPWRITE_PROJECT_ID', '683fd40d003e6f918e3d');
const databaseId = getEnvVar('VITE_APPWRITE_DATABASE_ID', 'floservice_db');

// Initialisation du client
const client = new Client();

// Configuration du client
client
  .setEndpoint(appwriteEndpoint)
  .setProject(appwriteProjectId);

// Initialisation des services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);
const functions = new Functions(client);
const avatars = new Avatars(client);

/**
 * Mappings des collections Appwrite aux tables Supabase
 */
const COLLECTIONS = {
  PROFILES: 'profiles',
  PROVIDER_PROFILES: 'provider_profiles',
  SERVICES: 'services',
  CONVERSATIONS: 'conversations',
  MESSAGES: 'messages',
  BOOKINGS: 'bookings',
  INVOICES: 'invoices'
};

/**
 * Création d'un client de secours qui ne génère pas d'erreur
 * Similaire à l'approche utilisée dans supabaseClient.js
 */
const createFallbackClient = () => {
  // Fonction de base pour les opérations
  const safeOp = () => Promise.resolve({
    data: null,
    error: { message: 'Client Appwrite non disponible', code: 'APPWRITE_UNAVAILABLE' }
  });
  
  return {
    account: {
      get: () => safeOp(),
      create: () => safeOp(),
      createEmailSession: () => safeOp(),
      deleteSession: () => safeOp()
    },
    databases: {
      getDocument: () => safeOp(),
      listDocuments: () => safeOp(),
      createDocument: () => safeOp(),
      updateDocument: () => safeOp(),
      deleteDocument: () => safeOp()
    },
    storage: {
      createFile: () => safeOp(),
      getFileView: () => safeOp(),
      deleteFile: () => safeOp(),
      listFiles: () => safeOp()
    }
  };
};

// Initialisation du client une seule fois
let appwriteInstance = null;
try {
  if (!appwriteEndpoint || !appwriteProjectId) {
    console.error('Endpoint ou ID de projet Appwrite non défini, utilisation du client de secours');
    throw new Error('Endpoint ou ID de projet Appwrite manquant');
  }
  
  // Création du client avec options sécurisées
  appwriteInstance = {
    client,
    account,
    databases,
    storage,
    functions,
    databaseId,
    COLLECTIONS
  };
} catch (error) {
  console.error('Erreur lors de l\'initialisation du client Appwrite:', error);
  appwriteInstance = createFallbackClient();
}

// Exportation du client
const appwrite = appwriteInstance;
export { appwrite, client, ID, databaseId };

// Fonctions utilitaires pour simplifier les opérations courantes
export const appwriteUtils = {
  /**
   * Récupère un document par son ID
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @returns {Promise} - Document ou erreur
   */
  async getDocument(collection, id) {
    try {
      return await databases.getDocument(databaseId, collection, id);
    } catch (error) {
      console.error(`Erreur lors de la récupération du document ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Liste les documents d'une collection avec filtres optionnels
   * @param {string} collection - Nom de la collection
   * @param {Array} queries - Filtres de requête (optionnel)
   * @returns {Promise} - Liste de documents ou erreur
   */
  async listDocuments(collection, queries = []) {
    try {
      return await databases.listDocuments(databaseId, collection, queries);
    } catch (error) {
      console.error(`Erreur lors de la récupération des documents de ${collection}:`, error);
      throw error;
    }
  },
  
  /**
   * Crée un nouveau document
   * @param {string} collection - Nom de la collection
   * @param {object} data - Données du document
   * @param {string} id - ID personnalisé (optionnel)
   * @returns {Promise} - Document créé ou erreur
   */
  async createDocument(collection, data, id = ID.unique()) {
    try {
      // Ajouter les timestamps
      const documentData = {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      return await databases.createDocument(databaseId, collection, id, documentData);
    } catch (error) {
      console.error(`Erreur lors de la création du document dans ${collection}:`, error);
      throw error;
    }
  },
  
  /**
   * Met à jour un document existant
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @param {object} data - Données à mettre à jour
   * @returns {Promise} - Document mis à jour ou erreur
   */
  async updateDocument(collection, id, data) {
    try {
      // Ajouter le timestamp de mise à jour
      const documentData = {
        ...data,
        updated_at: new Date().toISOString()
      };
      
      return await databases.updateDocument(databaseId, collection, id, documentData);
    } catch (error) {
      console.error(`Erreur lors de la mise à jour du document ${id}:`, error);
      throw error;
    }
  },
  
  /**
   * Supprime un document
   * @param {string} collection - Nom de la collection
   * @param {string} id - ID du document
   * @returns {Promise} - Résultat de la suppression ou erreur
   */
  async deleteDocument(collection, id) {
    try {
      return await databases.deleteDocument(databaseId, collection, id);
    } catch (error) {
      console.error(`Erreur lors de la suppression du document ${id}:`, error);
      throw error;
    }
  }
};

export default appwrite;
