/**
 * Script pour recréer les fonctions de messagerie avec les bonnes signatures
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

async function recreateMessageFunctions() {
  console.log('Connexion à la base de données Supabase...');
  let client;
  
  try {
    // Connexion à la base de données
    client = await pool.connect();
    console.log('Connexion établie avec succès');
    
    // Supprimer puis recréer les fonctions problématiques
    console.log('\n=== SUPPRESSION ET RECRÉATION DES FONCTIONS DE MESSAGERIE ===');
    
    // Liste des fonctions à recréer
    const functions = [
      'get_messages',
      'mark_messages_as_read',
      'mark_message_as_read',
      'get_user_conversations'
    ];
    
    for (const funcName of functions) {
      try {
        console.log(`Suppression de la fonction ${funcName}...`);
        
        // Récupérer les signatures de la fonction
        const signaturesResult = await client.query(`
          SELECT pg_get_function_identity_arguments(p.oid) AS args
          FROM pg_proc p
          JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE p.proname = $1
          AND n.nspname = 'public'
        `, [funcName]);
        
        if (signaturesResult.rows.length > 0) {
          for (const row of signaturesResult.rows) {
            const args = row.args;
            await client.query(`DROP FUNCTION IF EXISTS public.${funcName}(${args})`);
            console.log(`✅ Fonction ${funcName}(${args}) supprimée`);
          }
        } else {
          console.log(`⚠️ Aucune signature trouvée pour la fonction ${funcName}`);
        }
      } catch (error) {
        console.error(`⚠️ Erreur lors de la suppression de la fonction ${funcName}:`, error.message);
      }
    }
    
    // Recréer les fonctions
    console.log('\n=== RECRÉATION DES FONCTIONS ===');
    
    // Fonction get_messages
    console.log('Recréation de la fonction get_messages...');
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
    console.log('✅ Fonction get_messages recréée avec succès');
    
    // Fonction mark_messages_as_read
    console.log('Recréation de la fonction mark_messages_as_read...');
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
    console.log('✅ Fonction mark_messages_as_read recréée avec succès');
    
    // Fonction mark_message_as_read
    console.log('Recréation de la fonction mark_message_as_read...');
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
    console.log('✅ Fonction mark_message_as_read recréée avec succès');
    
    // Fonction get_user_conversations
    console.log('Recréation de la fonction get_user_conversations...');
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
    console.log('✅ Fonction get_user_conversations recréée avec succès');
    
    console.log('\n=== RÉSUMÉ DES CORRECTIONS ===');
    console.log('✅ Toutes les fonctions de messagerie ont été recréées avec succès');
    
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
recreateMessageFunctions().catch(console.error);
