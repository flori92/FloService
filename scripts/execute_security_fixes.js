/**
 * Script pour exécuter directement les corrections de sécurité
 * sur la base de données Supabase en utilisant les paramètres de connexion fournis
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Exécute le script SQL de correction des fonctions problématiques
 */
async function executeSecurityFixes() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Chemin vers le script SQL à exécuter
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'complete_security_fixes.sql');
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Le fichier SQL n'existe pas: ${sqlFilePath}`);
    }
    
    // Lire le contenu du script SQL
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Script SQL chargé: ${sqlFilePath} (${sqlScript.length} caractères)`);
    
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    try {
      console.log('\n=== EXÉCUTION DES CORRECTIONS DE SÉCURITÉ ===');
      
      // Commencer une transaction
      await client.query('BEGIN');
      
      // Division du script en instructions SQL distinctes
      // Note: Cette méthode simple de division par ';' ne gère pas correctement tous les cas
      // (comme les fonctions contenant des ';' dans leur corps), mais c'est un début
      const sqlStatements = sqlScript
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0);
      
      console.log(`Le script contient ${sqlStatements.length} instructions SQL à exécuter`);
      
      // Exécuter chaque instruction séparément
      for (let i = 0; i < sqlStatements.length; i++) {
        const stmt = sqlStatements[i];
        
        // Ignorer les commentaires isolés
        if (stmt.startsWith('--')) {
          continue;
        }
        
        try {
          console.log(`Exécution de l'instruction SQL ${i+1}/${sqlStatements.length}...`);
          await client.query(stmt);
          console.log(`✅ Instruction ${i+1} exécutée avec succès`);
        } catch (err) {
          console.error(`❌ Erreur lors de l'exécution de l'instruction ${i+1}: ${err.message}`);
          console.error(`Instruction problématique: ${stmt.substring(0, 150)}...`);
          
          // Continuer malgré l'erreur
          console.log('Poursuite de l\'exécution des instructions suivantes...');
        }
      }
      
      // Valider la transaction
      await client.query('COMMIT');
      console.log('\n✅ Transaction validée avec succès');
      
    } catch (error) {
      // Annuler la transaction en cas d'erreur
      await client.query('ROLLBACK');
      console.error(`❌ Erreur lors de l'exécution du script: ${error.message}`);
      console.error('Transaction annulée');
    } finally {
      // Libérer la connexion
      client.release();
    }
    
    // Instructions pour la suite
    console.log('\n=== VÉRIFICATION DES CORRECTIONS ===');
    console.log('Pour vérifier que les problèmes ont été résolus, exécutez:');
    console.log('npx supabase functions invoke security-advisor --project-ref sxrofrdhpzpjqkplgoij');
    
    // Prochaines étapes pour PostGIS et authentification
    console.log('\n=== PROCHAINES ÉTAPES ===');
    console.log('1. Pour PostGIS:');
    console.log('   - Contactez le support Supabase pour déplacer l\'extension en toute sécurité');
    console.log('2. Pour les paramètres d\'authentification:');
    console.log('   - Accédez à Authentication > Settings dans la console Supabase');
    console.log('   - Configurez "Email OTP Expiry time" à 30 minutes');
    console.log('   - Activez "Protect against leaked passwords"');
    
    // Fermeture du pool de connexions
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
    
  } catch (error) {
    console.error('Erreur globale:', error);
    process.exit(1);
  }
}

