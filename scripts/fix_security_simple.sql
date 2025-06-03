-- Script simplifié pour corriger les problèmes de sécurité Supabase
-- Créé le 3 juin 2025

-- 1. Correction des chemins de recherche mutables pour chaque fonction
-- check_migration_status
ALTER FUNCTION public.check_migration_status() 
SET search_path = public, pg_temp;

-- handle_non_uuid
ALTER FUNCTION public.handle_non_uuid(text) 
SET search_path = public, pg_temp;

-- is_valid_uuid
ALTER FUNCTION public.is_valid_uuid(text) 
SET search_path = public, pg_temp;

-- get_safe_id
ALTER FUNCTION public.get_safe_id(text) 
SET search_path = public, pg_temp;

-- find_nearby_providers
ALTER FUNCTION public.find_nearby_providers(double precision, double precision, integer, uuid) 
SET search_path = public, pg_temp;

-- check_provider_availability
ALTER FUNCTION public.check_provider_availability(uuid, timestamp with time zone, timestamp with time zone) 
SET search_path = public, pg_temp;

-- safe_message_count
ALTER FUNCTION public.safe_message_count(uuid) 
SET search_path = public, pg_temp;

-- get_user_conversations
ALTER FUNCTION public.get_user_conversations(uuid) 
SET search_path = public, pg_temp;

-- is_provider
ALTER FUNCTION public.is_provider(uuid) 
SET search_path = public, pg_temp;

-- update_provider_availability_timestamp
ALTER FUNCTION public.update_provider_availability_timestamp() 
SET search_path = public, pg_temp;

-- get_available_slots
ALTER FUNCTION public.get_available_slots(uuid, date, date, integer) 
SET search_path = public, pg_temp;

-- get_provider_availability_slots
ALTER FUNCTION public.get_provider_availability_slots(uuid, date, date) 
SET search_path = public, pg_temp;

-- 2. Créer un schéma pour les extensions si nécessaire
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Créer une vue sécurisée pour l'extension PostGIS
CREATE OR REPLACE VIEW extensions.spatial_ref_sys AS
SELECT * FROM public.spatial_ref_sys;

-- 4. Révoquer les droits d'accès directs à la table originale pour les rôles anon et authenticated
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

-- 5. Accorder des droits sur la vue sécurisée
GRANT SELECT ON extensions.spatial_ref_sys TO anon, authenticated;

-- 6. Vérifier que les modifications ont été appliquées
SELECT 
    n.nspname AS schema_name,
    p.proname AS function_name,
    pg_get_functiondef(p.oid) AS function_def
FROM 
    pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public' 
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
    );
