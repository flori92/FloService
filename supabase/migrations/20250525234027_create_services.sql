/*
  # Création de la table services
  
  1. Structure
    - id (uuid, primary key)
    - provider_id (uuid, références auth.users)
    - title (text)
    - description (text)
    - price (numeric)
    - duration (integer, en minutes)
    - category (text)
    - subcategory (text)
    - image_url (text)
    - is_active (boolean)
    - created_at (timestamptz)
    - updated_at (timestamptz)
  
  2. Sécurité
    - Activation RLS
    - Politiques d'accès pour consultation et modification
*/

-- Création de la table services
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  price numeric NOT NULL CHECK (price >= 0),
  duration integer NOT NULL CHECK (duration > 0),
  category text NOT NULL,
  subcategory text,
  image_url text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Activation RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

-- Création des politiques d'accès
CREATE POLICY "Tout le monde peut voir les services actifs"
  ON services
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "Les prestataires peuvent voir tous leurs services"
  ON services
  FOR SELECT
  TO authenticated
  USING (provider_id = auth.uid());

CREATE POLICY "Les prestataires peuvent créer leurs services"
  ON services
  FOR INSERT
  TO authenticated
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Les prestataires peuvent modifier leurs services"
  ON services
  FOR UPDATE
  TO authenticated
  USING (provider_id = auth.uid())
  WITH CHECK (provider_id = auth.uid());

CREATE POLICY "Les prestataires peuvent supprimer leurs services"
  ON services
  FOR DELETE
  TO authenticated
  USING (provider_id = auth.uid());

-- Création du trigger pour updated_at
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
