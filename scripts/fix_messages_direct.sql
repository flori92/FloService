-- Script de correction simplifié pour la table messages et ses dépendances
-- Créé le 01/06/2025

-- 1. Ajout de la colonne manquante
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_at TIMESTAMP WITH TIME ZONE;

-- 2. Correction des fonctions sans chemin de recherche fixe
-- 2.1 Fonction get_messages
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

-- 2.2 Fonction send_message
CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id UUID, p_content TEXT)
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2.3 Fonction mark_message_as_read
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

-- 2.4 Fonction mark_messages_as_read
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

-- 2.5 Fonction count_messages
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

-- 3. Correction des incohérences dans les politiques RLS
-- 3.1 Supprimer les politiques redondantes
DROP POLICY IF EXISTS "Public access to messages" ON public.messages;
DROP POLICY IF EXISTS "Accès public en lecture" ON public.messages;

-- 3.2 Créer des politiques cohérentes
CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent voir leurs messages"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent mettre à jour leurs messages"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = recipient_id);

-- 4. Création d'une fonction RPC sécurisée pour récupérer les conversations d'un utilisateur
CREATE OR REPLACE FUNCTION public.get_user_conversations(p_user_id UUID)
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 5. Création d'un déclencheur pour mettre à jour la colonne read_at
CREATE OR REPLACE FUNCTION public.update_read_at()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public;
  IF NEW.read = TRUE AND OLD.read = FALSE THEN
    NEW.read_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Créer le déclencheur s'il n'existe pas déjà
DROP TRIGGER IF EXISTS set_read_at ON public.messages;
CREATE TRIGGER set_read_at
BEFORE UPDATE ON public.messages
FOR EACH ROW
WHEN (NEW.read = TRUE AND OLD.read = FALSE)
EXECUTE FUNCTION public.update_read_at();

-- 6. Ajout d'index pour améliorer les performances des requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_unread ON public.messages(recipient_id, read) WHERE read = FALSE;

-- 7. Vérification et correction des colonnes de la table conversations
-- Renommer participant1_id en provider_id si nécessaire
DO $$
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
END $$;

-- Renommer participant2_id en client_id si nécessaire
DO $$
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
END $$;

-- 8. Activer RLS sur la table conversations si nécessaire
DO $$
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
END $$;

-- 9. Créer des politiques RLS pour la table conversations
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs conversations" ON public.conversations;

-- Politique SELECT
CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
  ON public.conversations
  FOR SELECT
  USING ((auth.uid() = provider_id) OR (auth.uid() = client_id));

-- Politique INSERT
CREATE POLICY "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK ((auth.uid() = provider_id) OR (auth.uid() = client_id));

-- Politique UPDATE
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations"
  ON public.conversations
  FOR UPDATE
  USING ((auth.uid() = provider_id) OR (auth.uid() = client_id));
