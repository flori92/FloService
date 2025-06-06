-- Migration: Refonte du système de messagerie
-- Date: 2025-05-27

/*
  # Refonte du système de messagerie

  1. Modifications de structure
    - Ajout de colonnes pour les IDs externes
    - Mise à jour des contraintes avec ON DELETE CASCADE
    - Amélioration des index pour les performances

  2. Sécurité
    - Activation de RLS
    - Politiques de sécurité pour conversations et messages
    
  3. Fonctions
    - get_or_create_conversation
    - send_message
*/

-- Activer l'extension pour générer des UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Supprimer les contraintes existantes si elles existent
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_client_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS conversations_provider_id_fkey;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS fk_provider;
ALTER TABLE IF EXISTS conversations DROP CONSTRAINT IF EXISTS fk_client;
ALTER TABLE IF EXISTS messages DROP CONSTRAINT IF EXISTS fk_conversation;

-- Ajouter les nouvelles colonnes pour les IDs externes
ALTER TABLE conversations 
  ADD COLUMN IF NOT EXISTS provider_external_id TEXT,
  ADD COLUMN IF NOT EXISTS client_external_id TEXT;

-- Mettre à jour les contraintes avec ON DELETE CASCADE
ALTER TABLE conversations 
  ADD CONSTRAINT conversations_provider_id_fkey 
  FOREIGN KEY (provider_id) 
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE conversations 
  ADD CONSTRAINT conversations_client_id_fkey
  FOREIGN KEY (client_id)
  REFERENCES auth.users(id)
  ON DELETE CASCADE;

ALTER TABLE messages
  ADD CONSTRAINT messages_conversation_id_fkey
  FOREIGN KEY (conversation_id)
  REFERENCES conversations(id)
  ON DELETE CASCADE;

-- Fonction pour créer ou récupérer une conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_client_id UUID,
  p_provider_external_id TEXT
) 
RETURNS UUID 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
DECLARE
  v_conversation_id UUID;
  v_provider_id UUID;
  v_client_profile_id TEXT;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Récupérer l'ID du prestataire depuis la table profiles
  SELECT id INTO v_provider_id 
  FROM public.profiles 
  WHERE provider_id = p_provider_external_id
  LIMIT 1;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Prestataire non trouvé';
  END IF;

  -- Récupérer l'ID de profil du client
  SELECT id INTO v_client_profile_id
  FROM public.profiles
  WHERE user_id = p_client_id
  LIMIT 1;

  -- Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id 
    AND provider_external_id = p_provider_external_id
  LIMIT 1;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      client_id, 
      provider_id,
      provider_external_id,
      client_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
      v_provider_id,
      p_provider_external_id,
      v_client_profile_id,
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

-- Fonction pour envoyer un message
CREATE OR REPLACE FUNCTION public.send_message(
  p_conversation_id UUID,
  p_sender_id UUID,
  p_content TEXT,
  p_message_type TEXT DEFAULT 'text',
  p_media_url TEXT DEFAULT NULL,
  p_media_metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_message_id UUID;
  v_client_id UUID;
  v_provider_id UUID;
BEGIN
  -- Vérifier que l'expéditeur fait partie de la conversation
  SELECT client_id, provider_id INTO v_client_id, v_provider_id
  FROM public.conversations
  WHERE id = p_conversation_id
  AND (client_id = p_sender_id OR provider_id = p_sender_id);

  IF v_client_id IS NULL THEN
    RAISE EXCEPTION 'Conversation non trouvée ou accès non autorisé';
  END IF;

  -- Insérer le message
  INSERT INTO public.messages (
    conversation_id,
    sender_id,
    content,
    message_type,
    media_url,
    media_metadata,
    created_at
  ) VALUES (
    p_conversation_id,
    p_sender_id,
    p_content,
    COALESCE(p_message_type, 'text'),
    p_media_url,
    p_media_metadata,
    NOW()
  )
  RETURNING id INTO v_message_id;

  -- Mettre à jour la conversation
  UPDATE public.conversations
  SET 
    last_message = p_content,
    last_message_time = NOW(),
    updated_at = NOW()
  WHERE id = p_conversation_id;

  -- Créer une notification pour le destinataire
  INSERT INTO public.notifications (
    user_id,
    type,
    content,
    related_entity_id,
    created_at
  ) VALUES (
    CASE 
      WHEN p_sender_id = v_client_id THEN v_provider_id 
      ELSE v_client_id 
    END,
    'new_message',
    p_content,
    v_message_id,
    NOW()
  );

  RETURN v_message_id;
END;
$$;

-- Activer RLS sur les tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON conversations;
DROP POLICY IF EXISTS "Les clients peuvent créer des conversations" ON conversations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les messages de leurs conversations" ON messages;
DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages dans leurs conversations" ON messages;

-- Politiques pour la table conversations
CREATE POLICY "Les utilisateurs peuvent voir leurs conversations" 
ON public.conversations
FOR SELECT
USING (
  auth.uid() = client_id OR 
  auth.uid() = provider_id OR
  (provider_id IS NULL AND auth.uid() = client_id)
);

CREATE POLICY "Les clients peuvent créer des conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = client_id
);

-- Politiques pour la table messages
CREATE POLICY "Les utilisateurs peuvent voir les messages de leurs conversations"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = messages.conversation_id
    AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages dans leurs conversations"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM conversations
    WHERE id = messages.conversation_id
    AND (client_id = auth.uid() OR provider_id = auth.uid())
  )
  AND sender_id = auth.uid()
);

-- Créer des index pour améliorer les performances
DROP INDEX IF EXISTS idx_conversations_client_provider;
DROP INDEX IF EXISTS idx_messages_conversation_created;
DROP INDEX IF EXISTS idx_conversations_client_id;
DROP INDEX IF EXISTS idx_conversations_provider_id;
DROP INDEX IF EXISTS idx_conversations_provider_external_id;
DROP INDEX IF EXISTS idx_conversations_participants;

CREATE INDEX idx_conversations_client_provider ON conversations(client_id, provider_id);
CREATE INDEX idx_messages_conversation_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_conversations_client_id ON conversations(client_id);
CREATE INDEX idx_conversations_provider_id ON conversations(provider_id);
CREATE INDEX idx_conversations_provider_external_id ON conversations(provider_external_id);
CREATE INDEX idx_conversations_participants ON conversations(client_id, provider_id);