// fix_additional_security_issues.js
// Script pour corriger les problèmes de sécurité supplémentaires identifiés par Supabase Security Advisor
// Principalement les fonctions avec chemin de recherche mutable et l'extension PostGIS dans le schéma public

import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configuration
dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connexion à la base de données Supabase
const { Pool } = pg;
const pool = new Pool({
  host: process.env.SUPABASE_DB_HOST,
  port: process.env.SUPABASE_DB_PORT,
  database: process.env.SUPABASE_DB_NAME,
  user: process.env.SUPABASE_DB_USER,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: process.env.SUPABASE_DB_SSL === 'true'
});

console.log('Connexion à la base de données Supabase...');

// Fonction principale
async function fixAdditionalSecurityIssues() {
  const client = await pool.connect();
  
  try {
    console.log('Connexion établie avec succès\n');
    
    // Création d'un script SQL pour enregistrer toutes les modifications
    let sqlScript = `-- Script de correction des problèmes de sécurité supplémentaires
-- Généré le ${new Date().toISOString()}
-- Problèmes traités:
-- 1. Fonctions avec chemin de recherche mutable
-- 2. Extension PostGIS dans le schéma public
-- 3. Recommandations pour l'authentification (commentaires uniquement)

`;

    // 1. Corriger les fonctions avec chemin de recherche mutable
    console.log('=== CORRECTION DES FONCTIONS AVEC CHEMIN DE RECHERCHE MUTABLE ===');
    
    // Liste des fonctions à corriger (extraite du rapport Security Advisor)
    const functionsToFix = [
      'safe_message_count', 'check_table_exists', 'get_user_id_from_external_id',
      'send_message', 'get_or_create_conversation', 'update_categories_updated_at',
      'update_subcategories_updated_at', 'update_portfolio_item_updated_at',
      'update_user_settings_updated_at', 'handle_payment_completion',
      'create_booking_reminders', 'handle_booking_status_update',
      'handle_new_review', 'handle_review_response', 'create_message_notification',
      'update_translations_updated_at', 'update_provider_rating',
      'update_provider_rating_trigger', 'find_nearby_providers',
      'check_provider_availability', 'update_updated_at_column',
      'update_service_area_geometry', 'update_booking_timestamp',
      'cancel_booking', 'complete_booking', 'get_available_slots',
      'encrypt_access_token', 'get_provider_availability_slots',
      'get_provider_stats', 'geocode_and_update_provider_location',
      'decrypt_access_token', 'trigger_set_timestamp'
    ];
    
    // Éliminer les doublons (certaines fonctions apparaissent deux fois dans le rapport)
    const uniqueFunctions = [...new Set(functionsToFix)];
    
    for (const funcName of uniqueFunctions) {
      console.log(`Correction du chemin de recherche pour la fonction ${funcName}...`);
      
      // Obtenir la définition actuelle de la fonction
      const getFunctionQuery = `
        SELECT pg_get_functiondef(oid) AS definition
        FROM pg_proc
        WHERE proname = $1
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
      `;
      
      const functionResult = await client.query(getFunctionQuery, [funcName]);
      
      if (functionResult.rows.length > 0) {
        let functionDef = functionResult.rows[0].definition;
        
        // Vérifier si la fonction a déjà un SET search_path
        if (!functionDef.includes('SET search_path =')) {
          // Trouver l'endroit où insérer SET search_path
          // Généralement après AS $$ ou LANGUAGE
          let modifiedDef;
          
          if (functionDef.includes('AS $$')) {
            const parts = functionDef.split('AS $$');
            modifiedDef = parts[0] + 'AS $$ SET search_path = public; ' + parts[1];
          } else if (functionDef.includes('AS $function$')) {
            const parts = functionDef.split('AS $function$');
            modifiedDef = parts[0] + 'AS $function$ SET search_path = public; ' + parts[1];
          } else {
            // Si on ne peut pas trouver un bon endroit, on ajoute un commentaire dans le script SQL
            console.log(`Impossible de modifier automatiquement la fonction ${funcName}, vérification manuelle requise`);
            sqlScript += `-- ATTENTION: Impossible de modifier automatiquement la fonction ${funcName}, vérification manuelle requise\n`;
            continue;
          }
          
          // Exécuter la requête pour modifier la fonction
          try {
            await client.query(modifiedDef);
            console.log(`Chemin de recherche corrigé pour la fonction ${funcName}`);
            
            // Ajouter au script SQL
            sqlScript += `-- Correction du chemin de recherche pour la fonction ${funcName}\n`;
            sqlScript += `${modifiedDef};\n\n`;
          } catch (error) {
            console.error(`Erreur lors de la modification de la fonction ${funcName}:`, error.message);
            sqlScript += `-- ERREUR lors de la modification de la fonction ${funcName}: ${error.message}\n`;
          }
        } else {
          console.log(`La fonction ${funcName} a déjà un chemin de recherche défini`);
          sqlScript += `-- La fonction ${funcName} a déjà un chemin de recherche défini\n`;
        }
      } else {
        console.log(`Fonction ${funcName} non trouvée`);
        sqlScript += `-- Fonction ${funcName} non trouvée\n`;
      }
    }
    
    // 2. Déplacer l'extension PostGIS vers un autre schéma
    console.log('\n=== DÉPLACEMENT DE L\'EXTENSION POSTGIS ===');
    sqlScript += `\n-- Déplacement de l'extension PostGIS vers un schéma dédié\n`;
    
    // Vérifier si l'extension est bien dans le schéma public
    const checkPostgisQuery = `
      SELECT extname, extnamespace::regnamespace AS schema
      FROM pg_extension
      WHERE extname = 'postgis';
    `;
    
    const postgisResult = await client.query(checkPostgisQuery);
    
    if (postgisResult.rows.length > 0 && postgisResult.rows[0].schema === 'public') {
      console.log('Extension PostGIS trouvée dans le schéma public');
      
      // Créer un schéma dédié pour les extensions
      try {
        await client.query('CREATE SCHEMA IF NOT EXISTS extensions;');
        console.log('Schéma "extensions" créé ou déjà existant');
        sqlScript += `CREATE SCHEMA IF NOT EXISTS extensions;\n`;
        
        // Déplacer l'extension
        try {
          await client.query('ALTER EXTENSION postgis SET SCHEMA extensions;');
          console.log('Extension PostGIS déplacée vers le schéma "extensions"');
          sqlScript += `ALTER EXTENSION postgis SET SCHEMA extensions;\n`;
        } catch (error) {
          console.error('Erreur lors du déplacement de l\'extension PostGIS:', error.message);
          sqlScript += `-- ERREUR lors du déplacement de l'extension PostGIS: ${error.message}\n`;
          sqlScript += `-- Note: Le déplacement de PostGIS peut nécessiter des privilèges d'administrateur et une reconfiguration\n`;
          sqlScript += `-- Recommandation: Exécuter manuellement avec un compte administrateur:\n`;
          sqlScript += `-- ALTER EXTENSION postgis SET SCHEMA extensions;\n`;
        }
      } catch (error) {
        console.error('Erreur lors de la création du schéma "extensions":', error.message);
        sqlScript += `-- ERREUR lors de la création du schéma "extensions": ${error.message}\n`;
      }
    } else if (postgisResult.rows.length > 0) {
      console.log(`L'extension PostGIS est déjà dans le schéma ${postgisResult.rows[0].schema}`);
      sqlScript += `-- L'extension PostGIS est déjà dans le schéma ${postgisResult.rows[0].schema}\n`;
    } else {
      console.log('Extension PostGIS non trouvée');
      sqlScript += `-- Extension PostGIS non trouvée\n`;
    }
    
    // 3. Recommandations pour l'authentification
    console.log('\n=== RECOMMANDATIONS POUR L\'AUTHENTIFICATION ===');
    sqlScript += `\n-- Recommandations pour l'authentification\n`;
    sqlScript += `-- Ces paramètres doivent être configurés dans l'interface Supabase ou via l'API d'administration\n`;
    sqlScript += `-- 1. Réduire l'expiration des OTP à moins d'une heure\n`;
    sqlScript += `-- 2. Activer la protection contre les mots de passe compromis\n\n`;
    
    console.log('1. Réduire l\'expiration des OTP à moins d\'une heure (via interface Supabase)');
    console.log('2. Activer la protection contre les mots de passe compromis (via interface Supabase)');
    
    // Sauvegarder le script SQL
    const scriptPath = path.join(__dirname, '..', 'supabase', 'additional_security_fixes_part2.sql');
    fs.writeFileSync(scriptPath, sqlScript);
    console.log(`\nScript SQL sauvegardé dans ${scriptPath}`);
    
    // Sauvegarder le script dans la base de données pour référence
    const saveScriptQuery = `
      INSERT INTO security_scripts (name, content, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (name) DO UPDATE
      SET content = $2, updated_at = NOW();
    `;
    
    try {
      await client.query(saveScriptQuery, ['additional_security_fixes_part2.sql', sqlScript]);
      console.log('Script SQL sauvegardé dans la table security_scripts');
    } catch (error) {
      console.error('Erreur lors de la sauvegarde du script dans la base de données:', error.message);
    }
    
    console.log('\n=== CORRECTION DES PROBLÈMES DE SÉCURITÉ SUPPLÉMENTAIRES TERMINÉE ===');
    console.log('Vérifiez le Security Advisor pour confirmer que les problèmes ont été résolus');
    console.log('Pour les paramètres d\'authentification, utilisez l\'interface Supabase ou l\'API d\'administration');
    
  } catch (error) {
    console.error('Erreur lors de la correction des problèmes de sécurité:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Exécution
fixAdditionalSecurityIssues().catch(console.error);
