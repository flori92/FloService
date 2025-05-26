import { createIntl, createIntlCache } from 'react-intl';

export type SupportedLocales = 'en' | 'fr';

export const messages = {
  en: {
    common: {
      login: 'Login',
      register: 'Register',
      email: 'Email address',
      password: 'Password',
      search: 'Search',
      searchPlaceholder: 'What service are you looking for?',
      selectCountry: 'Select a country',
      selectCity: 'Select a city',
    },
    navigation: {
      explorer: 'Explore',
      categories: 'Categories',
      howItWorks: 'How it works',
    },
    hero: {
      title: 'Find the perfect service provider',
      subtitle: 'Connect with skilled professionals for any job',
      cta: 'Get Started',
    },
    services: {
      title: 'Browse by Category',
      viewAll: 'View all categories',
    }
  },
  fr: {
    common: {
      login: 'Connexion',
      register: 'Inscription',
      email: 'Adresse email',
      password: 'Mot de passe',
      search: 'Rechercher',
      searchPlaceholder: 'Quel service recherchez-vous ?',
      selectCountry: 'Sélectionnez un pays',
      selectCity: 'Sélectionnez une ville',
    },
    navigation: {
      explorer: 'Explorer',
      categories: 'Catégories', 
      howItWorks: 'Comment ça marche',
    },
    hero: {
      title: 'Trouvez le prestataire parfait',
      subtitle: 'Connectez-vous avec des professionnels qualifiés pour tout type de travail',
      cta: 'Commencer',
    },
    services: {
      title: 'Parcourir par catégorie',
      viewAll: 'Voir toutes les catégories',
    }
  }
};

export const defaultLocale: SupportedLocales = 'fr';

const cache = createIntlCache();

export const getIntl = (locale: SupportedLocales) => {
  return createIntl(
    {
      locale,
      messages: messages[locale],
    },
    cache
  );
};