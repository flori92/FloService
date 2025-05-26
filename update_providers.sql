-- Créer le type pour le statut des prestataires
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_status') THEN
    CREATE TYPE provider_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
  END IF;
END $$;

-- Ajouter les champs manquants à la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status provider_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS languages text[],
ADD COLUMN IF NOT EXISTS response_time_hours integer,
ADD COLUMN IF NOT EXISTS rating_average numeric(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count integer DEFAULT 0;

-- Créer ou remplacer la vue pour les profils de prestataires (sans le numéro de téléphone)
CREATE OR REPLACE VIEW public.provider_profiles AS
SELECT 
  p.id,
  p.full_name,
  p.business_name,
  p.avatar_url,
  p.bio,
  p.website,
  p.languages,
  p.rating_average,
  p.review_count,
  p.response_time_hours,
  p.status,
  jsonb_agg(DISTINCT jsonb_build_object(
    'id', s.id,
    'title', s.title,
    'description', s.description,
    'price', s.price
  )) FILTER (WHERE s.id IS NOT NULL) AS services,
  jsonb_agg(DISTINCT jsonb_build_object(
    'day_of_week', pa.day_of_week,
    'start_time', pa.start_time,
    'end_time', pa.end_time
  )) FILTER (WHERE pa.id IS NOT NULL) AS availability
FROM profiles p
LEFT JOIN services s ON p.id = s.provider_id
LEFT JOIN provider_availability pa ON p.id = pa.provider_id
WHERE p.status = 'approved'
GROUP BY p.id;

-- Fonction pour calculer la note moyenne
CREATE OR REPLACE FUNCTION update_provider_rating(provider_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles p
  SET 
    rating_average = COALESCE((
      SELECT AVG(rating) 
      FROM reviews 
      WHERE provider_id = provider_uuid
    ), 0),
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE provider_id = provider_uuid
    )
  WHERE id = provider_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le déclencheur s'il existe déjà
DROP TRIGGER IF EXISTS update_provider_rating_trigger ON reviews;

-- Fonction du déclencheur
CREATE OR REPLACE FUNCTION update_provider_rating_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM update_provider_rating(OLD.provider_id);
  ELSE
    PERFORM update_provider_rating(NEW.provider_id);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Créer le déclencheur
CREATE TRIGGER update_provider_rating_trigger
AFTER INSERT OR UPDATE OR DELETE ON reviews
FOR EACH ROW
EXECUTE FUNCTION update_provider_rating_trigger();

-- Mettre à jour les politiques de sécurité pour la table profiles
-- Politique pour permettre aux administrateurs de mettre à jour les statuts
CREATE POLICY IF NOT EXISTS "Admins can update provider status"
ON profiles
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_app_meta_data->>'role' = 'admin'
  )
);

-- Politique pour permettre aux utilisateurs de voir leur propre numéro
CREATE POLICY IF NOT EXISTS "Users can view their own phone number"
ON profiles
FOR SELECT
USING (auth.uid() = id);

-- Mettre à jour la vue user_profiles pour masquer le numéro de téléphone
CREATE OR REPLACE VIEW public.user_profiles AS
SELECT 
  u.id,
  p.full_name,
  p.business_name,
  p.avatar_url,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE u.deleted_at IS NULL;
