-- Migration pour ajouter la fonction de définition du mot de passe prestataire
-- Date: 2025-05-27

-- Fonction pour définir le mot de passe du prestataire
CREATE OR REPLACE FUNCTION public.set_provider_password(
  p_user_id UUID,
  p_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_exists BOOLEAN;
  v_is_provider BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe
  SELECT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = p_user_id
  ) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RAISE EXCEPTION 'Utilisateur non trouvé';
  END IF;
  
  -- Vérifier si l'utilisateur est un prestataire
  SELECT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = p_user_id 
    AND role = 'provider'
  ) INTO v_is_provider;
  
  IF NOT v_is_provider THEN
    RAISE EXCEPTION 'L''utilisateur n''est pas un prestataire';
  END IF;
  
  -- Vérifier que le mot de passe respecte les critères de sécurité
  IF length(p_password) < 8 THEN
    RAISE EXCEPTION 'Le mot de passe doit contenir au moins 8 caractères';
  END IF;
  
  -- Mettre à jour le mot de passe
  UPDATE auth.users
  SET encrypted_password = crypt(p_password, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;
  
  -- Mettre à jour le statut du profil pour indiquer que l'inscription est complète
  UPDATE profiles
  SET registration_completed = TRUE,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erreur lors de la définition du mot de passe: %', SQLERRM;
END;
$$;

-- Ajouter des commentaires à la fonction
COMMENT ON FUNCTION public.set_provider_password IS 'Définit le mot de passe d''un prestataire après validation biométrique';

-- Ajouter la colonne registration_completed à la table profiles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'registration_completed'
  ) THEN
    ALTER TABLE profiles ADD COLUMN registration_completed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Créer une politique RLS pour permettre aux utilisateurs de définir leur mot de passe
GRANT EXECUTE ON FUNCTION public.set_provider_password TO authenticated;
