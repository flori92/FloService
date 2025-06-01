// Script Node.js pour extraire toutes les signatures des fonctions problématiques
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  host: 'db.sxrofrdhpzpjqkplgoij.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'Apollonf@vi92',
  ssl: { rejectUnauthorized: false }
});

const functionsToExtract = [
  'find_nearby_providers',
  'get_available_slots',
  'get_provider_availability_slots'
];

(async () => {
  const client = await pool.connect();
  try {
    for (const fname of functionsToExtract) {
      console.log(`\n--- Signatures pour ${fname} ---`);
      const res = await client.query(`
        SELECT
          p.oid,
          p.proname,
          pg_get_function_identity_arguments(p.oid) AS identity_args,
          pg_get_function_arguments(p.oid) AS args,
          pg_get_function_result(p.oid) AS result_type,
          l.lanname AS language
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        JOIN pg_language l ON l.oid = p.prolang
        WHERE n.nspname = 'public' AND p.proname = $1
        ORDER BY p.oid;
      `, [fname]);
      if (res.rows.length === 0) {
        console.log(`Aucune fonction trouvée pour ${fname}`);
        continue;
      }
      for (const row of res.rows) {
        console.log(`- oid: ${row.oid}`);
        console.log(`  Signature: ${row.proname}(${row.identity_args})`);
        console.log(`  Arguments: ${row.args}`);
        console.log(`  Retour: ${row.result_type}`);
        console.log(`  Langage: ${row.language}`);
      }
    }
  } catch (e) {
    console.error('Erreur lors de l\'extraction des signatures:', e);
  } finally {
    client.release();
    await pool.end();
  }
})();
