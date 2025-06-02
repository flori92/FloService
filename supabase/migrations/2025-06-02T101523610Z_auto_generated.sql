-- Script de migration pour les tables et fonctions manquantes
-- Généré automatiquement le 2025-06-02T10:15:23.603Z

-- Création de la table message-attachments
CREATE TABLE IF NOT EXISTS public."message-attachments" (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id ON public."message-attachments"(message_id);

-- Politique RLS pour la table message-attachments
ALTER TABLE public."message-attachments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir les pièces jointes de leurs messages" ON public."message-attachments"
  FOR SELECT USING (
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
CREATE POLICY "Les utilisateurs peuvent ajouter des pièces jointes à leurs messages" ON public."message-attachments"
  FOR INSERT WITH CHECK (
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
  required_tables TEXT[] := ARRAY['profiles', 'provider_profiles', 'messages', 'conversations', 'notifications'];
  required_functions TEXT[] := ARRAY['is_provider', 'get_provider_status'];
  missing_tables TEXT[] := '{}';
  missing_functions TEXT[] := '{}';
  table_name TEXT;
  function_name TEXT;
BEGIN
  -- Vérification des tables requises
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = table_name
    ) THEN
      missing_tables := missing_tables || table_name;
    END IF;
  END LOOP;
  
  -- Vérification des fonctions requises
  FOREACH function_name IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = function_name
    ) THEN
      missing_functions := missing_functions || function_name;
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

