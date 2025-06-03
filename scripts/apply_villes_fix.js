/**
 * Script pour appliquer la correction de la table villes à Supabase
 * Créé le 03/06/2025
 * 
 * Ce script applique uniquement la migration pour corriger les erreurs 400 sur la table villes
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

// Fonction pour appliquer la correction de la table villes
async function applyVillesFix() {
  console.log('=== APPLICATION DE LA CORRECTION DE LA TABLE VILLES ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Chemin vers le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250603211500_fix_villes_table.sql');
    
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
      
      console.log('✅ Correction de la table villes appliquée avec succès');
      
      // Vérification de l'existence de la fonction
      const checkQuery = `
        SELECT routine_name 
        FROM information_schema.routines 
        WHERE routine_schema = 'public' 
        AND routine_name = 'get_villes_by_pays_code'
      `;
      
      const result = await client.query(checkQuery);
      
      if (result.rows.length > 0) {
        console.log('✅ Vérification réussie: La fonction get_villes_by_pays_code existe dans la base de données');
      } else {
        console.log('❌ Vérification échouée: La fonction get_villes_by_pays_code n\'existe pas dans la base de données');
      }
      
      // Vérification des index sur la table villes
      const indexQuery = `
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'villes'
      `;
      
      const indexResult = await client.query(indexQuery);
      
      console.log(`\n--- Index sur la table villes (${indexResult.rows.length}) ---`);
      indexResult.rows.forEach(row => {
        console.log(`- ${row.indexname}`);
      });
      
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
applyVillesFix().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
