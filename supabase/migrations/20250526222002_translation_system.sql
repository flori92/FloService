/*
  # Système de traduction
  
  1. Nouvelle table
    - `translations`
      - `id` (uuid, primary key)
      - `key` (text, unique) - clé de traduction
      - `fr` (text) - traduction en français
      - `en` (text) - traduction en anglais
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
  2. Sécurité
    - Activer RLS sur la table translations
    - Ajouter des politiques pour la lecture et l'écriture des traductions
    - Seuls les administrateurs peuvent modifier les traductions
    - Tous les utilisateurs authentifiés peuvent lire les traductions
*/

-- Création de la table translations si elle n'existe pas déjà
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  fr text NOT NULL,
  en text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Création d'un trigger pour mettre à jour le champ updated_at
CREATE OR REPLACE FUNCTION update_translations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_translations_updated_at ON translations;
CREATE TRIGGER update_translations_updated_at
BEFORE UPDATE ON translations
FOR EACH ROW
EXECUTE FUNCTION update_translations_updated_at();

-- Activer RLS
ALTER TABLE translations ENABLE ROW LEVEL SECURITY;

-- Créer des politiques
DROP POLICY IF EXISTS "Tous les utilisateurs authentifiés peuvent lire les traductions" ON translations;
CREATE POLICY "Tous les utilisateurs authentifiés peuvent lire les traductions"
  ON translations
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Seuls les administrateurs peuvent modifier les traductions" ON translations;
CREATE POLICY "Seuls les administrateurs peuvent modifier les traductions"
  ON translations
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE auth.users.id = auth.uid()
      AND auth.users.role = 'admin'
    )
  );

-- Insérer quelques traductions de base
INSERT INTO translations (key, fr, en) VALUES
-- Navigation
('navigation.explore', 'Explorer', 'Explore'),
('navigation.categories', 'Catégories', 'Categories'),
('navigation.howItWorks', 'Comment ça marche', 'How it works'),

-- Commun
('common.login', 'Connexion', 'Login'),
('common.register', 'Inscription', 'Register'),
('common.email', 'Email', 'Email'),
('common.password', 'Mot de passe', 'Password'),
('common.reviews', 'avis', 'reviews'),
('common.memberSince', 'membre depuis', 'member since'),
('common.viewProfile', 'Voir le profil', 'View profile'),

-- Sections
('sections.featuredProviders.title', 'Prestataires en vedette', 'Featured providers'),
('sections.featuredProviders.viewAll', 'Voir tous', 'View all'),
('sections.categories.title', 'Catégories de services', 'Service categories'),
('sections.categories.viewAll', 'Voir toutes', 'View all'),

-- Page d'accueil
('home.hero.title', 'Trouvez le bon prestataire pour chaque projet', 'Find the right service provider for every project'),
('home.hero.subtitle', 'Connectez-vous avec des professionnels qualifiés pour tous vos besoins de services', 'Connect with qualified professionals for all your service needs'),
('home.hero.cta', 'Trouver un prestataire', 'Find a provider'),
('home.hero.secondary', 'Comment ça marche', 'How it works'),
('home.stats.0', 'Plus de 10 000 entreprises nous font confiance', 'Trusted by over 10,000 companies'),
('home.stats.1', 'Support expert 24/7', '24/7 Expert support'),
('home.stats.2', 'SLA de disponibilité à 99,9%', '99.9% Uptime SLA'),
('home.stats.3', 'Certifié ISO 27001', 'ISO 27001 Certified'),

-- CTA Section
('cta.provider.title', 'Vous êtes un prestataire de services ?', 'Are you a service provider?'),
('cta.provider.description', 'Rejoignez notre plateforme et développez votre activité en touchant de nouveaux clients.', 'Join our platform and grow your business by reaching new clients.'),
('cta.provider.benefits.0', 'Inscription gratuite et simple', 'Free and easy registration'),
('cta.provider.benefits.1', 'Recevez des demandes qualifiées', 'Receive qualified requests'),
('cta.provider.benefits.2', 'Gérez facilement votre agenda', 'Easily manage your schedule'),
('cta.provider.button', 'Devenir prestataire', 'Become a provider'),
('cta.client.title', 'Besoin d''un service ?', 'Need a service?'),
('cta.client.description', 'Trouvez rapidement le bon professionnel pour votre projet.', 'Quickly find the right professional for your project.'),
('cta.client.benefits.0.title', 'Prestataires vérifiés', 'Verified providers'),
('cta.client.benefits.0.description', 'Tous nos prestataires sont vérifiés', 'All our providers are verified'),
('cta.client.benefits.1.title', 'Paiement sécurisé', 'Secure payment'),
('cta.client.benefits.1.description', 'Paiement uniquement après satisfaction', 'Payment only after satisfaction'),
('cta.client.benefits.2.title', 'Support 7j/7', '7/7 Support'),
('cta.client.benefits.2.description', 'Notre équipe est là pour vous aider', 'Our team is here to help you'),
('cta.client.button', 'Explorer les services', 'Explore services')
ON CONFLICT (key) DO UPDATE
SET fr = EXCLUDED.fr, en = EXCLUDED.en;

-- Créer une fonction pour récupérer les traductions par langue
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
