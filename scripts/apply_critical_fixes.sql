-- apply_critical_fixes.sql
-- Ce script corrige les fonctions vulnérables et réapplique les politiques RLS pour la table messages.

-- Désactiver temporairement RLS sur la table messages pour éviter les erreurs lors de la modification des politiques
-- ALTER TABLE public.messages DISABLE ROW LEVEL SECURITY;

-- 1. Suppression des fonctions surchargées et vulnérables

DROP FUNCTION IF EXISTS public.count_messages(uuid);
DROP FUNCTION IF EXISTS public.mark_message_as_read(uuid, uuid);
DROP FUNCTION IF EXISTS public.mark_messages_as_read(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid, text, text, text, jsonb);

-- Assurons-nous que les versions que nous voulons garder sont bien là et sécurisées.
-- Les CREATE OR REPLACE suivants vont soit créer la fonction si elle a été droppée par erreur
-- soit la remplacer par une version sécurisée si elle existait mais avec une mauvaise définition.

-- 1. Recréation/Sécurisation des fonctions nécessaires avec SET search_path = public

-- 1.1 Fonction get_messages
DROP FUNCTION IF EXISTS public.get_messages(UUID, INTEGER, INTEGER);
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

-- 1.2 Fonction send_message
DROP FUNCTION IF EXISTS public.send_message(UUID, TEXT);
CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id UUID, p_content TEXT)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 1.3 Fonction mark_message_as_read
DROP FUNCTION IF EXISTS public.mark_message_as_read(UUID);
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

-- 1.4 Fonction mark_messages_as_read
DROP FUNCTION IF EXISTS public.mark_messages_as_read(UUID);
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

-- 1.5 Fonction count_messages
DROP FUNCTION IF EXISTS public.count_messages(UUID, BOOLEAN);
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

-- 2. Suppression des politiques RLS existantes pour la table messages
-- (pour éviter les conflits lors de la recréation)
DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages;
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs messages" ON public.messages; -- Nom de politique de la sortie de verify_messages_table.js
DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour les messages qu'ils ont reçus" ON public.messages; -- Nom de politique de fix_messages_database.sql
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages; -- Nom de politique de la sortie de verify_messages_table.js
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages envoyés ou reçus" ON public.messages; -- Nom de politique de fix_messages_database.sql

-- 3. Recréation des politiques RLS pour la table messages

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les utilisateurs peuvent voir leurs messages envoyés ou reçus"
  ON public.messages
  FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour les messages qu'ils ont reçus (pour marquer comme lu)"
  ON public.messages
  FOR UPDATE
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id AND read = TRUE AND read_at IS NOT NULL); -- Condition plus restrictive pour UPDATE

-- Réactiver RLS si désactivé plus haut (normalement ENABLE ROW LEVEL SECURITY suffit)
-- ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Correction de la fonction is_provider
DROP FUNCTION IF EXISTS public.is_provider(uuid);
CREATE OR REPLACE FUNCTION public.is_provider(p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  SET search_path = public;
  -- Tente de lire une colonne booléenne 'is_provider' directement sur la table profiles.
  -- Si cette colonne n'existe pas ou si la logique est différente (ex: basée sur un rôle),
  -- cette fonction devra être adaptée.
  RETURN COALESCE((
    SELECT profiles.is_provider -- Supposant que la colonne s'appelle 'is_provider'
    FROM profiles
    WHERE id = p_user_id
  ), false);
END;
$$ LANGUAGE plpgsql SECURITY INVOKER STABLE;

SELECT 'Script apply_critical_fixes.sql exécuté avec succès.' AS status;
