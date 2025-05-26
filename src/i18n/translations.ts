import { createIntl, createIntlCache } from 'react-intl';

export type SupportedLocales = 'en' | 'fr';

export const messages = {
  en: {
    common: {
      login: 'Sign in',
      register: 'Sign up',
      email: 'Email address',
      password: 'Password',
      search: 'Search',
      searchPlaceholder: 'What service are you looking for?',
      selectCountry: 'Select a country',
      selectCity: 'Select a city',
      viewProfile: 'View Profile',
      memberSince: 'Member since',
      viewAll: 'View all',
      reviews: 'reviews'
    },
    navigation: {
      explore: 'Explore',
      categories: 'Categories',
      howItWorks: 'How it works',
      messages: 'Messages',
      notifications: 'Notifications',
      profile: 'Profile'
    },
    sections: {
      featuredProviders: {
        title: 'Featured Providers',
        viewAll: 'View all providers'
      },
      categories: {
        title: 'Browse by Category',
        viewAll: 'View all categories'
      }
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
      viewProfile: 'Voir le profil',
      memberSince: 'Membre depuis',
      viewAll: 'Voir tout',
      reviews: 'avis'
    },
    navigation: {
      explore: 'Explorer',
      categories: 'Catégories',
      howItWorks: 'Comment ça marche',
      messages: 'Messages',
      notifications: 'Notifications',
      profile: 'Profil'
    },
    sections: {
      featuredProviders: {
        title: 'Prestataires en vedette',
        viewAll: 'Voir tous les prestataires'
      },
      categories: {
        title: 'Parcourir par catégorie',
        viewAll: 'Voir toutes les catégories'
      }
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