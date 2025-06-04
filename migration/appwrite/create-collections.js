/**
 * Script de création des collections Appwrite pour FloService
 * Ce script utilise le SDK Appwrite Node.js pour créer les collections définies
 */

import { Client, Databases, ID } from 'node-appwrite';
import collections from './collections.js';

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
const DATABASE_ID = 'floservice_db';

/**
 * Crée une collection dans Appwrite
 * @param {string} databaseId - ID de la base de données
 * @param {object} collection - Configuration de la collection
 */
async function createCollection(databaseId, collection) {
    try {
        console.log(`Création de la collection ${collection.name}...`);
        
        // Créer la collection
        const createdCollection = await databases.createCollection(
            databaseId,
            collection.name,
            collection.name,
            ['role:all'], // Permissions par défaut, à ajuster selon vos besoins
            false // documentSecurity
        );
        
        console.log(`Collection ${collection.name} créée avec l'ID: ${createdCollection.$id}`);
        
        // Ajouter les attributs
        for (const attr of collection.attributes) {
            console.log(`Ajout de l'attribut ${attr.key}...`);
            
            // Déterminer le type d'attribut Appwrite
            let attributeType;
            switch(attr.type) {
                case 'string':
                    attributeType = attr.array ? databases.createStringAttribute : databases.createStringAttribute;
                    break;
                case 'integer':
                    attributeType = attr.array ? databases.createIntegerAttribute : databases.createIntegerAttribute;
                    break;
                case 'double':
                    attributeType = attr.array ? databases.createFloatAttribute : databases.createFloatAttribute;
                    break;
                case 'boolean':
                    attributeType = attr.array ? databases.createBooleanAttribute : databases.createBooleanAttribute;
                    break;
                case 'datetime':
                    attributeType = attr.array ? databases.createDatetimeAttribute : databases.createDatetimeAttribute;
                    break;
                default:
                    attributeType = databases.createStringAttribute;
            }
            
            // Créer l'attribut
            await attributeType(
                databaseId,
                createdCollection.$id,
                attr.key,
                attr.required,
                attr.default,
                attr.array
            );
        }
        
        // Ajouter les index
        for (const index of collection.indexes) {
            console.log(`Ajout de l'index ${index.key}...`);
            
            await databases.createIndex(
                databaseId,
                createdCollection.$id,
                index.key,
                index.type,
                index.attributes
            );
        }
        
        console.log(`Collection ${collection.name} configurée avec succès!`);
    } catch (error) {
        console.error(`Erreur lors de la création de la collection ${collection.name}:`, error);
    }
}

/**
 * Crée toutes les collections définies
 */
async function createAllCollections() {
    try {
        // Vérifier si la base de données existe
        try {
            console.log(`Tentative d'accès à la base de données ${DATABASE_ID}...`);
            await databases.get(DATABASE_ID);
            console.log(`Base de données ${DATABASE_ID} trouvée. Création des collections...`);
        } catch (error) {
            console.error(`Erreur lors de l'accès à la base de données ${DATABASE_ID}:`, error);
            
            if (error.code === 404) {
                console.error(`La base de données ${DATABASE_ID} n'existe pas. Exécutez d'abord create-database.js.`);
            } else {
                console.error(`Problème d'accès à la base de données. Vérifiez les permissions de la clé API.`);
            }
            
            process.exit(1);
        }
        
        // Créer chaque collection
        for (const [key, collection] of Object.entries(collections)) {
            await createCollection(DATABASE_ID, collection);
        }
        
        console.log('Toutes les collections ont été créées avec succès!');
    } catch (error) {
        console.error('Erreur lors de la création des collections:', error);
    }
}

// Exécuter le script
createAllCollections();
