-- Supprimer la fonction existante si elle existe
DROP FUNCTION IF EXISTS public.get_or_create_conversation(UUID, TEXT);

-- Créer la nouvelle fonction
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
  v_client_profile_id UUID;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Vérifier si une conversation existe déjà avec le provider_external_id
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND provider_external_id = p_provider_external_id
  LIMIT 1;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    -- Créer une nouvelle conversation avec le provider_external_id
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

-- Mettre à jour les politiques RLS pour la table conversations
DO $$
BEGIN
  -- Activer RLS si ce n'est pas déjà fait
  EXECUTE 'ALTER TABLE conversations ENABLE ROW LEVEL SECURITY';

  -- Supprimer les politiques existantes
  DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can view their own conversations" ON conversations;

  -- Créer les nouvelles politiques
  EXECUTE 'CREATE POLICY "Users can view their conversations"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = client_id
    )';

  EXECUTE 'CREATE POLICY "Users can create conversations"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = client_id
    )';
END $$;
