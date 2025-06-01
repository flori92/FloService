-- Fonction de recherche de prestataires dans un rayon autour d'une ville
-- Créé le 01/06/2025

-- S'assurer que les colonnes lat/long existent
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'villes' 
    AND column_name = 'latitude'
  ) THEN
    ALTER TABLE villes ADD COLUMN latitude FLOAT;
    ALTER TABLE villes ADD COLUMN longitude FLOAT;
  END IF;
END$$;

-- Créer une fonction qui calcule la distance entre deux points (formule haversine)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 FLOAT, long1 FLOAT, lat2 FLOAT, long2 FLOAT)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  R FLOAT := 6371; -- Rayon de la Terre en km
  dLat FLOAT;
  dLong FLOAT;
  a FLOAT;
  c FLOAT;
  d FLOAT;
BEGIN
  dLat := radians(lat2 - lat1);
  dLong := radians(long2 - long1);
  
  a := sin(dLat/2) * sin(dLat/2) + 
       cos(radians(lat1)) * cos(radians(lat2)) * 
       sin(dLong/2) * sin(dLong/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  d := R * c;
  
  RETURN d;
END;
$$;

-- Fonction pour trouver les villes dans un rayon donné
CREATE OR REPLACE FUNCTION find_cities_in_radius(city_id INTEGER, radius_km FLOAT)
RETURNS TABLE (
  id INTEGER,
  nom TEXT,
  pays_id INTEGER,
  distance FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  origin_lat FLOAT;
  origin_long FLOAT;
BEGIN
  -- Récupérer les coordonnées de la ville d'origine
  SELECT latitude, longitude INTO origin_lat, origin_long
  FROM villes
  WHERE id = city_id;
  
  -- Vérifier que les coordonnées existent
  IF origin_lat IS NULL OR origin_long IS NULL THEN
    RAISE EXCEPTION 'La ville d''origine n''a pas de coordonnées définies';
  END IF;
  
  -- Retourner toutes les villes dans le rayon spécifié
  RETURN QUERY
  SELECT 
    v.id,
    v.nom,
    v.pays_id,
    calculate_distance(origin_lat, origin_long, v.latitude, v.longitude) AS distance
  FROM villes v
  WHERE 
    v.latitude IS NOT NULL AND 
    v.longitude IS NOT NULL AND
    calculate_distance(origin_lat, origin_long, v.latitude, v.longitude) <= radius_km
  ORDER BY distance ASC;
END;
$$;

-- Fonction pour trouver les prestataires dans un rayon autour d'une ville
CREATE OR REPLACE FUNCTION find_providers_in_radius(city_id INTEGER, radius_km FLOAT)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  avatar_url TEXT,
  ville_id INTEGER,
  ville_nom TEXT,
  pays_nom TEXT,
  distance FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS user_id,
    p.full_name,
    p.avatar_url,
    v.id AS ville_id,
    v.nom AS ville_nom,
    pa.nom AS pays_nom,
    c.distance
  FROM 
    find_cities_in_radius(city_id, radius_km) c
    JOIN villes v ON c.id = v.id
    JOIN pays pa ON v.pays_id = pa.id
    JOIN profiles p ON p.ville_id = v.id
  WHERE 
    p.est_prestataire = true
  ORDER BY 
    c.distance ASC;
END;
$$;

-- Exemple de requête pour utiliser la fonction:
-- SELECT * FROM find_providers_in_radius(ville_id, 50); -- 50km de rayon
