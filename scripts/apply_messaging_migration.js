/**
 * Script pour appliquer la migration du système de messagerie
 * Ce script exécute la migration SQL pour créer les tables et fonctions nécessaires
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à la base de données Supabase
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

// Fonction principale
async function applyMessagingMigration() {
  console.log('🔧 Application de la migration du système de messagerie...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20250601160800_dark_hat.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Diviser le script en instructions individuelles
    const sqlInstructions = sqlContent.split(';')
      .map(instruction => instruction.trim())
      .filter(instruction => instruction.length > 0)
      .map(instruction => instruction + ';');
    
    console.log(`📋 Exécution de ${sqlInstructions.length} instructions SQL...`);
    
    // Exécuter chaque instruction séparément
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlInstructions.length; i++) {
      const instruction = sqlInstructions[i];
      const instructionPreview = instruction.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      try {
        await pool.query(instruction);
        console.log(`✅ Instruction ${i + 1}/${sqlInstructions.length}: ${instructionPreview}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Erreur dans l'instruction ${i + 1}/${sqlInstructions.length}: ${instructionPreview}`);
        console.error(`   ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n📊 Résumé: ${successCount} instructions réussies, ${errorCount} instructions échouées sur ${sqlInstructions.length} total`);
    
    // Vérifier les résultats
    await verifyMigration();
    
    console.log('\n✅ Migration du système de messagerie terminée!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la migration:', error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Fonction pour vérifier que la migration a été appliquée correctement
async function verifyMigration() {
  console.log('\n🔍 Vérification de la migration...');
  
  // Vérifier que les tables ont été créées
  const tables = ['conversations', 'messages', 'external_id_mapping', 'message_attachments'];
  for (const table of tables) {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `, [table]);
    
    if (rows[0].exists) {
      console.log(`✅ Table ${table} créée avec succès`);
    } else {
      console.error(`❌ La table ${table} n'a pas été créée`);
    }
  }
  
  // Vérifier que les fonctions ont été créées
  const functions = [
    'check_table_exists', 
    'safe_message_count', 
    'get_or_create_conversation', 
    'send_message',
    'mark_message_as_read',
    'mark_messages_as_read',
    'count_messages',
    'get_messages',
    'update_read_at'
  ];
  
  for (const func of functions) {
    const { rows } = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        WHERE proname = $1
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      );
    `, [func]);
    
    if (rows[0].exists) {
      console.log(`✅ Fonction ${func} créée avec succès`);
    } else {
      console.error(`❌ La fonction ${func} n'a pas été créée`);
    }
  }
  
  // Vérifier que les politiques RLS ont été créées
  const { rows: policies } = await pool.query(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename IN ('conversations', 'messages', 'external_id_mapping', 'message_attachments');
  `);
  
  console.log(`\n✅ ${policies.length} politiques RLS créées:`);
  policies.forEach(policy => {
    console.log(`   - ${policy.policyname} (${policy.tablename})`);
  });
}

// Exécuter la fonction principale
applyMessagingMigration().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});