-- Script de création des tables de géolocalisation pour FloService
-- Créé le 01/06/2025

-- Table des pays
CREATE TABLE IF NOT EXISTS pays (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  code_iso VARCHAR(2),
  CONSTRAINT pays_nom_key UNIQUE (nom)
);

-- Table des villes
CREATE TABLE IF NOT EXISTS villes (
  id SERIAL PRIMARY KEY,
  nom TEXT NOT NULL,
  pays_id INTEGER REFERENCES pays(id) ON DELETE CASCADE,
  latitude FLOAT,
  longitude FLOAT,
  CONSTRAINT villes_nom_pays_key UNIQUE (nom, pays_id)
);

-- Ajouter colonne ville_id à la table profiles si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'ville_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN ville_id INTEGER REFERENCES villes(id);
  END IF;
END$$;

-- Index pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_profiles_ville_id ON profiles(ville_id);
CREATE INDEX IF NOT EXISTS idx_villes_pays_id ON villes(pays_id);

-- RLS policies pour les nouvelles tables
ALTER TABLE pays ENABLE ROW LEVEL SECURITY;
ALTER TABLE villes ENABLE ROW LEVEL SECURITY;

-- Politique RLS : tout le monde peut lire les pays et villes
CREATE POLICY IF NOT EXISTS "Tout le monde peut lire les pays" 
  ON pays FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Tout le monde peut lire les villes" 
  ON villes FOR SELECT USING (true);

-- Vue pour faciliter les requêtes communes
CREATE OR REPLACE VIEW geo_complete AS
SELECT 
  v.id AS ville_id,
  v.nom AS ville_nom,
  p.id AS pays_id,
  p.nom AS pays_nom,
  p.code_iso AS pays_code
FROM villes v
JOIN pays p ON v.pays_id = p.id;

-- Fonction pour trouver les prestataires par ville
CREATE OR REPLACE FUNCTION find_providers_by_city(city_id INTEGER)
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.* FROM profiles p
  WHERE p.ville_id = city_id
  AND p.est_prestataire = true;
$$;

-- Fonction pour trouver les prestataires par pays
CREATE OR REPLACE FUNCTION find_providers_by_country(country_id INTEGER)
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.* FROM profiles p
  JOIN villes v ON p.ville_id = v.id
  WHERE v.pays_id = country_id
  AND p.est_prestataire = true;
$$;

-- Fonction pour trouver les prestataires par nom de ville
CREATE OR REPLACE FUNCTION find_providers_by_city_name(city_name TEXT)
RETURNS SETOF profiles
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT p.* FROM profiles p
  JOIN villes v ON p.ville_id = v.id
  WHERE v.nom ILIKE city_name
  AND p.est_prestataire = true;
$$;
