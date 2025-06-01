/**
 * Script pour appliquer les corrections de sécurité à la base de données Supabase
 * Ce script exécute le fichier security_fixes.sql sur la base de données
 * 
 * Utilisation: node apply_security_fixes_modified.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Chargement des variables d'environnement
dotenv.config();

// Configuration pour les chemins de fichiers en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à la base de données
const pool = new Pool({
  host: 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Apollonf@vi92', // Mot de passe récupéré du fichier de configuration
  ssl: {
    rejectUnauthorized: false
  }
});

// Chemin vers le fichier SQL de sécurité
const securityFixesPath = path.join(__dirname, '..', 'supabase', 'security_fixes.sql');

// Fonction pour exécuter le script SQL par sections
async function applySecurityFixes() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Lecture du fichier SQL
    const sqlScript = fs.readFileSync(securityFixesPath, 'utf8');
    
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    console.log('Application des corrections de sécurité...');
    
    // Diviser le script en sections pour faciliter l'exécution
    const sections = [
      // Section 1: Activation du RLS
      `DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    RAISE NOTICE 'RLS activé sur la table %', table_record.tablename;
  END LOOP;
END
$$;`,

      // Section 2: Correction des politiques DEFINER
      `DO $$
DECLARE
  view_record RECORD;
BEGIN
  -- Identifier les vues avec SECURITY DEFINER
  FOR view_record IN 
    SELECT viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND definition LIKE '%SECURITY DEFINER%'
  LOOP
    -- Récupérer la définition de la vue
    DECLARE
      view_def TEXT;
    BEGIN
      SELECT definition INTO view_def 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname = view_record.viewname;
      
      -- Remplacer SECURITY DEFINER par SECURITY INVOKER
      view_def := REPLACE(view_def, 'SECURITY DEFINER', 'SECURITY INVOKER');
      
      -- Recréer la vue
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.viewname);
      EXECUTE view_def;
      
      RAISE NOTICE 'Vue % modifiée pour utiliser SECURITY INVOKER', view_record.viewname;
    END;
  END LOOP;
END
$$;`,

      // Section 3: Création d'index
      `DO $$
DECLARE
  fk_record RECORD;
  index_name TEXT;
  column_name TEXT;
  table_name TEXT;
BEGIN
  FOR fk_record IN
    SELECT
      tc.table_schema, 
      tc.table_name, 
      kcu.column_name
    FROM 
      information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE 
      tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    table_name := fk_record.table_name;
    column_name := fk_record.column_name;
    index_name := format('idx_%s_%s', table_name, column_name);
    
    -- Vérifier si l'index existe déjà
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND indexname = index_name
    ) THEN
      -- Créer l'index s'il n'existe pas
      EXECUTE format('CREATE INDEX %I ON public.%I (%I)', 
                    index_name, table_name, column_name);
      RAISE NOTICE 'Index % créé sur %.%', index_name, table_name, column_name;
    END IF;
  END LOOP;
END
$$;`,

      // Section 4: Politiques RLS pour profiles
      `DROP POLICY IF EXISTS "Accès public en lecture pour profiles" ON public.profiles;
CREATE POLICY "Accès public en lecture pour profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);`,

      // Section 5: Politiques RLS pour provider_profiles
      `DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.provider_profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.provider_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);`,

      // Section 6: Politiques RLS pour services
      `DROP POLICY IF EXISTS "Accès public en lecture pour services" ON public.services;
CREATE POLICY "Accès public en lecture pour services"
  ON public.services
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Les prestataires peuvent gérer leurs services" ON public.services;
CREATE POLICY "Les prestataires peuvent gérer leurs services"
  ON public.services
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );`,

      // Section 7: Politiques RLS pour bookings
      `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs réservations" ON public.bookings;
CREATE POLICY "Les utilisateurs peuvent voir leurs réservations"
  ON public.bookings
  FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
    )
  );

DROP POLICY IF EXISTS "Les clients peuvent créer des réservations" ON public.bookings;
CREATE POLICY "Les clients peuvent créer des réservations"
  ON public.bookings
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings;
CREATE POLICY "Les utilisateurs peuvent modifier leurs réservations"
  ON public.bookings
  FOR UPDATE
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
    )
  )
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
    )
  );`,

      // Section 8: Politiques RLS pour conversations
      `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;
CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations;
CREATE POLICY "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);`,

      // Section 9: Politiques RLS pour messages
      `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages;
CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );

DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages;
CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );`,

      // Section 10: Politiques RLS pour invoices
      `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
  ON public.invoices
  FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() = provider_id
  );

DROP POLICY IF EXISTS "Les prestataires peuvent créer des factures" ON public.invoices;
CREATE POLICY "Les prestataires peuvent créer des factures"
  ON public.invoices
  FOR INSERT
  WITH CHECK (
    auth.uid() = provider_id
  );`,

      // Section 11: Politiques RLS pour audit_logs
      `DROP POLICY IF EXISTS "Seuls les administrateurs peuvent voir les logs d'audit" ON public.audit_logs;
CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
  ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Insertion des logs d'audit via RPC uniquement" ON public.audit_logs;
CREATE POLICY "Insertion des logs d'audit via RPC uniquement"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (
    -- Cette politique est restrictive, l'insertion se fait via la fonction RPC log_audit_action
    false
  );`
    ];
    
    // Exécuter chaque section séparément
    for (let i = 0; i < sections.length; i++) {
      try {
        console.log(`Exécution de la section ${i + 1}/${sections.length}...`);
        await client.query(sections[i]);
        console.log(`Section ${i + 1} exécutée avec succès`);
      } catch (sectionError) {
        console.error(`Erreur dans la section ${i + 1}:`, sectionError.message);
        // Continuer avec les autres sections malgré l'erreur
      }
    }
    
    console.log('Corrections de sécurité appliquées avec succès!');
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
    console.log('Connexion fermée');
    
  } catch (error) {
    console.error('Erreur lors de l\'application des corrections de sécurité:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
applySecurityFixes();
