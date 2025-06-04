/**
 * Script de migration des données de Supabase vers Appwrite pour FloService
 * Ce script extrait les données de Supabase et les importe dans Appwrite
 */

import { createClient } from '@supabase/supabase-js';
import { Client, Databases, ID } from 'node-appwrite';
import fs from 'fs/promises';
import path from 'path';

// Configuration Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY4NTkwNTg5NiwiZXhwIjoyMDAxNDgxODk2fQ.Iq7UZ9_Xmm-0TVZ2iXGnFXy7yvgxnNXrQDCvbHKUYHQ';
const supabase = createClient(supabaseUrl, supabaseKey);

// Vérification de la connexion Supabase
console.log(`Connexion à Supabase: ${supabaseUrl}`);
if (!supabaseKey) {
  console.warn('⚠️ Clé Supabase non définie. Utilisation de la clé par défaut.');
}

// Configuration Appwrite
const appwriteEndpoint = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const appwriteProjectId = process.env.VITE_APPWRITE_PROJECT_ID || '683fd40d003e6f918e3d';
const appwriteKey = process.env.APPWRITE_KEY || 'standard_9897a485d6e469e092c4627cfd569f3902592a84e30e2a3eac500b2946505d11c8c41cbbf287a70975bf0cccef7e0ab3fca949cf89fe4881dcba487fa1188f6592bb03ebaee65bc9653f0da7927656f54910bd62c842e27b2261ebe4a431f2fa4359e386667d6194f8238de7493a1bfceca4247ef6973e86e1d6baa88efbb650';

const appwrite = new Client();
appwrite
    .setEndpoint(appwriteEndpoint)
    .setProject(appwriteProjectId)
    .setKey(appwriteKey);

// Vérification de la configuration Appwrite
console.log(`Connexion à Appwrite: ${appwriteEndpoint}`);
console.log(`Projet Appwrite: ${appwriteProjectId}`);
if (!appwriteKey) {
  console.warn('⚠️ Clé Appwrite non définie. Utilisation de la clé par défaut.');
}

const databases = new Databases(appwrite);
const DATABASE_ID = 'floservice_db';

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
 * Extrait les données d'une table Supabase et les sauvegarde dans un fichier JSON
 * @param {string} table - Nom de la table
 * @returns {Promise<Array>} - Données extraites
 */
async function extractDataFromSupabase(table) {
    console.log(`Extraction des données de la table ${table}...`);
    
    try {
        const { data, error } = await supabase.from(table).select('*');
        
        if (error) {
            console.error(`Erreur lors de l'extraction des données de ${table}:`, error);
            return [];
        }
        
        // Sauvegarder les données dans un fichier JSON
        const filePath = path.join(EXPORT_DIR, `${table}.json`);
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        console.log(`Données de ${table} sauvegardées dans ${filePath}`);
        
        return data;
    } catch (error) {
        console.error(`Erreur lors de l'extraction des données de ${table}:`, error);
        return [];
    }
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
            // Préserver l'ID d'origine et utiliser la déstructuration d'objet
            const { id, ...documentData } = item;
            
            // Créer le document dans Appwrite
            await databases.createDocument(
                DATABASE_ID,
                collection,
                id,
                documentData
            );
            
            successCount++;
            
            // Afficher la progression
            if (successCount % 10 === 0) {
                console.log(`${successCount}/${data.length} documents importés dans ${collection}`);
            }
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
 * Vérifie si une collection existe dans Appwrite
 * @param {string} collectionId - ID de la collection à vérifier
 * @returns {Promise<boolean>} - True si la collection existe
 */
async function checkCollectionExists(collectionId) {
    try {
        await databases.listDocuments(DATABASE_ID, collectionId, []);
        return true;
    } catch (error) {
        if (error.code === 404) {
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

/**
 * Exécute la migration complète
 */
async function runMigration() {
    try {
        console.log('===== Début de la migration Supabase vers Appwrite =====');
        console.log(`Date: ${new Date().toLocaleString()}`);
        
        // Vérifier les clés d'API
        if (!supabaseKey) {
            console.error('❌ Clé Supabase non définie. Définissez la variable d\'environnement SUPABASE_KEY.');
            process.exit(1);
        }
        
        // Vérifier les collections Appwrite
        const collectionsOk = await verifyCollections();
        if (!collectionsOk) {
            console.error('❌ Vérification des collections échouée. Migration annulée.');
            process.exit(1);
        }
        
        // Créer le dossier d'export
        await setupExportDir();
        
        // Migrer chaque table
        console.log('\n===== Début de la migration des données =====');
        for (const { table, collection } of TABLES_TO_MIGRATE) {
            console.log(`\n----- Migration de ${table} vers ${collection} -----`);
            
            // Extraire les données de Supabase
            const data = await extractDataFromSupabase(table);
            
            if (data.length > 0) {
                // Importer les données dans Appwrite
                await importDataToAppwrite(collection, data);
            } else {
                console.warn(`⚠️ Aucune donnée à migrer pour ${table}`);
            }
            
            console.log(`----- Fin de la migration de ${table} -----`);
        }
        
        console.log('\n===== Migration terminée avec succès! =====');
    } catch (error) {
        console.error('\n❌ Erreur lors de la migration:', error);
        process.exit(1);
    }
}

// Exécuter la migration
runMigration();
