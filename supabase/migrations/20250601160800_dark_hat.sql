-- Migration pour créer les tables du système de messagerie
-- Date: 2025-06-01

-- 1. Créer la table conversations si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID REFERENCES auth.users(id),
  client_id UUID NOT NULL REFERENCES auth.users(id),
  provider_external_id TEXT,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_conversation UNIQUE (client_id, provider_external_id)
);

-- 2. Créer les index pour la table conversations
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON public.conversations(provider_id);
CREATE INDEX IF NOT EXISTS idx_conversations_client_id ON public.conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_external_id ON public.conversations(provider_external_id);

-- 3. Créer la table messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Créer les index pour la table messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read) WHERE read = FALSE;

-- 5. Créer la table external_id_mapping si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.external_id_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  external_id TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- ex: 'telegram', 'whatsapp', etc.
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (external_id, provider_type)
);

-- 6. Créer les index pour la table external_id_mapping
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_user_id ON public.external_id_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_external_id ON public.external_id_mapping(external_id);

-- 7. Activer RLS sur les tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_id_mapping ENABLE ROW LEVEL SECURITY;

-- 8. Créer les politiques RLS pour conversations
CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations"
  ON public.conversations
  FOR UPDATE
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- 9. Créer les politiques RLS pour messages
CREATE POLICY "Les utilisateurs peuvent voir leurs messages envoyés ou reçus"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour les messages qu'ils ont reçus"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id AND read = TRUE AND read_at IS NOT NULL);

-- 10. Créer les politiques RLS pour external_id_mapping
CREATE POLICY "Accès administrateurs aux mappings d'ID"
  ON public.external_id_mapping
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- 11. Créer la fonction pour vérifier si une table existe
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  exists_bool BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = $1
  ) INTO exists_bool;
  
  RETURN exists_bool;
END;
$$;

-- 12. Créer la fonction pour compter les messages non lus de manière sécurisée
CREATE OR REPLACE FUNCTION public.safe_message_count(user_id UUID DEFAULT auth.uid())
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- 13. Créer la fonction pour obtenir ou créer une conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_client_id UUID,
  p_provider_external_id TEXT
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conversation_id UUID;
  v_provider_id UUID;
  v_mapping_id UUID;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Étape 1: Vérifier si l'ID externe existe déjà dans notre table de mapping
  SELECT id, user_id INTO v_mapping_id, v_provider_id
  FROM public.external_id_mapping
  WHERE external_id = p_provider_external_id;
  
  -- Si le mapping n'existe pas, on le crée
  IF v_mapping_id IS NULL THEN
    INSERT INTO public.external_id_mapping (external_id, provider_type)
    VALUES (
      p_provider_external_id, 
      CASE 
        WHEN p_provider_external_id LIKE 'tg-%' THEN 'telegram'
        WHEN p_provider_external_id LIKE 'wa-%' THEN 'whatsapp'
        ELSE 'unknown'
      END
    )
    RETURNING id, user_id INTO v_mapping_id, v_provider_id;
  END IF;

  -- Étape 2: Vérifier si une conversation existe déjà pour ce client et cet ID externe
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND provider_external_id = p_provider_external_id;
  
  -- Si aucune conversation n'existe, on en crée une nouvelle
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      client_id, 
      provider_id,  -- Peut être NULL si le prestataire n'est pas encore enregistré
      provider_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
      v_provider_id,  -- Peut être NULL
      p_provider_external_id,
      '',
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

-- 14. Créer la fonction pour envoyer un message
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_content TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_message_id UUID;
  v_conversation RECORD;
  v_sender_id UUID;
  v_recipient_id UUID;
BEGIN
  SET search_path = public;
  v_sender_id := auth.uid();
  SELECT provider_id, client_id INTO v_conversation
  FROM conversations
  WHERE id = p_conversation_id;
  IF v_sender_id = v_conversation.provider_id THEN
    v_recipient_id := v_conversation.client_id;
  ELSE
    v_recipient_id := v_conversation.provider_id;
  END IF;
  INSERT INTO messages (conversation_id, sender_id, recipient_id, content)
  VALUES (p_conversation_id, v_sender_id, v_recipient_id, p_content)
  RETURNING id INTO v_message_id;
  UPDATE conversations
  SET last_message = p_content,
      last_message_time = now(),
      updated_at = now()
  WHERE id = p_conversation_id;
  RETURN v_message_id;
END;
$$;

-- 15. Créer la fonction pour marquer un message comme lu
CREATE OR REPLACE FUNCTION public.mark_message_as_read(p_message_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  SET search_path = public;
  UPDATE messages
  SET read = TRUE,
      read_at = now()
  WHERE id = p_message_id
  AND recipient_id = auth.uid();
  
  RETURN FOUND;
END;
$$;

-- 16. Créer la fonction pour marquer tous les messages d'une conversation comme lus
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(p_conversation_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- 17. Créer la fonction pour compter les messages
CREATE OR REPLACE FUNCTION public.count_messages(p_conversation_id UUID, p_unread_only BOOLEAN DEFAULT FALSE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- 18. Créer la fonction pour récupérer les messages
CREATE OR REPLACE FUNCTION public.get_messages(p_conversation_id UUID, p_limit INTEGER DEFAULT 50, p_offset INTEGER DEFAULT 0)
RETURNS SETOF public.messages
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- 19. Créer la table message_attachments si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 20. Créer les index pour la table message_attachments
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public.message_attachments(message_id);

-- 21. Activer RLS sur la table message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- 22. Créer les politiques RLS pour message_attachments
CREATE POLICY "Les utilisateurs peuvent voir leurs pièces jointes"
  ON public.message_attachments
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
  ));

CREATE POLICY "Les utilisateurs peuvent ajouter des pièces jointes"
  ON public.message_attachments
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));

-- 23. Créer un trigger pour mettre à jour la colonne read_at
CREATE OR REPLACE FUNCTION public.update_read_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  SET search_path = public;
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- 24. Créer le trigger pour la table messages
DROP TRIGGER IF EXISTS set_read_at ON public.messages;
CREATE TRIGGER set_read_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
WHEN (NEW.read = TRUE AND OLD.read = FALSE)
EXECUTE FUNCTION public.update_read_at();

-- 25. Ajouter une entrée de mapping pour "tg-2" s'il n'existe pas déjà
INSERT INTO public.external_id_mapping (external_id, provider_type, metadata)
VALUES 
  ('tg-2', 'telegram', '{"display_name": "Prestataire Telegram", "avatar_url": "https://example.com/default-avatar.png"}')
ON CONFLICT (external_id, provider_type) DO NOTHING;

-- 26. Créer un bucket de stockage pour les pièces jointes si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('message-attachments', 'message-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 27. Créer les politiques de sécurité pour le bucket de pièces jointes
CREATE POLICY "Les pièces jointes sont accessibles publiquement"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'message-attachments');

CREATE POLICY "Les utilisateurs authentifiés peuvent télécharger des pièces jointes"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'message-attachments' AND auth.role() = 'authenticated');