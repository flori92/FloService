/**
 * Script de création de la base de données Appwrite pour FloService
 * Ce script utilise le SDK Appwrite Node.js pour créer la base de données
 */

import { Client, Databases } from 'node-appwrite';

// Initialisation du client Appwrite
const client = new Client();

// Configuration du client
console.log('Connexion à Appwrite avec l\'ID de projet: 683fd40d003e6f918e3d');
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('683fd40d003e6f918e3d')
    .setKey('standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650');

const databases = new Databases(client);

// ID de la base de données
const DATABASE_ID = 'database-floservice_db';

/**
 * Crée la base de données Appwrite
 */
async function createDatabase() {
    try {
        // Vérifier si la base de données existe déjà
        try {
            const existingDb = await databases.get(DATABASE_ID);
            console.log(`Base de données ${DATABASE_ID} existe déjà avec l'ID: ${existingDb.$id}`);
            return existingDb;
        } catch (error) {
            // La base de données n'existe pas, on la crée
            console.log(`Création de la base de données ${DATABASE_ID}...`);
            
            // Création de la base de données avec uniquement les paramètres requis
            const createdDb = await databases.create(
                DATABASE_ID,  // databaseId
                DATABASE_ID   // name
            );
            
            console.log(`Base de données ${DATABASE_ID} créée avec succès! ID: ${createdDb.$id}`);
            return createdDb;
        }
    } catch (error) {
        console.error('Erreur lors de la création de la base de données:', error);
        
        if (error.response) {
            console.error('Détails de l\'erreur:', JSON.stringify(error.response, null, 2));
        }
        
        throw error;
    }
}

// Exécuter la création de la base de données
createDatabase()
    .then(() => {
        console.log('Opération terminée avec succès!');
    })
    .catch((error) => {
        console.error('Échec de l\'opération:', error);
        process.exit(1);
    });
