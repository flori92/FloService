-- Script de correction des fonctions complexes avec search_path
-- Généré automatiquement le 2025-06-01T09:59:17.813Z

-- ERREUR lors de la recréation de la fonction find_nearby_providers: function name "public.find_nearby_providers" is not unique
-- Définition qui a échoué:
-- CREATE OR REPLACE FUNCTION public.find_nearby_providers(lat double precision, lng double precision, radius_km double precision DEFAULT 10, search_category_id uuid DEFAULT NULL::uuid)
--  RETURNS TABLE(id uuid, full_name text, business_name text, distance_km double precision)
--  LANGUAGE plpgsql
--  SECURITY DEFINER
-- SET search_path = public
-- AS $function$
-- BEGIN
--   RETURN QUERY
--   WITH nearby AS (
--     SELECT 
--       p.id,
--       p.full_name,
--       p.business_name,
--       ST_Distance(
--         ST_MakePoint(lng, lat)::GEOGRAPHY,
--         ST_MakePoint(sa.lng, sa.lat)::GEOGRAPHY
--       ) / 1000 AS distance_km
--     FROM profiles p
--     JOIN service_areas sa ON p.id = sa.provider_id
--     WHERE ST_DWithin(
--       ST_MakePoint(lng, lat)::GEOGRAPHY,
--       ST_MakePoint(sa.lng, sa.lat)::GEOGRAPHY,
--       radius_km * 1000
--     )
--     AND (search_category_id IS NULL OR EXISTS (
--       SELECT 1 FROM provider_skills ps 
--       WHERE ps.provider_id = p.id 
--       AND ps.category_id = search_category_id
--     ))
--   )
--   SELECT * FROM nearby
--   WHERE distance_km <= radius_km
--   ORDER BY distance_km;
-- END;
-- $function$
-- 

-- ÉCHEC également avec ALTER FUNCTION: syntax error at or near "DEFAULT"

-- ERREUR: Impossible de trouver la position pour insérer "SET search_path" dans la fonction get_available_slots

-- ERREUR: Impossible de trouver la position pour insérer "SET search_path" dans la fonction get_provider_availability_slots


-- ============================================================
-- RECOMMANDATIONS POUR POSTGIS (NÉCESSITE PRIVILÈGES ADMIN)
-- ============================================================

-- Cette opération nécessite une planification et potentiellement l'intervention de l'équipe Supabase
-- car elle peut affecter toutes les données géospatiales de l'application.

-- 1. Approche recommandée par Supabase:
--    Contactez le support Supabase pour qu'ils vous aident à déplacer l'extension PostGIS
--    en toute sécurité, car cette opération peut nécessiter des privilèges administrateur.

-- 2. Alternative (si vous avez les privilèges suffisants):
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION postgis SET SCHEMA extensions;

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
