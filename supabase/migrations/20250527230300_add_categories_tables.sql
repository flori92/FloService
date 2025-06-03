-- Migration pour ajouter les tables de catégories et sous-catégories
-- Date: 2025-05-27

-- Création de la table des catégories
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Création de la table des sous-catégories
CREATE TABLE IF NOT EXISTS subcategories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON subcategories(category_id);

-- Fonction pour mettre à jour automatiquement updated_at pour les catégories
CREATE OR REPLACE FUNCTION update_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour updated_at sur les catégories
CREATE TRIGGER trigger_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE FUNCTION update_categories_updated_at();

-- Fonction pour mettre à jour automatiquement updated_at pour les sous-catégories
CREATE OR REPLACE FUNCTION update_subcategories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Déclencheur pour updated_at sur les sous-catégories
CREATE TRIGGER trigger_subcategories_updated_at
BEFORE UPDATE ON subcategories
FOR EACH ROW EXECUTE FUNCTION update_subcategories_updated_at();

-- Politiques RLS pour les catégories et sous-catégories
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategories ENABLE ROW LEVEL SECURITY;

-- Tout le monde peut lire les catégories
CREATE POLICY "Anyone can view categories"
ON categories
FOR SELECT
TO public
USING (true);

-- Tout le monde peut lire les sous-catégories
CREATE POLICY "Anyone can view subcategories"
ON subcategories
FOR SELECT
TO public
USING (true);

-- Seuls les administrateurs peuvent modifier les catégories
CREATE POLICY "Only admins can insert categories"
ON categories
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

CREATE POLICY "Only admins can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

CREATE POLICY "Only admins can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

-- Seuls les administrateurs peuvent modifier les sous-catégories
CREATE POLICY "Only admins can insert subcategories"
ON subcategories
FOR INSERT
TO authenticated
WITH CHECK (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

CREATE POLICY "Only admins can update subcategories"
ON subcategories
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

CREATE POLICY "Only admins can delete subcategories"
ON subcategories
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.is_admin = true
));

-- Insérer quelques catégories et sous-catégories de test
DO $$
BEGIN
    -- Insérer les catégories si elles n'existent pas déjà
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Plomberie') THEN
        INSERT INTO categories (name) VALUES ('Plomberie');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Électricité') THEN
        INSERT INTO categories (name) VALUES ('Électricité');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Ménage') THEN
        INSERT INTO categories (name) VALUES ('Ménage');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Jardinage') THEN
        INSERT INTO categories (name) VALUES ('Jardinage');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM categories WHERE name = 'Informatique') THEN
        INSERT INTO categories (name) VALUES ('Informatique');
    END IF;
END;
$$;

-- Insertion des sous-catégories si elles n'existent pas déjà
DO $$
DECLARE
    plomberie_id UUID;
    electricite_id UUID;
    menage_id UUID;
    jardinage_id UUID;
    informatique_id UUID;
BEGIN
    -- Récupérer les IDs des catégories
    SELECT id INTO plomberie_id FROM categories WHERE name = 'Plomberie' LIMIT 1;
    SELECT id INTO electricite_id FROM categories WHERE name = 'Électricité' LIMIT 1;
    SELECT id INTO menage_id FROM categories WHERE name = 'Ménage' LIMIT 1;
    SELECT id INTO jardinage_id FROM categories WHERE name = 'Jardinage' LIMIT 1;
    SELECT id INTO informatique_id FROM categories WHERE name = 'Informatique' LIMIT 1;
    
    -- Sous-catégories pour Plomberie
    IF plomberie_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Installation sanitaire' AND category_id = plomberie_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Installation sanitaire', plomberie_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Réparation de fuite' AND category_id = plomberie_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Réparation de fuite', plomberie_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Débouchage' AND category_id = plomberie_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Débouchage', plomberie_id);
        END IF;
    END IF;
    
    -- Sous-catégories pour Électricité
    IF electricite_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Installation électrique' AND category_id = electricite_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Installation électrique', electricite_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Dépannage' AND category_id = electricite_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Dépannage', electricite_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Installation domotique' AND category_id = electricite_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Installation domotique', electricite_id);
        END IF;
    END IF;
    
    -- Sous-catégories pour Ménage
    IF menage_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Nettoyage régulier' AND category_id = menage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Nettoyage régulier', menage_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Nettoyage de fin de chantier' AND category_id = menage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Nettoyage de fin de chantier', menage_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Nettoyage de vitres' AND category_id = menage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Nettoyage de vitres', menage_id);
        END IF;
    END IF;
    
    -- Sous-catégories pour Jardinage
    IF jardinage_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Tonte de pelouse' AND category_id = jardinage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Tonte de pelouse', jardinage_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Taille de haies' AND category_id = jardinage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Taille de haies', jardinage_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Aménagement paysager' AND category_id = jardinage_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Aménagement paysager', jardinage_id);
        END IF;
    END IF;
    
    -- Sous-catégories pour Informatique
    IF informatique_id IS NOT NULL THEN
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Dépannage PC' AND category_id = informatique_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Dépannage PC', informatique_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Installation logiciel' AND category_id = informatique_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Installation logiciel', informatique_id);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM subcategories WHERE name = 'Création de site web' AND category_id = informatique_id) THEN
            INSERT INTO subcategories (name, category_id) VALUES ('Création de site web', informatique_id);
        END IF;
    END IF;
END;
$$;
