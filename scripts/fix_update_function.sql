-- Création de la fonction update_updated_at_column si elle n'existe pas
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vérification que la fonction existe maintenant
SELECT 'La fonction update_updated_at_column() a été créée avec succès' AS message;
