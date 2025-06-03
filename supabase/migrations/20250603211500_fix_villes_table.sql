-- Migration pour corriger les problèmes avec la table villes
-- Cette migration ajoute des index et optimise la structure pour éviter les erreurs 400

-- S'assurer que la table villes existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'villes'
    ) THEN
        CREATE TABLE public.villes (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            nom VARCHAR(255) NOT NULL,
            pays_code CHAR(2) NOT NULL,
            pays_id UUID REFERENCES public.pays(id),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            population INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END
$$;

-- Ajouter un index sur pays_code s'il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'villes' 
        AND indexname = 'idx_villes_pays_code'
    ) THEN
        CREATE INDEX idx_villes_pays_code ON public.villes (pays_code);
    END IF;
END
$$;

-- Ajouter un index sur pays_id s'il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_indexes 
        WHERE tablename = 'villes' 
        AND indexname = 'idx_villes_pays_id'
    ) THEN
        CREATE INDEX idx_villes_pays_id ON public.villes (pays_id);
    END IF;
END
$$;

-- Fonction pour récupérer les villes par code pays de manière sécurisée
CREATE OR REPLACE FUNCTION public.get_villes_by_pays_code(code_pays TEXT)
RETURNS SETOF public.villes
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Vérifier que le code pays est valide (2 caractères)
    IF code_pays IS NULL OR length(code_pays) != 2 THEN
        RETURN;
    END IF;
    
    RETURN QUERY
    SELECT * FROM public.villes
    WHERE pays_code = upper(code_pays)
    ORDER BY nom ASC;
END;
$$;

-- Accorder les droits d'exécution sur la fonction
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_villes_by_pays_code(TEXT) TO anon;

-- Ajouter une politique RLS pour permettre la lecture des villes à tous
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies 
        WHERE tablename = 'villes' 
        AND policyname = 'Allow public read access'
    ) THEN
        CREATE POLICY "Allow public read access" 
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

-- Commentaire explicatif sur la fonction
COMMENT ON FUNCTION public.get_villes_by_pays_code(TEXT) IS 'Récupère les villes par code pays de manière sécurisée avec validation du format du code pays';
