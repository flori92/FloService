/**
 * Script pour appliquer les corrections critiques (fonctions et RLS) pour la table messages.
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
  host: process.env.DB_HOST || 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'postgres',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'Apollonf@vi92', // Remplacez par votre mot de passe réel ou utilisez des variables d'environnement
  ssl: {
    rejectUnauthorized: false, // Nécessaire si vous n'avez pas configuré correctement les certificats SSL
  },
});

const SCRIPT_NAME = 'apply_critical_fixes.sql';
const SQL_SCRIPT_PATH = path.join(__dirname, SCRIPT_NAME);

async function main() {
  console.log(`🚀 Démarrage de l'application du script : ${SCRIPT_NAME}`);

  let client;
  try {
    client = await pool.connect();
    console.log('🔗 Connexion à la base de données établie.');

    const sqlScript = fs.readFileSync(SQL_SCRIPT_PATH, 'utf8');
    console.log(`📄 Contenu du script SQL lu depuis : ${SQL_SCRIPT_PATH}`);

    console.log('⏳ Exécution du script SQL...');
    const result = await client.query(sqlScript);
    console.log('✅ Script SQL exécuté avec succès.');

    if (result.rows && result.rows.length > 0 && result.rows[result.rows.length-1].status) {
      console.log(`👍 Statut final de l'exécution : ${result.rows[result.rows.length-1].status}`);
    } else {
        // Si plusieurs commandes sont exécutées, le résultat peut être un tableau de résultats
        const lastResult = Array.isArray(result) ? result[result.length -1] : result;
        if(lastResult.rows && lastResult.rows.length > 0 && lastResult.rows[lastResult.rows.length-1].status){
            console.log(`👍 Statut final de l'exécution (multi-commandes) : ${lastResult.rows[lastResult.rows.length-1].status}`);
        } else {
            console.log('✅ Le script SQL semble s\'être exécuté, mais aucun statut final explicite n\'a été retourné par la dernière commande.');
        }
    }

  } catch (error) {
    console.error('❌ Erreur lors de l_application du script SQL:', error.message);
    if (error.stack) {
      console.error('Stack Trace:', error.stack);
    }
    // Sauvegarder l'erreur dans un fichier log
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    fs.writeFileSync(path.join(logDir, `error_apply_critical_fixes_${Date.now()}.log`), error.stack);
    console.error(`📄 Les détails de l'erreur ont été sauvegardés dans le répertoire logs.`);
  } finally {
    if (client) {
      await client.release();
      console.log('🚪 Connexion à la base de données libérée.');
    }
    await pool.end();
    console.log('🏁 Fin du script.');
  }
}

main().catch(err => {
  console.error("❌ Erreur non gérée dans la fonction main:", err);
});
