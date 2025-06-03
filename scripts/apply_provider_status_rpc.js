/**
 * Script pour appliquer la fonction RPC get_my_provider_status à Supabase
 * Créé le 03/06/2025
 * 
 * Ce script applique uniquement la fonction RPC get_my_provider_status
 * sans toucher aux autres migrations
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

// Fonction pour appliquer la fonction RPC
async function applyProviderStatusRPC() {
  console.log('=== APPLICATION DE LA FONCTION RPC get_my_provider_status ===\n');
  
  try {
    // Connexion à la base de données
    const client = await pool.connect();
    console.log('✅ Connexion à la base de données établie');
    
    // Contenu SQL pour la fonction RPC
    const sql = `
-- Création de la fonction get_my_provider_status
CREATE OR REPLACE FUNCTION public.get_my_provider_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider_status BOOLEAN;
BEGIN
  -- Récupérer le statut is_provider de l'utilisateur actuellement authentifié
  SELECT p.is_provider INTO is_provider_status
  FROM public.profiles p
  WHERE p.id = auth.uid();

  -- Retourner false si null ou si aucun résultat trouvé
  RETURN COALESCE(is_provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner false par défaut
    RETURN false;
END;
$$;

-- Accorder l'exécution de la fonction à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_my_provider_status() TO authenticated;

-- Notifier PostgREST pour recharger le schéma
NOTIFY pgrst, 'reload schema';

-- Commentaire explicatif sur la fonction
COMMENT ON FUNCTION public.get_my_provider_status() IS 'Récupère le statut is_provider de l''utilisateur actuellement authentifié en utilisant auth.uid() pour garantir la sécurité RLS';
    `;
    
    // Exécution du script SQL
    await client.query(sql);
    
    console.log('✅ Fonction RPC get_my_provider_status créée avec succès');
    
    // Vérification de l'existence de la fonction
    const checkQuery = `
      SELECT routine_name 
      FROM information_schema.routines 
      WHERE routine_schema = 'public' 
      AND routine_name = 'get_my_provider_status'
    `;
    
    const result = await client.query(checkQuery);
    
    if (result.rows.length > 0) {
      console.log('✅ Vérification réussie: La fonction get_my_provider_status existe dans la base de données');
    } else {
      console.log('❌ Vérification échouée: La fonction get_my_provider_status n\'existe pas dans la base de données');
    }
    
    // Libération de la connexion
    client.release();
    
  } catch (error) {
    console.error('Erreur lors de l\'application de la fonction RPC:', error);
  } finally {
    // Fermeture du pool de connexions
    await pool.end();
  }
}

// Exécution de la fonction principale
applyProviderStatusRPC().catch(error => {
  console.error('Erreur non gérée:', error);
  process.exit(1);
});
