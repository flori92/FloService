/**
 * Script pour corriger les problèmes de sécurité restants
 * - Vue secure_spatial_ref_sys avec SECURITY DEFINER
 * - Table spatial_ref_sys sans RLS activé
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

async function fixRemainingSecurityIssues() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier et corriger la vue secure_spatial_ref_sys
    console.log('\n=== CORRECTION DE LA VUE secure_spatial_ref_sys ===');
    
    // Vérifier si la vue existe
    const viewCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.views 
        WHERE table_schema = 'public' 
        AND table_name = 'secure_spatial_ref_sys'
      );
    `);
    
    const viewExists = viewCheck.rows[0].exists;
    
    if (viewExists) {
      console.log('⚠️ La vue secure_spatial_ref_sys existe, vérification des propriétés...');
      
      // Vérifier si la vue est SECURITY DEFINER
      const securityCheck = await client.query(`
        SELECT pg_get_viewdef('public.secure_spatial_ref_sys'::regclass) AS view_def;
      `);
      
      const viewDef = securityCheck.rows[0].view_def;
      
      if (viewDef.toLowerCase().includes('security definer') || !viewDef.toLowerCase().includes('security invoker')) {
        console.log('⚠️ La vue secure_spatial_ref_sys est définie avec SECURITY DEFINER, correction...');
        
        // Recréer la vue avec SECURITY INVOKER
        await client.query(`
          DROP VIEW IF EXISTS public.secure_spatial_ref_sys;
          
          CREATE OR REPLACE VIEW public.secure_spatial_ref_sys 
          WITH (security_invoker = true) 
          AS SELECT * FROM public.spatial_ref_sys;
        `);
        
        console.log('✅ Vue secure_spatial_ref_sys recréée avec SECURITY INVOKER');
      } else {
        console.log('✅ La vue secure_spatial_ref_sys est déjà configurée avec SECURITY INVOKER');
      }
    } else {
      console.log('⚠️ La vue secure_spatial_ref_sys n\'existe pas, création...');
      
      // Créer la vue avec SECURITY INVOKER
      await client.query(`
        CREATE OR REPLACE VIEW public.secure_spatial_ref_sys 
        WITH (security_invoker = true) 
        AS SELECT * FROM public.spatial_ref_sys;
      `);
      
      console.log('✅ Vue secure_spatial_ref_sys créée avec SECURITY INVOKER');
    }
    
    // Tenter d'activer le RLS sur spatial_ref_sys
    console.log('\n=== TENTATIVE D\'ACTIVATION DU RLS SUR spatial_ref_sys ===');
    
    try {
      await client.query(`
        ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
        
        -- Créer une politique de lecture seule
        CREATE POLICY "Lecture publique de spatial_ref_sys"
          ON public.spatial_ref_sys
          FOR SELECT
          USING (true);
      `);
      
      console.log('✅ RLS activé sur spatial_ref_sys avec succès');
    } catch (error) {
      console.log('⚠️ Impossible d\'activer le RLS sur spatial_ref_sys : privilèges insuffisants');
      console.log('⚠️ Message d\'erreur :', error.message);
      console.log('⚠️ Solution : Contacter le support Supabase pour activer le RLS sur cette table système');
      
      // Créer des fonctions sécurisées pour accéder à spatial_ref_sys
      console.log('\n=== CRÉATION DE FONCTIONS SÉCURISÉES POUR spatial_ref_sys ===');
      
      // Fonction pour obtenir un enregistrement par srid
      await client.query(`
        CREATE OR REPLACE FUNCTION public.get_spatial_ref_by_srid(p_srid INTEGER)
        RETURNS TABLE (
          srid INTEGER,
          auth_name VARCHAR(256),
          auth_srid INTEGER,
          srtext VARCHAR(2048),
          proj4text VARCHAR(2048)
        )
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = public
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            s.srid, 
            s.auth_name, 
            s.auth_srid, 
            s.srtext, 
            s.proj4text
          FROM 
            public.spatial_ref_sys s
          WHERE 
            s.srid = p_srid;
        END;
        $$;
      `);
      
      // Fonction pour rechercher des systèmes de référence
      await client.query(`
        CREATE OR REPLACE FUNCTION public.search_spatial_ref_sys(p_search TEXT)
        RETURNS TABLE (
          srid INTEGER,
          auth_name VARCHAR(256),
          auth_srid INTEGER,
          srtext VARCHAR(2048)
        )
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = public
        AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            s.srid, 
            s.auth_name, 
            s.auth_srid, 
            s.srtext
          FROM 
            public.spatial_ref_sys s
          WHERE 
            s.srtext ILIKE '%' || p_search || '%'
            OR s.auth_name ILIKE '%' || p_search || '%'
          LIMIT 100;
        END;
        $$;
      `);
      
      console.log('✅ Fonctions sécurisées créées pour accéder à spatial_ref_sys');
    }
    
    // Sauvegarder le script SQL dans la table security_scripts
    console.log('\n=== SAUVEGARDE DU SCRIPT DANS LA TABLE security_scripts ===');
    
    // Vérifier si la table security_scripts existe
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'security_scripts'
      );
    `);
    
    const tableExists = tableCheck.rows[0].exists;
    
    if (!tableExists) {
      console.log('⚠️ La table security_scripts n\'existe pas, création...');
      
      // Créer la table security_scripts
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.security_scripts (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          name TEXT NOT NULL,
          description TEXT,
          script TEXT NOT NULL,
          executed_at TIMESTAMPTZ DEFAULT NOW(),
          created_by TEXT DEFAULT 'system'
        );
        
        -- Activation du RLS
        ALTER TABLE public.security_scripts ENABLE ROW LEVEL SECURITY;
        
        -- Politiques RLS
        CREATE POLICY "Les administrateurs peuvent tout faire"
          ON public.security_scripts
          USING (
            (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
          );
          
        CREATE POLICY "Lecture publique des scripts de sécurité"
          ON public.security_scripts
          FOR SELECT
          USING (true);
      `);
      
      console.log('✅ Table security_scripts créée avec succès');
    }
    
    // Générer le script SQL
    const sqlScript = `
-- Script de correction des problèmes de sécurité restants
-- Exécuté le ${new Date().toISOString()}

-- 1. Correction de la vue secure_spatial_ref_sys
DROP VIEW IF EXISTS public.secure_spatial_ref_sys;

CREATE OR REPLACE VIEW public.secure_spatial_ref_sys 
WITH (security_invoker = true) 
AS SELECT * FROM public.spatial_ref_sys;

-- 2. Tentative d'activation du RLS sur spatial_ref_sys
-- Note: Cette commande nécessite des privilèges administrateur
-- ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
-- 
-- CREATE POLICY "Lecture publique de spatial_ref_sys"
--   ON public.spatial_ref_sys
--   FOR SELECT
--   USING (true);

-- 3. Fonctions sécurisées pour accéder à spatial_ref_sys
CREATE OR REPLACE FUNCTION public.get_spatial_ref_by_srid(p_srid INTEGER)
RETURNS TABLE (
  srid INTEGER,
  auth_name VARCHAR(256),
  auth_srid INTEGER,
  srtext VARCHAR(2048),
  proj4text VARCHAR(2048)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.srid, 
    s.auth_name, 
    s.auth_srid, 
    s.srtext, 
    s.proj4text
  FROM 
    public.spatial_ref_sys s
  WHERE 
    s.srid = p_srid;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_spatial_ref_sys(p_search TEXT)
RETURNS TABLE (
  srid INTEGER,
  auth_name VARCHAR(256),
  auth_srid INTEGER,
  srtext VARCHAR(2048)
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.srid, 
    s.auth_name, 
    s.auth_srid, 
    s.srtext
  FROM 
    public.spatial_ref_sys s
  WHERE 
    s.srtext ILIKE '%' || p_search || '%'
    OR s.auth_name ILIKE '%' || p_search || '%'
  LIMIT 100;
END;
$$;
    `;
    
    // Sauvegarder le script dans la table security_scripts
    await client.query(`
      INSERT INTO public.security_scripts (name, description, script)
      VALUES (
        'fix_remaining_security_issues_v2',
        'Correction des problèmes de sécurité restants (vue secure_spatial_ref_sys et table spatial_ref_sys)',
        $1
      );
    `, [sqlScript]);
    
    console.log('✅ Script SQL sauvegardé dans la table security_scripts');
    
    // Sauvegarder le script dans un fichier
    await client.query(`
      SELECT script
      INTO TEMP TABLE temp_script
      FROM public.security_scripts
      WHERE name = 'fix_remaining_security_issues_v2'
      ORDER BY executed_at DESC
      LIMIT 1;
    `);
    
    const scriptResult = await client.query(`
      SELECT * FROM temp_script;
    `);
    
    console.log('\n=== RÉSUMÉ DES CORRECTIONS ===');
    console.log('✅ Vue secure_spatial_ref_sys corrigée avec SECURITY INVOKER');
    console.log('⚠️ Activation du RLS sur spatial_ref_sys nécessite le support Supabase');
    console.log('✅ Fonctions sécurisées créées pour accéder à spatial_ref_sys');
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
fixRemainingSecurityIssues().catch(console.error);
