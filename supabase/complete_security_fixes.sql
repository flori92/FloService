
-- Correction de find_nearby_providers(lat double precision, lng double precision, radius_km double precision, search_category_id uuid)
DROP FUNCTION IF EXISTS public.find_nearby_providers(lat double precision, lng double precision, radius_km double precision, search_category_id uuid);
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  lat double precision, lng double precision, radius_km double precision DEFAULT 10, search_category_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, full_name text, business_name text, distance_km double precision)
LANGUAGE plpgsql
VOLATILE

SECURITY INVOKER
SET search_path = public
AS $body$

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

$body$;


-- Correction de find_nearby_providers(p_latitude double precision, p_longitude double precision, p_radius_km integer, p_category_ids uuid[], p_search_query text, p_min_rating numeric, p_max_price numeric, p_availability_start timestamp with time zone, p_availability_end timestamp with time zone, p_service_duration_minutes integer, p_sort_by text, p_limit integer, p_offset integer)
DROP FUNCTION IF EXISTS public.find_nearby_providers(p_latitude double precision, p_longitude double precision, p_radius_km integer, p_category_ids uuid[], p_search_query text, p_min_rating numeric, p_max_price numeric, p_availability_start timestamp with time zone, p_availability_end timestamp with time zone, p_service_duration_minutes integer, p_sort_by text, p_limit integer, p_offset integer);
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  p_latitude double precision, p_longitude double precision, p_radius_km integer DEFAULT 10, p_category_ids uuid[] DEFAULT NULL::uuid[], p_search_query text DEFAULT NULL::text, p_min_rating numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric, p_availability_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_availability_end timestamp with time zone DEFAULT NULL::timestamp with time zone, p_service_duration_minutes integer DEFAULT 60, p_sort_by text DEFAULT 'distance'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS TABLE(id uuid, full_name text, business_name text, avatar_url text, bio text, rating_average numeric, review_count integer, response_time_hours integer, distance_km double precision, services jsonb, availability jsonb, location geography)
LANGUAGE plpgsql
VOLATILE

SECURITY INVOKER
SET search_path = public
AS $body$

DECLARE
    v_point GEOGRAPHY;
    v_search_tsquery TSQUERY;
BEGIN
    IF p_latitude IS NOT NULL AND p_longitude IS NOT NULL THEN
        v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY;
    END IF;

    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        v_search_tsquery := websearch_to_tsquery('french', p_search_query);
    END IF;

    RETURN QUERY
    WITH provider_services_filtered AS (
        SELECT 
            p.id AS provider_id,
            jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'title', s.title,
                    'description', s.description,
                    'price', s.price,
                    'duration_minutes', s.duration_minutes,
                    'category_id', s.category_id,
                    'category_name', sc.name
                )
                ORDER BY s.price
            ) AS services_data,
            MIN(s.price) as min_service_price, -- Pour le tri par prix
            MAX(s.price) as max_service_price  -- Pour le tri par prix
        FROM profiles p
        JOIN services s ON p.id = s.provider_id
        JOIN service_categories sc ON s.category_id = sc.id
        WHERE p.role = 'provider' 
        AND p.status = 'approved'
        AND (p_category_ids IS NULL OR s.category_id = ANY(p_category_ids))
        AND (p_max_price IS NULL OR s.price <= p_max_price)
        GROUP BY p.id
    )
    SELECT 
        p.id,
        p.full_name,
        p.business_name,
        p.avatar_url,
        p.bio,
        p.rating_average,
        p.review_count,
        p.response_time_hours,
        CASE WHEN v_point IS NOT NULL THEN ST_Distance(v_point, p.location) / 1000 ELSE NULL END AS distance_km,
        COALESCE(psf.services_data, '[]'::jsonb) AS services,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'day_of_week', pa.day_of_week,
                    'start_time', pa.start_time,
                    'end_time', pa.end_time,
                    'is_available', pa.is_available
                )
                ORDER BY pa.day_of_week, pa.start_time
            )
            FROM provider_availability pa
            WHERE pa.provider_id = p.id
        ) AS availability,
        p.location
    FROM profiles p
    JOIN provider_services_filtered psf ON p.id = psf.provider_id -- Assure que le prestataire a des services correspondants
    WHERE p.role = 'provider'
    AND p.status = 'approved'
    AND (v_point IS NULL OR ST_DWithin(v_point, p.location, p_radius_km * 1000))
    AND (p_min_rating IS NULL OR p.rating_average >= p_min_rating)
    AND (v_search_tsquery IS NULL OR p.search_vector @@ v_search_tsquery)
    AND (
        p_availability_start IS NULL OR 
        p_availability_end IS NULL OR
        check_provider_availability(p.id, p_availability_start, p_service_duration_minutes) -- Utilise la fonction améliorée
    )
    ORDER BY
        CASE WHEN p_sort_by = 'distance' AND v_point IS NOT NULL THEN ST_Distance(v_point, p.location) ELSE NULL END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'rating' THEN p.rating_average ELSE NULL END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'reviews' THEN p.review_count ELSE NULL END DESC NULLS LAST,
        CASE WHEN p_sort_by = 'price_asc' THEN psf.min_service_price ELSE NULL END ASC NULLS LAST,
        CASE WHEN p_sort_by = 'price_desc' THEN psf.max_service_price ELSE NULL END DESC NULLS LAST,
        p.id -- Default sort
    LIMIT p_limit
    OFFSET p_offset;
