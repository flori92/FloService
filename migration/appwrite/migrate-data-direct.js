/**
 * Script de migration des données de Supabase vers Appwrite pour FloService
 * Utilise l'API HTTP directe pour contourner les problèmes du SDK Node.js
 */

import https from 'https';
import fs from 'fs/promises';
import path from 'path';
import pg from 'pg';

// Configuration de la connexion PostgreSQL à Supabase
const pgConfig = {
  connectionString: 'postgresql://postgres:Apollonf@vi92@db.sxrofrdhpzpjqkplgoij.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false } // Nécessaire pour les connexions SSL à Supabase
};

// Création du client PostgreSQL
const pgClient = new pg.Client(pgConfig);

// Vérification de la connexion Supabase
console.log(`Connexion à Supabase PostgreSQL: ${pgConfig.connectionString.split('@')[1].split('/')[0]}`);
console.log('✅ Configuration PostgreSQL prête.');


// Configuration Appwrite
const API_ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '683fd40d003e6f918e3d';
const API_KEY = process.env.APPWRITE_KEY || 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';
const DATABASE_ID = 'floservice_db';

// Vérification de la configuration Appwrite
console.log(`Connexion à Appwrite: https://${API_ENDPOINT}/v1`);
console.log(`Projet Appwrite: ${PROJECT_ID}`);
console.log(`Base de données: ${DATABASE_ID}`);

// Tables à migrer avec leurs collections correspondantes
const TABLES_TO_MIGRATE = [
    { table: 'profiles', collection: 'profiles' },
    { table: 'provider_profiles', collection: 'provider_profiles' },
    { table: 'services', collection: 'services' },
    { table: 'conversations', collection: 'conversations' },
    { table: 'messages', collection: 'messages' },
    { table: 'bookings', collection: 'bookings' },
    { table: 'invoices', collection: 'invoices' }
];

// Dossier pour stocker les données extraites
const EXPORT_DIR = path.join(process.cwd(), 'migration', 'data');

/**
 * Effectue une requête HTTP vers l'API Appwrite
 * @param {string} method - Méthode HTTP (GET, POST, etc.)
 * @param {string} path - Chemin de l'API
 * @param {object} [data] - Données à envoyer (pour POST, PUT, etc.)
 * @returns {Promise<object>} - Réponse de l'API
 */
function makeRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: API_ENDPOINT,
      port: 443,
      path: `/v1${path}`,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': PROJECT_ID,
        'X-Appwrite-Key': API_KEY
      }
    };

    console.log(`Envoi d'une requête ${method} à ${options.hostname}${options.path}`);

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        console.log(`Statut de la réponse: ${res.statusCode}`);
        
        try {
          const parsedData = JSON.parse(responseData);
          
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsedData);
          } else {
            reject({
              statusCode: res.statusCode,
              data: parsedData
            });
          }
        } catch (error) {
          if (responseData.trim() === '') {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ success: true, statusCode: res.statusCode });
            } else {
              reject({
                statusCode: res.statusCode,
                error: 'Empty response'
              });
            }
          } else {
            reject({
              statusCode: res.statusCode,
              error: 'Invalid JSON response',
              data: responseData
            });
          }
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

/**
 * Crée le dossier d'export si nécessaire
 */
async function setupExportDir() {
  try {
    await fs.mkdir(EXPORT_DIR, { recursive: true });
    console.log(`Dossier d'export créé: ${EXPORT_DIR}`);
  } catch (error) {
    console.error(`Erreur lors de la création du dossier d'export:`, error);
    throw error;
  }
}

/**
 * Connecte le client PostgreSQL à Supabase
 * @returns {Promise<void>}
 */
async function connectToPostgres() {
  try {
    await pgClient.connect();
    console.log('✅ Connecté à la base de données PostgreSQL Supabase.');
  } catch (error) {
    console.error('❌ Erreur de connexion à PostgreSQL:', error);
    throw error;
  }
}

/**
 * Ferme la connexion PostgreSQL
 * @returns {Promise<void>}
 */
async function closePostgresConnection() {
  try {
    await pgClient.end();
    console.log('✅ Connexion PostgreSQL fermée.');
  } catch (error) {
    console.error('❌ Erreur lors de la fermeture de la connexion PostgreSQL:', error);
  }
}

