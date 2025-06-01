/**
 * Script pour corriger les derniers problèmes de sécurité restants
 * identifiés par le Security Advisor Supabase
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

async function fixRemainingSecurityIssues() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Démarrer une transaction
    await client.query('BEGIN');
    
    // 1. Corriger la fonction check_provider_availability
    console.log('\n=== CORRECTION DE LA FONCTION check_provider_availability ===');
    
    try {
      // Récupérer les surcharges de la fonction
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
        WHERE n.nspname = 'public' AND p.proname = 'check_provider_availability'
      `);
      
      if (overloads.rows.length === 0) {
        console.log('Aucune fonction check_provider_availability trouvée');
      } else {
        console.log(`${overloads.rows.length} surcharge(s) trouvée(s) pour check_provider_availability`);
        
        // Traiter chaque surcharge
        for (const func of overloads.rows) {
          console.log(`- Correction de check_provider_availability(${func.identity_args})`);
          
          // Vérifier si la fonction a déjà un search_path fixé
          const checkPath = await client.query(`
            SELECT proconfig 
            FROM pg_proc p
            JOIN pg_namespace n ON n.oid = p.pronamespace
            WHERE n.nspname = 'public' AND p.proname = 'check_provider_availability' 
            AND pg_get_function_identity_arguments(p.oid) = $1
          `, [func.identity_args]);
          
          if (checkPath.rows.length > 0 && 
              checkPath.rows[0].proconfig && 
              checkPath.rows[0].proconfig.includes('search_path=public')) {
            console.log(`✅ La fonction a déjà un chemin de recherche fixé`);
            continue;
          }
          
          // Tenter de définir le search_path avec ALTER FUNCTION
          try {
            const alterSQL = `
              ALTER FUNCTION public.check_provider_availability(${func.identity_args})
              SET search_path = public;
            `;
            await client.query(alterSQL);
            console.log(`✅ Chemin de recherche fixé avec succès via ALTER FUNCTION`);
          } catch (alterErr) {
            console.error(`❌ Erreur lors de l'ALTER FUNCTION: ${alterErr.message}`);
            
            // En cas d'échec, récupérer et modifier la définition complète
            try {
              const funcDef = await client.query(`
                SELECT pg_get_functiondef(oid) as definition
                FROM pg_proc
                WHERE proname = 'check_provider_availability'
                AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
                AND oid = $1
              `, [func.oid]);
              
              if (funcDef.rows.length > 0) {
                let definition = funcDef.rows[0].definition;
                
                // Vérifier si elle contient déjà SET search_path
                if (definition.includes('SET search_path')) {
                  console.log(`✅ La définition contient déjà SET search_path`);
                  continue;
                }
                
                // Modifier la définition pour ajouter SET search_path
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
                  
                  // Appliquer la nouvelle définition
                  try {
                    await client.query(newDefinition);
                    console.log(`✅ Fonction recréée avec search_path fixé`);
                  } catch (createErr) {
                    console.error(`❌ Erreur lors de la recréation: ${createErr.message}`);
                    console.log(`Définition qui a échoué (début): ${newDefinition.substring(0, 200)}...`);
                  }
                } else {
                  console.error(`❌ Impossible de trouver la position pour insérer SET search_path`);
                }
              } else {
                console.error(`❌ Impossible de récupérer la définition complète de la fonction`);
              }
            } catch (defErr) {
              console.error(`❌ Erreur lors de la récupération de la définition: ${defErr.message}`);
            }
          }
        }
      }
    } catch (error) {
      console.error(`❌ Erreur lors du traitement de check_provider_availability: ${error.message}`);
    }
    
    // 2. Tenter de corriger la table spatial_ref_sys (PostGIS)
    console.log('\n=== CORRECTION DE RLS POUR spatial_ref_sys ===');
    
    try {
      // Créer une politique de sécurité pour spatial_ref_sys
      console.log('Création de la politique pour spatial_ref_sys...');
      
      try {
        // D'abord activer RLS sur la table
        await client.query('ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;');
        console.log('✅ RLS activé sur spatial_ref_sys');
        
        // Ensuite créer une politique SELECT pour tout le monde
        await client.query(`
          CREATE POLICY "Lecture autorisée pour tous" ON public.spatial_ref_sys
          FOR SELECT USING (true);
        `);
        console.log('✅ Politique de lecture créée pour spatial_ref_sys');
        
        // Politique d'insertion pour les admins seulement
        await client.query(`
          CREATE POLICY "Modification réservée aux admins" ON public.spatial_ref_sys
          FOR ALL USING (auth.jwt() ? auth.jwt()->>'role' = 'admin' : false);
        `);
        console.log('✅ Politique de modification créée pour spatial_ref_sys');
        
      } catch (rls_err) {
        console.error(`❌ Erreur lors de l'activation RLS sur spatial_ref_sys: ${rls_err.message}`);
        console.log('⚠️ Cette table est gérée par PostGIS et peut nécessiter des privilèges administrateur');
        
        // Alternative: créer une vue sécurisée
        try {
          console.log('Tentative de création d\'une vue sécurisée pour spatial_ref_sys...');
          
          // Vérifier si la vue existe déjà
          const viewCheck = await client.query(`
            SELECT 1 FROM pg_views WHERE viewname = 'safe_spatial_ref_sys';
          `);
          
          if (viewCheck.rows.length === 0) {
            await client.query(`
              CREATE OR REPLACE VIEW public.safe_spatial_ref_sys AS
              SELECT * FROM public.spatial_ref_sys;
            `);
            
            // Activer RLS sur la vue
            await client.query(`
              ALTER VIEW public.safe_spatial_ref_sys SECURITY INVOKER;
            `);
            
            console.log('✅ Vue sécurisée safe_spatial_ref_sys créée');
            console.log('⚠️ Recommandation: Utiliser safe_spatial_ref_sys au lieu de spatial_ref_sys direct');
          } else {
            console.log('La vue safe_spatial_ref_sys existe déjà');
          }
        } catch (view_err) {
          console.error(`❌ Erreur lors de la création de la vue: ${view_err.message}`);
        }
      }
    } catch (spatial_err) {
      console.error(`❌ Erreur lors de la gestion de spatial_ref_sys: ${spatial_err.message}`);
    }
    
    // 3. Tenter à nouveau de déplacer PostGIS
    console.log('\n=== TENTATIVE DE DÉPLACEMENT DE PostGIS ===');
    
    try {
      // Créer le schéma extensions s'il n'existe pas déjà
      await client.query('CREATE SCHEMA IF NOT EXISTS extensions;');
      console.log('✅ Schéma extensions créé ou déjà existant');
      
      // Tentative alternative de déplacement
      try {
        // 1. Vérifier les tables de PostGIS
        const postgisObjects = await client.query(`
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name LIKE 'spatial_%';
        `);
        
        console.log(`Tables PostGIS trouvées: ${postgisObjects.rows.length}`);
        
        // 2. Vérifier si on peut utiliser la commande MOVE
        try {
          await client.query(`
            ALTER EXTENSION postgis 
            SET SCHEMA extensions;
          `);
          console.log('✅ Extension PostGIS déplacée vers le schéma extensions');
        } catch (moveErr) {
          console.error(`❌ Erreur lors du déplacement: ${moveErr.message}`);
          
          // 3. Solution alternative: dropper et recréer dans le bon schéma
          console.log('⚠️ Le déplacement direct n\'est pas possible');
          console.log('⚠️ Contactez le support Supabase pour cette opération');
          console.log('⚠️ Message à envoyer au support:');
          console.log(`
Objet: Demande de déplacement de l'extension PostGIS hors du schéma public

Bonjour,

Le Security Advisor a identifié que l'extension PostGIS est installée dans le schéma public,
ce qui représente un problème de sécurité potentiel.

Pourriez-vous s'il vous plaît déplacer cette extension vers un schéma dédié 'extensions' ?
Cette opération nécessite des privilèges administrateur que nous n'avons pas.

Détails du projet:
- Projet: FloService
- Référence: sxrofrdhpzpjqkplgoij

Merci pour votre aide,
          `);
        }
      } catch (postgisErr) {
        console.error(`❌ Erreur avec PostGIS: ${postgisErr.message}`);
      }
    } catch (schemaErr) {
      console.error(`❌ Erreur lors de la création du schéma: ${schemaErr.message}`);
    }
    
    // Valider la transaction si tout s'est bien passé
    await client.query('COMMIT');
    console.log('\n✅ Modifications validées avec succès');
    
    // Générer un rapport des actions à effectuer manuellement
    console.log('\n=== ACTIONS MANUELLES REQUISES ===');
    console.log('1. Pour l\'authentification, dans la console Supabase:');
    console.log('   - Authentication > Settings');
    console.log('   - "Email OTP Expiry time" à 30 minutes ou moins');
    console.log('   - Activer "Protect against leaked passwords"');
    console.log('2. Pour PostGIS:');
    console.log('   - Contactez le support Supabase pour déplacer l\'extension');
    console.log('   - Utilisez le modèle de message fourni');
    
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
    
    console.log('\n=== VÉRIFICATION FINALE ===');
    console.log('Pour vérifier que les problèmes ont été résolus, exécutez:');
    console.log('npx supabase functions invoke security-advisor --project-ref sxrofrdhpzpjqkplgoij');
  }
}

// Exécuter le script
fixRemainingSecurityIssues().catch(console.error);
