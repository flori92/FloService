-- Migration pour ajouter la colonne pays_code à la table villes
-- Cette migration assure la rétrocompatibilité avec le code frontend existant

-- Ajouter la colonne pays_code si elle n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'villes'
        AND column_name = 'pays_code'
    ) THEN
        ALTER TABLE public.villes ADD COLUMN pays_code CHAR(2);
        COMMENT ON COLUMN public.villes.pays_code IS 'Code ISO à deux lettres du pays (ex: BJ, CM)';
    END IF;
END
$$;

-- Créer un index sur pays_code pour optimiser les requêtes
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

-- Mettre à jour les valeurs de pays_code à partir de la table pays
UPDATE public.villes v
SET pays_code = p.code
FROM public.pays p
WHERE v.pays_id = p.id
AND (v.pays_code IS NULL OR v.pays_code = '');

-- Créer un trigger pour maintenir pays_code à jour automatiquement
CREATE OR REPLACE FUNCTION public.update_ville_pays_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Si pays_id est modifié, mettre à jour pays_code
    IF NEW.pays_id IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.pays_id IS DISTINCT FROM NEW.pays_id) THEN
        SELECT code INTO NEW.pays_code
        FROM public.pays
        WHERE id = NEW.pays_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS update_ville_pays_code_trigger ON public.villes;

-- Créer le trigger
CREATE TRIGGER update_ville_pays_code_trigger
BEFORE INSERT OR UPDATE ON public.villes
FOR EACH ROW
EXECUTE FUNCTION public.update_ville_pays_code();

-- Notifier PostgREST pour recharger le schéma
NOTIFY pgrst, 'reload schema';
