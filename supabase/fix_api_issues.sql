-- Script pour corriger les problèmes d'API
-- Date: 2025-05-28

-- 1. Vérifier si la vue api.messages existe, sinon la créer
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_views WHERE viewname = 'messages' AND schemaname = 'public'
  ) THEN
    EXECUTE 'CREATE VIEW api.messages AS SELECT * FROM public.messages';
  END IF;
END $$;

-- 2. Mettre à jour les permissions de la vue api.messages
GRANT SELECT, INSERT, UPDATE, DELETE ON api.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.messages TO anon;

-- 3. Vérifier et corriger les permissions sur la table profiles
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;

-- 4. Corriger le problème de requête sur is_provider en créant une vue spécifique
CREATE OR REPLACE VIEW api.provider_status AS 
SELECT id, is_provider, last_seen 
FROM public.profiles;

GRANT SELECT ON api.provider_status TO authenticated;
GRANT SELECT ON api.provider_status TO anon;

-- 5. Vérifier que les fonctions API existent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'handle_new_message'
  ) THEN
    CREATE OR REPLACE FUNCTION public.handle_new_message()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Update the conversation's last message info
      IF NEW.conversation_id IS NOT NULL THEN
        UPDATE public.conversations
        SET last_message = SUBSTRING(NEW.content FROM 1 FOR 50),
            last_message_time = NEW.created_at
        WHERE id = NEW.conversation_id;
      END IF;
      
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;
    
    -- Create trigger
    DROP TRIGGER IF EXISTS message_update_conversation ON public.messages;
    CREATE TRIGGER message_update_conversation
      AFTER INSERT ON public.messages
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_message();
  END IF;
END $$;

-- 6. Créer une fonction pour récupérer les messages avec pagination
CREATE OR REPLACE FUNCTION public.get_messages(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  sender_id UUID,
  recipient_id UUID,
  content TEXT,
  read BOOLEAN,
  has_attachment BOOLEAN,
  attachment_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id, m.sender_id, m.recipient_id, m.content, m.read, m.has_attachment, m.attachment_url, m.created_at, m.updated_at
  FROM public.messages m
  WHERE m.sender_id = p_user_id OR m.recipient_id = p_user_id
  ORDER BY m.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Créer une fonction pour compter les messages
CREATE OR REPLACE FUNCTION public.count_messages(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO message_count
  FROM public.messages m
  WHERE m.sender_id = p_user_id OR m.recipient_id = p_user_id;
  
  RETURN message_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Créer une fonction pour mettre à jour le statut de lecture des messages
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_user_id UUID, p_sender_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.messages
  SET read = TRUE
  WHERE recipient_id = p_user_id AND sender_id = p_sender_id AND read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Ajouter une politique publique pour permettre l'accès via l'API
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Accès public en lecture" ON public.messages;
CREATE POLICY "Accès public en lecture"
  ON public.messages
  FOR SELECT
  TO public
  USING (true);

-- 10. Corriger la structure si nécessaire pour correspondre à ce que l'application attend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'conversation_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN conversation_id UUID;
    
    -- Ajouter l'index
    CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
  END IF;
END $$;
