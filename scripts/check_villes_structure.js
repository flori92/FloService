/**
 * Script pour vérifier la structure de la table villes dans Supabase
 * Créé le 03/06/2025
 */

import pg from 'pg';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

// Chargement des variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion directe à PostgreSQL
const { Pool } = pg;
const pool = new Pool({
  host: process.env.SUPABASE_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: parseInt(process.env.SUPABASE_PORT || '5432'),
  database: process.env.SUPABASE_DATABASE || 'postgres',
  user: process.env.SUPABASE_USER || 'postgres',
  password: process.env.SUPABASE_PASSWORD || 'Apollonf@vi92',
  ssl: {
    rejectUnauthorized: false
  }
});

// Fonction pour vérifier la structure de la table villes
async function checkVillesStructure() {
  console.log('=== VÉRIFICATION DE LA STRUCTURE DE LA TABLE VILLES ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Vérifier si la table villes existe
    const tableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'villes'
      );
    `;
    
    const tableResult = await client.query(tableQuery);
    const tableExists = tableResult.rows[0].exists;
    
    if (tableExists) {
      console.log('✅ La table villes existe dans la base de données');
      
      // Récupérer la structure de la table
      const columnsQuery = `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'villes'
        ORDER BY ordinal_position;
      `;
      
      const columnsResult = await client.query(columnsQuery);
      
      console.log(`\n--- Structure de la table villes (${columnsResult.rows.length} colonnes) ---`);
      columnsResult.rows.forEach(row => {
        console.log(`- ${row.column_name} (${row.data_type}, ${row.is_nullable === 'YES' ? 'nullable' : 'not nullable'})`);
      });
      
      // Récupérer les index de la table
      const indexQuery = `
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'villes'
        ORDER BY indexname;
      `;
      
      const indexResult = await client.query(indexQuery);
      
      console.log(`\n--- Index sur la table villes (${indexResult.rows.length}) ---`);
      indexResult.rows.forEach(row => {
        console.log(`- ${row.indexname}: ${row.indexdef}`);
      });
      
      // Récupérer les politiques RLS sur la table
      const policyQuery = `
        SELECT policyname, permissive, cmd, qual
        FROM pg_policies
        WHERE tablename = 'villes';
      `;
      
      const policyResult = await client.query(policyQuery);
      
      console.log(`\n--- Politiques RLS sur la table villes (${policyResult.rows.length}) ---`);
      policyResult.rows.forEach(row => {
        console.log(`- ${row.policyname} (${row.permissive ? 'permissive' : 'restrictive'}, ${row.cmd}): ${row.qual}`);
      });
      
      // Vérifier si la table contient des données
      const countQuery = `
        SELECT COUNT(*) FROM public.villes;
      `;
      
      const countResult = await client.query(countQuery);
      const rowCount = parseInt(countResult.rows[0].count);
      
      console.log(`\n--- Nombre d'enregistrements dans la table villes: ${rowCount} ---`);
      
      if (rowCount > 0) {
        // Afficher quelques exemples de données
        const dataQuery = `
          SELECT * FROM public.villes LIMIT 5;
        `;
        
        const dataResult = await client.query(dataQuery);
        
        console.log('\n--- Exemples de données dans la table villes ---');
        dataResult.rows.forEach((row, index) => {
          console.log(`\nEnregistrement ${index + 1}:`);
          Object.entries(row).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
          });
        });
      }
      
    } else {
      console.log('❌ La table villes n\'existe pas dans la base de données');
    }
    
    // Libération de la connexion
    client.release();
    
  } catch (error) {
    console.error('Erreur lors de la vérification de la structure de la table villes:', error);
  } finally {
    // Fermeture du pool de connexions
    await pool.end();
  }
}

// Exécution de la fonction principale
checkVillesStructure().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
