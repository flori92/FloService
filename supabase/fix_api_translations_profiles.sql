-- Script pour résoudre les problèmes liés aux traductions et aux profils prestataires
-- Date: 2025-05-28

-- 1. Créer la table provider_profiles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'provider_profiles'
  ) THEN
    CREATE TABLE public.provider_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      category_id UUID,
      title VARCHAR(255),
      description TEXT,
      hourly_rate DECIMAL(10, 2),
      years_experience INTEGER,
      is_available BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Ajouter des index pour améliorer les performances
    CREATE INDEX idx_provider_profiles_user_id ON public.provider_profiles(user_id);
    CREATE INDEX idx_provider_profiles_category_id ON public.provider_profiles(category_id);
    
    -- Activer RLS
    ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. Créer des politiques pour provider_profiles
DO $$
BEGIN
  -- Politique de lecture publique
  BEGIN
    DROP POLICY IF EXISTS "Accès public en lecture" ON public.provider_profiles;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  CREATE POLICY "Accès public en lecture"
    ON public.provider_profiles
    FOR SELECT
    USING (true);
    
  -- Politique de modification pour les propriétaires
  BEGIN
    DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.provider_profiles;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
    ON public.provider_profiles
    FOR ALL
    USING (auth.uid() = user_id);
END $$;

-- 3. Créer la fonction get_translations et sa table si elle n'existe pas
DO $$
BEGIN
  -- Vérifier si la table translations existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'translations'
  ) THEN
    CREATE TABLE public.translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      language VARCHAR(10) NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE (language, key)
    );
    
    -- Activer RLS
    ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
    
    -- Créer des politiques
    CREATE POLICY "Accès public en lecture pour translations"
      ON public.translations
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- 4. Créer la fonction RPC get_translations
CREATE OR REPLACE FUNCTION public.get_translations(p_language TEXT DEFAULT 'fr')
RETURNS JSONB AS $$
DECLARE
  translations JSONB;
BEGIN
  SELECT jsonb_object_agg(key, value) INTO translations
  FROM public.translations
  WHERE language = p_language;
  
  IF translations IS NULL THEN
    translations := '{}'::JSONB;
  END IF;
  
  RETURN translations;
END;
$$ LANGUAGE plpgsql;

-- 5. Accorder les permissions nécessaires
DO $$
BEGIN
  -- Permissions pour provider_profiles
  EXECUTE 'GRANT SELECT ON public.provider_profiles TO anon, authenticated';
  EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated';
  
  -- Permissions pour translations
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'translations'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.translations TO anon, authenticated';
  END IF;
  
  -- Permissions pour la fonction get_translations
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_translations TO anon, authenticated';
END $$;

-- 6. Corriger le problème spécifique avec la colonne is_provider
DO $$
BEGIN
  -- Si la colonne is_provider existe mais a des problèmes
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_provider'
  ) THEN
    -- Modifier le type de colonne si nécessaire
    BEGIN
      ALTER TABLE public.profiles 
      ALTER COLUMN is_provider TYPE BOOLEAN 
      USING is_provider::BOOLEAN;
    EXCEPTION WHEN OTHERS THEN
      -- La colonne est déjà de type BOOLEAN, ignorer l'erreur
    END;
  END IF;
  
  -- S'assurer que la politique pour les profils est correcte
  BEGIN
    DROP POLICY IF EXISTS "Tous les utilisateurs peuvent accéder aux profils" ON public.profiles;
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  CREATE POLICY "Tous les utilisateurs peuvent accéder aux profils"
    ON public.profiles
    FOR SELECT
    USING (true);
END $$;
