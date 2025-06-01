
-- Script de sécurité pour FloService
-- Généré automatiquement le 2025-06-01T09:10:30.744Z

-- Activation du RLS sur toutes les tables utilisateur
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Politiques RLS pour profiles
DROP POLICY IF EXISTS "Accès public en lecture pour profiles" ON public.profiles;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.profiles;

CREATE POLICY "Accès public en lecture pour profiles"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Politiques RLS pour services
DROP POLICY IF EXISTS "Accès public en lecture pour services" ON public.services;
DROP POLICY IF EXISTS "Les prestataires peuvent gérer leurs services" ON public.services;

CREATE POLICY "Accès public en lecture pour services"
ON public.services
FOR SELECT
USING (true);

CREATE POLICY "Les prestataires peuvent gérer leurs services"
ON public.services
FOR ALL
USING (auth.uid() = provider_id)
WITH CHECK (auth.uid() = provider_id);

-- Politiques RLS pour bookings
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs réservations" ON public.bookings;
DROP POLICY IF EXISTS "Les clients peuvent créer des réservations" ON public.bookings;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings;

CREATE POLICY "Les utilisateurs peuvent voir leurs réservations"
ON public.bookings
FOR SELECT
USING (
  auth.uid() = client_id OR 
  auth.uid() IN (
    SELECT s.provider_id FROM public.services s WHERE s.id = service_id
  )
);

CREATE POLICY "Les clients peuvent créer des réservations"
ON public.bookings
FOR INSERT
WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Les utilisateurs peuvent modifier leurs réservations"
ON public.bookings
FOR UPDATE
USING (
  auth.uid() = client_id OR 
  auth.uid() IN (
    SELECT s.provider_id FROM public.services s WHERE s.id = service_id
  )
)
WITH CHECK (
  auth.uid() = client_id OR 
  auth.uid() IN (
    SELECT s.provider_id FROM public.services s WHERE s.id = service_id
  )
);

-- Politiques RLS pour conversations
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer des conversations" ON public.conversations;

CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
ON public.conversations
FOR SELECT
USING (auth.uid() = participant1_id OR auth.uid() = participant2_id);

CREATE POLICY "Les utilisateurs peuvent créer des conversations"
ON public.conversations
FOR INSERT
WITH CHECK (auth.uid() = participant1_id OR auth.uid() = participant2_id);

-- Politiques RLS pour messages
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages;
DROP POLICY IF EXISTS "Les utilisateurs peuvent envoyer des messages" ON public.messages;

CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
ON public.messages
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
  )
);

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
ON public.messages
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations c 
    WHERE c.id = conversation_id 
    AND (auth.uid() = c.participant1_id OR auth.uid() = c.participant2_id)
  )
);

-- Politiques RLS pour invoices
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
DROP POLICY IF EXISTS "Les prestataires peuvent créer des factures" ON public.invoices;

CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
ON public.invoices
FOR SELECT
USING (
  auth.uid() = client_id OR 
  auth.uid() = provider_id
);

CREATE POLICY "Les prestataires peuvent créer des factures"
ON public.invoices
FOR INSERT
WITH CHECK (
  auth.uid() = provider_id
);

-- Politiques RLS pour audit_logs
DROP POLICY IF EXISTS "Seuls les administrateurs peuvent voir les logs d'audit" ON public.audit_logs;
DROP POLICY IF EXISTS "Insertion des logs d'audit via RPC uniquement" ON public.audit_logs;

CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND is_admin = true
  )
);

CREATE POLICY "Insertion des logs d'audit via RPC uniquement"
ON public.audit_logs
FOR INSERT
WITH CHECK (
  -- Cette politique est restrictive, l'insertion se fait via la fonction RPC log_audit_action
  false
);

-- Fonctions utilitaires
CREATE OR REPLACE FUNCTION public.log_audit_action(
  action TEXT,
  table_name TEXT,
  record_id TEXT,
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    action,
    table_name,
    record_id,
    user_id,
    old_data,
    new_data
  ) VALUES (
    action,
    table_name,
    record_id,
    auth.uid(),
    old_data,
    new_data
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  provider_exists BOOLEAN;
BEGIN
  -- Vérifier si l'utilisateur a des services (prestataire)
  SELECT EXISTS(
    SELECT 1 FROM public.services
    WHERE provider_id = $1
  ) INTO provider_exists;
  
  RETURN provider_exists;
END;
$$;

CREATE OR REPLACE FUNCTION public.check_invoice_permissions(invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  has_permission BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.invoices i
    WHERE i.id = invoice_id
    AND (i.client_id = auth.uid() OR i.provider_id = auth.uid())
  ) INTO has_permission;
  
  RETURN has_permission;
END;
$$;
