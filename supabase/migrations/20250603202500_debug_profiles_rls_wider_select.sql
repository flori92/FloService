-- Migration pour déboguer l'erreur 406 sur GET /profiles en élargissant temporairement l'accès en lecture

-- S'assurer que RLS est activé sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les politiques SELECT précédentes pour éviter les conflits
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile v2" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read their own profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read all profiles (debug v3)" ON public.profiles; -- Au cas où cette migration serait rejouée


-- Politique temporaire pour permettre à TOUS les utilisateurs authentifiés de lire TOUS les profils
-- ATTENTION: Ceci est à des fins de débogage et devra être restreint pour la production.
CREATE POLICY "Allow authenticated read all profiles (debug v3)"
ON public.profiles
FOR SELECT
TO authenticated
USING (true); -- Permet de lire tous les enregistrements

-- Notifier PostgREST pour recharger le schéma.
NOTIFY pgrst, 'reload schema';
