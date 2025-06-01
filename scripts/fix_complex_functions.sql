-- Script de correction manuelle pour les fonctions avec paramètres par défaut
-- Créé le 01/06/2025

-- 1. Fonction safe_message_count
CREATE OR REPLACE FUNCTION public.safe_message_count(user_id uuid DEFAULT auth.uid())
RETURNS INTEGER AS $$
DECLARE
  message_count INTEGER;
BEGIN
  SET search_path = public;
  
  SELECT COUNT(*)
  INTO message_count
  FROM messages
  WHERE recipient_id = user_id
  AND read = FALSE;
  
  RETURN message_count;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 2. Fonction find_nearby_providers
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  lat double precision,
  lng double precision,
  radius_km double precision DEFAULT 10,
  search_category_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(
  id uuid,
  full_name text,
  business_name text,
  distance_km double precision
) AS $$
BEGIN
  SET search_path = public;
  
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.business_name,
    (
      6371 * acos(
        cos(radians(lat)) * cos(radians(p.latitude)) *
        cos(radians(p.longitude) - radians(lng)) +
        sin(radians(lat)) * sin(radians(p.latitude))
      )
    ) AS distance_km
  FROM profiles p
  JOIN provider_profiles pp ON p.id = pp.id
  WHERE p.is_provider = TRUE
  AND p.is_active = TRUE
  AND (
    search_category_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM provider_categories pc
      WHERE pc.provider_id = p.id
      AND pc.category_id = search_category_id
    )
  )
  AND (
    6371 * acos(
      cos(radians(lat)) * cos(radians(p.latitude)) *
      cos(radians(p.longitude) - radians(lng)) +
      sin(radians(lat)) * sin(radians(p.latitude))
    )
  ) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 3. Fonction get_available_slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_provider_id uuid,
  p_date date,
  p_duration_minutes integer DEFAULT 60,
  p_time_slot_interval integer DEFAULT 30
)
RETURNS TABLE(
  start_time timestamp with time zone,
  end_time timestamp with time zone
) AS $$
DECLARE
  v_start_time timestamp with time zone;
  v_end_time timestamp with time zone;
  v_slot_start timestamp with time zone;
  v_slot_end timestamp with time zone;
  v_booking record;
BEGIN
  SET search_path = public;
  
  -- Récupérer les heures de disponibilité du prestataire pour le jour donné
  SELECT
    (p_date + start_time)::timestamp with time zone AS day_start,
    (p_date + end_time)::timestamp with time zone AS day_end
  INTO v_start_time, v_end_time
  FROM provider_availability
  WHERE provider_id = p_provider_id
  AND day_of_week = EXTRACT(DOW FROM p_date)
  AND is_available = TRUE
  LIMIT 1;
  
  -- Si aucune disponibilité trouvée pour ce jour, retourner un ensemble vide
  IF v_start_time IS NULL THEN
    RETURN;
  END IF;
  
  -- Générer les créneaux horaires
  v_slot_start := v_start_time;
  
  WHILE v_slot_start + (p_duration_minutes || ' minutes')::interval <= v_end_time LOOP
    v_slot_end := v_slot_start + (p_duration_minutes || ' minutes')::interval;
    
    -- Vérifier si le créneau est disponible (pas de réservation existante)
    IF NOT EXISTS (
      SELECT 1
      FROM bookings
      WHERE provider_id = p_provider_id
      AND status NOT IN ('cancelled', 'rejected')
      AND (
        (start_time <= v_slot_start AND end_time > v_slot_start)
        OR (start_time < v_slot_end AND end_time >= v_slot_end)
        OR (start_time >= v_slot_start AND end_time <= v_slot_end)
      )
    ) THEN
      -- Retourner le créneau disponible
      start_time := v_slot_start;
      end_time := v_slot_end;
      RETURN NEXT;
    END IF;
    
    -- Passer au créneau suivant
    v_slot_start := v_slot_start + (p_time_slot_interval || ' minutes')::interval;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- 4. Fonction get_provider_availability_slots
CREATE OR REPLACE FUNCTION public.get_provider_availability_slots(
  p_provider_id uuid,
  p_start_date date,
  p_end_date date DEFAULT NULL::date,
  p_service_duration_minutes integer DEFAULT 60,
  p_time_slot_interval_minutes integer DEFAULT 30
)
RETURNS TABLE(
  slot_start_time timestamp with time zone,
  slot_end_time timestamp with time zone
) AS $$
DECLARE
  v_current_date date;
  v_end_date date;
BEGIN
  SET search_path = public;
  
  -- Si p_end_date est NULL, utiliser p_start_date + 30 jours
  v_end_date := COALESCE(p_end_date, p_start_date + INTERVAL '30 days');
  
  -- Limiter à 90 jours maximum
  IF v_end_date > p_start_date + INTERVAL '90 days' THEN
    v_end_date := p_start_date + INTERVAL '90 days';
  END IF;
  
  -- Parcourir chaque jour dans la plage de dates
  v_current_date := p_start_date;
  
  WHILE v_current_date <= v_end_date LOOP
    -- Récupérer les créneaux disponibles pour ce jour
    RETURN QUERY
    SELECT
      gs.start_time,
      gs.end_time
    FROM get_available_slots(
      p_provider_id,
      v_current_date,
      p_service_duration_minutes,
      p_time_slot_interval_minutes
    ) gs;
    
    -- Passer au jour suivant
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;
