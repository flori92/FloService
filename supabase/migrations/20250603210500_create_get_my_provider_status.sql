-- Migration pour créer la fonction RPC get_my_provider_status
-- Cette fonction permet de récupérer le statut is_provider de l'utilisateur actuellement authentifié
-- Elle utilise auth.uid() en interne pour garantir la sécurité et éviter les erreurs 406 liées à RLS

-- Création de la fonction get_my_provider_status
CREATE OR REPLACE FUNCTION public.get_my_provider_status()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_provider_status BOOLEAN;
BEGIN
  -- Récupérer le statut is_provider de l'utilisateur actuellement authentifié
  SELECT p.is_provider INTO is_provider_status
  FROM public.profiles p
  WHERE p.id = auth.uid();

  -- Retourner false si null ou si aucun résultat trouvé
  RETURN COALESCE(is_provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, retourner false par défaut
    RETURN false;
END;
$$;

-- Accorder l'exécution de la fonction à tous les utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION public.get_my_provider_status() TO authenticated;

-- Notifier PostgREST pour recharger le schéma
NOTIFY pgrst, 'reload schema';

-- Commentaire explicatif sur la fonction
COMMENT ON FUNCTION public.get_my_provider_status() IS 'Récupère le statut is_provider de l''utilisateur actuellement authentifié en utilisant auth.uid() pour garantir la sécurité RLS';
