-- Script pour activer RLS sur les tables publiques et définir des politiques d'accès
-- Créé le 3 juin 2025

-- 1. Activation du RLS sur toutes les tables concernées
ALTER TABLE public.participant1_exists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant2_exists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_id_exists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schema_migrations ENABLE ROW LEVEL SECURITY;

-- 2. Définition des politiques pour chaque table

-- Tables de vérification d'existence (probablement utilisées pour des validations)
-- Politique pour participant1_exists : lecture uniquement pour les utilisateurs authentifiés
CREATE POLICY "Lecture authentifiée pour participant1_exists" 
ON public.participant1_exists 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Politique pour participant2_exists : lecture uniquement pour les utilisateurs authentifiés
CREATE POLICY "Lecture authentifiée pour participant2_exists" 
ON public.participant2_exists 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Politique pour client_id_exists : lecture uniquement pour les utilisateurs authentifiés
CREATE POLICY "Lecture authentifiée pour client_id_exists" 
ON public.client_id_exists 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Tables système - accès très restreint
-- spatial_ref_sys : table PostGIS, accès en lecture seule pour les utilisateurs authentifiés
CREATE POLICY "Lecture restreinte pour spatial_ref_sys" 
ON public.spatial_ref_sys 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- schema_migrations : table de migrations, aucun accès via API
CREATE POLICY "Aucun accès à schema_migrations" 
ON public.schema_migrations 
FOR ALL 
USING (false);

-- 3. Vérification des politiques (commenté, à exécuter manuellement pour vérification)
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
