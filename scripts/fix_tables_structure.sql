-- Script de correction des tables manquantes et de la structure
-- Créé le 02/06/2025

-- Correction de la table security_scripts
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'security_scripts'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'security_scripts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.security_scripts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
  END IF;
END$$;

-- Création de la table pays si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.pays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL UNIQUE,
  code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Création de la table villes si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.villes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  pays_id UUID REFERENCES public.pays(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(nom, pays_id)
);

-- Création d'un index sur pays_id pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_villes_pays_id ON public.villes(pays_id);

-- Ajout des politiques RLS pour les tables pays et villes
ALTER TABLE public.pays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.villes ENABLE ROW LEVEL SECURITY;

-- Politiques pour la table pays
CREATE POLICY IF NOT EXISTS "Tout le monde peut voir les pays" 
  ON public.pays FOR SELECT 
  USING (true);

-- Politiques pour la table villes
CREATE POLICY IF NOT EXISTS "Tout le monde peut voir les villes" 
  ON public.villes FOR SELECT 
  USING (true);

-- Création de la fonction pour gérer les ID non-UUID
CREATE OR REPLACE FUNCTION public.handle_non_uuid(id_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result UUID;
BEGIN
  -- Essayer de convertir directement en UUID
  BEGIN
    result := id_value::UUID;
    RETURN result;
  EXCEPTION WHEN others THEN
    -- Si échec, générer un UUID déterministe basé sur la chaîne
    RETURN md5(id_value)::UUID;
  END;
END;
$$;

-- Fonction pour vérifier si un ID est un UUID valide
CREATE OR REPLACE FUNCTION public.is_valid_uuid(id_value TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Essayer de convertir en UUID
  BEGIN
    PERFORM id_value::UUID;
    RETURN TRUE;
  EXCEPTION WHEN others THEN
    RETURN FALSE;
  END;
END;
$$;

-- Fonction pour obtenir un ID sécurisé (UUID ou transformé)
CREATE OR REPLACE FUNCTION public.get_safe_id(id_value TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF public.is_valid_uuid(id_value) THEN
    RETURN id_value::UUID;
  ELSE
    RETURN public.handle_non_uuid(id_value);
  END IF;
END;
$$;

-- Création de la table message-attachments si elle n'existe pas
CREATE TABLE IF NOT EXISTS public."message-attachments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Création d'un index sur message_id
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public."message-attachments"(message_id);

-- Politique RLS pour la table message-attachments
ALTER TABLE public."message-attachments" ENABLE ROW LEVEL SECURITY;

-- Politique pour voir les pièces jointes
CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent voir les pièces jointes de leurs messages" 
  ON public."message-attachments" FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id AND (
        auth.uid() = c.client_id OR 
        auth.uid() = c.provider_id OR
        auth.uid() = m.sender_id
      )
    )
  );

-- Politique pour ajouter des pièces jointes
CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent ajouter des pièces jointes à leurs messages" 
  ON public."message-attachments" FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      JOIN public.conversations c ON m.conversation_id = c.id
      WHERE m.id = message_id AND auth.uid() = m.sender_id
    )
  );

-- Création de la fonction check_migration_status
CREATE OR REPLACE FUNCTION public.check_migration_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  required_tables TEXT[] := ARRAY['profiles', 'provider_profiles', 'messages', 'conversations', 'notifications', 'pays', 'villes'];
  required_functions TEXT[] := ARRAY['is_provider', 'get_provider_status', 'handle_non_uuid', 'is_valid_uuid', 'get_safe_id'];
  missing_tables TEXT[] := '{}';
  missing_functions TEXT[] := '{}';
  current_table TEXT;
  current_function TEXT;
BEGIN
  -- Vérification des tables requises
  FOREACH current_table IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = current_table
    ) THEN
      missing_tables := missing_tables || current_table;
    END IF;
  END LOOP;
  
  -- Vérification des fonctions requises
  FOREACH current_function IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = current_function
    ) THEN
      missing_functions := missing_functions || current_function;
    END IF;
  END LOOP;
  
  -- Construction du résultat
  result := jsonb_build_object(
    'status', CASE WHEN array_length(missing_tables, 1) = 0 AND array_length(missing_functions, 1) = 0 THEN 'ok' ELSE 'migration_required' END,
    'missing_tables', missing_tables,
    'missing_functions', missing_functions
  );
  
  RETURN result;
END;
$$;
