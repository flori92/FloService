-- Script final pour corriger tous les problèmes d'API REST
-- Date: 2025-05-28

-- 1. Corriger les politiques de sécurité pour provider_profiles
DO $$
DECLARE
  policy_exists BOOLEAN;
BEGIN
  -- Vérifier si la table provider_profiles existe
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'provider_profiles') THEN
    -- Vérifier si les politiques existent déjà
    SELECT EXISTS (
      SELECT 1 FROM pg_policies 
      WHERE schemaname = 'public' 
      AND tablename = 'provider_profiles'
      AND policyname = 'Accès public en lecture'
    ) INTO policy_exists;
    
    -- Créer la politique si elle n'existe pas
    IF NOT policy_exists THEN
      BEGIN
        EXECUTE 'CREATE POLICY "Accès public en lecture" ON public.provider_profiles FOR SELECT USING (true)';
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de la création de la politique pour provider_profiles: %', SQLERRM;
      END;
    END IF;
    
    -- Accorder les permissions nécessaires
    EXECUTE 'GRANT SELECT ON public.provider_profiles TO anon, authenticated';
    EXECUTE 'GRANT INSERT, UPDATE, DELETE ON public.provider_profiles TO authenticated';
  END IF;
END $$;

-- 2. Créer ou corriger la table translations
DO $$
BEGIN
  -- Vérifier si la table translations existe
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'translations') THEN
    -- Créer la table
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
    
    -- Créer la politique
    CREATE POLICY "Accès public en lecture" ON public.translations FOR SELECT USING (true);
    
    -- Accorder les permissions
    GRANT SELECT ON public.translations TO anon, authenticated;
    
    -- Ajouter quelques traductions de base
    INSERT INTO public.translations (language, key, value)
    VALUES 
      ('fr', 'common.login', 'Connexion'),
      ('fr', 'common.register', 'Inscription'),
      ('fr', 'navigation.explore', 'Explorer'),
      ('fr', 'navigation.categories', 'Catégories'),
      ('fr', 'navigation.howItWorks', 'Comment ça marche');
  ELSE
    -- Vérifier si les colonnes existent
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'translations' 
      AND column_name = 'language'
    ) THEN
      -- La table existe mais n'a pas la bonne structure
      -- Créer une nouvelle table avec le bon format
      DROP TABLE IF EXISTS public.translations_new;
      
      CREATE TABLE public.translations_new (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        language VARCHAR(10) NOT NULL,
        key TEXT NOT NULL,
        value TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE (language, key)
      );
      
      -- Activer RLS sur la nouvelle table
      ALTER TABLE public.translations_new ENABLE ROW LEVEL SECURITY;
      
      -- Créer les politiques sur la nouvelle table
      CREATE POLICY "Accès public en lecture" ON public.translations_new FOR SELECT USING (true);
      
      -- Accorder les permissions
      GRANT SELECT ON public.translations_new TO anon, authenticated;
      
      -- Ajouter quelques traductions de base
      INSERT INTO public.translations_new (language, key, value)
      VALUES 
        ('fr', 'common.login', 'Connexion'),
        ('fr', 'common.register', 'Inscription'),
        ('fr', 'navigation.explore', 'Explorer'),
        ('fr', 'navigation.categories', 'Catégories'),
        ('fr', 'navigation.howItWorks', 'Comment ça marche');
        
      -- Renommer les tables
      ALTER TABLE public.translations RENAME TO translations_old;
      ALTER TABLE public.translations_new RENAME TO translations;
    END IF;
  END IF;
END $$;

-- 3. Créer ou remplacer la fonction get_translations
CREATE OR REPLACE FUNCTION public.get_translations(p_language TEXT DEFAULT 'fr')
RETURNS JSONB AS $$
DECLARE
  translations JSONB;
BEGIN
  -- Vérifier si la table existe pour éviter les erreurs
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'translations') THEN
    SELECT jsonb_object_agg(key, value) INTO translations
    FROM public.translations
    WHERE language = p_language;
  ELSE
    translations := '{}'::JSONB;
  END IF;
  
  IF translations IS NULL THEN
    translations := '{}'::JSONB;
  END IF;
  
  RETURN translations;
END;
$$ LANGUAGE plpgsql;

-- Accorder les permissions sur la fonction
GRANT EXECUTE ON FUNCTION public.get_translations(TEXT) TO anon, authenticated;

-- 4. Corriger les problèmes de la table profiles
DO $$
BEGIN
  -- Simplifier la gestion des politiques en supprimant et recréant
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Tous les utilisateurs peuvent accéder aux profils" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN NULL; END;
  
  -- Créer une politique simple et efficace
  CREATE POLICY "Accès public aux profils" ON public.profiles FOR SELECT USING (true);
  
  -- S'assurer que les permissions sont correctes
  GRANT SELECT ON public.profiles TO anon, authenticated;
  GRANT UPDATE ON public.profiles TO authenticated;
END $$;

-- 5. Fonction sécurisée pour obtenir le statut prestataire
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

GRANT EXECUTE ON FUNCTION public.get_provider_status(UUID) TO anon, authenticated;
