/**
 * Script pour appliquer les corrections de sécurité à la base de données Supabase
 * Ce script exécute le fichier security_fixes.sql sur la base de données
 * 
 * Utilisation: node apply_security_fixes.js
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

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
  password: 'Apollonf@vi92', // Mot de passe récupéré du fichier de configuration
  ssl: {
    rejectUnauthorized: false
  }
});

// Chemin vers le fichier SQL de sécurité
const securityFixesPath = path.join(__dirname, '..', 'supabase', 'security_fixes.sql');

// Fonction pour exécuter le script SQL
async function applySecurityFixes() {
  console.log('Connexion à la base de données Supabase...');
  
  try {
    // Lecture du fichier SQL
    const sqlScript = fs.readFileSync(securityFixesPath, 'utf8');
    
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    console.log('Application des corrections de sécurité...');
    
    // Exécution du script SQL
    await client.query(sqlScript);
    
    console.log('Corrections de sécurité appliquées avec succès!');
    
    // Libération de la connexion
    client.release();
    
    // Fermeture du pool de connexions
    await pool.end();
    
    console.log('Connexion fermée');
    
  } catch (error) {
    console.error('Erreur lors de l\'application des corrections de sécurité:', error);
    process.exit(1);
  }
}

// Exécution de la fonction principale
applySecurityFixes();
