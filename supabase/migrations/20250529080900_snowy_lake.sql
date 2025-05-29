-- Script pour corriger le problème de mapping des IDs externes de prestataires
-- Date: 2025-05-28

-- 1. Créer une table de mapping pour les identifiants externes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.external_id_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),  -- Peut être NULL pour les prestataires externes non encore enregistrés
  external_id TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- ex: 'telegram', 'whatsapp', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',  -- Stockage de métadonnées supplémentaires
  UNIQUE (external_id, provider_type)
);

-- 2. Ajouter les index pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_user_id ON public.external_id_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_external_id ON public.external_id_mapping(external_id);

-- 3. Modifier la table conversations pour qu'elle accepte des provider_id NULL
DO $$
BEGIN
  -- Vérifier si la colonne provider_id existe et est NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'provider_id' 
    AND is_nullable = 'NO'
  ) THEN
    -- Modifier la colonne pour accepter NULL
    ALTER TABLE public.conversations ALTER COLUMN provider_id DROP NOT NULL;
  END IF;
  
  -- Ajouter la colonne provider_external_id si elle n'existe pas
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'conversations' 
    AND column_name = 'provider_external_id'
  ) THEN
    ALTER TABLE public.conversations ADD COLUMN provider_external_id TEXT;
  END IF;
END $$;

-- 4. Ajouter une entrée de mapping pour "tg-2" s'il n'existe pas déjà
INSERT INTO public.external_id_mapping (external_id, provider_type, metadata)
VALUES 
  ('tg-2', 'telegram', '{"display_name": "Eric KOUDJO", "profession": "Menuisier"}')
ON CONFLICT (external_id, provider_type) DO NOTHING;

-- 5. Créer ou remplacer la fonction get_or_create_conversation pour gérer les IDs externes
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
    INSERT INTO public.external_id_mapping (external_id, provider_type, metadata)
    VALUES (
      p_provider_external_id, 
      CASE 
        WHEN p_provider_external_id LIKE 'tg-%' THEN 'telegram'
        WHEN p_provider_external_id LIKE 'wa-%' THEN 'whatsapp'
        ELSE 'unknown'
      END,
      jsonb_build_object('display_name', 'Prestataire ' || p_provider_external_id)
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

-- 6. Mettre à jour les politiques RLS pour la table conversations
DO $$
BEGIN
  -- Activer RLS si ce n'est pas déjà fait
  ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

  -- Supprimer les politiques existantes
  DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
  DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
  
  -- Créer les nouvelles politiques
  CREATE POLICY "Users can view their conversations"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = client_id OR
      auth.uid() = provider_id OR
      provider_id IS NULL  -- Pour permettre la visualisation des conversations avec des prestataires externes
    );

  CREATE POLICY "Users can create conversations"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = client_id
    );
END $$;

-- 7. Créer une fonction pour récupérer les messages d'une conversation
CREATE OR REPLACE FUNCTION public.get_conversation_messages(
  p_conversation_id UUID,
  p_page_size INTEGER DEFAULT 50,
  p_page_number INTEGER DEFAULT 1
)
RETURNS SETOF messages AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  -- Calculer l'offset en fonction de la pagination
  v_offset := (p_page_number - 1) * p_page_size;
  
  RETURN QUERY
  SELECT m.*
  FROM messages m
  WHERE m.conversation_id = p_conversation_id
  ORDER BY m.created_at DESC
  LIMIT p_page_size
  OFFSET v_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Accorder les permissions nécessaires
GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_conversation_messages(UUID, INTEGER, INTEGER) TO authenticated;