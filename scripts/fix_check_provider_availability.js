/**
 * Script spécifique pour corriger la fonction check_provider_availability
 * qui possède toujours un chemin de recherche mutable
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

async function fixCheckProviderAvailability() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Récupérer les détails complets de la fonction
    const functionDetails = await client.query(`
      SELECT
        p.oid,
        p.proname,
        pg_get_function_identity_arguments(p.oid) AS identity_args,
        pg_get_function_arguments(p.oid) AS args,
        pg_get_function_result(p.oid) AS result_type,
        l.lanname AS language,
        p.prosrc AS source,
        p.provolatile,
        p.proleakproof,
        p.pronargs,
        p.pronargdefaults,
        p.proretset,
        p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      JOIN pg_language l ON l.oid = p.prolang
      WHERE n.nspname = 'public' AND p.proname = 'check_provider_availability'
    `);
    
    console.log(`Nombre de surcharges trouvées: ${functionDetails.rows.length}`);
    
    // Traiter chaque surcharge
    for (const func of functionDetails.rows) {
      console.log(`\nAnalyse de check_provider_availability(${func.identity_args})`);
      
      // Vérifier si la fonction a déjà un search_path fixé
      if (func.proconfig && func.proconfig.includes('search_path=public')) {
        console.log(`✅ Cette surcharge a déjà un chemin de recherche fixé: ${func.proconfig}`);
        continue;
      }
      
      console.log('⚠️ Cette surcharge a un chemin de recherche mutable');
      
      // Récupérer la définition complète
      const functionDef = await client.query(`
        SELECT pg_get_functiondef(oid) as definition
        FROM pg_proc
        WHERE proname = 'check_provider_availability'
        AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        AND oid = $1
      `, [func.oid]);
      
      if (functionDef.rows.length === 0) {
        console.error('❌ Impossible de récupérer la définition de la fonction');
        continue;
      }
      
      const definition = functionDef.rows[0].definition;
      console.log(`Définition de la fonction (extrait): ${definition.substring(0, 200)}...`);
      
      // Essai de correction avec ALTER FUNCTION direct
      try {
        const alterResult = await client.query(`
          ALTER FUNCTION public.check_provider_availability(${func.identity_args})
          SET search_path = public;
        `);
        
        console.log('✅ Chemin de recherche fixé avec succès via ALTER FUNCTION');
      } catch (alterErr) {
        console.error(`❌ Erreur lors de l'ALTER FUNCTION: ${alterErr.message}`);
        
        // Si ALTER échoue, essayer de recréer la fonction avec search_path
        try {
          // Insérer SET search_path dans la définition
          let newDefinition = '';
          
          // Trouver la position pour insérer
          const languagePos = definition.indexOf('LANGUAGE ');
          const asPos = definition.indexOf(' AS ');
          
          if (asPos > 0) {
            // Pour les fonctions SQL ou avec AS
            const securityPos = definition.lastIndexOf('SECURITY', asPos);
            
            if (securityPos > 0) {
              // Insérer après SECURITY DEFINER/INVOKER
              const securityEnd = definition.indexOf('\n', securityPos);
              if (securityEnd > 0) {
                newDefinition = definition.substring(0, securityEnd) + 
                              '\nSET search_path = public' + 
                              definition.substring(securityEnd);
              } else {
                newDefinition = definition.substring(0, asPos) + 
                              '\nSET search_path = public' + 
                              definition.substring(asPos);
              }
            } else {
              // Pas de clause SECURITY, insérer avant AS
              newDefinition = definition.substring(0, asPos) + 
                            '\nSET search_path = public' + 
                            definition.substring(asPos);
            }
          } else if (languagePos > 0) {
            // Pour les fonctions PL/pgSQL sans AS explicite
            const volatilePos = definition.indexOf('VOLATILE', languagePos);
            const stablePos = definition.indexOf('STABLE', languagePos);
            const immutablePos = definition.indexOf('IMMUTABLE', languagePos);
            
            let insertPos = -1;
            if (volatilePos > 0) insertPos = volatilePos;
            else if (stablePos > 0) insertPos = stablePos;
            else if (immutablePos > 0) insertPos = immutablePos;
            
            if (insertPos > 0) {
              // Insérer avant VOLATILE/STABLE/IMMUTABLE
              newDefinition = definition.substring(0, insertPos) + 
                            'SET search_path = public\n' + 
                            definition.substring(insertPos);
            } else {
              // Insérer après LANGUAGE
              const languageEnd = definition.indexOf('\n', languagePos);
              if (languageEnd > 0) {
                newDefinition = definition.substring(0, languageEnd) + 
                              '\nSET search_path = public' + 
                              definition.substring(languageEnd);
              } else {
                // Dernier recours: insérer juste après LANGUAGE plpgsql
                const endPos = definition.indexOf(';', languagePos);
                if (endPos > 0) {
                  newDefinition = definition.substring(0, endPos) + 
                                '\nSET search_path = public' + 
                                definition.substring(endPos);
                } else {
                  console.error('❌ Impossible de trouver où insérer SET search_path');
                  continue;
                }
              }
            }
          } else {
            console.error('❌ Structure de fonction non reconnue');
            continue;
          }
          
          console.log(`Nouvelle définition (extrait): ${newDefinition.substring(0, 200)}...`);
          
          // Exécuter la nouvelle définition
          await client.query(newDefinition);
          console.log('✅ Fonction recréée avec search_path fixé');
          
        } catch (recreateErr) {
          console.error(`❌ Erreur lors de la recréation: ${recreateErr.message}`);
          
          // Dernière option: recréer complètement la fonction avec le corps exact
          try {
            // Extraire le corps de la fonction
            let functionBody = '';
            if (func.language === 'plpgsql') {
              // Pour PL/pgSQL, le corps est entre $$ et $$
              const bodyStart = func.source.indexOf('$$') + 2;
              const bodyEnd = func.source.lastIndexOf('$$');
              if (bodyStart > 1 && bodyEnd > bodyStart) {
                functionBody = func.source.substring(bodyStart, bodyEnd);
              }
            } else {
              // Pour SQL, le corps est directement dans prosrc
              functionBody = func.source;
            }
            
            if (!functionBody) {
              console.error('❌ Impossible d\'extraire le corps de la fonction');
              continue;
            }
            
            // Déterminer la volatilité
            const volatility = func.provolatile === 'v' ? 'VOLATILE' : 
                              func.provolatile === 's' ? 'STABLE' : 
                              'IMMUTABLE';
            
            // Recréer la fonction complètement
            const recreateSQL = `
CREATE OR REPLACE FUNCTION public.check_provider_availability(${func.args})
RETURNS ${func.result_type}
LANGUAGE ${func.language}
${volatility}
${func.proleakproof ? 'LEAKPROOF' : ''}
${func.proretset ? 'RETURNS SETOF' : ''}
SECURITY INVOKER
SET search_path = public
AS $function$
${functionBody}
$function$;
            `;
            
            console.log(`Recréation complète (extrait): ${recreateSQL.substring(0, 200)}...`);
            
            await client.query(recreateSQL);
            console.log('✅ Fonction entièrement recréée avec search_path fixé');
            
          } catch (finalErr) {
            console.error(`❌ Échec de la recréation complète: ${finalErr.message}`);
            
            // Stocker la définition pour référence manuelle
            console.log('\n⚠️ Cette fonction devra être corrigée manuellement.');
            console.log('Voici la définition actuelle:');
            console.log(definition);
          }
        }
      }
    }
    
    // Vérifier si la correction a fonctionné
    const checkResult = await client.query(`
      SELECT
        p.proname,
        pg_get_function_identity_arguments(p.oid) AS identity_args,
        p.proconfig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'check_provider_availability'
    `);
    
    console.log('\n=== VÉRIFICATION FINALE ===');
    let allFixed = true;
    
    for (const func of checkResult.rows) {
      if (!func.proconfig || !func.proconfig.includes('search_path=public')) {
        console.log(`❌ La fonction check_provider_availability(${func.identity_args}) a toujours un chemin mutable`);
        allFixed = false;
      } else {
        console.log(`✅ La fonction check_provider_availability(${func.identity_args}) a un chemin fixe: ${func.proconfig}`);
      }
    }
    
    if (allFixed) {
      console.log('✅ Toutes les surcharges de check_provider_availability ont été corrigées');
    } else {
      console.log('⚠️ Certaines surcharges n\'ont pas pu être corrigées automatiquement');
    }
    
  } catch (error) {
    console.error('Erreur globale:', error);
  } finally {
    // Libération de la connexion et fermeture du pool
    if (client) client.release();
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
  }
}

// Exécuter le script
fixCheckProviderAvailability().catch(console.error);
