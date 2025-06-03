/*
  # Création de la table conversations
  
  1. Structure
    - id (uuid, primary key)
    - client_id (uuid, références auth.users)
    - provider_id (uuid, références auth.users)
    - service_id (uuid, références services)
    - status (enum: active, closed)
    - created_at (timestamptz)
    - updated_at (timestamptz)
  
  2. Sécurité
    - Activation RLS
    - Politiques d'accès pour clients et prestataires
*/

-- Création du type d'énumération pour le statut
CREATE TYPE conversation_status AS ENUM ('active', 'closed');

-- Création de la table conversations
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  service_id uuid, -- Référence optionnelle vers un service
  status conversation_status DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Création des politiques d'accès
CREATE POLICY "Les utilisateurs peuvent voir leurs propres conversations"
  ON conversations
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR 
    provider_id = auth.uid()
  );

CREATE POLICY "Les clients peuvent créer des conversations"
  ON conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    client_id = auth.uid()
  );

CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres conversations"
  ON conversations
  FOR UPDATE
  TO authenticated
  USING (
    client_id = auth.uid() OR 
    provider_id = auth.uid()
  )
  WITH CHECK (
    client_id = auth.uid() OR 
    provider_id = auth.uid()
  );

-- Création du trigger pour updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
