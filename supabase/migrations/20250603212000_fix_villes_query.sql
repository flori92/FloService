-- Migration pour corriger les problèmes avec les requêtes sur la table villes
-- Cette migration ajoute une fonction RPC sécurisée pour récupérer les villes par pays

-- Fonction pour récupérer les villes par ID de pays de manière sécurisée
CREATE OR REPLACE FUNCTION public.get_villes_by_pays_id(id_pays UUID)
RETURNS SETOF public.villes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier que l'ID pays est valide
    IF id_pays IS NULL THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT * FROM public.villes
    WHERE pays_id = id_pays
    ORDER BY nom ASC;
END;
$$;

-- Accorder les droits d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_id(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_id(UUID) TO anon;

-- Fonction pour récupérer les villes par code pays de manière sécurisée
-- Cette fonction fait une jointure avec la table pays pour trouver l'ID du pays à partir du code
CREATE OR REPLACE FUNCTION public.get_villes_by_pays_code(code_pays TEXT)
RETURNS TABLE(
    id UUID,
    nom TEXT,
    pays_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    pays_uuid UUID;
BEGIN
    -- Vérifier que le code pays est valide (2 caractères)
    IF code_pays IS NULL OR length(code_pays) != 2 THEN
        RETURN;
    END IF;
    
    -- Récupérer l'ID du pays à partir du code
    SELECT p.id INTO pays_uuid
    FROM public.pays p
    WHERE p.code = upper(code_pays);
    
    -- Si le pays n'est pas trouvé, retourner un ensemble vide
    IF pays_uuid IS NULL THEN
        RETURN;
    END IF;
    
    -- Retourner les villes pour ce pays
    RETURN QUERY
    SELECT v.id, v.nom, v.pays_id, v.created_at, v.updated_at
    FROM public.villes v
    WHERE v.pays_id = pays_uuid
    ORDER BY v.nom ASC;
END;
$$;

-- Accorder les droits d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_code(TEXT) TO anon;

-- S'assurer que la politique RLS pour la lecture des villes existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'villes' 
        AND policyname = 'Tout le monde peut voir les villes'
    ) THEN
        CREATE POLICY "Tout le monde peut voir les villes" 
        ON public.villes 
        FOR SELECT 
        USING (true);
    END IF;
END
$$;

-- Accorder les droits de lecture sur la table villes
GRANT SELECT ON public.villes TO authenticated;
GRANT SELECT ON public.villes TO anon;

-- Notifier PostgREST pour recharger le schéma
NOTIFY pgrst, 'reload schema';

-- Commentaires explicatifs sur les fonctions
COMMENT ON FUNCTION public.get_villes_by_pays_id(UUID) IS 'Récupère les villes par ID de pays de manière sécurisée';
COMMENT ON FUNCTION public.get_villes_by_pays_code(TEXT) IS 'Récupère les villes par code pays en faisant une jointure avec la table pays';
