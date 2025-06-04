/**
 * Script pour lister les projets Appwrite accessibles avec la clé API
 */

import { Client } from 'node-appwrite';
import https from 'https';

// Initialisation du client Appwrite
const client = new Client();

// Configuration du client avec la clé API fournie
const apiKey = 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setKey(apiKey);

// Fonction pour lister les projets
async function listProjects() {
    try {
        console.log('Tentative de récupération des projets...');
        
        // Essayer de récupérer les projets via une requête HTTP directe
        // car le SDK ne fournit pas de méthode pour lister les projets avec une clé API
        const options = {
            hostname: 'fra.cloud.appwrite.io',
            port: 443,
            path: '/v1/projects',
            method: 'GET',
            headers: {
                'X-Appwrite-Key': apiKey,
                'Content-Type': 'application/json'
            }
        };

        return new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                
                res.on('data', (chunk) => {
                    data += chunk;
                });
                
                res.on('end', () => {
                    try {
                        const response = JSON.parse(data);
                        console.log('Réponse:', response);
                        resolve(response);
                    } catch (error) {
                        console.log('Données brutes:', data);
                        reject(error);
                    }
                });
            });
            
            req.on('error', (error) => {
                reject(error);
            });
            
            req.end();
        });
    } catch (error) {
        console.error('Erreur lors de la récupération des projets:', error);
        return null;
    }
}

// Fonction pour vérifier les permissions de la clé API
async function checkApiKey() {
    try {
        console.log('Vérification des permissions de la clé API...');
        
        // Essayer de récupérer les informations de la clé API
        const response = await client.call('get', '/account/tokens/current');
        console.log('Informations de la clé API:', response);
        
        return response;
    } catch (error) {
        console.error('Erreur lors de la vérification de la clé API:', error);
        
        // Afficher des informations détaillées sur l'erreur
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response);
        }
        
        return null;
    }
}

// Exécuter les tests
async function runTests() {
    try {
        // Vérifier les permissions de la clé API
        const keyInfo = await checkApiKey();
        
        if (keyInfo) {
            console.log('La clé API est valide!');
        } else {
            console.error('La clé API n\'est pas valide ou n\'a pas les permissions nécessaires.');
        }
        
        // Lister les projets
        const projects = await listProjects();
        
        if (projects && projects.total > 0) {
            console.log(`${projects.total} projets trouvés:`);
            projects.projects.forEach((project, index) => {
                console.log(`${index + 1}. ID: ${project.$id}, Nom: ${project.name}`);
            });
        } else {
            console.log('Aucun projet trouvé ou erreur lors de la récupération des projets.');
        }
    } catch (error) {
        console.error('Erreur lors de l\'exécution des tests:', error);
    }
}

// Exécuter les tests
runTests();
