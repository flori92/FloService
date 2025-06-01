-- Script de correction et amélioration de la sécurité pour FloService
-- Date: 2025-06-01
-- Auteur: Cascade

-- ======================================================
-- 1. ACTIVATION DU ROW LEVEL SECURITY (RLS) SUR TOUTES LES TABLES
-- ======================================================

DO $$
DECLARE
  table_record RECORD;
BEGIN
  FOR table_record IN 
    SELECT tablename 
    FROM pg_tables 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_record.tablename);
    RAISE NOTICE 'RLS activé sur la table %', table_record.tablename;
  END LOOP;
END
$$;

-- ======================================================
-- 2. CORRECTION DES POLITIQUES DE SÉCURITÉ DEFINER
-- ======================================================

-- Remplacer les vues SECURITY DEFINER problématiques par des vues SECURITY INVOKER
DO $$
DECLARE
  view_record RECORD;
BEGIN
  -- Identifier les vues avec SECURITY DEFINER
  FOR view_record IN 
    SELECT viewname 
    FROM pg_views 
    WHERE schemaname = 'public' 
    AND definition LIKE '%SECURITY DEFINER%'
  LOOP
    -- Récupérer la définition de la vue
    DECLARE
      view_def TEXT;
    BEGIN
      SELECT definition INTO view_def 
      FROM pg_views 
      WHERE schemaname = 'public' 
      AND viewname = view_record.viewname;
      
      -- Remplacer SECURITY DEFINER par SECURITY INVOKER
      view_def := REPLACE(view_def, 'SECURITY DEFINER', 'SECURITY INVOKER');
      
      -- Recréer la vue
      EXECUTE format('DROP VIEW IF EXISTS public.%I CASCADE', view_record.viewname);
      EXECUTE view_def;
      
      RAISE NOTICE 'Vue % modifiée pour utiliser SECURITY INVOKER', view_record.viewname;
    END;
  END LOOP;
END
$$;

-- ======================================================
-- 3. CRÉATION D'INDEX POUR LES CLÉS ÉTRANGÈRES NON INDEXÉES
-- ======================================================

DO $$
DECLARE
  fk_record RECORD;
  index_name TEXT;
  column_name TEXT;
  table_name TEXT;
BEGIN
  FOR fk_record IN
    SELECT
      tc.table_schema, 
      tc.table_name, 
      kcu.column_name
    FROM 
      information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE 
      tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
  LOOP
    table_name := fk_record.table_name;
    column_name := fk_record.column_name;
    index_name := format('idx_%s_%s', table_name, column_name);
    
    -- Vérifier si l'index existe déjà
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_indexes 
      WHERE schemaname = 'public' 
      AND tablename = table_name 
      AND indexname = index_name
    ) THEN
      -- Créer l'index s'il n'existe pas
      EXECUTE format('CREATE INDEX %I ON public.%I (%I)', 
                    index_name, table_name, column_name);
      RAISE NOTICE 'Index % créé sur %.%', index_name, table_name, column_name;
    END IF;
  END LOOP;
END
$$;

-- ======================================================
-- 4. CORRECTION DES POLITIQUES RLS POUR LES TABLES CRITIQUES
-- ======================================================

-- Table profiles
DROP POLICY IF EXISTS "Accès public en lecture pour profiles" ON public.profiles;
CREATE POLICY "Accès public en lecture pour profiles"
  ON public.profiles
  FOR SELECT
  USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Table provider_profiles
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur propre profil" ON public.provider_profiles;
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON public.provider_profiles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Table services
DROP POLICY IF EXISTS "Accès public en lecture pour services" ON public.services;
CREATE POLICY "Accès public en lecture pour services"
  ON public.services
  FOR SELECT
  USING (true);

CREATE POLICY "Les prestataires peuvent gérer leurs services"
  ON public.services
  FOR ALL
  USING (
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles WHERE user_id = auth.uid()
    )
  );

-- Table bookings
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs réservations" ON public.bookings;
CREATE POLICY "Les utilisateurs peuvent voir leurs réservations"
  ON public.bookings
  FOR SELECT
  USING (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
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
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
    )
  )
  WITH CHECK (
    auth.uid() = client_id OR 
    auth.uid() IN (
      SELECT user_id FROM public.provider_profiles 
      WHERE user_id = (SELECT provider_id FROM public.services WHERE id = service_id)
    )
  );

-- Table conversations
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs conversations" ON public.conversations;
CREATE POLICY "Les utilisateurs peuvent voir leurs conversations"
  ON public.conversations
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

CREATE POLICY "Les utilisateurs peuvent créer des conversations"
  ON public.conversations
  FOR INSERT
  WITH CHECK (auth.uid() = client_id OR auth.uid() = provider_id);

-- Table messages
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs messages" ON public.messages;
CREATE POLICY "Les utilisateurs peuvent voir leurs messages"
  ON public.messages
  FOR SELECT
  USING (
    auth.uid() = sender_id OR
    auth.uid() IN (
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );

CREATE POLICY "Les utilisateurs peuvent envoyer des messages"
  ON public.messages
  FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    auth.uid() IN (
      SELECT client_id FROM public.conversations WHERE id = conversation_id
      UNION
      SELECT provider_id FROM public.conversations WHERE id = conversation_id
    )
  );

