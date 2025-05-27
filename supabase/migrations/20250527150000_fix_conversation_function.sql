-- Migration pour corriger la fonction get_or_create_conversation
-- Date: 2025-05-27

-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, UUID, UUID);
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, TEXT);

-- Créer la nouvelle version de la fonction
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
      provider_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
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
