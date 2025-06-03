-- Table des paiements (séquestre, commission, historique)
DO $$
BEGIN
  -- Créer d'abord la table sans les contraintes de clés étrangères
  CREATE TABLE IF NOT EXISTS payments (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid,
    client_id uuid,
    provider_id uuid,
    amount integer not null,
    commission integer not null default 100,
    status text not null check (status in ('pending', 'escrow', 'available', 'transferred')),
    created_at timestamptz default now(),
    released_at timestamptz,
    transfer_request_id uuid
  );
  
  -- Ajouter les contraintes de clés étrangères si les tables référencées existent et les colonnes existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookings') 
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'booking_id') THEN
    BEGIN
      ALTER TABLE payments ADD CONSTRAINT fk_payments_booking_id FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_payments_booking_id already exists';
    END;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- Vérifier si la colonne client_id existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'client_id') THEN
      BEGIN
        ALTER TABLE payments ADD CONSTRAINT fk_payments_client_id FOREIGN KEY (client_id) REFERENCES profiles(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint fk_payments_client_id already exists';
      END;
    END IF;
    
    -- Vérifier si la colonne provider_id existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'provider_id') THEN
      BEGIN
        ALTER TABLE payments ADD CONSTRAINT fk_payments_provider_id FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE 'Foreign key constraint fk_payments_provider_id already exists';
      END;
    END IF;
  END IF;
  
  -- La contrainte pour transfer_request_id sera ajoutée après la création de la table withdrawals
END;
$$;

-- Table des retraits (withdrawals)
DO $$
BEGIN
  -- Créer d'abord la table sans les contraintes de clés étrangères
  CREATE TABLE IF NOT EXISTS withdrawals (
    id uuid primary key default gen_random_uuid(),
    provider_id uuid,
    amount integer not null,
    commission integer not null default 100,
    status text not null check (status in ('pending', 'completed', 'failed')),
    mobile_wallet_number text not null,
    wallet_operator text,
    requested_at timestamptz default now(),
    completed_at timestamptz
  );
  
  -- Ajouter les contraintes de clés étrangères si les tables référencées existent
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    BEGIN
      ALTER TABLE withdrawals ADD CONSTRAINT fk_withdrawals_provider_id FOREIGN KEY (provider_id) REFERENCES profiles(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_withdrawals_provider_id already exists';
    END;
  END IF;
  
  -- Maintenant que la table withdrawals existe, ajouter la contrainte sur payments.transfer_request_id
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals')
     AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'transfer_request_id') THEN
    BEGIN
      ALTER TABLE payments ADD CONSTRAINT fk_payments_transfer_request_id FOREIGN KEY (transfer_request_id) REFERENCES withdrawals(id);
    EXCEPTION WHEN duplicate_object THEN
      RAISE NOTICE 'Foreign key constraint fk_payments_transfer_request_id already exists';
    END;
  END IF;
END;
$$;

-- Index pour la rapidité
DO $$
BEGIN
  -- Vérifier si la table payments existe et si la colonne provider_id existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'provider_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_provider ON payments(provider_id)';
    END IF;
  END IF;
  
  -- Vérifier si la table withdrawals existe et si la colonne provider_id existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'withdrawals') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'withdrawals' AND column_name = 'provider_id') THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_withdrawals_provider ON withdrawals(provider_id)';
    END IF;
  END IF;
END;
$$;
