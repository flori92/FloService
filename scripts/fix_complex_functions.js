/**
 * Script pour corriger manuellement les fonctions avec types de retour complexes
 * en utilisant une approche plus précise pour préserver leur définition exacte
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const { Pool } = pg;

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

async function fixComplexFunctions() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Création d'un script SQL pour enregistrer toutes les modifications
    let sqlScript = `-- Script de correction des fonctions complexes avec search_path
-- Généré automatiquement le ${new Date().toISOString()}

`;
    
    // Liste des fonctions problématiques
    const problematicFunctions = [
      'find_nearby_providers',
      'get_available_slots',
      'get_provider_availability_slots'
    ];
    
    console.log('\n=== CORRECTION DES FONCTIONS COMPLEXES ===');
    
    for (const funcName of problematicFunctions) {
      console.log(`\nTraitement de la fonction ${funcName}...`);
      
      try {
        // Récupérer la définition complète de la fonction sous forme de CREATE OR REPLACE
        const functionDef = await client.query(`
          SELECT pg_get_functiondef(oid) AS definition
          FROM pg_proc
          WHERE proname = $1
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `, [funcName]);
        
        if (functionDef.rows.length > 0) {
          let { definition } = functionDef.rows[0];
          console.log(`Définition originale récupérée (${definition.length} caractères)`);
          
          // Vérifier si la définition contient déjà SET search_path
          if (definition.includes('SET search_path')) {
            console.log(`La fonction ${funcName} possède déjà un paramètre search_path. Aucune modification nécessaire.`);
            sqlScript += `-- La fonction ${funcName} possède déjà un paramètre search_path\n\n`;
            continue;
          }
          
          // Modifier la définition pour ajouter SET search_path = public avant le AS
          const asKeywordIndex = definition.indexOf(' AS ');
          if (asKeywordIndex !== -1) {
            // Position avant le "AS" pour insérer SET search_path
            const beforeAs = definition.substring(0, asKeywordIndex);
            const afterAs = definition.substring(asKeywordIndex);
            
            // Rechercher la position de SECURITY si présent
            const securityIndex = beforeAs.lastIndexOf('SECURITY');
            
            if (securityIndex !== -1) {
              // Trouver la fin de la clause SECURITY pour insérer après
              const securityEndIndex = beforeAs.indexOf('\n', securityIndex);
              if (securityEndIndex !== -1) {
                definition = beforeAs.substring(0, securityEndIndex) + 
                  '\nSET search_path = public' + 
                  beforeAs.substring(securityEndIndex) + 
                  afterAs;
              } else {
                definition = beforeAs + '\nSET search_path = public' + afterAs;
              }
            } else {
              // Pas de clause SECURITY, insérer juste avant AS
              definition = beforeAs + '\nSET search_path = public' + afterAs;
            }
            
            // Exécuter la définition modifiée
            try {
              await client.query(`DROP FUNCTION IF EXISTS public.${funcName} CASCADE;`);
              await client.query(definition);
              console.log(`Fonction ${funcName} recréée avec succès avec search_path fixé`);
              
              // Ajouter au script SQL
              sqlScript += `-- Correction de la fonction ${funcName}\n`;
              sqlScript += `DROP FUNCTION IF EXISTS public.${funcName} CASCADE;\n`;
              sqlScript += `${definition}\n\n`;
            } catch (error) {
              console.error(`Erreur lors de la recréation de la fonction ${funcName}: ${error.message}`);
              sqlScript += `-- ERREUR lors de la recréation de la fonction ${funcName}: ${error.message}\n`;
              sqlScript += `-- Définition qui a échoué:\n`;
              sqlScript += `-- ${definition.replace(/\n/g, '\n-- ')}\n\n`;
              
              // Essayer une approche alternative en utilisant ALTER FUNCTION pour les fonctions
              // qui pourraient ne pas être recréées en raison de dépendances
              try {
                // Obtenir les arguments de la fonction pour l'instruction ALTER
                const functionArgs = await client.query(`
                  SELECT pg_get_function_arguments(oid) as args
                  FROM pg_proc
                  WHERE proname = $1
                  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                `, [funcName]);
                
                if (functionArgs.rows.length > 0) {
                  const alterSQL = `ALTER FUNCTION public.${funcName}(${functionArgs.rows[0].args}) SET search_path = public;`;
                  await client.query(alterSQL);
                  console.log(`Fonction ${funcName} modifiée avec ALTER FUNCTION`);
                  sqlScript += `-- Correction via ALTER FUNCTION\n`;
                  sqlScript += `${alterSQL}\n\n`;
                }
              } catch (alterError) {
                console.error(`Échec également avec ALTER FUNCTION pour ${funcName}: ${alterError.message}`);
                sqlScript += `-- ÉCHEC également avec ALTER FUNCTION: ${alterError.message}\n\n`;
              }
            }
          } else {
            console.error(`Impossible de trouver la position pour insérer "SET search_path" dans la fonction ${funcName}`);
            sqlScript += `-- ERREUR: Impossible de trouver la position pour insérer "SET search_path" dans la fonction ${funcName}\n\n`;
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
    
    // Création d'un script pour documenter les recommandations pour PostGIS
    sqlScript += `
-- ============================================================
-- RECOMMANDATIONS POUR POSTGIS (NÉCESSITE PRIVILÈGES ADMIN)
-- ============================================================

-- Cette opération nécessite une planification et potentiellement l'intervention de l'équipe Supabase
-- car elle peut affecter toutes les données géospatiales de l'application.

-- 1. Approche recommandée par Supabase:
--    Contactez le support Supabase pour qu'ils vous aident à déplacer l'extension PostGIS
--    en toute sécurité, car cette opération peut nécessiter des privilèges administrateur.

-- 2. Alternative (si vous avez les privilèges suffisants):
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION postgis SET SCHEMA extensions;

-- 3. Si l'approche ci-dessus échoue, la solution complète (avec sauvegarde préalable) serait:
-- BACKUP DATABASE postgres; -- Effectuez une sauvegarde complète
-- DROP EXTENSION postgis CASCADE;
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- SET search_path TO extensions, public;
-- CREATE EXTENSION postgis SCHEMA extensions;
-- SET search_path TO public;

-- 4. Assurez-vous de tester ces modifications dans un environnement de développement avant
--    de les appliquer en production.
-- ============================================================

-- ============================================================
-- PARAMÈTRES D'AUTHENTIFICATION (MANUEL VIA INTERFACE SUPABASE)
-- ============================================================
-- Ces paramètres doivent être configurés manuellement via l'interface Supabase:

-- 1. Connexion à la console Supabase: https://app.supabase.io
-- 2. Sélectionner le projet FloService
-- 3. Aller à Authentication > Settings
-- 4. Configurer:
--    - "Email OTP Expiry time" à moins d'une heure (recommandé: 30 minutes)
--    - Activer "Protect against leaked passwords"
-- ============================================================
`;
    
    // Sauvegarder le script SQL
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'fix_complex_functions.sql');
    fs.writeFileSync(sqlFilePath, sqlScript);
    console.log(`\nScript SQL sauvegardé dans ${sqlFilePath}`);
    
    // Vérifier si la table security_scripts existe
    try {
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'security_scripts'
        ) as exists;
      `);
      
      if (tableCheck.rows[0].exists) {
        // Vérifier la structure de la table
        const columnCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'security_scripts';
        `);
        
        const columns = columnCheck.rows.map(row => row.column_name);
        
        if (columns.includes('name') && columns.includes('content')) {
          // Sauvegarder le script dans la base de données
          await client.query(`
            INSERT INTO public.security_scripts (name, content)
            VALUES ('fix_complex_functions.sql', $1)
            ON CONFLICT (name) 
            DO UPDATE SET content = $1;
          `, [sqlScript]);
          
          console.log('Script SQL sauvegardé dans la table security_scripts');
        } else {
          console.error('La table security_scripts existe mais n\'a pas la structure attendue (name, content)');
        }
      } else {
        // Créer la table si elle n'existe pas
        await client.query(`
          CREATE TABLE IF NOT EXISTS public.security_scripts (
            name TEXT PRIMARY KEY,
            content TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT now(),
            updated_at TIMESTAMPTZ DEFAULT now()
          );
        `);
        
        // Sauvegarder le script
        await client.query(`
          INSERT INTO public.security_scripts (name, content)
          VALUES ('fix_complex_functions.sql', $1);
        `, [sqlScript]);
        
        console.log('Table security_scripts créée et script SQL sauvegardé');
      }
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde du script dans la base de données: ${error.message}`);
    }
    
    console.log('\n=== CORRECTION DES FONCTIONS COMPLEXES TERMINÉE ===');
    console.log('Exécutez la commande suivante pour vérifier dans le Security Advisor si les problèmes sont résolus:');
    console.log('npx supabase functions invoke security-advisor --project-ref sxrofrdhpzpjqkplgoij');
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
  } catch (error) {
    console.error('Erreur lors de la correction des fonctions complexes:', error);
    process.exit(1);
  }
}

// Exécution
fixComplexFunctions().catch(console.error);
