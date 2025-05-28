-- Script corrigé pour créer manuellement les tables manquantes
-- Date: 2025-05-28

-- 1. Vérifier et modifier la table des messages si nécessaire
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.messages'::regclass AND attname = 'has_attachment') THEN
        ALTER TABLE public.messages ADD COLUMN has_attachment BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Créer la table des factures si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_offers') THEN
        CREATE TABLE public.service_offers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            description TEXT,
            status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'cancelled', 'completed')),
            payment_link TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            expires_at TIMESTAMPTZ,
            paid_at TIMESTAMPTZ
        );
    END IF;
END $$;

-- 3. Créer la table des paiements si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') THEN
        CREATE TABLE public.payments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            client_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            commission INTEGER NOT NULL DEFAULT 100,
            status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'escrow', 'released')),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            completed_at TIMESTAMPTZ
        );
    END IF;
END $$;

-- 4. Créer la table des factures si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        CREATE TABLE public.invoices (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
            offer_id UUID REFERENCES public.service_offers(id) ON DELETE SET NULL,
            provider_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
            client_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
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

        -- Créer les index pour la table invoices
        CREATE INDEX idx_invoices_provider ON public.invoices(provider_id);
        CREATE INDEX idx_invoices_client ON public.invoices(client_id);
        CREATE INDEX idx_invoices_payment ON public.invoices(payment_id);
        CREATE INDEX idx_invoices_offer ON public.invoices(offer_id);
    END IF;
END $$;

-- 5. Créer un bucket de stockage pour les factures PDF si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('invoices', 'invoices', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Créer les politiques de sécurité pour le bucket de factures
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les factures sont accessibles publiquement') THEN
        CREATE POLICY "Les factures sont accessibles publiquement"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'invoices');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Seuls les administrateurs peuvent insérer des factures') THEN
        CREATE POLICY "Seuls les administrateurs peuvent insérer des factures"
            ON storage.objects FOR INSERT
            USING (bucket_id = 'invoices' AND (auth.role() = 'service_role' OR auth.role() = 'authenticated'));
    END IF;
END $$;

-- 7. Créer un bucket de stockage pour les pièces jointes si nécessaire
INSERT INTO storage.buckets (id, name, public) 
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

-- 8. Créer les politiques de sécurité pour le bucket d'attachments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les pièces jointes sont accessibles publiquement') THEN
        CREATE POLICY "Les pièces jointes sont accessibles publiquement"
            ON storage.objects FOR SELECT
            USING (bucket_id = 'attachments');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Les utilisateurs authentifiés peuvent télécharger des pièces jointes') THEN
        CREATE POLICY "Les utilisateurs authentifiés peuvent télécharger des pièces jointes"
            ON storage.objects FOR INSERT
            USING (bucket_id = 'attachments' AND auth.role() = 'authenticated');
    END IF;
END $$;
