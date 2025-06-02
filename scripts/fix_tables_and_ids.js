/**
 * Script pour corriger la structure des tables et ajouter le support des ID non-UUID
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

// Fonction principale
async function main() {
  console.log('🔧 Correction de la structure des tables et support des ID non-UUID...');
  
  try {
    // Test de connexion à la base de données
    console.log(`🔌 Tentative de connexion à la base de données Supabase (${pool.options.host})...`);
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie avec succès!');
    client.release();
    
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'fix_tables_structure.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL pour corriger la structure des tables...');
    
    // Début de la transaction
    const client2 = await pool.connect();
    try {
      await client2.query('BEGIN');
      
      // Exécuter le script SQL
      await client2.query(sqlContent);
      
      // Valider la transaction
      await client2.query('COMMIT');
      console.log('✅ Script SQL exécuté avec succès!');
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      await client2.query('ROLLBACK');
      console.error('❌ Erreur lors de l\'exécution du script SQL:', error.message);
      console.log('⚙️ Continuons avec les autres opérations...');
    } finally {
      client2.release();
    }
    
    // Vérifier si les tables pays et villes existent
    const tablesExist = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pays'
      ) AS pays_exists,
      EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'villes'
      ) AS villes_exists;
    `);
    
    const { pays_exists, villes_exists } = tablesExist.rows[0];
    
    if (pays_exists && villes_exists) {
      console.log('✅ Tables pays et villes créées avec succès!');
      
      // Seed des pays et villes
      await seedPaysEtVilles(pool);
    } else {
      console.error('❌ Erreur: Les tables pays et/ou villes n\'ont pas été créées correctement.');
    }
    
    // Vérifier les fonctions pour la gestion des ID non-UUID
    const functionsExist = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'handle_non_uuid'
      ) AS handle_non_uuid_exists,
      EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'is_valid_uuid'
      ) AS is_valid_uuid_exists,
      EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'get_safe_id'
      ) AS get_safe_id_exists;
    `);
    
    const { handle_non_uuid_exists, is_valid_uuid_exists, get_safe_id_exists } = functionsExist.rows[0];
    
    if (handle_non_uuid_exists && is_valid_uuid_exists && get_safe_id_exists) {
      console.log('✅ Fonctions de gestion des ID non-UUID créées avec succès!');
      
      // Test des fonctions
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
    } else {
      console.error('❌ Erreur: Les fonctions de gestion des ID non-UUID n\'ont pas été créées correctement.');
    }
    
    // Vérifier la fonction check_migration_status
    const migrationStatusExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE pg_namespace.nspname = 'public'
        AND pg_proc.proname = 'check_migration_status'
      );
    `);
    
    if (migrationStatusExists.rows[0].exists) {
      console.log('✅ Fonction check_migration_status créée avec succès!');
      
      // Test de la fonction
      try {
        const statusResult = await pool.query(`SELECT public.check_migration_status();`);
        console.log('\n📊 Résultat du check_migration_status:');
        console.log(JSON.stringify(statusResult.rows[0].check_migration_status, null, 2));
      } catch (error) {
        console.error('❌ Erreur lors du test de la fonction check_migration_status:', error.message);
      }
    } else {
      console.error('❌ Erreur: La fonction check_migration_status n\'a pas été créée correctement.');
    }
    
    console.log('\n✅ Corrections terminées!');
    
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
