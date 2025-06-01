/**
 * Script pour corriger les fonctions avec chemin de recherche mutable
 * et déplacer l'extension PostGIS hors du schéma public
 * Identifiés dans le Supabase Security Advisor
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

async function fixSecurityIssues() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Création d'un script SQL pour enregistrer toutes les modifications
    let sqlScript = `-- Script de correction des problèmes de sécurité - Fonctions avec chemin de recherche mutable
-- Généré automatiquement le ${new Date().toISOString()}

`;
    
    // 1. Correction des fonctions avec chemin de recherche mutable
    console.log('\n=== CORRECTION DES FONCTIONS AVEC CHEMIN DE RECHERCHE MUTABLE ===');
    
    // Liste complète des fonctions identifiées dans le Security Advisor
    const functionsToFix = [
      'safe_message_count', 
      'check_table_exists', 
      'get_user_id_from_external_id',
      'send_message', 
      'get_or_create_conversation', 
      'update_categories_updated_at',
      'update_subcategories_updated_at', 
      'update_portfolio_item_updated_at',
      'update_user_settings_updated_at', 
      'handle_payment_completion',
      'create_booking_reminders', 
      'handle_booking_status_update',
      'handle_new_review', 
      'handle_review_response', 
      'create_message_notification',
      'update_translations_updated_at', 
      'update_provider_rating',
      'update_provider_rating_trigger', 
      'find_nearby_providers',
      'check_provider_availability', 
      'update_updated_at_column',
      'update_service_area_geometry', 
      'update_booking_timestamp',
      'cancel_booking', 
      'complete_booking', 
      'get_available_slots',
      'encrypt_access_token', 
      'get_provider_availability_slots',
      'get_provider_stats', 
      'geocode_and_update_provider_location',
      'decrypt_access_token', 
      'trigger_set_timestamp'
    ];
    
    // Éliminer les doublons potentiels
    const uniqueFunctions = [...new Set(functionsToFix)];
    
    for (const funcName of uniqueFunctions) {
      console.log(`Correction du chemin de recherche pour la fonction ${funcName}...`);
      
      try {
        // Vérifier si la fonction existe
        const functionExists = await client.query(`
          SELECT 1 FROM pg_proc 
          WHERE proname = $1 
          AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        `, [funcName]);
        
        if (functionExists.rows.length > 0) {
          // Récupérer la définition de la fonction
          const functionDef = await client.query(`
            SELECT pg_get_functiondef(oid) AS definition
            FROM pg_proc
            WHERE proname = $1
            AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
          `, [funcName]);
          
          // Vérifier si la fonction a déjà un SET search_path
          if (functionDef.rows.length > 0) {
            const definition = functionDef.rows[0].definition;
            
            if (!definition.includes('SET search_path =')) {
              // Modification de la définition pour ajouter SET search_path = public
              let modifiedDef;
              
              if (definition.includes('AS $$')) {
                const parts = definition.split('AS $$');
                modifiedDef = parts[0] + 'AS $$ SET search_path = public; ' + parts[1];
              } else if (definition.includes('AS $function$')) {
                const parts = definition.split('AS $function$');
                modifiedDef = parts[0] + 'AS $function$ SET search_path = public; ' + parts[1];
              } else if (definition.includes('LANGUAGE ')) {
                // Essai d'une autre approche pour les fonctions avec syntaxe différente
                const languageIndex = definition.indexOf('LANGUAGE ');
                const beforeLanguage = definition.substring(0, languageIndex);
                const afterLanguage = definition.substring(languageIndex);
                
                // Insérer avant LANGUAGE
                modifiedDef = beforeLanguage + ' SET search_path = public ' + afterLanguage;
              } else {
                console.log(`Format non reconnu pour la fonction ${funcName}, impossible de modifier automatiquement`);
                sqlScript += `-- Format non reconnu pour la fonction ${funcName}, modification manuelle requise\n`;
                continue;
              }
              
              // Application de la modification
              try {
                await client.query(modifiedDef);
                console.log(`Chemin de recherche corrigé pour la fonction ${funcName}`);
                sqlScript += `-- Fonction corrigée: ${funcName}\n`;
                sqlScript += `${modifiedDef};\n\n`;
              } catch (error) {
                console.error(`Erreur lors de la modification de la fonction ${funcName}: ${error.message}`);
                sqlScript += `-- ERREUR lors de la modification de la fonction ${funcName}: ${error.message}\n`;
                
                // Tentative alternative pour certaines fonctions
                try {
                  // Récupérer les informations détaillées sur la fonction
                  const funcInfo = await client.query(`
                    SELECT p.proname, p.prorettype::regtype::text as return_type,
                           pg_get_function_arguments(p.oid) as arguments,
                           p.prosrc as source
                    FROM pg_proc p
                    WHERE p.proname = $1
                    AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                  `, [funcName]);
                  
                  if (funcInfo.rows.length > 0) {
                    const { return_type, arguments: args, source } = funcInfo.rows[0];
                    
                    // Création d'une nouvelle définition
                    const newDef = `
                      CREATE OR REPLACE FUNCTION public.${funcName}(${args})
                      RETURNS ${return_type}
                      LANGUAGE plpgsql
                      SECURITY INVOKER
                      SET search_path = public
                      AS $function$
                      ${source}
                      $function$;
                    `;
                    
                    await client.query(newDef);
                    console.log(`Fonction ${funcName} recréée avec succès (méthode alternative)`);
                    sqlScript += `-- Fonction recréée (méthode alternative): ${funcName}\n`;
                    sqlScript += `${newDef}\n\n`;
                  }
                } catch (altError) {
                  console.error(`Échec de la méthode alternative pour ${funcName}: ${altError.message}`);
                  sqlScript += `-- ÉCHEC de la méthode alternative pour ${funcName}: ${altError.message}\n`;
                }
              }
            } else {
              console.log(`La fonction ${funcName} a déjà un chemin de recherche fixe`);
              sqlScript += `-- La fonction ${funcName} a déjà un chemin de recherche fixe\n`;
            }
          } else {
            console.log(`Impossible de récupérer la définition de la fonction ${funcName}`);
            sqlScript += `-- Impossible de récupérer la définition de la fonction ${funcName}\n`;
          }
        } else {
          console.log(`Fonction ${funcName} non trouvée dans la base de données`);
          sqlScript += `-- Fonction ${funcName} non trouvée dans la base de données\n`;
        }
      } catch (error) {
        console.error(`Erreur lors du traitement de la fonction ${funcName}: ${error.message}`);
        sqlScript += `-- Erreur lors du traitement de la fonction ${funcName}: ${error.message}\n`;
      }
    }
    
    // 2. Déplacement de l'extension PostGIS
    console.log('\n=== DÉPLACEMENT DE L\'EXTENSION POSTGIS ===');
    
    try {
      // Vérifier si l'extension PostGIS est dans le schéma public
      const postgisCheck = await client.query(`
        SELECT extname, extnamespace::regnamespace AS schema
        FROM pg_extension
        WHERE extname = 'postgis';
      `);
      
      if (postgisCheck.rows.length > 0 && postgisCheck.rows[0].schema === 'public') {
        console.log('Extension PostGIS trouvée dans le schéma public');
        
        // Créer un schéma dédié pour les extensions
        try {
          await client.query('CREATE SCHEMA IF NOT EXISTS extensions;');
          console.log('Schéma "extensions" créé ou déjà existant');
          sqlScript += '\n-- Création du schéma pour les extensions\n';
          sqlScript += 'CREATE SCHEMA IF NOT EXISTS extensions;\n\n';
          
          // Déplacer l'extension
          try {
            await client.query('ALTER EXTENSION postgis SET SCHEMA extensions;');
            console.log('Extension PostGIS déplacée vers le schéma "extensions"');
            sqlScript += '-- Déplacement de l\'extension PostGIS\n';
            sqlScript += 'ALTER EXTENSION postgis SET SCHEMA extensions;\n\n';
          } catch (error) {
            console.error(`Erreur lors du déplacement de l'extension PostGIS: ${error.message}`);
            sqlScript += `-- ERREUR lors du déplacement de l'extension PostGIS: ${error.message}\n`;
            sqlScript += '-- Cette opération peut nécessiter des privilèges d\'administrateur PostgreSQL\n';
          }
        } catch (error) {
          console.error(`Erreur lors de la création du schéma extensions: ${error.message}`);
          sqlScript += `-- ERREUR lors de la création du schéma extensions: ${error.message}\n`;
        }
      } else if (postgisCheck.rows.length > 0) {
        console.log(`L'extension PostGIS est déjà dans le schéma ${postgisCheck.rows[0].schema}`);
        sqlScript += `-- L'extension PostGIS est déjà dans le schéma ${postgisCheck.rows[0].schema}\n`;
      } else {
        console.log('Extension PostGIS non trouvée');
        sqlScript += '-- Extension PostGIS non trouvée\n';
      }
    } catch (error) {
      console.error(`Erreur lors de la vérification de l'extension PostGIS: ${error.message}`);
      sqlScript += `-- Erreur lors de la vérification de l'extension PostGIS: ${error.message}\n`;
    }
    
    // 3. Note sur les problèmes d'authentification
    console.log('\n=== RECOMMANDATIONS POUR L\'AUTHENTIFICATION ===');
    sqlScript += `
-- RECOMMANDATIONS POUR L'AUTHENTIFICATION
-- Ces paramètres doivent être configurés dans l'interface Supabase ou via l'API d'administration
-- 1. Réduire l'expiration des OTP à moins d'une heure
-- 2. Activer la protection contre les mots de passe compromis
`;
    
    console.log('1. Réduire l\'expiration des OTP à moins d\'une heure (via interface Supabase)');
    console.log('2. Activer la protection contre les mots de passe compromis (via interface Supabase)');
    
    // Sauvegarder le script SQL
    const sqlFilePath = path.join(__dirname, '..', 'supabase', 'fix_function_search_path.sql');
    fs.writeFileSync(sqlFilePath, sqlScript);
    console.log(`\nScript SQL sauvegardé dans ${sqlFilePath}`);
    
    // Sauvegarder le script dans la base de données
    try {
      await client.query(`
        INSERT INTO public.security_scripts (name, content)
        VALUES ('fix_function_search_path.sql', $1)
        ON CONFLICT (name) DO UPDATE
        SET content = $1, updated_at = NOW();
      `, [sqlScript]);
      
      console.log('Script SQL sauvegardé dans la table security_scripts');
    } catch (error) {
      console.error(`Erreur lors de la sauvegarde du script dans la base de données: ${error.message}`);
    }
    
    console.log('\n=== CORRECTION DES PROBLÈMES DE SÉCURITÉ TERMINÉE ===');
    console.log('Vérifiez le Security Advisor pour confirmer que les problèmes ont été résolus');
    console.log('Pour les paramètres d\'authentification, utilisez l\'interface Supabase');
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
  } catch (error) {
    console.error('Erreur lors de la correction des problèmes de sécurité:', error);
    process.exit(1);
  }
}

// Exécution
fixSecurityIssues().catch(console.error);
