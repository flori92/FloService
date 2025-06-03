-- Solution finale pour les alertes de sécurité liées à spatial_ref_sys
-- Créé le 3 juin 2025

-- 1. Supprimer toutes les vues existantes qui pourraient causer des problèmes
DROP VIEW IF EXISTS public.spatial_ref_sys_secure;
DROP VIEW IF EXISTS extensions.spatial_ref_sys;
DROP VIEW IF EXISTS postgis_secure.spatial_ref_sys;

-- 2. Créer un schéma dédié pour isoler la table PostGIS
CREATE SCHEMA IF NOT EXISTS postgis_secure;

-- 3. Créer une vue standard (sans SECURITY DEFINER) dans le schéma postgis_secure
CREATE OR REPLACE VIEW postgis_secure.spatial_ref_sys AS
SELECT * FROM public.spatial_ref_sys;

-- 4. Révoquer tous les droits possibles sur la table originale
DO $$
BEGIN
    BEGIN
        EXECUTE 'REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated, service_role';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Impossible de révoquer les droits: %', SQLERRM;
    END;
END $$;

-- 5. Accorder des droits sur la vue sécurisée
GRANT SELECT ON postgis_secure.spatial_ref_sys TO anon, authenticated, service_role;

-- 6. Ajouter un commentaire explicatif
COMMENT ON VIEW postgis_secure.spatial_ref_sys IS 'Vue sécurisée de la table système PostGIS. Utilisez cette vue au lieu de la table originale.';

-- 7. Vérifier les vues créées
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
