-- Script pour corriger les alertes de sécurité liées à spatial_ref_sys
-- Créé le 3 juin 2025

-- 1. Supprimer la vue existante avec SECURITY DEFINER
DROP VIEW IF EXISTS public.spatial_ref_sys_secure;
DROP VIEW IF EXISTS extensions.spatial_ref_sys;

-- 2. Créer un schéma dédié pour les extensions si nécessaire
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Activer RLS sur la table spatial_ref_sys (même si c'est une table système)
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;

-- 4. Créer une politique RLS restrictive pour spatial_ref_sys
DROP POLICY IF EXISTS "Lecture restreinte pour spatial_ref_sys" ON public.spatial_ref_sys;
CREATE POLICY "Lecture restreinte pour spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- 5. Créer une vue standard (sans SECURITY DEFINER) dans le schéma extensions
CREATE OR REPLACE VIEW extensions.spatial_ref_sys AS
SELECT * FROM public.spatial_ref_sys;

-- 6. Révoquer les droits d'accès directs à la table originale pour les rôles anon et authenticated
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

-- 7. Accorder des droits sur la vue standard
GRANT SELECT ON extensions.spatial_ref_sys TO anon, authenticated;

-- 8. Vérifier que RLS est activé sur la table
SELECT 
    n.nspname as schema,
    c.relname as table_name,
    CASE WHEN c.relrowsecurity THEN 'enabled' ELSE 'disabled' END as rls_status
FROM 
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relname = 'spatial_ref_sys'
    AND n.nspname = 'public';

-- 9. Vérifier les politiques RLS
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM 
    pg_policies 
WHERE 
    tablename = 'spatial_ref_sys';

-- 10. Vérifier les vues créées
SELECT 
    n.nspname as schema,
    c.relname as view_name,
    pg_get_viewdef(c.oid) as view_definition
FROM 
    pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE 
    c.relkind = 'v'
    AND c.relname = 'spatial_ref_sys';
