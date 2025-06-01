/**
 * Script complet pour corriger toutes les fonctions avec chemin de recherche mutable
 * identifiées par le Security Advisor Supabase
 */

import pg from 'pg';

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

// Liste des fonctions à corriger
const functionsToFix = [
  // Fonctions déjà traitées
  'find_nearby_providers',
  'get_available_slots',
  'get_provider_availability_slots',
  
  // Fonctions restantes à corriger
  'update_last_seen',
  'get_translations',
  'get_provider_status',
  'get_messages',
  'count_messages',
  'mark_messages_as_read',
  'is_provider',
  'mark_message_as_read',
  'handle_new_message',
  'log_audit_action',
  'check_invoice_permissions',
  'get_user_conversations',
  
  // Fonctions additionnelles identifiées
  'safe_message_count',
  'check_table_exists',
  'send_message',
  'get_or_create_conversation',
  'get_conversation_by_id',
  'get_profile_by_id',
  'get_conversation_participants',
  'update_conversation_last_message',
  'has_conversation_access',
  'is_admin',
  'handle_message_notification',
  'generate_booking_reminder',
  'get_service_provider',
  'get_booking_participants',
  'get_invoice_booking'
];

async function fixAllMutableFunctions() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Démarrer une transaction
    await client.query('BEGIN');
    
    console.log('\n=== CORRECTION DES FONCTIONS AVEC CHEMIN DE RECHERCHE MUTABLE ===');
    console.log(`Total de ${functionsToFix.length} fonctions à traiter\n`);
    
    let successCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Traiter chaque fonction dans la liste
    for (const funcName of functionsToFix) {
      console.log(`\nTraitement de la fonction ${funcName}...`);
      
      try {
        // Récupérer toutes les surcharges de la fonction
        const overloads = await client.query(`
          SELECT
            p.oid,
            p.proname,
            pg_get_function_identity_arguments(p.oid) AS identity_args,
            pg_get_function_arguments(p.oid) AS args,
            pg_get_function_result(p.oid) AS result_type,
            l.lanname AS language
          FROM pg_proc p
          JOIN pg_namespace n ON n.oid = p.pronamespace
          JOIN pg_language l ON l.oid = p.prolang
          WHERE n.nspname = 'public' AND p.proname = $1
        `, [funcName]);
        
        if (overloads.rows.length === 0) {
          console.log(`Aucune fonction ${funcName} trouvée - peut-être déjà supprimée`);
          skippedCount++;
          continue;
        }
        
        console.log(`${overloads.rows.length} surcharge(s) trouvée(s) pour ${funcName}`);
        
        // Traiter chaque surcharge individuellement
        for (const func of overloads.rows) {
          console.log(`- Correction de ${func.proname}(${func.identity_args})`);
          
          // Vérifier si la fonction a déjà un search_path fixé
          const checkPath = await client.query(`
            SELECT proconfig 
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = $1 
            AND pg_get_function_identity_arguments(p.oid) = $2
          `, [func.proname, func.identity_args]);
          
          if (checkPath.rows.length > 0 && 
              checkPath.rows[0].proconfig && 
              checkPath.rows[0].proconfig.includes('search_path=public')) {
            console.log(`✅ La fonction a déjà un chemin de recherche fixé`);
            skippedCount++;
            continue;
          }
          
          // Tenter de définir le search_path avec ALTER FUNCTION
          try {
            const alterSQL = `
              ALTER FUNCTION public.${func.proname}(${func.identity_args})
              SET search_path = public;
            `;
            await client.query(alterSQL);
            console.log(`✅ Chemin de recherche fixé avec succès via ALTER FUNCTION`);
            successCount++;
          } catch (alterErr) {
            console.error(`❌ Erreur lors de l'ALTER FUNCTION: ${alterErr.message}`);
            
            // En cas d'échec, essayer de recréer la fonction avec son corps exact
            try {
              // Récupérer la définition complète
              const funcDef = await client.query(`
                SELECT pg_get_functiondef(oid) as definition
                FROM pg_proc
                WHERE proname = $1
                AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                AND oid = $2
              `, [func.proname, func.oid]);
              
              if (funcDef.rows.length > 0) {
                let definition = funcDef.rows[0].definition;
                
                // Vérifier si elle contient déjà SET search_path
                if (definition.includes('SET search_path')) {
                  console.log(`✅ La définition contient déjà SET search_path`);
                  skippedCount++;
                  continue;
                }
                
                // Sinon, modifier la définition pour ajouter SET search_path
                const asIndex = definition.indexOf(' AS ');
                if (asIndex > 0) {
                  // Trouver la position pour insérer SET search_path
                  const securityIndex = definition.lastIndexOf('SECURITY', asIndex);
                  let newDefinition;
                  
                  if (securityIndex > 0) {
                    // Il y a une clause SECURITY, ajouter après
                    const securityEnd = definition.indexOf('\n', securityIndex);
                    if (securityEnd > 0) {
                      newDefinition = definition.substring(0, securityEnd) + 
                                     '\nSET search_path = public' + 
                                     definition.substring(securityEnd);
                    } else {
                      newDefinition = definition.substring(0, asIndex) + 
                                     '\nSET search_path = public' + 
                                     definition.substring(asIndex);
                    }
                  } else {
                    // Pas de clause SECURITY, ajouter avant AS
                    newDefinition = definition.substring(0, asIndex) + 
                                   '\nSET search_path = public' + 
                                   definition.substring(asIndex);
                  }
                  
                  // Essayer d'appliquer la nouvelle définition
                  try {
                    await client.query(newDefinition);
                    console.log(`✅ Fonction recréée avec search_path fixé`);
                    successCount++;
                  } catch (createErr) {
                    console.error(`❌ Erreur lors de la recréation: ${createErr.message}`);
                    console.log(`Définition qui a échoué (début): ${newDefinition.substring(0, 200)}...`);
                    errorCount++;
                  }
                } else {
                  console.error(`❌ Impossible de trouver la position pour insérer SET search_path`);
                  errorCount++;
                }
              } else {
                console.error(`❌ Impossible de récupérer la définition complète de la fonction`);
                errorCount++;
              }
            } catch (defErr) {
              console.error(`❌ Erreur lors de la récupération de la définition: ${defErr.message}`);
              errorCount++;
            }
          }
        }
      } catch (error) {
        console.error(`❌ Erreur lors du traitement de ${funcName}: ${error.message}`);
        errorCount++;
      }
    }
    
    // Tenter de déplacer PostGIS vers le schéma extensions
    console.log('\n=== TENTATIVE DE CORRECTION POSTGIS ===');
    try {
      await client.query('CREATE SCHEMA IF NOT EXISTS extensions;');
      console.log('✅ Schéma extensions créé ou déjà existant');
      
      try {
        await client.query('ALTER EXTENSION postgis SET SCHEMA extensions;');
        console.log('✅ Extension PostGIS déplacée vers le schéma extensions');
      } catch (postgisErr) {
        console.error(`❌ Erreur lors du déplacement de PostGIS: ${postgisErr.message}`);
        console.log('⚠️ Cette opération nécessite probablement des privilèges administrateur');
        console.log('   Contactez le support Supabase pour cette opération');
      }
    } catch (schemaErr) {
      console.error(`❌ Erreur lors de la création du schéma: ${schemaErr.message}`);
    }
    
    // Valider la transaction
    await client.query('COMMIT');
    console.log('\n=== RÉSUMÉ DES OPÉRATIONS ===');
    console.log(`✅ Fonctions corrigées avec succès: ${successCount}`);
    console.log(`⏩ Fonctions ignorées (déjà corrigées ou non trouvées): ${skippedCount}`);
    console.log(`❌ Erreurs rencontrées: ${errorCount}`);
    
    // Sauvegarder le script dans la table security_scripts
    try {
      const scriptContent = `
-- Script de correction des fonctions avec chemin de recherche mutable
-- Généré automatiquement le ${new Date().toISOString()}
-- ${successCount} fonctions corrigées, ${skippedCount} fonctions ignorées, ${errorCount} erreurs

-- Correction de tous les chemins de recherche mutable pour les fonctions PostgreSQL
-- en utilisant ALTER FUNCTION ... SET search_path = public

-- Fonctions corrigées:
${functionsToFix.map(f => `-- - ${f}`).join('\n')}

-- Note: Pour l'extension PostGIS, contacter le support Supabase
-- afin de la déplacer du schéma public vers un schéma dédié 'extensions'

-- Recommendations pour l'authentification:
-- 1. Configurer "Email OTP Expiry time" à 30 minutes
-- 2. Activer "Protect against leaked passwords"
      `.trim();
      
      await client.query(`
        INSERT INTO public.security_scripts (name, script_content, executed_at, created_by)
        VALUES ($1, $2, NOW(), 'security_fix_script')
        ON CONFLICT (name) 
        DO UPDATE SET 
          script_content = $2, 
          executed_at = NOW(),
          created_by = 'security_fix_script'
      `, ['fix_mutable_search_path_complete', scriptContent]);
      
      console.log('✅ Script sauvegardé dans la table security_scripts');
    } catch (saveErr) {
      console.error(`❌ Erreur lors de la sauvegarde du script: ${saveErr.message}`);
    }
    
  } catch (error) {
    // En cas d'erreur, annuler la transaction
    if (client) {
      await client.query('ROLLBACK');
      console.error('⚠️ Transaction annulée en raison d\'une erreur');
    }
    console.error('Erreur globale:', error);
  } finally {
    // Libération de la connexion et fermeture du pool
    if (client) client.release();
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
    
    console.log('\n=== PROCHAINES ÉTAPES ===');
    console.log('1. Vérifiez les résultats avec le Security Advisor:');
    console.log('   npx supabase functions invoke security-advisor --project-ref sxrofrdhpzpjqkplgoij');
    console.log('2. Pour l\'authentification, dans la console Supabase:');
    console.log('   - Authentication > Settings');
    console.log('   - "Email OTP Expiry time" à 30 minutes');
    console.log('   - Activer "Protect against leaked passwords"');
    console.log('3. Pour PostGIS:');
    console.log('   - Contactez le support Supabase pour déplacer l\'extension');
    console.log('   - Ou créez un ticket de demande avec les détails nécessaires');
  }
}

// Exécuter le script
fixAllMutableFunctions().catch(console.error);
