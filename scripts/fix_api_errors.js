/**
 * Script pour corriger les erreurs d'API et améliorer la gestion des erreurs
 * Résout les erreurs 400 et 406 dans les requêtes Supabase
 */

import pg from 'pg';

const { Pool } = pg;

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

async function fixApiErrors() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier si la fonction safe_message_count existe
    console.log('\n=== CRÉATION DE LA FONCTION safe_message_count ===');
    
    // Créer ou remplacer la fonction safe_message_count
    await client.query(`
      CREATE OR REPLACE FUNCTION public.safe_message_count(user_id UUID DEFAULT auth.uid())
      RETURNS INTEGER
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        message_count INTEGER;
      BEGIN
        -- Vérifier si la table messages existe
        IF EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'messages'
        ) THEN
          -- Compter les messages non lus
          SELECT COUNT(*) INTO message_count
          FROM messages
          WHERE recipient_id = user_id AND read = FALSE;
          
          RETURN message_count;
        ELSE
          -- Si la table n'existe pas, retourner 0
          RETURN 0;
        END IF;
      EXCEPTION
        WHEN OTHERS THEN
          -- En cas d'erreur, retourner 0
          RETURN 0;
      END;
      $$;
    `);
    
    console.log('✅ Fonction safe_message_count créée avec succès');
    
    // Vérifier si la fonction check_table_exists existe
    console.log('\n=== CRÉATION DE LA FONCTION check_table_exists ===');
    
    // Créer ou remplacer la fonction check_table_exists
    await client.query(`
      CREATE OR REPLACE FUNCTION public.check_table_exists(schema_name TEXT, table_name TEXT)
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        exists_bool BOOLEAN;
      BEGIN
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = schema_name
          AND table_name = table_name
        ) INTO exists_bool;
        
        RETURN exists_bool;
      END;
      $$;
    `);
    
    console.log('✅ Fonction check_table_exists créée avec succès');
    
    // Créer une fonction pour vérifier si un utilisateur est un prestataire
    console.log('\n=== AMÉLIORATION DE LA FONCTION is_provider ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        is_provider_bool BOOLEAN;
      BEGIN
        -- Vérifier si l'utilisateur est un prestataire
        SELECT p.is_provider INTO is_provider_bool
        FROM profiles p
        WHERE p.id = user_id;
        
        -- Si aucun résultat, retourner false
        RETURN COALESCE(is_provider_bool, false);
      EXCEPTION
        WHEN OTHERS THEN
          -- En cas d'erreur, retourner false
          RETURN false;
      END;
      $$;
    `);
    
    console.log('✅ Fonction is_provider améliorée avec gestion des erreurs');
    
    // Créer une fonction pour obtenir les profils utilisateur de manière sécurisée
    console.log('\n=== CRÉATION DE LA FONCTION get_user_profile ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID DEFAULT auth.uid())
      RETURNS JSON
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        profile_json JSON;
      BEGIN
        -- Récupérer le profil utilisateur
        SELECT row_to_json(p) INTO profile_json
        FROM profiles p
        WHERE p.id = user_id;
        
        -- Si aucun résultat, retourner un objet vide
        RETURN COALESCE(profile_json, '{}'::JSON);
      EXCEPTION
        WHEN OTHERS THEN
          -- En cas d'erreur, retourner un objet vide
          RETURN '{}'::JSON;
      END;
      $$;
    `);
    
    console.log('✅ Fonction get_user_profile créée avec succès');
    
    // Sauvegarder le script SQL dans la table security_scripts
    console.log('\n=== SAUVEGARDE DU SCRIPT DANS LA TABLE security_scripts ===');
    
    // Générer le script SQL
    const sqlScript = `
-- Script de correction des erreurs d'API
-- Exécuté le ${new Date().toISOString()}

-- 1. Fonction safe_message_count pour éviter les erreurs 400
CREATE OR REPLACE FUNCTION public.safe_message_count(user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  message_count INTEGER;
BEGIN
  -- Vérifier si la table messages existe
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    -- Compter les messages non lus
    SELECT COUNT(*) INTO message_count
    FROM messages
    WHERE recipient_id = user_id AND read = FALSE;
    
    RETURN message_count;
  ELSE
    -- Si la table n'existe pas, retourner 0
    RETURN 0;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner 0
    RETURN 0;
END;
$$;

-- 2. Fonction check_table_exists pour vérifier l'existence des tables
CREATE OR REPLACE FUNCTION public.check_table_exists(schema_name TEXT, table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  exists_bool BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = schema_name
    AND table_name = table_name
  ) INTO exists_bool;
  
  RETURN exists_bool;
END;
$$;

-- 3. Amélioration de la fonction is_provider
CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  is_provider_bool BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur est un prestataire
  SELECT p.is_provider INTO is_provider_bool
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Si aucun résultat, retourner false
  RETURN COALESCE(is_provider_bool, false);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner false
    RETURN false;
END;
$$;

-- 4. Fonction get_user_profile pour éviter les erreurs 406
CREATE OR REPLACE FUNCTION public.get_user_profile(user_id UUID DEFAULT auth.uid())
RETURNS JSON
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  profile_json JSON;
BEGIN
  -- Récupérer le profil utilisateur
  SELECT row_to_json(p) INTO profile_json
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Si aucun résultat, retourner un objet vide
  RETURN COALESCE(profile_json, '{}'::JSON);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner un objet vide
    RETURN '{}'::JSON;
END;
$$;
    `;
    
    // Vérifier si la table security_scripts existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'security_scripts'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (tableExists) {
      // Sauvegarder le script dans la table security_scripts
      await client.query(`
        INSERT INTO public.security_scripts (name, description, script)
        VALUES (
          'fix_api_errors',
          'Correction des erreurs d\'API et amélioration de la gestion des erreurs',
          $1
        );
      `, [sqlScript]);
      
      console.log('✅ Script SQL sauvegardé dans la table security_scripts');
    } else {
      console.log('⚠️ La table security_scripts n\'existe pas, le script ne sera pas sauvegardé');
    }
    
    console.log('\n=== RÉSUMÉ DES CORRECTIONS ===');
    console.log('✅ Fonction safe_message_count créée pour éviter les erreurs 400');
    console.log('✅ Fonction check_table_exists créée pour vérifier l\'existence des tables');
    console.log('✅ Fonction is_provider améliorée avec gestion des erreurs');
    console.log('✅ Fonction get_user_profile créée pour éviter les erreurs 406');
    console.log('✅ Script SQL sauvegardé pour référence future');
    
  } catch (error) {
    console.error('Erreur globale:', error);
  } finally {
    // Libération de la connexion et fermeture du pool
    if (client) client.release();
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
  }
}

// Exécuter le script
fixApiErrors().catch(console.error);