/**
 * Extrait les données d'une table Supabase via PostgreSQL et les sauvegarde dans un fichier JSON
 * @param {string} table - Nom de la table
 * @returns {Promise<Array>} - Données extraites
 */
async function extractDataFromSupabase(table) {
  console.log(`Extraction des données de la table ${table}...`);
  
  try {
    // Construire la requête SQL pour sélectionner toutes les données de la table
    const query = `SELECT * FROM ${table}`;
    
    // Exécuter la requête
    const result = await pgClient.query(query);
    const data = result.rows;
    
    console.log(`✅ ${data.length} enregistrements extraits de la table ${table}.`);
    
    // Sauvegarder les données dans un fichier JSON
    const filePath = path.join(EXPORT_DIR, `${table}.json`);
    await fs.writeFile(filePath, JSON.stringify(data, null, 2));
    console.log(`✅ Données de ${table} sauvegardées dans ${filePath}`);
    
    return data;
  } catch (error) {
    console.error(`❌ Erreur lors de l'extraction des données de ${table}:`, error);
    return [];
  }
}

/**
 * Vérifie si une collection existe dans Appwrite
 * @param {string} collectionId - ID de la collection à vérifier
 * @returns {Promise<boolean>} - True si la collection existe
 */
async function checkCollectionExists(collectionId) {
  try {
    await makeRequest('GET', `/databases/${DATABASE_ID}/collections/${collectionId}`);
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Vérifie toutes les collections nécessaires avant la migration
 * @returns {Promise<boolean>} - True si toutes les collections existent
 */
async function verifyCollections() {
  console.log('Vérification des collections Appwrite...');
  
  const missingCollections = [];
  
  for (const { collection } of TABLES_TO_MIGRATE) {
    try {
      const exists = await checkCollectionExists(collection);
      if (!exists) {
        missingCollections.push(collection);
      } else {
        console.log(`✅ Collection ${collection} trouvée.`);
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de la collection ${collection}:`, error);
      missingCollections.push(collection);
    }
  }
  
  if (missingCollections.length > 0) {
    console.error(`❌ Collections manquantes: ${missingCollections.join(', ')}`);
    console.error('Exécutez d\'abord le script create-collections-direct.js pour créer ces collections.');
    return false;
  }
  
  console.log('✅ Toutes les collections nécessaires existent.');
  return true;
}

// Définition des champs autorisés pour chaque collection Appwrite
const ALLOWED_FIELDS = {
  profiles: [
    'id', 'first_name', 'last_name', 'avatar_url', 'email', 'phone', 
    'is_provider', 'is_admin', 'created_at', 'updated_at', 'last_seen'
  ],
  provider_profiles: [
    'id', 'user_id', 'category_id', 'title', 'description', 'hourly_rate',
    'years_experience', 'is_available', 'created_at', 'updated_at'
  ],
  services: [
    'id', 'provider_id', 'title', 'description', 'price', 'duration',
    'category_id', 'image_url', 'created_at', 'updated_at'
  ],
  conversations: [
    'id', 'client_id', 'provider_id', 'last_message', 'created_at', 'updated_at'
  ],
  messages: [
    'id', 'conversation_id', 'sender_id', 'recipient_id', 'content',
    'read', 'created_at', 'updated_at'
  ],
  bookings: [
    'id', 'client_id', 'service_id', 'start_time', 'end_time',
    'status', 'notes', 'created_at', 'updated_at'
  ],
  invoices: [
    'id', 'booking_id', 'client_id', 'provider_id', 'amount',
    'status', 'payment_id', 'pdf_url', 'created_at', 'updated_at'
  ]
};

/**
 * Mappe les données de Supabase vers la structure Appwrite
 * @param {string} collection - Nom de la collection
 * @param {object} data - Données à mapper
 * @returns {object} - Données mappées
 */
function mapDataToAppwriteSchema(collection, data) {
  // Clone des données pour éviter de modifier l'original
  const mappedData = {};
  
  // Récupérer la liste des champs autorisés pour cette collection
  const allowedFields = ALLOWED_FIELDS[collection] || [];
  
  // Ne conserver que les champs autorisés
  for (const field of allowedFields) {
    if (field === 'id') {
      mappedData.id = data.id;
    } else if (data[field] !== undefined) {
      mappedData[field] = data[field];
    }
  }
  
  // Transformations spécifiques par collection
  switch (collection) {
    case 'profiles':
      // Mapper le nom complet en prénom et nom si nécessaire
      if (data.full_name && (!mappedData.first_name || !mappedData.last_name)) {
        const nameParts = data.full_name.split(' ');
        mappedData.first_name = mappedData.first_name || nameParts[0] || '';
        mappedData.last_name = mappedData.last_name || (nameParts.length > 1 ? nameParts.slice(1).join(' ') : '');
      }
      
      // S'assurer que les booléens sont bien des booléens
      if ('is_provider' in data) {
        mappedData.is_provider = Boolean(data.is_provider);
      }
      if ('is_admin' in data) {
        mappedData.is_admin = Boolean(data.is_admin);
      }
      break;
      
    case 'provider_profiles':
      // Convertir les tableaux en chaînes JSON
      if (data.skills && Array.isArray(data.skills)) {
        mappedData.skills = JSON.stringify(data.skills);
      }
      break;
      
    case 'services':
      // Convertir les tableaux en chaînes JSON
      if (data.tags && Array.isArray(data.tags)) {
        mappedData.tags = JSON.stringify(data.tags);
      }
      break;
  }
  
  console.log(`Données mappées pour ${collection}:`, mappedData);
  return mappedData;
}

/**
 * Importe les données dans une collection Appwrite
 * @param {string} collection - Nom de la collection
 * @param {Array} data - Données à importer
 */
async function importDataToAppwrite(collection, data) {
  console.log(`Importation des données dans la collection ${collection}...`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const item of data) {
    try {
      // Préserver l'ID d'origine
      const { id } = item;
      
      // Mapper les données selon le schéma Appwrite
      const mappedData = mapDataToAppwriteSchema(collection, item);
      const { id: removedId, ...documentData } = mappedData;
      
      // Créer le document dans Appwrite via l'API directe
      await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collection}/documents`, {
        documentId: id,
        data: documentData
      });
      
      successCount++;
      
      // Afficher la progression
      if (successCount % 10 === 0 || successCount === data.length) {
        console.log(`${successCount}/${data.length} documents importés dans ${collection}`);
      }
      
      // Attendre un peu entre chaque requête pour éviter les problèmes de rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      errorCount++;
      console.error(`Erreur lors de l'importation du document dans ${collection}:`, error);
    }
  }
  
  console.log(`Importation terminée pour ${collection}:`);
  console.log(`- ${successCount}/${data.length} documents importés avec succès`);
  console.log(`- ${errorCount}/${data.length} documents en erreur`);
}

/**
 * Exécute la migration complète
 */
async function runMigration() {
  try {
    console.log('===== Début de la migration Supabase vers Appwrite =====');
    console.log(`Date: ${new Date().toLocaleString()}`);
    
    // Connexion à PostgreSQL
    await connectToPostgres();
    
    // Vérifier les collections Appwrite
    const collectionsOk = await verifyCollections();
    if (!collectionsOk) {
      console.error('❌ Vérification des collections échouée. Migration annulée.');
      await closePostgresConnection();
      process.exit(1);
    }
    
    // Créer le dossier d'export
    await setupExportDir();
    
    // Migrer chaque table
    console.log('\n===== Début de la migration des données =====');
    for (const { table, collection } of TABLES_TO_MIGRATE) {
      console.log(`\n----- Migration de ${table} vers ${collection} -----`);
      
      // Extraire les données de Supabase via PostgreSQL
      const data = await extractDataFromSupabase(table);
      
      if (data.length > 0) {
        // Importer les données dans Appwrite
        await importDataToAppwrite(collection, data);
      } else {
        console.warn(`⚠️ Aucune donnée à migrer pour ${table}`);
      }
      
      console.log(`----- Fin de la migration de ${table} -----`);
    }
    
    // Fermer la connexion PostgreSQL
    await closePostgresConnection();
    
    console.log('\n===== Migration terminée avec succès! =====');
  } catch (error) {
    console.error('\n❌ Erreur lors de la migration:', error);
    
    // Fermer la connexion PostgreSQL en cas d'erreur
    try {
      await closePostgresConnection();
    } catch (e) {
      // Ignorer les erreurs de fermeture de connexion
    }
    
    process.exit(1);
  }
}

// Exécuter la migration
runMigration();
