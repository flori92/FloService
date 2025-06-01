/**
 * Script pour vérifier les politiques RLS sur la table profiles et la définition de la fonction is_provider.
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
  host: process.env.DB_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Apollonf@vi92',
  ssl: {
    rejectUnauthorized: false,
  },
});

async function checkRLSPoliciesForTable(tableName) {
  console.log(`\n🔍 Vérification des politiques RLS pour la table ${tableName}...`);
  const client = await pool.connect();
  try {
    const rlsQuery = `
      SELECT relrowsecurity
      FROM pg_class
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE nspname = 'public'
      AND relname = $1;
    `;
    const rlsResult = await client.query(rlsQuery, [tableName]);

    if (rlsResult.rows.length === 0) {
      console.error(`❌ Table ${tableName} non trouvée lors de la vérification RLS.`);
      return;
    }

    const rlsEnabled = rlsResult.rows[0].relrowsecurity;
    if (!rlsEnabled) {
      console.error(`❌ RLS n'est pas activé pour la table ${tableName}!`);
    } else {
      console.log(`✅ RLS est activé pour la table ${tableName}.`);
      const policiesQuery = `
        SELECT 
          polname, 
          polcmd, 
          pg_get_expr(polqual, polrelid) as using_definition, 
          pg_get_expr(polwithcheck, polrelid) as with_check_definition
        FROM pg_policy
        JOIN pg_class ON pg_policy.polrelid = pg_class.oid
        JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
        WHERE nspname = 'public'
        AND relname = $1;
      `;
      const policiesResult = await client.query(policiesQuery, [tableName]);
      if (policiesResult.rows.length === 0) {
        console.error(`❌ Aucune politique RLS trouvée pour la table ${tableName}!`);
      } else {
        console.log(`✅ ${policiesResult.rows.length} politiques RLS trouvées pour ${tableName}:`);
        policiesResult.rows.forEach(policy => {
          let cmdType = '';
          switch(policy.polcmd) {
            case 'r': cmdType = 'SELECT'; break;
            case 'a': cmdType = 'INSERT'; break;
            case 'w': cmdType = 'UPDATE'; break;
            case 'd': cmdType = 'DELETE'; break;
            case '*': cmdType = 'ALL'; break;
            default: cmdType = policy.polcmd;
          }
          console.log(`   - Nom: ${policy.polname}`);
          console.log(`     Commande: ${cmdType}`);
          if (policy.using_definition) console.log(`     USING: ${policy.using_definition}`);
          if (policy.with_check_definition) console.log(`     WITH CHECK: ${policy.with_check_definition}`);
        });
      }
    }
  } finally {
    client.release();
  }
}

async function checkFunctionDefinition(functionName, expectedArgsString) {
  console.log(`\n🔍 Vérification de la fonction ${functionName}(${expectedArgsString || ''})...`);
  const client = await pool.connect();
  try {
    const funcQuery = `
      SELECT proname, prosrc, pg_get_function_identity_arguments(pg_proc.oid) as proargs
      FROM pg_proc
      JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
      WHERE nspname = 'public'
      AND proname = $1;
    `;
    const funcResult = await client.query(funcQuery, [functionName]);

    if (funcResult.rows.length === 0) {
      console.error(`❌ Fonction ${functionName} non trouvée.`);
      return;
    }

    const matchingFunctions = funcResult.rows.filter(row => (expectedArgsString === undefined || row.proargs === expectedArgsString));
    if (matchingFunctions.length === 0) {
        console.error(`❌ Fonction ${functionName} avec la signature (${expectedArgsString}) non trouvée.`);
        console.log(`   Versions trouvées de ${functionName}:`);
        funcResult.rows.forEach(f => {
          console.log(`     - ${f.proname}(${f.proargs})`);
          if (!f.prosrc || !f.prosrc.includes('SET search_path = public')) {
            console.warn(`       ⚠️ La fonction ${f.proname}(${f.proargs}) N'A PAS de SET search_path = public.`);
          } else {
            console.log(`       ✅ La fonction ${f.proname}(${f.proargs}) EST SÉCURISÉE (contient SET search_path).`);
          }
        });
        return;
    }

    matchingFunctions.forEach(func => {
      console.log(`✅ Fonction trouvée: ${func.proname}(${func.proargs})`);
      if (!func.prosrc || !func.prosrc.includes('SET search_path = public')) {
        console.warn(`⚠️ La fonction ${func.proname}(${func.proargs}) n'a pas de SET search_path = public.`);
      } else {
        console.log(`✅ La fonction ${func.proname}(${func.proargs}) est sécurisée (contient SET search_path).`);
      }
      // console.log('   Définition (prosrc):\n', func.prosrc); // Uncomment to see full source
    });

  } finally {
    client.release();
  }
}

async function checkColumnDetails(tableName, columnName) {
  console.log(`\n🔍 Vérification des détails de la colonne ${columnName} dans la table ${tableName}...`);
  const client = await pool.connect();
  try {
    const colQuery = `
      SELECT column_name, data_type, is_nullable, column_default, generation_expression
      FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2;
    `;
    const colResult = await client.query(colQuery, [tableName, columnName]);
    if (colResult.rows.length === 0) {
      console.error(`❌ Colonne ${columnName} non trouvée dans la table ${tableName}.`);
      return;
    }
    const colDetails = colResult.rows[0];
    console.log(`✅ Détails pour ${tableName}.${columnName}:`);
    console.log(`   - Type de données: ${colDetails.data_type}`);
    console.log(`   - Nullable: ${colDetails.is_nullable}`);
    console.log(`   - Défaut: ${colDetails.column_default}`);
    console.log(`   - Expression de génération: ${colDetails.generation_expression || 'N/A'}`);
    if (colDetails.generation_expression) {
      console.warn(`⚠️ La colonne ${columnName} est une colonne générée.`);
    }

  } finally {
    client.release();
  }
}

async function main() {
  try {
    await checkRLSPoliciesForTable('profiles');
    await checkColumnDetails('profiles', 'is_provider');
    // La fonction is_provider peut avoir des arguments ou non, selon sa définition.
    // D'après supabase-secure.ts, elle est appelée sans argument direct, mais peut prendre user_id implicitement.
    // D'après MEMORY[66d69d57-5731-482f-a87f-4cbf20130198], elle a été corrigée.
    // D'après Database interface dans supabase-secure.ts: is_provider: { Args: { user_id?: string }; Returns: boolean; };
    // Donc on s'attend à is_provider(user_id uuid) ou is_provider() si user_id est optionnel et récupéré via auth.uid()
    await checkFunctionDefinition('is_provider', ''); // Check for is_provider()
    await checkFunctionDefinition('is_provider', 'user_id uuid'); // Check for is_provider(user_id uuid)
    await checkFunctionDefinition('is_provider', 'user_id text'); // Check for is_provider(user_id text) as per Database interface

  } catch (error) {
    console.error('❌ Erreur lors de la vérification de profiles/is_provider:', error);
  } finally {
    await pool.end();
    console.log('\n🏁 Fin du script de vérification profiles/is_provider.');
  }
}

main();
