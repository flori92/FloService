/**
 * Script pour ajouter la colonne pays_code à la table villes
 * Créé le 03/06/2025
 * 
 * Ce script assure la rétrocompatibilité avec le code frontend existant
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

// Fonction pour appliquer la correction
async function applyPaysCodeFix() {
  console.log('=== AJOUT DE LA COLONNE PAYS_CODE À LA TABLE VILLES ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Chemin vers le fichier de migration
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20250603213800_add_pays_code_to_villes.sql');
    
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
      
      console.log('✅ Colonne pays_code ajoutée à la table villes avec succès');
      
      // Vérification de l'existence de la colonne
      const checkQuery = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'villes'
        AND column_name = 'pays_code'
      `;
      
      const result = await client.query(checkQuery);
      
      if (result.rows.length > 0) {
        console.log('✅ Vérification réussie: La colonne pays_code existe dans la table villes');
      } else {
        console.log('❌ Vérification échouée: La colonne pays_code n\'existe pas dans la table villes');
      }
      
      // Vérification des valeurs dans la colonne pays_code
      const dataQuery = `
        SELECT v.id, v.nom, v.pays_code, p.code as pays_code_attendu
        FROM public.villes v
        JOIN public.pays p ON v.pays_id = p.id
        WHERE v.pays_code IS DISTINCT FROM p.code
        LIMIT 5
      `;
      
      const dataResult = await client.query(dataQuery);
      
      if (dataResult.rows.length === 0) {
        console.log('✅ Vérification réussie: Toutes les valeurs de pays_code sont correctes');
      } else {
        console.log(`❌ Vérification échouée: ${dataResult.rows.length} villes ont des valeurs de pays_code incorrectes`);
        console.log('Exemples de valeurs incorrectes:');
        dataResult.rows.forEach((row, index) => {
          console.log(`  ${index + 1}. ${row.nom}: pays_code = ${row.pays_code || 'NULL'}, attendu = ${row.pays_code_attendu}`);
        });
      }
      
      // Vérification du trigger
      const triggerQuery = `
        SELECT trigger_name
        FROM information_schema.triggers
        WHERE event_object_schema = 'public'
        AND event_object_table = 'villes'
        AND trigger_name = 'update_ville_pays_code_trigger'
      `;
      
      const triggerResult = await client.query(triggerQuery);
      
      if (triggerResult.rows.length > 0) {
        console.log('✅ Vérification réussie: Le trigger update_ville_pays_code_trigger existe');
      } else {
        console.log('❌ Vérification échouée: Le trigger update_ville_pays_code_trigger n\'existe pas');
      }
      
      // Test du trigger avec une mise à jour
      const testTriggerQuery = `
        WITH sample_ville AS (
          SELECT id, pays_id FROM public.villes LIMIT 1
        ),
        sample_pays AS (
          SELECT id FROM public.pays 
          WHERE id != (SELECT pays_id FROM sample_ville)
          LIMIT 1
        )
        UPDATE public.villes v
        SET pays_id = (SELECT id FROM sample_pays)
        FROM sample_ville sv
        WHERE v.id = sv.id
        RETURNING v.id, v.nom, v.pays_id, v.pays_code, 
          (SELECT code FROM public.pays WHERE id = v.pays_id) AS expected_code;
      `;
      
      const testResult = await client.query(testTriggerQuery);
      
      if (testResult.rows.length > 0) {
        const row = testResult.rows[0];
        if (row.pays_code === row.expected_code) {
          console.log('✅ Test du trigger réussi: pays_code est automatiquement mis à jour lors des modifications');
        } else {
          console.log(`❌ Test du trigger échoué: pays_code = ${row.pays_code}, attendu = ${row.expected_code}`);
        }
        
        // Remettre la valeur d'origine
        await client.query(`
          UPDATE public.villes
          SET pays_id = $1
          WHERE id = $2
        `, [testResult.rows[0].pays_id, testResult.rows[0].id]);
      }
      
      // Vérification de l'index
      const indexQuery = `
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'villes'
        AND indexname = 'idx_villes_pays_code'
      `;
      
      const indexResult = await client.query(indexQuery);
      
      if (indexResult.rows.length > 0) {
        console.log('✅ Vérification réussie: L\'index idx_villes_pays_code existe');
      } else {
        console.log('❌ Vérification échouée: L\'index idx_villes_pays_code n\'existe pas');
      }
      
      // Test de requête avec le code pays
      const testQuery = `
        SELECT id, nom, pays_code
        FROM public.villes
        WHERE pays_code = 'BJ'
        LIMIT 5;
      `;
      
      const testQueryResult = await client.query(testQuery);
      
      console.log(`\n--- Test de requête avec pays_code = 'BJ' ---`);
      console.log(`Résultat: ${testQueryResult.rows.length} villes trouvées`);
      
      if (testQueryResult.rows.length > 0) {
        console.log('Exemples de villes:');
        testQueryResult.rows.forEach(row => {
          console.log(`- ${row.nom} (${row.pays_code})`);
        });
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
applyPaysCodeFix().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
