-- Migration pour améliorer la recherche de prestataires
-- Date: 2025-05-27

-- 1. Améliorer la fonction find_nearby_providers
DROP FUNCTION IF EXISTS find_nearby_providers(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, UUID, TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION find_nearby_providers(
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius_km INTEGER DEFAULT 10,
    p_category_ids UUID[] DEFAULT NULL, -- Modifié pour accepter un tableau de catégories
    p_search_query TEXT DEFAULT NULL,
    p_min_rating NUMERIC(3,2) DEFAULT NULL,
    p_max_price NUMERIC(10,2) DEFAULT NULL,
    p_availability_start TIMESTAMPTZ DEFAULT NULL,
    p_availability_end TIMESTAMPTZ DEFAULT NULL,
    p_service_duration_minutes INTEGER DEFAULT 60, -- Ajout de la durée du service pour la vérification de dispo
    p_sort_by TEXT DEFAULT 'distance', -- Options: 'distance', 'rating', 'reviews', 'price_asc', 'price_desc'
    p_limit INTEGER DEFAULT 20,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    business_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    rating_average NUMERIC(3,2),
    review_count INTEGER,
    response_time_hours INTEGER,
    distance_km DOUBLE PRECISION,
    services JSONB,
    availability JSONB,
    location GEOGRAPHY(POINT, 4326)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- 2. Améliorer la fonction get_provider_availability_slots
DROP FUNCTION IF EXISTS get_provider_availability_slots(UUID, DATE, INTEGER, INTEGER);
CREATE OR REPLACE FUNCTION get_provider_availability_slots(
    p_provider_id UUID,
    p_start_date DATE,
    p_end_date DATE DEFAULT NULL, -- Permet de chercher sur une plage de dates
    p_service_duration_minutes INTEGER DEFAULT 60,
    p_time_slot_interval_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    slot_start_time TIMESTAMPTZ,
    slot_end_time TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
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
$$;

-- 3. Améliorer la fonction get_provider_stats
DROP FUNCTION IF EXISTS get_provider_stats(UUID);
CREATE OR REPLACE FUNCTION get_provider_stats(p_provider_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
    v_rating_avg NUMERIC;
    v_review_count INTEGER;
    v_completed_bookings BIGINT;
    v_total_bookings BIGINT;
    v_acceptance_rate NUMERIC;
    v_avg_response_time_seconds NUMERIC;
BEGIN
    -- Rating and review stats
    SELECT COALESCE(AVG(r.rating), 0), COUNT(r.id)
    INTO v_rating_avg, v_review_count
    FROM reviews r
    WHERE r.provider_id = p_provider_id AND r.status = 'approved';

    -- Booking stats
    SELECT 
        COUNT(*) FILTER (WHERE status = 'completed'),
        COUNT(*)
    INTO v_completed_bookings, v_total_bookings
    FROM bookings b WHERE b.provider_id = p_provider_id;

    IF v_total_bookings > 0 THEN
        v_acceptance_rate := (COUNT(*) FILTER (WHERE status IN ('confirmed', 'completed')) * 100.0 / v_total_bookings)
                             FROM bookings WHERE provider_id = p_provider_id;
    ELSE
        v_acceptance_rate := 100.0;
    END IF;

    -- Average response time to first message in new conversations (simplified)
    SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (first_response.created_at - first_message.created_at))), 0)
    INTO v_avg_response_time_seconds
    FROM (
        SELECT c.id as conv_id, MIN(m.created_at) as created_at
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.provider_id = p_provider_id AND m.sender_id != p_provider_id
        GROUP BY c.id
    ) first_message
    JOIN (
        SELECT c.id as conv_id, MIN(m.created_at) as created_at
        FROM conversations c
        JOIN messages m ON m.conversation_id = c.id
        WHERE c.provider_id = p_provider_id AND m.sender_id = p_provider_id
        GROUP BY c.id
    ) first_response ON first_message.conv_id = first_response.conv_id
    WHERE first_response.created_at > first_message.created_at;

    v_stats := jsonb_build_object(
        'provider_id', p_provider_id,
        'rating_average', ROUND(v_rating_avg, 2),
        'review_count', v_review_count,
        'completed_bookings', v_completed_bookings,
        'total_bookings', v_total_bookings,
        'acceptance_rate_percent', ROUND(v_acceptance_rate, 2),
        'avg_response_time_seconds', ROUND(v_avg_response_time_seconds, 0),
        'last_updated', NOW()
    );
    RETURN v_stats;
END;
$$;

-- 4. Fonction pour mettre à jour la localisation d'un prestataire (préparation)
-- Cette fonction est une ébauche. L'intégration d'un service de géocodage réel nécessiterait des appels HTTP (pg_net ou autre).
CREATE OR REPLACE FUNCTION geocode_and_update_provider_location(
    p_provider_id UUID,
    p_address TEXT,
    p_city TEXT,
    p_postal_code TEXT,
    p_country_code TEXT -- e.g., 'FR', 'CI'
) RETURNS BOOLEAN AS $$
DECLARE
    v_full_address TEXT;
    v_latitude DOUBLE PRECISION; -- Simulé
    v_longitude DOUBLE PRECISION; -- Simulé
BEGIN
    v_full_address := concat_ws(', ', p_address, p_postal_code, p_city, p_country_code);
    
    -- *** Simulation de géocodage ***
    -- Dans un cas réel, appeler une API de géocodage ici.
    -- Par exemple: SELECT lat, lon INTO v_latitude, v_longitude FROM geocode_via_http(v_full_address);
    -- Pour la simulation, nous allons utiliser des valeurs fixes si l'adresse est spécifique
    IF lower(p_city) = 'abidjan' THEN
        v_latitude := 5.359952;
        v_longitude := -4.008256;
    ELSIF lower(p_city) = 'paris' THEN
        v_latitude := 48.8566;
        v_longitude := 2.3522;
    ELSE
        -- Fallback ou erreur si le géocodage échoue
        RAISE NOTICE 'Géocodage simulé échoué pour %', v_full_address;
        RETURN FALSE;
    END IF;
    
    UPDATE profiles
    SET 
        address = p_address,
        city = p_city,
        postal_code = p_postal_code,
        location = ST_SetSRID(ST_MakePoint(v_longitude, v_latitude), 4326)::GEOGRAPHY,
        updated_at = NOW()
    WHERE id = p_provider_id;
    
    RETURN FOUND;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Erreur pendant geocode_and_update_provider_location: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Mettre à jour les commentaires et vérifier les index
COMMENT ON FUNCTION find_nearby_providers(DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, UUID[], TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, TEXT, INTEGER, INTEGER) IS 'Trouve les prestataires à proximité avec filtres avancés et tri.';
COMMENT ON FUNCTION get_provider_availability_slots IS 'Récupère les créneaux horaires disponibles pour un prestataire sur une période donnée.';
COMMENT ON FUNCTION get_provider_stats IS 'Calcule et retourne diverses statistiques pour un prestataire.';
COMMENT ON FUNCTION geocode_and_update_provider_location IS 'Met à jour la localisation géographique d''un prestataire à partir de son adresse (simulation de géocodage).';

-- S'assurer que les index nécessaires existent (ceux de la migration précédente sont généralement suffisants)
-- CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST(location); -- Déjà créé
-- CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN(search_vector); -- Déjà créé
ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);
CREATE INDEX IF NOT EXISTS idx_services_price ON services(price);

-- Assurer l'existence de la table reviews, du type review_status et des colonnes nécessaires
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
        CREATE TYPE public.review_status AS ENUM ('pending', 'approved', 'rejected', 'archived');
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Assurer que provider_id existe
    rating NUMERIC(2,1) CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    status public.review_status DEFAULT 'pending', -- Assurer que status existe
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS provider_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS status public.review_status DEFAULT 'pending';

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id_status ON reviews(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id_status ON bookings(provider_id, status);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id_created_at ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_provider_id ON conversations(provider_id);

-- Fin de la migration
