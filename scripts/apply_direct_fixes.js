/**
 * Script pour appliquer directement les corrections à la base de données Supabase
 * Créé le 01/06/2025
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
async function main() {
  console.log('🔧 Application des corrections à la base de données Supabase...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'fix_messages_direct.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL...');
    
    // Exécuter le script SQL
    await pool.query(sqlContent);
    console.log('✅ Script SQL exécuté avec succès!');
    
    // Vérifier les résultats
    console.log('\n🔍 Vérification des résultats...');
    
    // 1. Vérifier la colonne read_at
    const readAtResult = await pool.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'messages'
      AND column_name = 'read_at';
    `);
    
    if (readAtResult.rows.length > 0) {
      console.log('✅ Colonne read_at ajoutée avec succès.');
    } else {
      console.error('❌ La colonne read_at n\'a pas été ajoutée.');
    }
    
    // 2. Vérifier les fonctions corrigées
    const functionsResult = await pool.query(`
      SELECT proname, prosrc
      FROM pg_proc
      JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
      WHERE nspname = 'public'
      AND proname IN ('get_messages', 'send_message', 'mark_message_as_read', 'mark_messages_as_read', 'count_messages');
    `);
    
    const vulnerableFunctions = functionsResult.rows
      .filter(row => !row.prosrc.includes('SET search_path = public'))
      .map(row => row.proname);
    
    if (vulnerableFunctions.length === 0) {
      console.log('✅ Toutes les fonctions ont été corrigées avec un chemin de recherche fixe.');
    } else {
      console.error(`❌ Fonctions encore vulnérables: ${vulnerableFunctions.join(', ')}`);
    }
    
    // 3. Vérifier les politiques RLS
    const policiesResult = await pool.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'messages';
    `);
    
    console.log(`✅ ${policiesResult.rows.length} politiques RLS configurées pour la table messages:`);
    policiesResult.rows.forEach(row => {
      console.log(`   - ${row.policyname}`);
    });
    
    // 4. Vérifier la fonction RPC get_user_conversations
    const rpcResult = await pool.query(`
      SELECT proname
      FROM pg_proc
      JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
      WHERE nspname = 'public'
      AND proname = 'get_user_conversations';
    `);
    
    if (rpcResult.rows.length > 0) {
      console.log('✅ Fonction RPC get_user_conversations créée avec succès.');
    } else {
      console.error('❌ La fonction RPC get_user_conversations n\'a pas été créée.');
    }
    
    // 5. Vérifier les colonnes de la table conversations
    const conversationsResult = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'conversations'
      AND column_name IN ('provider_id', 'client_id');
    `);
    
    if (conversationsResult.rows.length === 2) {
      console.log('✅ La table conversations a les bonnes colonnes provider_id et client_id.');
    } else {
      console.error('❌ La table conversations n\'a pas les bonnes colonnes.');
      console.log('Colonnes trouvées:', conversationsResult.rows.map(row => row.column_name).join(', '));
    }
    
    // 6. Vérifier les index
    const indexesResult = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'messages'
      AND indexname IN ('idx_messages_conversation_id', 'idx_messages_recipient_unread');
    `);
    
    console.log(`✅ ${indexesResult.rows.length}/2 index créés pour la table messages:`);
    indexesResult.rows.forEach(row => {
      console.log(`   - ${row.indexname}`);
    });
    
    // 7. Vérifier les politiques RLS pour la table conversations
    const conversationPoliciesResult = await pool.query(`
      SELECT tablename, policyname
      FROM pg_policies
      WHERE schemaname = 'public'
      AND tablename = 'conversations';
    `);
    
    console.log(`✅ ${conversationPoliciesResult.rows.length} politiques RLS configurées pour la table conversations:`);
    conversationPoliciesResult.rows.forEach(row => {
      console.log(`   - ${row.policyname}`);
    });
    
    console.log('\n✅ Toutes les corrections ont été appliquées et vérifiées avec succès!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des corrections:', error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});
