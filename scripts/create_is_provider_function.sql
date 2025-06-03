-- Fonction pour vérifier si un utilisateur est un prestataire
-- Cette fonction est utilisée par l'application pour déterminer les droits d'accès
CREATE OR REPLACE FUNCTION public.is_provider(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  provider_status boolean;
BEGIN
  -- Recherche dans la table profiles
  SELECT is_provider INTO provider_status
  FROM profiles
  WHERE id = user_id;
  
  -- Si aucun résultat, retourner false
  RETURN COALESCE(provider_status, false);
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, log et retourne false
    PERFORM log_audit_action(
      'ERROR',
      'is_provider',
      format('Erreur lors de la vérification du statut prestataire pour %s: %s', user_id, SQLERRM)
    );
    RETURN false;
END;
$$;

-- Commentaire pour documenter la fonction
COMMENT ON FUNCTION public.is_provider(uuid) IS 'Vérifie si un utilisateur est un prestataire en consultant la colonne is_provider de la table profiles';

-- Accorder les droits d'exécution à anon et authenticated
GRANT EXECUTE ON FUNCTION public.is_provider(uuid) TO anon, authenticated;

-- Créer une fonction de secours pour log_audit_action si elle n'existe pas déjà
-- Cette fonction est utilisée pour journaliser les actions importantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'log_audit_action') THEN
    CREATE OR REPLACE FUNCTION public.log_audit_action(
      action_type text,
      action_name text,
      action_description text
    )
    RETURNS void
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public
    AS $$
    BEGIN
      -- Insérer dans une table d'audit si elle existe
      BEGIN
        INSERT INTO audit_logs (action_type, action_name, description, created_at)
        VALUES (action_type, action_name, action_description, now());
      EXCEPTION
        WHEN OTHERS THEN
          -- Si la table n'existe pas ou autre erreur, simplement ignorer
          NULL;
      END;
    END;
    $$;
    
    COMMENT ON FUNCTION public.log_audit_action(text, text, text) IS 'Fonction utilitaire pour journaliser les actions importantes dans le système';
    GRANT EXECUTE ON FUNCTION public.log_audit_action(text, text, text) TO authenticated;
  END IF;
END
$$;
