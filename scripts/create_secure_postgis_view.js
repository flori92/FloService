/**
 * Script pour créer une vue sécurisée pour la table spatial_ref_sys
 * Alternative temporaire en attendant la réponse du support Supabase
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

async function createSecurePostGISView() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier si la vue existe déjà
    console.log('\n=== VÉRIFICATION DE LA VUE EXISTANTE ===');
    const viewCheck = await client.query(`
      SELECT 1 FROM pg_views WHERE viewname = 'secure_spatial_ref_sys';
    `);
    
    if (viewCheck.rows.length > 0) {
      console.log('⚠️ La vue secure_spatial_ref_sys existe déjà');
      console.log('Suppression de la vue existante...');
      
      await client.query(`DROP VIEW IF EXISTS public.secure_spatial_ref_sys;`);
      console.log('✅ Vue existante supprimée');
    }
    
    // Créer une vue sécurisée pour spatial_ref_sys
    console.log('\n=== CRÉATION D\'UNE VUE SÉCURISÉE ===');
    try {
      await client.query(`
        CREATE OR REPLACE VIEW public.secure_spatial_ref_sys AS
        SELECT * FROM public.spatial_ref_sys;
      `);
      console.log('✅ Vue secure_spatial_ref_sys créée');
      
      // Appliquer SECURITY INVOKER à la vue
      await client.query(`
        ALTER VIEW public.secure_spatial_ref_sys SECURITY INVOKER;
      `);
      console.log('✅ SECURITY INVOKER appliqué à la vue');
      
      // Créer une fonction d'aide pour utiliser la vue
      await client.query(`
        CREATE OR REPLACE FUNCTION public.get_spatial_ref_sys(srid integer)
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
          SELECT * FROM public.secure_spatial_ref_sys WHERE srid = $1;
        $$;
      `);
      console.log('✅ Fonction d\'aide get_spatial_ref_sys créée');
      
      // Essayer de créer une fonction d'accès global sécurisée
      try {
        await client.query(`
          CREATE OR REPLACE FUNCTION public.get_all_spatial_ref_sys()
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
            SELECT * FROM public.secure_spatial_ref_sys;
          $$;
        `);
        console.log('✅ Fonction get_all_spatial_ref_sys créée');
      } catch (funcErr) {
        console.error(`❌ Erreur lors de la création de la fonction globale: ${funcErr.message}`);
      }
      
      // Vérifier que la vue a été créée correctement
      const viewData = await client.query(`
        SELECT * FROM public.secure_spatial_ref_sys LIMIT 1;
      `);
      
      if (viewData.rows.length > 0) {
        console.log('✅ Vue accessible et fonctionnelle');
      } else {
        console.log('⚠️ La vue a été créée mais ne contient pas de données');
      }
      
    } catch (viewErr) {
      console.error(`❌ Erreur lors de la création de la vue: ${viewErr.message}`);
    }
    
    // Documentation et recommandations
    console.log('\n=== RECOMMANDATIONS D\'UTILISATION ===');
    console.log('1. Utilisez la vue secure_spatial_ref_sys au lieu de spatial_ref_sys directement');
    console.log('2. Pour un accès par SRID, utilisez la fonction get_spatial_ref_sys(srid)');
    console.log('3. Pour un accès à toutes les entrées, utilisez get_all_spatial_ref_sys()');
    console.log('4. Ces solutions sont des contournements temporaires en attendant la réponse du support');
    
    console.log('\n=== MISE À JOUR DES FONCTIONS EXISTANTES ===');
    console.log('⚠️ Note: Les fonctions qui utilisent directement spatial_ref_sys devront être modifiées');
    console.log('   pour utiliser la vue ou les fonctions d\'aide à la place.');
    
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
createSecurePostGISView().catch(console.error);
