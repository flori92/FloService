-- Script pour corriger définitivement les problèmes de messages et de profils
-- Date: 2025-05-28

-- 1. Désactiver temporairement les contraintes de clé étrangère
ALTER TABLE public.message_attachments DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;

-- 2. Supprimer les tables problématiques si elles existent
DROP TABLE IF EXISTS public.message_attachments CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

-- 3. Recréer la table messages avec la structure correcte
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  has_attachment BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Créer la table message_attachments
CREATE TABLE public.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Créer les index nécessaires
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_message_attachments_message_id ON public.message_attachments(message_id);

-- 6. Activer ROW LEVEL SECURITY
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Créer les politiques de sécurité pour messages
CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

-- 8. Créer les politiques de sécurité pour les pièces jointes
CREATE POLICY "Les utilisateurs peuvent voir leurs pièces jointes"
  ON public.message_attachments
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
  ));

CREATE POLICY "Les utilisateurs peuvent ajouter des pièces jointes"
  ON public.message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.messages m 
    WHERE m.id = message_id AND m.sender_id = auth.uid()
  ));

-- 9. Mettre à jour la table profiles si nécessaire
DO $$
BEGIN
  -- Vérifier si la colonne is_provider existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_provider') THEN
    ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE;
  END IF;

  -- Vérifier si la colonne last_seen existe
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Mettre à jour les valeurs par défaut si nécessaire
  UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL;
  UPDATE public.profiles SET last_seen = NOW() WHERE last_seen IS NULL;
END $$;

-- 10. Créer une fonction pour mettre à jour le timestamp de dernière activité
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles 
  SET last_seen = NOW() 
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Créer un déclencheur pour mettre à jour last_seen
DROP TRIGGER IF EXISTS update_last_seen_trigger ON auth.users;
CREATE TRIGGER update_last_seen_trigger
AFTER INSERT OR UPDATE ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.update_last_seen();

-- 12. Donner les permissions nécessaires
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.message_attachments TO authenticated;
GRANT USAGE ON SEQUENCE messages_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE message_attachments_id_seq TO authenticated;

-- 13. Créer un type pour le statut du fournisseur s'il n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_status') THEN
    CREATE TYPE public.provider_status AS ENUM (
      'pending',
      'approved',
      'rejected',
      'suspended'
    );
  END IF;
END $$;

-- 14. Mettre à jour le type de la colonne status si nécessaire
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
             WHERE table_schema = 'public' AND table_name = 'profiles' 
             AND column_name = 'status' AND data_type = 'text') THEN
    -- Sauvegarder les données si nécessaire
    -- Puis modifier le type de la colonne
    ALTER TABLE public.profiles 
    ALTER COLUMN status TYPE provider_status 
    USING status::provider_status;
  END IF;
END $$;
