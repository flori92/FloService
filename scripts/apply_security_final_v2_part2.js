/**
 * Deuxième partie du script pour appliquer les politiques de sécurité RLS
 * Ce fichier est importé et exécuté par apply_security_final_v2.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration pour les chemins de fichiers en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applySecurityPoliciesPart2(client) {
  try {
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
      
      // Créer les nouvelles politiques adaptées à la structure réelle
      if (conversationsColumns.includes('participant1_id') && conversationsColumns.includes('participant2_id')) {
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
          ON public.conversations
          FOR SELECT
          USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);
        `);
        
        await client.query(`
          CREATE POLICY "Les utilisateurs peuvent créer des conversations"
          ON public.conversations
          FOR INSERT
          WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);
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
        // Récupérer la structure de la table conversations
        const conversationsColumnsResult = await client.query(`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'conversations'
        `);
        
        const conversationsColumns = conversationsColumnsResult.rows.map(row => row.column_name);
        
        if (conversationsColumns.includes('participant1_id') && conversationsColumns.includes('participant2_id')) {
          await client.query(`
            CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
            ON public.messages
            FOR SELECT
            USING (
              EXISTS (
                SELECT 1 FROM public.conversations c 
                WHERE c.id = conversation_id 
                AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
              )
            );
          `);
          
          await client.query(`
            CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
            ON public.messages
            FOR INSERT
            WITH CHECK (
              auth.uid() = sender_id AND
              EXISTS (
                SELECT 1 FROM public.conversations c 
                WHERE c.id = conversation_id 
                AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
              )
            );
          `);
        }
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
    
    // Vérifier si la table audit_logs existe
    const auditLogsResult = await client.query(`
      SELECT 1 FROM pg_tables 
      WHERE schemaname = 'public' AND tablename = 'audit_logs'
    `);
    
    if (auditLogsResult.rows.length > 0) {
      console.log('Application des politiques RLS pour audit_logs...');
      
      // Vérifier la structure de la table profiles
      const profilesColumnsResult = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'profiles'
      `);
      
      const profilesColumns = profilesColumnsResult.rows.map(row => row.column_name);
      
      // Supprimer les politiques existantes
      await client.query(`DROP POLICY IF EXISTS "Seuls les administrateurs peuvent voir les logs d'audit" ON public.audit_logs`);
      await client.query(`DROP POLICY IF EXISTS "Insertion des logs d'audit via RPC uniquement" ON public.audit_logs`);
      
      // Créer les nouvelles politiques adaptées à la structure
      if (profilesColumns.includes('is_admin')) {
        await client.query(`
          CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
          ON public.audit_logs
          FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM public.profiles 
              WHERE id = auth.uid() AND is_admin = true
            )
          );
        `);
      } else {
        // Politique par défaut si is_admin n'existe pas
        await client.query(`
          CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
          ON public.audit_logs
          FOR SELECT
          USING (
            -- Politique restrictive par défaut
            false
          );
        `);
      }
      
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
    
    // Création de la fonction check_invoice_permissions si elle n'existe pas
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
    
    // Création d'un script SQL pour référence future
    console.log('\n=== CRÉATION DU SCRIPT SQL DE RÉFÉRENCE ===');
    
    const sqlScript = `
-- Script de sécurité pour FloService
-- Généré automatiquement le ${new Date().toISOString()}

-- Activation du RLS sur toutes les tables utilisateur
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
DROP POLICY IF EXISTS "Accès public en lecture pour profiles" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;

CREATE POLICY "Accès public en lecture pour profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Politiques RLS pour services
DROP POLICY IF EXISTS "Accès public en lecture pour services" ON public.services;
DROP POLICY IF EXISTS "Les prestataires peuvent gérer leurs services" ON public.services;

CREATE POLICY "Accès public en lecture pour services"
ON public.services
FOR SELECT
USING (true);

CREATE POLICY "Les prestataires peuvent gérer leurs services"
ON public.services
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Politiques RLS pour bookings
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs réservations" ON public.bookings;
DROP POLICY IF EXISTS "Les clients peuvent créer des réservations" ON public.bookings;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings;

CREATE POLICY "Les utilisateurs peuvent voir leurs réservations"
ON public.bookings
FOR SELECT
USING (
  auth.uid() = client_id OR 
  auth.uid() IN (
    SELECT s.provider_id FROM public.services s WHERE s.id = service_id
  )
);

CREATE POLICY "Les clients peuvent créer des réservations"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = client_id);

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

-- Politiques RLS pour conversations
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations;

CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Les utilisateurs peuvent créer des conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Politiques RLS pour messages
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages;
DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages;

CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
  )
);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
  )
);

-- Politiques RLS pour invoices
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
DROP POLICY IF EXISTS "Les prestataires peuvent créer des factures" ON public.invoices;

CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
ON public.invoices
FOR SELECT
USING (
  auth.uid() = client_id OR 
  auth.uid() = provider_id
);

CREATE POLICY "Les prestataires peuvent créer des factures"
ON public.invoices
FOR INSERT
WITH CHECK (
  auth.uid() = provider_id
);

-- Politiques RLS pour audit_logs
DROP POLICY IF EXISTS "Seuls les administrateurs peuvent voir les logs d'audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Insertion des logs d'audit via RPC uniquement" ON public.audit_logs;

CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Insertion des logs d'audit via RPC uniquement"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  -- Cette politique est restrictive, l'insertion se fait via la fonction RPC log_audit_action
  false
);

-- Fonctions utilitaires
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
`;
    
    // Sauvegarder le script SQL dans un fichier
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'security_fixes_reference.sql');
    fs.writeFileSync(sqlFilePath, sqlScript);
    console.log(`Script SQL de référence créé et sauvegardé dans ${sqlFilePath}`);
    
    // Sauvegarder aussi dans la base de données
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.security_scripts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
      `);
      
      await client.query(`
        INSERT INTO public.security_scripts (name, content)
        VALUES ('security_fixes_reference', $1)
      `, [sqlScript]);
      
      console.log('Script SQL de référence sauvegardé dans la table security_scripts');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du script SQL dans la base de données:', error.message);
    }
    
    console.log('\n=== APPLICATION DES POLITIQUES DE SÉCURITÉ TERMINÉE ===');
    console.log('Toutes les politiques ont été appliquées avec succès!');
    console.log('Un script SQL de référence a été sauvegardé pour référence future');
    
  } catch (error) {
    console.error('Erreur dans la partie 2 de l\'application des politiques de sécurité:', error);
    throw error;
  }
}
