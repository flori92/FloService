/**
 * Script pour vérifier l'existence de la table messages et de ses colonnes
 * dans la base de données Supabase
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

// Colonnes attendues pour la table messages
const expectedColumns = [
  'id',
  'created_at',
  'updated_at',
  'conversation_id',
  'sender_id',
  'recipient_id',
  'content',
  'read',
  'read_at'
];

// Fonction principale
async function main() {
  console.log('🔍 Vérification de la table messages et de ses colonnes...');
  
  try {
    // Vérifier si la table messages existe
    const tableExists = await checkTableExists('messages');
    if (!tableExists) {
      console.error('❌ La table messages n\'existe pas dans la base de données!');
      await createMessagesTableScript();
      return;
    }
    
    console.log('✅ La table messages existe.');
    
    // Vérifier les colonnes de la table messages
    const columns = await getTableColumns('messages');
    console.log('📋 Colonnes trouvées:', columns.map(col => col.column_name).join(', '));
    
    // Vérifier si toutes les colonnes attendues existent
    const missingColumns = expectedColumns.filter(
      col => !columns.some(dbCol => dbCol.column_name === col)
    );
    
    if (missingColumns.length > 0) {
      console.error(`❌ Colonnes manquantes: ${missingColumns.join(', ')}`);
      await createAlterTableScript(missingColumns);
    } else {
      console.log('✅ Toutes les colonnes attendues existent.');
    }
    
    // Vérifier les fonctions liées aux messages
    await checkMessageFunctions();
    
    // Vérifier les politiques RLS
    await checkRLSPolicies();
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error);
  } finally {
    // Fermer la connexion à la base de données
    await pool.end();
  }
}

// Vérifier si une table existe
async function checkTableExists(tableName) {
  const query = `
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = $1
    );
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows[0].exists;
}

// Récupérer les colonnes d'une table
async function getTableColumns(tableName) {
  const query = `
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = $1
    ORDER BY ordinal_position;
  `;
  
  const result = await pool.query(query, [tableName]);
  return result.rows;
}

// Vérifier les fonctions liées aux messages
async function checkMessageFunctions() {
  console.log('\n🔍 Vérification des fonctions liées aux messages...');
  
  const functionsToCheck = [
    'get_messages',
    'send_message',
    'mark_message_as_read',
    'mark_messages_as_read',
    'count_messages'
  ];
  
  const query = `
    SELECT proname, prosrc
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE nspname = 'public'
    AND proname = ANY($1);
  `;
  
  const result = await pool.query(query, [functionsToCheck]);
  
  // Vérifier quelles fonctions existent
  const existingFunctions = result.rows.map(row => row.proname);
  const missingFunctions = functionsToCheck.filter(fn => !existingFunctions.includes(fn));
  
  if (missingFunctions.length > 0) {
    console.error(`❌ Fonctions manquantes: ${missingFunctions.join(', ')}`);
  } else {
    console.log('✅ Toutes les fonctions nécessaires existent.');
  }
  
  // Vérifier si les fonctions ont un chemin de recherche fixe
  const vulnerableFunctions = result.rows
    .filter(row => !row.prosrc.includes('SET search_path = public'))
    .map(row => row.proname);
    
  if (vulnerableFunctions.length > 0) {
    console.warn(`⚠️ Fonctions sans chemin de recherche fixe: ${vulnerableFunctions.join(', ')}`);
    console.warn('Ces fonctions peuvent être vulnérables aux attaques par injection SQL.');
  } else if (result.rows.length > 0) {
    console.log('✅ Toutes les fonctions ont un chemin de recherche fixe.');
  }
}

// Vérifier les politiques RLS pour la table messages
async function checkRLSPolicies() {
  console.log('\n🔍 Vérification des politiques RLS pour la table messages...');
  
  // Vérifier si RLS est activé
  const rlsQuery = `
    SELECT relrowsecurity
    FROM pg_class
    JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
    WHERE nspname = 'public'
    AND relname = 'messages';
  `;
  
  const rlsResult = await pool.query(rlsQuery);
  
  if (rlsResult.rows.length === 0) {
    console.error('❌ Table messages non trouvée lors de la vérification RLS.');
    return;
  }
  
  const rlsEnabled = rlsResult.rows[0].relrowsecurity;
  
  if (!rlsEnabled) {
    console.error('❌ RLS n\'est pas activé pour la table messages!');
  } else {
    console.log('✅ RLS est activé pour la table messages.');
    
    // Vérifier les politiques
    const policiesQuery = `
      SELECT polname, polcmd, pg_get_expr(polqual, polrelid) as policy_definition
      FROM pg_policy
      JOIN pg_class ON pg_policy.polrelid = pg_class.oid
      JOIN pg_namespace ON pg_class.relnamespace = pg_namespace.oid
      WHERE nspname = 'public'
      AND relname = 'messages';
    `;
    
    const policiesResult = await pool.query(policiesQuery);
    
    if (policiesResult.rows.length === 0) {
      console.error('❌ Aucune politique RLS trouvée pour la table messages!');
    } else {
      console.log(`✅ ${policiesResult.rows.length} politiques RLS trouvées:`);
      
      policiesResult.rows.forEach(policy => {
        console.log(`   - ${policy.polname} (${policy.polcmd}): ${policy.policy_definition}`);
      });
    }
  }
}

// Créer un script SQL pour créer la table messages
async function createMessagesTableScript() {
  console.log('\n📝 Création d\'un script pour créer la table messages...');
  
  const createTableSQL = `
-- Script pour créer la table messages
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP WITH TIME ZONE
);

-- Activer RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS
CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Les utilisateurs peuvent créer leurs propres messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Créer un trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();

-- Créer les fonctions de gestion des messages
CREATE OR REPLACE FUNCTION public.get_messages(p_conversation_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS SETOF public.messages AS $$
BEGIN
  SET search_path = public;
  RETURN QUERY
  SELECT *
  FROM messages
  WHERE conversation_id = p_conversation_id
  ORDER BY created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id UUID, p_sender_id UUID, p_recipient_id UUID, p_content TEXT)
RETURNS UUID AS $$
DECLARE
  v_message_id UUID;
BEGIN
  SET search_path = public;
  INSERT INTO messages (conversation_id, sender_id, recipient_id, content)
  VALUES (p_conversation_id, p_sender_id, p_recipient_id, p_content)
  RETURNING id INTO v_message_id;
  
  -- Mettre à jour la conversation avec le dernier message
  UPDATE conversations
  SET last_message = p_content,
      last_message_time = now(),
      updated_at = now()
  WHERE id = p_conversation_id;
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  SET search_path = public;
  UPDATE messages
  SET read = TRUE,
      read_at = now()
  WHERE id = p_message_id
  AND recipient_id = auth.uid();
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SET search_path = public;
  UPDATE messages
  SET read = TRUE,
      read_at = now()
  WHERE conversation_id = p_conversation_id
  AND recipient_id = auth.uid()
  AND read = FALSE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

CREATE OR REPLACE FUNCTION public.count_messages(p_conversation_id UUID, p_unread_only BOOLEAN DEFAULT FALSE)
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SET search_path = public;
  IF p_unread_only THEN
    SELECT COUNT(*)
    INTO v_count
    FROM messages
    WHERE conversation_id = p_conversation_id
    AND recipient_id = auth.uid()
    AND read = FALSE;
  ELSE
    SELECT COUNT(*)
    INTO v_count
    FROM messages
    WHERE conversation_id = p_conversation_id;
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
`;

  const scriptPath = path.join(__dirname, 'create_messages_table.sql');
  fs.writeFileSync(scriptPath, createTableSQL);
  
  console.log(`✅ Script créé: ${scriptPath}`);
  console.log('Exécutez ce script dans la console SQL de Supabase pour créer la table messages et ses fonctions associées.');
}

// Créer un script SQL pour ajouter les colonnes manquantes
async function createAlterTableScript(missingColumns) {
  console.log('\n📝 Création d\'un script pour ajouter les colonnes manquantes...');
  
  let alterTableSQL = `-- Script pour ajouter les colonnes manquantes à la table messages\n`;
  
  missingColumns.forEach(column => {
    let dataType = '';
    let defaultValue = '';
    
    switch (column) {
      case 'id':
        dataType = 'UUID PRIMARY KEY';
        defaultValue = 'DEFAULT uuid_generate_v4()';
        break;
      case 'created_at':
      case 'updated_at':
      case 'read_at':
        dataType = 'TIMESTAMP WITH TIME ZONE';
        defaultValue = column !== 'read_at' ? 'DEFAULT now()' : '';
        break;
      case 'conversation_id':
        dataType = 'UUID NOT NULL';
        defaultValue = 'REFERENCES public.conversations(id) ON DELETE CASCADE';
        break;
      case 'sender_id':
      case 'recipient_id':
        dataType = 'UUID NOT NULL';
        defaultValue = 'REFERENCES auth.users(id) ON DELETE CASCADE';
        break;
      case 'content':
        dataType = 'TEXT NOT NULL';
        break;
      case 'read':
        dataType = 'BOOLEAN';
        defaultValue = 'DEFAULT FALSE';
        break;
      default:
        dataType = 'TEXT';
    }
    
    alterTableSQL += `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS ${column} ${dataType} ${defaultValue};\n`;
  });
  
  const scriptPath = path.join(__dirname, 'alter_messages_table.sql');
  fs.writeFileSync(scriptPath, alterTableSQL);
  
  console.log(`✅ Script créé: ${scriptPath}`);
  console.log('Exécutez ce script dans la console SQL de Supabase pour ajouter les colonnes manquantes.');
}

// Exécuter la fonction principale
main().catch(err => {
  console.error('Erreur non gérée:', err);
  process.exit(1);
});
