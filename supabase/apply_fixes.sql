-- Script pour appliquer les correctifs manquants

-- 1. Créer la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Mettre à jour la fonction get_or_create_conversation
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(
  p_client_id TEXT,
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
  v_client_uuid UUID;
BEGIN
  -- Vérifier si le client existe via son ID externe si p_client_id n'est pas un UUID
  IF p_client_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    -- C'est un UUID, on vérifie dans auth.users
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id::uuid) THEN
      RAISE EXCEPTION 'Client non trouvé';
    END IF;
    v_client_uuid := p_client_id::uuid;
  ELSE
    -- C'est un ID externe, on vérifie dans profiles
    SELECT user_id INTO v_client_uuid
    FROM public.profiles 
    WHERE provider_id = p_client_id
    LIMIT 1;
    
    IF v_client_uuid IS NULL THEN
      RAISE EXCEPTION 'Client non trouvé avec l''ID externe fourni';
    END IF;
  END IF;

  -- Récupérer l'ID du prestataire depuis la table profiles
  SELECT id INTO v_provider_id 
  FROM public.profiles 
  WHERE provider_id = p_provider_external_id
  LIMIT 1;
  
  -- Si pas trouvé, essayer de trouver par ID utilisateur
  IF v_provider_id IS NULL AND p_provider_external_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    SELECT id INTO v_provider_id 
    FROM public.profiles 
    WHERE user_id = p_provider_external_id::uuid
    LIMIT 1;
  END IF;

  IF v_provider_id IS NULL THEN
    RAISE EXCEPTION 'Prestataire non trouvé';
  END IF;

  -- Récupérer l'ID de profil du client
  SELECT id INTO v_client_profile_id
  FROM public.profiles
  WHERE user_id = v_client_uuid
  LIMIT 1;

  -- Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE (client_id = v_client_uuid OR client_id::text = p_client_id)
    AND (provider_id::text = p_provider_external_id OR provider_external_id = p_provider_external_id)
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
      v_client_uuid,
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

-- 3. Mettre à jour les politiques RLS
DO $$
BEGIN
  -- Activer RLS sur les tables si nécessaire
  EXECUTE 'ALTER TABLE reviews ENABLE ROW LEVEL SECURITY';
  EXECUTE 'ALTER TABLE conversations ENABLE ROW LEVEL SECURITY';

  -- Supprimer les politiques existantes si elles existent
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Users can view approved reviews') THEN
    EXECUTE 'DROP POLICY "Users can view approved reviews" ON reviews';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'reviews' AND policyname = 'Clients can create reviews for completed bookings') THEN
    EXECUTE 'DROP POLICY "Clients can create reviews for completed bookings" ON reviews';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can view their conversations') THEN
    EXECUTE 'DROP POLICY "Users can view their conversations" ON conversations';
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'conversations' AND policyname = 'Users can create conversations') THEN
    EXECUTE 'DROP POLICY "Users can create conversations" ON conversations';
  END IF;

  -- Créer les nouvelles politiques
  EXECUTE 'CREATE POLICY "Users can view approved reviews"
    ON reviews
    FOR SELECT
    TO authenticated
    USING (status = ''approved'')';
  
  EXECUTE 'CREATE POLICY "Clients can create reviews for completed bookings"
    ON reviews
    FOR INSERT
    TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM bookings
        WHERE bookings.client_id = auth.uid()
        AND bookings.provider_id = reviews.provider_id
        AND bookings.status = ''completed''
      )
    )';
  
  EXECUTE 'CREATE POLICY "Users can view their conversations"
    ON conversations
    FOR SELECT
    TO authenticated
    USING (
      auth.uid() = client_id OR 
      auth.uid() = provider_id
    )';
  
  EXECUTE 'CREATE POLICY "Users can create conversations"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = client_id AND
      EXISTS (
        SELECT 1 FROM profiles
        WHERE id = provider_id AND
        status = ''approved''
      )
    )';
END $$;
