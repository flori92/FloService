-- Script pour corriger les politiques de sécurité
-- Date: 2025-05-28

-- 1. Corriger les politiques pour la table messages
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres messages" ON public.messages;
CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent mettre à jour leurs messages" ON public.messages;
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id);

-- 2. Vérifier et mettre à jour la table profiles pour les colonnes manquantes
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_provider BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

-- 3. Ajouter les colonnes manquantes à la table messages si nécessaire
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 4. Ajouter une politique pour permettre aux utilisateurs de voir les messages qui leur sont destinés
CREATE POLICY "Les utilisateurs peuvent voir les messages reçus"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = recipient_id);

-- 5. Créer la table message_attachments si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.message_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID REFERENCES public.messages(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Activer RLS sur la table message_attachments
ALTER TABLE public.message_attachments ENABLE ROW LEVEL SECURITY;

-- 7. Créer les politiques de sécurité pour la table message_attachments
CREATE POLICY "Users can view their message attachments"
  ON public.message_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND (m.sender_id = auth.uid() OR m.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can upload message attachments"
  ON public.message_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.messages m
      WHERE m.id = message_id AND m.sender_id = auth.uid()
    )
  );
