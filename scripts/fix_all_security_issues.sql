-- Script pour corriger toutes les alertes de sécurité Supabase
-- Créé le 3 juin 2025

-- 1. Correction des chemins de recherche mutables dans les fonctions
-- Pour chaque fonction, nous allons créer une nouvelle version avec un chemin de recherche fixe

-- check_migration_status
CREATE OR REPLACE FUNCTION public.check_migration_status()
RETURNS TABLE(id integer, name character varying, applied_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    RETURN QUERY SELECT * FROM public.schema_migrations ORDER BY id DESC;
END;
$function$;

-- handle_non_uuid
CREATE OR REPLACE FUNCTION public.handle_non_uuid(input_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    result uuid;
BEGIN
    -- Essayer de convertir directement en UUID
    BEGIN
        result := input_id::uuid;
        RETURN result;
    EXCEPTION WHEN others THEN
        -- Si échec, générer un UUID déterministe basé sur l'entrée
        RETURN md5(input_id)::uuid;
    END;
END;
$function$;

-- is_valid_uuid
CREATE OR REPLACE FUNCTION public.is_valid_uuid(str text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    RETURN str::uuid IS NOT NULL;
EXCEPTION WHEN others THEN
    RETURN false;
END;
$function$;

-- get_safe_id
CREATE OR REPLACE FUNCTION public.get_safe_id(input_id text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    IF public.is_valid_uuid(input_id) THEN
        RETURN input_id::uuid;
    ELSE
        RETURN public.handle_non_uuid(input_id);
    END IF;
END;
$function$;

-- find_nearby_providers
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
    user_lat double precision,
    user_lng double precision,
    max_distance_km integer DEFAULT 10,
    category_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(
    provider_id uuid,
    distance_km double precision,
    provider_name text,
    provider_description text,
    provider_rating numeric,
    provider_photo_url text,
    provider_lat double precision,
    provider_lng double precision,
    category_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS provider_id,
        ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography
        ) / 1000 AS distance_km,
        p.name AS provider_name,
        p.description AS provider_description,
        COALESCE(
            (SELECT AVG(r.rating)::numeric(3,1)
             FROM reviews r
             WHERE r.provider_id = p.id),
            0
        ) AS provider_rating,
        p.photo_url AS provider_photo_url,
        p.latitude AS provider_lat,
        p.longitude AS provider_lng,
        c.name AS category_name
    FROM
        providers p
    JOIN
        categories c ON p.category_id = c.id
    WHERE
        p.status = 'active'
        AND (category_id IS NULL OR p.category_id = category_id)
        AND ST_Distance(
            ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography,
            ST_SetSRID(ST_MakePoint(p.longitude, p.latitude), 4326)::geography
        ) / 1000 <= max_distance_km
    ORDER BY
        distance_km ASC;
END;
$function$;

-- check_provider_availability
CREATE OR REPLACE FUNCTION public.check_provider_availability(
    provider_id uuid,
    start_time timestamp with time zone,
    end_time timestamp with time zone)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    is_available boolean;
BEGIN
    -- Vérifier si le prestataire a des disponibilités qui couvrent la période demandée
    SELECT EXISTS (
        SELECT 1
        FROM provider_availability pa
        WHERE pa.provider_id = check_provider_availability.provider_id
        AND pa.day_of_week = EXTRACT(DOW FROM start_time)
        AND pa.start_time <= start_time::time
        AND pa.end_time >= end_time::time
    ) INTO is_available;
    
    -- Si disponible selon l'horaire, vérifier qu'il n'y a pas de réservation qui chevauche
    IF is_available THEN
        RETURN NOT EXISTS (
            SELECT 1
            FROM bookings b
            WHERE b.provider_id = check_provider_availability.provider_id
            AND b.status IN ('confirmed', 'in_progress')
            AND (
                (b.start_time <= start_time AND b.end_time > start_time) OR
                (b.start_time < end_time AND b.end_time >= end_time) OR
                (b.start_time >= start_time AND b.end_time <= end_time)
            )
        );
    ELSE
        RETURN false;
    END IF;
END;
$function$;

-- safe_message_count
CREATE OR REPLACE FUNCTION public.safe_message_count(conversation_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    count_messages integer;
BEGIN
    SELECT COUNT(*)
    INTO count_messages
    FROM messages
    WHERE messages.conversation_id = safe_message_count.conversation_id;
    
    RETURN count_messages;
END;
$function$;

-- get_user_conversations
CREATE OR REPLACE FUNCTION public.get_user_conversations(user_id uuid)
RETURNS TABLE(
    conversation_id uuid,
    other_user_id uuid,
    other_user_name text,
    other_user_photo text,
    last_message text,
    last_message_time timestamp with time zone,
    unread_count integer,
    is_provider boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
    RETURN QUERY
    WITH user_conversations AS (
        SELECT
            c.id,
            CASE
                WHEN c.user1_id = user_id THEN c.user2_id
                ELSE c.user1_id
            END AS other_user_id
        FROM conversations c
        WHERE c.user1_id = user_id OR c.user2_id = user_id
    ),
    last_messages AS (
        SELECT DISTINCT ON (m.conversation_id)
            m.conversation_id,
            m.content,
            m.created_at,
            COUNT(*) FILTER (WHERE m.read = false AND m.sender_id != user_id) OVER (PARTITION BY m.conversation_id) AS unread
        FROM messages m
        JOIN user_conversations uc ON m.conversation_id = uc.id
        ORDER BY m.conversation_id, m.created_at DESC
    )
    SELECT
        uc.id AS conversation_id,
        uc.other_user_id,
        COALESCE(p.name, u.full_name) AS other_user_name,
        COALESCE(p.photo_url, u.avatar_url) AS other_user_photo,
        lm.content AS last_message,
        lm.created_at AS last_message_time,
        lm.unread AS unread_count,
        CASE WHEN p.id IS NOT NULL THEN true ELSE false END AS is_provider
    FROM user_conversations uc
    JOIN last_messages lm ON uc.id = lm.conversation_id
    LEFT JOIN profiles u ON uc.other_user_id = u.id
    LEFT JOIN providers p ON uc.other_user_id = p.user_id
    ORDER BY lm.created_at DESC;
END;
$function$;

-- is_provider
CREATE OR REPLACE FUNCTION public.is_provider(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    provider_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM providers
        WHERE providers.user_id = is_provider.user_id
        AND providers.status = 'active'
    ) INTO provider_exists;
    
    RETURN provider_exists;
END;
$function$;

-- update_provider_availability_timestamp
CREATE OR REPLACE FUNCTION public.update_provider_availability_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$function$;

-- get_available_slots
CREATE OR REPLACE FUNCTION public.get_available_slots(
    provider_id uuid,
    date_start date,
    date_end date,
    slot_duration_minutes integer DEFAULT 60)
RETURNS TABLE(
    slot_date date,
    slot_start_time time without time zone,
    slot_end_time time without time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    current_date date := date_start;
    day_of_week integer;
    avail_record record;
    slot_start time;
    booking_record record;
    has_conflict boolean;
BEGIN
    -- Pour chaque jour dans la plage de dates
    WHILE current_date <= date_end LOOP
        day_of_week := EXTRACT(DOW FROM current_date);
        
        -- Pour chaque plage de disponibilité du prestataire ce jour de la semaine
        FOR avail_record IN 
            SELECT * FROM provider_availability 
            WHERE provider_availability.provider_id = get_available_slots.provider_id 
            AND provider_availability.day_of_week = day_of_week
        LOOP
            -- Générer des créneaux selon la durée spécifiée
            slot_start := avail_record.start_time;
            WHILE slot_start + (slot_duration_minutes * interval '1 minute') <= avail_record.end_time LOOP
                has_conflict := false;
                
                -- Vérifier les conflits avec les réservations existantes
                FOR booking_record IN 
                    SELECT * FROM bookings 
                    WHERE bookings.provider_id = get_available_slots.provider_id
                    AND bookings.status IN ('confirmed', 'in_progress')
                    AND DATE(bookings.start_time) = current_date
                LOOP
                    IF (slot_start, slot_start + (slot_duration_minutes * interval '1 minute')) OVERLAPS 
                       (booking_record.start_time::time, booking_record.end_time::time) THEN
                        has_conflict := true;
                        EXIT;
                    END IF;
                END LOOP;
                
                -- Si pas de conflit, ajouter le créneau aux résultats
                IF NOT has_conflict THEN
                    slot_date := current_date;
                    slot_start_time := slot_start;
                    slot_end_time := slot_start + (slot_duration_minutes * interval '1 minute');
                    RETURN NEXT;
                END IF;
                
                slot_start := slot_start + (slot_duration_minutes * interval '1 minute');
            END LOOP;
        END LOOP;
        
        current_date := current_date + 1;
    END LOOP;
END;
$function$;

-- get_provider_availability_slots
CREATE OR REPLACE FUNCTION public.get_provider_availability_slots(
    provider_id uuid,
    start_date date,
    end_date date)
RETURNS TABLE(
    day_name text,
    day_date date,
    start_time time without time zone,
    end_time time without time zone,
    is_available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    curr_date date := start_date;
    day_of_week integer;
    day_names text[] := ARRAY['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
BEGIN
    -- Pour chaque jour dans la plage de dates
    WHILE curr_date <= end_date LOOP
        day_of_week := EXTRACT(DOW FROM curr_date);
        
        -- Récupérer les disponibilités du prestataire pour ce jour de la semaine
        FOR start_time, end_time IN 
            SELECT pa.start_time, pa.end_time 
            FROM provider_availability pa
            WHERE pa.provider_id = get_provider_availability_slots.provider_id
            AND pa.day_of_week = day_of_week
        LOOP
            day_name := day_names[day_of_week + 1];
            day_date := curr_date;
            is_available := true;
            
            -- Vérifier s'il y a des réservations qui chevauchent cette plage horaire
            IF EXISTS (
                SELECT 1 FROM bookings b
                WHERE b.provider_id = get_provider_availability_slots.provider_id
                AND DATE(b.start_time) = curr_date
                AND b.status IN ('confirmed', 'in_progress')
                AND (
                    (b.start_time::time <= start_time AND b.end_time::time > start_time) OR
                    (b.start_time::time < end_time AND b.end_time::time >= end_time) OR
                    (b.start_time::time >= start_time AND b.end_time::time <= end_time)
                )
            ) THEN
                is_available := false;
            END IF;
            
            RETURN NEXT;
        END LOOP;
        
        -- Si aucune disponibilité n'est définie pour ce jour, retourner une ligne avec is_available = false
        IF NOT EXISTS (
            SELECT 1 FROM provider_availability pa
            WHERE pa.provider_id = get_provider_availability_slots.provider_id
            AND pa.day_of_week = day_of_week
        ) THEN
            day_name := day_names[day_of_week + 1];
            day_date := curr_date;
            start_time := '09:00:00'::time;
            end_time := '17:00:00'::time;
            is_available := false;
            RETURN NEXT;
        END IF;
        
        curr_date := curr_date + 1;
    END LOOP;
END;
$function$;

-- 2. Déplacer l'extension PostGIS hors du schéma public
-- Créer un nouveau schéma pour les extensions si nécessaire
CREATE SCHEMA IF NOT EXISTS extensions;

-- Essayer de déplacer l'extension PostGIS vers le schéma extensions
DO $$
BEGIN
    -- Vérifier si l'extension est déjà dans le schéma public
    IF EXISTS (
        SELECT 1 FROM pg_extension 
        WHERE extname = 'postgis' 
        AND extnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
    ) THEN
        -- Essayer de déplacer l'extension
        BEGIN
            ALTER EXTENSION postgis SET SCHEMA extensions;
            RAISE NOTICE 'Extension PostGIS déplacée avec succès vers le schéma extensions';
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Impossible de déplacer l''extension PostGIS: %', SQLERRM;
            RAISE NOTICE 'Vous devrez peut-être contacter le support Supabase pour déplacer cette extension système';
        END;
    ELSE
        RAISE NOTICE 'L''extension PostGIS n''est pas dans le schéma public ou n''existe pas';
    END IF;
END $$;

-- 3. Vérifier que toutes les modifications ont été appliquées
DO $$
DECLARE
    func_count INTEGER;
BEGIN
    SELECT COUNT(*)
    INTO func_count
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname IN (
        'check_migration_status',
        'handle_non_uuid',
        'is_valid_uuid',
        'get_safe_id',
        'find_nearby_providers',
        'check_provider_availability',
        'safe_message_count',
        'get_user_conversations',
        'is_provider',
        'update_provider_availability_timestamp',
        'get_available_slots',
        'get_provider_availability_slots'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM pg_proc_info
        WHERE pg_proc_info.oid = p.oid
        AND pg_proc_info.proconfig @> ARRAY['search_path=public, pg_temp']
    );
    
    IF func_count > 0 THEN
        RAISE WARNING 'Il reste % fonctions sans chemin de recherche défini', func_count;
    ELSE
        RAISE NOTICE 'Toutes les fonctions ont maintenant un chemin de recherche défini';
    END IF;
END $$;
