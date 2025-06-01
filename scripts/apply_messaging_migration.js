/**
 * Script pour appliquer la migration du système de messagerie
 * Ce script vérifie d'abord si les tables existent déjà avant de les créer
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

async function applyMessagingMigration() {
  console.log('🔧 Application de la migration du système de messagerie...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'migrations', '20250600000000_messaging_system.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Diviser le script en instructions individuelles
    const sqlStatements = sqlContent
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    console.log(`📋 Exécution de ${sqlStatements.length} instructions SQL...`);
    
    // Connexion à la base de données
    const client = await pool.connect();
    
    try {
      // Commencer une transaction
      await client.query('BEGIN');
      
      // Exécuter chaque instruction séparément
      for (let i = 0; i < sqlStatements.length; i++) {
        const statement = sqlStatements[i];
        try {
          await client.query(statement);
          console.log(`✅ Instruction ${i + 1}/${sqlStatements.length} exécutée avec succès`);
        } catch (error) {
          // Si l'erreur est due à une table ou fonction qui existe déjà, on continue
          if (error.message.includes('already exists')) {
            console.log(`⚠️ Instruction ${i + 1}/${sqlStatements.length}: ${error.message}`);
          } else {
            throw error;
          }
        }
      }
      
      // Valider la transaction
      await client.query('COMMIT');
      console.log('✅ Migration appliquée avec succès !');
      
      // Vérifier que les tables ont été créées
      const tablesResult = await client.query(`
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename IN ('conversations', 'messages', 'external_id_mapping', 'message_attachments')
      `);
      
      console.log(`📊 Tables créées: ${tablesResult.rows.map(row => row.tablename).join(', ')}`);
      
      // Vérifier que les fonctions ont été créées
      const functionsResult = await client.query(`
        SELECT proname 
        FROM pg_proc 
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
        WHERE nspname = 'public' 
        AND proname IN ('check_table_exists', 'safe_message_count', 'get_or_create_conversation', 'send_message', 'mark_message_as_read', 'mark_messages_as_read', 'count_messages', 'get_messages', 'update_read_at')
      `);
      
      console.log(`📊 Fonctions créées: ${functionsResult.rows.map(row => row.proname).join(', ')}`);
      
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      await client.query('ROLLBACK');
      console.error('❌ Erreur lors de l\'application de la migration:', error);
    } finally {
      // Libérer le client
      client.release();
    }
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du fichier SQL:', error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Exécuter la fonction
applyMessagingMigration().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});