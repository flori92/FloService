-- Script pour gérer la table spatial_ref_sys
-- Cette table est une table système PostGIS et nécessite une approche différente

-- 1. Créer une vue qui masque la table originale
CREATE OR REPLACE VIEW public.spatial_ref_sys_secure AS
SELECT * FROM public.spatial_ref_sys;

-- 2. Révoquer les droits d'accès directs à la table originale pour les rôles anon et authenticated
REVOKE SELECT ON TABLE public.spatial_ref_sys FROM anon;
REVOKE SELECT ON TABLE public.spatial_ref_sys FROM authenticated;

-- 3. Accorder des droits sur la vue sécurisée
GRANT SELECT ON public.spatial_ref_sys_secure TO anon;
GRANT SELECT ON public.spatial_ref_sys_secure TO authenticated;

-- 4. Créer une politique RLS sur la vue (si possible)
ALTER VIEW public.spatial_ref_sys_secure OWNER TO postgres;

-- Note: Si cette approche ne fonctionne pas, il faudra contacter le support Supabase
-- car les tables système comme spatial_ref_sys sont gérées différemment.
