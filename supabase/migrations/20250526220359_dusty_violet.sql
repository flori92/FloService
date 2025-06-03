/*
  # GitHub Integration System et Profils Utilisateurs
  
  1. Nouvelles Tables
    - `profiles` (si elle n'existe pas déjà)
      - `id` (uuid, primary key, lié à auth.users)
      - `full_name` (text)
      - `avatar_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `github_repositories`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Lien vers profiles
      - `repo_name` (text)
      - `repo_url` (text)
      - `access_token` (text, encrypté)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Sécurité
    - Activation RLS sur les tables
    - Politiques d'accès en lecture/écriture
    - Restriction d'accès aux données personnelles
*/

-- Création de l'extension pour le chiffrement si nécessaire
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Création de la table profiles si elle n'existe pas
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Création des politiques pour profiles
CREATE POLICY "Les utilisateurs peuvent voir tous les profils"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs peuvent modifier leur propre profil"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Création du trigger pour la mise à jour de updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Création de la table github_repositories
CREATE TABLE IF NOT EXISTS github_repositories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  repo_name text NOT NULL,
  repo_url text NOT NULL,
  access_token text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, repo_name)
);

-- Enable RLS
ALTER TABLE github_repositories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own repositories"
  ON github_repositories
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own repositories"
  ON github_repositories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own repositories"
  ON github_repositories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own repositories"
  ON github_repositories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create update trigger
CREATE TRIGGER update_github_repositories_updated_at
  BEFORE UPDATE ON github_repositories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to encrypt access tokens
CREATE OR REPLACE FUNCTION encrypt_access_token() 
RETURNS TRIGGER AS $$
BEGIN
  NEW.access_token = encode(encrypt(NEW.access_token::bytea, current_setting('app.settings.jwt_secret')::bytea, 'aes'), 'base64');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for encryption
CREATE TRIGGER encrypt_github_token
  BEFORE INSERT OR UPDATE OF access_token ON github_repositories
  FOR EACH ROW
  EXECUTE FUNCTION encrypt_access_token();

-- Create function to decrypt access tokens
CREATE OR REPLACE FUNCTION decrypt_access_token(encrypted_token text) 
RETURNS text AS $$
BEGIN
  RETURN convert_from(
    decrypt(
      decode(encrypted_token, 'base64')::bytea,
      current_setting('app.settings.jwt_secret')::bytea,
      'aes'
    ),
    'UTF8'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;