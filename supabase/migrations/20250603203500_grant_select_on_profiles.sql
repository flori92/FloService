-- Migration pour accorder explicitement SELECT sur public.profiles au rôle authenticated

-- S'assurer que RLS est activé sur la table profiles (réaffirmation, ne devrait pas nuire)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- La politique RLS permissive de débogage de la migration précédente est supposée être toujours en place:
-- CREATE POLICY "Allow authenticated read all profiles (debug v3)"
-- ON public.profiles FOR SELECT TO authenticated USING (true);
-- Si elle n'est pas là, cette migration seule ne suffira pas si RLS bloque.

-- Accorder explicitement le privilège SELECT sur la table profiles au rôle authenticated.
-- Cela devrait couvrir toutes les colonnes, y compris 'id' et 'is_provider'.
GRANT SELECT ON TABLE public.profiles TO authenticated;

-- La tentative précédente d'accorder SELECT sur des colonnes individuelles a échoué car la liste était incorrecte.
-- Le GRANT SELECT sur la table entière (ci-dessus) devrait être suffisant.

-- Notifier PostgREST pour recharger le schéma.
NOTIFY pgrst, 'reload schema';
