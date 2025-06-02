/**
 * Script pour vérifier l'existence des tables dans Supabase
 * Créé le 02/06/2025
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Chargement des variables d'environnement depuis .env.check
dotenv.config({ path: '.env.check' });

// Configuration de la connexion à Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Les variables d\'environnement SUPABASE_URL et SUPABASE_ANON_KEY sont requises');
  process.exit(1);
}

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
  'provider_applications',
  'provider_availability',
  'provider_availability_exceptions',
  'service_offers',
  'payments',
  'invoices',
  'reviews',
  'bookings',
  'withdrawals',
  'user_settings',
  'external_id_mapping',
  'portfolio_items'
];

// Fonction pour vérifier l'existence d'une table
async function checkTableExists(tableName) {
  try {
    // Tentative de récupération d'une ligne de la table
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    if (error) {
      if (error.code === '42P01') {
        return { exists: false, error: 'Table inexistante', code: error.code };
      } else {
        return { exists: false, error: error.message, code: error.code };
      }
    }
    
    return { exists: true, error: null };
  } catch (error) {
    return { exists: false, error: error.message, code: error?.code };
  }
}

// Fonction pour vérifier l'existence d'une fonction RPC
async function checkRpcFunctionExists(functionName) {
  try {
    // Tentative d'appel de la fonction RPC
    const { data, error } = await supabase
      .rpc(functionName, { user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (error) {
      if (error.code === '42883') { // Function does not exist
        return { exists: false, error: 'Fonction inexistante', code: error.code };
      } else if (error.code === '22P02') { // Invalid input syntax (expected for UUID validation)
        return { exists: true, error: null };
      } else {
        return { exists: false, error: error.message, code: error.code };
      }
    }
    
    return { exists: true, error: null };
  } catch (error) {
    return { exists: false, error: error.message, code: error?.code };
  }
}

// Fonction principale
async function main() {
  console.log('🔍 Vérification des tables Supabase...');
  
  const results = {
    tables: {},
    rpcFunctions: {},
    summary: {
      existingTables: 0,
      missingTables: 0,
      existingFunctions: 0,
      missingFunctions: 0
    }
  };
  
  // Vérification des tables
  for (const table of tablesToCheck) {
    process.stdout.write(`Vérification de la table ${table}... `);
    const result = await checkTableExists(table);
    results.tables[table] = result;
    
    if (result.exists) {
      console.log('✅ Existe');
      results.summary.existingTables++;
    } else {
      console.log(`❌ Manquante (${result.code}: ${result.error})`);
      results.summary.missingTables++;
    }
  }
  
  // Vérification des fonctions RPC importantes
  const rpcFunctionsToCheck = ['is_provider', 'get_provider_status', 'check_migration_status'];
  
  console.log('\n🔍 Vérification des fonctions RPC...');
  
  for (const func of rpcFunctionsToCheck) {
    process.stdout.write(`Vérification de la fonction ${func}... `);
    const result = await checkRpcFunctionExists(func);
    results.rpcFunctions[func] = result;
    
    if (result.exists) {
      console.log('✅ Existe');
      results.summary.existingFunctions++;
    } else {
      console.log(`❌ Manquante (${result.code}: ${result.error})`);
      results.summary.missingFunctions++;
    }
  }
  
  // Affichage du résumé
  console.log('\n📊 RÉSUMÉ:');
  console.log(`Tables existantes: ${results.summary.existingTables}/${tablesToCheck.length}`);
  console.log(`Tables manquantes: ${results.summary.missingTables}/${tablesToCheck.length}`);
  console.log(`Fonctions RPC existantes: ${results.summary.existingFunctions}/${rpcFunctionsToCheck.length}`);
  console.log(`Fonctions RPC manquantes: ${results.summary.missingFunctions}/${rpcFunctionsToCheck.length}`);
  
  // Liste des tables manquantes
  if (results.summary.missingTables > 0) {
    console.log('\n❌ TABLES MANQUANTES:');
    for (const table in results.tables) {
      if (!results.tables[table].exists) {
        console.log(`- ${table} (${results.tables[table].code}: ${results.tables[table].error})`);
      }
    }
  }
  
  // Liste des fonctions RPC manquantes
  if (results.summary.missingFunctions > 0) {
    console.log('\n❌ FONCTIONS RPC MANQUANTES:');
    for (const func in results.rpcFunctions) {
      if (!results.rpcFunctions[func].exists) {
        console.log(`- ${func} (${results.rpcFunctions[func].code}: ${results.rpcFunctions[func].error})`);
      }
    }
  }
  
  // Sauvegarde des résultats dans un fichier JSON
  const resultsFilePath = path.join(process.cwd(), 'supabase_check_results.json');
  fs.writeFileSync(resultsFilePath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Résultats détaillés sauvegardés dans: ${resultsFilePath}`);
  
  // Création d'un script de migration si nécessaire
  if (results.summary.missingTables > 0 || results.summary.missingFunctions > 0) {
    console.log('\n⚠️ Des tables ou fonctions sont manquantes. Génération d\'un script de migration...');
    
    const missingTables = Object.keys(results.tables).filter(table => !results.tables[table].exists);
    const missingFunctions = Object.keys(results.rpcFunctions).filter(func => !results.rpcFunctions[func].exists);
    
    generateMigrationScript(missingTables, missingFunctions);
  }
}

// Fonction pour générer un script de migration
function generateMigrationScript(missingTables, missingFunctions) {
  let migrationScript = `-- Script de migration pour les tables et fonctions manquantes
-- Généré automatiquement le ${new Date().toISOString()}

`;

  // Ajout des tables manquantes
  if (missingTables.length > 0) {
    migrationScript += `-- TABLES MANQUANTES\n\n`;
    
    // Table profiles
    if (missingTables.includes('profiles')) {
      migrationScript += `-- Création de la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  business_name TEXT,
  bio TEXT,
  is_provider BOOLEAN DEFAULT FALSE,
  role TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city_id INTEGER,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir tous les profils" ON profiles FOR SELECT USING (true);
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Les utilisateurs peuvent insérer leur propre profil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

`;
    }
    
    // Table provider_profiles
    if (missingTables.includes('provider_profiles')) {
      migrationScript += `-- Création de la table provider_profiles
CREATE TABLE IF NOT EXISTS provider_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER,
  subcategory_id INTEGER,
  hourly_rate DECIMAL(10, 2),
  description TEXT,
  experience_years INTEGER,
  qualifications TEXT,
  availability_status TEXT DEFAULT 'available',
  rating DECIMAL(3, 2),
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour provider_profiles
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir tous les profils prestataires" ON provider_profiles FOR SELECT USING (true);
CREATE POLICY "Les prestataires peuvent modifier leur propre profil" ON provider_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Les prestataires peuvent insérer leur propre profil" ON provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

`;
    }
    
    // Table messages
    if (missingTables.includes('messages')) {
      migrationScript += `-- Création de la table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages" ON messages FOR SELECT USING (
  auth.uid() IN (
    SELECT sender_id FROM conversations WHERE id = conversation_id
    UNION
    SELECT recipient_id FROM conversations WHERE id = conversation_id
  )
);
CREATE POLICY "Les utilisateurs peuvent envoyer des messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT sender_id FROM conversations WHERE id = conversation_id
    UNION
    SELECT recipient_id FROM conversations WHERE id = conversation_id
  )
);

`;
    }
    
    // Table conversations
    if (missingTables.includes('conversations')) {
      migrationScript += `-- Création de la table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations" ON conversations FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "Les utilisateurs peuvent créer des conversations" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres conversations" ON conversations FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

`;
    }
    
    // Autres tables importantes
    if (missingTables.includes('notifications')) {
      migrationScript += `-- Création de la table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  type TEXT,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent marquer leurs notifications comme lues" ON notifications FOR UPDATE USING (auth.uid() = user_id);

`;
    }
  }
  
  // Ajout des fonctions RPC manquantes
  if (missingFunctions.length > 0) {
    migrationScript += `-- FONCTIONS RPC MANQUANTES\n\n`;
    
    // Fonction is_provider
    if (missingFunctions.includes('is_provider')) {
      migrationScript += `-- Création de la fonction is_provider
CREATE OR REPLACE FUNCTION is_provider(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_provider_user BOOLEAN;
BEGIN
  -- Vérification dans la table profiles
  SELECT p.is_provider INTO is_provider_user
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Si l'utilisateur est marqué comme prestataire dans profiles
  IF is_provider_user THEN
    RETURN TRUE;
  END IF;
  
  -- Vérification dans la table provider_profiles
  RETURN EXISTS (
    SELECT 1
    FROM provider_profiles pp
    WHERE pp.user_id = user_id
  );
END;
$$;

`;
    }
    
    // Fonction get_provider_status
    if (missingFunctions.includes('get_provider_status')) {
      migrationScript += `-- Création de la fonction get_provider_status
CREATE OR REPLACE FUNCTION get_provider_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_status TEXT;
BEGIN
  -- Vérification si l'utilisateur est un prestataire
  IF NOT is_provider(user_id) THEN
    RETURN 'not_provider';
  END IF;
  
  -- Récupération du statut de disponibilité
  SELECT pp.availability_status INTO provider_status
  FROM provider_profiles pp
  WHERE pp.user_id = user_id;
  
  -- Si aucun statut n'est défini, retourner 'available' par défaut
  RETURN COALESCE(provider_status, 'available');
END;
$$;

`;
    }
    
    // Fonction check_migration_status
    if (missingFunctions.includes('check_migration_status')) {
      migrationScript += `-- Création de la fonction check_migration_status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  required_tables TEXT[] := ARRAY['profiles', 'provider_profiles', 'messages', 'conversations', 'notifications'];
  required_functions TEXT[] := ARRAY['is_provider', 'get_provider_status'];
  missing_tables TEXT[] := '{}';
  missing_functions TEXT[] := '{}';
  table_name TEXT;
  function_name TEXT;
BEGIN
  -- Vérification des tables requises
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = table_name
    ) THEN
      missing_tables := missing_tables || table_name;
    END IF;
  END LOOP;
  
  -- Vérification des fonctions requises
  FOREACH function_name IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = function_name
    ) THEN
      missing_functions := missing_functions || function_name;
    END IF;
  END LOOP;
  
  -- Construction du résultat
  result := jsonb_build_object(
    'status', CASE WHEN array_length(missing_tables, 1) = 0 AND array_length(missing_functions, 1) = 0 THEN 'ok' ELSE 'migration_required' END,
    'missing_tables', missing_tables,
    'missing_functions', missing_functions
  );
  
  RETURN result;
END;
$$;

`;
    }
  }
  
  // Sauvegarde du script de migration
  const migrationFilePath = path.join(process.cwd(), 'migration_script.sql');
  fs.writeFileSync(migrationFilePath, migrationScript);
  console.log(`💾 Script de migration généré: ${migrationFilePath}`);
}

// Exécution du script
main().catch(error => {
  console.error('Erreur lors de la vérification des tables:', error);
  process.exit(1);
});
