-- Script pour corriger la fonction get_provider_status
-- Date: 2025-05-28

-- Supprimer la fonction existante
DROP FUNCTION IF EXISTS public.get_provider_status(UUID);

-- Recréer la fonction avec la définition correcte
CREATE OR REPLACE FUNCTION public.get_provider_status(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(is_provider, FALSE)
    FROM public.profiles
    WHERE id = user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions sur la fonction
GRANT EXECUTE ON FUNCTION public.get_provider_status(UUID) TO anon, authenticated;
