-- Migration pour améliorer les profils prestataires
-- Date: 2025-05-27

-- Ajout de colonnes pour les fonctionnalités avancées des profils prestataires
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banner_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_provider BOOLEAN DEFAULT FALSE;

-- Création d'une table pour les éléments du portfolio
CREATE TABLE IF NOT EXISTS portfolio_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_portfolio_items_profile_id ON portfolio_items(profile_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_portfolio_item_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour updated_at
CREATE TRIGGER trigger_portfolio_item_updated_at
BEFORE UPDATE ON portfolio_items
FOR EACH ROW EXECUTE FUNCTION update_portfolio_item_updated_at();

-- Politiques RLS pour les éléments du portfolio
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres éléments de portfolio
CREATE POLICY "Users can view their own portfolio items"
ON portfolio_items
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Les utilisateurs peuvent créer des éléments de portfolio
CREATE POLICY "Users can create portfolio items"
ON portfolio_items
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres éléments de portfolio
CREATE POLICY "Users can update their own portfolio items"
ON portfolio_items
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

-- Les utilisateurs peuvent supprimer leurs propres éléments de portfolio
CREATE POLICY "Users can delete their own portfolio items"
ON portfolio_items
FOR DELETE
TO authenticated
USING (profile_id = auth.uid());

-- Création de la table pour les paramètres utilisateur
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    email_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    sms_notifications BOOLEAN NOT NULL DEFAULT FALSE,
    booking_auto_confirm BOOLEAN NOT NULL DEFAULT FALSE,
    availability_days TEXT[] NOT NULL DEFAULT ARRAY['1', '2', '3', '4', '5'],
    language TEXT NOT NULL DEFAULT 'fr',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_user_settings_profile_id ON user_settings(profile_id);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_user_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour updated_at
CREATE TRIGGER trigger_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW EXECUTE FUNCTION update_user_settings_updated_at();

-- Politiques RLS pour les paramètres utilisateur
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Les utilisateurs peuvent voir leurs propres paramètres
CREATE POLICY "Users can view their own settings"
ON user_settings
FOR SELECT
TO authenticated
USING (profile_id = auth.uid());

-- Les utilisateurs peuvent créer leurs propres paramètres
CREATE POLICY "Users can create their own settings"
ON user_settings
FOR INSERT
TO authenticated
WITH CHECK (profile_id = auth.uid());

-- Les utilisateurs peuvent mettre à jour leurs propres paramètres
CREATE POLICY "Users can update their own settings"
ON user_settings
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid());

-- Mise à jour des profils existants des prestataires
UPDATE profiles
SET is_provider = TRUE
WHERE profiles.id IN (
    SELECT pa.user_id 
    FROM provider_applications pa 
    WHERE pa.status = 'approved'
);

-- Mise à jour de la fonction set_provider_password pour définir is_provider
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
  
  -- Vérifier si l'utilisateur est un prestataire (via les demandes approuvées)
  SELECT EXISTS (
    SELECT 1 FROM provider_applications
    WHERE user_id = p_user_id 
    AND status = 'approved'
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
      is_provider = TRUE,
      updated_at = NOW()
  WHERE id = p_user_id;
  
  RETURN TRUE;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erreur lors de la définition du mot de passe: %', SQLERRM;
END;
$$;
