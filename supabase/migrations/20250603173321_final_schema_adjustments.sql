-- Migration finale simplifiée pour synchroniser les schémas
-- Ajustement des contraintes NOT NULL et des valeurs par défaut

-- Ajustement des contraintes pour provider_applications
DO $$
BEGIN
  -- Suppression de la valeur par défaut pour status dans conversations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'conversations') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'conversations' AND column_name = 'status') THEN
      ALTER TABLE public.conversations ALTER COLUMN status DROP DEFAULT;
    END IF;
  END IF;
END
$$;

-- Ajustement des contraintes pour withdrawals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'commission') THEN
      ALTER TABLE public.withdrawals ALTER COLUMN commission DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'withdrawals' AND column_name = 'mobile_wallet_number') THEN
      ALTER TABLE public.withdrawals ALTER COLUMN mobile_wallet_number DROP NOT NULL;
    END IF;
  END IF;
END
$$;

-- Ajustement des contraintes pour provider_applications
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'provider_applications') THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'provider_applications' AND column_name = 'address') THEN
      ALTER TABLE public.provider_applications ALTER COLUMN address DROP NOT NULL;
    END IF;
  END IF;
END
$$;