-- Script corrigé pour résoudre les problèmes liés aux traductions et aux profils prestataires
-- Date: 2025-05-28

-- 1. Vérifier si provider_profiles existe déjà et créer seulement si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'provider_profiles'
  ) THEN
    EXECUTE '
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
      )';
    
    -- Ajouter des index pour améliorer les performances
    EXECUTE 'CREATE INDEX idx_provider_profiles_user_id ON public.provider_profiles(user_id)';
    EXECUTE 'CREATE INDEX idx_provider_profiles_category_id ON public.provider_profiles(category_id)';
    
    -- Activer RLS
    EXECUTE 'ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY';
    
    -- Politique de lecture publique
    EXECUTE 'CREATE POLICY "Accès public en lecture"
      ON public.provider_profiles
      FOR SELECT
      USING (true)';
      
    -- Politique de modification pour les propriétaires
    EXECUTE 'CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
      ON public.provider_profiles
      FOR ALL
      USING (auth.uid() = user_id)';
  END IF;
END $$;

-- 2. Vérifier si la table translations existe et la créer si nécessaire
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'translations'
  ) THEN
    EXECUTE '
      CREATE TABLE public.translations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        language VARCHAR(10) NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (language, key)
      )';
    
    -- Activer RLS
    EXECUTE 'ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY';
    
    -- Créer des politiques
    EXECUTE 'CREATE POLICY "Accès public en lecture pour translations"
      ON public.translations
      FOR SELECT
      USING (true)';
  END IF;
END $$;

-- 3. Supprimer la fonction get_translations si elle existe déjà pour éviter les conflits
DO $$
BEGIN
  DROP FUNCTION IF EXISTS public.get_translations(text);
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- Ignorer les erreurs
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
  -- Vérifier si la table provider_profiles existe
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'provider_profiles'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.provider_profiles TO anon, authenticated';
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated';
  END IF;
  
  -- Vérifier si la table translations existe
  IF EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'translations'
  ) THEN
    EXECUTE 'GRANT SELECT ON public.translations TO anon, authenticated';
  END IF;
  
  -- Permissions pour la fonction get_translations
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_translations TO anon, authenticated';
END $$;

-- 6. Corriger les problèmes de la table profiles
DO $$
BEGIN
  -- S'assurer que la table profiles existe
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
    AND tablename = 'profiles'
  ) THEN
    -- Vérifier si is_provider existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'is_provider'
    ) THEN
      -- Mise à jour des valeurs NULL
      EXECUTE 'UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL';
    END IF;
    
    -- Supprimer les politiques existantes qui pourraient causer des problèmes
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles';
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignorer les erreurs
    END;
    
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles';
    EXCEPTION WHEN OTHERS THEN
      NULL; -- Ignorer les erreurs
    END;
    
    -- Créer une politique simplifiée pour l'accès en lecture publique
    EXECUTE 'CREATE POLICY "Tous les utilisateurs peuvent accéder aux profils"
      ON public.profiles
      FOR SELECT
      USING (true)';
      
    -- Accorder les permissions nécessaires
    EXECUTE 'GRANT SELECT ON public.profiles TO anon, authenticated';
  END IF;
END $$;

-- 7. Ajouter quelques traductions de base si la table est vide
INSERT INTO public.translations (language, key, value)
VALUES 
  ('fr', 'common.login', 'Connexion'),
  ('fr', 'common.register', 'Inscription'),
  ('fr', 'navigation.explore', 'Explorer'),
  ('fr', 'navigation.categories', 'Catégories'),
  ('fr', 'navigation.howItWorks', 'Comment ça marche')
ON CONFLICT (language, key) DO NOTHING;
