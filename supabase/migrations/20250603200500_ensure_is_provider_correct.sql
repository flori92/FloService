-- Migration to ensure is_provider function is correctly defined and schema cache is reloaded

-- Supprimer l'ancienne fonction is_provider si elle existe (indépendamment du nom du paramètre)
-- Cela garantit que nous pouvons la recréer avec le nom de paramètre correct 'user_id'.
DROP FUNCTION IF EXISTS public.is_provider(UUID);

-- Création de la fonction is_provider avec le paramètre user_id
CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID) -- Assurez-vous que le nom du paramètre est user_id
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider_status BOOLEAN;
BEGIN
  SELECT p.is_provider INTO is_provider_status
  FROM public.profiles p
  WHERE p.id = user_id; -- Utilisation de user_id ici

  RETURN COALESCE(is_provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    -- Log l'erreur côté serveur pour le débogage sans interrompre le flux pour l'utilisateur final
    RAISE WARNING 'Erreur dans la fonction is_provider pour user_id %: %', user_id, SQLERRM;
    RETURN false; -- Retourne false en cas d'erreur, comme avant
END;
$$;

COMMENT ON FUNCTION public.is_provider(UUID) IS 'Vérifie si un utilisateur est un prestataire de services (paramètre user_id). Version corrigée.';

GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO anon, authenticated;

-- Notifier PostgREST pour recharger le schéma. Essentiel après des modifications de fonction.
NOTIFY pgrst, 'reload schema';
