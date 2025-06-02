-- Script de migration pour les tables et fonctions manquantes
-- Généré automatiquement le 2025-06-02T08:27:54.911Z

-- TABLES MANQUANTES

-- Création de la table profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  full_name TEXT,
  avatar_url TEXT,
  business_name TEXT,
  bio TEXT,
  is_provider BOOLEAN DEFAULT FALSE,
  role TEXT,
  phone TEXT,
  email TEXT,
  website TEXT,
  address TEXT,
  city_id INTEGER,
  country_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir tous les profils" ON profiles FOR SELECT USING (true);
CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Les utilisateurs peuvent insérer leur propre profil" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Création de la table provider_profiles
CREATE TABLE IF NOT EXISTS provider_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  category_id INTEGER,
  subcategory_id INTEGER,
  hourly_rate DECIMAL(10, 2),
  description TEXT,
  experience_years INTEGER,
  qualifications TEXT,
  availability_status TEXT DEFAULT 'available',
  rating DECIMAL(3, 2),
  reviews_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour provider_profiles
ALTER TABLE provider_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir tous les profils prestataires" ON provider_profiles FOR SELECT USING (true);
CREATE POLICY "Les prestataires peuvent modifier leur propre profil" ON provider_profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Les prestataires peuvent insérer leur propre profil" ON provider_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Création de la table messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID,
  sender_id UUID REFERENCES profiles(id),
  content TEXT,
  file_url TEXT,
  file_type TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour messages
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres messages" ON messages FOR SELECT USING (
  auth.uid() IN (
    SELECT sender_id FROM conversations WHERE id = conversation_id
    UNION
    SELECT recipient_id FROM conversations WHERE id = conversation_id
  )
);
CREATE POLICY "Les utilisateurs peuvent envoyer des messages" ON messages FOR INSERT WITH CHECK (
  auth.uid() = sender_id AND
  auth.uid() IN (
    SELECT sender_id FROM conversations WHERE id = conversation_id
    UNION
    SELECT recipient_id FROM conversations WHERE id = conversation_id
  )
);

-- Création de la table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID REFERENCES profiles(id),
  recipient_id UUID REFERENCES profiles(id),
  last_message TEXT,
  last_message_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unread_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour conversations
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations" ON conversations FOR SELECT USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);
CREATE POLICY "Les utilisateurs peuvent créer des conversations" ON conversations FOR INSERT WITH CHECK (
  auth.uid() = sender_id
);
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres conversations" ON conversations FOR UPDATE USING (
  auth.uid() = sender_id OR auth.uid() = recipient_id
);

-- Création de la table notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id),
  type TEXT,
  content TEXT,
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Création de la politique RLS pour notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Les utilisateurs peuvent voir leurs propres notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Les utilisateurs peuvent marquer leurs notifications comme lues" ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- FONCTIONS RPC MANQUANTES

-- Création de la fonction is_provider
CREATE OR REPLACE FUNCTION is_provider(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  is_provider_user BOOLEAN;
BEGIN
  -- Vérification dans la table profiles
  SELECT p.is_provider INTO is_provider_user
  FROM profiles p
  WHERE p.id = user_id;
  
  -- Si l'utilisateur est marqué comme prestataire dans profiles
  IF is_provider_user THEN
    RETURN TRUE;
  END IF;
  
  -- Vérification dans la table provider_profiles
  RETURN EXISTS (
    SELECT 1
    FROM provider_profiles pp
    WHERE pp.user_id = user_id
  );
END;
$$;

-- Création de la fonction get_provider_status
CREATE OR REPLACE FUNCTION get_provider_status(user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  provider_status TEXT;
BEGIN
  -- Vérification si l'utilisateur est un prestataire
  IF NOT is_provider(user_id) THEN
    RETURN 'not_provider';
  END IF;
  
  -- Récupération du statut de disponibilité
  SELECT pp.availability_status INTO provider_status
  FROM provider_profiles pp
  WHERE pp.user_id = user_id;
  
  -- Si aucun statut n'est défini, retourner 'available' par défaut
  RETURN COALESCE(provider_status, 'available');
END;
$$;

-- Création de la fonction check_migration_status
CREATE OR REPLACE FUNCTION check_migration_status()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  required_tables TEXT[] := ARRAY['profiles', 'provider_profiles', 'messages', 'conversations', 'notifications'];
  required_functions TEXT[] := ARRAY['is_provider', 'get_provider_status'];
  missing_tables TEXT[] := '{}';
  missing_functions TEXT[] := '{}';
  table_name TEXT;
  function_name TEXT;
BEGIN
  -- Vérification des tables requises
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = table_name
    ) THEN
      missing_tables := missing_tables || table_name;
    END IF;
  END LOOP;
  
  -- Vérification des fonctions requises
  FOREACH function_name IN ARRAY required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc
      JOIN pg_namespace ON pg_namespace.oid = pg_proc.pronamespace
      WHERE pg_namespace.nspname = 'public'
      AND pg_proc.proname = function_name
    ) THEN
      missing_functions := missing_functions || function_name;
    END IF;
  END LOOP;
  
  -- Construction du résultat
  result := jsonb_build_object(
    'status', CASE WHEN array_length(missing_tables, 1) = 0 AND array_length(missing_functions, 1) = 0 THEN 'ok' ELSE 'migration_required' END,
    'missing_tables', missing_tables,
    'missing_functions', missing_functions
  );
  
  RETURN result;
END;
$$;

