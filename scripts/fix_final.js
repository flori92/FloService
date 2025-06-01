/**
 * Script final pour appliquer les corrections à la base de données Supabase
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

// Instructions SQL à exécuter séquentiellement
const sqlInstructions = [
  // 1. Ajout de la colonne manquante
  `ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;`,
  
  // 2. Correction des fonctions sans chemin de recherche fixe
  // 2.1 Fonction send_message
  `CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id UUID, p_content TEXT)
  RETURNS UUID AS $$
  DECLARE
    v_message_id UUID;
    v_conversation RECORD;
    v_sender_id UUID;
    v_recipient_id UUID;
  BEGIN
    SET search_path = public;
    
    -- Récupérer l'ID de l'expéditeur (utilisateur authentifié)
    v_sender_id := auth.uid();
    
    -- Récupérer les informations de la conversation
    SELECT provider_id, client_id INTO v_conversation
    FROM conversations
    WHERE id = p_conversation_id;
    
    -- Déterminer le destinataire
    IF v_sender_id = v_conversation.provider_id THEN
      v_recipient_id := v_conversation.client_id;
    ELSE
      v_recipient_id := v_conversation.provider_id;
    END IF;
    
    -- Insérer le message
    INSERT INTO messages (conversation_id, sender_id, recipient_id, content)
    VALUES (p_conversation_id, v_sender_id, v_recipient_id, p_content)
    RETURNING id INTO v_message_id;
    
    -- Mettre à jour la conversation avec le dernier message
    UPDATE conversations
    SET last_message = p_content,
        last_message_time = now(),
        updated_at = now()
    WHERE id = p_conversation_id;
    
    RETURN v_message_id;
  END;
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  // 2.2 Fonction mark_message_as_read
  `CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id UUID)
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
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  // 2.3 Fonction mark_messages_as_read
  `CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID)
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
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  // 2.4 Fonction count_messages
  `CREATE OR REPLACE FUNCTION public.count_messages(p_conversation_id UUID, p_unread_only BOOLEAN DEFAULT FALSE)
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
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  // 3. Correction des incohérences dans les politiques RLS
  // 3.1 Supprimer les politiques redondantes
  `DROP POLICY IF EXISTS "Public access to messages" ON public.messages;`,
  `DROP POLICY IF EXISTS "Accès public en lecture" ON public.messages;`,
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages;`,
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages;`,
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs messages" ON public.messages;`,
  
  // 3.2 Créer des politiques cohérentes
  `CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
    ON public.messages
    FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = recipient_id);`,
  
  `CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
    ON public.messages
    FOR INSERT
    WITH CHECK (auth.uid() = sender_id);`,
  
  `CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages"
    ON public.messages
    FOR UPDATE
    USING (auth.uid() = recipient_id);`,
  
  // 4. Création d'une fonction RPC sécurisée pour récupérer les conversations d'un utilisateur
  `CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
  RETURNS TABLE (
    id UUID,
    provider_id UUID,
    client_id UUID,
    last_message TEXT,
    last_message_time TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    provider JSONB,
    client JSONB
  ) AS $$
  BEGIN
    SET search_path = public;
    
    -- Vérifier que l'utilisateur authentifié correspond à l'utilisateur demandé
    IF auth.uid() <> p_user_id THEN
      RAISE EXCEPTION 'Accès non autorisé';
    END IF;
    
    RETURN QUERY
    SELECT 
      c.id,
      c.provider_id,
      c.client_id,
      c.last_message,
      c.last_message_time,
      c.updated_at,
      JSONB_BUILD_OBJECT(
        'id', p.id,
        'full_name', p.full_name,
        'avatar_url', p.avatar_url
      ) AS provider,
      JSONB_BUILD_OBJECT(
        'id', cl.id,
        'full_name', cl.full_name,
        'avatar_url', cl.avatar_url
      ) AS client
    FROM conversations c
    LEFT JOIN profiles p ON c.provider_id = p.id
    LEFT JOIN profiles cl ON c.client_id = cl.id
    WHERE c.provider_id = p_user_id OR c.client_id = p_user_id
    ORDER BY c.updated_at DESC;
  END;
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  // 5. Création d'un déclencheur pour mettre à jour la colonne read_at
  `CREATE OR REPLACE FUNCTION public.update_read_at()
  RETURNS TRIGGER AS $$
  BEGIN
    SET search_path = public;
    IF NEW.read = TRUE AND OLD.read = FALSE THEN
      NEW.read_at = now();
    END IF;
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY INVOKER;`,
  
  `DROP TRIGGER IF EXISTS set_read_at ON public.messages;`,
  
  `CREATE TRIGGER set_read_at
  BEFORE UPDATE ON public.messages
  FOR EACH ROW
  WHEN (NEW.read = TRUE AND OLD.read = FALSE)
  EXECUTE FUNCTION public.update_read_at();`,
  
  // 6. Ajout d'index pour améliorer les performances des requêtes fréquentes
  `CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages(recipient_id, read) WHERE read = FALSE;`,
  
  // 7. Vérifier si la colonne provider_id existe dans la table conversations
  `DO $$ 
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'participant1_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'provider_id'
    ) THEN
      ALTER TABLE public.conversations RENAME COLUMN participant1_id TO provider_id;
    END IF;
  END $$;`,
  
  // 8. Vérifier si la colonne client_id existe dans la table conversations
  `DO $$ 
  BEGIN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'participant2_id'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'conversations' 
      AND column_name = 'client_id'
    ) THEN
      ALTER TABLE public.conversations RENAME COLUMN participant2_id TO client_id;
    END IF;
  END $$;`,
  
  // 9. Activer RLS sur la table conversations
  `DO $$ 
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public'
      AND c.relname = 'conversations'
      AND c.relrowsecurity = TRUE
    ) THEN
      ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
    END IF;
  END $$;`,
  
  // 10. Créer des politiques RLS pour la table conversations
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;`,
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations;`,
  `DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs conversations" ON public.conversations;`,
  
  `CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
    ON public.conversations
    FOR SELECT
    USING ((auth.uid() = provider_id) OR (auth.uid() = client_id));`,
  
  `CREATE POLICY "Les utilisateurs peuvent créer des conversations"
    ON public.conversations
    FOR INSERT
    WITH CHECK ((auth.uid() = provider_id) OR (auth.uid() = client_id));`,
  
  `CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations"
    ON public.conversations
    FOR UPDATE
    USING ((auth.uid() = provider_id) OR (auth.uid() = client_id));`
];

// Fonction pour vérifier les résultats
async function verifyResults() {
  console.log('\n🔍 Vérification des résultats...');
  
  // 1. Vérifier la colonne read_at
  const readAtResult = await pool.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND column_name = 'read_at';
  `);
  
  if (readAtResult.rows.length > 0) {
    console.log('✅ Colonne read_at ajoutée avec succès.');
  } else {
    console.error('❌ La colonne read_at n\'a pas été ajoutée.');
  }
  
  // 2. Vérifier les fonctions corrigées
  const functionsResult = await pool.query(`
    SELECT proname, prosrc
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE nspname = 'public'
    AND proname IN ('send_message', 'mark_message_as_read', 'mark_messages_as_read', 'count_messages');
  `);
  
  const vulnerableFunctions = functionsResult.rows
    .filter(row => !row.prosrc.includes('SET search_path = public'))
    .map(row => row.proname);
  
  if (vulnerableFunctions.length === 0) {
    console.log('✅ Toutes les fonctions ont été corrigées avec un chemin de recherche fixe.');
  } else {
    console.error(`❌ Fonctions encore vulnérables: ${vulnerableFunctions.join(', ')}`);
  }
  
  // 3. Vérifier les politiques RLS
  const policiesResult = await pool.query(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'messages';
  `);
  
  console.log(`✅ ${policiesResult.rows.length} politiques RLS configurées pour la table messages:`);
  policiesResult.rows.forEach(row => {
    console.log(`   - ${row.policyname}`);
  });
  
  // 4. Vérifier la fonction RPC get_user_conversations
  const rpcResult = await pool.query(`
    SELECT proname
    FROM pg_proc
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid
    WHERE nspname = 'public'
    AND proname = 'get_user_conversations';
  `);
  
  if (rpcResult.rows.length > 0) {
    console.log('✅ Fonction RPC get_user_conversations créée avec succès.');
  } else {
    console.error('❌ La fonction RPC get_user_conversations n\'a pas été créée.');
  }
  
  // 5. Vérifier les colonnes de la table conversations
  const conversationsResult = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'conversations'
    AND column_name IN ('provider_id', 'client_id');
  `);
  
  console.log(`✅ ${conversationsResult.rows.length}/2 colonnes correctes dans la table conversations:`);
  conversationsResult.rows.forEach(row => {
    console.log(`   - ${row.column_name}`);
  });
  
  // 6. Vérifier les index
  const indexesResult = await pool.query(`
    SELECT indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename = 'messages'
    AND indexname IN ('idx_messages_conversation_id', 'idx_messages_recipient_unread');
  `);
  
  console.log(`✅ ${indexesResult.rows.length}/2 index créés pour la table messages:`);
  indexesResult.rows.forEach(row => {
    console.log(`   - ${row.indexname}`);
  });
  
  // 7. Vérifier les politiques RLS pour la table conversations
  const conversationPoliciesResult = await pool.query(`
    SELECT tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'conversations';
  `);
  
  console.log(`✅ ${conversationPoliciesResult.rows.length} politiques RLS configurées pour la table conversations:`);
  conversationPoliciesResult.rows.forEach(row => {
    console.log(`   - ${row.policyname}`);
  });
}

// Fonction principale
async function main() {
  console.log('🔧 Application des corrections à la base de données Supabase...');
  
  try {
    // Exécuter chaque instruction SQL séquentiellement
    console.log(`📋 Exécution de ${sqlInstructions.length} instructions SQL...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < sqlInstructions.length; i++) {
      const instruction = sqlInstructions[i];
      const instructionPreview = instruction.substring(0, 50).replace(/\n/g, ' ') + '...';
      
      try {
        await pool.query(instruction);
        console.log(`✅ Instruction ${i + 1}/${sqlInstructions.length}: ${instructionPreview}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Erreur dans l'instruction ${i + 1}/${sqlInstructions.length}: ${instructionPreview}`);
        console.error(`   ${error.message}`);
        errorCount++;
        
        // Continuer malgré l'erreur
        console.log('   Continuation automatique malgré l\'erreur...');
      }
    }
    
    console.log(`\n📊 Résumé: ${successCount} instructions réussies, ${errorCount} instructions échouées sur ${sqlInstructions.length} total`);
    
    // Vérifier les résultats
    await verifyResults();
    
    console.log('\n✅ Processus de correction terminé!');
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
