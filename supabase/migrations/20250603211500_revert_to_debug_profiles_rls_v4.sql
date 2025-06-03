-- Migration pour revenir TEMPORAIREMENT à une politique RLS de débogage large sur public.profiles

-- S'assurer que RLS est activé sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne politique sécurisée si elle existe
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;

-- Supprimer d'anciennes politiques de débogage au cas où
DROP POLICY IF EXISTS "Allow authenticated read all profiles (debug v3)" ON public.profiles;

-- Créer la politique RLS de débogage large (v4)
CREATE POLICY "Allow authenticated read all profiles (debug v4)" 
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Les privilèges SELECT accordés précédemment sur la table sont toujours nécessaires et devraient persister.
-- GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Notifier PostgREST pour recharger le schéma.
NOTIFY pgrst, 'reload schema';
