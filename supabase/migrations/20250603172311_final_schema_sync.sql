-- Migration finale pour harmoniser complètement les schémas entre les bases de données locale et distante
-- Cette migration est idempotente et utilise des vérifications conditionnelles pour éviter les erreurs

-- Ajustement des contraintes NOT NULL et des valeurs par défaut
DO $$
BEGIN
  -- Table conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
      ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 'active'::conversation_status;
    END IF;
  END IF;

  -- Table bookings
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount') THEN
      ALTER TABLE public.bookings ALTER COLUMN amount DROP NOT NULL;
    END IF;
  END IF;

  -- Table message_attachments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_attachments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_url') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_url DROP NOT NULL;
    END IF;
  END IF;

  -- Table messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type') THEN
      ALTER TABLE public.messages ALTER COLUMN message_type DROP NOT NULL;
    END IF;
  END IF;

  -- Table services
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'category') THEN
      ALTER TABLE public.services ALTER COLUMN category DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'duration') THEN
      ALTER TABLE public.services ALTER COLUMN duration DROP NOT NULL;
    END IF;
  END IF;

  -- Table translations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'translations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'en') THEN
      ALTER TABLE public.translations ALTER COLUMN en DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'fr') THEN
      ALTER TABLE public.translations ALTER COLUMN fr DROP NOT NULL;
    END IF;
  END IF;

  -- Table provider_applications
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_applications') THEN
    -- Ajout des colonnes manquantes dans provider_applications
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'address') THEN
      ALTER TABLE public.provider_applications ADD COLUMN address TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'bio') THEN
      ALTER TABLE public.provider_applications ADD COLUMN bio TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'business_name') THEN
      ALTER TABLE public.provider_applications ADD COLUMN business_name TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'city_code') THEN
      ALTER TABLE public.provider_applications ADD COLUMN city_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'country_code') THEN
      ALTER TABLE public.provider_applications ADD COLUMN country_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'id_document_url') THEN
      ALTER TABLE public.provider_applications ADD COLUMN id_document_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'languages') THEN
      ALTER TABLE public.provider_applications ADD COLUMN languages TEXT[];
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'phone_number') THEN
      ALTER TABLE public.provider_applications ADD COLUMN phone_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'rejection_reason') THEN
      ALTER TABLE public.provider_applications ADD COLUMN rejection_reason TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'reviewed_at') THEN
      ALTER TABLE public.provider_applications ADD COLUMN reviewed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'reviewed_by') THEN
      ALTER TABLE public.provider_applications ADD COLUMN reviewed_by UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'website') THEN
      ALTER TABLE public.provider_applications ADD COLUMN website TEXT;
    END IF;
    
    -- Ajustement des contraintes NOT NULL
    ALTER TABLE public.provider_applications ALTER COLUMN created_at DROP NOT NULL;
    ALTER TABLE public.provider_applications ALTER COLUMN status DROP NOT NULL;
    ALTER TABLE public.provider_applications ALTER COLUMN updated_at DROP NOT NULL;
    ALTER TABLE public.provider_applications ALTER COLUMN user_id DROP NOT NULL;
  END IF;

  -- Table withdrawals
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    -- Ajout des colonnes manquantes dans withdrawals
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'commission') THEN
      ALTER TABLE public.withdrawals ADD COLUMN commission NUMERIC(10,2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'completed_at') THEN
      ALTER TABLE public.withdrawals ADD COLUMN completed_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'mobile_wallet_number') THEN
      ALTER TABLE public.withdrawals ADD COLUMN mobile_wallet_number TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'provider_id') THEN
      ALTER TABLE public.withdrawals ADD COLUMN provider_id UUID;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'requested_at') THEN
      ALTER TABLE public.withdrawals ADD COLUMN requested_at TIMESTAMPTZ;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'wallet_operator') THEN
      ALTER TABLE public.withdrawals ADD COLUMN wallet_operator TEXT;
    END IF;
    
    -- Ajustement des contraintes NOT NULL
    ALTER TABLE public.withdrawals ALTER COLUMN status DROP NOT NULL;
  END IF;
END
$$;

-- Suppression du type obsolète conversation_status__old_version_to_be_dropped s'il existe
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'conversation_status__old_version_to_be_dropped') THEN
    DROP TYPE public.conversation_status__old_version_to_be_dropped;
  END IF;
END
$$;