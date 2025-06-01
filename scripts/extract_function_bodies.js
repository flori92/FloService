// Script pour extraire le corps complet des fonctions problématiques
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const pool = new Pool({
  host: 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Apollonf@vi92',
  ssl: { rejectUnauthorized: false }
});

const functionsToExtract = [
  'find_nearby_providers',
  'get_available_slots',
  'get_provider_availability_slots'
];

// Chemin vers le fichier SQL généré précédemment
const manualSqlFilePath = path.join(__dirname, '..', 'supabase', 'manual_security_fixes.sql');
// Chemin pour le nouveau fichier complet
const completeSqlFilePath = path.join(__dirname, '..', 'supabase', 'complete_security_fixes.sql');

(async () => {
  const client = await pool.connect();
  let completeSql = '';
  
  try {
    console.log('Extraction des corps de fonctions en cours...');
    
    // Fonction pour échapper correctement les caractères '$' dans le corps de fonction
    const escapeDollarQuote = (src) => {
      // Trouve une séquence de dollars unique
      let dollarTag = '$body$';
      let counter = 0;
      while (src.includes(dollarTag)) {
        dollarTag = `$body${counter}$`;
        counter++;
      }
      return { dollarTag, escapedSrc: src };
    };
    
    for (const fname of functionsToExtract) {
      console.log(`\n--- Corps de fonction pour ${fname} ---`);
      
      // 1. Récupérer toutes les signatures pour cette fonction
      const signatures = await client.query(`
        SELECT
          p.oid,
          p.proname,
          pg_get_function_identity_arguments(p.oid) AS identity_args,
          pg_get_function_arguments(p.oid) AS args,
          pg_get_function_result(p.oid) AS result_type,
          l.lanname AS language,
          p.prosrc AS source,
          p.proisstrict AS is_strict,
          p.provolatile AS volatility,
          p.proretset AS returns_set
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = 'public' AND p.proname = $1
        ORDER BY p.oid;
      `, [fname]);
      
      for (const row of signatures.rows) {
        console.log(`Fonction: ${row.proname}(${row.identity_args})`);
        console.log(`Type de retour: ${row.result_type}`);
        
        // Définir l'attribut VOLATILE/STABLE/IMMUTABLE
        let volatility;
        switch (row.volatility) {
          case 'v': volatility = 'VOLATILE'; break;
          case 's': volatility = 'STABLE'; break;
          case 'i': volatility = 'IMMUTABLE'; break;
          default: volatility = 'VOLATILE';
        }
        
        // Créer une chaîne de dollar unique pour échapper le corps
        const { dollarTag, escapedSrc } = escapeDollarQuote(row.source);
        
        // Générer la déclaration complète pour cette fonction
        const functionDef = `
-- Correction de ${row.proname}(${row.identity_args})
DROP FUNCTION IF EXISTS public.${row.proname}(${row.identity_args});
CREATE OR REPLACE FUNCTION public.${row.proname}(
  ${row.args}
)
RETURNS ${row.result_type}
LANGUAGE ${row.language}
${volatility}
${row.is_strict ? 'STRICT' : ''}
SECURITY INVOKER
SET search_path = public
AS ${dollarTag}
${escapedSrc}
${dollarTag};

`;
        completeSql += functionDef;
        console.log(`Corps de fonction extrait et définition générée pour ${row.proname}(${row.identity_args})`);
      }
    }
    
    // Ajouter les instructions PostGIS et d'authentification
    completeSql += `
-- ============================================================
-- INSTRUCTIONS POUR POSTGIS (NÉCESSITE PRIVILÈGES ADMIN)
-- ============================================================
-- Cette opération nécessite une planification et potentiellement l'intervention de l'équipe Supabase
-- car elle peut affecter toutes les données géospatiales de l'application.

-- 1. Approche recommandée par Supabase:
--    Contactez le support Supabase pour qu'ils vous aident à déplacer l'extension PostGIS
--    en toute sécurité, car cette opération peut nécessiter des privilèges administrateur.

-- 2. Alternative (si vous avez les privilèges suffisants):
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION postgis SET SCHEMA extensions;

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
    
    // Écrire le SQL complet dans un nouveau fichier
    fs.writeFileSync(completeSqlFilePath, completeSql);
    console.log(`\nScript SQL complet généré avec succès: ${completeSqlFilePath}`);
    
    // Sauvegarder dans la base de données si possible
    try {
      // Vérifier si la table security_scripts existe
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
            VALUES ('complete_security_fixes.sql', $1)
            ON CONFLICT (name) 
            DO UPDATE SET content = $1;
          `, [completeSql]);
          
          console.log('Script SQL sauvegardé dans la table security_scripts');
        } else {
          console.error('La table security_scripts existe mais n\'a pas la structure attendue (name, content)');
        }
      }
    } catch (error) {
      console.error(`Note: Erreur lors de la sauvegarde du script dans la base de données: ${error.message}`);
    }
    
  } catch (e) {
    console.error('Erreur lors de l\'extraction des corps de fonction:', e);
  } finally {
    client.release();
    await pool.end();
  }
  
  console.log('\nExécutez le script SQL complet dans la console Supabase pour finaliser la sécurisation.');
  console.log('Après exécution, vérifiez avec le Security Advisor que les problèmes sont résolus.');
})();
