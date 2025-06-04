/**
 * Script pour créer les collections Appwrite via l'API directe
 * Contourne les problèmes du SDK Node.js
 */

import https from 'https';
import collections from './collections.js';

// Configuration
const API_ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = '683fd40d003e6f918e3d';
const API_KEY = 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';
const DATABASE_ID = 'floservice_db';

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
 * Crée une collection dans la base de données
 * @param {string} collectionId - ID de la collection
 * @param {string} name - Nom de la collection
 * @returns {Promise<object>} - Collection créée
 */
async function createCollection(collectionId, name) {
  try {
    console.log(`Création de la collection ${name} (${collectionId})...`);
    
    const data = {
      collectionId,
      name,
      permissions: ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      documentSecurity: false
    };
    
    const collection = await makeRequest('POST', `/databases/${DATABASE_ID}/collections`, data);
    console.log(`Collection ${name} créée avec succès!`);
    return collection;
  } catch (error) {
    console.error(`Erreur lors de la création de la collection ${name}:`, error);
    
    // Si la collection existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`La collection ${name} existe déjà.`);
      return { $id: collectionId, name };
    }
    
    return null;
  }
}

/**
 * Crée un attribut de type string dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createStringAttribute(collectionId, attribute) {
  try {
    console.log(`Création de l'attribut ${attribute.key} dans la collection ${collectionId}...`);
    
    const data = {
      key: attribute.key,
      size: 255,
      required: attribute.required || false,
      default: attribute.default || null,
      array: attribute.array || false
    };
    
    const result = await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/string`, data);
    console.log(`Attribut ${attribute.key} créé avec succès!`);
    return result;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${attribute.key}:`, error);
    
    // Si l'attribut existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`L'attribut ${attribute.key} existe déjà.`);
      return { key: attribute.key };
    }
    
    return null;
  }
}

/**
 * Crée un attribut de type boolean dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createBooleanAttribute(collectionId, attribute) {
  try {
    console.log(`Création de l'attribut ${attribute.key} dans la collection ${collectionId}...`);
    
    const data = {
      key: attribute.key,
      required: attribute.required || false,
      default: attribute.default || null,
      array: attribute.array || false
    };
    
    const result = await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/boolean`, data);
    console.log(`Attribut ${attribute.key} créé avec succès!`);
    return result;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${attribute.key}:`, error);
    
    // Si l'attribut existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`L'attribut ${attribute.key} existe déjà.`);
      return { key: attribute.key };
    }
    
    return null;
  }
}

/**
 * Crée un attribut de type integer dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createIntegerAttribute(collectionId, attribute) {
  try {
    console.log(`Création de l'attribut ${attribute.key} dans la collection ${collectionId}...`);
    
    const data = {
      key: attribute.key,
      required: attribute.required || false,
      min: attribute.min || -9223372036854775808,
      max: attribute.max || 9223372036854775807,
      default: attribute.default || null,
      array: attribute.array || false
    };
    
    const result = await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/integer`, data);
    console.log(`Attribut ${attribute.key} créé avec succès!`);
    return result;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${attribute.key}:`, error);
    
    // Si l'attribut existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`L'attribut ${attribute.key} existe déjà.`);
      return { key: attribute.key };
    }
    
    return null;
  }
}

/**
 * Crée un attribut de type float dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createFloatAttribute(collectionId, attribute) {
  try {
    console.log(`Création de l'attribut ${attribute.key} dans la collection ${collectionId}...`);
    
    const data = {
      key: attribute.key,
      required: attribute.required || false,
      min: attribute.min || -1.7976931348623157e+308,
      max: attribute.max || 1.7976931348623157e+308,
      default: attribute.default || null,
      array: attribute.array || false
    };
    
    const result = await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/float`, data);
    console.log(`Attribut ${attribute.key} créé avec succès!`);
    return result;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${attribute.key}:`, error);
    
    // Si l'attribut existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`L'attribut ${attribute.key} existe déjà.`);
      return { key: attribute.key };
    }
    
    return null;
  }
}

/**
 * Crée un attribut de type datetime dans une collection
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createDatetimeAttribute(collectionId, attribute) {
  try {
    console.log(`Création de l'attribut ${attribute.key} dans la collection ${collectionId}...`);
    
    const data = {
      key: attribute.key,
      required: attribute.required || false,
      default: attribute.default || null,
      array: attribute.array || false
    };
    
    const result = await makeRequest('POST', `/databases/${DATABASE_ID}/collections/${collectionId}/attributes/datetime`, data);
    console.log(`Attribut ${attribute.key} créé avec succès!`);
    return result;
  } catch (error) {
    console.error(`Erreur lors de la création de l'attribut ${attribute.key}:`, error);
    
    // Si l'attribut existe déjà, on considère que c'est un succès
    if (error.statusCode === 409) {
      console.log(`L'attribut ${attribute.key} existe déjà.`);
      return { key: attribute.key };
    }
    
    return null;
  }
}

/**
 * Crée un attribut dans une collection en fonction de son type
 * @param {string} collectionId - ID de la collection
 * @param {object} attribute - Configuration de l'attribut
 * @returns {Promise<object>} - Attribut créé
 */
async function createAttribute(collectionId, attribute) {
  switch (attribute.type) {
    case 'string':
      return await createStringAttribute(collectionId, attribute);
    case 'boolean':
      return await createBooleanAttribute(collectionId, attribute);
    case 'integer':
      return await createIntegerAttribute(collectionId, attribute);
    case 'double':
    case 'float':
      return await createFloatAttribute(collectionId, attribute);
    case 'datetime':
      return await createDatetimeAttribute(collectionId, attribute);
    default:
      console.error(`Type d'attribut non supporté: ${attribute.type}`);
      return null;
  }
}

/**
 * Crée une collection avec tous ses attributs
 * @param {object} collectionConfig - Configuration de la collection
 * @returns {Promise<object>} - Collection créée
 */
async function createCollectionWithAttributes(collectionConfig) {
  try {
    // Créer la collection
    const collection = await createCollection(collectionConfig.name, collectionConfig.name);
    
    if (!collection) {
      return null;
    }
    
    // Créer les attributs
    for (const attribute of collectionConfig.attributes) {
      // Attendre un peu entre chaque création d'attribut pour éviter les problèmes de rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await createAttribute(collectionConfig.name, attribute);
    }
    
    console.log(`Collection ${collectionConfig.name} et ses attributs créés avec succès!`);
    return collection;
  } catch (error) {
    console.error(`Erreur lors de la création de la collection ${collectionConfig.name} et ses attributs:`, error);
    return null;
  }
}

/**
 * Crée toutes les collections définies dans le fichier collections.js
 */
async function createAllCollections() {
  try {
    console.log('Création des collections...');
    
    // Créer chaque collection avec ses attributs
    for (const [key, collection] of Object.entries(collections)) {
      // Attendre un peu entre chaque création de collection pour éviter les problèmes de rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      await createCollectionWithAttributes(collection);
    }
    
    console.log('Toutes les collections ont été créées avec succès!');
  } catch (error) {
    console.error('Erreur lors de la création des collections:', error);
  }
}

// Exécution principale
createAllCollections()
  .then(() => {
    console.log('Opération terminée avec succès!');
  })
  .catch((error) => {
    console.error('Erreur lors de l\'exécution:', error);
    process.exit(1);
  });
