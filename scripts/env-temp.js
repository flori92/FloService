/**
 * Fichier temporaire pour configurer les variables d'environnement
 * Nécessaire pour l'exécution des scripts de migration
 */

// Importation des modules nécessaires
import dotenv from 'dotenv';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration des chemins
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Chargement des variables d'environnement depuis .env.check
dotenv.config({ path: path.join(__dirname, '..', '.env.check') });

// Configuration des variables d'environnement pour Supabase
process.env.SUPABASE_HOST = process.env.SUPABASE_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co';
process.env.SUPABASE_PORT = process.env.SUPABASE_PORT || '5432';
process.env.SUPABASE_DATABASE = process.env.SUPABASE_DATABASE || 'postgres';
process.env.SUPABASE_USER = process.env.SUPABASE_USER || 'postgres';
// Demander le mot de passe lors de l'exécution si non défini
if (!process.env.SUPABASE_PASSWORD) {
  console.log('⚠️ Variable SUPABASE_PASSWORD non définie. Veuillez la définir avant d\'exécuter les scripts.');
  console.log('Exemple: SUPABASE_PASSWORD=votre_mot_de_passe node scripts/check_db_tables.js');
}

// Affichage des variables configurées (sans le mot de passe)
console.log('=== VARIABLES D\'ENVIRONNEMENT CONFIGURÉES ===');
console.log(`SUPABASE_URL: ${process.env.VITE_SUPABASE_URL}`);
console.log(`SUPABASE_HOST: ${process.env.SUPABASE_HOST}`);
console.log(`SUPABASE_PORT: ${process.env.SUPABASE_PORT}`);
console.log(`SUPABASE_DATABASE: ${process.env.SUPABASE_DATABASE}`);
console.log(`SUPABASE_USER: ${process.env.SUPABASE_USER}`);
console.log(`SUPABASE_PASSWORD: ${process.env.SUPABASE_PASSWORD ? '******' : 'Non défini'}`);
