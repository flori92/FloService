-- Script pour créer manuellement les tables manquantes
-- Date: 2025-05-28

-- 1. Créer la table des messages si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  has_attachment BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Créer les index pour la table messages
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON public.messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages(read);

-- 3. Activer RLS sur la table messages
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 4. Créer les politiques de sécurité pour la table messages
CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent voir leurs propres messages"
  ON public.messages
  FOR SELECT
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent mettre à jour leurs messages"
  ON public.messages
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id)
  WITH CHECK (
    (auth.uid() = sender_id AND (OLD.content = NEW.content)) OR
    (auth.uid() = recipient_id AND (OLD.content = NEW.content) AND (OLD.read <> NEW.read))
  );

-- 5. Créer la table des conversations si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant1_id, participant2_id)
);

-- 6. Créer les index pour la table conversations
CREATE INDEX IF NOT EXISTS idx_conversations_participant1_id ON public.conversations(participant1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_participant2_id ON public.conversations(participant2_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message_id ON public.conversations(last_message_id);

-- 7. Activer RLS sur la table conversations
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

-- 8. Créer les politiques de sécurité pour la table conversations
CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent voir leurs propres conversations"
  ON public.conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY IF NOT EXISTS "Les utilisateurs peuvent mettre à jour leurs conversations"
  ON public.conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- 9. Créer la table des factures si elle n'existe pas
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  offer_id UUID REFERENCES service_offers(id) ON DELETE SET NULL,
  provider_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  commission INTEGER NOT NULL DEFAULT 100,
  tax_rate INTEGER NOT NULL DEFAULT 18,
  tax_amount INTEGER NOT NULL,
  total_amount INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid')),
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_url TEXT,
  provider_details JSONB,
  client_details JSONB
);

-- 10. Créer les index pour la table invoices
CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider_id);
CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_offer ON invoices(offer_id);

-- 11. Créer un bucket de stockage pour les factures PDF si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 12. Créer les politiques de sécurité pour le bucket de factures
CREATE POLICY IF NOT EXISTS "Les factures sont accessibles publiquement"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'invoices');

CREATE POLICY IF NOT EXISTS "Seuls les administrateurs peuvent insérer des factures"
  ON storage.objects FOR INSERT
  USING (bucket_id = 'invoices' AND (auth.role() = 'service_role' OR auth.role() = 'authenticated'));

-- 13. Créer un bucket de stockage pour les pièces jointes si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 14. Créer les politiques de sécurité pour le bucket d'attachments
CREATE POLICY IF NOT EXISTS "Les pièces jointes sont accessibles publiquement"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'attachments');

CREATE POLICY IF NOT EXISTS "Les utilisateurs authentifiés peuvent télécharger des pièces jointes"
  ON storage.objects FOR INSERT
  USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
