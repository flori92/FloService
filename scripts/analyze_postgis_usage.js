/**
 * Script pour analyser l'utilisation de PostGIS dans la base de données
 * et déterminer s'il est sécuritaire de le désinstaller
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

async function analyzePostGISUsage() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier quelles extensions sont installées
    console.log('\n=== EXTENSIONS INSTALLÉES ===');
    const extensions = await client.query(`
      SELECT extname, extversion, n.nspname as schema_name
      FROM pg_extension e
      JOIN pg_namespace n ON n.oid = e.extnamespace
      ORDER BY extname;
    `);
    
    console.log('Extensions trouvées:');
    extensions.rows.forEach(ext => {
      console.log(`- ${ext.extname} v${ext.extversion} (schéma ${ext.schema_name})`);
    });
    
    // Rechercher les tables PostGIS (geometry_columns, spatial_ref_sys, etc.)
    console.log('\n=== TABLES LIÉES À POSTGIS ===');
    const postgisTables = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns')
      ORDER BY table_schema, table_name;
    `);
    
    console.log('Tables PostGIS trouvées:');
    postgisTables.rows.forEach(table => {
      console.log(`- ${table.table_schema}.${table.table_name}`);
    });
    
    // Rechercher les colonnes de type geometry/geography dans les tables utilisateur
    console.log('\n=== UTILISATION DE TYPES GÉOSPATIAUX DANS LES TABLES ===');
    const geoColumns = await client.query(`
      SELECT t.table_schema, t.table_name, c.column_name, c.data_type, c.udt_name
      FROM information_schema.tables t
      JOIN information_schema.columns c ON 
        t.table_schema = c.table_schema AND 
        t.table_name = c.table_name
      WHERE t.table_schema = 'public'
      AND c.udt_name IN ('geometry', 'geography')
      ORDER BY t.table_schema, t.table_name, c.column_name;
    `);
    
    if (geoColumns.rows.length === 0) {
      console.log('Aucune colonne utilisant des types géospatiaux n\'a été trouvée.');
    } else {
      console.log('Colonnes utilisant des types géospatiaux:');
      geoColumns.rows.forEach(col => {
        console.log(`- ${col.table_schema}.${col.table_name}.${col.column_name} (${col.udt_name})`);
      });
    }
    
    // Rechercher les fonctions qui pourraient utiliser PostGIS
    console.log('\n=== FONCTIONS UTILISANT POSTGIS ===');
    const geoFunctions = await client.query(`
      SELECT n.nspname AS schema, p.proname AS function_name
      FROM pg_proc p
      JOIN pg_namespace n ON p.pronamespace = n.oid
      WHERE p.prosrc LIKE '%ST_%' OR p.prosrc LIKE '%geometry%' OR p.prosrc LIKE '%geography%'
      AND n.nspname = 'public'
      ORDER BY n.nspname, p.proname;
    `);
    
    if (geoFunctions.rows.length === 0) {
      console.log('Aucune fonction utilisant PostGIS n\'a été trouvée.');
    } else {
      console.log('Fonctions susceptibles d\'utiliser PostGIS:');
      geoFunctions.rows.forEach(func => {
        console.log(`- ${func.schema}.${func.function_name}`);
      });
    }
    
    // Vérifier les permissions pour supprimer l'extension
    console.log('\n=== PERMISSIONS POUR SUPPRIMER POSTGIS ===');
    try {
      // Tester les permissions de manière sécurisée
      await client.query('BEGIN');
      try {
        await client.query('DROP EXTENSION IF EXISTS postgis_topology');
        console.log('✅ Permission pour supprimer l\'extension postgis_topology');
      } catch (err) {
        console.log(`❌ Pas de permission pour supprimer postgis_topology: ${err.message}`);
      }
      
      try {
        // Ne pas vraiment supprimer, juste tester
        await client.query('DROP EXTENSION IF EXISTS postgis_tiger_geocoder');
        console.log('✅ Permission pour supprimer l\'extension postgis_tiger_geocoder');
      } catch (err) {
        console.log(`❌ Pas de permission pour supprimer postgis_tiger_geocoder: ${err.message}`);
      }
      
      try {
        // Test pour déplacer le schéma
        await client.query('ALTER EXTENSION postgis SET SCHEMA extensions');
        console.log('✅ Permission pour déplacer l\'extension postgis');
      } catch (err) {
        console.log(`❌ Pas de permission pour déplacer postgis: ${err.message}`);
      }
      
      await client.query('ROLLBACK');
      console.log('✓ Test de permissions terminé (aucune modification permanente)');
    } catch (err) {
      console.error(`Erreur lors du test de permissions: ${err.message}`);
      await client.query('ROLLBACK');
    }
    
    // Résumé et recommandations
    console.log('\n=== ANALYSE ET RECOMMANDATIONS ===');
    
    if (geoColumns.rows.length === 0 && geoFunctions.rows.length === 0) {
      console.log('✅ RECOMMANDATION: L\'application ne semble pas utiliser PostGIS activement.');
      console.log('   Vous pourriez envisager de désinstaller l\'extension, mais:');
      console.log('   1. Vérifiez d\'abord le code source pour confirmer qu\'aucune fonctionnalité ne dépend de PostGIS');
      console.log('   2. Créez une sauvegarde de la base avant toute modification');
      console.log('   3. Testez toutes les fonctionnalités après la suppression');
    } else {
      console.log('⚠️ ATTENTION: L\'application semble utiliser PostGIS.');
      console.log(`   - ${geoColumns.rows.length} colonnes utilisent des types géospatiaux`);
      console.log(`   - ${geoFunctions.rows.length} fonctions utilisent potentiellement PostGIS`);
      console.log('');
      console.log('   RECOMMANDATION: Ne désinstallez PAS l\'extension, mais:');
      console.log('   1. Contactez le support Supabase pour déplacer l\'extension vers un schéma dédié');
      console.log('   2. Ou créez une copie de l\'extension dans un schéma dédié (requiert des privilèges)');
    }
    
    // Options possibles
    console.log('\n=== OPTIONS DISPONIBLES ===');
    console.log('1. Contacter le support Supabase (solution recommandée)');
    console.log('2. Ajouter des politiques RLS à la table spatial_ref_sys (nécessite des privilèges)');
    console.log('3. Créer une vue sécurisée sur spatial_ref_sys avec RLS');
    console.log('4. Désinstaller PostGIS (risqué si l\'application l\'utilise)');
    console.log('5. Ignorer cette alerte si elle est acceptable pour votre niveau de sécurité');
    
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
analyzePostGISUsage().catch(console.error);