-- Table invoices
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs factures" ON public.invoices;
CREATE POLICY "Les utilisateurs peuvent voir leurs factures"
  ON public.invoices
  FOR SELECT
  USING (auth.uid() = client_id OR auth.uid() = provider_id);

-- ======================================================
-- 5. AMÉLIORATION DE LA SÉCURITÉ DES FONCTIONS RPC
-- ======================================================

-- Fonction pour vérifier si un utilisateur est un prestataire
CREATE OR REPLACE FUNCTION public.is_provider(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = user_id AND is_provider = true
  );
END;
$$;

-- Fonction pour vérifier la disponibilité d'un prestataire
CREATE OR REPLACE FUNCTION public.check_provider_availability(
  provider_id UUID,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  -- Vérifier si le créneau est déjà réservé
  IF EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.services s ON b.service_id = s.id
    WHERE s.provider_id = check_provider_availability.provider_id
    AND b.status != 'cancelled'
    AND (
      (b.start_time <= check_provider_availability.start_time AND b.end_time > check_provider_availability.start_time)
      OR
      (b.start_time < check_provider_availability.end_time AND b.end_time >= check_provider_availability.end_time)
      OR
      (b.start_time >= check_provider_availability.start_time AND b.end_time <= check_provider_availability.end_time)
    )
  ) THEN
    RETURN FALSE;
  END IF;
  
  -- Vérifier les disponibilités régulières
  -- (Cette partie dépend de la structure exacte de vos tables de disponibilité)
  
  RETURN TRUE;
END;
$$;

-- ======================================================
-- 6. AUDIT ET JOURNALISATION
-- ======================================================

-- Créer une table d'audit pour les opérations sensibles
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur la table d'audit
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Seuls les administrateurs peuvent voir les logs d'audit
CREATE POLICY "Seuls les administrateurs peuvent voir les logs d'audit"
  ON public.audit_logs
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

-- Fonction pour enregistrer une action d'audit
CREATE OR REPLACE FUNCTION public.log_audit_action(
  action TEXT,
  table_name TEXT,
  record_id UUID,
  old_data JSONB DEFAULT NULL,
  new_data JSONB DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_logs (
    user_id,
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    ip_address,
    user_agent
  )
  VALUES (
    auth.uid(),
    action,
    table_name,
    record_id,
    old_data,
    new_data,
    current_setting('request.headers', true)::json->>'x-forwarded-for',
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Éviter que les erreurs d'audit n'interrompent les opérations normales
    NULL;
END;
$$;

-- ======================================================
-- 7. VALIDATION DES DONNÉES ET CONTRAINTES
-- ======================================================

-- Ajouter des contraintes de validation sur les tables critiques
ALTER TABLE public.profiles
ADD CONSTRAINT check_email_format
CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$');

ALTER TABLE public.services
ADD CONSTRAINT check_price_positive
CHECK (price >= 0);

ALTER TABLE public.bookings
ADD CONSTRAINT check_booking_dates
CHECK (start_time < end_time);

-- ======================================================
-- 8. NETTOYAGE DES DONNÉES SENSIBLES
-- ======================================================

-- Fonction pour masquer les données sensibles dans les réponses API
CREATE OR REPLACE FUNCTION public.mask_sensitive_data()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  -- Masquer les données sensibles avant de les retourner
  IF TG_TABLE_NAME = 'profiles' THEN
    NEW.phone = CASE 
      WHEN auth.uid() = NEW.id OR public.is_admin(auth.uid()) THEN NEW.phone
      ELSE SUBSTRING(NEW.phone, 1, 3) || '****' || SUBSTRING(NEW.phone, LENGTH(NEW.phone) - 3, 4)
    END;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Appliquer le trigger sur la table profiles
DROP TRIGGER IF EXISTS mask_sensitive_data_profiles ON public.profiles;
CREATE TRIGGER mask_sensitive_data_profiles
  BEFORE SELECT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.mask_sensitive_data();

-- ======================================================
-- 9. SÉCURISATION DES FONCTIONS EDGE
-- ======================================================

-- Fonction pour vérifier les autorisations avant d'envoyer une facture
CREATE OR REPLACE FUNCTION public.check_invoice_permissions(invoice_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invoices
    WHERE id = invoice_id
    AND (client_id = auth.uid() OR provider_id = auth.uid())
  );
END;
$$;

-- ======================================================
-- 10. PROTECTION CONTRE LES INJECTIONS SQL
-- ======================================================

-- Fonction pour échapper les entrées utilisateur dans les recherches
CREATE OR REPLACE FUNCTION public.safe_search(search_term TEXT)
RETURNS TEXT
LANGUAGE plpgsql SECURITY INVOKER
AS $$
BEGIN
  -- Échapper les caractères spéciaux pour éviter les injections SQL
  RETURN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
    search_term,
    '%', '\%'),
    '_', '\_'),
    '\', '\\'),
    '"', '\"'),
    '''', '''''');
END;
$$;
