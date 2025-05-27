-- Migration: Création de la fonction update_updated_at_column
-- Date: 2025-05-27

-- Créer la fonction pour mettre à jour la colonne updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
