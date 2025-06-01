/**
 * Script pour créer les tables manquantes et corriger les problèmes d'API
 * Résout les erreurs "La table messages n'existe pas encore"
 */

import pg from 'pg';

const { Pool } = pg;

// Configuration de la connexion à la base de données
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

async function fixMissingTables() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Vérifier si la table conversations existe
    console.log('\n=== VÉRIFICATION DE LA TABLE CONVERSATIONS ===');
    const conversationsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'conversations'
      );
    `);
    
    const conversationsExist = conversationsCheck.rows[0].exists;
    
    if (!conversationsExist) {
      console.log('⚠️ La table conversations n\'existe pas, création...');
      
      // Créer la table conversations
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.conversations (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          last_message_at TIMESTAMPTZ DEFAULT NOW(),
          
          CONSTRAINT different_participants CHECK (participant1_id <> participant2_id)
        );
        
        -- Création d'index pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_conversations_participant1 ON public.conversations(participant1_id);
        CREATE INDEX IF NOT EXISTS idx_conversations_participant2 ON public.conversations(participant2_id);
        
        -- Activation du RLS
        ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
        
        -- Politiques RLS
        CREATE POLICY "Les utilisateurs authentifiés peuvent voir leurs conversations"
          ON public.conversations
          FOR SELECT
          USING (
            auth.role() = 'authenticated' AND 
            (participant1_id = auth.uid() OR participant2_id = auth.uid())
          );
        
        CREATE POLICY "Les utilisateurs peuvent créer des conversations"
          ON public.conversations
          FOR INSERT
          WITH CHECK (
            auth.role() = 'authenticated' AND 
            (participant1_id = auth.uid() OR participant2_id = auth.uid())
          );
        
        CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations"
          ON public.conversations
          FOR UPDATE
          USING (
            participant1_id = auth.uid() OR participant2_id = auth.uid()
          );
      `);
      
      console.log('✅ Table conversations créée avec succès');
    } else {
      console.log('✅ La table conversations existe déjà');
    }
    
    // Vérifier si la table messages existe
    console.log('\n=== VÉRIFICATION DE LA TABLE MESSAGES ===');
    const messagesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'messages'
      );
    `);
    
    const messagesExist = messagesCheck.rows[0].exists;
    
    if (!messagesExist) {
      console.log('⚠️ La table messages n\'existe pas, création...');
      
      // Créer la table messages
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.messages (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          conversation_id UUID NOT NULL,
          sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          
          CONSTRAINT fk_conversation
            FOREIGN KEY(conversation_id) 
            REFERENCES public.conversations(id)
            ON DELETE CASCADE
        );
        
        -- Création d'index pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
        CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
        CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
        
        -- Activation du RLS
        ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
        
        -- Politiques RLS
        CREATE POLICY "Les utilisateurs authentifiés peuvent voir leurs messages"
          ON public.messages
          FOR SELECT
          USING (
            auth.role() = 'authenticated' AND 
            (sender_id = auth.uid() OR recipient_id = auth.uid())
          );
        
        CREATE POLICY "Les utilisateurs peuvent créer des messages"
          ON public.messages
          FOR INSERT
          WITH CHECK (
            auth.role() = 'authenticated' AND 
            sender_id = auth.uid()
          );
        
        CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages"
          ON public.messages
          FOR UPDATE
          USING (sender_id = auth.uid());
      `);
      
      console.log('✅ Table messages créée avec succès');
    } else {
      console.log('✅ La table messages existe déjà');
    }
    
    // Vérifier si la table message_attachments existe
    console.log('\n=== VÉRIFICATION DE LA TABLE MESSAGE_ATTACHMENTS ===');
    const attachmentsCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'message_attachments'
      );
    `);
    
    const attachmentsExist = attachmentsCheck.rows[0].exists;
    
    if (!attachmentsExist) {
      console.log('⚠️ La table message_attachments n\'existe pas, création...');
      
      // Créer la table message_attachments
      await client.query(`
        CREATE TABLE IF NOT EXISTS public.message_attachments (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
          file_path TEXT NOT NULL,
          file_name TEXT NOT NULL,
          file_type TEXT,
          file_size INTEGER,
          created_at TIMESTAMPTZ DEFAULT NOW()
        );
        
        -- Création d'index pour améliorer les performances
        CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);
        
        -- Activation du RLS
        ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;
        
        -- Politiques RLS
        CREATE POLICY "Les utilisateurs authentifiés peuvent voir les pièces jointes de leurs messages"
          ON public.message_attachments
          FOR SELECT
          USING (
            auth.role() = 'authenticated' AND 
            message_id IN (
              SELECT id FROM public.messages 
              WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
            )
          );
        
        CREATE POLICY "Les utilisateurs peuvent ajouter des pièces jointes à leurs messages"
          ON public.message_attachments
          FOR INSERT
          WITH CHECK (
            auth.role() = 'authenticated' AND 
            message_id IN (
              SELECT id FROM public.messages 
              WHERE sender_id = auth.uid()
            )
          );
      `);
      
      console.log('✅ Table message_attachments créée avec succès');
    } else {
      console.log('✅ La table message_attachments existe déjà');
    }
    
    // Vérifier la fonction get_or_create_conversation
    console.log('\n=== VÉRIFICATION DE LA FONCTION get_or_create_conversation ===');
    const functionCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE proname = 'get_or_create_conversation'
        AND nspname = 'public'
      );
    `);
    
    const functionExists = functionCheck.rows[0].exists;
    
    if (!functionExists) {
      console.log('⚠️ La fonction get_or_create_conversation n\'existe pas, création...');
      
      // Créer la fonction get_or_create_conversation
      await client.query(`
        CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
          user1_id UUID,
          user2_id UUID
        )
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = public
        AS $$
        DECLARE
          conversation_id UUID;
        BEGIN
          -- Vérifier si la conversation existe déjà
          SELECT id INTO conversation_id
          FROM conversations
          WHERE 
            (participant1_id = user1_id AND participant2_id = user2_id)
            OR 
            (participant1_id = user2_id AND participant2_id = user1_id);
          
          -- Si la conversation n'existe pas, la créer
          IF conversation_id IS NULL THEN
            INSERT INTO conversations (participant1_id, participant2_id)
            VALUES (user1_id, user2_id)
            RETURNING id INTO conversation_id;
          END IF;
          
          RETURN conversation_id;
        END;
        $$;
      `);
      
      console.log('✅ Fonction get_or_create_conversation créée avec succès');
    } else {
      console.log('✅ La fonction get_or_create_conversation existe déjà');
      
      // S'assurer que la fonction a un chemin de recherche fixe
      await client.query(`
        ALTER FUNCTION public.get_or_create_conversation(UUID, UUID)
        SET search_path = public;
      `);
      
      console.log('✅ Chemin de recherche fixé pour la fonction get_or_create_conversation');
    }
    
    // Vérifier la fonction send_message
    console.log('\n=== VÉRIFICATION DE LA FONCTION send_message ===');
    const sendMessageCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE proname = 'send_message'
        AND nspname = 'public'
      );
    `);
    
    const sendMessageExists = sendMessageCheck.rows[0].exists;
    
    if (!sendMessageExists) {
      console.log('⚠️ La fonction send_message n\'existe pas, création...');
      
      // Créer la fonction send_message
      await client.query(`
        CREATE OR REPLACE FUNCTION public.send_message(
          p_sender_id UUID,
          p_recipient_id UUID,
          p_content TEXT
        )
        RETURNS UUID
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = public
        AS $$
        DECLARE
          v_conversation_id UUID;
          v_message_id UUID;
        BEGIN
          -- Obtenir ou créer la conversation
          v_conversation_id := get_or_create_conversation(p_sender_id, p_recipient_id);
          
          -- Insérer le message
          INSERT INTO messages (conversation_id, sender_id, recipient_id, content)
          VALUES (v_conversation_id, p_sender_id, p_recipient_id, p_content)
          RETURNING id INTO v_message_id;
          
          -- Mettre à jour la date du dernier message dans la conversation
          UPDATE conversations
          SET last_message_at = NOW(), updated_at = NOW()
          WHERE id = v_conversation_id;
          
          -- Appeler la fonction de notification si elle existe
          BEGIN
            PERFORM handle_new_message(v_message_id);
          EXCEPTION WHEN OTHERS THEN
            -- Ignorer l'erreur si la fonction n'existe pas
            NULL;
          END;
          
          RETURN v_message_id;
        END;
        $$;
      `);
      
      console.log('✅ Fonction send_message créée avec succès');
    } else {
      console.log('✅ La fonction send_message existe déjà');
      
      // S'assurer que la fonction a un chemin de recherche fixe
      await client.query(`
        ALTER FUNCTION public.send_message(UUID, UUID, TEXT)
        SET search_path = public;
      `);
      
      console.log('✅ Chemin de recherche fixé pour la fonction send_message');
    }
    
    // Vérifier la fonction count_messages
    console.log('\n=== VÉRIFICATION DE LA FONCTION count_messages ===');
    const countMessagesCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM pg_proc
        JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
        WHERE proname = 'count_messages'
        AND nspname = 'public'
      );
    `);
    
    const countMessagesExists = countMessagesCheck.rows[0].exists;
    
    if (!countMessagesExists) {
      console.log('⚠️ La fonction count_messages n\'existe pas, création...');
      
      // Créer la fonction count_messages
      await client.query(`
        CREATE OR REPLACE FUNCTION public.count_messages(
          p_user_id UUID
        )
        RETURNS INTEGER
        LANGUAGE plpgsql
        SECURITY INVOKER
        SET search_path = public
        AS $$
        DECLARE
          message_count INTEGER;
        BEGIN
          SELECT COUNT(*) INTO message_count
          FROM messages
          WHERE recipient_id = p_user_id AND read = FALSE;
          
          RETURN message_count;
        END;
        $$;
      `);
      
      console.log('✅ Fonction count_messages créée avec succès');
    } else {
      console.log('✅ La fonction count_messages existe déjà');
      
      // S'assurer que la fonction a un chemin de recherche fixe
      await client.query(`
        ALTER FUNCTION public.count_messages(UUID)
        SET search_path = public;
      `);
      
      console.log('✅ Chemin de recherche fixé pour la fonction count_messages');
    }
    
    console.log('\n=== RÉSUMÉ DES CORRECTIONS ===');
    console.log('✅ Tables de messagerie créées ou vérifiées');
    console.log('✅ Fonctions de messagerie créées ou vérifiées');
    console.log('✅ RLS activé sur toutes les tables');
    console.log('✅ Politiques de sécurité appliquées');
    
  } catch (error) {
    console.error('Erreur globale:', error);
  } finally {
    // Libération de la connexion et fermeture du pool
    if (client) client.release();
    await pool.end();
    console.log('\nConnexion à la base de données fermée');
  }
}

// Exécuter le script
fixMissingTables().catch(console.error);
