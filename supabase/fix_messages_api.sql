-- Script pour corriger les problèmes d'API des messages
-- Date: 2025-05-28

-- 1. Vérifier et mettre à jour les permissions sur la table messages
DO $$
BEGIN
  -- Mettre à jour les permissions sur messages
  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO anon, authenticated';
  
  -- Mettre à jour les permissions sur profiles
  EXECUTE 'GRANT SELECT, UPDATE ON public.profiles TO anon, authenticated';
END $$;

-- 2. Créer la fonction RPC get_user_conversations
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_id UUID)
RETURNS TABLE (
  id UUID,
  participant1_id UUID,
  participant2_id UUID,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  other_user_id UUID,
  other_user_name TEXT,
  other_user_avatar TEXT,
  unread_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH message_counts AS (
    SELECT 
      c.id AS conversation_id,
      COUNT(m.id) FILTER (WHERE m.recipient_id = user_id AND m.read = false) AS unread
    FROM public.conversations c
    LEFT JOIN public.messages m ON (
      m.sender_id = CASE 
        WHEN c.participant1_id = user_id THEN c.participant2_id 
        ELSE c.participant1_id 
      END
      AND m.recipient_id = user_id
    )
    WHERE c.participant1_id = user_id OR c.participant2_id = user_id
    GROUP BY c.id
  )
  SELECT 
    c.id,
    c.participant1_id,
    c.participant2_id,
    c.last_message,
    c.last_message_time,
    CASE 
      WHEN c.participant1_id = user_id THEN c.participant2_id 
      ELSE c.participant1_id 
    END AS other_user_id,
    p.full_name AS other_user_name,
    p.avatar_url AS other_user_avatar,
    COALESCE(mc.unread, 0) AS unread_count
  FROM public.conversations c
  JOIN public.profiles p ON p.id = CASE 
    WHEN c.participant1_id = user_id THEN c.participant2_id 
    ELSE c.participant1_id 
  END
  LEFT JOIN message_counts mc ON mc.conversation_id = c.id
  WHERE c.participant1_id = user_id OR c.participant2_id = user_id
  ORDER BY c.last_message_time DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ajouter une gestion de l'erreur dans le code pour le cas où la table n'existe pas
-- Cela implique de mettre à jour le code client, mais en attendant,
-- ajoutons une fonction helper qui ne lève pas d'erreur si la table n'existe pas

CREATE OR REPLACE FUNCTION public.safe_message_count(user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  message_count INTEGER := 0;
BEGIN
  -- Vérifier si la table messages existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    -- Si elle existe, compter les messages
    SELECT COUNT(*) INTO message_count
    FROM public.messages
    WHERE recipient_id = user_id AND read = false;
  END IF;
  
  RETURN message_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Mettre à jour la structure de la table profiles pour s'assurer que toutes les colonnes nécessaires existent
DO $$
BEGIN
  -- Ajouter la colonne is_provider si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_provider'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- S'assurer que la colonne est correctement indexée
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'profiles' 
    AND indexname = 'idx_profiles_is_provider'
  ) THEN
    CREATE INDEX idx_profiles_is_provider ON public.profiles(is_provider);
  END IF;
  
  -- Mettre à jour les valeurs null
  UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL;
END $$;
