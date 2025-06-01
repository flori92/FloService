/**
 * Script pour appliquer les corrections manuelles aux fonctions complexes
 * et vérifier la structure de la table security_scripts
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
  password: 'Apollonf@vi92',
  ssl: {
    rejectUnauthorized: false
  }
});

// Fonction principale
async function main() {
  console.log('🔧 Application des corrections manuelles aux fonctions complexes...');
  
  try {
    // Lire le fichier SQL
    const sqlFilePath = path.join(__dirname, 'fix_complex_functions.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    console.log('📋 Exécution du script SQL pour les fonctions complexes...');
    
    // Exécuter le script SQL
    await pool.query(sqlContent);
    console.log('✅ Script SQL exécuté avec succès!');
    
    // Vérifier la structure de la table security_scripts
    console.log('\n🔍 Vérification de la structure de la table security_scripts...');
    
    // Vérifier si la table existe
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'security_scripts'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('❌ La table security_scripts n\'existe pas. Création de la table...');
      
      // Créer la table security_scripts
      await pool.query(`
        CREATE TABLE public.security_scripts (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
          CONSTRAINT security_scripts_name_key UNIQUE (name)
        );
        
        -- Activer RLS sur la table
        ALTER TABLE public.security_scripts ENABLE ROW LEVEL SECURITY;
        
        -- Créer une politique pour limiter l'accès aux administrateurs
        CREATE POLICY "Les administrateurs peuvent gérer les scripts de sécurité"
          ON public.security_scripts
          USING (auth.jwt() ->> 'role' = 'admin');
      `);
      
      console.log('✅ Table security_scripts créée avec succès!');
    } else {
      // Vérifier si la contrainte unique existe
      const uniqueConstraintExists = await pool.query(`
        SELECT EXISTS (
          SELECT 1
          FROM pg_constraint
          JOIN pg_class ON pg_constraint.conrelid = pg_class.oid
          JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
          WHERE pg_namespace.nspname = 'public'
          AND pg_class.relname = 'security_scripts'
          AND pg_constraint.conname = 'security_scripts_name_key'
          AND pg_constraint.contype = 'u'
        );
      `);
      
      if (!uniqueConstraintExists.rows[0].exists) {
        console.log('❌ La contrainte unique sur la colonne name n\'existe pas. Ajout de la contrainte...');
        
        // Ajouter la contrainte unique
        await pool.query(`
          ALTER TABLE public.security_scripts
          ADD CONSTRAINT security_scripts_name_key UNIQUE (name);
        `);
        
        console.log('✅ Contrainte unique ajoutée avec succès!');
      } else {
        console.log('✅ La contrainte unique sur la colonne name existe déjà.');
      }
    }
    
    // Sauvegarder le script dans la table security_scripts
    console.log('\n📝 Sauvegarde du script dans la table security_scripts...');
    
    try {
      await pool.query(`
        INSERT INTO public.security_scripts (name, content)
        VALUES ('fix_complex_functions.sql', $1)
        ON CONFLICT (name) DO UPDATE
        SET content = $1,
            updated_at = now();
      `, [sqlContent]);
      
      console.log('✅ Script sauvegardé dans la table security_scripts avec succès!');
    } catch (error) {
      console.error(`❌ Erreur lors de la sauvegarde du script: ${error.message}`);
    }
    
    // Vérifier les résultats
    console.log('\n🔍 Vérification des fonctions corrigées...');
    
    const functionsToCheck = [
      'safe_message_count',
      'find_nearby_providers',
      'get_available_slots',
      'get_provider_availability_slots'
    ];
    
    for (const funcName of functionsToCheck) {
      const functionResult = await pool.query(`
        SELECT proname, prosrc
        FROM pg_proc
        JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
        WHERE nspname = 'public'
        AND proname = $1;
      `, [funcName]);
      
      if (functionResult.rows.length > 0) {
        const { proname, prosrc } = functionResult.rows[0];
        const isSecure = prosrc.includes('SET search_path = public');
        
        if (isSecure) {
          console.log(`✅ Fonction ${proname} sécurisée avec succès.`);
        } else {
          console.error(`❌ Fonction ${proname} toujours vulnérable!`);
        }
      } else {
        console.error(`❌ Fonction ${funcName} non trouvée dans la base de données.`);
      }
    }
    
    console.log('\n✅ Processus de correction des fonctions complexes terminé!');
  } catch (error) {
    console.error('❌ Erreur lors de l\'application des corrections:', error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});
