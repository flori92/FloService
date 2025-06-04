/**
 * Script pour interagir directement avec l'API Appwrite
 * Contourne les problèmes potentiels avec le SDK
 */

import https from 'https';

// Configuration
const API_ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = '683fd40d003e6f918e3d';
const API_KEY = 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';
const DATABASE_ID = 'database-floservice_db';

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

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
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
 * Vérifie si la base de données existe
 */
async function checkDatabase() {
  try {
    console.log(`Vérification de l'existence de la base de données ${DATABASE_ID}...`);
    const database = await makeRequest('GET', `/databases/${DATABASE_ID}`);
    console.log('Base de données trouvée:', database);
    return database;
  } catch (error) {
    console.error('Erreur lors de la vérification de la base de données:', error);
    return null;
  }
}

/**
 * Liste les collections dans la base de données
 */
async function listCollections() {
  try {
    console.log(`Récupération des collections de la base de données ${DATABASE_ID}...`);
    const collections = await makeRequest('GET', `/databases/${DATABASE_ID}/collections`);
    console.log(`${collections.total} collection(s) trouvée(s):`);
    
    if (collections.collections) {
      collections.collections.forEach((collection, index) => {
        console.log(`${index + 1}. ID: ${collection.$id}, Nom: ${collection.name}`);
      });
    }
    
    return collections;
  } catch (error) {
    console.error('Erreur lors de la récupération des collections:', error);
    return null;
  }
}

/**
 * Crée une collection dans la base de données
 * @param {string} collectionId - ID de la collection
 * @param {string} name - Nom de la collection
 * @param {Array<string>} permissions - Permissions de la collection
 */
async function createCollection(collectionId, name, permissions = ['read("any")', 'create("any")', 'update("any")', 'delete("any")']) {
  try {
    console.log(`Création de la collection ${name}...`);
    const data = {
      collectionId,
      name,
      permissions,
      documentSecurity: false
    };
    
    const collection = await makeRequest('POST', `/databases/${DATABASE_ID}/collections`, data);
    console.log(`Collection ${name} créée avec succès:`, collection);
    return collection;
  } catch (error) {
    console.error(`Erreur lors de la création de la collection ${name}:`, error);
    return null;
  }
}

/**
 * Crée un attribut dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {string} key - Clé de l'attribut
 * @param {string} type - Type de l'attribut
 * @param {boolean} required - Si l'attribut est requis
 * @param {boolean} array - Si l'attribut est un tableau
 * @param {any} defaultValue - Valeur par défaut
 */
async function createAttribute(collectionId, key, type, required = false, array = false, defaultValue = null) {
  try {
    console.log(`Création de l'attribut ${key} dans la collection ${collectionId}...`);
    
    const path = `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/${type}`;
    
    const data = {
      key,
      required,
      array
    };
    
    if (defaultValue !== null) {
      data.default = defaultValue;
    }
    
    const attribute = await makeRequest('POST', path, data);
    console.log(`Attribut ${key} créé avec succès:`, attribute);
    return attribute;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${key}:`, error);
    return null;
  }
}

// Exécution principale
async function main() {
  try {
    // Vérifier si la base de données existe
    const database = await checkDatabase();
    if (!database) {
      console.error('La base de données n\'existe pas ou n\'est pas accessible.');
      process.exit(1);
    }
    
    // Lister les collections existantes
    await listCollections();
    
    // Créer une collection de test
    const profilesCollection = await createCollection('profiles', 'Profiles');
    
    if (profilesCollection) {
      // Créer quelques attributs
      await createAttribute('profiles', 'first_name', 'string');
      await createAttribute('profiles', 'last_name', 'string');
      await createAttribute('profiles', 'email', 'string');
      await createAttribute('profiles', 'is_provider', 'boolean', false, false, false);
    }
    
    console.log('Opération terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'exécution:', error);
    process.exit(1);
  }
}

main();
