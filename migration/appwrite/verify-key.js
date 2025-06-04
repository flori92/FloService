/**
 * Script pour vérifier la validité de la clé API Appwrite
 */

import { Client } from 'node-appwrite';
import https from 'https';

// La clé API fournie
const apiKey = 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';

// Fonction pour effectuer une requête HTTP directe à l'API Appwrite
function makeRequest(path, options = {}) {
  return new Promise((resolve, reject) => {
    const requestOptions = {
      hostname: 'fra.cloud.appwrite.io',
      port: 443,
      path: `/v1${path}`,
      method: 'GET',
      headers: {
        'X-Appwrite-Key': apiKey,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    console.log(`Envoi d'une requête à ${requestOptions.path}`);

    const req = https.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Statut de la réponse: ${res.statusCode}`);
        
        try {
          const response = JSON.parse(data);
          console.log('Réponse:', JSON.stringify(response, null, 2));
          resolve({ statusCode: res.statusCode, data: response });
        } catch (error) {
          console.log('Données brutes:', data);
          reject(new Error(`Impossible de parser la réponse: ${error.message}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error('Erreur de requête:', error);
      reject(error);
    });
    
    req.end();
  });
}

// Fonction principale pour vérifier la clé API
async function verifyApiKey() {
  console.log('=== Vérification de la clé API Appwrite ===');
  console.log(`Longueur de la clé: ${apiKey.length} caractères`);
  
  try {
    // 1. Essayer de récupérer les informations sur la clé API elle-même
    console.log('\n1. Vérification des informations de la clé API:');
    await makeRequest('/account/tokens/current');
    
    // 2. Essayer de récupérer la liste des projets
    console.log('\n2. Tentative de récupération des projets:');
    await makeRequest('/projects');
    
    // 3. Essayer avec un ID de projet spécifique
    console.log('\n3. Tentative avec l\'ID de projet spécifique:');
    await makeRequest('/projects/683f4d0d003ef9f18e3d');
    
    // 4. Essayer de lister les bases de données du projet
    console.log('\n4. Tentative de récupération des bases de données:');
    await makeRequest('/databases', {
      headers: {
        'X-Appwrite-Project': '683f4d0d003ef9f18e3d'
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la vérification de la clé API:', error);
  }
}

// Exécuter la vérification
verifyApiKey();
