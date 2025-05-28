-- Script de correction complète des problèmes d'API REST Supabase
-- Date: 2025-05-28

---------------------------------------------------------
-- 1. CORRECTION DE LA TABLE TRANSLATIONS ET SA FONCTION
---------------------------------------------------------

-- Supprimer complètement la fonction existante pour éviter les conflits
DROP FUNCTION IF EXISTS public.get_translations(TEXT);
DROP FUNCTION IF EXISTS public.get_translations(p_language TEXT);

-- Créer/Recréer la table des traductions si nécessaire
DO $$
BEGIN
  -- Vérifier si la table existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'translations'
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
    
    -- Activer RLS et créer une politique pour tous
    ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Accès public en lecture aux traductions" 
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
      ('fr', 'search', 'Rechercher');
  END IF;
END $$;

-- Créer la fonction get_translations avec la signature exacte
CREATE OR REPLACE FUNCTION public.get_translations(lang TEXT)
RETURNS SETOF public.translations AS $$
BEGIN
  RETURN QUERY SELECT * FROM public.translations WHERE language = lang;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accorder les permissions d'exécution à tous les rôles
GRANT EXECUTE ON FUNCTION public.get_translations(TEXT) TO anon, authenticated;

---------------------------------------------------------
-- 2. CORRECTION DE LA TABLE PROFILES ET SES POLITIQUES
---------------------------------------------------------

-- Corriger les politiques sur profiles sans altérer la colonne problématique
DO $$
BEGIN
  -- Activer RLS si ce n'est pas déjà fait
  ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
  
  -- Créer une politique de lecture pour tous
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'profiles' AND policyname = 'Lecture publique des profils'
  ) THEN
    CREATE POLICY "Lecture publique des profils" ON public.profiles 
      FOR SELECT USING (TRUE);
  END IF;
  
  -- Corriger les valeurs NULL de is_provider
  UPDATE public.profiles SET is_provider = FALSE WHERE is_provider IS NULL;
END $$;

---------------------------------------------------------
-- 3. CORRECTION DE LA TABLE MESSAGES ET SES POLITIQUES
---------------------------------------------------------

-- Créer/Corriger la table messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages'
  ) THEN
    CREATE TABLE public.messages (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      read BOOLEAN DEFAULT FALSE,
      attachment_url TEXT,
      attachment_type TEXT
    );
    
    CREATE INDEX idx_messages_sender_id ON public.messages(sender_id);
    CREATE INDEX idx_messages_recipient_id ON public.messages(recipient_id);
    CREATE INDEX idx_messages_created_at ON public.messages(created_at);
    
    -- Activer RLS et créer les politiques
    ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
    
    -- Politique pour voir mes messages (envoyés ou reçus)
    CREATE POLICY "Voir mes messages" ON public.messages 
      FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);
      
    -- Politique pour envoyer des messages
    CREATE POLICY "Envoyer des messages" ON public.messages 
      FOR INSERT WITH CHECK (auth.uid() = sender_id);
      
    -- Politique pour marquer comme lu
    CREATE POLICY "Marquer comme lu" ON public.messages 
      FOR UPDATE USING (auth.uid() = recipient_id);
  END IF;
END $$;

---------------------------------------------------------
-- 4. FONCTION UTILITAIRE get_provider_status
---------------------------------------------------------

-- Supprimer et recréer la fonction pour éviter les conflits
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

---------------------------------------------------------
-- 5. RÉVOQUER ET RÉACCORDER LES PERMISSIONS GÉNÉRALES
---------------------------------------------------------

-- Assurer les permissions publiques sur les tables
GRANT SELECT ON public.translations TO anon, authenticated;
GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
