-- Migration pour synchroniser les différences de schéma entre les bases de données locale et distante
-- Cette migration est idempotente et utilise des vérifications conditionnelles pour éviter les erreurs

-- Ajout des types manquants
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status') THEN
    CREATE TYPE public.conversation_status AS ENUM ('active', 'archived', 'blocked');
  END IF;
END
$$;

-- Ajout des colonnes manquantes dans les tables existantes
DO $$
BEGIN
  -- Table conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'client_external_id') THEN
      ALTER TABLE public.conversations ADD COLUMN client_external_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
      ALTER TABLE public.conversations ADD COLUMN status conversation_status DEFAULT 'active'::conversation_status;
    END IF;
    
    -- Vérifier si la colonne last_message_time existe et n'a pas de valeur par défaut
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'last_message_time') THEN
      ALTER TABLE public.conversations ALTER COLUMN last_message_time SET DEFAULT now();
    END IF;
  END IF;

  -- Table messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'file_type') THEN
      ALTER TABLE public.messages ADD COLUMN file_type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'file_url') THEN
      ALTER TABLE public.messages ADD COLUMN file_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'media_metadata') THEN
      ALTER TABLE public.messages ADD COLUMN media_metadata JSONB;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'media_url') THEN
      ALTER TABLE public.messages ADD COLUMN media_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type') THEN
      ALTER TABLE public.messages ADD COLUMN message_type TEXT DEFAULT 'text';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'receiver_id') THEN
      ALTER TABLE public.messages ADD COLUMN receiver_id UUID;
    END IF;
  END IF;

  -- Table message_attachments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_attachments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_url') THEN
      ALTER TABLE public.message_attachments ADD COLUMN file_url TEXT;
    END IF;
    
    -- Modifier les contraintes de NOT NULL si nécessaire
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_size' AND is_nullable = 'NO') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_size DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_type' AND is_nullable = 'NO') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_type DROP NOT NULL;
    END IF;
  END IF;

  -- Table bookings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount') THEN
      ALTER TABLE public.bookings ADD COLUMN amount NUMERIC(10,2);
    END IF;
  END IF;

  -- Table profiles
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'city') THEN
      ALTER TABLE public.profiles ADD COLUMN city TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_online') THEN
      ALTER TABLE public.profiles ADD COLUMN is_online BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'location') THEN
      ALTER TABLE public.profiles ADD COLUMN location TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'search_vector') THEN
      ALTER TABLE public.profiles ADD COLUMN search_vector tsvector;
    END IF;
  END IF;

  -- Table service_offers
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'service_offers') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'service_offers' AND column_name = 'payment_link_id') THEN
      ALTER TABLE public.service_offers ADD COLUMN payment_link_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'service_offers' AND column_name = 'service_id') THEN
      ALTER TABLE public.service_offers ADD COLUMN service_id UUID;
    END IF;
  END IF;

  -- Table services
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'category') THEN
      ALTER TABLE public.services ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'duration') THEN
      ALTER TABLE public.services ADD COLUMN duration INTEGER;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'image_url') THEN
      ALTER TABLE public.services ADD COLUMN image_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'is_active') THEN
      ALTER TABLE public.services ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'subcategory') THEN
      ALTER TABLE public.services ADD COLUMN subcategory TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'updated_at') THEN
      ALTER TABLE public.services ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
    END IF;
  END IF;

  -- Table translations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'translations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'en') THEN
      ALTER TABLE public.translations ADD COLUMN en TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'fr') THEN
      ALTER TABLE public.translations ADD COLUMN fr TEXT;
    END IF;
  END IF;
END
$$;

-- Création des tables manquantes
DO $$
BEGIN
  -- Table provider_applications
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_applications') THEN
    CREATE TABLE public.provider_applications (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      status TEXT DEFAULT 'pending',
      application_data JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Ajout des politiques RLS pour provider_applications
    CREATE POLICY "Les utilisateurs peuvent voir leurs propres candidatures"
      ON provider_applications
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
      
    CREATE POLICY "Les utilisateurs peuvent créer leurs propres candidatures"
      ON provider_applications
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
      
    CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres candidatures"
      ON provider_applications
      FOR UPDATE
      TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
  
  -- Table withdrawals
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    CREATE TABLE public.withdrawals (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
      amount NUMERIC(10,2) NOT NULL,
      status TEXT DEFAULT 'pending',
      payment_details JSONB,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Ajout des politiques RLS pour withdrawals
    CREATE POLICY "Les utilisateurs peuvent voir leurs propres retraits"
      ON withdrawals
      FOR SELECT
      TO authenticated
      USING (user_id = auth.uid());
      
    CREATE POLICY "Les utilisateurs peuvent créer leurs propres retraits"
      ON withdrawals
      FOR INSERT
      TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END
$$;

-- Création des index manquants
DO $$
BEGIN
  -- Index pour reviews_ratings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reviews') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reviews' AND column_name = 'rating') THEN
      IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'reviews' AND indexname = 'idx_reviews_ratings') THEN
        CREATE INDEX idx_reviews_ratings ON public.reviews(rating);
      END IF;
    END IF;
  END IF;
  
  -- Index pour translations_key
  -- Nous ne créons pas cet index car il existe déjà sur la base distante
  -- et cause des erreurs lors de la migration
END
$$;