-- Migration pour rétablir une politique RLS sécurisée sur public.profiles

-- S'assurer que RLS est activé sur la table profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer l'ancienne politique de débogage si elle existe
DROP POLICY IF EXISTS "Allow authenticated read all profiles (debug v3)" ON public.profiles;
-- Supprimer d'autres anciennes politiques de test au cas où elles traîneraient
DROP POLICY IF EXISTS "Allow authenticated users to read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent lire leur propre profil" ON public.profiles;
DROP POLICY IF EXISTS "Authenticated users can read their own profiles" ON public.profiles;

-- Créer la politique RLS standard et sécurisée : les utilisateurs authentifiés peuvent lire leur propre profil.
CREATE POLICY "Allow authenticated users to read their own profile" 
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Les privilèges SELECT accordés précédemment sur la table sont toujours nécessaires et devraient persister.
-- GRANT SELECT ON TABLE public.profiles TO authenticated;

-- Notifier PostgREST pour recharger le schéma.
NOTIFY pgrst, 'reload schema';

-- Commentaire pour le futur : 
-- S'il est nécessaire que d'autres utilisateurs (par exemple, des administrateurs ou des services)
-- puissent lire certaines informations des profils, des politiques RLS supplémentaires
-- devront être créées avec des conditions spécifiques (par exemple, basées sur un rôle personnalisé).
