/**
 * Script pour lister les bases de données Appwrite
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

/**
 * Liste toutes les bases de données du projet
 */
async function listDatabases() {
    try {
        console.log('Récupération de la liste des bases de données...');
        
        // Récupérer la liste des bases de données
        const databasesList = await databases.list();
        
        console.log(`${databasesList.total} base(s) de données trouvée(s):`);
        
        // Afficher les détails de chaque base de données
        databasesList.databases.forEach((database, index) => {
            console.log(`${index + 1}. ID: ${database.$id}, Nom: ${database.name}`);
        });
        
        return databasesList;
    } catch (error) {
        console.error('Erreur lors de la récupération des bases de données:', error);
        
        if (error.response) {
            console.error('Détails de l\'erreur:', JSON.stringify(error.response, null, 2));
        }
        
        throw error;
    }
}

// Exécuter la récupération des bases de données
listDatabases()
    .then(() => {
        console.log('Opération terminée avec succès!');
    })
    .catch((error) => {
        console.error('Échec de l\'opération:', error);
        process.exit(1);
    });
