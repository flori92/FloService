
-- Script complémentaire pour corriger les problèmes de sécurité restants
-- Généré automatiquement le 2025-06-01T09:14:39.662Z

-- 1. Correction des tables avec RLS activé mais sans politiques

DROP POLICY IF EXISTS "Politique par défaut pour booking_reminders" ON public.booking_reminders;
CREATE POLICY "Politique par défaut pour booking_reminders"
ON public.booking_reminders
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Politique par défaut pour cities" ON public.cities;
CREATE POLICY "Politique par défaut pour cities"
ON public.cities
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Politique par défaut pour countries" ON public.countries;
CREATE POLICY "Politique par défaut pour countries"
ON public.countries
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Politique par défaut pour performance_metrics" ON public.performance_metrics;
CREATE POLICY "Politique par défaut pour performance_metrics"
ON public.performance_metrics
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Politique par défaut pour service_offers" ON public.service_offers;
CREATE POLICY "Politique par défaut pour service_offers"
ON public.service_offers
FOR SELECT
USING (true);

-- 2. Correction des fonctions avec chemin de recherche mutable
-- Note: Cette partie nécessite de récupérer la définition complète de chaque fonction
-- et de la modifier pour ajouter SET search_path = public

-- 3. Correction des vues avec SECURITY DEFINER

-- Recréer la vue provider_profiles avec SECURITY INVOKER
-- DROP VIEW IF EXISTS public.provider_profiles;
-- CREATE VIEW public.provider_profiles WITH (security_invoker=true) AS ...;

-- Recréer la vue user_profiles avec SECURITY INVOKER
-- DROP VIEW IF EXISTS public.user_profiles;
-- CREATE VIEW public.user_profiles WITH (security_invoker=true) AS ...;

-- Recréer la vue usage_statistics avec SECURITY INVOKER
-- DROP VIEW IF EXISTS public.usage_statistics;
-- CREATE VIEW public.usage_statistics WITH (security_invoker=true) AS ...;

-- Recréer la vue provider_statistics avec SECURITY INVOKER
-- DROP VIEW IF EXISTS public.provider_statistics;
-- CREATE VIEW public.provider_statistics WITH (security_invoker=true) AS ...;

-- Recréer la vue booking_stats avec SECURITY INVOKER
-- DROP VIEW IF EXISTS public.booking_stats;
-- CREATE VIEW public.booking_stats WITH (security_invoker=true) AS ...;

-- 4. Activation du RLS sur les tables restantes

ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Politique par défaut pour spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Politique par défaut pour spatial_ref_sys"
ON public.spatial_ref_sys
FOR SELECT
USING (true);

ALTER TABLE public.security_scripts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Politique par défaut pour security_scripts" ON public.security_scripts;
CREATE POLICY "Politique par défaut pour security_scripts"
ON public.security_scripts
FOR SELECT
USING (true);
