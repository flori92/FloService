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
    },
    cta: {
      provider: {
        title: 'Become a Service Provider',
        description: 'Join our platform and grow your business by reaching more customers.',
        benefits: [
          'Access to thousands of potential clients',
          'Flexible schedule management',
          'Secure payments and support'
        ],
        button: 'Start Providing Services'
      },
      client: {
        title: 'Find the Perfect Service',
        description: 'Discover qualified professionals for all your needs.',
        benefits: [
          {
            title: 'Verified Professionals',
            description: 'All providers are thoroughly vetted'
          },
          {
            title: 'Quality Service',
            description: 'Rated and reviewed by our community'
          },
          {
            title: 'Easy Booking',
            description: 'Book and manage appointments online'
          }
        ],
        button: 'Find a Service Provider'
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
    },
    cta: {
      provider: {
        title: 'Devenir Prestataire',
        description: 'Rejoignez notre plateforme et développez votre activité en touchant plus de clients.',
        benefits: [
          'Accès à des milliers de clients potentiels',
          'Gestion flexible des horaires',
          'Paiements sécurisés et support'
        ],
        button: 'Commencer à proposer mes services'
      },
      client: {
        title: 'Trouver le Service Parfait',
        description: 'Découvrez des professionnels qualifiés pour tous vos besoins.',
        benefits: [
          {
            title: 'Professionnels Vérifiés',
            description: 'Tous les prestataires sont minutieusement contrôlés'
          },
          {
            title: 'Service de Qualité',
            description: 'Évalué et noté par notre communauté'
          },
          {
            title: 'Réservation Facile',
            description: 'Réservez et gérez vos rendez-vous en ligne'
          }
        ],
        button: 'Trouver un prestataire'
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