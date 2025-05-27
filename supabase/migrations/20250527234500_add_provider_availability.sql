-- Migration pour ajouter la gestion des disponibilités des prestataires
-- Date: 2025-05-27

-- 1. Créer la table provider_availability si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS public.provider_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Dimanche, 1 = Lundi, etc.
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, day_of_week, start_time, end_time)
);

-- 2. Ajouter des commentaires pour la documentation
COMMENT ON TABLE provider_availability IS 'Table des disponibilités des prestataires par jour de la semaine';
COMMENT ON COLUMN provider_availability.day_of_week IS '0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi';
COMMENT ON COLUMN provider_availability.is_available IS 'Indique si le prestataire est disponible pendant cette plage horaire';

-- 3. Créer un déclencheur pour mettre à jour automatiquement la date de modification
CREATE OR REPLACE FUNCTION update_provider_availability_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_provider_availability_timestamp
BEFORE UPDATE ON provider_availability
FOR EACH ROW EXECUTE FUNCTION update_provider_availability_timestamp();

-- 4. Ajouter des politiques de sécurité RLS
ALTER TABLE provider_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les prestataires peuvent gérer leurs disponibilités"
  ON provider_availability
  FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Tout le monde peut voir les disponibilités"
  ON provider_availability
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 5. Créer une table pour les exceptions de disponibilité (jours spécifiques)
CREATE TABLE IF NOT EXISTS public.provider_availability_exceptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  is_available BOOLEAN DEFAULT false,
  start_time TIME,
  end_time TIME CHECK (end_time > start_time OR (start_time IS NULL AND end_time IS NULL)),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (provider_id, exception_date)
);

-- 6. Ajouter des commentaires pour la documentation
COMMENT ON TABLE provider_availability_exceptions IS 'Table des exceptions de disponibilité pour des jours spécifiques';
COMMENT ON COLUMN provider_availability_exceptions.is_available IS 'Indique si le prestataire est disponible ce jour-là (false = indisponible, true = disponible malgré l''horaire habituel)';
COMMENT ON COLUMN provider_availability_exceptions.reason IS 'Raison de l''exception (congés, formation, etc.)';

-- 7. Créer un déclencheur pour mettre à jour automatiquement la date de modification
CREATE TRIGGER trigger_update_provider_availability_exceptions_timestamp
BEFORE UPDATE ON provider_availability_exceptions
FOR EACH ROW EXECUTE FUNCTION update_provider_availability_timestamp();

-- 8. Ajouter des politiques de sécurité RLS
ALTER TABLE provider_availability_exceptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Les prestataires peuvent gérer leurs exceptions de disponibilité"
  ON provider_availability_exceptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = provider_id)
  WITH CHECK (auth.uid() = provider_id);

CREATE POLICY "Tout le monde peut voir les exceptions de disponibilité"
  ON provider_availability_exceptions
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- 9. Mettre à jour la fonction check_provider_availability pour prendre en compte les exceptions
CREATE OR REPLACE FUNCTION check_provider_availability(
  p_provider_id UUID,
  p_start_time TIMESTAMPTZ,
  p_duration_minutes INTEGER
) RETURNS BOOLEAN AS $$
DECLARE
  v_end_time TIMESTAMPTZ;
  v_is_available BOOLEAN;
  v_day_of_week INTEGER;
  v_date DATE;
  v_start_time TIME;
  v_end_time_of_day TIME;
BEGIN
  -- Calculer l'heure de fin
  v_end_time := p_start_time + (p_duration_minutes * INTERVAL '1 minute');
  
  -- Extraire la date et le jour de la semaine
  v_date := p_start_time::DATE;
  v_day_of_week := EXTRACT(ISODOW FROM p_start_time)::INTEGER % 7;
  v_start_time := p_start_time::TIME;
  v_end_time_of_day := v_end_time::TIME;
  
  -- Vérifier s'il y a une exception pour cette date
  SELECT EXISTS (
    SELECT 1 
    FROM provider_availability_exceptions pae
    WHERE pae.provider_id = p_provider_id
    AND pae.exception_date = v_date
    AND pae.is_available = false
  ) INTO v_is_available;
  
  IF v_is_available THEN
    RETURN FALSE; -- Le prestataire est indisponible ce jour-là
  END IF;
  
  -- Vérifier s'il y a une exception de disponibilité pour cette date
  SELECT EXISTS (
    SELECT 1 
    FROM provider_availability_exceptions pae
    WHERE pae.provider_id = p_provider_id
    AND pae.exception_date = v_date
    AND pae.is_available = true
    AND pae.start_time <= v_start_time
    AND pae.end_time >= v_end_time_of_day
  ) INTO v_is_available;
  
  IF v_is_available THEN
    -- Vérifier les conflits avec d'autres réservations
    RETURN NOT EXISTS (
      SELECT 1 
      FROM bookings b
      WHERE b.provider_id = p_provider_id
      AND b.status IN ('pending', 'confirmed')
      AND (
        (p_start_time >= b.start_time AND p_start_time < COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
        OR 
        (v_end_time > b.start_time AND v_end_time <= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
        OR
        (p_start_time <= b.start_time AND v_end_time >= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
      )
    );
  END IF;
  
  -- Vérifier la disponibilité dans l'horaire normal du prestataire
  SELECT EXISTS (
    SELECT 1 
    FROM provider_availability pa
    WHERE pa.provider_id = p_provider_id
    AND pa.day_of_week = v_day_of_week
    AND pa.start_time <= v_start_time
    AND pa.end_time >= v_end_time_of_day
    AND pa.is_available = true
  ) INTO v_is_available;
  
  IF NOT v_is_available THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier les conflits avec d'autres réservations
  RETURN NOT EXISTS (
    SELECT 1 
    FROM bookings b
    WHERE b.provider_id = p_provider_id
    AND b.status IN ('pending', 'confirmed')
    AND (
      (p_start_time >= b.start_time AND p_start_time < COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
      OR 
      (v_end_time > b.start_time AND v_end_time <= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
      OR
      (p_start_time <= b.start_time AND v_end_time >= COALESCE(b.end_time, b.start_time + (b.service_duration_minutes * INTERVAL '1 minute')))
    )
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- 10. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_day_of_week ON provider_availability(day_of_week);
CREATE INDEX IF NOT EXISTS idx_provider_availability_exceptions_provider_id ON provider_availability_exceptions(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_exceptions_date ON provider_availability_exceptions(exception_date);
