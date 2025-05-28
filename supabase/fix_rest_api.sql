-- Script pour corriger spécifiquement les problèmes d'API REST
-- Date: 2025-05-28

-- 1. Vérifier si le schéma API est correctement configuré
DO $$
BEGIN
  -- Vérifier si la table messages existe dans le schéma public
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    -- Mettre à jour ou ajouter la table dans le schéma d'API
    EXECUTE 'CREATE OR REPLACE VIEW api.messages AS SELECT * FROM public.messages';
    
    -- Accorder les permissions nécessaires
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON api.messages TO anon, authenticated';
  END IF;

  -- Vérifier si la table profiles existe dans le schéma public
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Mettre à jour ou ajouter la table dans le schéma d'API
    EXECUTE 'CREATE OR REPLACE VIEW api.profiles AS SELECT * FROM public.profiles';
    
    -- Accorder les permissions nécessaires
    EXECUTE 'GRANT SELECT ON api.profiles TO anon, authenticated';
  END IF;
END $$;

-- 2. Créer des fonctions d'API alternatives qui sont plus robustes
CREATE OR REPLACE FUNCTION api.check_messages_table()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'messages'
  ) THEN
    result := '{"exists": true, "message": "Table messages exists"}'::JSONB;
  ELSE
    result := '{"exists": false, "message": "Table messages does not exist"}'::JSONB;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer une fonction API pour obtenir le statut du prestataire de manière robuste
CREATE OR REPLACE FUNCTION api.get_provider_status(user_id UUID)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
  is_provider BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur existe et s'il est un prestataire
  SELECT p.is_provider INTO is_provider
  FROM public.profiles p
  WHERE p.id = user_id;
  
  IF FOUND THEN
    result := jsonb_build_object('exists', true, 'is_provider', COALESCE(is_provider, false));
  ELSE
    result := '{"exists": false, "is_provider": false}'::JSONB;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ajouter une politique spécifique pour permettre les requêtes GET par id
DO $$
BEGIN
  -- Supprimer la politique existante si elle existe
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres profils par id" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  -- Créer la nouvelle politique
  EXECUTE 'CREATE POLICY "Les utilisateurs peuvent voir leurs propres profils par id" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated 
    USING (auth.uid() = id)';
    
  -- Politique pour permettre l'accès public aux profils pour les prestataires
  BEGIN
    EXECUTE 'DROP POLICY IF EXISTS "Les utilisateurs peuvent voir les profils des prestataires" ON public.profiles';
  EXCEPTION WHEN OTHERS THEN
    -- Ignorer l'erreur si la politique n'existe pas
  END;
  
  EXECUTE 'CREATE POLICY "Les utilisateurs peuvent voir les profils des prestataires" 
    ON public.profiles 
    FOR SELECT 
    TO authenticated 
    USING (is_provider = true)';
END $$;

-- 5. Rafraîchir les cache d'API et les schémas
-- Note: Cela nécessite généralement un redémarrage du service Supabase,
-- ce qui ne peut pas être fait via SQL. Vous devrez peut-être redémarrer
-- votre projet Supabase ou attendre que les caches se rafraîchissent.
