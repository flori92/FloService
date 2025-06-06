-- Migration pour corriger les problèmes identifiés dans les logs
-- 1. Ajout de la colonne description à la table subcategories
-- 2. Vérification de la fonction is_provider

-- Ajout de la colonne description à la table subcategories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subcategories') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subcategories' AND column_name = 'description') THEN
      ALTER TABLE public.subcategories ADD COLUMN description TEXT;
      
      -- Mise à jour du commentaire de la table
      COMMENT ON TABLE public.subcategories IS 'Sous-catégories de services avec description';
      
      -- Mise à jour du commentaire de la colonne
      COMMENT ON COLUMN public.subcategories.description IS 'Description détaillée de la sous-catégorie';
    END IF;
  END IF;
END
$$;

-- Recréation de la fonction is_provider pour s'assurer que le nom du paramètre est 'user_id'

-- Supprimer l'ancienne fonction is_provider si elle existe (indépendamment du nom du paramètre)
-- Cela garantit que nous pouvons la recréer avec le nom de paramètre correct.
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
    RAISE WARNING 'Erreur dans la fonction is_provider: %', SQLERRM;
    RETURN false;
END;
$$;

COMMENT ON FUNCTION public.is_provider(UUID) IS 'Vérifie si un utilisateur est un prestataire de services (paramètre user_id)';

GRANT EXECUTE ON FUNCTION public.is_provider(UUID) TO anon, authenticated;

-- Notifier PostgREST pour recharger le schéma. Essentiel après des modifications de fonction.
NOTIFY pgrst, 'reload schema';



-- Mise à jour des politiques RLS pour la table subcategories
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subcategories') THEN
    -- Activer RLS sur la table subcategories si ce n'est pas déjà fait
    ALTER TABLE public.subcategories ENABLE ROW LEVEL SECURITY;
    
    -- Supprimer les politiques existantes si elles existent
    DROP POLICY IF EXISTS "Lecture publique des sous-catégories" ON public.subcategories;
    DROP POLICY IF EXISTS "Modification des sous-catégories par les administrateurs" ON public.subcategories;
    
    -- Créer les politiques RLS
    CREATE POLICY "Lecture publique des sous-catégories" 
      ON public.subcategories 
      FOR SELECT 
      USING (true);
      
    CREATE POLICY "Modification des sous-catégories par les administrateurs" 
      ON public.subcategories 
      FOR ALL 
      USING (
        (SELECT is_admin FROM public.profiles WHERE id = auth.uid())
      );
  END IF;
END
$$;
