import { createIntl, createIntlCache } from 'react-intl';

export type SupportedLocales = 'en' | 'fr';

export interface Messages {
  [key: string]: any;
  common: {
    login: string;
    register: string;
    email: string;
    password: string;
    search: string;
    searchPlaceholder: string;
    selectCountry: string;
    selectCity: string;
    viewProfile: string;
    memberSince: string;
    viewAll: string;
    reviews: string;
  };
  navigation: {
    explore: string;
    categories: string;
    howItWorks: string;
    messages: string;
    notifications: string;
    profile: string;
  };
  sections: {
    featuredProviders: {
      title: string;
      viewAll: string;
    };
    categories: {
      title: string;
      viewAll: string;
    };
  };
  cta: {
    provider: {
      title: string;
      description: string;
      benefits: string[];
      button: string;
    };
    client: {
      title: string;
      description: string;
      benefits: Array<{
        title: string;
        description: string;
      }>;
      button: string;
    };
  };
}

export const messages: Record<SupportedLocales, Messages> = {
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
          'cta.provider.benefits.0',
          'cta.provider.benefits.1',
          'cta.provider.benefits.2'
        ],
        button: 'Start Providing Services'
      },
      client: {
        title: 'Find the Perfect Service',
        description: 'Discover qualified professionals for all your needs.',
        benefits: [
          {
            title: 'cta.client.benefits.0.title',
            description: 'cta.client.benefits.0.description'
          },
          {
            title: 'cta.client.benefits.1.title',
            description: 'cta.client.benefits.1.description'
          },
          {
            title: 'cta.client.benefits.2.title',
            description: 'cta.client.benefits.2.description'
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
          'cta.provider.benefits.0',
          'cta.provider.benefits.1',
          'cta.provider.benefits.2'
        ],
        button: 'Commencer à proposer mes services'
      },
      client: {
        title: 'Trouver le Service Parfait',
        description: 'Découvrez des professionnels qualifiés pour tous vos besoins.',
        benefits: [
          {
            title: 'cta.client.benefits.0.title',
            description: 'cta.client.benefits.0.description'
          },
          {
            title: 'cta.client.benefits.1.title',
            description: 'cta.client.benefits.1.description'
          },
          {
            title: 'cta.client.benefits.2.title',
            description: 'cta.client.benefits.2.description'
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