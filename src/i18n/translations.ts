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
    },
    cta: {
      provider: {
        title: 'Become a Provider',
        description: 'Join our community of professionals and grow your business. Access thousands of potential clients.',
        benefits: [
          'Free registration',
          'Flexible schedule management',
          'Secure payments'
        ],
        button: 'Get Started Now'
      },
      client: {
        title: 'Book a Service',
        description: 'Find the perfect provider for all your needs. Thousands of qualified professionals at your service.',
        benefits: [
          {
            title: 'Verified Providers',
            description: 'All our providers are carefully verified'
          },
          {
            title: 'Quality Service',
            description: 'Professional services guaranteed'
          },
          {
            title: 'Easy Booking',
            description: 'Book in a few clicks 24/7'
          }
        ],
        button: 'Explore Services'
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
    },
    cta: {
      provider: {
        title: 'Devenir prestataire',
        description: 'Rejoignez notre communauté de professionnels et développez votre activité. Accédez à des milliers de clients potentiels.',
        benefits: [
          'Inscription gratuite',
          'Gestion flexible de votre emploi du temps', 
          'Paiements sécurisés'
        ],
        button: 'Commencer maintenant'
      },
      client: {
        title: 'Réserver un service',
        description: 'Trouvez le prestataire idéal pour tous vos besoins. Des milliers de professionnels qualifiés à votre service.',
        benefits: [
          {
            title: 'Prestataires vérifiés',
            description: 'Tous nos prestataires sont soigneusement vérifiés'
          },
          {
            title: 'Service de qualité',
            description: 'Des services professionnels garantis'
          },
          {
            title: 'Réservation facile',
            description: 'Réservez en quelques clics 24h/24'
          }
        ],
        button: 'Explorer les services'
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