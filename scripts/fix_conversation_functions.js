/**
 * Script pour créer ou corriger les fonctions de conversation
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

async function fixConversationFunctions() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Créer la fonction get_or_create_conversation
    console.log('\n=== CRÉATION DE LA FONCTION get_or_create_conversation ===');
    
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
    
    // Créer la fonction send_message
    console.log('\n=== CRÉATION DE LA FONCTION send_message ===');
    
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
        
        RETURN v_message_id;
      END;
      $$;
    `);
    
    console.log('✅ Fonction send_message créée avec succès');
    
    // Créer la fonction count_messages
    console.log('\n=== CRÉATION DE LA FONCTION count_messages ===');
    
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
    
    // Créer la fonction get_messages
    console.log('\n=== CRÉATION DE LA FONCTION get_messages ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_messages(
        p_conversation_id UUID,
        p_limit INTEGER DEFAULT 50,
        p_offset INTEGER DEFAULT 0
      )
      RETURNS TABLE (
        id UUID,
        conversation_id UUID,
        sender_id UUID,
        recipient_id UUID,
        content TEXT,
        read BOOLEAN,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ
      )
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          m.id,
          m.conversation_id,
          m.sender_id,
          m.recipient_id,
          m.content,
          m.read,
          m.created_at,
          m.updated_at
        FROM 
          messages m
        WHERE 
          m.conversation_id = p_conversation_id
        ORDER BY 
          m.created_at DESC
        LIMIT 
          p_limit
        OFFSET 
          p_offset;
      END;
      $$;
    `);
    
    console.log('✅ Fonction get_messages créée avec succès');
    
    // Créer la fonction mark_messages_as_read
    console.log('\n=== CRÉATION DE LA FONCTION mark_messages_as_read ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
        p_conversation_id UUID,
        p_user_id UUID
      )
      RETURNS INTEGER
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        updated_count INTEGER;
      BEGIN
        UPDATE messages
        SET read = TRUE, updated_at = NOW()
        WHERE 
          conversation_id = p_conversation_id AND
          recipient_id = p_user_id AND
          read = FALSE;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        RETURN updated_count;
      END;
      $$;
    `);
    
    console.log('✅ Fonction mark_messages_as_read créée avec succès');
    
    // Créer la fonction mark_message_as_read
    console.log('\n=== CRÉATION DE LA FONCTION mark_message_as_read ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.mark_message_as_read(
        p_message_id UUID,
        p_user_id UUID
      )
      RETURNS BOOLEAN
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      DECLARE
        updated_count INTEGER;
      BEGIN
        UPDATE messages
        SET read = TRUE, updated_at = NOW()
        WHERE 
          id = p_message_id AND
          recipient_id = p_user_id;
        
        GET DIAGNOSTICS updated_count = ROW_COUNT;
        
        RETURN updated_count > 0;
      END;
      $$;
    `);
    
    console.log('✅ Fonction mark_message_as_read créée avec succès');
    
    // Créer la fonction get_user_conversations
    console.log('\n=== CRÉATION DE LA FONCTION get_user_conversations ===');
    
    await client.query(`
      CREATE OR REPLACE FUNCTION public.get_user_conversations(
        p_user_id UUID,
        p_limit INTEGER DEFAULT 20,
        p_offset INTEGER DEFAULT 0
      )
      RETURNS TABLE (
        id UUID,
        participant1_id UUID,
        participant2_id UUID,
        created_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ,
        last_message_at TIMESTAMPTZ,
        unread_count BIGINT
      )
      LANGUAGE plpgsql
      SECURITY INVOKER
      SET search_path = public
      AS $$
      BEGIN
        RETURN QUERY
        SELECT 
          c.id,
          c.participant1_id,
          c.participant2_id,
          c.created_at,
          c.updated_at,
          c.last_message_at,
          COUNT(m.id) FILTER (WHERE m.recipient_id = p_user_id AND m.read = FALSE)::BIGINT AS unread_count
        FROM 
          conversations c
        LEFT JOIN 
          messages m ON c.id = m.conversation_id
        WHERE 
          c.participant1_id = p_user_id OR c.participant2_id = p_user_id
        GROUP BY 
          c.id
        ORDER BY 
          c.last_message_at DESC
        LIMIT 
          p_limit
        OFFSET 
          p_offset;
      END;
      $$;
    `);
    
    console.log('✅ Fonction get_user_conversations créée avec succès');
    
    console.log('\n=== RÉSUMÉ DES CORRECTIONS ===');
    console.log('✅ Fonction get_or_create_conversation créée');
    console.log('✅ Fonction send_message créée');
    console.log('✅ Fonction count_messages créée');
    console.log('✅ Fonction get_messages créée');
    console.log('✅ Fonction mark_messages_as_read créée');
    console.log('✅ Fonction mark_message_as_read créée');
    console.log('✅ Fonction get_user_conversations créée');
    
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
fixConversationFunctions().catch(console.error);
