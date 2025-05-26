-- Désactiver temporairement RLS pour permettre les modifications
ALTER TABLE IF EXISTS translations DISABLE ROW LEVEL SECURITY;

-- Supprimer les politiques existantes si elles existent
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent lire les traductions" ON translations;
DROP POLICY IF EXISTS "Seuls les administrateurs peuvent modifier les traductions" ON translations;

-- Créer uniquement la politique de lecture pour les utilisateurs authentifiés
CREATE POLICY "Tous les utilisateurs authentifiés peuvent lire les traductions"
  ON translations
  FOR SELECT
  TO authenticated
  USING (true);

-- Activer RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Créer ou remplacer la fonction get_translations
CREATE OR REPLACE FUNCTION get_translations(lang text)
RETURNS TABLE (key text, value text) AS $$
BEGIN
  IF lang = 'fr' THEN
    RETURN QUERY SELECT translations.key, translations.fr FROM translations;
  ELSIF lang = 'en' THEN
    RETURN QUERY SELECT translations.key, translations.en FROM translations;
  ELSE
    RETURN QUERY SELECT translations.key, translations.fr FROM translations;
  END IF;
END;
$$ LANGUAGE plpgsql;
