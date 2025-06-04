/**
 * Script de test de connexion à Appwrite
 * Ce script vérifie que la clé API fonctionne correctement
 */

import { Client, Account } from 'node-appwrite';

// Initialisation du client Appwrite
const client = new Client();

// Configuration du client avec la clé API fournie
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('683f4d0d003ef9f18e3d')
    .setKey('standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650');

// Fonction pour tester la connexion
async function testConnection() {
    try {
        console.log('Tentative de connexion à Appwrite...');
        
        // Essayer de récupérer les informations du projet
        const account = new Account(client);
        
        // Vérifier les informations de la clé API
        const response = await client.call('get', '/account/sessions/current');
        console.log('Connexion réussie!');
        console.log('Informations de session:', response);
        
        return true;
    } catch (error) {
        console.error('Erreur de connexion à Appwrite:', error);
        
        // Afficher des informations détaillées sur l'erreur
        if (error.response) {
            console.error('Détails de l\'erreur:', error.response);
        }
        
        return false;
    }
}

// Exécuter le test de connexion
testConnection().then((success) => {
    if (success) {
        console.log('Test de connexion réussi!');
    } else {
        console.error('Test de connexion échoué!');
        process.exit(1);
    }
});
