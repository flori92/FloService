-- Table pour les factures automatiques
DO $$
BEGIN
  -- Créer d'abord la table sans les contraintes de clés étrangères
  CREATE TABLE IF NOT EXISTS invoices (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz default now(),
    payment_id uuid,
    offer_id uuid,
    provider_id uuid,
    client_id uuid,
    amount integer not null,
    commission integer not null default 100,
    tax_rate integer not null default 18,
    tax_amount integer not null,
    total_amount integer not null,
    status text not null check (status in ('draft', 'sent', 'paid')),
    invoice_number text not null unique,
    invoice_url text,
    provider_details jsonb,
    client_details jsonb
  );
  
  -- Ajouter les contraintes de clés étrangères si les tables référencées existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    BEGIN
      ALTER TABLE invoices ADD CONSTRAINT fk_invoices_payment_id FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_invoices_payment_id already exists';
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_offers') THEN
    BEGIN
      ALTER TABLE invoices ADD CONSTRAINT fk_invoices_offer_id FOREIGN KEY (offer_id) REFERENCES service_offers(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_invoices_offer_id already exists';
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE invoices ADD CONSTRAINT fk_invoices_provider_id FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_invoices_provider_id already exists';
    END;
    
    BEGIN
      ALTER TABLE invoices ADD CONSTRAINT fk_invoices_client_id FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_invoices_client_id already exists';
    END;
  END IF;
END;
$$;

-- Index pour la performance
DO $$
BEGIN
  -- Vérifier si la table invoices existe et si les colonnes existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'provider_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_provider ON invoices(provider_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'client_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'payment_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_payment ON invoices(payment_id)';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'offer_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_invoices_offer ON invoices(offer_id)';
    END IF;
  END IF;
END;
$$;

-- Créer un bucket de stockage pour les factures PDF
DO $$
BEGIN
  -- Vérifier si le schéma storage existe
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    -- Vérifier si la table buckets existe dans le schéma storage
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'buckets') THEN
      -- Insérer le bucket s'il n'existe pas déjà
      EXECUTE 'INSERT INTO storage.buckets (id, name, public) VALUES (''invoices'', ''invoices'', true) ON CONFLICT (id) DO NOTHING';
      
      -- Vérifier si la table objects existe dans le schéma storage
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
        -- Créer les politiques si elles n'existent pas déjà
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Les factures sont accessibles publiquement') THEN
          EXECUTE 'CREATE POLICY "Les factures sont accessibles publiquement" ON storage.objects FOR SELECT USING (bucket_id = ''invoices'')';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'Seuls les administrateurs peuvent insérer des factures') THEN
          EXECUTE 'CREATE POLICY "Seuls les administrateurs peuvent insérer des factures" ON storage.objects FOR INSERT WITH CHECK (bucket_id = ''invoices'' AND (auth.role() = ''service_role'' OR auth.role() = ''authenticated''))';
        END IF;
      END IF;
    END IF;
  END IF;
END;
$$;