// Créer une version améliorée qui exécute les instructions une par une plutôt que le script entier
async function executeSecurityFixesIndividually() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Chemin vers le script SQL à exécuter
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'complete_security_fixes.sql');
    
    // Vérifier que le fichier existe
    if (!fs.existsSync(sqlFilePath)) {
      throw new Error(`Le fichier SQL n'existe pas: ${sqlFilePath}`);
    }
    
    // Lire le contenu du script SQL
    const sqlScript = fs.readFileSync(sqlFilePath, 'utf8');
    console.log(`Script SQL chargé: ${sqlFilePath} (${sqlScript.length} caractères)`);
    
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    try {
      console.log('\n=== EXÉCUTION DES FONCTIONS INDIVIDUELLES ===');
      
      // Extraire les blocs de création de fonction
      const functionBlocks = extractFunctionBlocks(sqlScript);
      console.log(`${functionBlocks.length} blocs de fonction identifiés pour traitement individuel`);
      
      // Exécuter chaque bloc de fonction individuellement
      for (let i = 0; i < functionBlocks.length; i++) {
        const block = functionBlocks[i];
        
        try {
          console.log(`\nTraitement du bloc de fonction ${i+1}/${functionBlocks.length}...`);
          console.log(`Nom de la fonction: ${extractFunctionName(block)}`);
          
          // Exécuter le bloc DROP
          if (block.drop) {
            try {
              await client.query(block.drop);
              console.log(`✅ DROP FUNCTION exécuté avec succès`);
            } catch (dropErr) {
              console.warn(`⚠️ Avertissement lors du DROP: ${dropErr.message}`);
            }
          }
          
          // Exécuter le bloc CREATE
          try {
            await client.query(block.create);
            console.log(`✅ CREATE FUNCTION exécuté avec succès`);
          } catch (createErr) {
            console.error(`❌ Erreur lors du CREATE: ${createErr.message}`);
            
            // Essayer une approche alternative avec ALTER FUNCTION si disponible
            if (block.alter) {
              try {
                await client.query(block.alter);
                console.log(`✅ ALTER FUNCTION exécuté avec succès (méthode alternative)`);
              } catch (alterErr) {
                console.error(`❌ Échec également avec ALTER FUNCTION: ${alterErr.message}`);
              }
            }
          }
          
        } catch (blockErr) {
          console.error(`❌ Erreur lors du traitement du bloc ${i+1}: ${blockErr.message}`);
        }
      }
      
      console.log('\n=== EXÉCUTION DES INSTRUCTIONS POSTGIS ===');
      // Exécuter les instructions pour PostGIS
      try {
        await client.query('CREATE SCHEMA IF NOT EXISTS extensions;');
        console.log('✅ Schéma extensions créé ou déjà existant');
        
        try {
          await client.query('ALTER EXTENSION postgis SET SCHEMA extensions;');
          console.log('✅ Extension PostGIS déplacée vers le schéma extensions');
        } catch (postgisErr) {
          console.error(`❌ Erreur lors du déplacement de PostGIS: ${postgisErr.message}`);
          console.log('⚠️ Cette opération nécessite probablement des privilèges administrateur');
        }
      } catch (schemaErr) {
        console.error(`❌ Erreur lors de la création du schéma: ${schemaErr.message}`);
      }
      
    } catch (error) {
      console.error(`❌ Erreur lors de l'exécution: ${error.message}`);
    } finally {
      // Libérer la connexion
      client.release();
    }
    
    // Instructions pour la suite
    console.log('\n=== VÉRIFICATION DES CORRECTIONS ===');
    console.log('Pour vérifier que les problèmes ont été résolus, exécutez:');
    console.log('npx supabase functions invoke security-advisor --project-ref sxrofrdhpzpjqkplgoij');
    
    // Prochaines étapes pour PostGIS et authentification
    console.log('\n=== PROCHAINES ÉTAPES ===');
    console.log('1. Pour PostGIS:');
    console.log('   - Contactez le support Supabase pour déplacer l\'extension en toute sécurité');
    console.log('2. Pour les paramètres d\'authentification:');
    console.log('   - Accédez à Authentication > Settings dans la console Supabase');
    console.log('   - Configurez "Email OTP Expiry time" à 30 minutes');
    console.log('   - Activez "Protect against leaked passwords"');
    
    // Fermeture du pool de connexions
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
    
  } catch (error) {
    console.error('Erreur globale:', error);
    process.exit(1);
  }
}

/**
 * Extrait les blocs de création de fonction du script SQL
 */
function extractFunctionBlocks(sqlScript) {
  const blocks = [];
  
  // Expression régulière pour trouver les blocs DROP FUNCTION
  const dropRegex = /DROP\s+FUNCTION\s+IF\s+EXISTS\s+([^;]+);/gi;
  
  // Expression régulière pour trouver les blocs CREATE OR REPLACE FUNCTION
  const createRegex = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+([^;]+?\$body\$[\s\S]+?\$body\$\s*;)/gi;
  
  // Trouver tous les blocs DROP et CREATE
  let dropMatch;
  let createMatch;
  
  // Collecter tous les DROP
  const dropBlocks = [];
  while ((dropMatch = dropRegex.exec(sqlScript)) !== null) {
    dropBlocks.push(dropMatch[0]);
  }
  
  // Collecter tous les CREATE
  const createBlocks = [];
  while ((createMatch = createRegex.exec(sqlScript)) !== null) {
    createBlocks.push(createMatch[0]);
  }
  
  // Associer chaque DROP avec son CREATE correspondant
  for (let i = 0; i < Math.min(dropBlocks.length, createBlocks.length); i++) {
    const functionName = extractFunctionName(createBlocks[i]);
    
    blocks.push({
      drop: dropBlocks[i],
      create: createBlocks[i],
      alter: generateAlterFunction(createBlocks[i], functionName),
      name: functionName
    });
  }
  
  return blocks;
}

/**
 * Extrait le nom de la fonction à partir d'un bloc CREATE OR REPLACE FUNCTION
 */
function extractFunctionName(createBlock) {
  const nameMatch = createBlock.match(/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+(\w+\.\w+)/i);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1];
  }
  return 'unknown_function';
}

/**
 * Génère une instruction ALTER FUNCTION alternative à partir d'un bloc CREATE
 */
function generateAlterFunction(createBlock, functionName) {
  // Extraire les arguments de la fonction
  const argsMatch = createBlock.match(/\(([^)]+)\)/);
  if (!argsMatch || !argsMatch[1]) {
    return null;
  }
  
  // Créer l'instruction ALTER FUNCTION
  return `ALTER FUNCTION ${functionName}(${argsMatch[1]}) SET search_path = public;`;
}

// Exécuter la version individuelle qui est plus robuste
executeSecurityFixesIndividually().catch(console.error);
