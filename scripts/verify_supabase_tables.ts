/**
 * Script pour vérifier les tables Supabase en se basant sur les erreurs du code
 * Créé le 02/06/2025
 */

import { createClient } from '@supabase/supabase-js';

// Configuration de la connexion à Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE2ODU5NzIxNjIsImV4cCI6MjAwMTU0ODE2Mn0.0h9dCPEebaC9pnEksLwTYJV1RHJL4qdNnQjCrMVGbQY';

const supabase = createClient(supabaseUrl, supabaseKey);

// Liste des tables à vérifier (extraites du code source)
const tablesToCheck = [
  'profiles',
  'provider_profiles',
  'messages',
  'conversations',
  'notifications',
  'pays',
  'villes',
  'categories',
  'subcategories',
  'providers',
  'provider_applications'
];

// Liste des fonctions RPC à vérifier
const rpcFunctionsToCheck = [
  'is_provider'
];

// Fonction pour vérifier l'existence d'une table
async function checkTableExists(tableName) {
  try {
    console.log(`Vérification de la table ${tableName}...`);
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        console.log(`❌ Table '${tableName}' manquante (code: ${error.code})`);
        return { exists: false, error: error.message, code: error.code };
      } else {
        console.log(`⚠️ Erreur lors de la vérification de '${tableName}': ${error.message} (code: ${error.code})`);
        return { exists: false, error: error.message, code: error.code };
      }
    }
    
    console.log(`✅ Table '${tableName}' existe`);
    return { exists: true, error: null };
  } catch (error) {
    console.log(`❌ Exception lors de la vérification de '${tableName}': ${error.message}`);
    return { exists: false, error: error.message };
  }
}

// Fonction pour vérifier l'existence d'une fonction RPC
async function checkRpcFunctionExists(functionName) {
  try {
    console.log(`Vérification de la fonction RPC ${functionName}...`);
    // Utiliser un UUID test pour éviter les erreurs de validation
    const testId = '00000000-0000-0000-0000-000000000000';
    
    const { data, error } = await supabase
      .rpc(functionName, { user_id: testId });
    
    if (error) {
      if (error.code === '42883') { // Function does not exist
        console.log(`❌ Fonction RPC '${functionName}' manquante (code: ${error.code})`);
        return { exists: false, error: error.message, code: error.code };
      } else if (error.code === '22P02') { // Invalid input syntax (expected for UUID validation)
        console.log(`✅ Fonction RPC '${functionName}' existe (erreur attendue: ${error.code})`);
        return { exists: true, error: null };
      } else {
        console.log(`⚠️ Erreur lors de la vérification de la fonction '${functionName}': ${error.message} (code: ${error.code})`);
        return { exists: false, error: error.message, code: error.code };
      }
    }
    
    console.log(`✅ Fonction RPC '${functionName}' existe`);
    return { exists: true, error: null };
  } catch (error) {
    console.log(`❌ Exception lors de la vérification de la fonction '${functionName}': ${error.message}`);
    return { exists: false, error: error.message };
  }
}

