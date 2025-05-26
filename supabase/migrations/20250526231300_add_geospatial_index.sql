-- Ajout d'un index géospatial pour les zones de service
CREATE EXTENSION IF NOT EXISTS postgis;

-- Ajout des colonnes de coordonnées si elles n'existent pas
DO $$
BEGIN
    -- Ajouter la colonne 'lat' si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'service_areas' AND column_name = 'lat') THEN
        ALTER TABLE service_areas ADD COLUMN lat DECIMAL(10, 8);
    END IF;
    
    -- Ajouter la colonne 'lng' si elle n'existe pas
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'service_areas' AND column_name = 'lng') THEN
        ALTER TABLE service_areas ADD COLUMN lng DECIMAL(11, 8);
    END IF;
    
    -- Vérifier si la colonne 'location' existe déjà
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                  WHERE table_name = 'service_areas' AND column_name = 'location') THEN
        -- Ajouter la colonne de géométrie
        ALTER TABLE service_areas ADD COLUMN location GEOMETRY(Point, 4326);
        
        -- Mettre à jour les enregistrements existants avec une valeur par défaut
        -- (les coordonnées seront mises à jour par l'application)
        UPDATE service_areas SET location = ST_SetSRID(ST_MakePoint(0, 0), 4326) WHERE location IS NULL;
        
        -- Rendre la colonne non nullable
        ALTER TABLE service_areas ALTER COLUMN location SET NOT NULL;
    END IF;
END
$$;

-- Créer l'index spatial
CREATE INDEX IF NOT EXISTS idx_service_areas_location_geom ON service_areas USING GIST (location);

-- Fonction pour mettre à jour automatiquement la géométrie lorsque les coordonnées changent
CREATE OR REPLACE FUNCTION update_service_area_geometry()
RETURNS TRIGGER AS $$
BEGIN
    -- Mettre à jour la géométrie si les coordonnées changent
    IF TG_OP = 'INSERT' OR OLD.lat IS DISTINCT FROM NEW.lat OR OLD.lng IS DISTINCT FROM NEW.lng THEN
        NEW.location := ST_SetSRID(ST_MakePoint(NEW.lng, NEW.lat), 4326);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le déclencheur s'il n'existe pas déjà
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'trigger_update_service_area_geometry'
    ) THEN
        CREATE TRIGGER trigger_update_service_area_geometry
        BEFORE INSERT OR UPDATE OF lat, lng ON service_areas
        FOR EACH ROW EXECUTE FUNCTION update_service_area_geometry();
    END IF;
END
$$;
