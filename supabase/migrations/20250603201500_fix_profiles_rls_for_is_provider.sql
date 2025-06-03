-- Migration pour corriger l'erreur 406 sur GET /profiles

-- S'assurer que RLS est activé sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer une politique potentiellement conflictuelle ou obsolète si elle existe
-- (basé sur les noms que nous aurions pu utiliser précédemment ou des noms communs)
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read their own profiles" ON public.profiles;

-- Politique pour permettre aux utilisateurs authentifiés de lire toutes les colonnes de leur propre profil
CREATE POLICY "Allow authenticated users to read their own profile v2" -- Nouveau nom pour éviter les conflits de cache
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Notifier PostgREST pour recharger le schéma.
NOTIFY pgrst, 'reload schema';
