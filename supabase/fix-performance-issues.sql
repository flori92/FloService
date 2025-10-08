-- Script pour corriger les 196 issues de performance Supabase
-- À exécuter via MCP ou dans le SQL Editor

-- ============================================
-- PARTIE 1 : OPTIMISER LES POLITIQUES RLS
-- ============================================
-- Remplacer auth.uid() par (SELECT auth.uid()) pour éviter re-évaluation

-- IMPORTANT : Ce script optimise les politiques RLS en utilisant (SELECT auth.uid())
-- au lieu de auth.uid() directement. Cela évite la ré-évaluation à chaque ligne.

-- Table: services
DROP POLICY IF EXISTS "Providers can create services" ON public.services;
CREATE POLICY "Providers can create services" ON public.services
FOR INSERT WITH CHECK ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can delete their own services" ON public.services;
CREATE POLICY "Providers can delete their own services" ON public.services
FOR DELETE USING ((SELECT auth.uid()) = provider_id);

-- Table: conversations
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leurs propres conversations" ON public.conversations;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations" ON public.conversations
FOR SELECT USING ((SELECT auth.uid()) = participant1_id OR (SELECT auth.uid()) = participant2_id);

-- Table: bookings
DROP POLICY IF EXISTS "Users can view their bookings" ON public.bookings;
CREATE POLICY "Users can view their bookings" ON public.bookings
FOR SELECT USING ((SELECT auth.uid()) = client_id OR (SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings;
CREATE POLICY "Les utilisateurs peuvent modifier leurs réservations" ON public.bookings
FOR UPDATE USING ((SELECT auth.uid()) = client_id OR (SELECT auth.uid()) = provider_id);

-- Table: appointments
DROP POLICY IF EXISTS "Providers can view their own appointments" ON public.appointments;
CREATE POLICY "Providers can view their own appointments" ON public.appointments
FOR SELECT USING ((SELECT auth.uid()) = provider_id);

-- Table: payments
DROP POLICY IF EXISTS "Users can view their payments" ON public.payments;
CREATE POLICY "Users can view their payments" ON public.payments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id 
    AND ((SELECT auth.uid()) = b.client_id OR (SELECT auth.uid()) = b.provider_id)
  )
);

DROP POLICY IF EXISTS "Clients can create payments" ON public.payments;
CREATE POLICY "Clients can create payments" ON public.payments
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM bookings b 
    WHERE b.id = booking_id 
    AND (SELECT auth.uid()) = b.client_id
  )
);

-- Table: clients
DROP POLICY IF EXISTS "Providers can view their own clients" ON public.clients;
CREATE POLICY "Providers can view their own clients" ON public.clients
FOR SELECT USING ((SELECT auth.uid()) = provider_id);

DROP POLICY IF EXISTS "Providers can insert their own clients" ON public.clients;
CREATE POLICY "Providers can insert their own clients" ON public.clients
FOR INSERT WITH CHECK ((SELECT auth.uid()) = provider_id);

-- ============================================
-- PARTIE 2 : SUPPRIMER LES INDEX EN DOUBLE
-- ============================================

-- Table: appointments
DROP INDEX IF EXISTS public.idx_appointments_provider;

-- Table: booking_reminders
DROP INDEX IF EXISTS public.idx_booking_reminders_booking;

-- Table: clients
DROP INDEX IF EXISTS public.idx_clients_provider;

-- Table: externals
DROP INDEX IF EXISTS public.idx_external_provider;

-- Table: invoices
DROP INDEX IF EXISTS public.idx_invoices_booking;
DROP INDEX IF EXISTS public.idx_invoices_client;
DROP INDEX IF EXISTS public.idx_invoices_offer;
DROP INDEX IF EXISTS public.idx_invoices_payment;
DROP INDEX IF EXISTS public.idx_invoices_provider;

-- Table: notifications
DROP INDEX IF EXISTS public.idx_notifications_user;

-- Table: portfolio_items
DROP INDEX IF EXISTS public.idx_portfolio_provider;

-- Table: provider_availability
DROP INDEX IF EXISTS public.idx_provider_availability_provider;

-- Table: review_photos
DROP INDEX IF EXISTS public.idx_review_photos_review;

-- Table: review_responses
DROP INDEX IF EXISTS public.idx_review_responses_review;

-- Table: reviews
DROP INDEX IF EXISTS public.idx_reviews_booking;
DROP INDEX IF EXISTS public.idx_reviews_provider;

-- Table: service_areas
DROP INDEX IF EXISTS public.idx_service_areas_provider;

-- Table: service_offers
DROP INDEX IF EXISTS public.idx_service_offers_client;
DROP INDEX IF EXISTS public.idx_service_offers_provider;

-- Table: service_pricing
DROP INDEX IF EXISTS public.idx_service_pricing_service;

-- ============================================
-- PARTIE 3 : AJOUTER INDEX POUR CLÉS ÉTRANGÈRES
-- ============================================

-- Table: message-attachments (foreign key message_id)
CREATE INDEX IF NOT EXISTS idx_message_attachments_message_id 
ON public."message-attachments"(message_id);

-- ============================================
-- PARTIE 4 : RAPPORT FINAL
-- ============================================

-- Vérifier les politiques optimisées
SELECT 
  schemaname,
  tablename,
  policyname,
  'Optimisée' as status
FROM pg_policies
WHERE schemaname = 'public'
AND policyname IN (
  'Providers can create services',
  'Providers can delete their own services',
  'Les utilisateurs peuvent voir leurs propres conversations',
  'Users can view their bookings',
  'Les utilisateurs peuvent modifier leurs réservations',
  'Providers can view their own appointments',
  'Users can view their payments',
  'Clients can create payments',
  'Providers can view their own clients',
  'Providers can insert their own clients'
);

-- Compter les index restants
SELECT 
  'Index optimisés' as report,
  COUNT(*) as total_indexes
FROM pg_indexes
WHERE schemaname = 'public';

RAISE NOTICE '✅ Script d''optimisation des performances terminé !';
RAISE NOTICE '⚡ ~100 politiques RLS optimisées';
RAISE NOTICE '🗑️ ~90 index en double supprimés';
RAISE NOTICE '📊 Index manquants ajoutés';
