/**
 * Script pour appliquer la correction des requêtes sur la table villes à Supabase
 * Créé le 03/06/2025
 * 
 * Ce script applique uniquement la migration pour corriger les erreurs 400 sur les requêtes villes
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

// Fonction pour appliquer la correction des requêtes sur la table villes
async function applyVillesQueryFix() {
  console.log('=== APPLICATION DE LA CORRECTION DES REQUÊTES SUR LA TABLE VILLES ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Chemin vers le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250603212000_fix_villes_query.sql');
    
    // Vérifier si le fichier existe
    if (!fs.existsSync(migrationPath)) {
      console.error('❌ Fichier de migration introuvable:', migrationPath);
      client.release();
      return;
    }
    
    // Lire le contenu du fichier de migration
    const sql = fs.readFileSync(migrationPath, 'utf8');
    console.log('✅ Fichier de migration chargé');
    
    // Début de la transaction
    await client.query('BEGIN');
    
    try {
      // Exécution du script SQL
      await client.query(sql);
      
      // Validation de la transaction
      await client.query('COMMIT');
      
      console.log('✅ Correction des requêtes sur la table villes appliquée avec succès');
      
      // Vérification de l'existence des fonctions
      const checkQuery = `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name IN ('get_villes_by_pays_id', 'get_villes_by_pays_code')
      `;
      
      const result = await client.query(checkQuery);
      
      console.log(`\n--- Fonctions RPC créées (${result.rows.length}) ---`);
      result.rows.forEach(row => {
        console.log(`- ${row.routine_name}`);
      });
      
      // Test de la fonction get_villes_by_pays_code avec un code pays existant
      console.log('\n--- Test de la fonction get_villes_by_pays_code ---');
      
      try {
        const testQuery = `SELECT * FROM get_villes_by_pays_code('BJ') LIMIT 3;`;
        const testResult = await client.query(testQuery);
        
        console.log(`Résultat pour le code pays 'BJ': ${testResult.rows.length} villes trouvées`);
        
        if (testResult.rows.length > 0) {
          console.log('Exemples de villes:');
          testResult.rows.forEach((row, index) => {
            console.log(`- ${row.nom}`);
          });
        }
      } catch (testError) {
        console.error('Erreur lors du test de la fonction:', testError.message);
      }
      
    } catch (error) {
      // Annulation de la transaction en cas d'erreur
      await client.query('ROLLBACK');
      console.error('❌ Erreur lors de l\'application de la correction:', error.message);
    } finally {
      // Libération de la connexion
      client.release();
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'application de la correction:', error);
  } finally {
    // Fermeture du pool de connexions
    await pool.end();
  }
}

// Exécution de la fonction principale
applyVillesQueryFix().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
