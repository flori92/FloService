/*
  # Provider verification system

  1. New Tables
    - `provider_verifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `full_name` (text)
      - `date_of_birth` (date)
      - `id_document_front` (text, URL)
      - `id_document_back` (text, URL)
      - `selfie_with_id` (text, URL)
      - `address` (text)
      - `address_proof` (text, URL)
      - `phone` (text)
      - `email` (text)
      - `specialties` (text[])
      - `experience_years` (integer)
      - `portfolio_urls` (text[])
      - `verification_status` (enum: pending, approved, rejected)
      - `rejection_reason` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Only allow users to view and update their own verification data
*/

-- Create verification status enum
CREATE TYPE verification_status AS ENUM ('pending', 'approved', 'rejected');

-- Create provider verifications table
CREATE TABLE IF NOT EXISTS provider_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  full_name text NOT NULL,
  date_of_birth date NOT NULL,
  id_document_front text NOT NULL,
  id_document_back text NOT NULL,
  selfie_with_id text NOT NULL,
  address text NOT NULL,
  address_proof text NOT NULL,
  phone text NOT NULL,
  email text NOT NULL,
  specialties text[] NOT NULL,
  experience_years integer NOT NULL,
  portfolio_urls text[] NOT NULL,
  verification_status verification_status DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_verification UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE provider_verifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own verification data"
  ON provider_verifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verification data"
  ON provider_verifications
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own verification data"
  ON provider_verifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Création de la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create updated_at trigger
CREATE TRIGGER update_provider_verifications_updated_at
  BEFORE UPDATE ON provider_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();