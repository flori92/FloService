-- Script final pour corriger les alertes de sécurité liées à spatial_ref_sys
-- Créé le 3 juin 2025

-- 1. Supprimer la vue existante avec SECURITY DEFINER si elle existe
DROP VIEW IF EXISTS public.spatial_ref_sys_secure;

-- 2. Créer un schéma dédié pour les extensions si nécessaire
CREATE SCHEMA IF NOT EXISTS postgis_secure;

-- 3. Créer une vue standard (sans SECURITY DEFINER) dans le schéma postgis_secure
CREATE OR REPLACE VIEW postgis_secure.spatial_ref_sys AS
SELECT * FROM public.spatial_ref_sys;

-- 4. Révoquer les droits d'accès à la table originale pour les rôles anon et authenticated
-- Note: Cela peut générer des avertissements si les privilèges n'existent pas déjà
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon, authenticated;

-- 5. Accorder des droits sur la vue sécurisée
GRANT SELECT ON postgis_secure.spatial_ref_sys TO anon, authenticated;

-- 6. Modifier la configuration de Supabase pour exposer le schéma postgis_secure au lieu de public.spatial_ref_sys
-- Note: Cela nécessite une modification manuelle du fichier supabase/config.toml

-- 7. Créer une fonction pour masquer la table spatial_ref_sys dans les résultats de l'API
CREATE OR REPLACE FUNCTION postgis_secure.hide_spatial_ref_sys()
RETURNS event_trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Cette fonction sera déclenchée lors des requêtes introspectives
  -- et pourrait être utilisée pour masquer la table spatial_ref_sys
  -- Note: Cette approche est expérimentale et pourrait ne pas fonctionner dans tous les cas
  NULL;
END;
$$;

-- 8. Vérifier les vues créées
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

-- 9. Ajouter un commentaire explicatif sur la table
COMMENT ON TABLE postgis_secure.spatial_ref_sys IS 'Vue sécurisée de la table système PostGIS spatial_ref_sys. Utilisez cette vue au lieu de la table originale pour éviter les alertes de sécurité.';

-- 10. Instructions pour résoudre complètement l'alerte
DO $$
BEGIN
    RAISE NOTICE '
    INSTRUCTIONS POUR RÉSOUDRE COMPLÈTEMENT LES ALERTES DE SÉCURITÉ:
    
    1. Modifier le fichier supabase/config.toml pour exposer le schéma postgis_secure:
       - Ajouter "postgis_secure" à la liste des schémas exposés
       - Redémarrer le service Supabase
    
    2. Mettre à jour toutes les références à public.spatial_ref_sys dans votre code:
       - Remplacer par postgis_secure.spatial_ref_sys
    
    3. Pour résoudre l''alerte RLS sur public.spatial_ref_sys:
       - Contacter le support Supabase pour demander une exception pour cette table système
       - Ou ajouter cette alerte à une liste d''exceptions dans votre processus de CI/CD
    ';
END $$;
