/**
 * Script pour appliquer les coordonnées géographiques aux villes et 
 * installer les fonctions de recherche par proximité
 * Créé le 01/06/2025
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
  host: 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

// Coordonnées des principales villes d'Afrique (format: [latitude, longitude])
const villesCoordinates = {
  // Quelques exemples de coordonnées (Afrique de l'Ouest)
  "Dakar": [14.7167, -17.4677],
  "Abidjan": [5.3364, -4.0267],
  "Lagos": [6.4550, 3.3841],
  "Accra": [5.6037, -0.1870],
  "Conakry": [9.6412, -13.5784],
  "Bamako": [12.6392, -8.0029],
  "Ouagadougou": [12.3714, -1.5197],
  "Lomé": [6.1319, 1.2228],
  "Niamey": [13.5117, 2.1251],
  "Cotonou": [6.3676, 2.4252],
  "Porto-Novo": [6.4969, 2.6283],
  "Monrovia": [6.3004, -10.7969],
  "Freetown": [8.4697, -13.2659],
  "Banjul": [13.4557, -16.5775],
  "Bissau": [11.8636, -15.5977],
  "Praia": [14.9177, -23.5092],
  
  // Quelques exemples de coordonnées (Afrique centrale)
  "Yaoundé": [3.8480, 11.5021],
  "Douala": [4.0511, 9.7679],
  "Libreville": [0.4162, 9.4673],
  "Brazzaville": [-4.2634, 15.2429],
  "Kinshasa": [-4.4419, 15.2663],
  "Bangui": [4.3947, 18.5582],
  "N'Djamena": [12.1348, 15.0557],
  "Malabo": [3.7523, 8.7741],
  "São Tomé": [0.3334, 6.7333],
  
  // Autres grandes villes (à compléter avec des coordonnées réelles)
  "Thiès": [14.7833, -16.9167],
  "Touba": [14.8667, -15.8833],
  "Kumasi": [6.6885, -1.6244],
  "Ibadan": [7.3775, 3.9470],
  "Kano": [12.0000, 8.5167],
  "Abuja": [9.0765, 7.3986],
  "Yamoussokro": [6.8276, -5.2893],
  "Bobo-Dioulasso": [11.1750, -4.2958],
  "Kankan": [10.3854, -9.3057],
  "Zinder": [13.8083, 8.9881]
  // Pour une base de données complète, il faudrait ajouter toutes les villes
};

// Fonction principale
async function main() {
  console.log('🔧 Application des coordonnées géographiques et fonctions de proximité...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'add_proximity_search.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL pour les fonctions de proximité...');
    
    // Exécuter le script SQL
    await pool.query(sqlContent);
    console.log('✅ Fonctions de recherche par proximité créées avec succès!');
    
    // Mettre à jour les coordonnées des villes
    console.log('\n🌍 Mise à jour des coordonnées des villes...');
    await updateCitiesCoordinates();
    console.log('✅ Coordonnées des villes mises à jour !');
    
    // Tester la fonction de recherche par proximité
    console.log('\n🔍 Test de la recherche par proximité...');
    await testProximitySearch();
    
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des coordonnées géographiques:', error);
  } finally {
    await pool.end();
  }
}

// Mise à jour des coordonnées des villes
async function updateCitiesCoordinates() {
  // Pour chaque ville dans notre dictionnaire de coordonnées
  for (const [villeNom, coords] of Object.entries(villesCoordinates)) {
    const [latitude, longitude] = coords;
    
    try {
      // Mettre à jour les coordonnées
      const result = await pool.query(`
        UPDATE villes
        SET latitude = $1, longitude = $2
        WHERE nom = $3
        RETURNING id, nom
      `, [latitude, longitude, villeNom]);
      
      if (result.rowCount > 0) {
        console.log(`✅ Coordonnées mises à jour pour ${villeNom}: [${latitude}, ${longitude}]`);
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la mise à jour des coordonnées pour ${villeNom}:`, error);
    }
  }
  
  // Compter les villes sans coordonnées
  const countResult = await pool.query(`
    SELECT COUNT(*) FROM villes WHERE latitude IS NULL OR longitude IS NULL
  `);
  
  const villesSansCoords = parseInt(countResult.rows[0].count);
  console.log(`ℹ️ ${villesSansCoords} villes n'ont pas encore de coordonnées définies.`);
}

// Test de la fonction de recherche par proximité
async function testProximitySearch() {
  try {
    // Trouver l'ID de Dakar
    const dakarResult = await pool.query(`
      SELECT id FROM villes WHERE nom = 'Dakar'
    `);
    
    if (dakarResult.rows.length === 0) {
      console.error('❌ Impossible de trouver la ville de Dakar pour le test');
      return;
    }
    
    const dakarId = dakarResult.rows[0].id;
    
    // Tester la recherche dans un rayon de 100km autour de Dakar
    const radiusKm = 100;
    const nearbyResult = await pool.query(`
      SELECT id, nom, distance FROM find_cities_in_radius($1, $2)
    `, [dakarId, radiusKm]);
    
    console.log(`🔍 Villes dans un rayon de ${radiusKm}km autour de Dakar:`);
    nearbyResult.rows.forEach(city => {
      console.log(`  - ${city.nom} (${Math.round(city.distance * 10) / 10} km)`);
    });
    
  } catch (error) {
    console.error('❌ Erreur lors du test de recherche par proximité:', error);
  }
}

// Exécuter le script
main();