END;

$body$;


-- Correction de get_available_slots(p_provider_id uuid, p_date date, p_duration_minutes integer, p_time_slot_interval integer)
DROP FUNCTION IF EXISTS public.get_available_slots(p_provider_id uuid, p_date date, p_duration_minutes integer, p_time_slot_interval integer);
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_provider_id uuid, p_date date, p_duration_minutes integer DEFAULT 60, p_time_slot_interval integer DEFAULT 30
)
RETURNS TABLE(start_time timestamp with time zone, end_time timestamp with time zone)
LANGUAGE plpgsql
STABLE

SECURITY INVOKER
SET search_path = public
AS $body$

DECLARE
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_day_of_week INTEGER;
    v_current_slot_start TIMESTAMPTZ;
    v_current_slot_end TIMESTAMPTZ;
    v_slot_interval INTERVAL;
BEGIN
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER % 7;
    v_slot_interval := (p_time_slot_interval * INTERVAL '1 minute');
    
    -- Parcourir les plages horaires disponibles pour ce jour
    FOR v_start_time, v_end_time IN
        SELECT 
            (p_date + pa.start_time) AT TIME ZONE 'UTC',
            LEAST(
                (p_date + pa.end_time) AT TIME ZONE 'UTC',
                (p_date + 1) AT TIME ZONE 'UTC' - INTERVAL '1 second'
            )
        FROM provider_availability pa
        WHERE pa.provider_id = p_provider_id
        AND pa.day_of_week = v_day_of_week
        AND pa.is_available = true
        ORDER BY pa.start_time
    LOOP
        -- Générer des créneaux dans cette plage horaire
        v_current_slot_start := v_start_time;
        v_current_slot_end := v_current_slot_start + (p_duration_minutes * INTERVAL '1 minute');
        
        -- Vérifier chaque créneau
        WHILE v_current_slot_end <= v_end_time LOOP
            -- Vérifier la disponibilité pour ce créneau
            IF check_provider_availability(
                p_provider_id, 
                v_current_slot_start, 
                p_duration_minutes
            ) THEN
                start_time := v_current_slot_start;
                end_time := v_current_slot_end;
                RETURN NEXT;
            END IF;
            
            -- Passer au créneau suivant
            v_current_slot_start := v_current_slot_start + v_slot_interval;
            v_current_slot_end := v_current_slot_end + v_slot_interval;
        END LOOP;
    END LOOP;
    
    RETURN;
END;

$body$;


-- Correction de get_provider_availability_slots(p_provider_id uuid, p_start_date date, p_end_date date, p_service_duration_minutes integer, p_time_slot_interval_minutes integer)
DROP FUNCTION IF EXISTS public.get_provider_availability_slots(p_provider_id uuid, p_start_date date, p_end_date date, p_service_duration_minutes integer, p_time_slot_interval_minutes integer);
CREATE OR REPLACE FUNCTION public.get_provider_availability_slots(
  p_provider_id uuid, p_start_date date, p_end_date date DEFAULT NULL::date, p_service_duration_minutes integer DEFAULT 60, p_time_slot_interval_minutes integer DEFAULT 30
)
RETURNS TABLE(slot_start_time timestamp with time zone, slot_end_time timestamp with time zone)
LANGUAGE plpgsql
STABLE

