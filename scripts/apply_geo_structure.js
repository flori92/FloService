/**
 * Script pour appliquer la structure géographique (pays/villes) à la base de données
 * et mettre à jour les profils existants
 * Créé le 01/06/2025
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { paysAfrique } from '../src/data/paysAfrique.js';

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration de la connexion à la base de données Supabase
const pool = new Pool({
  host: 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Fonction principale
async function main() {
  console.log('🔧 Application de la structure géographique...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'create_geo_structure.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL pour la structure géographique...');
    
    // Exécuter le script SQL
    await pool.query(sqlContent);
    console.log('✅ Structure géographique créée avec succès!');
    
    // Insérer les pays et villes d'Afrique de l'Ouest et centrale
    console.log('\n🌍 Début du seed des pays et villes Afrique de l\'Ouest et centrale...');
    await seedPaysEtVilles(pool);
    console.log('✅ Seed pays/villes terminé !');
    
    // Mettre à jour les profils existants (assigner une ville par défaut si besoin)
    console.log('\n👤 Vérification des profils sans localisation...');
    await updateProfilesWithDefaultLocation(pool);
    console.log('✅ Mise à jour des profils terminée !');
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application de la structure géographique:', error);
  } finally {
    await pool.end();
  }
}

// Fonction pour insérer un pays et retourner son id
async function insertOrGetPaysId(pool, nomPays) {
  const res = await pool.query(
    'INSERT INTO pays (nom) VALUES ($1) ON CONFLICT (nom) DO UPDATE SET nom = EXCLUDED.nom RETURNING id;',
    [nomPays]
  );
  return res.rows[0].id;
}

// Fonction pour insérer une ville
async function insertVille(pool, nomVille, paysId) {
  await pool.query(
    'INSERT INTO villes (nom, pays_id) VALUES ($1, $2) ON CONFLICT (nom, pays_id) DO NOTHING;',
    [nomVille, paysId]
  );
}

// Seed des pays et villes
async function seedPaysEtVilles(pool) {
  for (const pays of paysAfrique) {
    const paysId = await insertOrGetPaysId(pool, pays.nom);
    for (const ville of pays.villes) {
      await insertVille(pool, ville, paysId);
    }
    console.log(`✅ Pays inséré : ${pays.nom} (id=${paysId}), ${pays.villes.length} villes`);
  }
}

// Mise à jour des profils existants sans localisation
async function updateProfilesWithDefaultLocation(pool) {
  // Compter les profils sans ville assignée
  const countRes = await pool.query(`
    SELECT COUNT(*) FROM profiles WHERE ville_id IS NULL
  `);
  
  const profilsSansVille = parseInt(countRes.rows[0].count);
  
  if (profilsSansVille === 0) {
    console.log('👍 Tous les profils ont déjà une ville assignée.');
    return;
  }
  
  console.log(`📊 ${profilsSansVille} profils sans ville assignée.`);
  
  // Récupérer la capitale du Sénégal (Dakar) comme ville par défaut
  const villeDefautRes = await pool.query(`
    SELECT v.id FROM villes v
    JOIN pays p ON v.pays_id = p.id
    WHERE p.nom = 'Sénégal' AND v.nom = 'Dakar'
  `);
  
  if (villeDefautRes.rows.length === 0) {
    console.error('❌ Impossible de trouver la ville par défaut (Dakar, Sénégal)');
    return;
  }
  
  const villeDefautId = villeDefautRes.rows[0].id;
  
  // Assigner la ville par défaut aux profils sans ville
  const updateRes = await pool.query(`
    UPDATE profiles
    SET ville_id = $1
    WHERE ville_id IS NULL
  `, [villeDefautId]);
  
  console.log(`✅ ${updateRes.rowCount} profils mis à jour avec la ville par défaut (Dakar).`);
}

// Exécuter le script
main();
