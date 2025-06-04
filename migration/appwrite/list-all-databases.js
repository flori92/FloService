/**
 * Script pour lister toutes les bases de données accessibles
 * via l'API Appwrite
 */

import https from 'https';

// Configuration
const API_ENDPOINT = 'fra.cloud.appwrite.io';
const PROJECT_ID = '683fd40d003e6f918e3d';
const API_KEY = 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';

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
 * Liste toutes les bases de données du projet
 */
async function listAllDatabases() {
  try {
    console.log('Récupération de la liste des bases de données...');
    const databases = await makeRequest('GET', '/databases');
    
    console.log('Réponse complète:', JSON.stringify(databases, null, 2));
    
    if (databases.total) {
      console.log(`${databases.total} base(s) de données trouvée(s):`);
      
      if (databases.databases) {
        databases.databases.forEach((database, index) => {
          console.log(`${index + 1}. ID: ${database.$id}, Nom: ${database.name}`);
        });
      }
    } else {
      console.log('Aucune base de données trouvée.');
    }
    
    return databases;
  } catch (error) {
    console.error('Erreur lors de la récupération des bases de données:', error);
    return null;
  }
}

/**
 * Vérifie les informations du projet
 */
async function getProjectInfo() {
  try {
    console.log('Récupération des informations du projet...');
    const project = await makeRequest('GET', '/projects');
    console.log('Informations du projet:', project);
    return project;
  } catch (error) {
    console.error('Erreur lors de la récupération des informations du projet:', error);
    return null;
  }
}

/**
 * Vérifie les permissions de la clé API
 */
async function checkApiKeyPermissions() {
  try {
    console.log('Vérification des permissions de la clé API...');
    const account = await makeRequest('GET', '/account');
    console.log('Informations du compte:', account);
    return account;
  } catch (error) {
    console.error('Erreur lors de la vérification des permissions de la clé API:', error);
    
    // Essayer une autre route pour vérifier si la clé est valide
    try {
      console.log('Tentative de vérification avec une autre route...');
      const health = await makeRequest('GET', '/health');
      console.log('Statut de santé de l\'API:', health);
    } catch (healthError) {
      console.error('Erreur lors de la vérification de l\'état de l\'API:', healthError);
    }
    
    return null;
  }
}

// Exécution principale
async function main() {
  try {
    // Vérifier les informations du projet
    await getProjectInfo();
    
    // Vérifier les permissions de la clé API
    await checkApiKeyPermissions();
    
    // Lister toutes les bases de données
    await listAllDatabases();
    
    console.log('Opération terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de l\'exécution:', error);
    process.exit(1);
  }
}

main();
