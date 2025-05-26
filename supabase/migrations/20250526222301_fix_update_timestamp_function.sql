/*
  # Création de la fonction update_updated_at_column
  
  Cette fonction est nécessaire pour les triggers qui mettent à jour automatiquement
  la colonne updated_at lors des modifications de lignes dans les tables.
*/

-- Création de la fonction de mise à jour du timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
