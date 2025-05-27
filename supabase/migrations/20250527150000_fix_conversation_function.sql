-- Migration pour corriger la fonction get_or_create_conversation
-- Date: 2025-05-27

-- Supprimer les anciennes versions de la fonction si elles existent
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, TEXT);

-- Créer le type d'énumération pour le statut de la conversation s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
    CREATE TYPE conversation_status AS ENUM ('active', 'archived', 'blocked');
  END IF;
END $$;

-- Créer la table des conversations si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_external_id TEXT NOT NULL,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  status conversation_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Créer les index pour les performances s'ils n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_conversations_client_id'
  ) THEN
    CREATE INDEX idx_conversations_client_id ON public.conversations(client_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_conversations_provider_id'
  ) THEN
    CREATE INDEX idx_conversations_provider_id ON public.conversations(provider_external_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_conversations_updated_at'
  ) THEN
    CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at);
  END IF;
END $$;

-- Créer la table des messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_system_message BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Créer les index pour les performances s'ils n'existent pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_messages_conversation_id'
  ) THEN
    CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_messages_created_at'
  ) THEN
    CREATE INDEX idx_messages_created_at ON public.messages(created_at);
  END IF;
END $$;

-- Créer ou remplacer la fonction get_or_create_conversation
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
  v_provider_exists BOOLEAN;
  v_client_profile_exists BOOLEAN;
  v_error_message TEXT;
  v_conversation_status TEXT;
  v_provider_id UUID;
BEGIN
  -- Vérifier si le client existe dans la table auth.users
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) 
  INTO v_client_profile_exists;
  
  IF NOT v_client_profile_exists THEN
    RAISE EXCEPTION 'CLIENT_NOT_FOUND';
  END IF;

  -- Vérifier si le fournisseur existe dans la table profiles
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_provider_external_id::UUID
    AND role = 'provider'
  ) INTO v_provider_exists;
  
  IF NOT v_provider_exists THEN
    RAISE EXCEPTION 'PROVIDER_NOT_FOUND';
  END IF;

  -- Vérifier si une conversation existe déjà entre ce client et ce fournisseur
  -- On vérifie dans les deux sens (client->fournisseur et fournisseur->client)
  SELECT id, status INTO v_conversation_id, v_conversation_status
  FROM conversations
  WHERE (client_id = p_client_id AND provider_external_id = p_provider_external_id)
     OR (client_id = p_provider_external_id::UUID AND provider_external_id = p_client_id::TEXT)
  LIMIT 1;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    BEGIN
      -- Insérer la nouvelle conversation
      INSERT INTO conversations (
        client_id,
        provider_external_id,
        last_message,
        last_message_time,
        status
      ) VALUES (
        p_client_id,
        p_provider_external_id,
        '',
        NOW(),
        'active'::conversation_status
      )
      RETURNING id INTO v_conversation_id;
      
      -- Créer automatiquement un message de bienvenue
      INSERT INTO messages (
        conversation_id,
        sender_id,
        content,
        is_system_message
      ) VALUES (
        v_conversation_id,
        p_provider_external_id::UUID,
        'Conversation démarrée',
        TRUE
      );
      
    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, on log l'erreur et on la remonte
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RAISE EXCEPTION 'ERREUR_LORS_DE_LA_CREATION: %', v_error_message;
    END;
  ELSE
    -- Si la conversation existe mais est archivée, la réactiver
    IF v_conversation_status = 'archived' THEN
      UPDATE conversations 
      SET status = 'active',
          updated_at = NOW()
      WHERE id = v_conversation_id;
    ELSE
      -- Mettre à jour uniquement la date de dernière activité
      UPDATE conversations 
      SET updated_at = NOW()
      WHERE id = v_conversation_id;
    END IF;
  END IF;
  
  -- Retourner l'ID de la conversation (nouvelle ou existante)
  RETURN v_conversation_id;
  
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
  
  -- Gestion des erreurs spécifiques
  IF v_error_message LIKE '%CLIENT_NOT_FOUND%' THEN
    RAISE EXCEPTION 'Le client spécifié n''existe pas';
  ELSIF v_error_message LIKE '%PROVIDER_NOT_FOUND%' THEN
    RAISE EXCEPTION 'Le prestataire spécifié n''existe pas ou n''est pas un fournisseur valide';
  ELSIF v_error_message LIKE '%ERREUR_LORS_DE_LA_CREATION%' THEN
    RAISE EXCEPTION 'Erreur lors de la création de la conversation: %', COALESCE(SUBSTRING(v_error_message, 30), 'Erreur inconnue');
  ELSE
    -- Pour toutes les autres erreurs inattendues
    RAISE EXCEPTION 'Erreur inattendue: %', v_error_message;
  END IF;
END;
$$;

-- Mettre à jour les commentaires
COMMENT ON FUNCTION public.get_or_create_conversation IS 'Crée ou récupère une conversation entre un client et un prestataire externe';

-- Mettre à jour les politiques RLS si nécessaire
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Users can view their conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- Politique pour permettre aux utilisateurs de voir leurs conversations
CREATE POLICY "Users can view their conversations"
ON public.conversations
FOR SELECT
USING (
  auth.uid() = client_id OR 
  (provider_id IS NOT NULL AND auth.uid() = provider_id)
);

-- Politique pour permettre aux utilisateurs de créer des conversations
CREATE POLICY "Users can create conversations"
ON public.conversations
FOR INSERT
WITH CHECK (
  auth.uid() = client_id
);
