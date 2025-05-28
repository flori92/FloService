-- Script corrigé pour résoudre les problèmes d'API REST
-- Date: 2025-05-28

-- 1. Vérifier et mettre à jour les politiques de sécurité sur les tables
DO $$
BEGIN
  -- Supprimer les politiques existantes si elles existent
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  -- Créer des politiques plus permissives
  EXECUTE 'CREATE POLICY "Authenticated users can view all profiles" 
    ON public.profiles 
    FOR SELECT 
    USING (true)';
    
  -- Ajouter une politique spécifique pour les requêtes avec filtres
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Public access to profiles" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  EXECUTE 'CREATE POLICY "Public access to profiles" 
    ON public.profiles 
    FOR SELECT 
    TO anon 
    USING (true)';
    
  -- Politique pour les messages
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    BEGIN
      EXECUTE 'DROP POLICY IF EXISTS "Public access to messages" ON public.messages';
    EXCEPTION WHEN OTHERS THEN
      -- Ignorer l'erreur si la politique n'existe pas
    END;
    
    EXECUTE 'CREATE POLICY "Public access to messages" 
      ON public.messages 
      FOR SELECT 
      USING (true)';
  END IF;
END $$;

-- 2. S'assurer que les colonnes nécessaires existent et sont correctement indexées
DO $$
BEGIN
  -- Vérifier is_provider dans profiles
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Vérifier si la colonne existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'is_provider'
    ) THEN
      EXECUTE 'ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE';
    END IF;
    
    -- Mettre à jour les valeurs null
    EXECUTE 'UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL';
    
    -- Créer un index si nécessaire
    IF NOT EXISTS (
      SELECT 1 FROM pg_indexes 
      WHERE tablename = 'profiles' 
      AND indexname = 'idx_profiles_is_provider'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_is_provider ON public.profiles(is_provider)';
    END IF;
  END IF;
END $$;

-- 3. Modifier la structure des tables pour simplifier les requêtes REST
DO $$
BEGIN
  -- Vérifier si la fonction anon.allow_public_access existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'allow_public_access' 
    AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'anon')
  ) THEN
    -- Créer le schéma anon si nécessaire
    BEGIN
      EXECUTE 'CREATE SCHEMA IF NOT EXISTS anon';
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
    
    -- Créer la fonction helper
    EXECUTE 'CREATE OR REPLACE FUNCTION anon.allow_public_access()
    RETURNS TRIGGER AS $$
    BEGIN
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql';
  END IF;
END $$;

-- 4. Ajouter une fonction pour vérifier si les tables existent
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = table_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Créer une fonction pour obtenir le statut prestataire de manière fiable
CREATE OR REPLACE FUNCTION public.get_provider_status(user_id UUID)
RETURNS TABLE (is_provider BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT COALESCE(p.is_provider, FALSE)
  FROM public.profiles p
  WHERE p.id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Accorder les permissions nécessaires aux rôles anon et authenticated
DO $$
BEGIN
  -- Permissions sur les tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    EXECUTE 'GRANT SELECT ON public.messages TO anon, authenticated';
  END IF;
  
  EXECUTE 'GRANT SELECT ON public.profiles TO anon, authenticated';
  
  -- Permissions sur les fonctions
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.check_table_exists TO anon, authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_provider_status TO anon, authenticated';
END $$;
