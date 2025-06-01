/**
 * Script pour corriger les dernières alertes de sécurité liées à PostGIS
 * - Conversion de la vue secure_spatial_ref_sys en SECURITY INVOKER
 * - Tentative d'activation du RLS sur spatial_ref_sys
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

async function fixPostGISSecurity() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // 1. Corriger la vue secure_spatial_ref_sys (SECURITY DEFINER -> INVOKER)
    console.log('\n=== CORRECTION DE LA VUE secure_spatial_ref_sys ===');
    
    try {
      // Vérifier si la vue existe
      const viewCheck = await client.query(`
        SELECT viewname, definition 
        FROM pg_views 
        WHERE viewname = 'secure_spatial_ref_sys';
      `);
      
      if (viewCheck.rows.length === 0) {
        console.log('⚠️ La vue secure_spatial_ref_sys n\'existe pas, création...');
        
        // Créer la vue avec SECURITY INVOKER explicitement
        await client.query(`
          CREATE VIEW public.secure_spatial_ref_sys
          WITH (security_invoker=true)
          AS SELECT * FROM public.spatial_ref_sys;
        `);
        console.log('✅ Vue secure_spatial_ref_sys créée avec SECURITY INVOKER');
      } else {
        console.log('Vue existante: ' + viewCheck.rows[0].definition);
        
        // Recréer la vue avec SECURITY INVOKER
        console.log('Recréation de la vue avec SECURITY INVOKER...');
        await client.query(`DROP VIEW IF EXISTS public.secure_spatial_ref_sys;`);
        
        await client.query(`
          CREATE VIEW public.secure_spatial_ref_sys
          WITH (security_invoker=true)
          AS SELECT * FROM public.spatial_ref_sys;
        `);
        console.log('✅ Vue secure_spatial_ref_sys recréée avec SECURITY INVOKER');
      }
      
      // Vérifier que la vue a été créée correctement avec SECURITY INVOKER
      const securityCheck = await client.query(`
        SELECT viewname, 
               pg_catalog.pg_get_userbyid(viewowner) as owner,
               security_invoker
        FROM pg_views v
        JOIN pg_class c ON v.viewname = c.relname AND c.relkind = 'v'
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE viewname = 'secure_spatial_ref_sys'
        AND n.nspname = 'public';
      `);
      
      if (securityCheck.rows.length > 0 && securityCheck.rows[0].security_invoker === true) {
        console.log('✅ Confirmation: la vue a bien SECURITY INVOKER activé');
      } else if (securityCheck.rows.length > 0) {
        console.log('⚠️ La vue existe mais n\'a pas SECURITY INVOKER activé');
        
        // Essayer une autre approche
        try {
          await client.query(`
            ALTER VIEW public.secure_spatial_ref_sys SECURITY INVOKER;
          `);
          console.log('✅ SECURITY INVOKER appliqué via ALTER VIEW');
        } catch (alterErr) {
          console.error(`❌ Erreur lors de l'ALTER VIEW: ${alterErr.message}`);
          
          // Dernière tentative avec une syntaxe différente
          try {
            await client.query(`
              ALTER VIEW public.secure_spatial_ref_sys SET (security_invoker=true);
            `);
            console.log('✅ SECURITY INVOKER appliqué via ALTER VIEW SET');
          } catch (setErr) {
            console.error(`❌ Erreur lors de l'ALTER VIEW SET: ${setErr.message}`);
          }
        }
      } else {
        console.log('❌ Impossible de vérifier les propriétés de sécurité de la vue');
      }
      
    } catch (viewErr) {
      console.error(`❌ Erreur lors de la gestion de la vue: ${viewErr.message}`);
    }
    
    // 2. Tentatives d'activation du RLS sur spatial_ref_sys
    console.log('\n=== TENTATIVES D\'ACTIVATION RLS SUR spatial_ref_sys ===');
    
    try {
      // Vérifier si le RLS est déjà activé
      const rlsCheck = await client.query(`
        SELECT relname, relrowsecurity
        FROM pg_class
        WHERE relname = 'spatial_ref_sys'
        AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `);
      
      if (rlsCheck.rows.length > 0 && rlsCheck.rows[0].relrowsecurity === true) {
        console.log('✅ Le RLS est déjà activé sur spatial_ref_sys');
      } else {
        console.log('⚠️ Le RLS n\'est pas activé sur spatial_ref_sys, tentative d\'activation...');
        
        // Tentative directe
        try {
          await client.query(`
            ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
          `);
          console.log('✅ RLS activé sur spatial_ref_sys');
          
          // Créer une politique par défaut
          await client.query(`
            CREATE POLICY "Lecture publique" ON public.spatial_ref_sys
            FOR SELECT
            USING (true);
          `);
          console.log('✅ Politique de lecture créée sur spatial_ref_sys');
          
        } catch (rlsErr) {
          console.error(`❌ Erreur lors de l'activation RLS: ${rlsErr.message}`);
          
          // Approche alternative avec superuser
          console.log('⚠️ L\'activation RLS nécessite des privilèges élevés');
          console.log('⚠️ Alternative: créer une vue sécurisée et utiliser des wrappers de fonction');
          
          // Vérifier si on peut créer des fonctions d'accès sécurisées
          try {
            // Fonction sécurisée pour récupérer un SRID spécifique
            await client.query(`
              CREATE OR REPLACE FUNCTION public.get_srid_info(p_srid integer)
              RETURNS TABLE (
                srid integer,
                auth_name varchar,
                auth_srid integer,
                srtext varchar,
                proj4text varchar
              )
              LANGUAGE sql
              STABLE
              SECURITY INVOKER
              SET search_path = public
              AS $$
                SELECT srid, auth_name, auth_srid, srtext, proj4text
                FROM public.spatial_ref_sys
                WHERE srid = p_srid;
              $$;
            `);
            console.log('✅ Fonction get_srid_info créée avec succès');
            
            // Fonction pour rechercher un SRID par nom
            await client.query(`
              CREATE OR REPLACE FUNCTION public.search_srid(p_search text)
              RETURNS TABLE (
                srid integer,
                auth_name varchar,
                auth_srid integer,
                srtext varchar,
                proj4text varchar
              )
              LANGUAGE sql
              STABLE
              SECURITY INVOKER
              SET search_path = public
              AS $$
                SELECT srid, auth_name, auth_srid, srtext, proj4text
                FROM public.spatial_ref_sys
                WHERE srtext ILIKE '%' || p_search || '%'
                OR auth_name ILIKE '%' || p_search || '%';
              $$;
            `);
            console.log('✅ Fonction search_srid créée avec succès');
            
          } catch (funcErr) {
            console.error(`❌ Erreur lors de la création des fonctions: ${funcErr.message}`);
          }
        }
      }
      
    } catch (checkErr) {
      console.error(`❌ Erreur lors de la vérification RLS: ${checkErr.message}`);
    }
    
    // 3. Vérifier si PostGIS est dans une extension privée
    console.log('\n=== VÉRIFICATION DU SCHÉMA DE POSTGIS ===');
    
    try {
      const postgisSchema = await client.query(`
        SELECT n.nspname as schema_name
        FROM pg_extension e
        JOIN pg_namespace n ON n.oid = e.extnamespace
        WHERE e.extname = 'postgis';
      `);
      
      if (postgisSchema.rows.length > 0) {
        console.log(`PostGIS est actuellement dans le schéma: ${postgisSchema.rows[0].schema_name}`);
        
        if (postgisSchema.rows[0].schema_name === 'public') {
          console.log('⚠️ PostGIS est toujours dans le schéma public');
          console.log('⚠️ Cette alerte ne peut être corrigée que par le support Supabase');
        } else {
          console.log('✅ PostGIS n\'est pas dans le schéma public');
        }
      } else {
        console.log('❌ Impossible de déterminer le schéma de PostGIS');
      }
      
    } catch (schemaErr) {
      console.error(`❌ Erreur lors de la vérification du schéma: ${schemaErr.message}`);
    }
    
    // Résumé et recommandations
    console.log('\n=== RÉSUMÉ ET RECOMMANDATIONS ===');
    console.log('1. Vue secure_spatial_ref_sys: tentative de correction en SECURITY INVOKER');
    console.log('2. Table spatial_ref_sys: tentative d\'activation RLS');
    console.log('3. Fonctions sécurisées créées pour accéder à spatial_ref_sys');
    console.log('\n⚠️ Note importante: Ces alertes sont liées à PostGIS, une extension système');
    console.log('   La solution complète nécessite l\'intervention du support Supabase');
    console.log('   Contactez-les avec les détails suivants:');
    console.log(`
Objet: Correction des alertes de sécurité liées à PostGIS

Bonjour,

Le Security Advisor de Supabase a identifié des problèmes de sécurité dans notre base de données que nous ne pouvons pas résoudre sans privilèges administrateur:

1. Extension PostGIS installée dans le schéma public
2. Table spatial_ref_sys sans RLS activé

Nos tentatives de correction ont échoué avec les erreurs:
- "extension postgis does not support SET SCHEMA"
- "must be owner of table spatial_ref_sys"

Pourriez-vous nous aider à résoudre ces problèmes de sécurité?

Détails du projet:
- Projet: FloService
- Référence: sxrofrdhpzpjqkplgoij

Merci pour votre aide,
    `);
    
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
fixPostGISSecurity().catch(console.error);
