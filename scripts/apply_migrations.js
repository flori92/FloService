/**
 * Script pour appliquer les migrations manquantes à la base de données Supabase
 * Créé le 02/06/2025
 * 
 * Ce script analyse les fichiers de migration SQL et les exécute sur la base de données Supabase
 * Il permet de résoudre les problèmes liés aux tables manquantes
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Chargement des variables d'environnement
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://sxrofrdhpzpjqkplgoij.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN4cm9mcmRocHpwanFrcGxnb2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDgxNjY2NzksImV4cCI6MjA2Mzc0MjY3OX0.ddLsIbp814amozono-gIhjNPWYE4Lgo20dJmG3Q-Cww';

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

// Liste des tables essentielles pour le fonctionnement de l'application
const ESSENTIAL_TABLES = [
  'profiles',
  'provider_profiles',
  'messages',
  'conversations',
  'notifications'
];

// Fonction pour vérifier l'existence des tables
async function checkTables() {
  console.log('=== VÉRIFICATION DES TABLES SUPABASE ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Récupération de la liste des tables existantes
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    
    const tableResult = await client.query(tableQuery);
    const existingTables = tableResult.rows.map(row => row.table_name);
    
    console.log(`\n--- Tables existantes (${existingTables.length}) ---`);
    existingTables.forEach(table => {
      console.log(`- ${table}`);
    });
    
    // Vérification des tables requises
    console.log('\n--- Vérification des tables requises ---');
    const missingTables = [];
    
    for (const table of ESSENTIAL_TABLES) {
      if (existingTables.includes(table)) {
        console.log(`✅ Table '${table}' existe`);
      } else {
        console.log(`❌ Table '${table}' manquante`);
        missingTables.push(table);
      }
    }
    
    // Libération de la connexion
    client.release();
    
    return {
      existingTables,
      missingTables
    };
    
  } catch (error) {
    console.error('Erreur lors de la vérification des tables:', error);
    throw error;
  }
}

// Fonction pour lire les fichiers de migration
async function readMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Tri par ordre alphabétique (donc chronologique pour les migrations)
    
    console.log(`\n--- Fichiers de migration trouvés (${files.length}) ---`);
    
    const migrations = [];
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Extraction du numéro de version à partir du nom du fichier
      const versionMatch = file.match(/^(\d+)_/);
      const version = versionMatch ? versionMatch[1] : file;
      
      migrations.push({
        version,
        name: file,
        content,
        path: filePath
      });
      
      console.log(`- ${file}`);
    }
    
    return migrations;
    
  } catch (error) {
    console.error('Erreur lors de la lecture des fichiers de migration:', error);
    throw error;
  }
}

// Fonction pour vérifier les migrations appliquées
async function checkAppliedMigrations() {
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    
    // Vérification de l'existence de la table schema_migrations
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      ) as exists
    `;
    
    const tableResult = await client.query(checkTableQuery);
    const tableExists = tableResult.rows[0].exists;
    
    if (!tableExists) {
      console.log('\n❌ Table schema_migrations manquante');
      
      // Création de la table schema_migrations
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS public.schema_migrations (
          version TEXT PRIMARY KEY,
          name TEXT,
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      
      await client.query(createTableQuery);
      console.log('✅ Table schema_migrations créée');
      
      // Libération de la connexion
      client.release();
      
      return [];
    }
    
    // Récupération des migrations appliquées
    const migrationsQuery = `
      SELECT version, name, created_at
      FROM schema_migrations
      ORDER BY created_at
    `;
    
    const migrationsResult = await client.query(migrationsQuery);
    const appliedMigrations = migrationsResult.rows;
    
    console.log(`\n--- Migrations appliquées (${appliedMigrations.length}) ---`);
    appliedMigrations.forEach(migration => {
      console.log(`- ${migration.version}: ${migration.name || 'Sans nom'} (${new Date(migration.created_at).toLocaleString()})`);
    });
    
    // Libération de la connexion
    client.release();
    
    return appliedMigrations;
    
  } catch (error) {
    console.error('Erreur lors de la vérification des migrations appliquées:', error);
    throw error;
  }
}

// Fonction pour appliquer une migration
async function applyMigration(migration) {
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    
    console.log(`\nApplication de la migration ${migration.name}...`);
    
    // Début de la transaction
    await client.query('BEGIN');
    
    try {
      // Exécution du script SQL
      await client.query(migration.content);
      
      // Enregistrement de la migration
      const insertQuery = `
        INSERT INTO schema_migrations (version, name)
        VALUES ($1, $2)
      `;
      
      await client.query(insertQuery, [migration.version, migration.name]);
      
      // Validation de la transaction
      await client.query('COMMIT');
      
      console.log(`✅ Migration ${migration.name} appliquée avec succès`);
      
    } catch (error) {
      // Annulation de la transaction en cas d'erreur
      await client.query('ROLLBACK');
      console.error(`❌ Erreur lors de l'application de la migration ${migration.name}:`, error.message);
      throw error;
    } finally {
      // Libération de la connexion
      client.release();
    }
    
  } catch (error) {
    console.error(`Erreur lors de l'application de la migration ${migration.name}:`, error);
    throw error;
  }
}

// Fonction principale
async function main() {
  console.log('=== OUTIL D\'APPLICATION DES MIGRATIONS SUPABASE ===\n');
  
  try {
    // Vérification des tables existantes
    const { existingTables, missingTables } = await checkTables();
    
    // Lecture des fichiers de migration
    const migrations = await readMigrationFiles();
    
    // Vérification des migrations appliquées
    const appliedMigrations = await checkAppliedMigrations();
    const appliedVersions = appliedMigrations.map(m => m.version);
    
    // Filtrage des migrations non appliquées
    const pendingMigrations = migrations.filter(m => !appliedVersions.includes(m.version));
    
    console.log(`\n--- Migrations en attente (${pendingMigrations.length}) ---`);
    pendingMigrations.forEach(migration => {
      console.log(`- ${migration.name}`);
    });
    
    // Application des migrations en attente
    if (pendingMigrations.length > 0) {
      console.log('\n=== APPLICATION DES MIGRATIONS EN ATTENTE ===');
      
      for (const migration of pendingMigrations) {
        await applyMigration(migration);
      }
      
      console.log('\n✅ Toutes les migrations ont été appliquées');
    } else {
      console.log('\n✅ Aucune migration en attente');
    }
    
    // Vérification finale des tables
    const finalCheck = await checkTables();
    
    console.log('\n=== RÉSUMÉ ===');
    console.log(`Tables existantes: ${finalCheck.existingTables.length}`);
    console.log(`Tables requises: ${ESSENTIAL_TABLES.length}`);
    console.log(`Tables manquantes: ${finalCheck.missingTables.length}`);
    
    if (finalCheck.missingTables.length > 0) {
      console.log('\n--- TABLES TOUJOURS MANQUANTES ---');
      finalCheck.missingTables.forEach(table => {
        console.log(`- ${table}`);
      });
      
      console.log('\n⚠️ Certaines tables sont toujours manquantes après l\'application des migrations.');
      console.log('Vérifiez les fichiers de migration pour vous assurer qu\'ils créent toutes les tables requises.');
    } else {
      console.log('\n✅ Toutes les tables requises sont présentes dans la base de données');
    }
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution du script:', error);
  } finally {
    // Fermeture du pool de connexions
    await pool.end();
  }
}

// Exécution de la fonction principale
main().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
