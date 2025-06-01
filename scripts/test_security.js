/**
 * Script de test des politiques de sécurité pour FloService
 * 
 * Ce script permet de vérifier que les politiques RLS sont correctement appliquées
 * et que les fonctions de sécurité fonctionnent comme prévu.
 * 
 * Exécution: node scripts/test_security.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Récupération des variables d'environnement
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Les variables d'environnement Supabase sont manquantes");
  process.exit(1);
}

// Création du client Supabase anonyme (non authentifié)
const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey);

// Tests de sécurité
async function runSecurityTests() {
  console.log("=== TESTS DE SÉCURITÉ FLOSERVICE ===");
  console.log("Date d'exécution:", new Date().toLocaleString());
  console.log("URL Supabase:", supabaseUrl);
  console.log("-----------------------------------");

  // Test 1: Vérification de l'accès anonyme aux tables
  console.log("\n1. Test d'accès anonyme aux tables sensibles");
  const tables = [
    'profiles', 
    'provider_profiles', 
    'services', 
    'bookings', 
    'conversations', 
    'messages', 
    'invoices',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAnon
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`✅ Table ${table}: Accès refusé comme prévu`);
      } else if (data && data.length > 0) {
        console.log(`❌ Table ${table}: Accès autorisé sans authentification! (${data.length} lignes)`);
      } else {
        console.log(`⚠️ Table ${table}: Aucune donnée retournée, mais pas d'erreur`);
      }
    } catch (err) {
      console.log(`✅ Table ${table}: Exception levée comme prévu:`, err.message);
    }
  }

  // Test 2: Tentative d'insertion dans les tables protégées
  console.log("\n2. Test d'insertion dans les tables protégées");
  
  try {
    const { error } = await supabaseAnon
      .from('profiles')
      .insert({
        id: '00000000-0000-0000-0000-000000000000',
        first_name: 'Test',
        last_name: 'Sécurité',
        email: 'test@security.com'
      });
    
    if (error) {
      console.log("✅ Insertion dans profiles: Refusée comme prévu");
    } else {
      console.log("❌ Insertion dans profiles: Autorisée sans authentification!");
    }
  } catch (err) {
    console.log("✅ Insertion dans profiles: Exception levée comme prévu:", err.message);
  }

  // Test 3: Vérification des fonctions RPC
  console.log("\n3. Test des fonctions RPC sécurisées");
  
  try {
    const { data, error } = await supabaseAnon
      .rpc('is_provider');
    
    if (error) {
      console.log("✅ Fonction is_provider: Accès refusé comme prévu");
    } else {
      console.log("❌ Fonction is_provider: Accessible sans authentification!");
    }
  } catch (err) {
    console.log("✅ Fonction is_provider: Exception levée comme prévu:", err.message);
  }

  // Test 4: Vérification de l'audit
  console.log("\n4. Test de la fonction d'audit");
  
  try {
    const { error } = await supabaseAnon
      .rpc('log_audit_action', {
        action: 'TEST',
        table_name: 'test',
        record_id: '00000000-0000-0000-0000-000000000000'
      });
    
    if (error) {
      console.log("✅ Fonction log_audit_action: Accès refusé comme prévu");
    } else {
      console.log("❌ Fonction log_audit_action: Accessible sans authentification!");
    }
  } catch (err) {
    console.log("✅ Fonction log_audit_action: Exception levée comme prévu:", err.message);
  }

  console.log("\n=== RÉSUMÉ DES TESTS ===");
  console.log("Vérifiez que tous les tests sensibles sont marqués par ✅");
  console.log("Si vous voyez des ❌, cela indique des problèmes de sécurité à corriger");
  console.log("-----------------------------------");
}

// Exécution des tests
runSecurityTests()
  .catch(err => {
    console.error("Erreur lors de l'exécution des tests:", err);
    process.exit(1);
  })
  .finally(() => {
    // Fermeture de la connexion
    process.exit(0);
  });
