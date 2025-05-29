-- Script de mise à jour complète des tables de la base de données
-- Date: 2025-05-29
-- Auteur: FloService Développeur

---------------------------------------------------
-- 1. MISE À JOUR DES TABLES EXISTANTES
---------------------------------------------------

-- Profiles (correction des types et ajout de colonnes manquantes)
DO $$
BEGIN
  -- Vérifier la colonne is_provider
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_provider'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_provider BOOLEAN DEFAULT FALSE;
  END IF;
  
  -- Vérifier la colonne bio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN bio TEXT DEFAULT '';
  END IF;
  
  -- Vérifier la colonne avatar_url
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN avatar_url TEXT DEFAULT '';
  END IF;
  
  -- Vérifier la colonne website
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'website'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN website TEXT DEFAULT '';
  END IF;
  
  -- Vérifier la colonne last_seen
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT now();
  END IF;
  
  -- Mettre à jour les valeurs NULL
  UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL;
  UPDATE public.profiles SET bio = '' WHERE bio IS NULL;
  UPDATE public.profiles SET avatar_url = '' WHERE avatar_url IS NULL;
  UPDATE public.profiles SET website = '' WHERE website IS NULL;
END $$;

---------------------------------------------------
-- 2. TABLE PROVIDER_PROFILES
---------------------------------------------------

-- Créer la table provider_profiles si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'provider_profiles'
  ) THEN
    CREATE TABLE public.provider_profiles (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      category_id UUID,
      title VARCHAR(255),
      description TEXT,
      hourly_rate DECIMAL(10, 2),
      years_experience INTEGER,
      is_available BOOLEAN DEFAULT true,
      portfolio_images JSONB DEFAULT '[]'::jsonb,
      education TEXT,
      certifications TEXT,
      services_offered JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    CREATE INDEX idx_provider_profiles_user_id ON public.provider_profiles(user_id);
    CREATE INDEX idx_provider_profiles_category_id ON public.provider_profiles(category_id);
    
    -- Activer RLS
    ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
    
    -- Politique de lecture publique
    CREATE POLICY "Lecture publique des profils prestataires" 
      ON public.provider_profiles FOR SELECT USING (TRUE);
      
    -- Politique d'insertion/modification pour le propriétaire
    CREATE POLICY "Modification par le propriétaire" 
      ON public.provider_profiles FOR ALL 
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

---------------------------------------------------
-- 3. TABLE MESSAGES
---------------------------------------------------

-- Créer la table messages si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'messages'
  ) THEN
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      read BOOLEAN DEFAULT FALSE,
      attachment_url TEXT,
      attachment_type TEXT,
      attachment_name TEXT
    );
    
    CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
    CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
    CREATE INDEX idx_messages_created_at ON public.messages(created_at);
    
    -- Activer RLS
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Politique pour voir ses messages
    CREATE POLICY "Voir mes messages" ON public.messages 
      FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
      
    -- Politique pour envoyer des messages
    CREATE POLICY "Envoyer des messages" ON public.messages 
      FOR INSERT WITH CHECK (auth.uid() = sender_id);
      
    -- Politique pour marquer comme lu
    CREATE POLICY "Marquer comme lu" ON public.messages 
      FOR UPDATE USING (auth.uid() = recipient_id);
  ELSE
    -- Si la table existe déjà, vérifier les colonnes pour les pièces jointes
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'attachment_url'
    ) THEN
      ALTER TABLE public.messages ADD COLUMN attachment_url TEXT;
      ALTER TABLE public.messages ADD COLUMN attachment_type TEXT;
      ALTER TABLE public.messages ADD COLUMN attachment_name TEXT;
    END IF;
  END IF;
END $$;

---------------------------------------------------
-- 4. TABLE TRANSLATIONS
---------------------------------------------------

