/**
 * Script pour vérifier l'existence des tables dans la base de données Supabase
 * en utilisant une connexion PostgreSQL directe
 * Créé le 02/06/2025
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Chargement des variables d'environnement
dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à la base de données Supabase
// Utilisation de variables d'environnement pour les informations sensibles
const pool = new Pool({
  host: process.env.SUPABASE_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: parseInt(process.env.SUPABASE_PORT || '5432'),
  database: process.env.SUPABASE_DATABASE || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD || '',  // Récupéré depuis les variables d'environnement
  ssl: {
    rejectUnauthorized: false
  }
});

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
  'portfolio_items',
  'message-attachments',
  'chat-attachments',
  'provider-assets',
  'provider-documents'
];

// Liste des fonctions RPC à vérifier
const rpcFunctionsToCheck = [
  'is_provider',
  'get_provider_status',
  'check_migration_status'
];

// Fonction pour vérifier l'existence des tables
async function checkTables() {
  console.log('=== VÉRIFICATION DES TABLES SUPABASE ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Récupération de la liste des tables existantes
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableResult = await client.query(tableQuery);
    const existingTables = tableResult.rows.map(row => row.table_name);
    
    console.log(`\n--- Tables existantes (${existingTables.length}) ---`);
    existingTables.forEach(table => {
      console.log(`- ${table}`);
    });
    
    // Vérification des tables requises
    console.log('\n--- Vérification des tables requises ---');
    const missingTables = [];
    
    for (const table of tablesToCheck) {
      if (existingTables.includes(table)) {
        console.log(`✅ Table '${table}' existe`);
      } else {
        console.log(`❌ Table '${table}' manquante`);
        missingTables.push(table);
      }
    }
    
    // Vérification des fonctions RPC
    console.log('\n--- Vérification des fonctions RPC ---');
    const funcQuery = `
      SELECT proname 
      FROM pg_proc 
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
      WHERE pg_namespace.nspname = 'public'
    `;
    
    const funcResult = await client.query(funcQuery);
    const existingFunctions = funcResult.rows.map(row => row.proname);
    
    const missingFunctions = [];
    
    for (const func of rpcFunctionsToCheck) {
      if (existingFunctions.includes(func)) {
        console.log(`✅ Fonction '${func}' existe`);
      } else {
        console.log(`❌ Fonction '${func}' manquante`);
        missingFunctions.push(func);
      }
    }
    
    // Vérification des migrations
    console.log('\n--- Vérification des migrations ---');
    const migrationQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'schema_migrations'
    `;
    
    const migrationResult = await client.query(migrationQuery);
    
    if (migrationResult.rows.length > 0) {
      console.log('✅ Table de migrations existe');
      
      // Récupération des migrations appliquées
      const appliedMigrationsQuery = `
        SELECT * FROM schema_migrations ORDER BY version
      `;
      
      try {
        const appliedMigrationsResult = await client.query(appliedMigrationsQuery);
        console.log(`\n--- Migrations appliquées (${appliedMigrationsResult.rows.length}) ---`);
        
        appliedMigrationsResult.rows.forEach(row => {
          console.log(`- ${row.version}: ${row.name || 'Sans nom'} (${new Date(row.created_at).toLocaleString()})`);
        });
      } catch (error) {
        console.log('❌ Impossible de lire les migrations appliquées:', error.message);
      }
    } else {
      console.log('❌ Table de migrations manquante');
    }
    
    // Vérification de la structure des tables importantes
    if (existingTables.includes('conversations')) {
      console.log('\n--- Structure de la table conversations ---');
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conversations'
        ORDER BY ordinal_position
      `;
      
      const structureResult = await client.query(structureQuery);
      structureResult.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }
    
    if (existingTables.includes('messages')) {
      console.log('\n--- Structure de la table messages ---');
      const structureQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages'
        ORDER BY ordinal_position
      `;
      
      const structureResult = await client.query(structureQuery);
      structureResult.rows.forEach(column => {
        console.log(`- ${column.column_name}: ${column.data_type} (${column.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
      });
    }
    
    // Résumé
    console.log('\n=== RÉSUMÉ ===');
    console.log(`Tables existantes: ${existingTables.length}`);
    console.log(`Tables requises: ${tablesToCheck.length}`);
    console.log(`Tables manquantes: ${missingTables.length}`);
    console.log(`Fonctions RPC manquantes: ${missingFunctions.length}`);
    
    if (missingTables.length > 0) {
      console.log('\n--- TABLES MANQUANTES ---');
      missingTables.forEach(table => {
        console.log(`- ${table}`);
      });
    }
    
    if (missingFunctions.length > 0) {
      console.log('\n--- FONCTIONS RPC MANQUANTES ---');
      missingFunctions.forEach(func => {
        console.log(`- ${func}`);
      });
    }
    
    // Recommandations
    console.log('\n=== RECOMMANDATIONS ===');
    if (missingTables.length > 0 || missingFunctions.length > 0) {
      console.log('1. Exécuter les migrations SQL manquantes sur Supabase');
      console.log('2. Vérifier que les tables et fonctions nécessaires sont créées');
      console.log('3. Adapter le code pour gérer les erreurs 42P01 (table inexistante)');
      console.log('4. Ajouter des notifications utilisateur pour les migrations manquantes');
      
      // Génération d'un script de migration
      generateMigrationScript(missingTables, missingFunctions);
    } else {
      console.log('✅ Toutes les tables et fonctions requises sont présentes dans la base de données');
    }
    
    // Libération de la connexion
    client.release();
    
  } catch (error) {
    console.error('Erreur lors de la vérification des tables:', error);
  } finally {
    // Fermeture du pool de connexions
    await pool.end();
  }
}

// Fonction pour générer un script de migration
function generateMigrationScript(missingTables, missingFunctions) {
  console.log('\n--- Génération d\'un script de migration ---');
  
  let migrationScript = `-- Script de migration pour les tables et fonctions manquantes
-- Généré automatiquement le ${new Date().toISOString()}

`;

  // Ajout des tables manquantes
  if (missingTables.includes('messages')) {
    migrationScript += `-- Création de la table messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id),
  sender_id UUID REFERENCES auth.users(id),
  content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Politique RLS pour la table messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages" ON public.messages
  FOR SELECT USING (
    auth.uid() IN (
      SELECT sender_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );
CREATE POLICY "Les utilisateurs peuvent envoyer des messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT sender_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );

`;
  }

  if (missingTables.includes('message-attachments')) {
    migrationScript += `-- Création de la table message-attachments
CREATE TABLE IF NOT EXISTS public."message-attachments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public."message-attachments"(message_id);

-- Politique RLS pour la table message-attachments
ALTER TABLE public."message-attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir les pièces jointes de leurs messages" ON public."message-attachments"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id AND (
        auth.uid() = c.client_id OR 
        auth.uid() = c.provider_id OR
        auth.uid() = m.sender_id
      )
    )
  );
CREATE POLICY "Les utilisateurs peuvent ajouter des pièces jointes à leurs messages" ON public."message-attachments"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id AND auth.uid() = m.sender_id
    )
  );

`;
  }

  // Ajout des fonctions RPC manquantes
  if (missingFunctions.includes('is_provider')) {
    migrationScript += `-- Création de la fonction is_provider
CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_provider_user BOOLEAN;
BEGIN
  -- Vérification dans la table profiles
  SELECT p.is_provider INTO is_provider_user
  FROM public.profiles p
  WHERE p.id = user_id;
  
  -- Si l'utilisateur est marqué comme prestataire dans profiles
  IF is_provider_user THEN
    RETURN TRUE;
  END IF;
  
  -- Vérification dans la table provider_profiles
  RETURN EXISTS (
    SELECT 1
    FROM public.provider_profiles pp
    WHERE pp.user_id = user_id
  );
END;
$$;

`;
  }

  if (missingFunctions.includes('get_provider_status')) {
    migrationScript += `-- Création de la fonction get_provider_status
CREATE OR REPLACE FUNCTION public.get_provider_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_status TEXT;
BEGIN
  -- Vérification si l'utilisateur est un prestataire
  IF NOT public.is_provider(user_id) THEN
    RETURN 'not_provider';
  END IF;
  
  -- Récupération du statut de disponibilité
  SELECT pp.availability_status INTO provider_status
  FROM public.provider_profiles pp
  WHERE pp.user_id = user_id;
  
  -- Si aucun statut n'est défini, retourner 'available' par défaut
  RETURN COALESCE(provider_status, 'available');
END;
$$;

`;
  }

  if (missingFunctions.includes('check_migration_status')) {
    migrationScript += `-- Création de la fonction check_migration_status
CREATE OR REPLACE FUNCTION public.check_migration_status()
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

  // Sauvegarde du script de migration
  const migrationFilePath = path.join(__dirname, '..', 'supabase', 'migrations', `${new Date().toISOString().replace(/[:.]/g, '')}_auto_generated.sql`);
  fs.writeFileSync(migrationFilePath, migrationScript);
  console.log(`✅ Script de migration généré: ${migrationFilePath}`);
}

// Exécution de la fonction principale
checkTables().catch(error => {
  console.error('Erreur lors de l\'exécution du script:', error);
});
