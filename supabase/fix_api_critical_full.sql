-- Script unifié pour corriger les problèmes critiques d'API REST Supabase
-- Date : 2025-05-28

-- 1. Corriger/créer la fonction get_translations(lang TEXT)
DO $$
BEGIN
  -- Supprimer toute ancienne version incompatible
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'get_translations'
  ) THEN
    EXECUTE 'DROP FUNCTION IF EXISTS public.get_translations(TEXT)';
    EXECUTE 'DROP FUNCTION IF EXISTS public.get_translations(p_language TEXT)';
  END IF;
END $$;

-- Créer la fonction avec la bonne signature
CREATE OR REPLACE FUNCTION public.get_translations(lang TEXT)
RETURNS TABLE(key TEXT, value TEXT) AS $$
BEGIN
  RETURN QUERY SELECT key, value FROM public.translations WHERE language = lang;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.get_translations(TEXT) TO anon, authenticated;

-- 2. Corriger la colonne is_provider sur profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_provider'
  ) THEN
    EXECUTE 'ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE';
  END IF;
  -- Forcer le type et la valeur par défaut
  EXECUTE 'ALTER TABLE public.profiles ALTER COLUMN is_provider SET DEFAULT FALSE';
  EXECUTE 'UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL';
END $$;

-- Politique RLS lecture sur profiles (lecture pour tous)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Lecture publique'
  ) THEN
    EXECUTE 'CREATE POLICY "Lecture publique" ON public.profiles FOR SELECT USING (TRUE)';
  END IF;
END $$;

-- 3. Créer la table messages si absente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    EXECUTE '
      CREATE TABLE public.messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now(),
        read BOOLEAN DEFAULT FALSE
      )';
    EXECUTE 'CREATE INDEX idx_messages_sender_id ON public.messages(sender_id)';
    EXECUTE 'CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id)';
    EXECUTE 'ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY';
    EXECUTE 'CREATE POLICY "Lecture publique messages" ON public.messages FOR SELECT USING (TRUE)';
    EXECUTE 'CREATE POLICY "Insertion messages" ON public.messages FOR INSERT WITH CHECK (auth.uid() = sender_id)';
  END IF;
END $$;
