/**
 * Script pour appliquer les corrections étape par étape
 * Créé le 02/06/2025
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { paysAfrique } from '../data/paysAfrique.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à la base de données Supabase
const pool = new Pool({
  host: process.env.SUPABASE_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: parseInt(process.env.SUPABASE_PORT || '5432'),
  database: process.env.SUPABASE_DATABASE || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD || '',
  ssl: {
    rejectUnauthorized: false
  }
});

// Insère un pays et retourne son id (ou récupère l'id si déjà existant)
async function insertOrGetPaysId(pool, pays) {
  const res = await pool.query(
    'INSERT INTO pays (nom, code) VALUES ($1, $2) ON CONFLICT (nom) DO UPDATE SET code = EXCLUDED.code RETURNING id;',
    [pays.nom, pays.code]
  );
  return res.rows[0].id;
}

// Insère une ville pour un pays donné (évite les doublons)
async function insertVille(pool, nomVille, paysId) {
  await pool.query(
    'INSERT INTO villes (nom, pays_id) VALUES ($1, $2) ON CONFLICT (nom, pays_id) DO NOTHING;',
    [nomVille, paysId]
  );
}

// Seed des pays et villes
async function seedPaysEtVilles(pool) {
  console.log('\n🌍 Seed des pays et villes Afrique...');
  
  for (const pays of paysAfrique) {
    try {
      const paysId = await insertOrGetPaysId(pool, pays);
      for (const ville of pays.villes) {
        await insertVille(pool, ville, paysId);
      }
      console.log(`✅ Pays inséré : ${pays.nom} (${pays.code}), ${pays.villes.length} villes`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'insertion du pays ${pays.nom}:`, error.message);
    }
  }
}

// Exécute un script SQL à partir d'un fichier
async function executeSQL(pool, filePath, description) {
  console.log(`\n📋 ${description}...`);
  
  try {
    const sqlContent = fs.readFileSync(filePath, 'utf8');
    await pool.query(sqlContent);
    console.log(`✅ ${description} terminé avec succès!`);
    return true;
  } catch (error) {
    console.error(`❌ Erreur lors de ${description}:`, error.message);
    return false;
  }
}

// Fonction principale
async function main() {
  console.log('🔧 Application des corrections étape par étape...');
  
  try {
    // Test de connexion à la base de données
    console.log(`🔌 Tentative de connexion à la base de données Supabase (${pool.options.host})...`);
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie avec succès!');
    client.release();
    
    // Étape 1: Créer les tables pays et villes
    const paysVillesCreated = await executeSQL(
      pool, 
      path.join(__dirname, 'create_pays_villes.sql'),
      'Création des tables pays et villes'
    );
    
    // Étape 2: Créer les fonctions pour gérer les ID non-UUID
    const uuidFunctionsCreated = await executeSQL(
      pool, 
      path.join(__dirname, 'create_uuid_functions.sql'),
      'Création des fonctions pour gérer les ID non-UUID'
    );
    
    // Étape 3: Seed des pays et villes si les tables ont été créées
    if (paysVillesCreated) {
      await seedPaysEtVilles(pool);
    }
    
    // Étape 4: Appliquer les corrections aux fonctions complexes
    await executeSQL(
      pool, 
      path.join(__dirname, 'fix_complex_functions.sql'),
      'Application des corrections aux fonctions complexes'
    );
    
    // Étape 5: Vérifier la fonction check_migration_status
    const checkMigrationStatusQuery = `
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'check_migration_status'
      ) AS exists;
    `;
    
    const migrationStatusResult = await pool.query(checkMigrationStatusQuery);
    
    if (migrationStatusResult.rows[0].exists) {
      console.log('✅ La fonction check_migration_status existe!');
      
      // Créer une version simplifiée de la fonction si nécessaire
      const createSimpleMigrationCheck = `
        CREATE OR REPLACE FUNCTION public.check_migration_status()
        RETURNS JSONB
        LANGUAGE plpgsql
        SECURITY DEFINER
        AS $$
        DECLARE
          result JSONB;
          missing_tables TEXT[] := '{}';
          missing_functions TEXT[] := '{}';
        BEGIN
          -- Vérification des tables requises
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pays') THEN
            missing_tables := missing_tables || 'pays';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'villes') THEN
            missing_tables := missing_tables || 'villes';
          END IF;
          
          -- Vérification des fonctions requises
          IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
                        WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'handle_non_uuid') THEN
            missing_functions := missing_functions || 'handle_non_uuid';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
                        WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'is_valid_uuid') THEN
            missing_functions := missing_functions || 'is_valid_uuid';
          END IF;
          
          IF NOT EXISTS (SELECT 1 FROM pg_proc JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace 
                        WHERE pg_namespace.nspname = 'public' AND pg_proc.proname = 'get_safe_id') THEN
            missing_functions := missing_functions || 'get_safe_id';
          END IF;
          
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
      
      try {
        await pool.query(createSimpleMigrationCheck);
        console.log('✅ Fonction check_migration_status mise à jour avec succès!');
        
        // Test de la fonction
        const statusResult = await pool.query('SELECT public.check_migration_status();');
        console.log('\n📊 Résultat du check_migration_status:');
        console.log(JSON.stringify(statusResult.rows[0].check_migration_status, null, 2));
      } catch (error) {
        console.error('❌ Erreur lors de la mise à jour de la fonction check_migration_status:', error.message);
      }
    } else {
      console.error('❌ La fonction check_migration_status n\'existe pas!');
    }
    
    // Étape 6: Tester les fonctions de gestion des ID non-UUID
    if (uuidFunctionsCreated) {
      try {
        const testResult = await pool.query(`
          SELECT 
            public.is_valid_uuid('123e4567-e89b-12d3-a456-426614174000') AS valid_uuid_test,
            public.is_valid_uuid('tg-2') AS invalid_uuid_test,
            public.get_safe_id('123e4567-e89b-12d3-a456-426614174000')::text AS safe_id_valid,
            public.get_safe_id('tg-2')::text AS safe_id_invalid;
        `);
        
        console.log('\n🧪 Test des fonctions de gestion des ID non-UUID:');
        console.log(`✅ Test UUID valide: ${testResult.rows[0].valid_uuid_test}`);
        console.log(`✅ Test UUID invalide: ${testResult.rows[0].invalid_uuid_test}`);
        console.log(`✅ ID sécurisé (UUID valide): ${testResult.rows[0].safe_id_valid}`);
        console.log(`✅ ID sécurisé (UUID invalide): ${testResult.rows[0].safe_id_invalid}`);
      } catch (error) {
        console.error('❌ Erreur lors du test des fonctions:', error.message);
      }
    }
    
    console.log('\n✅ Application des corrections terminée!');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des corrections:', error);
  } finally {
    await pool.end();
  }
}

// Exécution de la fonction principale
main().catch(error => {
  console.error('Erreur lors de l\'exécution du script:', error);
  process.exit(1);
});
