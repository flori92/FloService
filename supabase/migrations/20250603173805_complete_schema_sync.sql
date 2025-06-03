-- Migration finale pour synchroniser complètement les schémas
-- Ajustement des contraintes NOT NULL et des valeurs par défaut manquantes

-- Extension pgjwt
CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";

-- Ajustements pour bookings
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bookings') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'amount') THEN
      ALTER TABLE public.bookings ALTER COLUMN amount SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour conversations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
      ALTER TABLE public.conversations ALTER COLUMN status SET DEFAULT 'active'::conversation_status;
    END IF;
  END IF;
END
$$;

-- Ajustements pour message_attachments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'message_attachments') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_size') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_size SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_type') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_type SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'message_attachments' AND column_name = 'file_url') THEN
      ALTER TABLE public.message_attachments ALTER COLUMN file_url SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour messages
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'messages') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'message_type') THEN
      ALTER TABLE public.messages ALTER COLUMN message_type SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour provider_applications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_applications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'address') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN address SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'created_at') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN created_at SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'status') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN status SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'updated_at') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN updated_at SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'user_id') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN user_id SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour services
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'services') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'category') THEN
      ALTER TABLE public.services ALTER COLUMN category SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'services' AND column_name = 'duration') THEN
      ALTER TABLE public.services ALTER COLUMN duration SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour translations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'translations') THEN
    -- Mise à jour des valeurs NULL dans la colonne 'en'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'en') THEN
      UPDATE public.translations SET en = '' WHERE en IS NULL;
      ALTER TABLE public.translations ALTER COLUMN en SET NOT NULL;
    END IF;
    
    -- Mise à jour des valeurs NULL dans la colonne 'fr'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'fr') THEN
      UPDATE public.translations SET fr = '' WHERE fr IS NULL;
      ALTER TABLE public.translations ALTER COLUMN fr SET NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustements pour withdrawals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'commission') THEN
      ALTER TABLE public.withdrawals ALTER COLUMN commission SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'mobile_wallet_number') THEN
      ALTER TABLE public.withdrawals ALTER COLUMN mobile_wallet_number SET NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'status') THEN
      ALTER TABLE public.withdrawals ALTER COLUMN status SET NOT NULL;
    END IF;
  END IF;
END
$$;