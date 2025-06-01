/**
 * Script pour vérifier la structure de la base de données Supabase
 * Ce script liste les tables, leurs colonnes et les politiques RLS existantes
 */

import pg from 'pg';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

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

async function checkDatabaseStructure() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Récupérer la liste des tables
    console.log('\n=== TABLES EXISTANTES ===');
    const tablesResult = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    const tables = tablesResult.rows.map(row => row.tablename);
    console.log(tables);
    
    // Récupérer la structure de chaque table
    console.log('\n=== STRUCTURE DES TABLES ===');
    for (const table of tables) {
      const columnsResult = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [table]);
      
      console.log(`\nTable: ${table}`);
      console.log('Colonnes:');
      columnsResult.rows.forEach(col => {
        console.log(`  - ${col.column_name} (${col.data_type}, ${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
      });
      
      // Vérifier si le RLS est activé
      const rlsResult = await client.query(`
        SELECT relrowsecurity
        FROM pg_class
        WHERE oid = $1::regclass
      `, [`public.${table}`]);
      
      if (rlsResult.rows.length > 0) {
        console.log(`RLS activé: ${rlsResult.rows[0].relrowsecurity}`);
      }
      
      // Récupérer les politiques RLS existantes
      const policiesResult = await client.query(`
        SELECT polname, polcmd
        FROM pg_policy
        WHERE polrelid = $1::regclass
      `, [`public.${table}`]);
      
      if (policiesResult.rows.length > 0) {
        console.log('Politiques RLS:');
        policiesResult.rows.forEach(policy => {
          console.log(`  - ${policy.polname} (${policy.polcmd})`);
        });
      } else {
        console.log('Aucune politique RLS définie');
      }
    }
    
    // Vérifier les vues
    console.log('\n=== VUES EXISTANTES ===');
    const viewsResult = await client.query(`
      SELECT viewname, definition
      FROM pg_views
      WHERE schemaname = 'public'
      ORDER BY viewname
    `);
    
    if (viewsResult.rows.length > 0) {
      viewsResult.rows.forEach(view => {
        console.log(`\nVue: ${view.viewname}`);
        console.log(`Définition: ${view.definition.substring(0, 100)}...`);
      });
    } else {
      console.log('Aucune vue définie');
    }
    
    // Vérifier les fonctions
    console.log('\n=== FONCTIONS EXISTANTES ===');
    const functionsResult = await client.query(`
      SELECT proname, prosrc
      FROM pg_proc
      WHERE pronamespace = 'public'::regnamespace
      ORDER BY proname
    `);
    
    if (functionsResult.rows.length > 0) {
      functionsResult.rows.forEach(func => {
        console.log(`\nFonction: ${func.proname}`);
        console.log(`Source: ${func.prosrc.substring(0, 100)}...`);
      });
    } else {
      console.log('Aucune fonction définie');
    }
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
    console.log('\nAnalyse de la structure terminée');
    
  } catch (error) {
    console.error('Erreur lors de l\'analyse de la structure:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
checkDatabaseStructure();
