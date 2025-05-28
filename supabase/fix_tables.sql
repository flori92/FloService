-- Script pour corriger les problèmes de tables
-- Date: 2025-05-28

-- 1. Recréer la table messages complètement
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  has_attachment BOOLEAN DEFAULT FALSE,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer les index pour la table messages
CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);
CREATE INDEX idx_messages_read ON public.messages(read);

-- 3. Activer RLS sur la table messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Créer les politiques de sécurité pour la table messages
CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  ));

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id AND (c.participant1_id = auth.uid() OR c.participant2_id = auth.uid())
  ));

-- 5. Vérifier et mettre à jour la table profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_provider') THEN
    ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen') THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NOW();
  END IF;
END $$;

-- 6. Recréer la table conversations si nécessaire
DROP TABLE IF EXISTS public.conversations CASCADE;

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- 7. Créer les index pour la table conversations
CREATE INDEX idx_conversations_participant1_id ON public.conversations(participant1_id);
CREATE INDEX idx_conversations_participant2_id ON public.conversations(participant2_id);

-- 8. Activer RLS sur la table conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 9. Créer les politiques de sécurité pour la table conversations
CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- 10. Mettre à jour les références entre messages et conversations
ALTER TABLE public.messages ADD CONSTRAINT fk_messages_conversation
  FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;
