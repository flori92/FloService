-- Création d'une table de mapping pour les identifiants externes
CREATE TABLE IF NOT EXISTS public.external_id_mapping (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  external_id TEXT NOT NULL,
  provider_type TEXT NOT NULL, -- ex: 'telegram', 'whatsapp', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (external_id, provider_type)
);

-- Ajouter les index pour des recherches rapides
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_user_id ON public.external_id_mapping(user_id);
CREATE INDEX IF NOT EXISTS idx_external_id_mapping_external_id ON public.external_id_mapping(external_id);

-- Création d'une fonction pour obtenir l'ID utilisateur à partir d'un ID externe
CREATE OR REPLACE FUNCTION public.get_user_id_from_external_id(
  p_external_id TEXT,
  p_provider_type TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Si le type de fournisseur est spécifié, chercher uniquement pour ce type
  IF p_provider_type IS NOT NULL THEN
    SELECT user_id INTO v_user_id
    FROM public.external_id_mapping
    WHERE external_id = p_external_id
      AND provider_type = p_provider_type
    LIMIT 1;
  ELSE
    -- Sinon, chercher l'ID externe sans se soucier du type de fournisseur
    SELECT user_id INTO v_user_id
    FROM public.external_id_mapping
    WHERE external_id = p_external_id
    LIMIT 1;
  END IF;

  RETURN v_user_id;
END;
$$;

-- Mise à jour de la fonction get_or_create_conversation pour utiliser la nouvelle table de mapping
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
  v_error_message TEXT;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;

  -- Obtenir l'ID du prestataire à partir de l'ID externe
  -- 1. Essayer d'abord la table de mapping (solution préférée)
  v_provider_id := public.get_user_id_from_external_id(p_provider_external_id);
  
  -- 2. Fallback: si l'ID n'est pas trouvé et qu'il s'agit d'un UUID valide, l'utiliser directement
  IF v_provider_id IS NULL AND p_provider_external_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    v_provider_id := p_provider_external_id::UUID;
  END IF;

  -- 3. Dernier recours: essayer de trouver un utilisateur avec cet ID externe dans la colonne id
  IF v_provider_id IS NULL THEN
    BEGIN
      -- Convertir l'ID externe en UUID s'il est dans un format compatible
      SELECT id INTO v_provider_id
      FROM public.profiles
      WHERE id::TEXT = p_provider_external_id
      LIMIT 1;
    EXCEPTION WHEN OTHERS THEN
      -- Ignorer les erreurs de conversion
    END;
  END IF;

  -- Si le prestataire n'est toujours pas trouvé, créer une entrée temporaire dans la table de mapping
  -- Cela permettra de lier l'ID externe à un profil utilisateur ultérieurement
  IF v_provider_id IS NULL THEN
    -- Pour des raisons de démo, nous allons utiliser l'ID du premier utilisateur admin comme fallback
    -- Dans un environnement de production, vous pourriez vouloir gérer cela différemment
    SELECT id INTO v_provider_id
    FROM public.profiles
    WHERE is_admin = true
    LIMIT 1;
    
    IF v_provider_id IS NULL THEN
      RAISE EXCEPTION 'Aucun prestataire disponible pour gérer cette conversation';
    END IF;
    
    -- Enregistrer cet ID externe pour référence future
    INSERT INTO public.external_id_mapping (user_id, external_id, provider_type)
    VALUES (v_provider_id, p_provider_external_id, 'unknown')
    ON CONFLICT (external_id, provider_type) DO NOTHING;
  END IF;

  -- Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND provider_id = v_provider_id
  LIMIT 1;

  -- Si aucune conversation n'existe, en créer une nouvelle
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (
      client_id, 
      provider_id,
      provider_external_id,
      last_message,
      last_message_time,
      created_at,
      updated_at
    ) VALUES (
      p_client_id,
      v_provider_id,
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

-- Ajout de quelques mappings d'exemple pour les IDs Telegram
INSERT INTO public.external_id_mapping (user_id, external_id, provider_type)
SELECT p.id, 'tg-' || (ROW_NUMBER() OVER()), 'telegram'
FROM public.profiles p
WHERE p.status = 'provider'
LIMIT 10
ON CONFLICT (external_id, provider_type) DO NOTHING;

-- Mise à jour des politiques RLS pour la nouvelle table
ALTER TABLE public.external_id_mapping ENABLE ROW LEVEL SECURITY;

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
