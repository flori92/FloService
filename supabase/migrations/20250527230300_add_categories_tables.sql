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
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can update categories"
ON categories
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can delete categories"
ON categories
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

-- Seuls les administrateurs peuvent modifier les sous-catégories
CREATE POLICY "Only admins can insert subcategories"
ON subcategories
FOR INSERT
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can update subcategories"
ON subcategories
FOR UPDATE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

CREATE POLICY "Only admins can delete subcategories"
ON subcategories
FOR DELETE
TO authenticated
USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
));

-- Insérer quelques catégories et sous-catégories de test
INSERT INTO categories (name) VALUES
('Plomberie'),
('Électricité'),
('Ménage'),
('Jardinage'),
('Informatique');

-- Sous-catégories pour Plomberie
INSERT INTO subcategories (name, category_id) 
SELECT 'Installation sanitaire', id FROM categories WHERE name = 'Plomberie';

INSERT INTO subcategories (name, category_id) 
SELECT 'Réparation de fuite', id FROM categories WHERE name = 'Plomberie';

INSERT INTO subcategories (name, category_id) 
SELECT 'Débouchage', id FROM categories WHERE name = 'Plomberie';

-- Sous-catégories pour Électricité
INSERT INTO subcategories (name, category_id) 
SELECT 'Installation électrique', id FROM categories WHERE name = 'Électricité';

INSERT INTO subcategories (name, category_id) 
SELECT 'Dépannage', id FROM categories WHERE name = 'Électricité';

INSERT INTO subcategories (name, category_id) 
SELECT 'Installation domotique', id FROM categories WHERE name = 'Électricité';

-- Sous-catégories pour Ménage
INSERT INTO subcategories (name, category_id) 
SELECT 'Nettoyage régulier', id FROM categories WHERE name = 'Ménage';

INSERT INTO subcategories (name, category_id) 
SELECT 'Nettoyage de fin de chantier', id FROM categories WHERE name = 'Ménage';

INSERT INTO subcategories (name, category_id) 
SELECT 'Nettoyage de vitres', id FROM categories WHERE name = 'Ménage';

-- Sous-catégories pour Jardinage
INSERT INTO subcategories (name, category_id) 
SELECT 'Tonte de pelouse', id FROM categories WHERE name = 'Jardinage';

INSERT INTO subcategories (name, category_id) 
SELECT 'Taille de haies', id FROM categories WHERE name = 'Jardinage';

INSERT INTO subcategories (name, category_id) 
SELECT 'Aménagement paysager', id FROM categories WHERE name = 'Jardinage';

-- Sous-catégories pour Informatique
INSERT INTO subcategories (name, category_id) 
SELECT 'Dépannage PC', id FROM categories WHERE name = 'Informatique';

INSERT INTO subcategories (name, category_id) 
SELECT 'Installation logiciel', id FROM categories WHERE name = 'Informatique';

INSERT INTO subcategories (name, category_id) 
SELECT 'Création de site web', id FROM categories WHERE name = 'Informatique';
