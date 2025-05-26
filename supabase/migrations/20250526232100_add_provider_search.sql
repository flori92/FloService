-- Migration pour la recherche de prestataires

-- 1. Activer l'extension PostGIS si ce n'est pas déjà fait
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. Ajouter des colonnes de géolocalisation aux profils
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326),
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS postal_code TEXT,
ADD COLUMN IF NOT EXISTS search_vector TSVECTOR;

-- 3. Mettre à jour le vecteur de recherche pour la recherche plein texte
CREATE OR REPLACE FUNCTION update_profiles_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('french', COALESCE(NEW.full_name, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.business_name, '')), 'A') ||
        setweight(to_tsvector('french', COALESCE(NEW.bio, '')), 'B') ||
        setweight(to_tsvector('french', COALESCE(NEW.city, '')), 'C') ||
        setweight(to_tsvector('french', COALESCE((
            SELECT string_agg(c.name, ' ')
            FROM service_categories c
            JOIN provider_services ps ON c.id = ps.category_id
            WHERE ps.provider_id = NEW.id
        ), '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Créer le déclencheur pour mettre à jour le vecteur de recherche
CREATE TRIGGER trigger_profiles_search_vector
BEFORE INSERT OR UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_profiles_search_vector();

-- 5. Créer un index GIN pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_search_vector ON profiles USING GIN(search_vector);

-- 6. Fonction pour trouver les prestataires à proximité
CREATE OR REPLACE FUNCTION find_nearby_providers(
    p_latitude DOUBLE PRECISION,
    p_longitude DOUBLE PRECISION,
    p_radius_km INTEGER DEFAULT 10,
    p_category_id UUID DEFAULT NULL,
    p_search_query TEXT DEFAULT NULL,
    p_min_rating NUMERIC(3,2) DEFAULT NULL,
    p_max_price NUMERIC(10,2) DEFAULT NULL,
    p_availability_start TIMESTAMPTZ DEFAULT NULL,
    p_availability_end TIMESTAMPTZ DEFAULT NULL,
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
    availability JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_point GEOGRAPHY;
    v_earth_radius_km CONSTANT NUMERIC := 6371.0; -- Rayon de la Terre en km
    v_search_tsquery TSQUERY;
BEGIN
    -- Créer un point géographique à partir des coordonnées
    v_point := ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::GEOGRAPHY;
    
    -- Préparer la requête de recherche plein texte si fournie
    IF p_search_query IS NOT NULL AND p_search_query != '' THEN
        v_search_tsquery := websearch_to_tsquery('french', p_search_query);
    END IF;
    
    -- Retourner les prestataires correspondants
    RETURN QUERY
    WITH provider_services AS (
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
                    'category_name', sc.name,
                    'is_available', COALESCE(pa.is_available, true)
                )
                ORDER BY 
                    -- Trier d'abord par catégorie si une catégorie est spécifiée
                    CASE WHEN s.category_id = p_category_id THEN 0 ELSE 1 END,
                    s.price
            ) AS services_data
        FROM profiles p
        LEFT JOIN services s ON p.id = s.provider_id
        LEFT JOIN service_categories sc ON s.category_id = sc.id
        LEFT JOIN provider_availability pa ON p.id = pa.provider_id
        WHERE p.role = 'provider' 
        AND p.status = 'approved'
        AND (p_category_id IS NULL OR s.category_id = p_category_id)
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
        ST_Distance(
            v_point,
            p.location
        ) / 1000 AS distance_km,
        COALESCE(ps.services_data, '[]'::jsonb) AS services,
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'day_of_week', pa.day_of_week,
                    'start_time', pa.start_time,
                    'end_time', pa.end_time,
                    'is_available', pa.is_available
                )
            )
            FROM provider_availability pa
            WHERE pa.provider_id = p.id
        ) AS availability
    FROM profiles p
    LEFT JOIN provider_services ps ON p.id = ps.provider_id
    WHERE p.role = 'provider'
    AND p.status = 'approved'
    -- Filtre par distance si des coordonnées sont fournies
    AND (p_latitude IS NULL OR p_longitude IS NULL OR 
         ST_DWithin(v_point, p.location, p_radius_km * 1000))
    -- Filtre par note minimale
    AND (p_min_rating IS NULL OR p.rating_average >= p_min_rating)
    -- Filtre par recherche plein texte
    AND (v_search_tsquery IS NULL OR p.search_vector @@ v_search_tsquery)
    -- Filtre par disponibilité si des plages horaires sont spécifiées
    AND (
        p_availability_start IS NULL OR 
        p_availability_end IS NULL OR
        EXISTS (
            SELECT 1
            FROM provider_availability pa
            WHERE pa.provider_id = p.id
            AND pa.day_of_week = EXTRACT(ISODOW FROM p_availability_start)::INTEGER % 7
            AND pa.start_time <= p_availability_start::TIME
            AND pa.end_time >= p_availability_end::TIME
            AND pa.is_available = true
            AND NOT EXISTS (
                SELECT 1
                FROM bookings b
                WHERE b.provider_id = p.id
                AND b.status IN ('pending', 'confirmed')
                AND (
                    (p_availability_start >= b.start_time AND p_availability_start < b.end_time) OR
                    (p_availability_end > b.start_time AND p_availability_end <= b.end_time) OR
                    (p_availability_start <= b.start_time AND p_availability_end >= b.end_time)
                )
            )
        )
    )
    ORDER BY 
        -- Trier par distance si des coordonnées sont fournies
        CASE WHEN p_latitude IS NOT NULL AND p_longitude IS NOT NULL 
             THEN ST_Distance(v_point, p.location) 
             ELSE 0 
        END,
        -- Sinon trier par note moyenne (décroissante)
        p.rating_average DESC NULLS LAST,
        -- Puis par nombre d'avis (décroissant)
        p.review_count DESC NULLS LAST
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 7. Fonction pour obtenir les créneaux disponibles d'un prestataire
CREATE OR REPLACE FUNCTION get_provider_availability_slots(
    p_provider_id UUID,
    p_date DATE,
    p_service_duration_minutes INTEGER DEFAULT 60,
    p_time_slot_interval_minutes INTEGER DEFAULT 30
)
RETURNS TABLE (
    start_time TIMESTAMPTZ,
    end_time TIMESTAMPTZ,
    is_available BOOLEAN,
    availability_reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_provider_status TEXT;
    v_day_of_week INTEGER;
    v_slot_interval INTERVAL;
    v_service_duration INTERVAL;
    v_start_time TIMESTAMPTZ;
    v_end_time TIMESTAMPTZ;
    v_slot_start TIMESTAMPTZ;
    v_slot_end TIMESTAMPTZ;
    v_availability RECORD;
    v_is_available BOOLEAN;
    v_reason TEXT;
BEGIN
    -- Vérifier que le prestataire existe et est approuvé
    SELECT status INTO v_provider_status
    FROM profiles
    WHERE id = p_provider_id
    AND role = 'provider';
    
    IF v_provider_status IS NULL THEN
        RAISE EXCEPTION 'Prestataire non trouvé';
    ELSIF v_provider_status != 'approved' THEN
        RAISE EXCEPTION 'Ce prestataire n''est pas approuvé';
    END IF;
    
    -- Convertir les durées en intervalles
    v_slot_interval := (p_time_slot_interval_minutes * INTERVAL '1 minute');
    v_service_duration := (p_service_duration_minutes * INTERVAL '1 minute');
    
    -- Définir la plage horaire pour la journée (par défaut 8h-20h)
    v_start_time := (p_date || ' 08:00:00')::TIMESTAMPTZ;
    v_end_time := (p_date || ' 20:00:00')::TIMESTAMPTZ;
    
    -- Récupérer le jour de la semaine (0=dimanche, 1=lundi, etc.)
    v_day_of_week := EXTRACT(ISODOW FROM p_date)::INTEGER % 7;
    
    -- Récupérer les disponibilités du prestataire pour ce jour
    FOR v_availability IN 
        SELECT * 
        FROM provider_availability 
        WHERE provider_id = p_provider_id 
        AND day_of_week = v_day_of_week
        AND is_available = true
        ORDER BY start_time
    LOOP
        -- Convertir les heures de disponibilité en timestamp avec la date du jour
        v_slot_start := (p_date || ' ' || v_availability.start_time::TEXT)::TIMESTAMPTZ;
        v_slot_end := LEAST(
            (p_date || ' ' || v_availability.end_time::TEXT)::TIMESTAMPTZ,
            v_end_time
        );
        
        -- S'assurer que la plage est valide
        IF v_slot_start >= v_slot_end THEN
            CONTINUE;
        END IF;
        
        -- Générer des créneaux dans la plage de disponibilité
        WHILE v_slot_start + v_service_duration <= v_slot_end LOOP
            -- Vérifier si le créneau est disponible
            SELECT 
                check_provider_availability(
                    p_provider_id,
                    v_slot_start,
                    v_slot_start + v_service_duration,
                    NULL -- Ne pas exclure de réservation spécifique
                )
            INTO v_is_available;
            
            -- Déterminer la raison de la disponibilité
            IF NOT v_is_available THEN
                -- Vérifier s'il y a un conflit avec une réservation existante
                SELECT 
                    CASE 
                        WHEN EXISTS (
                            SELECT 1 
                            FROM bookings 
                            WHERE provider_id = p_provider_id
                            AND status IN ('pending', 'confirmed')
                            AND (
                                (v_slot_start >= start_time AND v_slot_start < end_time) OR
                                (v_slot_start + v_service_duration > start_time AND v_slot_start + v_service_duration <= end_time) OR
                                (v_slot_start <= start_time AND v_slot_start + v_service_duration >= end_time)
                            )
                        ) THEN 'already_booked'
                        ELSE 'not_available'
                    END
                INTO v_reason;
            ELSE
                v_reason := 'available';
            END IF;
            
            -- Retourner le créneau avec son état de disponibilité
            RETURN QUERY
            SELECT 
                v_slot_start,
                v_slot_start + v_service_duration,
                v_is_available,
                v_reason;
            
            -- Passer au créneau suivant
            v_slot_start := v_slot_start + v_slot_interval;
        END LOOP;
    END LOOP;
    
    -- Si aucune disponibilité n'a été trouvée, retourner un ensemble vide
    IF NOT FOUND THEN
        RETURN;
    END IF;
END;
$$;

-- 8. Fonction pour obtenir les statistiques d'un prestataire
CREATE OR REPLACE FUNCTION get_provider_stats(
    p_provider_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stats JSONB;
    v_rating_avg NUMERIC(10,2);
    v_review_count INTEGER;
    v_completed_bookings INTEGER;
    v_response_rate NUMERIC(5,2);
    v_response_time_avg INTERVAL;
    v_categories JSONB;
    v_availability JSONB;
BEGIN
    -- Calculer la note moyenne et le nombre d'avis
    SELECT 
        COALESCE(AVG(r.rating), 0),
        COUNT(r.id)
    INTO 
        v_rating_avg,
        v_review_count
    FROM reviews r
    WHERE r.provider_id = p_provider_id
    AND r.status = 'approved';
    
    -- Compter les réservations terminées
    SELECT COUNT(*)
    INTO v_completed_bookings
    FROM bookings
    WHERE provider_id = p_provider_id
    AND status = 'completed';
    
    -- Calculer le taux de réponse (pourcentage de messages auxquels le prestataire a répondu)
    WITH 
    -- Messages reçus par le prestataire
    received_msgs AS (
        SELECT DISTINCT conversation_id
        FROM messages
        WHERE receiver_id = p_provider_id
    ),
    -- Messages envoyés par le prestataire en réponse
    replied_msgs AS (
        SELECT DISTINCT m.conversation_id
        FROM messages m
        JOIN received_msgs r ON m.conversation_id = r.conversation_id
        WHERE m.sender_id = p_provider_id
    )
    SELECT 
        CASE 
            WHEN COUNT(*) = 0 THEN 100 
            ELSE ROUND(COUNT(r.*) * 100.0 / COUNT(*), 2) 
        END
    INTO v_response_rate
    FROM received_msgs rm
    LEFT JOIN replied_msgs r ON rm.conversation_id = r.conversation_id;
    
    -- Calculer le temps de réponse moyen
    SELECT AVG(m2.created_at - m1.created_at)
    INTO v_response_time_avg
    FROM messages m1
    JOIN messages m2 ON m1.conversation_id = m2.conversation_id
    WHERE m1.receiver_id = p_provider_id
    AND m2.sender_id = p_provider_id
    AND m2.created_at > m1.created_at
    AND NOT EXISTS (
        SELECT 1 
        FROM messages m3 
        WHERE m3.conversation_id = m1.conversation_id
        AND m3.sender_id = p_provider_id
        AND m3.created_at > m1.created_at
        AND m3.created_at < m2.created_at
    );
    
    -- Récupérer les catégories de services proposées
    SELECT jsonb_agg(
        jsonb_build_object(
            'id', sc.id,
            'name', sc.name,
            'service_count', COUNT(s.id)
        )
        ORDER BY COUNT(s.id) DESC
    )
    INTO v_categories
    FROM service_categories sc
    JOIN services s ON sc.id = s.category_id
    WHERE s.provider_id = p_provider_id
    AND s.status = 'active'
    GROUP BY sc.id, sc.name;
    
    -- Récupérer les disponibilités
    SELECT jsonb_agg(
        jsonb_build_object(
            'day_of_week', day_of_week,
            'day_name', (ARRAY['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'])[day_of_week + 1],
            'start_time', start_time,
            'end_time', end_time,
            'is_available', is_available
        )
        ORDER BY day_of_week, start_time
    )
    INTO v_availability
    FROM provider_availability
    WHERE provider_id = p_provider_id;
    
    -- Construire l'objet de résultat
    v_stats := jsonb_build_object(
        'rating', jsonb_build_object(
            'average', ROUND(v_rating_avg, 2),
            'count', v_review_count,
            'distribution', (
                SELECT jsonb_object_agg(
                    rating::TEXT, 
                    COUNT(*) * 100 / NULLIF(v_review_count, 0)
                )
                FROM reviews
                WHERE provider_id = p_provider_id
                AND status = 'approved'
                GROUP BY rating
            )
        ),
        'bookings', jsonb_build_object(
            'completed', v_completed_bookings,
            'cancelled', (
                SELECT COUNT(*)
                FROM bookings
                WHERE provider_id = p_provider_id
                AND status = 'cancelled'
            ),
            'upcoming', (
                SELECT COUNT(*)
                FROM bookings
                WHERE provider_id = p_provider_id
                AND status = 'confirmed'
                AND start_time > NOW()
            )
        ),
        'response', jsonb_build_object(
            'rate', v_response_rate,
            'time_average_seconds', EXTRACT(EPOCH FROM COALESCE(v_response_time_avg, '0'::INTERVAL))
        ),
        'categories', COALESCE(v_categories, '[]'::jsonb),
        'availability', COALESCE(v_availability, '[]'::jsonb),
        'last_updated', NOW()
    );
    
    RETURN v_stats;
END;
$$;

-- 9. Donner les permissions d'exécution
GRANT EXECUTE ON FUNCTION find_nearby_providers(
    DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, UUID, 
    TEXT, NUMERIC, NUMERIC, TIMESTAMPTZ, TIMESTAMPTZ, INTEGER, INTEGER
) TO authenticated;

GRANT EXECUTE ON FUNCTION get_provider_availability_slots(UUID, DATE, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_provider_stats(UUID) TO authenticated;

-- 10. Mettre à jour les politiques RLS pour les recherches
-- Autoriser tout utilisateur authentifié à effectuer des recherches
CREATE POLICY "Allow authenticated users to search providers"
ON profiles
FOR SELECT
TO authenticated
USING (true);

-- 11. Créer un index pour accélérer les recherches par géolocalisation
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles USING GIST(location);

-- 12. Mettre à jour le vecteur de recherche pour les profils existants
UPDATE profiles 
SET search_vector = 
    setweight(to_tsvector('french', COALESCE(full_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(business_name, '')), 'A') ||
    setweight(to_tsvector('french', COALESCE(bio, '')), 'B') ||
    setweight(to_tsvector('french', COALESCE(city, '')), 'C')
WHERE role = 'provider';
