/*
  # GitHub Integration System
  
  1. New Tables
    - `github_repositories`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Link to profiles
      - `repo_name` (text)
      - `repo_url` (text)
      - `access_token` (text, encrypted)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Security
    - Enable RLS on github_repositories table
    - Add policies for read/write access
    - Only allow users to access their own repositories
*/

-- Create extension for encryption if not exists
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create github_repositories table
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