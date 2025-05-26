-- Migration pour améliorer la structure de la base de données FloService
-- Date: 2025-05-26

-- 1. Activer les extensions nécessaires
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. Créer les types personnalisés
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_status') THEN
    CREATE TYPE provider_status AS ENUM ('pending', 'approved', 'suspended', 'rejected');
  END IF;
END $$;

-- 3. Créer les tables manquantes

-- Table pour les pièces jointes aux messages
CREATE TABLE IF NOT EXISTS message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des pays
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(2) UNIQUE NOT NULL,
  phone_code VARCHAR(5),
  currency VARCHAR(3),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des villes
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(country_id, name)
);

-- Table des catégories de services
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table des compétences des prestataires
CREATE TABLE IF NOT EXISTS provider_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  years_experience INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(provider_id, category_id)
);

-- Table des préférences de notification
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT true,
  email_frequency VARCHAR(20) DEFAULT 'immediate',
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  booking_reminders BOOLEAN DEFAULT true,
  new_messages BOOLEAN DEFAULT true,
  review_received BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Ajouter les colonnes manquantes aux tables existantes

-- Ajouter des colonnes à la table profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status provider_status DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS bio TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS languages TEXT[],
ADD COLUMN IF NOT EXISTS response_time_hours INTEGER,
ADD COLUMN IF NOT EXISTS rating_average NUMERIC(3,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS review_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS city_id INTEGER REFERENCES cities(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20);

-- 5. Créer les index manquants

-- Pour les recherches de messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at DESC);

-- Pour les recherches géographiques
CREATE INDEX IF NOT EXISTS idx_service_areas_location ON service_areas USING GIST (ST_MakePoint(lng, lat));

-- Pour les recherches de disponibilités
CREATE INDEX IF NOT EXISTS idx_provider_availability_dates ON provider_availability(provider_id, day_of_week, start_time, end_time) 
WHERE is_available = true;

-- 6. Créer les fonctions utiles

-- Fonction de recherche de prestataires à proximité
CREATE OR REPLACE FUNCTION find_nearby_providers(
  lat FLOAT,
  lng FLOAT,
  radius_km FLOAT DEFAULT 10,
  search_category_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  business_name TEXT,
  distance_km FLOAT
) AS $$
BEGIN
  RETURN QUERY
  WITH nearby AS (
    SELECT 
      p.id,
      p.full_name,
      p.business_name,
      ST_Distance(
        ST_MakePoint(lng, lat)::GEOGRAPHY,
        ST_MakePoint(sa.lng, sa.lat)::GEOGRAPHY
      ) / 1000 AS distance_km
    FROM profiles p
    JOIN service_areas sa ON p.id = sa.provider_id
    WHERE ST_DWithin(
      ST_MakePoint(lng, lat)::GEOGRAPHY,
      ST_MakePoint(sa.lng, sa.lat)::GEOGRAPHY,
      radius_km * 1000
    )
    AND (search_category_id IS NULL OR EXISTS (
      SELECT 1 FROM provider_skills ps 
      WHERE ps.provider_id = p.id 
      AND ps.category_id = search_category_id
    ))
  )
  SELECT * FROM nearby
  WHERE distance_km <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier la disponibilité d'un prestataire
CREATE OR REPLACE FUNCTION check_provider_availability(
  provider_id UUID,
  start_time TIMESTAMPTZ,
  duration INTERVAL
) RETURNS BOOLEAN AS $$
DECLARE
  end_time TIMESTAMPTZ;
  day_of_week INTEGER;
  start_time_of_day TIME;
  end_time_of_day TIME;
  is_available BOOLEAN;
BEGIN
  end_time := start_time + duration;
  day_of_week := EXTRACT(DOW FROM start_time)::INTEGER;
  start_time_of_day := start_time::TIME;
  end_time_of_day := end_time::TIME;

  -- Vérifier si le prestataire est disponible à ces heures
  SELECT EXISTS (
    SELECT 1 
    FROM provider_availability pa
    WHERE pa.provider_id = check_provider_availability.provider_id
    AND pa.day_of_week = day_of_week
    AND pa.is_available = true
    AND pa.start_time <= start_time_of_day
    AND pa.end_time >= end_time_of_day
  ) INTO is_available;

  -- Vérifier s'il n'y a pas de rendez-vous en conflit
  IF is_available THEN
    SELECT NOT EXISTS (
      SELECT 1 
      FROM appointments a
      WHERE a.provider_id = check_provider_availability.provider_id
      AND a.status NOT IN ('cancelled', 'rejected')
      AND tsrange(a.start_time, a.end_time, '[]') && 
          tsrange(start_time, end_time, '[]')
    ) INTO is_available;
  END IF;

  RETURN is_available;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- 7. Configurer les politiques de sécurité (RLS)

-- Activer RLS sur les tables sensibles
ALTER TABLE message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Politiques pour les pièces jointes
CREATE POLICY "Users can view their message attachments"
  ON message_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_attachments.message_id
      AND (c.client_id = auth.uid() OR c.provider_id = auth.uid())
    )
  );

-- Politiques pour les compétences
CREATE POLICY "Users can manage their own skills"
  ON provider_skills
  FOR ALL
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

-- Politiques pour les préférences de notification
CREATE POLICY "Users can manage their notification preferences"
  ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. Mettre à jour les vues existantes

