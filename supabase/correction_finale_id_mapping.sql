-- Ajout de la colonne metadata si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'external_id_mapping'
    AND column_name = 'metadata'
  ) THEN
    ALTER TABLE public.external_id_mapping 
    ADD COLUMN metadata JSONB DEFAULT '{}';
  END IF;
END $$;

-- Modification de la table conversations pour qu'elle n'exige pas un provider_id valide
ALTER TABLE public.conversations
ALTER COLUMN provider_id DROP NOT NULL;

-- Ajout d'une entrée de mapping pour "tg-2" s'il n'existe pas déjà
INSERT INTO public.external_id_mapping (external_id, provider_type)
VALUES 
  ('tg-2', 'telegram')
ON CONFLICT (external_id, provider_type) DO NOTHING;

-- Fonction complètement revue pour gérer les conversations avec des prestataires externes
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

-- Mise à jour des politiques RLS pour la table conversations
DO $$
BEGIN
  -- Supprimer les politiques existantes
  DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
  
  -- Créer les nouvelles politiques
  EXECUTE 'CREATE POLICY "Users can view their conversations"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = client_id OR
      auth.uid() = provider_id OR
      provider_id IS NULL  -- Pour permettre la visualisation des conversations avec des prestataires externes
    )';

  EXECUTE 'CREATE POLICY "Users can create conversations"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = client_id
    )';
END $$;