// Fonction pour vérifier les ID de test
async function checkTestIdSupport() {
  console.log("\n--- Vérification du support des ID de test (tg-2) ---");
  
  try {
    // Test avec un ID au format UUID
    const uuidId = '00000000-0000-0000-0000-000000000000';
    console.log(`Test avec ID UUID: ${uuidId}`);
    const { data: uuidData, error: uuidError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uuidId)
      .maybeSingle();
    
    if (uuidError) {
      if (uuidError.code === '42P01') {
        console.log(`❌ Table 'profiles' manquante (code: ${uuidError.code})`);
      } else {
        console.log(`⚠️ Erreur avec ID UUID: ${uuidError.message} (code: ${uuidError.code})`);
      }
    } else {
      console.log("✅ Requête avec ID UUID acceptée");
    }
    
    // Test avec un ID au format non-UUID (tg-2)
    const nonUuidId = 'tg-2';
    console.log(`\nTest avec ID non-UUID: ${nonUuidId}`);
    const { data: nonUuidData, error: nonUuidError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', nonUuidId)
      .maybeSingle();
    
    if (nonUuidError) {
      if (nonUuidError.code === '22P02') {
        console.log(`❌ ID non-UUID rejeté: ${nonUuidError.message} (code: ${nonUuidError.code})`);
        console.log("   Solution: Adapter le code pour valider et convertir les ID avant les requêtes");
      } else {
        console.log(`⚠️ Erreur avec ID non-UUID: ${nonUuidError.message} (code: ${nonUuidError.code})`);
      }
    } else {
      console.log("✅ Requête avec ID non-UUID acceptée");
    }
  } catch (error) {
    console.log(`❌ Exception lors du test des ID: ${error.message}`);
  }
}

// Fonction principale
async function main() {
  console.log("=== VÉRIFICATION DES TABLES SUPABASE ===\n");
  
  // Vérification des tables
  const tableResults = {};
  let existingTables = 0;
  let missingTables = 0;
  
  console.log("--- Vérification des tables ---");
  for (const table of tablesToCheck) {
    const result = await checkTableExists(table);
    tableResults[table] = result;
    
    if (result.exists) {
      existingTables++;
    } else {
      missingTables++;
    }
  }
  
  // Vérification des fonctions RPC
  const rpcResults = {};
  let existingFunctions = 0;
  let missingFunctions = 0;
  
  console.log("\n--- Vérification des fonctions RPC ---");
  for (const func of rpcFunctionsToCheck) {
    const result = await checkRpcFunctionExists(func);
    rpcResults[func] = result;
    
    if (result.exists) {
      existingFunctions++;
    } else {
      missingFunctions++;
    }
  }
  
  // Vérification du support des ID de test
  await checkTestIdSupport();
  
  // Affichage du résumé
  console.log("\n=== RÉSUMÉ ===");
  console.log(`Tables existantes: ${existingTables}/${tablesToCheck.length}`);
  console.log(`Tables manquantes: ${missingTables}/${tablesToCheck.length}`);
  console.log(`Fonctions RPC existantes: ${existingFunctions}/${rpcFunctionsToCheck.length}`);
  console.log(`Fonctions RPC manquantes: ${missingFunctions}/${rpcFunctionsToCheck.length}`);
  
  // Liste des tables manquantes
  if (missingTables > 0) {
    console.log("\n--- TABLES MANQUANTES ---");
    for (const table in tableResults) {
      if (!tableResults[table].exists) {
        console.log(`- ${table}${tableResults[table].code ? ` (code: ${tableResults[table].code})` : ''}`);
      }
    }
  }
  
  // Liste des fonctions RPC manquantes
  if (missingFunctions > 0) {
    console.log("\n--- FONCTIONS RPC MANQUANTES ---");
    for (const func in rpcResults) {
      if (!rpcResults[func].exists) {
        console.log(`- ${func}${rpcResults[func].code ? ` (code: ${rpcResults[func].code})` : ''}`);
      }
    }
  }
  
  // Recommandations
  console.log("\n=== RECOMMANDATIONS ===");
  if (missingTables > 0 || missingFunctions > 0) {
    console.log("1. Exécuter les migrations SQL manquantes sur Supabase");
    console.log("2. Vérifier que les tables et fonctions nécessaires sont créées");
    console.log("3. Adapter le code pour gérer les erreurs 42P01 (table inexistante)");
    console.log("4. Ajouter des notifications utilisateur pour les migrations manquantes");
  }
  
  if (missingTables === 0 && missingFunctions === 0) {
    console.log("✅ Toutes les tables et fonctions sont présentes dans Supabase");
  }
}

// Exécution du script
main().catch(error => {
  console.error('Erreur lors de la vérification des tables:', error);
});