-- Vue pour les profils publics (sans informations sensibles)
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
  c.name AS city,
  co.name AS country,
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
LEFT JOIN cities c ON p.city_id = c.id
LEFT JOIN countries co ON c.country_id = co.id
WHERE p.status = 'approved'
GROUP BY p.id, c.name, co.name;

-- 9. Fonction pour mettre à jour automatiquement les horodatages
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Ajouter des déclencheurs pour les horodatages
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN 
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name NOT IN ('spatial_ref_sys')
  LOOP
    BEGIN
      EXECUTE format('CREATE TRIGGER update_%1$s_updated_at
        BEFORE UPDATE ON %1$s
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', 
        t.table_name);
    EXCEPTION WHEN duplicate_object THEN
      -- Le déclencheur existe déjà, on continue
      RAISE NOTICE 'Trigger already exists for %', t.table_name;
    END;
  END LOOP;
END;
$$;

-- 11. Insérer des données de base pour les pays et villes
INSERT INTO countries (name, code, phone_code, currency) VALUES
('Bénin', 'BJ', '+229', 'XOF'),
('Togo', 'TG', '+228', 'XOF'),
('Côte d''Ivoire', 'CI', '+225', 'XOF')
ON CONFLICT (code) DO NOTHING;

-- Insérer des villes pour le Bénin
INSERT INTO cities (country_id, name, lat, lng)
SELECT id, 'Cotonou', 6.3725, 2.3583 FROM countries WHERE code = 'BJ'
UNION ALL
SELECT id, 'Porto-Novo', 6.4969, 2.6289 FROM countries WHERE code = 'BJ'
ON CONFLICT (country_id, name) DO NOTHING;

-- Insérer des villes pour le Togo
INSERT INTO cities (country_id, name, lat, lng)
SELECT id, 'Lomé', 6.1319, 1.2228 FROM countries WHERE code = 'TG'
UNION ALL
SELECT id, 'Kara', 9.5511, 1.1861 FROM countries WHERE code = 'TG'
ON CONFLICT (country_id, name) DO NOTHING;

-- Insérer des villes pour la Côte d'Ivoire
INSERT INTO cities (country_id, name, lat, lng)
SELECT id, 'Abidjan', 5.3363, -4.0278 FROM countries WHERE code = 'CI'
UNION ALL
SELECT id, 'Bouaké', 7.6903, -5.0297 FROM countries WHERE code = 'CI'
ON CONFLICT (country_id, name) DO NOTHING;

-- 12. Créer des catégories de base
INSERT INTO categories (name, description, icon) VALUES
('Plomberie', 'Services de plomberie et réparation de canalisations', 'fa-faucet'),
('Électricité', 'Installation et réparation électrique', 'fa-bolt'),
('Ménage', 'Services de ménage et entretien de la maison', 'fa-broom'),
('Jardinage', 'Entretien des espaces verts et jardinage', 'fa-seedling'),
('Déménagement', 'Services de déménagement et transport', 'fa-truck-moving'),
('Informatique', 'Dépannage et assistance informatique', 'fa-laptop'),
('Cours particuliers', 'Soutien scolaire et cours à domicile', 'fa-graduation-cap'),
('Beauté', 'Services de coiffure et esthétique à domicile', 'fa-spa'),
('Santé', 'Services de soins à domicile', 'fa-heartbeat'),
('Autre', 'Autres services', 'fa-ellipsis-h')
ON CONFLICT (name) DO NOTHING;

-- 13. Créer un rôle pour les administrateurs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
  GRANT admin TO postgres;
END
$$;

-- 14. Donner les permissions nécessaires aux rôles
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role, admin;
GRANT ALL ON ALL TABLES IN SCHEMA public TO admin;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO admin;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO admin;

-- 15. Mettre à jour la politique de traduction pour les administrateurs
DROP POLICY IF EXISTS "Seuls les administrateurs peuvent modifier les traductions" ON translations;
CREATE POLICY "Seuls les administrateurs peuvent modifier les traductions"
ON translations
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.role = 'admin'
  )
);

-- 16. Activer les webhooks pour les mises à jour en temps réel
-- (À configurer dans l'interface Supabase pour les tables critiques)

-- 17. Créer une table pour le suivi des performances
CREATE TABLE IF NOT EXISTS performance_metrics (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  status_code INTEGER NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Créer une vue pour les statistiques d'utilisation
CREATE OR REPLACE VIEW usage_statistics AS
SELECT 
  date_trunc('day', created_at) AS day,
  COUNT(*) AS total_requests,
  AVG(response_time_ms) AS avg_response_time,
  COUNT(DISTINCT user_agent) AS unique_clients
FROM performance_metrics
GROUP BY 1
ORDER BY 1 DESC;

-- 19. Ajouter un commentaire pour documenter la structure
COMMENT ON DATABASE postgres IS 'Base de données principale pour l''application FloService - Plateforme de mise en relation de prestataires de services en Afrique de l''Ouest';

-- 20. Créer une vue pour les statistiques des prestataires
CREATE OR REPLACE VIEW provider_statistics AS
SELECT 
  p.id,
  p.full_name,
  p.business_name,
  p.rating_average,
  p.review_count,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT r.id) AS total_reviews,
  COUNT(DISTINCT s.id) AS total_services,
  p.created_at
FROM profiles p
LEFT JOIN services s ON p.id = s.provider_id
LEFT JOIN bookings b ON s.id = b.service_id
LEFT JOIN reviews r ON p.id = r.provider_id
WHERE p.status = 'approved'
GROUP BY p.id;

-- Fin de la migration
