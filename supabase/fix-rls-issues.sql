-- Script pour corriger les 169 issues RLS dans Supabase
-- À exécuter dans le SQL Editor de Supabase

-- ============================================
-- 1. ACTIVER RLS SUR LES TABLES PUBLIQUES
-- ============================================

-- Table externals
ALTER TABLE public.externals ENABLE ROW LEVEL SECURITY;

-- Table provider_applications  
ALTER TABLE public.provider_applications ENABLE ROW LEVEL SECURITY;

-- Note: spatial_ref_sys est une table système PostGIS, ne pas activer RLS dessus
-- ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY; -- NE PAS FAIRE

-- ============================================
-- 2. POLITIQUES RLS POUR TABLE EXTERNALS
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Lecture publique des externals" ON public.externals;
DROP POLICY IF EXISTS "Admins peuvent gérer les externals" ON public.externals;

-- Politique de lecture publique
CREATE POLICY "Lecture publique des externals"
ON public.externals
FOR SELECT
USING (true);

-- Politique pour les admins (insert, update, delete)
CREATE POLICY "Admins peuvent gérer les externals"
ON public.externals
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================
-- 3. POLITIQUES RLS POUR TABLE PROVIDER_APPLICATIONS
-- ============================================

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Utilisateurs peuvent voir leurs propres candidatures" ON public.provider_applications;
DROP POLICY IF EXISTS "Utilisateurs peuvent créer des candidatures" ON public.provider_applications;
DROP POLICY IF EXISTS "Utilisateurs peuvent modifier leurs candidatures" ON public.provider_applications;
DROP POLICY IF EXISTS "Admins peuvent gérer toutes les candidatures" ON public.provider_applications;

-- Politique de lecture : voir ses propres candidatures
CREATE POLICY "Utilisateurs peuvent voir leurs propres candidatures"
ON public.provider_applications
FOR SELECT
USING (
  auth.uid() = user_id
  OR
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- Politique d'insertion : créer une candidature
CREATE POLICY "Utilisateurs peuvent créer des candidatures"
ON public.provider_applications
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Politique de mise à jour : modifier ses propres candidatures
CREATE POLICY "Utilisateurs peuvent modifier leurs candidatures"
ON public.provider_applications
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Politique pour les admins
CREATE POLICY "Admins peuvent gérer toutes les candidatures"
ON public.provider_applications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
  )
);

-- ============================================
-- 4. VÉRIFICATION DES POLITIQUES EXISTANTES
-- ============================================

-- Vérifier toutes les tables sans RLS activé
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
AND tablename NOT IN (
  'spatial_ref_sys',  -- Table système PostGIS
  'geography_columns', -- Table système PostGIS
  'geometry_columns',  -- Table système PostGIS
  'schema_migrations'  -- Table de migrations
)
ORDER BY tablename;

-- Vérifier les politiques actives
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 5. ACTIVER RLS SUR AUTRES TABLES SENSIBLES
-- ============================================

-- Vérifier et activer RLS sur les tables principales si pas déjà fait
DO $$
DECLARE
  table_name text;
  tables_to_secure text[] := ARRAY[
    'profiles',
    'provider_profiles',
    'services',
    'bookings',
    'messages',
    'conversations',
    'reviews',
    'notifications',
    'payments',
    'invoices',
    'categories',
    'skills'
  ];
BEGIN
  FOREACH table_name IN ARRAY tables_to_secure
  LOOP
    -- Vérifier si la table existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      -- Activer RLS si pas déjà activé
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      RAISE NOTICE 'RLS activé sur table: %', table_name;
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 6. RAPPORT FINAL
-- ============================================

SELECT 
  '✅ RLS Configuration Summary' as report,
  COUNT(*) FILTER (WHERE rowsecurity = true) as tables_with_rls,
  COUNT(*) FILTER (WHERE rowsecurity = false) as tables_without_rls,
  COUNT(*) as total_tables
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT LIKE 'pg_%'
AND tablename NOT IN ('spatial_ref_sys', 'geography_columns', 'geometry_columns');

-- Afficher les tables qui nécessitent encore attention
SELECT 
  '⚠️ Tables sans RLS (hors système)' as warning,
  tablename
FROM pg_tables
WHERE schemaname = 'public'
AND rowsecurity = false
AND tablename NOT IN (
  'spatial_ref_sys',
  'geography_columns',
  'geometry_columns',
  'schema_migrations'
)
ORDER BY tablename;

RAISE NOTICE '✅ Script de correction RLS terminé !';
