/**
 * Script pour appliquer les corrections à la base de données Supabase
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

// Fonction pour obtenir le numéro de ligne à partir d'une position dans le texte
function getLineFromPosition(text, position) {
  const textBeforePosition = text.substring(0, position);
  return (textBeforePosition.match(/\n/g) || []).length + 1;
}

// Fonction pour exécuter les instructions SQL une par une
async function executeIndividualStatements(sqlContent) {
  // Séparer le contenu en blocs de code (fonctions, déclarations, etc.)
  const blocks = [];
  let currentBlock = '';
  let inFunction = false;
  let bracketCount = 0;
  
  // Diviser le script en blocs logiques
  const lines = sqlContent.split('\n');
  for (const line of lines) {
    currentBlock += line + '\n';
    
    // Détecter le début d'une fonction
    if (line.includes('CREATE OR REPLACE FUNCTION') || line.includes('CREATE FUNCTION')) {
      inFunction = true;
    }
    
    // Compter les accolades ouvrantes et fermantes
    if (inFunction) {
      const openBrackets = (line.match(/\$/g) || []).length;
      bracketCount += openBrackets;
      
      // Si le nombre d'accolades est pair, nous avons peut-être atteint la fin de la fonction
      if (bracketCount % 2 === 0 && line.includes('LANGUAGE')) {
        inFunction = false;
        bracketCount = 0;
        
        // Ajouter le bloc de fonction complet
        if (currentBlock.trim()) {
          blocks.push(currentBlock);
          currentBlock = '';
        }
      }
    } 
    // Si nous ne sommes pas dans une fonction et que la ligne contient un point-virgule
    else if (!inFunction && line.includes(';')) {
      // Ajouter le bloc d'instruction
      if (currentBlock.trim()) {
        blocks.push(currentBlock);
        currentBlock = '';
      }
    }
  }
  
  // Ajouter le dernier bloc s'il n'est pas vide
  if (currentBlock.trim()) {
    blocks.push(currentBlock);
  }
  
  console.log(`📋 Exécution de ${blocks.length} blocs SQL...`);
  
  // Exécuter chaque bloc séparément
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    const blockPreview = block.substring(0, 50).replace(/\n/g, ' ') + '...';
    
    try {
      await pool.query(block);
      console.log(`✅ Bloc ${i + 1}/${blocks.length}: ${blockPreview}`);
      successCount++;
    } catch (error) {
      console.error(`❌ Erreur dans le bloc ${i + 1}/${blocks.length}: ${blockPreview}`);
      console.error(`   ${error.message}`);
      failureCount++;
    }
  }
  
  console.log(`\n📊 Résumé: ${successCount} blocs réussis, ${failureCount} blocs échoués sur ${blocks.length} total`);
  return successCount > 0;
}

// Fonction principale
async function main() {
  console.log('🔧 Application des corrections à la base de données Supabase...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'fix_messages_database.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL en une seule transaction...');
    
    // Commencer une transaction
    await pool.query('BEGIN');
    
    try {
      // Exécuter tout le script SQL en une seule fois
      await pool.query(sqlContent);
      
      // Valider la transaction si tout s'est bien passé
      await pool.query('COMMIT');
      console.log('✅ Script SQL exécuté avec succès!');
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      await pool.query('ROLLBACK');
      console.error('❌ Erreur lors de l\'exécution du script SQL:');
      console.error(error.message);
      
      // Essayer d'identifier la partie du script qui a échoué
      const errorLine = error.position ? getLineFromPosition(sqlContent, error.position) : 'Inconnue';
      console.error(`Erreur à la ligne approximative: ${errorLine}`);
      
      // Demander si on veut essayer d'exécuter les instructions une par une
      const readline = (await import('readline')).default;
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        rl.question('Voulez-vous essayer d\'exécuter les instructions une par une? (o/n) ', resolve);
      });
      
      rl.close();
      
      if (answer.toLowerCase() === 'o') {
        console.log('Tentative d\'exécution des instructions individuelles...');
        await executeIndividualStatements(sqlContent);
      } else {
        console.log('❌ Exécution interrompue.');
        return;
      }
    }
    
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
