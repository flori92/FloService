-- Script SQL manuel pour corriger les fonctions à search_path mutable
-- À exécuter dans la console SQL Supabase
-- Complétez les corps de fonction si besoin (copier/coller depuis la console ou pgAdmin)

-- 1. Correction de find_nearby_providers (1ère surcharge)
DROP FUNCTION IF EXISTS public.find_nearby_providers(lat double precision, lng double precision, radius_km double precision, search_category_id uuid);
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  lat double precision, lng double precision, radius_km double precision DEFAULT 10, search_category_id uuid DEFAULT NULL::uuid
)
RETURNS TABLE(id uuid, full_name text, business_name text, distance_km double precision)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
-- Copiez ici le corps de la fonction depuis la définition existante
BEGIN
  -- ...
END;
$$;

-- 2. Correction de find_nearby_providers (2ème surcharge)
DROP FUNCTION IF EXISTS public.find_nearby_providers(
  p_latitude double precision, p_longitude double precision, p_radius_km integer, p_category_ids uuid[], p_search_query text,
  p_min_rating numeric, p_max_price numeric, p_availability_start timestamp with time zone, p_availability_end timestamp with time zone,
  p_service_duration_minutes integer, p_sort_by text, p_limit integer, p_offset integer
);
CREATE OR REPLACE FUNCTION public.find_nearby_providers(
  p_latitude double precision, p_longitude double precision, p_radius_km integer DEFAULT 10, p_category_ids uuid[] DEFAULT NULL::uuid[],
  p_search_query text DEFAULT NULL::text, p_min_rating numeric DEFAULT NULL::numeric, p_max_price numeric DEFAULT NULL::numeric,
  p_availability_start timestamp with time zone DEFAULT NULL::timestamp with time zone, p_availability_end timestamp with time zone DEFAULT NULL::timestamp with time zone,
  p_service_duration_minutes integer DEFAULT 60, p_sort_by text DEFAULT 'distance'::text, p_limit integer DEFAULT 20, p_offset integer DEFAULT 0
)
RETURNS TABLE(
  id uuid, full_name text, business_name text, avatar_url text, bio text, rating_average numeric, review_count integer, response_time_hours integer, distance_km double precision, services jsonb, availability jsonb, location geography
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
-- Copiez ici le corps de la fonction depuis la définition existante
BEGIN
  -- ...
END;
$$;

-- 3. Correction de get_available_slots
DROP FUNCTION IF EXISTS public.get_available_slots(p_provider_id uuid, p_date date, p_duration_minutes integer, p_time_slot_interval integer);
CREATE OR REPLACE FUNCTION public.get_available_slots(
  p_provider_id uuid, p_date date, p_duration_minutes integer DEFAULT 60, p_time_slot_interval integer DEFAULT 30
)
RETURNS TABLE(start_time timestamp with time zone, end_time timestamp with time zone)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
-- Copiez ici le corps de la fonction depuis la définition existante
BEGIN
  -- ...
END;
$$;

-- 4. Correction de get_provider_availability_slots
DROP FUNCTION IF EXISTS public.get_provider_availability_slots(p_provider_id uuid, p_start_date date, p_end_date date, p_service_duration_minutes integer, p_time_slot_interval_minutes integer);
CREATE OR REPLACE FUNCTION public.get_provider_availability_slots(
  p_provider_id uuid, p_start_date date, p_end_date date DEFAULT NULL::date, p_service_duration_minutes integer DEFAULT 60, p_time_slot_interval_minutes integer DEFAULT 30
)
RETURNS TABLE(slot_start_time timestamp with time zone, slot_end_time timestamp with time zone)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
-- Copiez ici le corps de la fonction depuis la définition existante
BEGIN
  -- ...
END;
$$;

--
-- Pour chaque fonction, copiez le corps exact depuis la console SQL (pgAdmin, DBeaver, ou Supabase) entre les balises $$ ... $$
-- Cela garantit que la logique métier n'est pas perdue.
--
-- Après exécution, vérifiez dans le Security Advisor que les alertes ont disparu.
