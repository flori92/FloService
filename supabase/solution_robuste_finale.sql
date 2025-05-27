-- Étape 1: Créer un utilisateur système si nécessaire pour gérer les IDs externes
DO $$
DECLARE
  v_system_user_id UUID;
BEGIN
  -- Vérifier si un utilisateur système existe déjà
  SELECT id INTO v_system_user_id 
  FROM auth.users 
  WHERE email = 'system@floservice.com'
  LIMIT 1;
  
  -- Si aucun utilisateur système n'existe, en créer un
  IF v_system_user_id IS NULL THEN
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'system@floservice.com',
      crypt('SystemPassword123!', gen_salt('bf')),
      NOW(),
      null,
      null,
      '{"provider":"email","providers":["email"]}',
      '{"name":"Système FloService"}',
      NOW(),
      NOW(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO v_system_user_id;
    
    -- Créer un profil pour cet utilisateur système
    INSERT INTO public.profiles (id, full_name, created_at, updated_at, is_admin)
    VALUES (v_system_user_id, 'Système FloService', NOW(), NOW(), true);
  END IF;
  
  -- Stocker l'ID de l'utilisateur système dans une variable temporaire pour utilisation ultérieure
  PERFORM set_config('vars.system_user_id', v_system_user_id::text, false);
END $$;

-- Étape 2: Modification de la table conversations pour qu'elle n'exige pas un provider_id valide
ALTER TABLE public.conversations
ALTER COLUMN provider_id DROP NOT NULL;

-- Étape 3: Ajout d'une entrée de mapping pour "tg-2" s'il n'existe pas déjà
INSERT INTO public.external_id_mapping (user_id, external_id, provider_type)
VALUES 
  (current_setting('vars.system_user_id')::UUID, 'tg-2', 'telegram')
ON CONFLICT (external_id, provider_type) DO NOTHING;

-- Étape 4: Fonction complètement revue pour gérer les conversations avec des prestataires externes
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
  v_system_user_id UUID;
BEGIN
  -- Vérifier si le client existe
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_client_id) THEN
    RAISE EXCEPTION 'Client non trouvé';
  END IF;
  
  -- Récupérer l'ID utilisateur système pour les prestataires externes
  SELECT id INTO v_system_user_id 
  FROM auth.users 
  WHERE email = 'system@floservice.com'
  LIMIT 1;
  
  IF v_system_user_id IS NULL THEN
    -- Fallback: utiliser le premier admin si l'utilisateur système n'existe pas
    SELECT id INTO v_system_user_id
    FROM profiles
    WHERE is_admin = true
    LIMIT 1;
    
    -- Si toujours pas d'utilisateur, utiliser le client lui-même (dernier recours)
    IF v_system_user_id IS NULL THEN
      v_system_user_id := p_client_id;
    END IF;
  END IF;

  -- Étape 1: Vérifier si l'ID externe existe déjà dans notre table de mapping
  SELECT user_id INTO v_provider_id
  FROM public.external_id_mapping
  WHERE external_id = p_provider_external_id
  LIMIT 1;
  
  -- Si le mapping n'existe pas, on le crée avec l'utilisateur système
  IF v_provider_id IS NULL THEN
    INSERT INTO public.external_id_mapping (user_id, external_id, provider_type)
    VALUES (
      v_system_user_id,
      p_provider_external_id, 
      CASE 
        WHEN p_provider_external_id LIKE 'tg-%' THEN 'telegram'
        WHEN p_provider_external_id LIKE 'wa-%' THEN 'whatsapp'
        ELSE 'unknown'
      END
    )
    RETURNING user_id INTO v_provider_id;
  END IF;

  -- Étape 2: Vérifier si une conversation existe déjà
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE client_id = p_client_id
    AND (
      provider_external_id = p_provider_external_id OR
      provider_id = v_provider_id
    )
  LIMIT 1;
  
  -- Si aucune conversation n'existe, on en crée une nouvelle
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

-- Étape 5: Mise à jour des politiques RLS pour la table conversations
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
      auth.uid() = provider_id
    )';

  EXECUTE 'CREATE POLICY "Users can create conversations"
    ON conversations
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() = client_id
    )';
END $$;