-- Créer la table translations si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'translations'
  ) THEN
    CREATE TABLE public.translations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      language TEXT NOT NULL,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(language, key)
    );
    
    -- Activer RLS
    ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
    
    -- Politique de lecture publique
    CREATE POLICY "Lecture publique des traductions" 
      ON public.translations FOR SELECT USING (TRUE);
      
    -- Insérer des traductions de base en français
    INSERT INTO public.translations (language, key, value) VALUES
      ('fr', 'welcome', 'Bienvenue'),
      ('fr', 'login', 'Connexion'),
      ('fr', 'register', 'Inscription'),
      ('fr', 'profile', 'Profil'),
      ('fr', 'dashboard', 'Tableau de bord'),
      ('fr', 'settings', 'Paramètres'),
      ('fr', 'logout', 'Déconnexion'),
      ('fr', 'name', 'Nom'),
      ('fr', 'email', 'Email'),
      ('fr', 'password', 'Mot de passe'),
      ('fr', 'confirm_password', 'Confirmer le mot de passe'),
      ('fr', 'submit', 'Soumettre'),
      ('fr', 'cancel', 'Annuler'),
      ('fr', 'save', 'Enregistrer'),
      ('fr', 'edit', 'Modifier'),
      ('fr', 'delete', 'Supprimer'),
      ('fr', 'error', 'Erreur'),
      ('fr', 'success', 'Succès'),
      ('fr', 'loading', 'Chargement'),
      ('fr', 'search', 'Rechercher'),
      ('fr', 'provider_registration', 'Inscription prestataire'),
      ('fr', 'hourly_rate', 'Taux horaire'),
      ('fr', 'experience', 'Expérience'),
      ('fr', 'portfolio', 'Portfolio'),
      ('fr', 'services', 'Services'),
      ('fr', 'category', 'Catégorie'),
      ('fr', 'description', 'Description'),
      ('fr', 'title', 'Titre'),
      ('fr', 'payment', 'Paiement'),
      ('fr', 'invoice', 'Facture');
  END IF;
END $$;

---------------------------------------------------
-- 5. TABLE INVOICES
---------------------------------------------------

-- Créer la table invoices si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'invoices'
  ) THEN
    CREATE TABLE public.invoices (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      provider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      amount DECIMAL(10, 2) NOT NULL,
      currency TEXT DEFAULT 'XOF',
      status TEXT DEFAULT 'pending',
      description TEXT,
      payment_id TEXT,
      payment_method TEXT,
      payment_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      metadata JSONB DEFAULT '{}'::jsonb
    );
    
    CREATE INDEX idx_invoices_user_id ON public.invoices(user_id);
    CREATE INDEX idx_invoices_provider_id ON public.invoices(provider_id);
    CREATE INDEX idx_invoices_status ON public.invoices(status);
    
    -- Activer RLS
    ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
    
    -- Politique pour voir ses factures (client ou prestataire)
    CREATE POLICY "Voir mes factures" ON public.invoices 
      FOR SELECT USING (auth.uid() = user_id OR auth.uid() = provider_id);
      
    -- Politique pour créer des factures (prestataire uniquement)
    CREATE POLICY "Créer des factures" ON public.invoices 
      FOR INSERT WITH CHECK (auth.uid() = provider_id);
  END IF;
END $$;

---------------------------------------------------
-- 6. TABLE CATEGORIES
---------------------------------------------------

-- Créer la table categories si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'categories'
  ) THEN
    CREATE TABLE public.categories (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      icon TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
    
    -- Activer RLS
    ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
    
    -- Politique de lecture publique
    CREATE POLICY "Lecture publique des catégories" 
      ON public.categories FOR SELECT USING (TRUE);
      
    -- Insérer quelques catégories de base
    INSERT INTO public.categories (name, description, icon) VALUES
      ('Plomberie', 'Services de plomberie et sanitaire', 'faucet-drip'),
      ('Électricité', 'Services d''électricité et câblage', 'bolt'),
      ('Menuiserie', 'Travaux de menuiserie et charpente', 'hammer'),
      ('Peinture', 'Travaux de peinture intérieure et extérieure', 'paint-roller'),
      ('Jardinage', 'Services d''entretien de jardin et espaces verts', 'leaf'),
      ('Nettoyage', 'Services de nettoyage et ménage', 'broom'),
      ('Informatique', 'Services de réparation et assistance informatique', 'laptop'),
      ('Cours particuliers', 'Services d''éducation et tutorat', 'book'),
      ('Beauté', 'Services de coiffure, manucure et beauté', 'scissors'),
      ('Transport', 'Services de transport et livraison', 'truck');
  END IF;
END $$;

---------------------------------------------------
-- 7. MISE À JOUR DES FONCTIONS
---------------------------------------------------

-- Fonction get_translations
DROP FUNCTION IF EXISTS public.get_translations(TEXT);
DROP FUNCTION IF EXISTS public.get_translations(p_language TEXT);

CREATE OR REPLACE FUNCTION public.get_translations(lang TEXT)
RETURNS SETOF public.translations AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.translations WHERE language = lang;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_translations(TEXT) TO anon, authenticated;

-- Fonction get_provider_status
DROP FUNCTION IF EXISTS public.get_provider_status(UUID);

CREATE OR REPLACE FUNCTION public.get_provider_status(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(is_provider, FALSE)
    FROM public.profiles
    WHERE id = user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION public.get_provider_status(UUID) TO anon, authenticated;

---------------------------------------------------
-- 8. PERMISSIONS GLOBALES
---------------------------------------------------

-- Permissions sur les tables
GRANT SELECT ON public.translations TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT ON public.provider_profiles TO anon, authenticated;
GRANT SELECT ON public.categories TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.invoices TO authenticated;
