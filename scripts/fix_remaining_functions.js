/**
 * Script pour corriger manuellement les fonctions problématiques 
 * qui n'ont pas pu être corrigées automatiquement
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

const { Pool } = pg;

// Chargement des variables d'environnement
dotenv.config();

// Configuration pour les chemins de fichiers en ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

async function fixRemainingFunctions() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Création d'un script SQL pour enregistrer toutes les modifications
    let sqlScript = `-- Script de correction manuelle des fonctions problématiques
-- Généré automatiquement le ${new Date().toISOString()}

`;
    
    // Liste des fonctions problématiques identifiées lors de notre dernière vérification
    const problematicFunctions = [
      'count_messages',
      'mark_message_as_read',
      'mark_messages_as_read',
      'send_message',
      // Autres fonctions identifiées dans le Security Advisor de Supabase
      'safe_message_count',
      'check_table_exists',
      'get_or_create_conversation',
      'find_nearby_providers',
      'get_available_slots',
      'get_provider_availability_slots'
    ];
    
    console.log('\n=== CORRECTION MANUELLE DES FONCTIONS PROBLÉMATIQUES ===');
    
    for (const funcName of problematicFunctions) {
      console.log(`\nAnalyse et correction de la fonction ${funcName}...`);
      
      try {
        // Récupérer la définition et les métadonnées de la fonction
        const functionInfo = await client.query(`
          SELECT 
            p.proname AS name,
            pg_get_function_result(p.oid) AS result_type,
            pg_get_function_arguments(p.oid) AS arguments,
            p.prosrc AS source,
            l.lanname AS language
          FROM pg_proc p
          JOIN pg_language l ON p.prolang = l.oid
          WHERE p.proname = $1
          AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `, [funcName]);
        
        if (functionInfo.rows.length > 0) {
          const { name, result_type, arguments: args, source, language } = functionInfo.rows[0];
          
          console.log(`- Nom: ${name}`);
          console.log(`- Type de retour: ${result_type}`);
          console.log(`- Arguments: ${args}`);
          console.log(`- Langage: ${language}`);
          
          // Pour chaque fonction, créer une requête spécifique qui ajoute SET search_path
          // tout en préservant son type de retour et sa signature
          
          let updateQuery;
          
          if (language === 'plpgsql') {
            updateQuery = `
ALTER FUNCTION public.${name}(${args})
SET search_path = public;
`;
          } else {
            // Pour les autres langages (SQL, etc.)
            updateQuery = `
CREATE OR REPLACE FUNCTION public.${name}(${args})
RETURNS ${result_type}
LANGUAGE ${language}
SECURITY INVOKER
SET search_path = public
AS $function$
${source}
$function$;
`;
          }
          
          // Exécuter la requête
          try {
            await client.query(updateQuery);
            console.log(`Fonction ${name} corrigée avec succès en préservant son type de retour`);
            sqlScript += `-- Correction de la fonction ${name}\n`;
            sqlScript += `${updateQuery}\n\n`;
          } catch (error) {
            console.error(`Erreur lors de la correction de la fonction ${name}: ${error.message}`);
            sqlScript += `-- ERREUR lors de la correction de la fonction ${name}: ${error.message}\n`;
            
            // Solution de secours pour ALTER FUNCTION
            if (!updateQuery.startsWith('ALTER')) {
              try {
                const alterQuery = `
ALTER FUNCTION public.${name}(${args})
SET search_path = public;
`;
                await client.query(alterQuery);
                console.log(`Fonction ${name} corrigée avec succès via ALTER FUNCTION`);
                sqlScript += `-- Correction via ALTER FUNCTION de ${name}\n`;
                sqlScript += `${alterQuery}\n\n`;
              } catch (alterError) {
                console.error(`Échec de la correction via ALTER FUNCTION pour ${name}: ${alterError.message}`);
                sqlScript += `-- ÉCHEC de la correction via ALTER FUNCTION pour ${name}: ${alterError.message}\n`;
              }
            }
          }
        } else {
          console.log(`Fonction ${funcName} non trouvée dans la base de données`);
          sqlScript += `-- Fonction ${funcName} non trouvée dans la base de données\n\n`;
        }
      } catch (error) {
        console.error(`Erreur lors de l'analyse de la fonction ${funcName}: ${error.message}`);
        sqlScript += `-- Erreur lors de l'analyse de la fonction ${funcName}: ${error.message}\n\n`;
      }
    }
    
    // Instructions pour PostGIS
    console.log('\n=== INSTRUCTIONS POUR POSTGIS ===');
    sqlScript += `
-- ============================================================
-- INSTRUCTIONS POUR DÉPLACER POSTGIS (REQUIERT PRIVILÈGES ADMIN)
-- ============================================================
-- Cette opération nécessite une maintenance planifiée:

-- 1. Sauvegarde des données spatiales
-- BACKUP DATABASE postgres TO '/path/to/backup';

-- 2. Création du schéma dédié
-- CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Déplacer PostGIS (approche complète)
-- DROP EXTENSION postgis CASCADE;
-- SET search_path TO extensions;
-- CREATE EXTENSION postgis;
-- SET search_path TO public;

-- 4. Restaurer les données et réindexer si nécessaire
-- ============================================================

`;
    
    console.log('Instructions pour PostGIS ajoutées au script SQL');
    
    // Sauvegarder le script SQL
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'fix_remaining_functions.sql');
    fs.writeFileSync(sqlFilePath, sqlScript);
    console.log(`\nScript SQL sauvegardé dans ${sqlFilePath}`);
    
    // Sauvegarder le script dans la base de données
    try {
      await client.query(`
        INSERT INTO public.security_scripts (name, content)
        VALUES ('fix_remaining_functions.sql', $1)
        ON CONFLICT (name) DO UPDATE
        SET content = $1;
      `, [sqlScript]);
      
      console.log('Script SQL sauvegardé dans la table security_scripts');
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde du script dans la base de données: ${error.message}`);
    }
    
    console.log('\n=== CORRECTION DES FONCTIONS PROBLÉMATIQUES TERMINÉE ===');
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
  } catch (error) {
    console.error('Erreur lors de la correction des fonctions problématiques:', error);
    process.exit(1);
  }
}

// Exécution
fixRemainingFunctions().catch(console.error);
