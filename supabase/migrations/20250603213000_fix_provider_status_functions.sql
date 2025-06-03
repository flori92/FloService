-- Migration: fix_provider_status_functions
-- Description: Corrige et améliore les fonctions liées au statut prestataire
-- Date: 2025-06-03

-- Vérifier si la fonction is_provider existe déjà et la supprimer
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
    WHERE proname = 'is_provider' AND pg_namespace.nspname = 'public'
  ) THEN
    DROP FUNCTION public.is_provider;
  END IF;
END
$$;

-- Recréer la fonction is_provider avec une meilleure gestion d'erreur
-- Cette fonction accepte un paramètre user_id et vérifie si cet utilisateur est prestataire
CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider_status BOOLEAN;
BEGIN
  -- Vérifier que l'ID utilisateur est valide
  IF user_id IS NULL THEN
    RAISE WARNING 'is_provider appelé avec un ID utilisateur NULL';
    RETURN false;
  END IF;

  -- Récupérer le statut is_provider de l'utilisateur spécifié
  SELECT p.is_provider INTO is_provider_status
  FROM public.profiles p
  WHERE p.id = user_id;

  RETURN COALESCE(is_provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans is_provider: %', SQLERRM;
    RETURN false;
END;
$$;

-- Accorder les droits d'exécution sur la fonction is_provider
GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO service_role;

-- Créer une nouvelle fonction get_my_provider_status qui utilise auth.uid()
-- Cette fonction ne prend pas de paramètre et utilise toujours l'ID de l'utilisateur authentifié
CREATE OR REPLACE FUNCTION public.get_my_provider_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_status BOOLEAN;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE WARNING 'get_my_provider_status appelé sans authentification';
    RETURN false;
  END IF;

  -- Récupérer le statut is_provider de l'utilisateur authentifié
  SELECT p.is_provider INTO provider_status
  FROM public.profiles p
  WHERE p.id = auth.uid();

  RETURN COALESCE(provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Erreur dans get_my_provider_status: %', SQLERRM;
    RETURN false;
END;
$$;

-- Accorder les droits d'exécution sur la fonction get_my_provider_status
GRANT EXECUTE ON FUNCTION public.get_my_provider_status() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_provider_status() TO service_role;

-- Recharger le schéma PostgREST pour prendre en compte les modifications
NOTIFY pgrst, 'reload schema';
