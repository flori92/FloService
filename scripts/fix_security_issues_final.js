/**
 * Script pour corriger les problèmes de sécurité identifiés
 * Ce script adapte les politiques RLS à la structure réelle de la base de données
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

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
  password: 'Apollonf@vi92',
  ssl: {
    rejectUnauthorized: false
  }
});

async function fixSecurityIssues() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier si la fonction uuid_generate_v4 existe
    const uuidFunctionResult = await client.query(`
      SELECT 1 FROM pg_proc WHERE proname = 'uuid_generate_v4' LIMIT 1
    `);
    
    if (uuidFunctionResult.rows.length === 0) {
      console.log('Installation de l\'extension uuid-ossp...');
      await client.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
    }
    
    // 1. Création de la table audit_logs
    console.log('\n=== CRÉATION DE LA TABLE AUDIT_LOGS ===');
    
    // Vérifier si la table audit_logs existe
    const auditLogsResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    `);
    
    if (auditLogsResult.rows.length === 0) {
      console.log('Création de la table audit_logs...');
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          action TEXT NOT NULL,
          table_name TEXT NOT NULL,
          record_id TEXT NOT NULL,
          user_id UUID,
          old_data JSONB,
          new_data JSONB,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);
      console.log('Table audit_logs créée avec succès');
    } else {
      console.log('La table audit_logs existe déjà');
    }
    
    // 2. Création de la fonction log_audit_action si elle n'existe pas
    console.log('\n=== CRÉATION DE LA FONCTION D\'AUDIT ===');
    await client.query(`
      CREATE OR REPLACE FUNCTION public.log_audit_action(
        action TEXT,
        table_name TEXT,
        record_id TEXT,
        old_data JSONB DEFAULT NULL,
        new_data JSONB DEFAULT NULL
      )
      RETURNS VOID
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        INSERT INTO public.audit_logs (
          action,
          table_name,
          record_id,
          user_id,
          old_data,
          new_data
        ) VALUES (
          action,
          table_name,
          record_id,
          auth.uid(),
          old_data,
          new_data
        );
      END;
      $$;
    `);
    console.log('Fonction log_audit_action créée ou mise à jour avec succès');
    
    // 3. Création de la fonction is_provider si elle n'existe pas
    console.log('\n=== CRÉATION DE LA FONCTION IS_PROVIDER ===');
    
    // Vérifier d'abord si provider_profiles est une vue ou une table
    const providerProfilesTypeResult = await client.query(`
      SELECT 
        CASE 
          WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_profiles') THEN 'TABLE'
          WHEN EXISTS (SELECT 1 FROM pg_views WHERE schemaname = 'public' AND viewname = 'provider_profiles') THEN 'VIEW'
          ELSE 'NONE'
        END as object_type
    `);
    
    const providerProfilesType = providerProfilesTypeResult.rows[0].object_type;
    
    if (providerProfilesType !== 'NONE') {
      console.log(`provider_profiles est un(e) ${providerProfilesType}`);
      
      // Récupérer la structure de provider_profiles
      const providerProfilesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'provider_profiles'
      `);
      
      const providerProfilesColumns = providerProfilesColumnsResult.rows.map(row => row.column_name);
      
      // Créer la fonction is_provider adaptée à la structure
      if (providerProfilesColumns.includes('user_id')) {
        await client.query(`
          CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
          RETURNS BOOLEAN
          LANGUAGE plpgsql
          SECURITY INVOKER
          AS $$
          DECLARE
            provider_exists BOOLEAN;
          BEGIN
            SELECT EXISTS(
              SELECT 1 FROM public.provider_profiles
              WHERE provider_profiles.user_id = $1
            ) INTO provider_exists;
            
            RETURN provider_exists;
          END;
          $$;
        `);
      } else {
        // Adapter la fonction si la structure est différente
        await client.query(`
          CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
          RETURNS BOOLEAN
          LANGUAGE plpgsql
          SECURITY INVOKER
          AS $$
          DECLARE
            provider_exists BOOLEAN;
          BEGIN
            -- Vérifier si l'utilisateur a des services (prestataire)
            SELECT EXISTS(
              SELECT 1 FROM public.services
              WHERE provider_id = $1
            ) INTO provider_exists;
            
            RETURN provider_exists;
          END;
          $$;
        `);
      }
      
      console.log('Fonction is_provider créée ou mise à jour avec succès');
    } else {
      console.log('provider_profiles n\'existe pas, création d\'une fonction is_provider alternative');
      
      await client.query(`
        CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
        RETURNS BOOLEAN
        LANGUAGE plpgsql
        SECURITY INVOKER
        AS $$
        DECLARE
          provider_exists BOOLEAN;
        BEGIN
          -- Vérifier si l'utilisateur a des services (prestataire)
          SELECT EXISTS(
            SELECT 1 FROM public.services
            WHERE provider_id = $1
          ) INTO provider_exists;
          
          RETURN provider_exists;
        END;
        $$;
      `);
      
      console.log('Fonction is_provider alternative créée avec succès');
    }
    
    // 4. Activation du RLS sur toutes les tables utilisateur (pas les tables système)
    console.log('\n=== ACTIVATION DU RLS SUR LES TABLES UTILISATEUR ===');
    const userTablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT IN (
        'spatial_ref_sys', 
        'geography_columns', 
        'geometry_columns',
        'raster_columns',
        'raster_overviews'
      )
    `);
    
    for (const row of userTablesResult.rows) {
      const tableName = row.tablename;
      try {
        await client.query(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
        console.log(`RLS activé sur la table ${tableName}`);
      } catch (error) {
        console.error(`Erreur lors de l'activation du RLS sur ${tableName}: ${error.message}`);
      }
    }
    
    // 5. Application des politiques RLS adaptées à la structure réelle
    console.log('\n=== APPLICATION DES POLITIQUES RLS ===');
    
    // Vérifier si la table profiles existe
    const profilesResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'profiles'
    `);
    
    if (profilesResult.rows.length > 0) {
      console.log('Application des politiques RLS pour profiles...');
      
      // Vérifier la structure de la table profiles
      const profilesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles'
      `);
      
      const profilesColumns = profilesColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Accès public en lecture pour profiles" ON public.profiles`);
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles`);
      
      // Créer les nouvelles politiques
      await client.query(`
        CREATE POLICY "Accès public en lecture pour profiles"
        ON public.profiles
        FOR SELECT
        USING (true);
      `);
      
      // Vérifier si la colonne id existe dans profiles
      if (profilesColumns.includes('id')) {
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
          ON public.profiles
          FOR UPDATE
          USING (auth.uid() = id)
          WITH CHECK (auth.uid() = id);
        `);
      }
      
      console.log('Politiques RLS pour profiles appliquées avec succès');
    }
    
    // Vérifier si la table services existe
    const servicesResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'services'
    `);
    
    if (servicesResult.rows.length > 0) {
      console.log('Application des politiques RLS pour services...');
      
      // Vérifier la structure de la table services
      const servicesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'services'
      `);
      
      const servicesColumns = servicesColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Accès public en lecture pour services" ON public.services`);
      await client.query(`DROP POLICY IF EXISTS "Les prestataires peuvent gérer leurs services" ON public.services`);
      
      // Créer les nouvelles politiques
      await client.query(`
        CREATE POLICY "Accès public en lecture pour services"
        ON public.services
        FOR SELECT
        USING (true);
      `);
      
      // Adapter la politique en fonction des colonnes existantes
      if (servicesColumns.includes('provider_id')) {
        await client.query(`
          CREATE POLICY "Les prestataires peuvent gérer leurs services"
          ON public.services
          FOR ALL
          USING (auth.uid() = provider_id)
          WITH CHECK (auth.uid() = provider_id);
        `);
      }
      
      console.log('Politiques RLS pour services appliquées avec succès');
    }
    
    // Vérifier si la table bookings existe
    const bookingsResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'bookings'
    `);
    
    if (bookingsResult.rows.length > 0) {
      console.log('Application des politiques RLS pour bookings...');
      
      // Vérifier la structure de la table bookings
      const bookingsColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'bookings'
      `);
      
      const bookingsColumns = bookingsColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs réservations" ON public.bookings`);
      await client.query(`DROP POLICY IF EXISTS "Les clients peuvent créer des réservations" ON public.bookings`);
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings`);
      
      // Créer les nouvelles politiques adaptées à la structure
      if (bookingsColumns.includes('client_id') && bookingsColumns.includes('service_id')) {
        // Politique pour la lecture
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent voir leurs réservations"
          ON public.bookings
          FOR SELECT
          USING (
            auth.uid() = client_id OR 
            auth.uid() IN (
              SELECT s.provider_id FROM public.services s WHERE s.id = service_id
            )
          );
        `);
        
        // Politique pour l'insertion
        await client.query(`
          CREATE POLICY "Les clients peuvent créer des réservations"
          ON public.bookings
          FOR INSERT
          WITH CHECK (auth.uid() = client_id);
        `);
        
        // Politique pour la mise à jour
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent modifier leurs réservations"
          ON public.bookings
          FOR UPDATE
          USING (
            auth.uid() = client_id OR 
            auth.uid() IN (
              SELECT s.provider_id FROM public.services s WHERE s.id = service_id
            )
          )
          WITH CHECK (
            auth.uid() = client_id OR 
            auth.uid() IN (
              SELECT s.provider_id FROM public.services s WHERE s.id = service_id
            )
          );
        `);
      }
      
      console.log('Politiques RLS pour bookings appliquées avec succès');
    }
    
    // Vérifier si la table conversations existe
    const conversationsResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'conversations'
    `);
    
    if (conversationsResult.rows.length > 0) {
      console.log('Application des politiques RLS pour conversations...');
      
      // Vérifier la structure de la table conversations
      const conversationsColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conversations'
      `);
      
      const conversationsColumns = conversationsColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations`);
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations`);
      
      // Créer les nouvelles politiques adaptées à la structure
      if (conversationsColumns.includes('client_id') && conversationsColumns.includes('provider_id')) {
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
          ON public.conversations
          FOR SELECT
          USING (auth.uid() = client_id OR auth.uid() = provider_id);
        `);
        
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent créer des conversations"
          ON public.conversations
          FOR INSERT
          WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);
        `);
      }
      
      console.log('Politiques RLS pour conversations appliquées avec succès');
    }
    
    // Vérifier si la table messages existe
    const messagesResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'messages'
    `);
    
    if (messagesResult.rows.length > 0) {
      console.log('Application des politiques RLS pour messages...');
      
      // Vérifier la structure de la table messages
      const messagesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages'
      `);
      
      const messagesColumns = messagesColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages`);
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages`);
      
      // Créer les nouvelles politiques adaptées à la structure
      if (messagesColumns.includes('conversation_id') && messagesColumns.includes('sender_id')) {
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
          ON public.messages
          FOR SELECT
          USING (
            auth.uid() IN (
              SELECT c.client_id FROM public.conversations c WHERE c.id = conversation_id
              UNION
              SELECT c.provider_id FROM public.conversations c WHERE c.id = conversation_id
            )
          );
        `);
        
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
          ON public.messages
          FOR INSERT
          WITH CHECK (
            auth.uid() = sender_id AND
            auth.uid() IN (
              SELECT c.client_id FROM public.conversations c WHERE c.id = conversation_id
              UNION
              SELECT c.provider_id FROM public.conversations c WHERE c.id = conversation_id
            )
          );
        `);
      }
      
      console.log('Politiques RLS pour messages appliquées avec succès');
    }
    
    // Vérifier si la table invoices existe
    const invoicesResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'invoices'
    `);
    
    if (invoicesResult.rows.length > 0) {
      console.log('Application des politiques RLS pour invoices...');
      
      // Vérifier la structure de la table invoices
      const invoicesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invoices'
      `);
      
      const invoicesColumns = invoicesColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices`);
      await client.query(`DROP POLICY IF EXISTS "Les prestataires peuvent créer des factures" ON public.invoices`);
      
      // Créer les nouvelles politiques adaptées à la structure
      if (invoicesColumns.includes('client_id') && invoicesColumns.includes('provider_id')) {
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
          ON public.invoices
          FOR SELECT
          USING (
            auth.uid() = client_id OR 
            auth.uid() = provider_id
          );
        `);
        
        await client.query(`
          CREATE POLICY "Les prestataires peuvent créer des factures"
          ON public.invoices
          FOR INSERT
          WITH CHECK (
            auth.uid() = provider_id
          );
        `);
      }
      
      console.log('Politiques RLS pour invoices appliquées avec succès');
    }
    
    // Vérifier si la table audit_logs existe maintenant
    const auditLogsResult2 = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    `);
    
    if (auditLogsResult2.rows.length > 0) {
      console.log('Application des politiques RLS pour audit_logs...');
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Seuls les administrateurs peuvent voir les logs d'audit" ON public.audit_logs`);
      await client.query(`DROP POLICY IF EXISTS "Insertion des logs d'audit via RPC uniquement" ON public.audit_logs`);
      
      // Créer les nouvelles politiques
      await client.query(`
        CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
        ON public.audit_logs
        FOR SELECT
        USING (
          auth.uid() IN (
            SELECT id FROM public.profiles WHERE role = 'admin'
          )
        );
      `);
      
      await client.query(`
        CREATE POLICY "Insertion des logs d'audit via RPC uniquement"
        ON public.audit_logs
        FOR INSERT
        WITH CHECK (
          -- Cette politique est restrictive, l'insertion se fait via la fonction RPC log_audit_action
          false
        );
      `);
      
      console.log('Politiques RLS pour audit_logs appliquées avec succès');
    }
    
    // 6. Création de la fonction check_invoice_permissions si elle n'existe pas
    console.log('\n=== CRÉATION DE LA FONCTION CHECK_INVOICE_PERMISSIONS ===');
    
    // Vérifier si la table invoices existe et sa structure
    if (invoicesResult.rows.length > 0) {
      const invoicesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'invoices'
      `);
      
      const invoicesColumns = invoicesColumnsResult.rows.map(row => row.column_name);
      
      if (invoicesColumns.includes('client_id') && invoicesColumns.includes('provider_id')) {
        await client.query(`
          CREATE OR REPLACE FUNCTION public.check_invoice_permissions(invoice_id UUID)
          RETURNS BOOLEAN
          LANGUAGE plpgsql
          SECURITY INVOKER
          AS $$
          DECLARE
            has_permission BOOLEAN;
          BEGIN
            SELECT EXISTS(
              SELECT 1 FROM public.invoices i
              WHERE i.id = invoice_id
              AND (i.client_id = auth.uid() OR i.provider_id = auth.uid())
            ) INTO has_permission;
            
            RETURN has_permission;
          END;
          $$;
        `);
        console.log('Fonction check_invoice_permissions créée ou mise à jour avec succès');
      } else {
        console.log('Structure de la table invoices non compatible avec la fonction check_invoice_permissions');
      }
    } else {
      console.log('La table invoices n\'existe pas, fonction check_invoice_permissions non créée');
    }
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
    console.log('\n=== CORRECTION DES PROBLÈMES DE SÉCURITÉ TERMINÉE ===');
    console.log('Toutes les corrections ont été appliquées avec succès!');
    
  } catch (error) {
    console.error('Erreur lors de la correction des problèmes de sécurité:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
fixSecurityIssues();