SECURITY INVOKER
SET search_path = public
AS $body$

DECLARE
    v_current_date DATE;
    v_final_end_date DATE;
    v_day_of_week INTEGER;
    v_availability_start_time TIME;
    v_availability_end_time TIME;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_interval INTERVAL;
BEGIN
    v_final_end_date := COALESCE(p_end_date, p_start_date);
    v_interval := (p_time_slot_interval_minutes * INTERVAL '1 minute');
    v_current_date := p_start_date;

    WHILE v_current_date <= v_final_end_date LOOP
        v_day_of_week := EXTRACT(ISODOW FROM v_current_date)::INTEGER % 7; -- 0 for Sunday, 1 for Monday, etc.

        FOR v_availability_start_time, v_availability_end_time IN
            SELECT pa.start_time, pa.end_time
            FROM provider_availability pa
            WHERE pa.provider_id = p_provider_id
            AND pa.day_of_week = v_day_of_week
            AND pa.is_available = TRUE
            ORDER BY pa.start_time
        LOOP
            v_slot_start := timezone('UTC', v_current_date::TIMESTAMP + v_availability_start_time::INTERVAL);
            
            WHILE v_slot_start + (p_service_duration_minutes * INTERVAL '1 minute') <= timezone('UTC', v_current_date::TIMESTAMP + v_availability_end_time::INTERVAL) LOOP
                v_slot_end := v_slot_start + (p_service_duration_minutes * INTERVAL '1 minute');
                
                IF check_provider_availability(p_provider_id, v_slot_start, p_service_duration_minutes) THEN
                    slot_start_time := v_slot_start;
                    slot_end_time := v_slot_end;
                    RETURN NEXT;
                END IF;
                v_slot_start := v_slot_start + v_interval;
            END LOOP;
        END LOOP;
        v_current_date := v_current_date + INTERVAL '1 day';
    END LOOP;
    RETURN;
END;

$body$;


-- ============================================================
-- INSTRUCTIONS POUR POSTGIS (NÉCESSITE PRIVILÈGES ADMIN)
-- ============================================================
-- Cette opération nécessite une planification et potentiellement l'intervention de l'équipe Supabase
-- car elle peut affecter toutes les données géospatiales de l'application.

-- 1. Approche recommandée par Supabase:
--    Contactez le support Supabase pour qu'ils vous aident à déplacer l'extension PostGIS
--    en toute sécurité, car cette opération peut nécessiter des privilèges administrateur.

-- 2. Alternative (si vous avez les privilèges suffisants):
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- ALTER EXTENSION postgis SET SCHEMA extensions;

-- 3. Si l'approche ci-dessus échoue, la solution complète (avec sauvegarde préalable) serait:
-- BACKUP DATABASE postgres; -- Effectuez une sauvegarde complète
-- DROP EXTENSION postgis CASCADE;
-- CREATE SCHEMA IF NOT EXISTS extensions;
-- SET search_path TO extensions, public;
-- CREATE EXTENSION postgis SCHEMA extensions;
-- SET search_path TO public;

-- 4. Assurez-vous de tester ces modifications dans un environnement de développement avant
--    de les appliquer en production.
-- ============================================================

-- ============================================================
-- PARAMÈTRES D'AUTHENTIFICATION (MANUEL VIA INTERFACE SUPABASE)
-- ============================================================
-- Ces paramètres doivent être configurés manuellement via l'interface Supabase:

-- 1. Connexion à la console Supabase: https://app.supabase.io
-- 2. Sélectionner le projet FloService
-- 3. Aller à Authentication > Settings
-- 4. Configurer:
--    - "Email OTP Expiry time" à moins d'une heure (recommandé: 30 minutes)
--    - Activer "Protect against leaked passwords"
-- ============================================================
